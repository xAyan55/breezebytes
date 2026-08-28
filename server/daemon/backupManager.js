import fs from 'fs';
import path from 'path';
import * as tar from 'tar';
import { fileURLToPath } from 'url';
import { SERVERS_ROOT, processManager } from './processManager.js';
import { backups, servers, activity_logs } from '../db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BACKUPS_ROOT = process.env.BACKUPS_DIR || 
  (process.platform === 'linux' ? '/var/lib/breezebytes/backups' : path.join(__dirname, '../../data/backups'));

if (!fs.existsSync(BACKUPS_ROOT)) {
  fs.mkdirSync(BACKUPS_ROOT, { recursive: true });
}

class BackupManager {
  async createBackup(serverId, name = 'Automatic Backup') {
    const id = Number(serverId);
    const server = servers.findById(id);
    if (!server) throw new Error('Server not found');

    const serverDir = path.join(SERVERS_ROOT, server.uuid || String(id));
    if (!fs.existsSync(serverDir)) {
      throw new Error('Server directory does not exist.');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${server.identifier || id}-${timestamp}.tar.gz`;
    const destPath = path.join(BACKUPS_ROOT, filename);

    const record = backups.insert({
      server_id: id,
      name: name.trim() || `Backup ${new Date().toLocaleDateString()}`,
      filename: filename,
      size_bytes: 0,
      is_locked: 0,
      is_completed: 0
    });

    try {
      await tar.c(
        {
          gzip: true,
          file: destPath,
          cwd: serverDir
        },
        fs.readdirSync(serverDir)
      );

      const stat = fs.statSync(destPath);
      backups.update(record.id, {
        size_bytes: stat.size,
        is_completed: 1
      });

      activity_logs.insert({
        server_id: id,
        action: 'backup_create',
        metadata: JSON.stringify({ backupId: record.id, name, size: stat.size })
      });

      return { success: true, backup: backups.findById(record.id) };
    } catch (err) {
      backups.delete(record.id);
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      throw new Error(`Backup generation failed: ${err.message}`);
    }
  }

  async restoreBackup(backupId) {
    const record = backups.findById(backupId);
    if (!record) throw new Error('Backup not found');

    const server = servers.findById(record.server_id);
    if (!server) throw new Error('Associated server not found');

    // 1. Stop server if running
    if (processManager.getStatus(server.id) === 'running') {
      await processManager.stopServer(server.id);
    }

    const backupFile = path.join(BACKUPS_ROOT, record.filename);
    if (!fs.existsSync(backupFile)) {
      throw new Error('Backup archive file not found on disk.');
    }

    const serverDir = path.join(SERVERS_ROOT, server.uuid || String(server.id));
    if (!fs.existsSync(serverDir)) {
      fs.mkdirSync(serverDir, { recursive: true });
    }

    // 2. Extract backup archive
    await tar.x({
      file: backupFile,
      cwd: serverDir
    });

    activity_logs.insert({
      server_id: server.id,
      action: 'backup_restore',
      metadata: JSON.stringify({ backupId: record.id, name: record.name })
    });

    return { success: true };
  }

  async deleteBackup(backupId) {
    const record = backups.findById(backupId);
    if (!record) throw new Error('Backup not found');
    if (record.is_locked) {
      throw new Error('Cannot delete locked backup. Please unlock it first.');
    }

    const backupFile = path.join(BACKUPS_ROOT, record.filename);
    if (fs.existsSync(backupFile)) {
      fs.unlinkSync(backupFile);
    }
    backups.delete(record.id);

    return { success: true };
  }

  getBackupFilePath(backupId) {
    const record = backups.findById(backupId);
    if (!record) throw new Error('Backup not found');
    const backupFile = path.join(BACKUPS_ROOT, record.filename);
    if (!fs.existsSync(backupFile)) throw new Error('Backup file missing on disk.');
    return { path: backupFile, filename: record.filename };
  }
}

export const backupManager = new BackupManager();
export default backupManager;
