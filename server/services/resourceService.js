import { users, servers } from '../db/database.js';
import { FREE_PLAN } from '../config/plans.js';

// In-memory per-user lock queues to prevent concurrent race conditions
const userLocks = new Map();

/**
 * Executes an async task holding an exclusive lock for the given userId.
 * Guarantees serial execution of resource-allocating requests per user.
 */
export async function withUserLock(userId, fn) {
  const key = String(userId);
  let queue = userLocks.get(key);

  if (!queue) {
    queue = Promise.resolve();
    userLocks.set(key, queue);
  }

  let release;
  const lockPromise = new Promise((resolve) => {
    release = resolve;
  });

  const currentOp = queue.then(async () => {
    try {
      return await fn();
    } finally {
      release();
    }
  });

  // Keep queue chain alive
  userLocks.set(key, lockPromise);

  try {
    return await currentOp;
  } finally {
    if (userLocks.get(key) === lockPromise) {
      userLocks.delete(key);
    }
  }
}

/**
 * Returns canonical resource statistics for a user.
 * Derived strictly from active server records where owner_id === user.id.
 * Subusers / members do not consume their own quota.
 */
export function getUserResourceStats(userId) {
  const numId = Number(userId);
  const user = users.findById(numId);
  if (!user) {
    return null;
  }

  // Canonical limits (fall back to FREE_PLAN defaults if not set)
  const limitRam = Number(user.hosting_ram !== undefined ? user.hosting_ram : FREE_PLAN.ramMb);
  const limitCpu = Number(user.hosting_cpu !== undefined ? user.hosting_cpu : FREE_PLAN.cpuPercent);
  const limitDisk = Number(user.hosting_disk !== undefined ? user.hosting_disk : FREE_PLAN.diskMb);
  const limitSlots = Number(user.hosting_server_slots !== undefined ? user.hosting_server_slots : FREE_PLAN.serverSlots);

  // Derive usage strictly from owned servers
  const ownedServers = servers.find((s) => Number(s.owner_id) === numId);

  const usedRam = ownedServers.reduce((sum, s) => sum + (Number(s.memory) || 0), 0);
  const usedCpu = ownedServers.reduce((sum, s) => sum + (Number(s.cpu) || 0), 0);
  const usedDisk = ownedServers.reduce((sum, s) => sum + (Number(s.disk) || 0), 0);
  const usedSlots = ownedServers.length;

  const availableRam = Math.max(0, limitRam - usedRam);
  const availableCpu = Math.max(0, limitCpu - usedCpu);
  const availableDisk = Math.max(0, limitDisk - usedDisk);
  const availableSlots = Math.max(0, limitSlots - usedSlots);

  return {
    ram: {
      used: usedRam,
      limit: limitRam,
      available: availableRam,
    },
    cpu: {
      used: usedCpu,
      limit: limitCpu,
      available: availableCpu,
    },
    disk: {
      used: usedDisk,
      limit: limitDisk,
      available: availableDisk,
    },
    servers: {
      used: usedSlots,
      limit: limitSlots,
      available: availableSlots,
    },
  };
}

/**
 * Validates whether the user has sufficient available quota to provision a server.
 * Throws a structured error with the appropriate machine-readable error code if invalid.
 */
export function validateUserResourceQuota(userId, { memory, cpu, disk }, isPrivileged = false) {
  const stats = getUserResourceStats(userId);
  if (!stats) {
    const err = new Error('User account not found.');
    err.code = 'USER_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  // Privileged roles (owner / admin) bypass standard user hosting quotas
  if (isPrivileged) {
    return { allowed: true, stats };
  }

  const reqMemory = Number(memory);
  const reqCpu = Number(cpu);
  const reqDisk = Number(disk);

  if (stats.servers.available < 1) {
    const err = new Error('You have reached your server limit.');
    err.code = 'SERVER_SLOT_LIMIT';
    err.status = 400;
    throw err;
  }

  if (reqMemory > stats.ram.available) {
    const err = new Error('Your account does not have enough RAM available.');
    err.code = 'INSUFFICIENT_RAM';
    err.status = 400;
    throw err;
  }

  if (reqCpu > stats.cpu.available) {
    const err = new Error('Your account does not have enough CPU available.');
    err.code = 'INSUFFICIENT_CPU';
    err.status = 400;
    throw err;
  }

  if (reqDisk > stats.disk.available) {
    const err = new Error('Your account does not have enough disk storage available.');
    err.code = 'INSUFFICIENT_DISK';
    err.status = 400;
    throw err;
  }

  return { allowed: true, stats };
}

export default {
  withUserLock,
  getUserResourceStats,
  validateUserResourceQuota,
};
