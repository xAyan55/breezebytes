/**
 * BreezeBytes Authoritative Hosting Plans Configuration
 * Canonical resource units:
 * - RAM: MB
 * - CPU: percentage (100 = 1 full CPU thread)
 * - Disk: MB
 * - Server Slots: integer count
 */

export const FREE_PLAN = {
  name: 'Free Starter',
  ramMb: 4096,          // 4 GB RAM in MB
  cpuPercent: 100,      // 100% CPU (1 dedicated thread)
  diskMb: 10240,        // 10 GB NVMe Storage in MB
  serverSlots: 1,       // 1 Server instance
};

export default {
  FREE_PLAN,
};
