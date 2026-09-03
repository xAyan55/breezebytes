/* eslint-disable no-control-regex */
import path from 'path';
import { EventEmitter } from 'events';
import { SERVERS_ROOT, processManager } from './processManager.js';
import { servers, server_players, audit_logs, activity_logs } from '../db/database.js';
import { fileMutex } from '../services/fileMutex.js';
import { parseMinecraftConsoleLine, JAVA_USERNAME_REGEX } from './minecraftParser.js';
import { profileResolver } from './profileResolver.js';

/**
 * Sanitize reason string: strip CR, LF, NUL, control characters; limit length to 100.
 */
export function sanitizeReason(reason, defaultReason = '') {
  if (!reason || typeof reason !== 'string') return defaultReason;
  const cleaned = reason
    .replace(/[\r\n\0\x08\x09\x1a]/g, ' ')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .trim();
  return cleaned.substring(0, 100) || defaultReason;
}

/**
 * Player Manager 2.0 — Production-Grade Minecraft Reconciliation Engine
 */
class PlayerManager extends EventEmitter {
  constructor() {
    super();
    // serverId -> ServerWorker
    this.workers = new Map();
    // serverId -> monotonic sequence number
    this.sequenceCounters = new Map();

    // Bind process manager lifecycle
    processManager.on('status', ({ serverId, status }) => {
      this.handleServerStatusChange(Number(serverId), status);
    });

    processManager.on('console', ({ serverId, line }) => {
      this.handleConsoleLine(Number(serverId), line);
    });
  }

  getNextSeq(serverId) {
    const curr = (this.sequenceCounters.get(serverId) || 0) + 1;
    this.sequenceCounters.set(serverId, curr);
    return curr;
  }

  getServerDir(serverId) {
    const server = servers.findById(serverId);
    if (!server) throw new Error(`Server #${serverId} not found`);
    return path.join(SERVERS_ROOT, server.uuid || String(server.id));
  }

  /**
   * Get or spawn a single backend worker for this server
   */
  getWorker(serverId) {
    const id = Number(serverId);
    let worker = this.workers.get(id);
    if (!worker) {
      worker = {
        serverId: id,
        subscribers: 0,
        onlinePlayers: new Set(),
        previousOnlinePlayers: new Set(),
        pollTimer: null,
        lastPoll: 0,
        lastSnapshot: null,
        isPolling: false,
        restartGap: false,
        destroy: () => {
          if (worker.pollTimer) {
            clearInterval(worker.pollTimer);
            worker.pollTimer = null;
          }
        }
      };
      this.workers.set(id, worker);
    }
    return worker;
  }

  /**
   * Handle server lifecycle transitions
   */
  handleServerStatusChange(serverId, status) {
    const worker = this.workers.get(serverId);
    if (!worker) return;

    if (status === 'starting' || status === 'stopping') {
      worker.restartGap = true;
    }

    if (status === 'offline') {
      // If was running, transition players to offline
      if (!worker.restartGap) {
        this._recordPlayerDepartures(serverId, Array.from(worker.onlinePlayers));
      }
      worker.onlinePlayers.clear();
      worker.previousOnlinePlayers.clear();
      worker.restartGap = false;
      worker.pollTimer = null;
      this.broadcastRoster(serverId, 'live_server');
    } else if (status === 'running') {
      worker.restartGap = false;
      this.broadcastRoster(serverId, 'live_server');
    }
  }

  /**
   * Handle incoming console lines from processManager
   */
  handleConsoleLine(serverId, lineObj) {
    const raw = typeof lineObj === 'string' ? lineObj : lineObj?.text || '';
    if (!raw) return;

    const event = parseMinecraftConsoleLine(raw);
    if (!event) return;

    const worker = this.getWorker(serverId);

    if (event.type === 'join' && event.username) {
      const uname = event.username;
      if (!worker.onlinePlayers.has(uname)) {
        worker.onlinePlayers.add(uname);
        this._recordPlayerJoin(serverId, uname);
        this.broadcastRoster(serverId, 'parser');
      }
    } else if (event.type === 'leave' && event.username) {
      const uname = event.username;
      if (worker.onlinePlayers.has(uname)) {
        worker.onlinePlayers.delete(uname);
        this._recordPlayerDepartures(serverId, [uname]);
        this.broadcastRoster(serverId, 'parser');
      }
    } else if (event.type === 'list' && Array.isArray(event.players)) {
      // Authoritative list reconciliation: Live roster ALWAYS wins over parser events
      const authoritativeSet = new Set(event.players);
      const joined = event.players.filter(p => !worker.onlinePlayers.has(p));
      const left = Array.from(worker.onlinePlayers).filter(p => !authoritativeSet.has(p));

      worker.previousOnlinePlayers = new Set(worker.onlinePlayers);
      worker.onlinePlayers = authoritativeSet;

      for (const p of joined) {
        this._recordPlayerJoin(serverId, p);
      }
      this._recordPlayerDepartures(serverId, left);

      this.broadcastRoster(serverId, 'live_server');
    }
  }

  /**
   * Subscribe client to live updates for this server
   */
  subscribe(serverId) {
    const worker = this.getWorker(serverId);
    worker.subscribers++;
  }

  /**
   * Unsubscribe client from live updates
   */
  unsubscribe(serverId) {
    const worker = this.workers.get(serverId);
    if (worker) {
      worker.subscribers = Math.max(0, worker.subscribers - 1);
    }
  }

  /**
   * Record player join in persistent history without duplicate disk writes
   */
  _recordPlayerJoin(serverId, username) {
    const now = new Date().toISOString();
    const cleanUser = username.trim();

    // Check existing by username or resolve UUID
    let record = server_players.findOne({ server_id: serverId, username: cleanUser });
    if (!record) {
      record = server_players.insert({
        server_id: serverId,
        uuid: '',
        username: cleanUser,
        first_seen: now,
        last_seen: null,
        created_at: now,
        updated_at: now
      });
    }

    // Attempt background UUID resolution if missing
    if (!record.uuid) {
      profileResolver.resolve(cleanUser).then(profile => {
        if (profile && profile.uuid) {
          this.mergePlayerIdentity(serverId, cleanUser, profile.uuid);
        }
      }).catch(() => {});
    }
  }

  /**
   * Record player departures strictly on observed transitions
   */
  _recordPlayerDepartures(serverId, usernames) {
    if (!usernames || usernames.length === 0) return;
    const now = new Date().toISOString();

    for (const username of usernames) {
      const record = server_players.findOne({ server_id: serverId, username: username.trim() });
      if (record) {
        server_players.update(record.id, {
          last_seen: now,
          updated_at: now
        });
      }
    }
  }

  /**
   * Deterministic player identity merging:
   * Reconciles temporary username records into canonical UUID records
   */
  mergePlayerIdentity(serverId, username, uuid) {
    if (!uuid) return;
    const cleanUser = username.trim();

    // 1. Find record with this UUID
    const uuidRecord = server_players.findOne({ server_id: serverId, uuid });
    // 2. Find record with this username
    const userRecord = server_players.findOne({ server_id: serverId, username: cleanUser });

    const now = new Date().toISOString();

    if (uuidRecord && userRecord && uuidRecord.id !== userRecord.id) {
      // Merge: preserve oldest first_seen and newest last_seen
      const earliestFirstSeen = (uuidRecord.first_seen && userRecord.first_seen)
        ? (new Date(uuidRecord.first_seen) < new Date(userRecord.first_seen) ? uuidRecord.first_seen : userRecord.first_seen)
        : (uuidRecord.first_seen || userRecord.first_seen);

      const latestLastSeen = (uuidRecord.last_seen && userRecord.last_seen)
        ? (new Date(uuidRecord.last_seen) > new Date(userRecord.last_seen) ? uuidRecord.last_seen : userRecord.last_seen)
        : (uuidRecord.last_seen || userRecord.last_seen);

      server_players.update(uuidRecord.id, {
        username: cleanUser,
        first_seen: earliestFirstSeen,
        last_seen: latestLastSeen,
        updated_at: now
      });

      // Remove temporary duplicate
      server_players.delete(userRecord.id);
    } else if (uuidRecord) {
      // Update username on existing UUID record
      server_players.update(uuidRecord.id, {
        username: cleanUser,
        updated_at: now
      });
    } else if (userRecord) {
      // Upgrade username-only record with verified UUID
      server_players.update(userRecord.id, {
        uuid,
        updated_at: now
      });
    }
  }

  /**
   * Reconcile all data sources and produce a full snapshot
   */
  async getPlayersData(serverId) {
    const id = Number(serverId);
    const worker = this.getWorker(id);
    const dir = this.getServerDir(id);
    const serverOnline = processManager.getStatus(id) === 'running';

    // 1. Read files safely with corruption protection
    const opsResult = fileMutex.readJsonSafe(path.join(dir, 'ops.json'), []);
    const wlResult = fileMutex.readJsonSafe(path.join(dir, 'whitelist.json'), []);
    const bansResult = fileMutex.readJsonSafe(path.join(dir, 'banned-players.json'), []);
    const cacheResult = fileMutex.readJsonSafe(path.join(dir, 'usercache.json'), []);

    const ops = opsResult.ok ? (Array.isArray(opsResult.data) ? opsResult.data : []) : [];
    const whitelist = wlResult.ok ? (Array.isArray(wlResult.data) ? wlResult.data : []) : [];
    const bannedPlayers = bansResult.ok ? (Array.isArray(bansResult.data) ? bansResult.data : []) : [];
    const usercache = cacheResult.ok ? (Array.isArray(cacheResult.data) ? cacheResult.data : []) : [];

    // Map sets for fast authoritative checking
    const opMap = new Map();
    for (const o of ops) {
      if (o && o.name) opMap.set(o.name.toLowerCase(), o);
      if (o && o.uuid) opMap.set(o.uuid.toLowerCase(), o);
    }

    const wlMap = new Map();
    for (const w of whitelist) {
      if (w && w.name) wlMap.set(w.name.toLowerCase(), w);
      if (w && w.uuid) wlMap.set(w.uuid.toLowerCase(), w);
    }

    const banMap = new Map();
    for (const b of bannedPlayers) {
      if (b && b.name) banMap.set(b.name.toLowerCase(), b);
      if (b && b.uuid) banMap.set(b.uuid.toLowerCase(), b);
    }

    // Map persistent records
    const persistentRecords = server_players.find({ server_id: id });
    const persistentByUuid = new Map();
    const persistentByName = new Map();

    for (const r of persistentRecords) {
      if (r.uuid) persistentByUuid.set(r.uuid.toLowerCase(), r);
      if (r.username) persistentByName.set(r.username.toLowerCase(), r);
    }

    // Build unified player roster
    // Canonical key: UUID if available, else lowercase username
    const playerMap = new Map();

    // A. Feed live online players
    if (serverOnline) {
      for (const uname of worker.onlinePlayers) {
        const key = uname.toLowerCase();
        playerMap.set(key, {
          username: uname,
          uuid: '',
          online: true,
          operator: false,
          whitelisted: false,
          banned: false,
          firstSeen: null,
          lastSeen: null,
          opLevel: null,
          banReason: null,
          source: 'live_server'
        });
      }
    }

    // B. Reconcile usercache.json
    for (const u of usercache) {
      if (!u || !u.name) continue;
      const nameLower = u.name.toLowerCase();
      const existing = playerMap.get(nameLower);

      if (existing) {
        existing.uuid = u.uuid || existing.uuid;
      } else {
        playerMap.set(nameLower, {
          username: u.name,
          uuid: u.uuid || '',
          online: false,
          operator: false,
          whitelisted: false,
          banned: false,
          firstSeen: null,
          lastSeen: null,
          opLevel: null,
          banReason: null,
          source: 'usercache'
        });
      }
    }

    // C. Reconcile ops, whitelist, bans
    for (const o of ops) {
      if (!o || !o.name) continue;
      const nameLower = o.name.toLowerCase();
      let p = playerMap.get(nameLower);
      if (!p) {
        p = {
          username: o.name,
          uuid: o.uuid || '',
          online: false,
          operator: true,
          whitelisted: false,
          banned: false,
          firstSeen: null,
          lastSeen: null,
          opLevel: o.level || 4,
          banReason: null,
          source: 'ops'
        };
        playerMap.set(nameLower, p);
      } else {
        p.operator = true;
        p.opLevel = o.level || 4;
        if (o.uuid && !p.uuid) p.uuid = o.uuid;
      }
    }

    for (const w of whitelist) {
      if (!w || !w.name) continue;
      const nameLower = w.name.toLowerCase();
      let p = playerMap.get(nameLower);
      if (!p) {
        p = {
          username: w.name,
          uuid: w.uuid || '',
          online: false,
          operator: false,
          whitelisted: true,
          banned: false,
          firstSeen: null,
          lastSeen: null,
          opLevel: null,
          banReason: null,
          source: 'whitelist'
        };
        playerMap.set(nameLower, p);
      } else {
        p.whitelisted = true;
        if (w.uuid && !p.uuid) p.uuid = w.uuid;
      }
    }

    for (const b of bannedPlayers) {
      if (!b || !b.name) continue;
      const nameLower = b.name.toLowerCase();
      let p = playerMap.get(nameLower);
      if (!p) {
        p = {
          username: b.name,
          uuid: b.uuid || '',
          online: false,
          operator: false,
          whitelisted: false,
          banned: true,
          firstSeen: null,
          lastSeen: null,
          opLevel: null,
          banReason: b.reason || 'Banned by operator',
          source: 'banned-players'
        };
        playerMap.set(nameLower, p);
      } else {
        p.banned = true;
        p.banReason = b.reason || 'Banned by operator';
        if (b.uuid && !p.uuid) p.uuid = b.uuid;
      }
    }

    // D. Attach persistent history (first_seen, last_seen)
    for (const [, p] of playerMap.entries()) {
      // Check authoritatively by UUID or name
      let hist = (p.uuid && persistentByUuid.get(p.uuid.toLowerCase())) || persistentByName.get(p.username.toLowerCase());
      if (hist) {
        p.firstSeen = hist.first_seen || null;
        p.lastSeen = hist.last_seen || null;
        if (!p.uuid && hist.uuid) p.uuid = hist.uuid;
      }

      // Re-verify operator / whitelisted / banned flags by UUID as well
      if (p.uuid) {
        const uLower = p.uuid.toLowerCase();
        if (opMap.has(uLower)) {
          p.operator = true;
          p.opLevel = opMap.get(uLower).level || 4;
        }
        if (wlMap.has(uLower)) {
          p.whitelisted = true;
        }
        if (banMap.has(uLower)) {
          p.banned = true;
          p.banReason = banMap.get(uLower).reason || 'Banned by operator';
        }
      }
    }

    const playerList = Array.from(playerMap.values());
    const onlineCount = playerList.filter(p => p.online).length;

    const snapshot = {
      serverId: id,
      serverOnline,
      seq: this.getNextSeq(id),
      capturedAt: new Date().toISOString(),
      source: serverOnline ? 'live_server' : 'cached',
      counts: {
        online: onlineCount,
        totalTracked: playerList.length
      },
      fileHealth: {
        ops: opsResult.ok,
        whitelist: wlResult.ok,
        bans: bansResult.ok
      },
      players: playerList
    };

    worker.lastSnapshot = snapshot;
    return snapshot;
  }

  /**
   * Broadcast roster event to WebSocket gateway
   */
  async broadcastRoster(serverId, source = 'live_server') {
    try {
      const snapshot = await this.getPlayersData(serverId);
      snapshot.source = source;
      this.emit('players_update', snapshot);
    } catch (err) {
      console.error(`[PLAYER-MANAGER] Failed to broadcast roster for server #${serverId}:`, err.message);
    }
  }

  /**
   * Audit helper
   */
  logAudit(userId, serverId, action, username, uuid, reason, status) {
    try {
      const now = new Date().toISOString();
      const meta = JSON.stringify({
        player_username: username,
        player_uuid: uuid || null,
        reason: reason || null,
        status: status || 'confirmed',
        timestamp: now
      });

      audit_logs.insert({
        user_id: userId || null,
        action: `player_${action}`,
        details: meta,
        created_at: now
      });

      activity_logs.insert({
        server_id: serverId,
        user_id: userId || null,
        action: `player_${action}`,
        details: meta,
        created_at: now
      });
    } catch (err) {
      console.error('[PLAYER-MANAGER] Failed to record audit log:', err.message);
    }
  }

  // ==========================================
  // ADMINISTRATIVE PLAYER ACTIONS
  // ==========================================

  /**
   * KICK: Online only
   */
  async kickPlayer(serverId, username, reason = 'Kicked by operator', userId = null) {
    if (!JAVA_USERNAME_REGEX.test(username)) {
      throw { code: 'INVALID_USERNAME', message: 'Invalid Minecraft username format.' };
    }

    const isRunning = processManager.getStatus(serverId) === 'running';
    if (!isRunning) {
      throw { code: 'SERVER_OFFLINE', message: 'Cannot kick players when server is offline.' };
    }

    const cleanReason = sanitizeReason(reason, 'Kicked by operator');
    const worker = this.getWorker(serverId);

    // Verify player is actually recorded online
    if (!worker.onlinePlayers.has(username)) {
      // If not in local set, still attempt kick in case player just joined
    }

    // Dispatch command
    processManager.sendCommand(serverId, `kick ${username} ${cleanReason}`);

    // Wait brief observation delay
    await new Promise(r => setTimeout(r, 400));

    // Reconcile
    const snap = await this.getPlayersData(serverId);
    const stillOnline = snap.players.some(p => p.username.toLowerCase() === username.toLowerCase() && p.online);

    const status = stillOnline ? 'uncertain' : 'confirmed';
    this.logAudit(userId, serverId, 'kick', username, null, cleanReason, status);

    return {
      status,
      message: stillOnline ? 'Kick command sent, but player may still be disconnecting.' : `Successfully kicked ${username}.`
    };
  }

  /**
   * OP: Online or Offline
   */
  async opPlayer(serverId, username, userId = null) {
    if (!JAVA_USERNAME_REGEX.test(username)) {
      throw { code: 'INVALID_USERNAME', message: 'Invalid Minecraft username format.' };
    }

    return await fileMutex.withServerLock(serverId, async () => {
      const isRunning = processManager.getStatus(serverId) === 'running';

      if (isRunning) {
        processManager.sendCommand(serverId, `op ${username}`);
        await new Promise(r => setTimeout(r, 350));
        const snap = await this.getPlayersData(serverId);
        const isOp = snap.players.some(p => p.username.toLowerCase() === username.toLowerCase() && p.operator);
        const status = isOp ? 'confirmed' : 'uncertain';
        this.logAudit(userId, serverId, 'op', username, null, null, status);
        return { status, message: `Granted operator privileges to ${username}.` };
      }

      // Offline modification
      const dir = this.getServerDir(serverId);
      const opsPath = path.join(dir, 'ops.json');
      const opsRes = fileMutex.readJsonSafe(opsPath, []);

      if (!opsRes.ok) {
        throw { code: 'FILE_CORRUPTED', message: `ops.json is corrupted on server. Preserving file.` };
      }

      let ops = Array.isArray(opsRes.data) ? opsRes.data : [];
      const existing = ops.find(o => (o.name || '').toLowerCase() === username.toLowerCase());

      if (existing) {
        return { status: 'confirmed', message: `${username} is already an operator.` };
      }

      // Resolve UUID if possible
      let uuid = '';
      try {
        const prof = await profileResolver.resolve(username);
        if (prof && prof.uuid) uuid = prof.uuid;
      } catch {}

      ops.push({
        uuid,
        name: username,
        level: 4,
        bypassesPlayerLimit: false
      });

      // Pre-commit check: assert server is still offline before atomic rename
      fileMutex.writeJsonAtomic(opsPath, ops, () => {
        return processManager.getStatus(serverId) !== 'running';
      });

      this.logAudit(userId, serverId, 'op', username, uuid, null, 'confirmed');
      this.broadcastRoster(serverId, 'live_server');
      return { status: 'confirmed', message: `Granted operator privileges to ${username}.` };
    });
  }

  /**
   * DEOP: Online or Offline
   */
  async deopPlayer(serverId, username, userId = null) {
    if (!JAVA_USERNAME_REGEX.test(username)) {
      throw { code: 'INVALID_USERNAME', message: 'Invalid Minecraft username format.' };
    }

    return await fileMutex.withServerLock(serverId, async () => {
      const isRunning = processManager.getStatus(serverId) === 'running';

      if (isRunning) {
        processManager.sendCommand(serverId, `deop ${username}`);
        await new Promise(r => setTimeout(r, 350));
        const snap = await this.getPlayersData(serverId);
        const isOp = snap.players.some(p => p.username.toLowerCase() === username.toLowerCase() && p.operator);
        const status = !isOp ? 'confirmed' : 'uncertain';
        this.logAudit(userId, serverId, 'deop', username, null, null, status);
        return { status, message: `Revoked operator privileges from ${username}.` };
      }

      // Offline modification
      const dir = this.getServerDir(serverId);
      const opsPath = path.join(dir, 'ops.json');
      const opsRes = fileMutex.readJsonSafe(opsPath, []);

      if (!opsRes.ok) {
        throw { code: 'FILE_CORRUPTED', message: `ops.json is corrupted on server. Preserving file.` };
      }

      let ops = Array.isArray(opsRes.data) ? opsRes.data : [];
      const filtered = ops.filter(o => (o.name || '').toLowerCase() !== username.toLowerCase());

      fileMutex.writeJsonAtomic(opsPath, filtered, () => {
        return processManager.getStatus(serverId) !== 'running';
      });

      this.logAudit(userId, serverId, 'deop', username, null, null, 'confirmed');
      this.broadcastRoster(serverId, 'live_server');
      return { status: 'confirmed', message: `Revoked operator privileges from ${username}.` };
    });
  }

  /**
   * WHITELIST ADD: Online or Offline
   */
  async whitelistPlayer(serverId, username, userId = null) {
    if (!JAVA_USERNAME_REGEX.test(username)) {
      throw { code: 'INVALID_USERNAME', message: 'Invalid Minecraft username format.' };
    }

    return await fileMutex.withServerLock(serverId, async () => {
      const isRunning = processManager.getStatus(serverId) === 'running';

      if (isRunning) {
        processManager.sendCommand(serverId, `whitelist add ${username}`);
        await new Promise(r => setTimeout(r, 350));
        const snap = await this.getPlayersData(serverId);
        const isWl = snap.players.some(p => p.username.toLowerCase() === username.toLowerCase() && p.whitelisted);
        const status = isWl ? 'confirmed' : 'uncertain';
        this.logAudit(userId, serverId, 'whitelist_add', username, null, null, status);
        return { status, message: `Added ${username} to whitelist.` };
      }

      // Offline modification
      const dir = this.getServerDir(serverId);
      const wlPath = path.join(dir, 'whitelist.json');
      const wlRes = fileMutex.readJsonSafe(wlPath, []);

      if (!wlRes.ok) {
        throw { code: 'FILE_CORRUPTED', message: `whitelist.json is corrupted on server. Preserving file.` };
      }

      let wl = Array.isArray(wlRes.data) ? wlRes.data : [];
      const existing = wl.find(w => (w.name || '').toLowerCase() === username.toLowerCase());

      if (existing) {
        return { status: 'confirmed', message: `${username} is already on the whitelist.` };
      }

      let uuid = '';
      try {
        const prof = await profileResolver.resolve(username);
        if (prof && prof.uuid) uuid = prof.uuid;
      } catch {}

      wl.push({
        uuid,
        name: username
      });

      fileMutex.writeJsonAtomic(wlPath, wl, () => {
        return processManager.getStatus(serverId) !== 'running';
      });

      this.logAudit(userId, serverId, 'whitelist_add', username, uuid, null, 'confirmed');
      this.broadcastRoster(serverId, 'live_server');
      return { status: 'confirmed', message: `Added ${username} to whitelist.` };
    });
  }

  /**
   * WHITELIST REMOVE: Online or Offline
   */
  async unwhitelistPlayer(serverId, username, userId = null) {
    if (!JAVA_USERNAME_REGEX.test(username)) {
      throw { code: 'INVALID_USERNAME', message: 'Invalid Minecraft username format.' };
    }

    return await fileMutex.withServerLock(serverId, async () => {
      const isRunning = processManager.getStatus(serverId) === 'running';

      if (isRunning) {
        processManager.sendCommand(serverId, `whitelist remove ${username}`);
        await new Promise(r => setTimeout(r, 350));
        const snap = await this.getPlayersData(serverId);
        const isWl = snap.players.some(p => p.username.toLowerCase() === username.toLowerCase() && p.whitelisted);
        const status = !isWl ? 'confirmed' : 'uncertain';
        this.logAudit(userId, serverId, 'whitelist_remove', username, null, null, status);
        return { status, message: `Removed ${username} from whitelist.` };
      }

      // Offline modification
      const dir = this.getServerDir(serverId);
      const wlPath = path.join(dir, 'whitelist.json');
      const wlRes = fileMutex.readJsonSafe(wlPath, []);

      if (!wlRes.ok) {
        throw { code: 'FILE_CORRUPTED', message: `whitelist.json is corrupted on server. Preserving file.` };
      }

      let wl = Array.isArray(wlRes.data) ? wlRes.data : [];
      const filtered = wl.filter(w => (w.name || '').toLowerCase() !== username.toLowerCase());

      fileMutex.writeJsonAtomic(wlPath, filtered, () => {
        return processManager.getStatus(serverId) !== 'running';
      });

      this.logAudit(userId, serverId, 'whitelist_remove', username, null, null, 'confirmed');
      this.broadcastRoster(serverId, 'live_server');
      return { status: 'confirmed', message: `Removed ${username} from whitelist.` };
    });
  }

  /**
   * BAN: Online or Offline
   */
  async banPlayer(serverId, username, reason = 'Banned by operator', userId = null) {
    if (!JAVA_USERNAME_REGEX.test(username)) {
      throw { code: 'INVALID_USERNAME', message: 'Invalid Minecraft username format.' };
    }

    const cleanReason = sanitizeReason(reason, 'Banned by operator');

    return await fileMutex.withServerLock(serverId, async () => {
      const isRunning = processManager.getStatus(serverId) === 'running';

      if (isRunning) {
        processManager.sendCommand(serverId, `ban ${username} ${cleanReason}`);
        await new Promise(r => setTimeout(r, 350));
        const snap = await this.getPlayersData(serverId);
        const isBanned = snap.players.some(p => p.username.toLowerCase() === username.toLowerCase() && p.banned);
        const status = isBanned ? 'confirmed' : 'uncertain';
        this.logAudit(userId, serverId, 'ban', username, null, cleanReason, status);
        return { status, message: `Banned player ${username}.` };
      }

      // Offline modification
      const dir = this.getServerDir(serverId);
      const banPath = path.join(dir, 'banned-players.json');
      const banRes = fileMutex.readJsonSafe(banPath, []);

      if (!banRes.ok) {
        throw { code: 'FILE_CORRUPTED', message: `banned-players.json is corrupted on server. Preserving file.` };
      }

      let bans = Array.isArray(banRes.data) ? banRes.data : [];
      const existing = bans.find(b => (b.name || '').toLowerCase() === username.toLowerCase());

      if (existing) {
        return { status: 'confirmed', message: `${username} is already banned.` };
      }

      let uuid = '';
      try {
        const prof = await profileResolver.resolve(username);
        if (prof && prof.uuid) uuid = prof.uuid;
      } catch {}

      bans.push({
        uuid,
        name: username,
        created: new Date().toISOString(),
        source: 'BreezeBytes Console',
        expires: 'forever',
        reason: cleanReason
      });

      fileMutex.writeJsonAtomic(banPath, bans, () => {
        return processManager.getStatus(serverId) !== 'running';
      });

      this.logAudit(userId, serverId, 'ban', username, uuid, cleanReason, 'confirmed');
      this.broadcastRoster(serverId, 'live_server');
      return { status: 'confirmed', message: `Banned player ${username}.` };
    });
  }

  /**
   * UNBAN: Online or Offline
   */
  async unbanPlayer(serverId, username, userId = null) {
    if (!JAVA_USERNAME_REGEX.test(username)) {
      throw { code: 'INVALID_USERNAME', message: 'Invalid Minecraft username format.' };
    }

    return await fileMutex.withServerLock(serverId, async () => {
      const isRunning = processManager.getStatus(serverId) === 'running';

      if (isRunning) {
        processManager.sendCommand(serverId, `pardon ${username}`);
        await new Promise(r => setTimeout(r, 350));
        const snap = await this.getPlayersData(serverId);
        const isBanned = snap.players.some(p => p.username.toLowerCase() === username.toLowerCase() && p.banned);
        const status = !isBanned ? 'confirmed' : 'uncertain';
        this.logAudit(userId, serverId, 'unban', username, null, null, status);
        return { status, message: `Unbanned player ${username}.` };
      }

      // Offline modification
      const dir = this.getServerDir(serverId);
      const banPath = path.join(dir, 'banned-players.json');
      const banRes = fileMutex.readJsonSafe(banPath, []);

      if (!banRes.ok) {
        throw { code: 'FILE_CORRUPTED', message: `banned-players.json is corrupted on server. Preserving file.` };
      }

      let bans = Array.isArray(banRes.data) ? banRes.data : [];
      const filtered = bans.filter(b => (b.name || '').toLowerCase() !== username.toLowerCase());

      fileMutex.writeJsonAtomic(banPath, filtered, () => {
        return processManager.getStatus(serverId) !== 'running';
      });

      this.logAudit(userId, serverId, 'unban', username, null, null, 'confirmed');
      this.broadcastRoster(serverId, 'live_server');
      return { status: 'confirmed', message: `Unbanned player ${username}.` };
    });
  }

  /**
   * Clean shutdown handler
   */
  shutdownAll() {
    for (const [, worker] of this.workers.entries()) {
      worker.destroy();
    }
    this.workers.clear();
  }
}

export const playerManager = new PlayerManager();
export default playerManager;
