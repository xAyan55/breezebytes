import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import pidusage from 'pidusage';
import { EventEmitter } from 'events';
import { fileURLToPath } from 'url';
import { servers, activity_logs } from '../db/database.js';

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
    this.startStatsPolling();
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
    const item = this.processes.get(Number(serverId));
    return item ? item.logs : [];
  }

  getStatus(serverId) {
    const item = this.processes.get(Number(serverId));
    if (item && item.proc && !item.proc.killed) {
      return item.status || 'running';
    }
    const s = servers.findById(serverId);
    return s ? s.status : 'offline';
  }

  async startServer(serverId) {
    const id = Number(serverId);
    const server = servers.findById(id);
    if (!server) throw new Error('Server not found');

    if (server.is_suspended) {
      throw new Error('This server is suspended and cannot be started.');
    }

    if (this.processes.has(id) && this.processes.get(id).proc) {
      throw new Error('Server is already running or starting.');
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
      '-jar',
      'server.jar',
      'nogui'
    ];

    console.log(`[DAEMON] Spawning server ${server.name} (#${id}) with command: ${javaBin} ${args.join(' ')}`);

    const logEntry = (line) => {
      const entry = {
        timestamp: new Date().toISOString(),
        text: line
      };
      if (!this.processes.has(id)) {
        this.processes.set(id, { proc: null, logs: [], status: 'starting', crashCount: 0 });
      }
      const data = this.processes.get(id);
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
    if (!item || !item.proc) {
      servers.update(id, { status: 'offline' });
      this.emit('status', { serverId: id, status: 'offline' });
      return { success: true, status: 'offline' };
    }

    item.status = 'stopping';
    servers.update(id, { status: 'stopping' });
    this.emit('status', { serverId: id, status: 'stopping' });

    // Send graceful stop command to stdin
    try {
      item.proc.stdin.write('stop\n');
    } catch {
      // ignore
    }

    // Force kill if graceful shutdown exceeds 15 seconds
    setTimeout(() => {
      if (item.proc && !item.proc.killed) {
        console.log(`[DAEMON] Server #${id} did not stop gracefully in 15s. Sending SIGTERM.`);
        item.proc.kill('SIGTERM');
        setTimeout(() => {
          if (item.proc && !item.proc.killed) {
            item.proc.kill('SIGKILL');
          }
        }, 3000);
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
      const checkStopped = setInterval(async () => {
        if (this.getStatus(id) === 'offline') {
          clearInterval(checkStopped);
          const res = await this.startServer(id);
          resolve(res);
        }
      }, 1000);
    });
  }

  async killServer(serverId) {
    const id = Number(serverId);
    const item = this.processes.get(id);
    if (item && item.proc) {
      item.proc.kill('SIGKILL');
      item.proc = null;
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

    const cleanCmd = command.trim();
    item.proc.stdin.write(cleanCmd + '\n');

    const entry = {
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
