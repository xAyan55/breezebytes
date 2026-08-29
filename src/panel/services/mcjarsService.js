/**
 * MCJars API Service for dynamic Minecraft server version discovery
 * Source: https://mcjars.app/api/v2/builds/{type}
 */

const CACHE = new Map();

export const SUPPORTED_SOFTWARE = [
  {
    id: 'paper',
    name: 'Paper',
    tagline: 'High Performance & Plugins',
    description: 'Highly optimized Spigot fork with extensive Bukkit/Spigot/Paper plugin support and anti-lag enhancements.',
    recommended: true,
  },
  {
    id: 'vanilla',
    name: 'Vanilla',
    tagline: 'Official Mojang Release',
    description: 'Pure, unmodified official Minecraft server experience straight from Mojang Studios.',
  },
  {
    id: 'purpur',
    name: 'Purpur',
    tagline: 'Ultra Customizable',
    description: 'Drop-in Paper replacement designed for gameplay customization, extra configuration options, and high TPS.',
  },
  {
    id: 'forge',
    name: 'Forge',
    tagline: 'Classic Modpacks',
    description: 'The standard modding engine for heavy Minecraft mods, tech packs, magic, and custom dimensions.',
  },
  {
    id: 'fabric',
    name: 'Fabric',
    tagline: 'Lightweight & Modern Mods',
    description: 'Fast, lightweight modding toolchain with rapid snapshot updates, Sodium/Iris shaders, and modern optimizations.',
  },
  {
    id: 'velocity',
    name: 'Velocity',
    tagline: 'Next-Gen Proxy Network',
    description: 'Modern, high-performance proxy server for connecting multiple Minecraft server worlds and networks together.',
  },
];

// Fallback versions if external API is temporarily unreachable
const FALLBACK_VERSIONS = {
  paper: ['1.21.1', '1.21', '1.20.4', '1.20.2', '1.20.1', '1.19.4', '1.18.2', '1.16.5', '1.12.2', '1.8.8'],
  vanilla: ['1.21.1', '1.21', '1.20.4', '1.20.2', '1.20.1', '1.19.4', '1.18.2', '1.16.5', '1.12.2', '1.8.9'],
  purpur: ['1.21.1', '1.21', '1.20.4', '1.20.2', '1.20.1', '1.19.4', '1.18.2', '1.16.5'],
  forge: ['1.21.1', '1.20.4', '1.20.1', '1.19.4', '1.18.2', '1.16.5', '1.12.2', '1.7.10'],
  fabric: ['1.21.1', '1.21', '1.20.4', '1.20.2', '1.20.1', '1.19.4', '1.18.2', '1.16.5'],
  velocity: ['3.3.0-SNAPSHOT', '3.2.0-SNAPSHOT', '3.1.2-SNAPSHOT', '3.1.1'],
};

/**
 * Parse version string for semantic Minecraft version sorting
 */
function parseVersion(v) {
  const clean = String(v).trim().replace(/^v/i, '');
  const isSnapshot = /snapshot|pre|rc|alpha|beta|-/i.test(clean);
  const numericPart = clean.split(/[-_]/)[0];
  const parts = numericPart.split('.').map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);

  return {
    major: parts[0],
    minor: parts[1],
    patch: parts[2],
    isSnapshot,
    original: v,
  };
}

/**
 * Compare two Minecraft versions from newest to oldest
 */
function compareMinecraftVersions(a, b) {
  const pa = parseVersion(a.version || a);
  const pb = parseVersion(b.version || b);

  // If major differs
  if (pa.major !== pb.major) return pb.major - pa.major;
  // If minor differs (e.g. 21 vs 20)
  if (pa.minor !== pb.minor) return pb.minor - pa.minor;
  // If patch differs (e.g. 4 vs 1)
  if (pa.patch !== pb.patch) return pb.patch - pa.patch;

  // Releases before snapshots of same version
  if (pa.isSnapshot !== pb.isSnapshot) {
    return pa.isSnapshot ? 1 : -1;
  }

  return (b.version || b).localeCompare(a.version || a);
}

/**
 * Fetch available versions for a given server software
 */
export async function getSoftwareVersions(softwareId) {
  const sw = softwareId.toLowerCase();

  // Return cached result if available
  if (CACHE.has(sw)) {
    return CACHE.get(sw);
  }

  try {
    const res = await fetch(`https://mcjars.app/api/v2/builds/${sw}`, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`MCJars API returned ${res.status}`);
    }

    const data = await res.json();
    if (!data || !data.builds || typeof data.builds !== 'object') {
      throw new Error('Invalid MCJars response payload');
    }

    const versionsList = Object.entries(data.builds).map(([versionKey, buildInfo]) => {
      const type = buildInfo?.type === 'SNAPSHOT' || /snapshot|pre|rc|alpha|beta/i.test(versionKey)
        ? 'SNAPSHOT'
        : 'RELEASE';

      return {
        version: versionKey,
        type,
        java: buildInfo?.java || (parseInt(versionKey.split('.')[1] || '0', 10) >= 20 ? 21 : 17),
        supported: buildInfo?.supported ?? true,
        buildCount: buildInfo?.builds || 0,
        latestBuild: buildInfo?.latest?.buildNumber || buildInfo?.latest?.name || null,
        created: buildInfo?.created || null,
      };
    });

    // Sort versions from newest to oldest
    versionsList.sort(compareMinecraftVersions);

    CACHE.set(sw, versionsList);
    return versionsList;
  } catch (err) {
    console.warn(`[MCJARS] Could not fetch live versions for ${sw}, using fallback:`, err.message);

    const fallbacks = (FALLBACK_VERSIONS[sw] || FALLBACK_VERSIONS.paper).map((v) => ({
      version: v,
      type: 'RELEASE',
      java: 21,
      supported: true,
      buildCount: 1,
      latestBuild: 'latest',
    }));

    return fallbacks;
  }
}

/**
 * Filter versions matching search query
 */
export function filterVersions(versions, query) {
  if (!query || !query.trim()) {
    return versions;
  }

  const q = query.trim().toLowerCase();

  return versions.filter((v) => {
    const vStr = v.version.toLowerCase();
    return vStr.includes(q);
  });
}
