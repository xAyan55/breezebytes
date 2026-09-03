import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'node:assert/strict';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Isolate test database & servers directory
const TEST_DATA_DIR = path.join(__dirname, '../temp_test_files_data');
const TEST_SERVERS_DIR = path.join(TEST_DATA_DIR, 'servers');
if (fs.existsSync(TEST_DATA_DIR)) {
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEST_SERVERS_DIR, { recursive: true });
process.env.DATA_DIR = TEST_DATA_DIR;
process.env.SERVERS_DIR = TEST_SERVERS_DIR;

const { servers } = await import('../server/db/database.js');
const { fileManager } = await import('../server/daemon/fileManager.js');

console.log('\n========================================');
console.log('🧪 RUNNING BREEZEBYTES FILE MANAGER TEST SUITE');
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

// Seed a dummy server
const testServer = servers.insert({
  uuid: 'test-server-files-uuid',
  name: 'Test File Server',
  owner_id: 1,
  node_id: 1,
  status: 'offline',
});

// 1. Write file
await runTest('1. writeFile writes text file within server root', async () => {
  await fileManager.writeFile(testServer.id, 'server.properties', 'motd=BreezeBytes\nport=25565');
  const serverDir = path.join(TEST_SERVERS_DIR, testServer.uuid);
  const filePath = path.join(serverDir, 'server.properties');
  assert.equal(fs.existsSync(filePath), true);
  assert.equal(fs.readFileSync(filePath, 'utf8'), 'motd=BreezeBytes\nport=25565');
});

// 2. Read file with leading slash
await runTest('2. readFile reads file with leading slash', async () => {
  const content = await fileManager.readFile(testServer.id, '/server.properties');
  assert.equal(content, 'motd=BreezeBytes\nport=25565');
});

// 3. Read file without leading slash
await runTest('3. readFile reads file without leading slash', async () => {
  const content = await fileManager.readFile(testServer.id, 'server.properties');
  assert.equal(content, 'motd=BreezeBytes\nport=25565');
});

// 4. Path traversal protection
await runTest('4. resolveSafePath prevents directory traversal from escaping root', async () => {
  const { fullPath, root } = fileManager.resolveSafePath(testServer.id, '../../etc/passwd');
  assert.equal(fullPath.startsWith(root), true);
  assert.equal(fullPath.includes('..'), false);
});

// 5. Create folder and write nested file
await runTest('5. createFolder and write nested file', async () => {
  await fileManager.createFolder(testServer.id, 'plugins/TestPlugin');
  await fileManager.writeFile(testServer.id, 'plugins/TestPlugin/config.yml', 'enabled: true');
  const content = await fileManager.readFile(testServer.id, '/plugins/TestPlugin/config.yml');
  assert.equal(content, 'enabled: true');
});

// 6. List files
await runTest('6. listFiles lists items with correct metadata', async () => {
  const files = await fileManager.listFiles(testServer.id, '/');
  const names = files.map(f => f.name);
  assert.equal(names.includes('server.properties'), true);
  assert.equal(names.includes('plugins'), true);
});

// Cleanup test data
if (fs.existsSync(TEST_DATA_DIR)) {
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
}

console.log('\n========================================');
console.log(`📊 SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('========================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
