import net from 'net';
import { servers, allocations } from '../db/database.js';
import { getMotdForStatus, getDefaultFavicon } from '../config/motd.js';

function writeVarInt(val) {
  const bytes = [];
  let v = val;
  while (true) {
    if ((v & ~0x7F) === 0) {
      bytes.push(v);
      break;
    } else {
      bytes.push((v & 0x7F) | 0x80);
      v >>>= 7;
    }
  }
  return Buffer.from(bytes);
}

function readVarInt(buffer, offset = 0) {
  let result = 0;
  let shift = 0;
  let bytesRead = 0;
  while (offset + bytesRead < buffer.length) {
    const b = buffer[offset + bytesRead];
    bytesRead++;
    result |= (b & 0x7F) << shift;
    if ((b & 0x80) === 0) break;
    shift += 7;
    if (shift >= 35) throw new Error('VarInt too large');
  }
  return { value: result, bytesRead };
}

function makePacket(packetId, dataBuffer) {
  const idBuf = writeVarInt(packetId);
  const lengthBuf = writeVarInt(idBuf.length + dataBuffer.length);
  return Buffer.concat([lengthBuf, idBuf, dataBuffer]);
}

function makeStringPacket(packetId, str) {
  const strBuf = Buffer.from(str, 'utf8');
  const lenBuf = writeVarInt(strBuf.length);
  return makePacket(packetId, Buffer.concat([lenBuf, strBuf]));
}

class StatusPingServer {
  constructor() {
    this.listeners = new Map(); // port -> { server, serverId, sockets: Set }
    this.serverStatusMap = new Map(); // serverId -> 'offline' | 'starting'
  }

  /**
   * Update the cached status for a server
   * @param {number} serverId
   * @param {'offline' | 'starting'} status
   */
  setServerStatus(serverId, status) {
    const id = Number(serverId);
    this.serverStatusMap.set(id, status);
  }

  /**
   * Claim an allocated port for a server when it is offline or starting
   * @param {number} port
   * @param {number} serverId
   */
  claimPort(port, serverId) {
    const portNum = Number(port);
    const id = Number(serverId);
    if (!portNum || this.listeners.has(portNum)) {
      if (this.listeners.has(portNum)) {
        this.listeners.get(portNum).serverId = id;
      }
      return;
    }

    const sockets = new Set();
    const server = net.createServer((socket) => {
      sockets.add(socket);
      socket.setTimeout(5000);
      socket.on('timeout', () => socket.destroy());
      socket.on('error', () => {});
      socket.on('close', () => sockets.delete(socket));

      let state = 0; // 0: handshake, 1: status, 2: login
      let receivedBuffer = Buffer.alloc(0);

      socket.on('data', (chunk) => {
        try {
          receivedBuffer = Buffer.concat([receivedBuffer, chunk]);

          while (receivedBuffer.length > 0) {
            let offset = 0;
            const { value: packetLen, bytesRead: lenBytes } = readVarInt(receivedBuffer, offset);
            offset += lenBytes;

            if (receivedBuffer.length < offset + packetLen) {
              // Incomplete packet; wait for more data
              break;
            }

            const packetData = receivedBuffer.subarray(offset, offset + packetLen);
            receivedBuffer = receivedBuffer.subarray(offset + packetLen);

            let pOffset = 0;
            const { value: packetId, bytesRead: idBytes } = readVarInt(packetData, pOffset);
            pOffset += idBytes;

            if (state === 0 && packetId === 0x00) {
              // Handshake packet
              const { bytesRead: protoBytes } = readVarInt(packetData, pOffset);
              pOffset += protoBytes;

              const { value: hostLen, bytesRead: hostLenBytes } = readVarInt(packetData, pOffset);
              pOffset += hostLenBytes + hostLen;

              // Port (unsigned short 2 bytes)
              pOffset += 2;

              // Next state
              const { value: nextState } = readVarInt(packetData, pOffset);
              state = nextState;
            } else if (state === 1 && packetId === 0x00) {
              // Status Request -> send Status Response
              const currentStatus = this.serverStatusMap.get(id) || 'offline';
              const serverObj = servers.findById(id);
              const serverName = serverObj?.name || 'Minecraft Server';
              const motd = getMotdForStatus(currentStatus, serverName, 'section');
              const favicon = getDefaultFavicon();

              const responseObj = {
                version: {
                  name: currentStatus === 'starting' ? 'Starting...' : 'Offline',
                  protocol: 767,
                },
                players: {
                  max: 0,
                  online: 0,
                },
                description: {
                  text: motd,
                },
              };

              if (favicon) {
                responseObj.favicon = favicon;
              }

              socket.write(makeStringPacket(0x00, JSON.stringify(responseObj)));
            } else if (state === 1 && packetId === 0x01) {
              // Ping -> respond with Pong and close
              const pingPayload = packetData.subarray(pOffset);
              socket.write(makePacket(0x01, pingPayload));
              socket.end();
              break;
            } else if (state === 2 && packetId === 0x00) {
              // Login Attempt on an offline/starting server -> Send clean Disconnect
              const currentStatus = this.serverStatusMap.get(id) || 'offline';
              const serverObj = servers.findById(id);
              const serverName = serverObj?.name || 'Minecraft Server';
              const motd = getMotdForStatus(currentStatus, serverName, 'section');

              const disconnectMsg = {
                text: `${motd}\n\n§cServer is currently ${currentStatus}.\n§7Manage at: §bhttps://breezebytes.bond`,
              };

              socket.write(makeStringPacket(0x00, JSON.stringify(disconnectMsg)));
              socket.end();
              break;
            }
          }
        } catch {
          socket.destroy();
        }
      });
    });

    server.on('error', (err) => {
      if (err.code !== 'EADDRINUSE') {
        console.warn(`[STATUS-PING] Port ${portNum} error:`, err.message);
      }
      this.listeners.delete(portNum);
    });

    server.listen(portNum, '0.0.0.0', () => {
      // Unref so the status server does not block Node shutdown
      server.unref();
    });

    this.listeners.set(portNum, { server, serverId: id, sockets });
  }

  /**
   * Release an allocated port so the real Minecraft server can bind to it
   * @param {number} port
   * @returns {Promise<void>}
   */
  async releasePort(port) {
    const portNum = Number(port);
    const entry = this.listeners.get(portNum);
    if (!entry) return;

    this.listeners.delete(portNum);

    // Close any active sockets immediately
    for (const socket of entry.sockets) {
      try {
        socket.destroy();
      } catch {}
    }
    entry.sockets.clear();

    return new Promise((resolve) => {
      try {
        entry.server.close(() => {
          resolve();
        });
      } catch {
        resolve();
      }
      // Safety timeout
      setTimeout(resolve, 300);
    });
  }

  /**
   * Initialize listeners for all allocated ports whose servers are currently offline
   */
  initialize() {
    try {
      const allServers = servers.find();
      for (const s of allServers) {
        if (s.status !== 'running') {
          this.setServerStatus(s.id, s.status || 'offline');
          const alloc = allocations.findOne({ server_id: s.id, is_primary: 1 }) || allocations.findOne({ server_id: s.id });
          if (alloc && alloc.port) {
            this.claimPort(alloc.port, s.id);
          }
        }
      }
      console.log(`[STATUS-PING] Initialized fallback Minecraft status ping listeners on ${this.listeners.size} port(s)`);
    } catch (err) {
      console.error('[STATUS-PING] Initialization warning:', err.message);
    }
  }
}

export const statusPingServer = new StatusPingServer();
export default statusPingServer;
