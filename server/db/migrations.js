import bcrypt from 'bcryptjs';
import { users, nodes, allocations } from './database.js';
import { FREE_PLAN } from '../config/plans.js';

export function runMigrations() {
  console.log('[DB] Running database initialization and seeding...');

  // 1. Seed default Node if not present
  if (nodes.count() === 0) {
    const defaultNode = nodes.insert({
      name: 'Local Node (BreezeBytes-01)',
      fqdn: '127.0.0.1',
      port: 3001,
      daemon_token: 'bb_daemon_token_' + Math.random().toString(36).substring(2, 15),
      memory_total: 24576, // 24 GB in MB
      disk_total: 50000,   // 50 GB in MB
      cpu_total: 400,      // 4 cores / 400%
      is_online: 1,
      last_heartbeat: new Date().toISOString()
    });
    console.log(`[DB] Seeded default Node (ID: ${defaultNode.id})`);

    // 2. Seed initial port allocations (25565 - 25575)
    for (let port = 25565; port <= 25575; port++) {
      allocations.insert({
        node_id: defaultNode.id,
        ip: '0.0.0.0',
        port: port,
        server_id: null,
        is_primary: 0
      });
    }
    console.log('[DB] Seeded port allocations (25565–25575)');
  }

  // 3. Seed Default Admin User: ceo@breezebytes.bond / aryanop55@
  const existingAdmin = users.findOne({ email: 'ceo@breezebytes.bond' });
  if (!existingAdmin) {
    const salt = bcrypt.genSaltSync(12);
    const password_hash = bcrypt.hashSync('aryanop55@', salt);
    const admin = users.insert({
      email: 'ceo@breezebytes.bond',
      username: 'CEO Admin',
      password_hash: password_hash,
      role: 'owner',
      is_suspended: 0,
      hosting_ram: FREE_PLAN.ramMb,
      hosting_cpu: FREE_PLAN.cpuPercent,
      hosting_disk: FREE_PLAN.diskMb,
      hosting_server_slots: FREE_PLAN.serverSlots,
      onboarding_completed: true,
    });
    console.log(`[DB] Seeded Administrator account: ${admin.email} (Role: ${admin.role})`);
  }

  // 4. Backfill user resource entitlements and onboarding completion for legacy users
  const allUsers = users.find();
  let migratedUsers = 0;
  for (const u of allUsers) {
    const updates = {};
    if (u.hosting_ram === undefined) updates.hosting_ram = FREE_PLAN.ramMb;
    if (u.hosting_cpu === undefined) updates.hosting_cpu = FREE_PLAN.cpuPercent;
    if (u.hosting_disk === undefined) updates.hosting_disk = FREE_PLAN.diskMb;
    if (u.hosting_server_slots === undefined) updates.hosting_server_slots = FREE_PLAN.serverSlots;
    if (u.onboarding_completed === undefined) updates.onboarding_completed = true;

    if (Object.keys(updates).length > 0) {
      users.update(u.id, updates);
      migratedUsers++;
    }
  }
  if (migratedUsers > 0) {
    console.log(`[DB] Migrated & backfilled ${migratedUsers} user(s) with resource entitlements.`);
  }

  console.log('[DB] Database ready.');
}

