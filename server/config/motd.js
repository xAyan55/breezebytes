import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_MOTDS = {
  online: 'Hosted For Free On &9BreezeBytes.Bond | &f{Servername} | &2Online',
  offline: 'Hosted For Free On &9BreezeBytes.Bond | &f{Servername} | &4Offline',
  starting: 'Hosted For Free On &9BreezeBytes.Bond | &f{Servername} | &eStarting',
};

/**
 * Format an MOTD template with server name and Minecraft section sign (§) formatting.
 *
 * @param {string} template - The MOTD template (e.g. DEFAULT_MOTDS.online)
 * @param {string} serverName - The name of the server
 * @param {'section' | 'unicode' | 'raw'} format - Format style: 'section' (§), 'unicode' (\u00A7 for server.properties), or 'raw' (&)
 * @returns {string} Formatted MOTD
 */
export function formatMotd(template, serverName = 'Minecraft Server', format = 'section') {
  const safeName = serverName || 'Minecraft Server';
  let motd = (template || DEFAULT_MOTDS.online).replace(/\{Servername\}/gi, safeName);

  if (format === 'section') {
    // Replace '&' color codes with '§' for SLP ping responses
    return motd.replace(/&([0-9a-fk-or])/gi, '§$1');
  } else if (format === 'unicode') {
    // For server.properties: escape section sign as \u00A7
    return motd.replace(/&([0-9a-fk-or])/gi, '\\u00A7$1');
  }

  return motd;
}

/**
 * Get formatted MOTD based on server status.
 *
 * @param {'running' | 'starting' | 'offline' | string} status
 * @param {string} serverName
 * @param {'section' | 'unicode' | 'raw'} format
 * @returns {string}
 */
export function getMotdForStatus(status, serverName, format = 'section') {
  if (status === 'running') {
    return formatMotd(DEFAULT_MOTDS.online, serverName, format);
  } else if (status === 'starting') {
    return formatMotd(DEFAULT_MOTDS.starting, serverName, format);
  } else {
    return formatMotd(DEFAULT_MOTDS.offline, serverName, format);
  }
}

/**
 * Cache for base64 server icon favicon for Minecraft SLP
 */
let cachedFavicon = null;

export function getDefaultFavicon() {
  if (cachedFavicon) return cachedFavicon;
  const iconPath = path.join(__dirname, '../templates/server-icon.png');
  if (fs.existsSync(iconPath)) {
    const b64 = fs.readFileSync(iconPath).toString('base64');
    cachedFavicon = `data:image/png;base64,${b64}`;
    return cachedFavicon;
  }
  return null;
}

export default {
  DEFAULT_MOTDS,
  formatMotd,
  getMotdForStatus,
  getDefaultFavicon,
};
