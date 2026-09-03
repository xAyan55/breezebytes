import fs from 'fs';
import path from 'path';

/**
 * In-memory serialization queue per server and per player key
 * to prevent concurrent read-modify-write races on Minecraft server files.
 */
class FileMutex {
  constructor() {
    this.serverLocks = new Map();
    this.playerLocks = new Map();
  }

  /**
   * Execute fn within a per-server queue.
   */
  async withServerLock(serverId, fn) {
    const id = Number(serverId);
    const prev = this.serverLocks.get(id) || Promise.resolve();
    let release;
    const next = new Promise((resolve) => {
      release = resolve;
    });

    this.serverLocks.set(id, prev.then(() => next, () => next));

    try {
      await prev;
      return await fn();
    } finally {
      release();
      if (this.serverLocks.get(id) === next) {
        this.serverLocks.delete(id);
      }
    }
  }

  /**
   * Execute fn within a specific (serverId + playerKey) queue.
   */
  async withPlayerLock(serverId, playerKey, fn) {
    const key = `${serverId}:${String(playerKey).toLowerCase().trim()}`;
    const prev = this.playerLocks.get(key) || Promise.resolve();
    let release;
    const next = new Promise((resolve) => {
      release = resolve;
    });

    this.playerLocks.set(key, prev.then(() => next, () => next));

    try {
      await prev;
      return await fn();
    } finally {
      release();
      if (this.playerLocks.get(key) === next) {
        this.playerLocks.delete(key);
      }
    }
  }

  /**
   * Safe JSON file reader with retry & backoff for transient concurrent reads.
   * If corrupted/malformed, does NOT overwrite with [] or destroy file.
   * Returns: { ok: true, data: [...] } OR { ok: false, error: 'FILE_CORRUPTED' | 'FILE_NOT_FOUND', raw: string }
   */
  readJsonSafe(filePath, defaultVal = []) {
    if (!fs.existsSync(filePath)) {
      return { ok: true, data: defaultVal, existed: false };
    }

    const maxRetries = 3;
    let lastErr = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8').trim();
        if (!raw) {
          return { ok: true, data: defaultVal, existed: true };
        }
        const data = JSON.parse(raw);
        return { ok: true, data, existed: true };
      } catch (err) {
        lastErr = err;
        // Exponential backoff for transient concurrent read
        if (attempt < maxRetries - 1) {
          const waitMs = (attempt + 1) * 15;
          const start = Date.now();
          while (Date.now() - start < waitMs) {
            // busy wait small backoff
          }
        }
      }
    }

    console.error(`[FILE-MUTEX] Malformed or locked JSON file: ${filePath}`, lastErr?.message);
    let rawContent = '';
    try {
      rawContent = fs.readFileSync(filePath, 'utf8');
    } catch {}

    return {
      ok: false,
      error: 'FILE_CORRUPTED',
      raw: rawContent,
      message: `Failed to parse JSON file at ${path.basename(filePath)}: ${lastErr?.message}`,
    };
  }

  /**
   * Atomic JSON file write:
   * 1. Validates data
   * 2. Writes to temp file in the same directory
   * 3. Syncs file descriptor (fsync)
   * 4. Optional pre-commit verification callback (e.g. check server didn't start)
   * 5. Atomically renames over target file
   */
  writeJsonAtomic(filePath, data, preCommitCheck = null) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Pre-commit check (e.g. ensure server is still offline)
    if (preCommitCheck && typeof preCommitCheck === 'function') {
      const allowed = preCommitCheck();
      if (!allowed) {
        throw new Error('PRECOMMIT_CHECK_FAILED: Server state changed before file write could be committed.');
      }
    }

    const tempPath = path.join(
      dir,
      `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`
    );

    const jsonString = JSON.stringify(data, null, 2);

    try {
      const fd = fs.openSync(tempPath, 'w');
      try {
        fs.writeSync(fd, jsonString, 0, 'utf8');
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }

      // Re-verify immediately before atomic rename
      if (preCommitCheck && typeof preCommitCheck === 'function') {
        const allowed = preCommitCheck();
        if (!allowed) {
          try {
            fs.unlinkSync(tempPath);
          } catch {}
          throw new Error('PRECOMMIT_CHECK_FAILED: Server became active before atomic rename.');
        }
      }

      fs.renameSync(tempPath, filePath);
      return true;
    } catch (err) {
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch {}
      throw err;
    }
  }
}

export const fileMutex = new FileMutex();
export default fileMutex;
