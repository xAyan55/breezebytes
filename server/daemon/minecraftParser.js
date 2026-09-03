/* eslint-disable no-control-regex */
/**
 * Dedicated Minecraft Console Output Parser
 * Normalizes ANSI, strips prefixes across Paper/Purpur/Vanilla/Fabric/Forge,
 * and extracts join, leave, and list events with confidence scoring.
 */

// Strips ANSI 16/256/Truecolor escape sequences
const ANSI_REGEX = /\u001b\[[0-9;]*[a-zA-Z]/g;

// Standard Java username validation pattern
export const JAVA_USERNAME_REGEX = /^[A-Za-z0-9_]{1,16}$/;

/**
 * Remove ANSI escape codes
 */
export function stripAnsi(str) {
  if (typeof str !== 'string') return '';
  return str.replace(ANSI_REGEX, '');
}

/**
 * Normalize a console line by stripping ANSI, carriage returns, and logger headers.
 * Examples handled:
 * - "[12:34:56 INFO]: Steve joined the game"
 * - "[Server thread/INFO]: Steve[/127.0.0.1:54321] logged in with entity id 123"
 * - "[12:34:56.789] [Server thread/INFO] [minecraft/MinecraftServer]: Steve left the game"
 * - "> list"
 */
export function cleanConsoleLine(rawLine) {
  const cleaned = stripAnsi(rawLine).trim();
  // Strip common prefix patterns up to ": "
  // Match bracketed timestamps/threads e.g. "[...]: "
  const colonMatch = cleaned.match(/^(?:\[[^\]]+\]\s*)+:\s*(.*)$/);
  if (colonMatch && colonMatch[1]) {
    return colonMatch[1].trim();
  }
  return cleaned;
}

/**
 * Parse a cleaned or raw Minecraft console line.
 * Returns null if not a recognized player event.
 */
export function parseMinecraftConsoleLine(rawLine) {
  if (!rawLine || typeof rawLine !== 'string') return null;

  const content = cleanConsoleLine(rawLine);
  if (!content) return null;

  // 1. Join event pattern 1: "Steve[/1.2.3.4:5678] logged in with entity id 123"
  // Note: we extract only the username, stripping out the IP/port for privacy.
  const loggedInMatch = content.match(/^([A-Za-z0-9_]{1,16})\[.*?\] logged in with entity id \d+/i);
  if (loggedInMatch) {
    const username = loggedInMatch[1];
    if (JAVA_USERNAME_REGEX.test(username)) {
      return {
        type: 'join',
        username,
        confidence: 'high',
        source: 'console',
        timestamp: new Date().toISOString()
      };
    }
  }

  // 2. Join event pattern 2: "Steve joined the game"
  const joinedMatch = content.match(/^([A-Za-z0-9_]{1,16}) joined the game/i);
  if (joinedMatch) {
    const username = joinedMatch[1];
    if (JAVA_USERNAME_REGEX.test(username)) {
      return {
        type: 'join',
        username,
        confidence: 'high',
        source: 'console',
        timestamp: new Date().toISOString()
      };
    }
  }

  // 3. Leave event pattern 1: "Steve lost connection: Disconnected" or "Steve lost connection: Timed out"
  const lostConnMatch = content.match(/^([A-Za-z0-9_]{1,16}) lost connection:/i);
  if (lostConnMatch) {
    const username = lostConnMatch[1];
    if (JAVA_USERNAME_REGEX.test(username)) {
      return {
        type: 'leave',
        username,
        confidence: 'high',
        source: 'console',
        timestamp: new Date().toISOString()
      };
    }
  }

  // 4. Leave event pattern 2: "Steve left the game"
  const leftMatch = content.match(/^([A-Za-z0-9_]{1,16}) left the game/i);
  if (leftMatch) {
    const username = leftMatch[1];
    if (JAVA_USERNAME_REGEX.test(username)) {
      return {
        type: 'leave',
        username,
        confidence: 'high',
        source: 'console',
        timestamp: new Date().toISOString()
      };
    }
  }

  // 5. Authoritative 'list' command response:
  // "There are 2 of a max of 20 players online: Steve, Alex"
  // "There are 0 of a max of 20 players online:"
  const listMatch = content.match(/There are (\d+) of a max of (\d+) players online:?(.*)/i);
  if (listMatch) {
    const onlineCount = parseInt(listMatch[1], 10);
    const maxCount = parseInt(listMatch[2], 10);
    const namesStr = (listMatch[3] || '').trim();

    const players = [];
    if (namesStr) {
      // Split by comma
      const rawNames = namesStr.split(',').map(n => n.trim()).filter(Boolean);
      for (const n of rawNames) {
        // Handle any trailing formatting or tags
        const cleanName = n.split(' ')[0];
        if (JAVA_USERNAME_REGEX.test(cleanName)) {
          players.push(cleanName);
        }
      }
    }

    return {
      type: 'list',
      onlineCount,
      maxCount,
      players,
      confidence: 'authoritative',
      source: 'live_server',
      timestamp: new Date().toISOString()
    };
  }

  return null;
}
