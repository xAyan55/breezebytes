import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'node:assert/strict';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Isolate test database directory before importing database module
const TEST_DATA_DIR = path.join(__dirname, '../temp_test_data');
if (fs.existsSync(TEST_DATA_DIR)) {
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
process.env.DATA_DIR = TEST_DATA_DIR;

// Now import database, plans, resourceService, and migrations
const { users, servers, nodes, allocations, server_subusers } = await import('../server/db/database.js');
const { FREE_PLAN } = await import('../server/config/plans.js');
const {
  getUserResourceStats,
  validateUserResourceQuota,
  withUserLock,
} = await import('../server/services/resourceService.js');
const { runMigrations } = await import('../server/db/migrations.js');

console.log('\n========================================');
console.log('🧪 RUNNING BREEZEBYTES ENTITLEMENT TEST SUITE');
console.log('========================================\n');

let passedTests = 0;
let failedTests = 0;

async function runTest(name, fn) {
  try {
    process.stdout.write(`⏳ ${name}... `);
    await fn();
    console.log('✅ PASS');
    passedTests++;
  } catch (err) {
    console.log(`❌ FAIL: ${err.message}`);
    console.error(err);
    failedTests++;
  }
}

// Initial setup: seed node and allocations
const testNode = nodes.insert({
  name: 'Test Node',
  fqdn: '127.0.0.1',
  port: 3001,
  daemon_token: 'test_token',
  memory_total: 24576,
  disk_total: 50000,
  cpu_total: 400,
  is_online: 1,
});

for (let p = 25565; p <= 25580; p++) {
  allocations.insert({
    node_id: testNode.id,
    ip: '0.0.0.0',
    port: p,
    server_id: null,
    is_primary: 0,
  });
}

// TEST 1 — New registration
let user1;
await runTest('TEST 1 — New registration assigns 4GB RAM, 100% CPU, 10GB disk, 1 slot, onboarding_completed: false', async () => {
  user1 = users.insert({
    email: 'newuser@breezebytes.bond',
    username: 'newuser',
    password_hash: 'hash123',
    role: 'user',
    is_suspended: 0,
    hosting_ram: FREE_PLAN.ramMb,
    hosting_cpu: FREE_PLAN.cpuPercent,
    hosting_disk: FREE_PLAN.diskMb,
    hosting_server_slots: FREE_PLAN.serverSlots,
    onboarding_completed: false,
  });

  assert.equal(user1.hosting_ram, 4096, 'RAM must be 4096 MB');
  assert.equal(user1.hosting_cpu, 100, 'CPU must be 100%');
  assert.equal(user1.hosting_disk, 10240, 'Disk must be 10240 MB');
  assert.equal(user1.hosting_server_slots, 1, 'Server slots must be 1');
  assert.equal(user1.onboarding_completed, false, 'Onboarding must be incomplete');

  const owned = servers.find({ owner_id: user1.id });
  assert.equal(owned.length, 0, 'No server should be created during registration');
});

// TEST 2 — Initial resources
await runTest('TEST 2 — Initial resources show 0 used and full canonical entitlement available', async () => {
  const stats = getUserResourceStats(user1.id);
  assert.ok(stats, 'Stats must exist');

  assert.equal(stats.ram.used, 0);
  assert.equal(stats.ram.limit, 4096);
  assert.equal(stats.ram.available, 4096);

  assert.equal(stats.cpu.used, 0);
  assert.equal(stats.cpu.limit, 100);
  assert.equal(stats.cpu.available, 100);

  assert.equal(stats.disk.used, 0);
  assert.equal(stats.disk.limit, 10240);
  assert.equal(stats.disk.available, 10240);

  assert.equal(stats.servers.used, 0);
  assert.equal(stats.servers.limit, 1);
  assert.equal(stats.servers.available, 1);
});

// TEST 3 — Onboarding skip
await runTest('TEST 3 — Onboarding skip marks completed without consuming any quota', async () => {
  users.update(user1.id, { onboarding_completed: true });
  const updatedUser = users.findById(user1.id);
  assert.equal(updatedUser.onboarding_completed, true);

  const stats = getUserResourceStats(user1.id);
  assert.equal(stats.ram.used, 0);
  assert.equal(stats.ram.available, 4096);
  assert.equal(stats.cpu.used, 0);
  assert.equal(stats.cpu.available, 100);
  assert.equal(stats.disk.used, 0);
  assert.equal(stats.disk.available, 10240);
  assert.equal(stats.servers.used, 0);
  assert.equal(stats.servers.available, 1);

  const owned = servers.find({ owner_id: user1.id });
  assert.equal(owned.length, 0, 'Skip must not create any server instance');
});

// TEST 4 — First server
let server1;
await runTest('TEST 4 — Creating first server allocates resources and reduces available quota to 0', async () => {
  // Validate quota
  const check = validateUserResourceQuota(user1.id, { memory: 4096, cpu: 100, disk: 10240 }, false);
  assert.equal(check.allowed, true);

  server1 = servers.insert({
    uuid: 'server-uuid-1',
    identifier: 'srv1',
    name: 'Survival SMP',
    owner_id: user1.id,
    node_id: testNode.id,
    status: 'offline',
    memory: 4096,
    cpu: 100,
    disk: 10240,
  });

  const stats = getUserResourceStats(user1.id);
  assert.equal(stats.ram.used, 4096);
  assert.equal(stats.ram.available, 0);
  assert.equal(stats.cpu.used, 100);
  assert.equal(stats.cpu.available, 0);
  assert.equal(stats.disk.used, 10240);
  assert.equal(stats.disk.available, 0);
  assert.equal(stats.servers.used, 1);
  assert.equal(stats.servers.available, 0);
});

// TEST 5 — Second server
await runTest('TEST 5 — Attempting to create second server fails with SERVER_SLOT_LIMIT', async () => {
  assert.throws(
    () => {
      validateUserResourceQuota(user1.id, { memory: 2048, cpu: 50, disk: 5000 }, false);
    },
    (err) => {
      assert.equal(err.code, 'SERVER_SLOT_LIMIT');
      return true;
    }
  );
});

// TEST 6 — RAM over-allocation
await runTest('TEST 6 — Attempting to allocate more RAM than available fails with INSUFFICIENT_RAM', async () => {
  // Create user with 2 slots but 4096 RAM limit
  const userRamTest = users.insert({
    email: 'ramtest@breezebytes.bond',
    username: 'ramtest',
    password_hash: 'hash',
    role: 'user',
    hosting_ram: 4096,
    hosting_cpu: 200,
    hosting_disk: 20000,
    hosting_server_slots: 2,
  });

  assert.throws(
    () => {
      validateUserResourceQuota(userRamTest.id, { memory: 8192, cpu: 100, disk: 10000 }, false);
    },
    (err) => {
      assert.equal(err.code, 'INSUFFICIENT_RAM');
      return true;
    }
  );
});

// TEST 7 — CPU over-allocation
await runTest('TEST 7 — Attempting to allocate more CPU than available fails with INSUFFICIENT_CPU', async () => {
  const userCpuTest = users.insert({
    email: 'cputest@breezebytes.bond',
    username: 'cputest',
    password_hash: 'hash',
    role: 'user',
    hosting_ram: 8192,
    hosting_cpu: 100,
    hosting_disk: 20000,
    hosting_server_slots: 2,
  });

  assert.throws(
    () => {
      validateUserResourceQuota(userCpuTest.id, { memory: 2048, cpu: 150, disk: 5000 }, false);
    },
    (err) => {
      assert.equal(err.code, 'INSUFFICIENT_CPU');
      return true;
    }
  );
});

// TEST 8 — Disk over-allocation
await runTest('TEST 8 — Attempting to allocate more Disk than available fails with INSUFFICIENT_DISK', async () => {
  const userDiskTest = users.insert({
    email: 'disktest@breezebytes.bond',
    username: 'disktest',
    password_hash: 'hash',
    role: 'user',
    hosting_ram: 8192,
    hosting_cpu: 200,
    hosting_disk: 10240,
    hosting_server_slots: 2,
  });

  assert.throws(
    () => {
      validateUserResourceQuota(userDiskTest.id, { memory: 2048, cpu: 50, disk: 20000 }, false);
    },
    (err) => {
      assert.equal(err.code, 'INSUFFICIENT_DISK');
      return true;
    }
  );
});

// TEST 9 — Delete server
await runTest('TEST 9 — Deleting owned server automatically releases quota back to available', async () => {
  servers.delete(server1.id);

  const stats = getUserResourceStats(user1.id);
  assert.equal(stats.ram.used, 0);
  assert.equal(stats.ram.available, 4096);
  assert.equal(stats.cpu.used, 0);
  assert.equal(stats.cpu.available, 100);
  assert.equal(stats.disk.used, 0);
  assert.equal(stats.disk.available, 10240);
  assert.equal(stats.servers.used, 0);
  assert.equal(stats.servers.available, 1);
});

// TEST 10 — Ownership
await runTest('TEST 10 — User A cannot consume User B quota', async () => {
  const userA = users.insert({
    email: 'userA@breezebytes.bond',
    username: 'userA',
    password_hash: 'hash',
    role: 'user',
    hosting_ram: 4096,
    hosting_cpu: 100,
    hosting_disk: 10240,
    hosting_server_slots: 1,
  });

  const userB = users.insert({
    email: 'userB@breezebytes.bond',
    username: 'userB',
    password_hash: 'hash',
    role: 'user',
    hosting_ram: 4096,
    hosting_cpu: 100,
    hosting_disk: 10240,
    hosting_server_slots: 1,
  });

  // User A creates a server
  servers.insert({
    uuid: 'server-userA',
    identifier: 'srvA',
    name: 'Server A',
    owner_id: userA.id,
    node_id: testNode.id,
    memory: 4096,
    cpu: 100,
    disk: 10240,
  });

  // User B's quota should be 100% untouched
  const statsB = getUserResourceStats(userB.id);
  assert.equal(statsB.servers.used, 0);
  assert.equal(statsB.servers.available, 1);
  assert.equal(statsB.ram.available, 4096);

  // User A has 0 available slots
  const statsA = getUserResourceStats(userA.id);
  assert.equal(statsA.servers.available, 0);
});

// TEST 11 — Subusers
await runTest('TEST 11 — Subuser membership does NOT consume subuser server slot or resource quota', async () => {
  const ownerUser = users.insert({
    email: 'owner@breezebytes.bond',
    username: 'owner',
    password_hash: 'hash',
    role: 'user',
    hosting_ram: 4096,
    hosting_cpu: 100,
    hosting_disk: 10240,
    hosting_server_slots: 1,
  });

  const subUser = users.insert({
    email: 'subuser@breezebytes.bond',
    username: 'subuser',
    password_hash: 'hash',
    role: 'user',
    hosting_ram: 4096,
    hosting_cpu: 100,
    hosting_disk: 10240,
    hosting_server_slots: 1,
  });

  const ownerServer = servers.insert({
    uuid: 'server-owner',
    identifier: 'srvOwn',
    name: 'Owner Server',
    owner_id: ownerUser.id,
    node_id: testNode.id,
    memory: 4096,
    cpu: 100,
    disk: 10240,
  });

  // Add subUser as member/subuser
  server_subusers.insert({
    server_id: ownerServer.id,
    user_id: subUser.id,
    permissions: JSON.stringify(['console.view']),
  });

  // Subuser's quota must NOT be consumed
  const subStats = getUserResourceStats(subUser.id);
  assert.equal(subStats.servers.used, 0, 'Subuser must have 0 servers used');
  assert.equal(subStats.servers.available, 1, 'Subuser must have 1 slot available');
  assert.equal(subStats.ram.used, 0, 'Subuser RAM used must be 0');
  assert.equal(subStats.ram.available, 4096);
});

// TEST 12 — Legacy migration
await runTest('TEST 12 — Legacy migration safely backfills missing fields idempotently', async () => {
  // Insert raw legacy user missing hosting fields and onboarding_completed
  const legacyUser = users.insert({
    email: 'legacy@breezebytes.bond',
    username: 'legacyUser',
    password_hash: 'hash',
    role: 'user',
    is_suspended: 0,
  });

  assert.equal(legacyUser.hosting_ram, undefined);

  // Run migration 1st time
  runMigrations();

  const migrated1 = users.findById(legacyUser.id);
  assert.equal(migrated1.hosting_ram, 4096);
  assert.equal(migrated1.hosting_cpu, 100);
  assert.equal(migrated1.hosting_disk, 10240);
  assert.equal(migrated1.hosting_server_slots, 1);
  assert.equal(migrated1.onboarding_completed, true);

  // Run migration 2nd time to verify idempotence and no data corruption
  runMigrations();

  const migrated2 = users.findById(legacyUser.id);
  assert.equal(migrated2.hosting_ram, 4096);
  assert.equal(migrated2.hosting_server_slots, 1);
  assert.equal(migrated2.onboarding_completed, true);
});

// TEST 13 — Existing onboarded users
await runTest('TEST 13 — Established migrated legacy user is marked onboarding_completed: true', async () => {
  const legacyUser = users.findOne({ email: 'legacy@breezebytes.bond' });
  assert.equal(legacyUser.onboarding_completed, true, 'Legacy users should not be forced into onboarding');
});

// TEST 14 — Failed provisioning
await runTest('TEST 14 — Failed provisioning validation does not mutate state or consume resources', async () => {
  const failUser = users.insert({
    email: 'failuser@breezebytes.bond',
    username: 'failuser',
    password_hash: 'hash',
    role: 'user',
    hosting_ram: 4096,
    hosting_cpu: 100,
    hosting_disk: 10240,
    hosting_server_slots: 1,
    onboarding_completed: false,
  });

  // Attempt invalid quota check (e.g. asking for 16384 MB)
  assert.throws(() => {
    validateUserResourceQuota(failUser.id, { memory: 16384, cpu: 100, disk: 10240 }, false);
  });

  // Verify onboarding status is still false and usage is 0
  const refreshedUser = users.findById(failUser.id);
  assert.equal(refreshedUser.onboarding_completed, false);
  const stats = getUserResourceStats(failUser.id);
  assert.equal(stats.servers.used, 0);
  assert.equal(stats.ram.used, 0);
});

// TEST 15 — Concurrent creation
await runTest('TEST 15 — Concurrent server creation requests against a 1-slot entitlement: only ONE succeeds', async () => {
  const concurUser = users.insert({
    email: 'concur@breezebytes.bond',
    username: 'concurUser',
    password_hash: 'hash',
    role: 'user',
    hosting_ram: 4096,
    hosting_cpu: 100,
    hosting_disk: 10240,
    hosting_server_slots: 1,
    onboarding_completed: false,
  });

  // Function simulating the atomic server creation endpoint
  const createServerAttempt = async (attemptName) => {
    return withUserLock(concurUser.id, async () => {
      // Small artificial delay to ensure concurrency overlap
      await new Promise((r) => setTimeout(r, 10));

      validateUserResourceQuota(
        concurUser.id,
        { memory: 4096, cpu: 100, disk: 10240 },
        false
      );

      const s = servers.insert({
        uuid: `srv-concur-${Math.random().toString(36).substring(2, 8)}`,
        identifier: 'concur',
        name: attemptName,
        owner_id: concurUser.id,
        node_id: testNode.id,
        memory: 4096,
        cpu: 100,
        disk: 10240,
      });

      users.update(concurUser.id, { onboarding_completed: true });
      return s;
    });
  };

  // Launch 5 concurrent creation attempts at the same time
  const results = await Promise.allSettled([
    createServerAttempt('Request #1'),
    createServerAttempt('Request #2'),
    createServerAttempt('Request #3'),
    createServerAttempt('Request #4'),
    createServerAttempt('Request #5'),
  ]);

  const successes = results.filter((r) => r.status === 'fulfilled');
  const rejections = results.filter((r) => r.status === 'rejected');

  assert.equal(successes.length, 1, `Exactly 1 creation must succeed, got ${successes.length}`);
  assert.equal(rejections.length, 4, `Exactly 4 creations must be rejected, got ${rejections.length}`);

  for (const rej of rejections) {
    assert.equal(rej.reason.code, 'SERVER_SLOT_LIMIT', 'Rejections must have SERVER_SLOT_LIMIT error code');
  }

  const owned = servers.find({ owner_id: concurUser.id });
  assert.equal(owned.length, 1, 'Total servers created in DB must be exactly 1');
});

// Clean up test data
try {
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
} catch {}

console.log('\n========================================');
console.log(`📊 SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('========================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
