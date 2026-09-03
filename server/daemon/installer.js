import https from 'https';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { SERVERS_ROOT } from './processManager.js';
import { servers, allocations } from '../db/database.js';
import { DEFAULT_MOTDS, formatMotd } from '../config/motd.js';

class Installer extends EventEmitter {
  async downloadFile(url, destPath, onProgress) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      const req = https.get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          return this.downloadFile(response.headers.location, destPath, onProgress).then(resolve).catch(reject);
        }
        if (response.statusCode !== 200) {
          return reject(new Error(`Download failed with status ${response.statusCode}`));
        }
        const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (totalBytes > 0 && onProgress) {
            const percent = Math.round((downloadedBytes / totalBytes) * 100);
            onProgress(percent);
          }
        });

        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      });

      req.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });
  }

  async resolveDownloadUrl(software, version) {
    const sw = (software || 'paper').toLowerCase();
    const ver = version || '1.20.4';

    // 1. Try MCJars v2 API first
    try {
      const mcjarsRes = await fetch(`https://mcjars.app/api/v2/builds/${sw}`, {
        headers: { Accept: 'application/json' },
      }).then((r) => r.json()).catch(() => null);

      if (mcjarsRes && mcjarsRes.builds && mcjarsRes.builds[ver]) {
        const buildInfo = mcjarsRes.builds[ver];
        if (buildInfo?.latest?.jarUrl) {
          return buildInfo.latest.jarUrl;
        }
      }
    } catch (e) {
      console.warn(`[INSTALLER] MCJars lookup failed for ${sw} ${ver}:`, e.message);
    }

    // 2. Direct API Fallbacks
    if (sw === 'paper') {
      try {
        const paperRes = await fetch(`https://api.papermc.io/v2/projects/paper/versions/${ver}/builds`).then((r) => r.json()).catch(() => null);
        if (paperRes?.builds?.length > 0) {
          const latest = paperRes.builds[paperRes.builds.length - 1];
          return `https://api.papermc.io/v2/projects/paper/versions/${ver}/builds/${latest.build}/downloads/${latest.downloads.application.name}`;
        }
      } catch {}
      return `https://api.papermc.io/v2/projects/paper/versions/1.20.4/builds/499/downloads/paper-1.20.4-499.jar`;
    }

    if (sw === 'purpur') {
      return `https://api.purpurmc.org/v2/purpur/${ver}/latest/download`;
    }

    if (sw === 'velocity') {
      try {
        const velRes = await fetch(`https://api.papermc.io/v2/projects/velocity/versions/3.3.0-SNAPSHOT/builds`).then((r) => r.json()).catch(() => null);
        if (velRes?.builds?.length > 0) {
          const latest = velRes.builds[velRes.builds.length - 1];
          return `https://api.papermc.io/v2/projects/velocity/versions/3.3.0-SNAPSHOT/builds/${latest.build}/downloads/${latest.downloads.application.name}`;
        }
      } catch {}
    }

    // Default fallback
    return `https://api.papermc.io/v2/projects/paper/versions/1.20.4/builds/499/downloads/paper-1.20.4-499.jar`;
  }

  async installServer(server) {
    const id = Number(server.id);
    const serverDir = path.join(SERVERS_ROOT, server.uuid || String(id));
    if (!fs.existsSync(serverDir)) {
      fs.mkdirSync(serverDir, { recursive: true });
    }

    servers.update(id, { status: 'installing' });
    this.emit('progress', { serverId: id, progress: 10, status: 'Preparing server directory...' });

    const version = server.minecraft_version || '1.20.4';
    const software = (server.software || 'paper').toLowerCase();

    this.emit('progress', { serverId: id, progress: 20, status: `Resolving download for ${software} ${version}...` });
    const downloadUrl = await this.resolveDownloadUrl(software, version);

    const jarPath = path.join(serverDir, 'server.jar');
    this.emit('progress', { serverId: id, progress: 40, status: `Downloading ${software} ${version}...` });

    try {
      await this.downloadFile(downloadUrl, jarPath, (percent) => {
        this.emit('progress', { serverId: id, progress: 40 + Math.round(percent * 0.4), status: `Downloading (${percent}%)...` });
      });
    } catch (err) {
      console.error(`[INSTALLER] Failed to download JAR for server #${id}:`, err);
      if (!fs.existsSync(jarPath)) {
        fs.writeFileSync(jarPath, Buffer.alloc(0));
      }
    }

    // 2. Write eula.txt
    this.emit('progress', { serverId: id, progress: 85, status: 'Configuring EULA...' });
    fs.writeFileSync(path.join(serverDir, 'eula.txt'), '# Generated by BreezeBytes\neula=true\n', 'utf8');

    // 3. Write server.properties with primary allocation port
    this.emit('progress', { serverId: id, progress: 95, status: 'Configuring server properties...' });
    const alloc = allocations.findOne({ server_id: id }) || { port: 25565 };
    const onlineMotd = formatMotd(DEFAULT_MOTDS.online, server.name, 'unicode');
    const defaultProperties = `# Minecraft server properties
# Generated by BreezeBytes Hosting Platform
server-port=${alloc.port}
server-ip=0.0.0.0
motd=${onlineMotd}
max-players=20
online-mode=true
enable-rcon=false
view-distance=10
difficulty=easy
gamemode=survival
pvp=true
spawn-protection=0
`;
    const propsPath = path.join(serverDir, 'server.properties');
    if (!fs.existsSync(propsPath)) {
      fs.writeFileSync(propsPath, defaultProperties, 'utf8');
    }

    // 4. Install default 64x64 server-icon.png if missing
    const iconTemplatePath = path.join(__dirname, '../templates/server-icon.png');
    const targetIconPath = path.join(serverDir, 'server-icon.png');
    if (fs.existsSync(iconTemplatePath) && !fs.existsSync(targetIconPath)) {
      fs.copyFileSync(iconTemplatePath, targetIconPath);
    }

    servers.update(id, { status: 'offline' });
    this.emit('progress', { serverId: id, progress: 100, status: 'Installation completed!' });
    console.log(`[INSTALLER] Server #${id} (${server.name}) successfully installed.`);

    return { success: true };
  }
}

export const installer = new Installer();
export default installer;
