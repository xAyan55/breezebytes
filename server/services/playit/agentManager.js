/**
 * BreezeBytes — Node-Local Playit Agent Manager
 * Manages the native Linux Playit agent process / systemd service
 * 
 * Rules:
 * - Supports amd64/x86_64 and arm64/aarch64
 * - Pinned to official stable version 1.0.10
 * - Atomic binary installation with SHA-256 validation
 * - Secret file written with 0600 permissions
 * - Systemd service on Ubuntu / native process supervisor fallback
 * - Singleton safety per node (no multiple agent instances on same node)
 * - Exponential backoff on crash (5s, 10s, 30s, 60s max)
 * - Safe command execution: execFile with argument arrays, never raw shell strings
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import https from 'https';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PLAYIT_STABLE_VERSION = '1.0.10';

// Official SHA-256 release checksums for v1.0.10
export const OFFICIAL_CHECKSUMS = {
  'playit-linux-amd64': '38ad3a6519196b0bc235d944e8378bfb099d821217e944aa04ae9ff2e87c06ad',
  'playit-linux-aarch64': '6b12a2a0ebdc06236b281f62b8cfdcbc55f9a771e35dd74b09ff4737d97d02dc',
};

export const AGENT_STATUS = {
  NOT_INSTALLED: 'not_installed',
  STOPPED: 'stopped',
  STARTING: 'starting',
  RUNNING: 'running',
  UNHEALTHY: 'unhealthy',
  INVALID_CREDENTIALS: 'invalid_credentials',
  OUTDATED: 'outdated',
  FAILED: 'failed',
};

class NodeAgentInstance {
  constructor(nodeId) {
    this.nodeId = Number(nodeId) || 1;
    this.state = AGENT_STATUS.STOPPED;
    this.startPromise = null;
    this.process = null;
    this.crashCount = 0;
    this.watchdogTimer = null;
    this.lastCrashTime = 0;
    this.lastHeartbeat = null;
  }
}

export class AgentManager {
  constructor() {
    this.instances = new Map(); // nodeId -> NodeAgentInstance
    this.isLinux = process.platform === 'linux';
  }

  _getInstance(nodeId = 1) {
    const id = Number(nodeId) || 1;
    if (!this.instances.has(id)) {
      this.instances.set(id, new NodeAgentInstance(id));
    }
    return this.instances.get(id);
  }

  /**
   * Determine CPU architecture
   * @returns {'amd64'|'aarch64'|'unknown'}
   */
  getArchitecture() {
    const arch = process.arch;
    if (arch === 'x64') return 'amd64';
    if (arch === 'arm64') return 'aarch64';
    return 'unknown';
  }

  /**
   * Locate existing Playit binary on system
   * @returns {string|null}
   */
  findBinaryPath() {
    const customPath = process.env.PLAYIT_BINARY_PATH;
    if (customPath && fs.existsSync(customPath)) {
      return customPath;
    }

    const standardLocations = [
      '/usr/local/bin/playit',
      '/usr/bin/playit',
      '/opt/playit/playit',
      path.join(__dirname, '../../../bin/playit'),
      path.join(__dirname, '../../../bin/playit.exe'),
    ];

    for (const loc of standardLocations) {
      if (fs.existsSync(loc)) {
        try {
          fs.accessSync(loc, fs.constants.X_OK);
          return loc;
        } catch {
          // If on Windows, accessSync without X_OK is fine
          if (process.platform === 'win32') return loc;
        }
      }
    }

    return null;
  }

  /**
   * Get target secret file path for node
   */
  getSecretFilePath(nodeId = 1) {
    if (this.isLinux && fs.existsSync('/etc/playit')) {
      return '/etc/playit/playit.toml';
    }

    const dataDir = process.env.DATA_DIR || path.join(__dirname, '../../../data');
    const playitDir = path.join(dataDir, 'playit');
    if (!fs.existsSync(playitDir)) {
      fs.mkdirSync(playitDir, { recursive: true, mode: 0o700 });
    }
    return path.join(playitDir, `playit-node-${nodeId}.toml`);
  }

  /**
   * Safely write secret to disk with 0600 permissions
   * @param {string} secretKey
   * @param {number} [nodeId=1]
   */
  writeSecretFile(secretKey, nodeId = 1) {
    if (!secretKey) return false;
    const cleanKey = String(secretKey).trim();
    const filePath = this.getSecretFilePath(nodeId);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }

    const content = `secret_key = "${cleanKey}"\n`;
    const tempFile = `${filePath}.${process.pid}.${Date.now()}.tmp`;

    fs.writeFileSync(tempFile, content, { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(tempFile, filePath);

    try {
      fs.chmodSync(filePath, 0o600);
    } catch {
      // ignore on Windows
    }

    return true;
  }

  /**
   * Check installed binary version
   * @param {string} [binaryPath]
   * @returns {Promise<string|null>}
   */
  async getInstalledVersion(binaryPath) {
    const bin = binaryPath || this.findBinaryPath();
    if (!bin) return null;

    try {
      const { stdout } = await execFileAsync(bin, ['--version'], { timeout: 5000 });
      const match = stdout.match(/playit(?:d|-cli)?\s+([0-9]+\.[0-9]+\.[0-9]+[a-zA-Z0-9.\-_]*)/i);
      return match ? match[1] : stdout.trim();
    } catch {
      return null;
    }
  }

  /**
   * Install official Playit binary for current Linux architecture
   * @returns {Promise<{ success: boolean, binaryPath: string, version: string }>}
   */
  async installBinary() {
    if (!this.isLinux) {
      const existing = this.findBinaryPath();
      if (existing) {
        return { success: true, binaryPath: existing, version: 'mock-local' };
      }
      throw new Error('Automated Playit binary download is supported on Linux systems. Please place binary in PATH.');
    }

    const arch = this.getArchitecture();
    if (arch === 'unknown') {
      throw new Error(`Unsupported CPU architecture (${process.arch}) for automated Playit installation.`);
    }

    const binaryName = `playit-linux-${arch}`;
    const downloadUrl = `https://github.com/playit-cloud/playit-agent/releases/download/v${PLAYIT_STABLE_VERSION}/${binaryName}`;
    const targetDir = fs.existsSync('/usr/local/bin') ? '/usr/local/bin' : '/usr/bin';
    const targetPath = path.join(targetDir, 'playit');
    const tempPath = path.join(targetDir, `playit.${Date.now()}.tmp`);

    console.log(`[PLAYIT] Downloading official ${binaryName} v${PLAYIT_STABLE_VERSION}...`);

    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(tempPath, { mode: 0o755 });
      const request = (url) => {
        https.get(url, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            return request(res.headers.location);
          }
          if (res.statusCode !== 200) {
            fs.unlink(tempPath, () => {});
            return reject(new Error(`Download failed with status ${res.statusCode}`));
          }
          res.pipe(file);
          file.on('finish', () => file.close(resolve));
        }).on('error', (err) => {
          fs.unlink(tempPath, () => {});
          reject(err);
        });
      };
      request(downloadUrl);
    });

    // Check SHA-256 if officially recorded
    const expectedHash = OFFICIAL_CHECKSUMS[binaryName];
    if (expectedHash) {
      const fileBuffer = fs.readFileSync(tempPath);
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      if (hash.toLowerCase() !== expectedHash.toLowerCase()) {
        fs.unlinkSync(tempPath);
        throw new Error(`SHA-256 verification failed for downloaded Playit binary (expected: ${expectedHash}, got: ${hash})`);
      }
      console.log(`[PLAYIT] SHA-256 checksum verified for ${binaryName}.`);
    }

    // Atomic move & permissions
    fs.renameSync(tempPath, targetPath);
    fs.chmodSync(targetPath, 0o755);

    const version = await this.getInstalledVersion(targetPath);
    console.log(`[PLAYIT] Successfully installed Playit binary at ${targetPath} (version: ${version})`);

    // Ensure systemd service is set up
    await this.setupSystemdService(targetPath);

    return { success: true, binaryPath: targetPath, version: version || PLAYIT_STABLE_VERSION };
  }

  /**
   * Configure systemd service on Linux Ubuntu
   * @param {string} binaryPath
   */
  async setupSystemdService(binaryPath) {
    if (!this.isLinux) return false;

    const servicePath = '/etc/systemd/system/playit-agent.service';
    const secretPath = this.getSecretFilePath();

    const unitContent = `[Unit]
Description=Playit.gg Zero-Config Tunnel Agent (BreezeBytes Node)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${binaryPath} --stdout ${fs.existsSync(secretPath) ? `--secret-path ${secretPath}` : ''}
Restart=always
RestartSec=5s
LimitNOFILE=65536
KillMode=process
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
`;

    try {
      if (fs.existsSync('/etc/systemd/system')) {
        fs.writeFileSync(servicePath, unitContent, { encoding: 'utf8', mode: 0o644 });
        await execFileAsync('systemctl', ['daemon-reload'], { timeout: 10000 });
        await execFileAsync('systemctl', ['enable', 'playit-agent.service'], { timeout: 10000 });
        console.log('[PLAYIT] Configured and enabled playit-agent.service systemd unit.');
        return true;
      }
    } catch (err) {
      console.warn('[PLAYIT] Notice: Could not register systemd unit directly (may lack root):', err.message);
    }
    return false;
  }

  /**
   * Checks if systemd playit-agent.service is active
   */
  async isSystemdServiceActive() {
    if (!this.isLinux) return false;
    try {
      const { stdout } = await execFileAsync('systemctl', ['is-active', 'playit-agent.service'], { timeout: 5000 });
      return stdout.trim() === 'active';
    } catch {
      return false;
    }
  }

  /**
   * Singleton-safe Ensure Agent is running on the node
   * @param {number} [nodeId=1]
   * @param {string} [secretKey]
   * @returns {Promise<{ status: string, mode: 'systemd'|'managed_proc'|'mock' }>}
   */
  async ensureAgent(nodeId = 1, secretKey) {
    const inst = this._getInstance(nodeId);

    // Write secret if provided
    if (secretKey) {
      this.writeSecretFile(secretKey, nodeId);
    }

    // Return existing start promise if currently starting
    if (inst.startPromise) {
      return inst.startPromise;
    }

    inst.startPromise = this._startAgentInternal(inst, nodeId, secretKey);
    try {
      const result = await inst.startPromise;
      return result;
    } finally {
      inst.startPromise = null;
    }
  }

  async _startAgentInternal(inst, nodeId, secretKey) {
    const bin = this.findBinaryPath();
    if (!bin) {
      inst.state = AGENT_STATUS.NOT_INSTALLED;
      return { status: AGENT_STATUS.NOT_INSTALLED, mode: 'none' };
    }

    // 1. Try systemd service on Linux
    if (this.isLinux) {
      const isSystemdActive = await this.isSystemdServiceActive();
      if (isSystemdActive) {
        inst.state = AGENT_STATUS.RUNNING;
        inst.lastHeartbeat = new Date();
        return { status: AGENT_STATUS.RUNNING, mode: 'systemd' };
      }

      // Try starting via systemctl
      try {
        await execFileAsync('systemctl', ['start', 'playit-agent.service'], { timeout: 15000 });
        await new Promise((res) => setTimeout(res, 1500));
        if (await this.isSystemdServiceActive()) {
          inst.state = AGENT_STATUS.RUNNING;
          inst.lastHeartbeat = new Date();
          return { status: AGENT_STATUS.RUNNING, mode: 'systemd' };
        }
      } catch (err) {
        // Fallback to direct managed process
      }
    }

    // 2. Fallback: Direct managed child process
    if (inst.process && !inst.process.killed) {
      inst.state = AGENT_STATUS.RUNNING;
      inst.lastHeartbeat = new Date();
      return { status: AGENT_STATUS.RUNNING, mode: 'managed_proc' };
    }

    inst.state = AGENT_STATUS.STARTING;
    const secretPath = this.getSecretFilePath(nodeId);
    const args = ['--stdout'];
    if (fs.existsSync(secretPath)) {
      args.push('--secret-path', secretPath);
    }

    console.log(`[PLAYIT] Launching agent process for node #${nodeId}: ${bin} ${args.join(' ')}`);

    try {
      const child = spawn(bin, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      inst.process = child;
      inst.state = AGENT_STATUS.RUNNING;
      inst.lastHeartbeat = new Date();

      child.stdout.on('data', (d) => {
        const text = d.toString('utf8');
        if (text.includes('authenticated') || text.includes('connected') || text.includes('tunnel')) {
          inst.state = AGENT_STATUS.RUNNING;
          inst.lastHeartbeat = new Date();
        }
      });

      child.stderr.on('data', (d) => {
        const text = d.toString('utf8');
        if (text.includes('invalid') && text.includes('secret')) {
          inst.state = AGENT_STATUS.INVALID_CREDENTIALS;
        }
      });

      child.on('close', (code, signal) => {
        console.warn(`[PLAYIT] Agent process exited with code ${code}, signal ${signal}`);
        inst.process = null;
        inst.state = code === 0 ? AGENT_STATUS.STOPPED : AGENT_STATUS.FAILED;

        // Crash recovery with backoff (5s, 10s, 30s, 60s)
        const now = Date.now();
        if (now - inst.lastCrashTime < 60000) {
          inst.crashCount = (inst.crashCount || 0) + 1;
        } else {
          inst.crashCount = 1;
        }
        inst.lastCrashTime = now;

        if (inst.crashCount <= 4) {
          const delays = [5000, 10000, 30000, 60000];
          const delay = delays[Math.min(inst.crashCount - 1, delays.length - 1)];
          console.log(`[PLAYIT] Scheduling agent restart attempt ${inst.crashCount} in ${delay / 1000}s...`);
          setTimeout(() => {
            if (!inst.process && inst.state !== AGENT_STATUS.STOPPED) {
              this.ensureAgent(nodeId, secretKey).catch(console.error);
            }
          }, delay);
        }
      });

      return { status: AGENT_STATUS.RUNNING, mode: 'managed_proc' };
    } catch (err) {
      inst.state = AGENT_STATUS.FAILED;
      throw new Error(`Failed to start Playit agent process: ${err.message}`);
    }
  }

  /**
   * Stop agent on node
   */
  async stopAgent(nodeId = 1) {
    const inst = this._getInstance(nodeId);
    inst.state = AGENT_STATUS.STOPPED;

    if (this.isLinux) {
      try {
        await execFileAsync('systemctl', ['stop', 'playit-agent.service'], { timeout: 10000 });
      } catch {
        // ignore
      }
    }

    if (inst.process) {
      try {
        inst.process.kill('SIGTERM');
      } catch {
        // ignore
      }
      inst.process = null;
    }

    return { success: true };
  }

  /**
   * Restart agent on node
   */
  async restartAgent(nodeId = 1, secretKey) {
    await this.stopAgent(nodeId);
    await new Promise((res) => setTimeout(res, 1000));
    return await this.ensureAgent(nodeId, secretKey);
  }

  /**
   * Get health status for a node's agent
   */
  async getStatus(nodeId = 1) {
    const inst = this._getInstance(nodeId);
    const bin = this.findBinaryPath();

    if (!bin) {
      return {
        status: AGENT_STATUS.NOT_INSTALLED,
        binaryPath: null,
        version: null,
        isSystemd: false,
      };
    }

    let isRunning = false;
    let isSystemd = false;

    if (this.isLinux) {
      isSystemd = await this.isSystemdServiceActive();
      if (isSystemd) isRunning = true;
    }

    if (!isRunning && inst.process && !inst.process.killed) {
      isRunning = true;
    }

    const version = await this.getInstalledVersion(bin);

    return {
      status: isRunning ? AGENT_STATUS.RUNNING : inst.state,
      binaryPath: bin,
      version: version || PLAYIT_STABLE_VERSION,
      isSystemd,
      lastHeartbeat: inst.lastHeartbeat,
    };
  }
}

export const agentManager = new AgentManager();
export default agentManager;
