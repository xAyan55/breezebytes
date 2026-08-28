import fs from 'fs';
import path from 'path';
import { SERVERS_ROOT, processManager } from './processManager.js';
import { servers } from '../db/database.js';

class PlayerManager {
  getServerDir(serverId) {
    const server = servers.findById(serverId);
    if (!server) throw new Error('Server not found');
    return path.join(SERVERS_ROOT, server.uuid || String(server.id));
  }

  readJsonSafe(filePath, defaultVal = []) {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    } catch {
      // ignore
    }
    return defaultVal;
  }

  writeJsonSafe(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('[PLAYER] Failed to write JSON file:', filePath, err);
    }
  }

  async getPlayersData(serverId) {
    const dir = this.getServerDir(serverId);
    const whitelist = this.readJsonSafe(path.join(dir, 'whitelist.json'), []);
    const ops = this.readJsonSafe(path.join(dir, 'ops.json'), []);
    const bannedPlayers = this.readJsonSafe(path.join(dir, 'banned-players.json'), []);
    const usercache = this.readJsonSafe(path.join(dir, 'usercache.json'), []);

    const opNames = new Set(ops.map(o => (o.name || '').toLowerCase()));
    const bannedNames = new Set(bannedPlayers.map(b => (b.name || '').toLowerCase()));
    const whitelistNames = new Set(whitelist.map(w => (w.name || '').toLowerCase()));

    // Combine player data
    const playersMap = new Map();

    usercache.forEach(u => {
      if (u.name) {
        playersMap.set(u.name.toLowerCase(), {
          name: u.name,
          uuid: u.uuid,
          isOp: opNames.has(u.name.toLowerCase()),
          isWhitelisted: whitelistNames.has(u.name.toLowerCase()),
          isBanned: bannedNames.has(u.name.toLowerCase())
        });
      }
    });

    ops.forEach(o => {
      if (o.name && !playersMap.has(o.name.toLowerCase())) {
        playersMap.set(o.name.toLowerCase(), {
          name: o.name,
          uuid: o.uuid || '',
          isOp: true,
          isWhitelisted: whitelistNames.has(o.name.toLowerCase()),
          isBanned: bannedNames.has(o.name.toLowerCase())
        });
      }
    });

    return {
      players: Array.from(playersMap.values()),
      whitelist,
      ops,
      bannedPlayers,
      isOnline: processManager.getStatus(serverId) === 'running'
    };
  }

  async opPlayer(serverId, username) {
    if (processManager.getStatus(serverId) === 'running') {
      processManager.sendCommand(serverId, `op ${username}`);
    } else {
      const dir = this.getServerDir(serverId);
      const opsPath = path.join(dir, 'ops.json');
      const ops = this.readJsonSafe(opsPath, []);
      if (!ops.some(o => (o.name || '').toLowerCase() === username.toLowerCase())) {
        ops.push({ uuid: '', name: username, level: 4, bypassesPlayerLimit: false });
        this.writeJsonSafe(opsPath, ops);
      }
    }
    return { success: true };
  }

  async deopPlayer(serverId, username) {
    if (processManager.getStatus(serverId) === 'running') {
      processManager.sendCommand(serverId, `deop ${username}`);
    } else {
      const dir = this.getServerDir(serverId);
      const opsPath = path.join(dir, 'ops.json');
      let ops = this.readJsonSafe(opsPath, []);
      ops = ops.filter(o => (o.name || '').toLowerCase() !== username.toLowerCase());
      this.writeJsonSafe(opsPath, ops);
    }
    return { success: true };
  }

  async whitelistPlayer(serverId, username) {
    if (processManager.getStatus(serverId) === 'running') {
      processManager.sendCommand(serverId, `whitelist add ${username}`);
    } else {
      const dir = this.getServerDir(serverId);
      const wlPath = path.join(dir, 'whitelist.json');
      const wl = this.readJsonSafe(wlPath, []);
      if (!wl.some(w => (w.name || '').toLowerCase() === username.toLowerCase())) {
        wl.push({ uuid: '', name: username });
        this.writeJsonSafe(wlPath, wl);
      }
    }
    return { success: true };
  }

  async unwhitelistPlayer(serverId, username) {
    if (processManager.getStatus(serverId) === 'running') {
      processManager.sendCommand(serverId, `whitelist remove ${username}`);
    } else {
      const dir = this.getServerDir(serverId);
      const wlPath = path.join(dir, 'whitelist.json');
      let wl = this.readJsonSafe(wlPath, []);
      wl = wl.filter(w => (w.name || '').toLowerCase() !== username.toLowerCase());
      this.writeJsonSafe(wlPath, wl);
    }
    return { success: true };
  }

  async banPlayer(serverId, username, reason = 'Banned by operator') {
    if (processManager.getStatus(serverId) === 'running') {
      processManager.sendCommand(serverId, `ban ${username} ${reason}`);
    } else {
      const dir = this.getServerDir(serverId);
      const banPath = path.join(dir, 'banned-players.json');
      const bans = this.readJsonSafe(banPath, []);
      if (!bans.some(b => (b.name || '').toLowerCase() === username.toLowerCase())) {
        bans.push({
          uuid: '',
          name: username,
          created: new Date().toISOString(),
          source: 'BreezeBytes Console',
          expires: 'forever',
          reason: reason
        });
        this.writeJsonSafe(banPath, bans);
      }
    }
    return { success: true };
  }

  async unbanPlayer(serverId, username) {
    if (processManager.getStatus(serverId) === 'running') {
      processManager.sendCommand(serverId, `pardon ${username}`);
    } else {
      const dir = this.getServerDir(serverId);
      const banPath = path.join(dir, 'banned-players.json');
      let bans = this.readJsonSafe(banPath, []);
      bans = bans.filter(b => (b.name || '').toLowerCase() !== username.toLowerCase());
      this.writeJsonSafe(banPath, bans);
    }
    return { success: true };
  }

  async kickPlayer(serverId, username, reason = 'Kicked by operator') {
    if (processManager.getStatus(serverId) === 'running') {
      processManager.sendCommand(serverId, `kick ${username} ${reason}`);
      return { success: true };
    }
    throw new Error('Cannot kick players when server is offline.');
  }
}

export const playerManager = new PlayerManager();
export default playerManager;
