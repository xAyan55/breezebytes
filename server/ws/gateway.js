import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { processManager } from '../daemon/processManager.js';
import { installer } from '../daemon/installer.js';
import { servers, server_subusers, users } from '../db/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'breezebytes_super_secret_jwt_key_2026';

export function setupWebSocketGateway(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  console.log('[WS] WebSocket Gateway initialized on path /ws');

  // Broadcast helper
  const broadcastToChannel = (channel, event, data) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client.subscriptions && client.subscriptions.has(channel)) {
        client.send(JSON.stringify({ channel, event, data }));
      }
    });
  };

  // Wire processManager events to WebSockets
  processManager.on('console', ({ serverId, line }) => {
    broadcastToChannel(`server:${serverId}:console`, 'console_line', line);
  });

  processManager.on('status', ({ serverId, status, exitCode }) => {
    broadcastToChannel(`server:${serverId}:status`, 'status_change', { serverId, status, exitCode });
  });

  processManager.on('stats', (statPayload) => {
    broadcastToChannel(`server:${statPayload.serverId}:stats`, 'stats_update', statPayload);
  });

  installer.on('progress', ({ serverId, progress, status }) => {
    broadcastToChannel(`server:${serverId}:install`, 'install_progress', { progress, status });
  });

  wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    ws.subscriptions = new Set();
    ws.user = null;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (message) => {
      try {
        const payload = JSON.parse(message.toString());
        const { action, token, channel, command } = payload;

        // Heartbeat / ping from client
        if (action === 'ping') {
          ws.isAlive = true;
          ws.send(JSON.stringify({ event: 'pong', timestamp: Date.now() }));
          return;
        }

        // 1. Authenticate connection
        if (action === 'auth') {
          try {
            const decoded = jwt.verify(token, JWT_SECRET);
            ws.user = users.findById(decoded.id);
            if (ws.user && !ws.user.is_suspended) {
              ws.send(JSON.stringify({ event: 'auth_success', user: { id: ws.user.id, username: ws.user.username, role: ws.user.role } }));
            } else {
              ws.send(JSON.stringify({ event: 'auth_error', message: 'User account suspended or invalid.' }));
              ws.close();
            }
          } catch {
            ws.send(JSON.stringify({ event: 'auth_error', message: 'Invalid authentication token.' }));
          }
          return;
        }

        // Must be authenticated for further actions
        if (!ws.user) {
          ws.send(JSON.stringify({ event: 'error', message: 'Authentication required. Send { action: "auth", token: "..." } first.' }));
          return;
        }

        // 2. Subscribe to channel
        if (action === 'subscribe' && channel) {
          const match = channel.match(/^server:(\d+):(.+)$/);
          if (match) {
            const serverId = Number(match[1]);
            const server = servers.findById(serverId);
            if (!server) {
              ws.send(JSON.stringify({ event: 'error', message: 'Server not found.' }));
              return;
            }

            // Check permissions: Owner/Admin or server owner or subuser
            const isOwnerOrAdmin = ws.user.role === 'owner' || ws.user.role === 'admin';
            const isServerOwner = server.owner_id === ws.user.id;
            const subuser = server_subusers.findOne({ server_id: serverId, user_id: ws.user.id });

            if (!isOwnerOrAdmin && !isServerOwner && !subuser) {
              ws.send(JSON.stringify({ event: 'error', message: 'Permission denied for this server.' }));
              return;
            }

            ws.subscriptions.add(channel);
            ws.send(JSON.stringify({ event: 'subscribed', channel }));

            // If subscribed to console, send back buffer logs
            if (match[2] === 'console') {
              const logs = processManager.getLogs(serverId);
              ws.send(JSON.stringify({ channel, event: 'console_history', data: logs }));
            }

            // If subscribed to status, send current status
            if (match[2] === 'status') {
              ws.send(JSON.stringify({ channel, event: 'status_change', data: { serverId, status: processManager.getStatus(serverId) } }));
            }
          } else {
            ws.subscriptions.add(channel);
            ws.send(JSON.stringify({ event: 'subscribed', channel }));
          }
        }

        // 3. Unsubscribe from channel
        if (action === 'unsubscribe' && channel) {
          ws.subscriptions.delete(channel);
          ws.send(JSON.stringify({ event: 'unsubscribed', channel }));
        }

        // 4. Send command via console
        if (action === 'send_command' && channel && command) {
          const match = channel.match(/^server:(\d+):console$/);
          if (match) {
            const serverId = Number(match[1]);
            const server = servers.findById(serverId);
            if (!server) return;

            const isOwnerOrAdmin = ws.user.role === 'owner' || ws.user.role === 'admin';
            const isServerOwner = server.owner_id === ws.user.id;
            const subuser = server_subusers.findOne({ server_id: serverId, user_id: ws.user.id });

            if (isOwnerOrAdmin || isServerOwner || (subuser && subuser.permissions.includes('server.console'))) {
              processManager.sendCommand(serverId, command);
            }
          }
        }
      } catch (err) {
        ws.send(JSON.stringify({ event: 'error', message: 'Malformed WebSocket message.' }));
      }
    });

    ws.on('close', () => {
      ws.subscriptions.clear();
    });
  });

  // Heartbeat ping-pong every 30s
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  return wss;
}
