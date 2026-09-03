import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import pidusage from 'pidusage';
import { EventEmitter } from 'events';
import { fileURLToPath } from 'url';
import { servers, activity_logs, allocations } from '../db/database.js';
import { DEFAULT_MOTDS, formatMotd } from '../config/motd.js';
import { statusPingServer } from './statusPingServer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SERVERS_ROOT = process.env.SERVERS_DIR || 
  (process.platform === 'linux' ? '/var/lib/breezebytes/servers' : path.join(__dirname, '../../data/servers'));

if (!fs.existsSync(SERVERS_ROOT)) {
  fs.mkdirSync(SERVERS_ROOT, { recursive: true });
}

class ProcessManager extends EventEmitter {
  constructor() {
    super();
    this.processes = new Map(); // serverId -> { proc, logs: [], status: 'running'|..., crashCount: 0 }
    this.statsInterval = null;
    this.reconcileServersOnStartup();
    this.startStatsPolling();
  }

  reconcileServersOnStartup() {
    try {
      const allServers = servers.find();
      for (const s of allServers) {
        if (s.status === 'running' || s.status === 'starting' || s.status === 'stopping') {
          console.log(`[DAEMON] Reconciling server #${s.id} (${s.name}) status from '${s.status}' to 'offline'`);
          servers.update(s.id, { status: 'offline' });
        }
      }
    } catch (err) {
      console.error('[DAEMON] Failed to reconcile server statuses:', err);
    }
  }

  shutdownAll() {
    for (const [id, item] of this.processes.entries()) {
      if (item && item.proc) {
        try {
          item.proc.kill('SIGTERM');
        } catch {
          // ignore
        }
      }
      servers.update(id, { status: 'offline' });
    }
  }

  getServerDir(server) {
    const dir = path.join(SERVERS_ROOT, server.uuid || String(server.id));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  getJavaBinary(javaVersion = '21') {
    if (process.platform === 'linux') {
      const paths = [
        `/usr/lib/jvm/java-${javaVersion}-openjdk-amd64/bin/java`,
        `/usr/lib/jvm/java-${javaVersion}-openjdk/bin/java`,
        '/usr/bin/java',
        'java'
      ];
      for (const p of paths) {
        if (fs.existsSync(p)) return p;
      }
    }
    return 'java';
  }

  getLogs(serverId) {
    const id = Number(serverId);
    const item = this.processes.get(id);
    if (item && item.logs && item.logs.length > 0) {
      return item.logs;
    }

    // Fallback: Read latest log lines from logs/latest.log on disk if available
    try {
      const server = servers.findById(id);
      if (server) {
        const serverDir = this.getServerDir(server);
        const logFile = path.join(serverDir, 'logs', 'latest.log');
        if (fs.existsSync(logFile)) {
          const content = fs.readFileSync(logFile, 'utf8');
          const lines = content.split('\n').filter((l) => l.trim().length > 0).slice(-500);
          const parsed = lines.map((line) => ({
            timestamp: new Date().toISOString(),
            text: line
          }));
          if (!this.processes.has(id)) {
            this.processes.set(id, { proc: null, logs: parsed, status: server.status || 'offline', crashCount: 0 });
          } else {
            this.processes.get(id).logs = parsed;
          }
          return parsed;
        }
      }
    } catch {
      // ignore
    }

    return [];
  }

  isProcessAlive(pid) {
    if (!pid || typeof pid !== 'number') return false;
    try {
      process.kill(pid, 0);
      return true;
    } catch (err) {
      return err.code === 'EPERM';
    }
  }

  getStatus(serverId) {
    const id = Number(serverId);
    const item = this.processes.get(id);
    if (item && item.proc && item.proc.pid) {
      if (this.isProcessAlive(item.proc.pid) && !item.proc.killed) {
        return item.status || 'running';
      }
      if (!this.isProcessAlive(item.proc.pid)) {
        item.proc = null;
        item.status = 'offline';
        servers.update(id, { status: 'offline' });
        this.emit('status', { serverId: id, status: 'offline' });
        return 'offline';
      }
      return item.status || 'stopping';
    }
    const s = servers.findById(id);
    return s ? s.status : 'offline';
  }

  async startServer(serverId) {
    const id = Number(serverId);
    const server = servers.findById(id);
    if (!server) throw new Error('Server not found');

    if (server.is_suspended) {
      throw new Error('This server is suspended and cannot be started.');
    }

    if (this.processes.has(id)) {
      const item = this.processes.get(id);
      if (item.proc && item.proc.pid) {
        if (this.isProcessAlive(item.proc.pid)) {
          if (item.proc.killed || item.status === 'stopping') {
            console.log(`[DAEMON] Terminating lingering process ${item.proc.pid} for server #${id} before starting`);
            try {
              item.proc.kill('SIGKILL');
            } catch {}
            await new Promise((r) => setTimeout(r, 500));
            item.proc = null;
          } else {
            throw new Error('Server is already running or starting.');
          }
        } else {
          item.proc = null;
        }
      }
    }

    const serverDir = this.getServerDir(server);
    const jarPath = path.join(serverDir, 'server.jar');

    if (!fs.existsSync(jarPath)) {
      throw new Error('Server JAR (server.jar) is missing. Please install the server software first.');
    }

    // Ensure eula.txt is accepted
    const eulaPath = path.join(serverDir, 'eula.txt');
    if (!fs.existsSync(eulaPath) || !fs.readFileSync(eulaPath, 'utf8').includes('eula=true')) {
      fs.writeFileSync(eulaPath, 'eula=true\n', 'utf8');
    }

    // Ensure default 64x64 server-icon.png exists
    const iconTemplatePath = path.join(__dirname, '../templates/server-icon.png');
    const targetIconPath = path.join(serverDir, 'server-icon.png');
    if (fs.existsSync(iconTemplatePath) && !fs.existsSync(targetIconPath)) {
      try {
        fs.copyFileSync(iconTemplatePath, targetIconPath);
      } catch {}
    }

    // Ensure server.properties has the default online MOTD
    const propsPath = path.join(serverDir, 'server.properties');
    if (fs.existsSync(propsPath)) {
      try {
        let content = fs.readFileSync(propsPath, 'utf8');
        const onlineMotd = formatMotd(DEFAULT_MOTDS.online, server.name, 'unicode');
        if (!content.includes('motd=')) {
          content += `\nmotd=${onlineMotd}\n`;
          fs.writeFileSync(propsPath, content, 'utf8');
        } else if (content.includes('motd=\\u00A7bBreezeBytes') || content.includes('motd=A Minecraft Server')) {
          content = content.replace(/motd=.*/, `motd=${onlineMotd}`);
          fs.writeFileSync(propsPath, content, 'utf8');
        }
      } catch {}
    }

    // Release port from fallback status ping responder
    const alloc = allocations.findOne({ server_id: id, is_primary: 1 }) || allocations.findOne({ server_id: id });
    if (alloc && alloc.port) {
      statusPingServer.setServerStatus(id, 'starting');
      await statusPingServer.releasePort(alloc.port);
    }

    // Update status to starting
    servers.update(id, { status: 'starting' });
    this.emit('status', { serverId: id, status: 'starting' });

    const javaBin = this.getJavaBinary(server.java_version);
    const ram = server.memory || 2048;
    const args = [
      `-Xms${Math.min(512, ram)}M`,
      `-Xmx${ram}M`,
      '-XX:+UseG1GC',
      '-XX:+ParallelRefProcEnabled',
      '-XX:MaxGCPauseMillis=200',
      '-Dterminal.jline=false',
      '-Dterminal.ansi=true',
      '-jar',
      'server.jar',
      'nogui'
    ];

    console.log(`[DAEMON] Spawning server ${server.name} (#${id}) with command: ${javaBin} ${args.join(' ')}`);

    const logEntry = (line) => {
      if (!this.processes.has(id)) {
        this.processes.set(id, { proc: null, logs: [], status: 'starting', crashCount: 0, logSeq: 0 });
      }
      const data = this.processes.get(id);
      data.logSeq = (data.logSeq || 0) + 1;
      const entry = {
        id: data.logSeq,
        timestamp: new Date().toISOString(),
        text: typeof line === 'string' ? line : line.text || ''
      };
      data.logs.push(entry);
      if (data.logs.length > 1000) {
        data.logs.shift();
      }
      this.emit('console', { serverId: id, line: entry });
    };

    let proc;
    try {
      proc = spawn(javaBin, args, {
        cwd: serverDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, TERM: 'xterm-256color' }
      });
    } catch (err) {
      servers.update(id, { status: 'offline' });
      this.emit('status', { serverId: id, status: 'offline' });
      throw new Error(`Failed to spawn Java process: ${err.message}`);
    }

    const state = this.processes.get(id) || { logs: [], crashCount: 0 };
    state.proc = proc;
    state.status = 'starting';
    state.startedAt = new Date();
    this.processes.set(id, state);

    logEntry(`[BreezeBytes] Starting Minecraft Server on node port...`);

    let startDetectorTimer = setTimeout(() => {
      if (state.status === 'starting') {
        state.status = 'running';
        servers.update(id, { status: 'running' });
        this.emit('status', { serverId: id, status: 'running' });
      }
    }, 8000);

    proc.stdout.on('data', (data) => {
      const lines = data.toString('utf8').split('\n');
      for (const line of lines) {
        if (line.trim()) {
          logEntry(line);
          if (line.includes('Done (') || line.includes('For help, type "help"')) {
            clearTimeout(startDetectorTimer);
            state.status = 'running';
            servers.update(id, { status: 'running' });
            this.emit('status', { serverId: id, status: 'running' });
          }
        }
      }
    });

    proc.stderr.on('data', (data) => {
      const lines = data.toString('utf8').split('\n');
      for (const line of lines) {
        if (line.trim()) {
          logEntry(line);
        }
      }
    });

    proc.on('close', (code, signal) => {
      clearTimeout(startDetectorTimer);
      if (state.stopTimeout) {
        clearTimeout(state.stopTimeout);
        state.stopTimeout = null;
      }
      console.log(`[DAEMON] Server #${id} process exited with code ${code}, signal ${signal}`);
      logEntry(`[BreezeBytes] Server process exited (code: ${code}, signal: ${signal || 'none'})`);

      const wasRunning = state.status === 'running' || state.status === 'starting';
      state.proc = null;

      if (wasRunning && code !== 0 && code !== 130 && signal !== 'SIGTERM' && signal !== 'SIGKILL') {
        state.status = 'crashed';
        servers.update(id, { status: 'crashed' });
        this.emit('status', { serverId: id, status: 'crashed', exitCode: code });

        if (server.auto_restart && (state.crashCount || 0) < 3) {
          state.crashCount = (state.crashCount || 0) + 1;
          logEntry(`[BreezeBytes] Auto-restarting crashed server (Attempt ${state.crashCount}/3 in 5s)...`);
          setTimeout(() => {
            if (this.getStatus(id) === 'crashed') {
              this.startServer(id).catch(console.error);
            }
          }, 5000);
        }
      } else {
        state.status = 'offline';
        state.crashCount = 0;
        servers.update(id, { status: 'offline' });
        this.emit('status', { serverId: id, status: 'offline' });
      }

      // Re-claim port for status ping responder with offline MOTD
      const alloc = allocations.findOne({ server_id: id, is_primary: 1 }) || allocations.findOne({ server_id: id });
      if (alloc && alloc.port) {
        statusPingServer.setServerStatus(id, 'offline');
        statusPingServer.claimPort(alloc.port, id);
      }
    });

    activity_logs.insert({
      server_id: id,
      action: 'server_start',
      metadata: JSON.stringify({ ram: server.memory, version: server.minecraft_version })
    });

    return { success: true, status: 'starting' };
  }

  async stopServer(serverId) {
    const id = Number(serverId);
    const item = this.processes.get(id);
    if (!item || !item.proc || !this.isProcessAlive(item.proc.pid)) {
      if (item) item.proc = null;
      servers.update(id, { status: 'offline' });
      this.emit('status', { serverId: id, status: 'offline' });
      return { success: true, status: 'offline' };
    }

    if (item.stopTimeout) {
      clearTimeout(item.stopTimeout);
      item.stopTimeout = null;
    }

    item.status = 'stopping';
    servers.update(id, { status: 'stopping' });
    this.emit('status', { serverId: id, status: 'stopping' });

    const currentProc = item.proc;

    // Send graceful stop command to stdin
    try {
      currentProc.stdin.write('stop\n');
    } catch {
      // ignore
    }

    // Force kill if graceful shutdown exceeds 15 seconds
    item.stopTimeout = setTimeout(() => {
      if (item.proc === currentProc && this.isProcessAlive(currentProc.pid)) {
        console.log(`[DAEMON] Server #${id} did not stop gracefully in 15s. Sending SIGKILL.`);
        try {
          currentProc.kill('SIGKILL');
        } catch {}
      }
    }, 15000);

    activity_logs.insert({
      server_id: id,
      action: 'server_stop',
      metadata: '{}'
    });

    return { success: true, status: 'stopping' };
  }

  async restartServer(serverId) {
    const id = Number(serverId);
    await this.stopServer(id);
    return new Promise((resolve) => {
      let attempts = 0;
      const checkStopped = setInterval(async () => {
        attempts++;
        if (this.getStatus(id) === 'offline' || attempts > 20) {
          clearInterval(checkStopped);
          if (this.getStatus(id) !== 'offline') {
            await this.killServer(id);
          }
          const res = await this.startServer(id);
          resolve(res);
        }
      }, 1000);
    });
  }

  async killServer(serverId) {
    const id = Number(serverId);
    const item = this.processes.get(id);
    if (item) {
      if (item.stopTimeout) {
        clearTimeout(item.stopTimeout);
        item.stopTimeout = null;
      }
      if (item.proc && item.proc.pid && this.isProcessAlive(item.proc.pid)) {
        try {
          item.proc.kill('SIGKILL');
        } catch {}
      }
      item.proc = null;
      item.status = 'offline';
    }
    servers.update(id, { status: 'offline' });
    this.emit('status', { serverId: id, status: 'offline' });
    return { success: true, status: 'offline' };
  }

  sendCommand(serverId, command) {
    const id = Number(serverId);
    const item = this.processes.get(id);
    if (!item || !item.proc) {
      throw new Error('Server is not online to receive commands.');
    }

    if (!item.proc.stdin || !item.proc.stdin.writable) {
      throw new Error('Server input stream is not available or writable.');
    }

    // Strip leading slash if entered (e.g. "/tps" -> "tps")
    const cleanCmd = command.trim().replace(/^\//, '');
    item.proc.stdin.write(cleanCmd + '\n');

    item.logSeq = (item.logSeq || 0) + 1;
    const entry = {
      id: item.logSeq,
      timestamp: new Date().toISOString(),
      text: `> ${cleanCmd}`
    };
    item.logs.push(entry);
    if (item.logs.length > 1000) item.logs.shift();
    this.emit('console', { serverId: id, line: entry });

    return { success: true };
  }

  startStatsPolling() {
    this.statsInterval = setInterval(async () => {
      for (const [id, item] of this.processes.entries()) {
        if (item && item.proc && item.status === 'running') {
          try {
            const stats = await pidusage(item.proc.pid);
            const server = servers.findById(id);
            const memoryMb = Math.round(stats.memory / 1024 / 1024);
            const diskMb = this.getDirectorySizeMb(this.getServerDir(server || { id }));

            const statPayload = {
              serverId: id,
              cpu: Math.round(stats.cpu * 10) / 10,
              memory: memoryMb,
              memoryLimit: server?.memory || 2048,
              disk: diskMb,
              diskLimit: server?.disk || 10000,
              uptime: Math.round(stats.elapsed / 1000),
              status: item.status
            };
            this.emit('stats', statPayload);
          } catch {
            // proc exited or pid not found
          }
        }
      }
    }, 2000);
  }

  getDirectorySizeMb(dirPath) {
    try {
      if (!fs.existsSync(dirPath)) return 0;
      let totalSize = 0;
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          totalSize += stat.size;
        }
      }
      return Math.round(totalSize / 1024 / 1024);
    } catch {
      return 0;
    }
  }
}

export const processManager = new ProcessManager();
export default processManager;
