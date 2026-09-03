import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Imports to test
import { cleanConsoleLine, parseMinecraftConsoleLine, stripAnsi, JAVA_USERNAME_REGEX } from '../server/daemon/minecraftParser.js';
import { fileMutex } from '../server/services/fileMutex.js';
import { profileResolver } from '../server/daemon/profileResolver.js';
import { sanitizeReason, playerManager } from '../server/daemon/playerManager.js';
import { servers, server_players } from '../server/db/database.js';

console.log('\n========================================');
console.log('🧪 RUNNING BREEZEBYTES PLAYER MANAGER 2.0 TEST SUITE');
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
    console.log('❌ FAIL');
    console.error(err);
    failedTests++;
  }
}

const TEST_DIR = path.join(__dirname, '../data/test_player_server');
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

// -----------------------------------------------------
// 1. MINECRAFT CONSOLE PARSER & ANSI STRIPPING
// -----------------------------------------------------
await runTest('1. Parser - ANSI normalization & logger prefix stripping', () => {
  const colored = '\u001b[32m[12:34:56 INFO]: \u001b[mSteve joined the game';
  assert.equal(cleanConsoleLine(colored), 'Steve joined the game');
});

await runTest('2. Parser - Vanilla / Paper join event with IP privacy stripping', () => {
  const line = '[Server thread/INFO]: VoidFlamer[/192.168.1.50:54321] logged in with entity id 42 at (-10.5, 64.0, 120.3)';
  const parsed = parseMinecraftConsoleLine(line);
  assert.notEqual(parsed, null);
  assert.equal(parsed.type, 'join');
  assert.equal(parsed.username, 'VoidFlamer');
  assert.equal(parsed.confidence, 'high');
  // Ensure IP was NOT included in username or leaked
  assert.equal(parsed.username.includes('192.168.1.50'), false);
});

await runTest('3. Parser - Paper/Purpur "joined the game" format', () => {
  const line = '[12:34:56.789] [Server thread/INFO]: Alex joined the game';
  const parsed = parseMinecraftConsoleLine(line);
  assert.notEqual(parsed, null);
  assert.equal(parsed.type, 'join');
  assert.equal(parsed.username, 'Alex');
});

await runTest('4. Parser - Leave event "lost connection"', () => {
  const line = '[12:35:10 INFO]: VoidFlamer lost connection: Disconnected';
  const parsed = parseMinecraftConsoleLine(line);
  assert.notEqual(parsed, null);
  assert.equal(parsed.type, 'leave');
  assert.equal(parsed.username, 'VoidFlamer');
});

await runTest('5. Parser - Leave event "left the game"', () => {
  const line = '[Server thread/INFO]: Steve left the game';
  const parsed = parseMinecraftConsoleLine(line);
  assert.notEqual(parsed, null);
  assert.equal(parsed.type, 'leave');
  assert.equal(parsed.username, 'Steve');
});

await runTest('6. Parser - Authoritative "list" command output', () => {
  const line = '[Server thread/INFO]: There are 3 of a max of 20 players online: Steve, Alex, VoidFlamer';
  const parsed = parseMinecraftConsoleLine(line);
  assert.notEqual(parsed, null);
  assert.equal(parsed.type, 'list');
  assert.equal(parsed.onlineCount, 3);
  assert.equal(parsed.maxCount, 20);
  assert.deepEqual(parsed.players, ['Steve', 'Alex', 'VoidFlamer']);
});

await runTest('7. Parser - Empty "list" command output', () => {
  const line = '[Server thread/INFO]: There are 0 of a max of 20 players online:';
  const parsed = parseMinecraftConsoleLine(line);
  assert.notEqual(parsed, null);
  assert.equal(parsed.type, 'list');
  assert.equal(parsed.onlineCount, 0);
  assert.deepEqual(parsed.players, []);
});

await runTest('8. Parser - Fails safe on unrecognized or ambiguous log lines', () => {
  const line = '[Server thread/INFO]: Preparing spawn area: 85%';
  const parsed = parseMinecraftConsoleLine(line);
  assert.equal(parsed, null);
});

// -----------------------------------------------------
// 2. COMMAND INJECTION DEFENSE & SANITIZATION
// -----------------------------------------------------
await runTest('9. Security - Java username regex blocks command injection characters', () => {
  assert.equal(JAVA_USERNAME_REGEX.test('Steve;op Hacker'), false);
  assert.equal(JAVA_USERNAME_REGEX.test('Steve && op Hacker'), false);
  assert.equal(JAVA_USERNAME_REGEX.test('Steve\nop Hacker'), false);
  assert.equal(JAVA_USERNAME_REGEX.test('Steve\r\nban Hacker'), false);
  assert.equal(JAVA_USERNAME_REGEX.test('Steve\0op Hacker'), false);
  assert.equal(JAVA_USERNAME_REGEX.test('Steve`whoami`'), false);
  assert.equal(JAVA_USERNAME_REGEX.test('Steve$HACK'), false);
  assert.equal(JAVA_USERNAME_REGEX.test('Valid_Player_12'), true);
  assert.equal(JAVA_USERNAME_REGEX.test('A123456789012345'), true); // 16 chars valid
  assert.equal(JAVA_USERNAME_REGEX.test('TooLongPlayerName123'), false); // > 16 chars
});

await runTest('10. Security - Reason sanitizer strips CR, LF, NUL, and control chars', () => {
  const malicious = 'Griefing\r\nop Hacker\0extra\ntext';
  const sanitized = sanitizeReason(malicious, 'Banned');
  assert.equal(sanitized.includes('\r'), false);
  assert.equal(sanitized.includes('\n'), false);
  assert.equal(sanitized.includes('\0'), false);
  assert.equal(sanitized, 'Griefing  op Hacker extra text');
});

// -----------------------------------------------------
// 3. FILE MUTEX, ATOMIC WRITES & CORRUPTION SAFETY
// -----------------------------------------------------
await runTest('11. FileMutex - Atomic write with temporary file and fsync', () => {
  const testFile = path.join(TEST_DIR, 'ops_test.json');
  const initialData = [{ uuid: '123', name: 'Steve', level: 4, customMeta: 'preserved' }];

  fileMutex.writeJsonAtomic(testFile, initialData);
  assert.equal(fs.existsSync(testFile), true);

  const readBack = fileMutex.readJsonSafe(testFile);
  assert.equal(readBack.ok, true);
  assert.equal(readBack.data[0].customMeta, 'preserved');
});

await runTest('12. FileMutex - Pre-commit check aborts write if server state changes', () => {
  const testFile = path.join(TEST_DIR, 'whitelist_abort.json');
  let serverBecameActive = true;

  assert.throws(() => {
    fileMutex.writeJsonAtomic(testFile, [{ name: 'Alex' }], () => !serverBecameActive);
  }, /PRECOMMIT_CHECK_FAILED/);
});

await runTest('13. FileMutex - Corrupted JSON file is PRESERVED, not overwritten or wiped to []', () => {
  const corruptFile = path.join(TEST_DIR, 'corrupt.json');
  fs.writeFileSync(corruptFile, '{ malformed json content...', 'utf8');

  const result = fileMutex.readJsonSafe(corruptFile);
  assert.equal(result.ok, false);
  assert.equal(result.error, 'FILE_CORRUPTED');

  // Verify file content was NOT wiped
  assert.equal(fs.readFileSync(corruptFile, 'utf8'), '{ malformed json content...');
});

await runTest('14. FileMutex - Unknown JSON fields are preserved across updates', () => {
  const testFile = path.join(TEST_DIR, 'ops_unknown_fields.json');
  const original = [
    { uuid: 'u-1', name: 'AdminPlayer', level: 4, bypassesPlayerLimit: true, specialPluginData: { role: 'mod' } }
  ];
  fileMutex.writeJsonAtomic(testFile, original);

  // Read, append another player, write back
  const readRes = fileMutex.readJsonSafe(testFile);
  readRes.data.push({ uuid: 'u-2', name: 'NewOp', level: 4, bypassesPlayerLimit: false });
  fileMutex.writeJsonAtomic(testFile, readRes.data);

  // Check that specialPluginData was preserved
  const updated = fileMutex.readJsonSafe(testFile).data;
  assert.equal(updated.length, 2);
  assert.deepEqual(updated[0].specialPluginData, { role: 'mod' });
});

// -----------------------------------------------------
// 4. BOUNDED PROFILE RESOLVER & DEDUPLICATION
// -----------------------------------------------------
await runTest('15. ProfileResolver - In-flight request deduplication', async () => {
  // Mock internal fetch
  let fetchCount = 0;
  const originalFetch = profileResolver._fetchFromMojang;
  profileResolver._fetchFromMojang = async (u) => {
    fetchCount++;
    await new Promise(r => setTimeout(r, 50));
    return { uuid: 'mock-uuid-steve', username: u };
  };

  try {
    const p1 = profileResolver.resolve('SteveInflight');
    const p2 = profileResolver.resolve('SteveInflight');
    const [res1, res2] = await Promise.all([p1, p2]);

    assert.equal(fetchCount, 1); // Exact deduplication!
    assert.equal(res1.uuid, 'mock-uuid-steve');
    assert.equal(res2.uuid, 'mock-uuid-steve');
  } finally {
    profileResolver._fetchFromMojang = originalFetch;
  }
});

// -----------------------------------------------------
// 5. DETERMINISTIC PLAYER IDENTITY MERGING
// -----------------------------------------------------
await runTest('16. Reconciliation - Merging temporary username into canonical UUID record', () => {
  const sId = 9991;
  server_players.deleteWhere({ server_id: sId });

  const past = new Date(Date.now() - 3600000).toISOString();

  // Create temporary username record
  const tempUser = server_players.insert({
    server_id: sId,
    uuid: '',
    username: 'MergePlayer',
    first_seen: past,
    last_seen: null,
    created_at: past,
    updated_at: past
  });

  // Reconcile when UUID is discovered
  playerManager.mergePlayerIdentity(sId, 'MergePlayer', '00000000-0000-0000-0000-000000000001');

  const updated = server_players.findById(tempUser.id);
  assert.equal(updated.uuid, '00000000-0000-0000-0000-000000000001');
  assert.equal(updated.first_seen, past); // Preserved!
  server_players.deleteWhere({ server_id: sId });
});

await runTest('17. Reconciliation - Username change updates existing UUID record without duplicate', () => {
  const sId = 9992;
  server_players.deleteWhere({ server_id: sId });

  const now = new Date().toISOString();

  const playerRec = server_players.insert({
    server_id: sId,
    uuid: '00000000-0000-0000-0000-000000000002',
    username: 'OldUsername',
    first_seen: now,
    last_seen: null,
    created_at: now,
    updated_at: now
  });

  // Name changes to NewUsername
  playerManager.mergePlayerIdentity(sId, 'NewUsername', '00000000-0000-0000-0000-000000000002');

  const records = server_players.find({ server_id: sId, uuid: '00000000-0000-0000-0000-000000000002' });
  assert.equal(records.length, 1);
  assert.equal(records[0].username, 'NewUsername');
  server_players.deleteWhere({ server_id: sId });
});

// -----------------------------------------------------
// 6. ADMINISTRATIVE ACTIONS & OFFLINE SAFETY
// -----------------------------------------------------
await runTest('18. Actions - Kick requires server online and rejects when offline', async () => {
  // Server 999 is offline
  await assert.rejects(
    async () => {
      await playerManager.kickPlayer(999, 'Steve', 'test kick');
    },
    (err) => err.code === 'SERVER_OFFLINE'
  );
});

await runTest('19. Actions - Malicious username injection rejected on kick/ban/op', async () => {
  await assert.rejects(
    async () => {
      await playerManager.banPlayer(999, 'Steve;op Hacker', 'test');
    },
    (err) => err.code === 'INVALID_USERNAME'
  );

  await assert.rejects(
    async () => {
      await playerManager.opPlayer(999, 'Steve\nop Hacker');
    },
    (err) => err.code === 'INVALID_USERNAME'
  );
});

// Cleanup test folder
try {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
} catch {}

console.log('\n========================================');
console.log(`📊 SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('========================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
