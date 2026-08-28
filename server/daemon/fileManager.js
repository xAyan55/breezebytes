import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import * as tar from 'tar';
import { SERVERS_ROOT } from './processManager.js';
import { servers } from '../db/database.js';

class FileManager {
  getServerRoot(serverId) {
    const server = servers.findById(serverId);
    if (!server) throw new Error('Server not found');
    const root = path.join(SERVERS_ROOT, server.uuid || String(server.id));
    if (!fs.existsSync(root)) {
      fs.mkdirSync(root, { recursive: true });
    }
    return root;
  }

  resolveSafePath(serverId, userPath = '') {
    const root = this.getServerRoot(serverId);
    // Normalize and remove leading slashes
    const cleanUserPath = path.normalize(userPath).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
    const resolved = path.resolve(root, cleanUserPath);

    // Path traversal check
    if (!resolved.startsWith(root)) {
      throw new Error('Access denied: Path traversal detected.');
    }
    return { root, fullPath: resolved, relativePath: path.relative(root, resolved) };
  }

  async listFiles(serverId, directoryPath = '') {
    const { fullPath, root } = this.resolveSafePath(serverId, directoryPath);
    if (!fs.existsSync(fullPath)) {
      return [];
    }

    const stat = fs.statSync(fullPath);
    if (!stat.isDirectory()) {
      throw new Error('Specified path is not a directory.');
    }

    const items = fs.readdirSync(fullPath, { withFileTypes: true });
    return items.map((item) => {
      const itemPath = path.join(fullPath, item.name);
      try {
        const itemStat = fs.statSync(itemPath);
        return {
          name: item.name,
          path: path.relative(root, itemPath).replace(/\\/g, '/'),
          isDirectory: item.isDirectory(),
          isFile: item.isFile(),
          isSymlink: item.isSymbolicLink(),
          size: item.isFile() ? itemStat.size : 0,
          updatedAt: itemStat.mtime.toISOString()
        };
      } catch {
        return {
          name: item.name,
          path: path.relative(root, itemPath).replace(/\\/g, '/'),
          isDirectory: item.isDirectory(),
          isFile: item.isFile(),
          size: 0,
          updatedAt: new Date().toISOString()
        };
      }
    });
  }

  async readFile(serverId, filePath) {
    const { fullPath } = this.resolveSafePath(serverId, filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error('File not found.');
    }
    const stat = fs.statSync(fullPath);
    if (stat.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('File is too large to view directly (max 5 MB).');
    }
    return fs.readFileSync(fullPath, 'utf8');
  }

  async writeFile(serverId, filePath, content) {
    const { fullPath } = this.resolveSafePath(serverId, filePath);
    const parentDir = path.dirname(fullPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, 'utf8');
    return { success: true };
  }

  async createFolder(serverId, folderPath) {
    const { fullPath } = this.resolveSafePath(serverId, folderPath);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    return { success: true };
  }

  async deletePath(serverId, targetPath) {
    const { fullPath, root } = this.resolveSafePath(serverId, targetPath);
    if (fullPath === root) {
      throw new Error('Cannot delete server root directory.');
    }
    if (!fs.existsSync(fullPath)) {
      return { success: true };
    }
    fs.rmSync(fullPath, { recursive: true, force: true });
    return { success: true };
  }

  async renamePath(serverId, oldPath, newPath) {
    const { fullPath: oldFull } = this.resolveSafePath(serverId, oldPath);
    const { fullPath: newFull } = this.resolveSafePath(serverId, newPath);
    if (!fs.existsSync(oldFull)) {
      throw new Error('Source file or directory does not exist.');
    }
    fs.renameSync(oldFull, newFull);
    return { success: true };
  }

  async archiveFiles(serverId, files = [], archiveName = 'archive.tar.gz') {
    const root = this.getServerRoot(serverId);
    const outPath = path.join(root, archiveName);
    const output = fs.createWriteStream(outPath);
    const archive = archiver('tar', { gzip: true });

    return new Promise((resolve, reject) => {
      output.on('close', () => resolve({ success: true, archiveName, size: archive.pointer() }));
      archive.on('error', reject);
      archive.pipe(output);

      for (const f of files) {
        const { fullPath, relativePath } = this.resolveSafePath(serverId, f);
        if (fs.existsSync(fullPath)) {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            archive.directory(fullPath, relativePath);
          } else {
            archive.file(fullPath, { name: relativePath });
          }
        }
      }
      archive.finalize();
    });
  }

  async extractArchive(serverId, archivePath, destDir = '') {
    const { fullPath: tarPath } = this.resolveSafePath(serverId, archivePath);
    const { fullPath: targetDir } = this.resolveSafePath(serverId, destDir);
    if (!fs.existsSync(tarPath)) {
      throw new Error('Archive file not found.');
    }
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    await tar.x({
      file: tarPath,
      cwd: targetDir
    });
    return { success: true };
  }
}

export const fileManager = new FileManager();
export default fileManager;
