import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'node:assert/strict';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Isolate test database directory
const TEST_DATA_DIR = path.join(__dirname, '../temp_test_playit_data');
if (fs.existsSync(TEST_DATA_DIR)) {
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
process.env.DATA_DIR = TEST_DATA_DIR;

console.log('\n======================================================');
console.log('🧪 RUNNING BREEZEBYTES PLAYIT ZERO-CONFIG TEST SUITE');
console.log('======================================================\n');

// 2. Set up Mock Playit Official V1 API Server
const MOCK_AGENT_ID = '3d8a5c4e-1234-5678-9abc-def012345678';
const MOCK_SECRET_KEY = 'playit_secret_test_key_deadbeef1337';
let mockTunnels = [];
let mockRateLimitRemaining = 0;
let mock503Remaining = 0;
let lastCreatedTunnel = null;
let lastConfiguredTunnel = null;

const mockServer = http.createServer(async (req, res) => {
  let bodyStr = '';
  req.on('data', chunk => { bodyStr += chunk; });
  req.on('end', () => {
    let body = {};
    try { if (bodyStr) body = JSON.parse(bodyStr); } catch {}

    const authHeader = req.headers['authorization'];

    // Simulate 429 Rate Limit
    if (mockRateLimitRemaining > 0) {
      mockRateLimitRemaining--;
      res.writeHead(429, {
        'Content-Type': 'application/json',
        'Retry-After': '1',
      });
      res.end(JSON.stringify({ status: 'fail', data: 'RateLimitExceeded' }));
      return;
    }

    // Simulate 503 Transient Error
    if (mock503Remaining > 0) {
      mock503Remaining--;
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', data: 'ServiceUnavailable' }));
      return;
    }

    // Require Auth for /v1/* and /tunnels/*
    if (req.url.startsWith('/v1/') || req.url.startsWith('/tunnels/')) {
      if (authHeader !== `Agent-Key ${MOCK_SECRET_KEY}`) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'fail', data: 'RequiresVerifiedAccount' }));
        return;
      }
    }

    // Official V1 Endpoints
    if (req.url === '/v1/agents/rundata') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'success',
        data: {
          agent_id: MOCK_AGENT_ID,
          version: '1.0.10',
          tunnels: mockTunnels.map(t => ({
            id: t.id,
            name: t.name,
            display_address: `${t.id}.playit.gg:${t.publicPort}`,
            tunnel_type: t.tunnel_type,
            port_type: t.port_type,
          })),
        },
      }));
      return;
    }

    if (req.url === '/v1/tunnels/list') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'success',
        data: {
          tunnels: mockTunnels.map(t => ({
            id: t.id,
            name: t.name,
            user_enabled: t.enabled !== false,
            tunnel_type: t.tunnel_type,
            port_type: t.port_type,
            origin: {
              type: 'agent',
              details: {
                agent_id: MOCK_AGENT_ID,
                config_data: {
                  fields: [
                    { name: 'local_ip', value: t.localIp || '127.0.0.1' },
                    { name: 'local_port', value: String(t.localPort) },
                  ],
                },
              },
            },
            public_allocations: [
              {
                ip4: '147.185.221.16',
                port: { from: t.publicPort, to: t.publicPort },
              },
            ],
            connect_addresses: [
              {
                type: 'domain',
                value: {
                  domain: `${t.id.substring(0, 8)}.playit.gg`,
                  address: `${t.id.substring(0, 8)}.playit.gg:${t.publicPort}`,
                },
              },
              {
                type: 'addr4',
                value: {
                  address: `147.185.221.16:${t.publicPort}`,
                },
              },
            ],
          })),
        },
      }));
      return;
    }

    if (req.url === '/v1/tunnels/create') {
      // Validate upstream ReqTunnelsCreateV1 schema
      assert.ok(body.ports, 'Missing ports field');
      assert.ok(body.origin, 'Missing origin field');
      assert.equal(body.origin.type, 'agent');
      assert.equal(body.origin.data.agent_id, MOCK_AGENT_ID);

      const tunnelId = `tun_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const localPort = body.origin.data.config.fields.find(f => f.name === 'local_port')?.value;
      const assignedPublicPort = Math.floor(Math.random() * 20000) + 20000;

      const newTun = {
        id: tunnelId,
        name: body.name,
        tunnel_type: body.ports.details,
        port_type: body.ports.details === 'minecraft-bedrock' ? 'udp' : 'tcp',
        localPort: Number(localPort),
        localIp: '127.0.0.1',
        publicPort: assignedPublicPort,
        enabled: true,
      };
      mockTunnels.push(newTun);
      lastCreatedTunnel = newTun;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', data: { id: tunnelId } }));
      return;
    }

    if (req.url === '/v1/tunnels/config') {
      assert.ok(body.tunnel_id, 'Missing tunnel_id');
      const found = mockTunnels.find(t => t.id === body.tunnel_id);
      if (found && body.new_config?.fields) {
        const newPort = body.new_config.fields.find(f => f.name === 'local_port')?.value;
        if (newPort) found.localPort = Number(newPort);
      }
      lastConfiguredTunnel = body;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', data: { ok: true } }));
      return;
    }

    if (req.url === '/tunnels/enable') {
      const found = mockTunnels.find(t => t.id === body.tunnel_id);
      if (found) found.enabled = Boolean(body.enabled);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', data: { ok: true } }));
      return;
    }

    if (req.url === '/tunnels/delete') {
      mockTunnels = mockTunnels.filter(t => t.id !== body.tunnel_id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', data: { ok: true } }));
      return;
    }

    if (req.url === '/claim/setup') {
      assert.ok(body.code, 'Missing claim code');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', data: { ok: true } }));
      return;
    }

    if (req.url === '/claim/exchange') {
      assert.ok(body.code, 'Missing claim code');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', data: { secret_key: MOCK_SECRET_KEY } }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'fail', data: 'NotFound' }));
  });
});

await new Promise(res => mockServer.listen(0, '127.0.0.1', res));
const mockPort = mockServer.address().port;
process.env.PLAYIT_API_BASE = `http://127.0.0.1:${mockPort}`;
process.env.PLAYIT_AGENT_SECRET = MOCK_SECRET_KEY;

// 3. Dynamic Imports
const {
  users,
  nodes,
  allocations,
  servers,
  settings,
  playit_tunnels,
  playit_nodes,
} = await import('../server/db/database.js');
const { runMigrations } = await import('../server/db/migrations.js');
const { encryptPlayitSecret, decryptPlayitSecret } = await import('../server/utils/cryptoUtils.js');
const { PlayitApiClientV1, PLAYIT_ERROR_CODES } = await import('../server/services/playit/playitApiClient.js');
const { playitService, TUNNEL_STATUS } = await import('../server/services/playit/playitService.js');
const { agentManager } = await import('../server/services/playit/agentManager.js');

// Mock agentManager.ensureAgent to avoid launching binary in CI test environment
agentManager.ensureAgent = async function(nodeId, secretKey) {
  return { status: 'running', mode: 'mock' };
};
agentManager.getStatus = async function(nodeId) {
  return {
    status: 'running',
    binaryPath: '/mock/bin/playit',
    version: '1.0.10',
    isSystemd: true,
  };
};

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    process.stdout.write(`⏳ ${name}... `);
    await fn();
    console.log('✅ PASS');
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${err.message}`);
    console.error(err);
    failed++;
  }
}

// Run DB migrations
runMigrations();

// ==========================================
// TEST CASES
// ==========================================

await test('1. Secret Encryption & Decryption (AES-256-GCM)', async () => {
  const secret = 'raw_agent_secret_hex_999888777';
  const encrypted = encryptPlayitSecret(secret);

  assert.ok(encrypted, 'Encryption produced result');
  assert.equal(typeof encrypted, 'object', 'Encrypted payload is structured object');
  assert.ok(encrypted.ciphertext, 'Has ciphertext');
  assert.ok(encrypted.iv, 'Has IV');
  assert.ok(encrypted.authTag, 'Has authTag');
  assert.equal(encrypted.version, 1, 'Has version');

  // Must not equal plaintext
  assert.notEqual(encrypted.ciphertext, secret);

  // Decrypt
  const decrypted = decryptPlayitSecret(encrypted);
  assert.equal(decrypted, secret, 'Decrypted secret matches original');
});

await test('2. JSON Database Write Mutex & Temp Collision Resistance', async () => {
  // Test rapid concurrent writes
  const promises = [];
  for (let i = 0; i < 25; i++) {
    promises.push(
      new Promise(resolve => {
        setImmediate(() => {
          users.insert({
            username: `concurrency_test_${i}`,
            email: `concurrent_${i}@test.com`,
          });
          resolve();
        });
      })
    );
  }
  await Promise.all(promises);

  // Verify all 25 entries persisted without corruption
  const count = users.find(u => u.username?.startsWith('concurrency_test_')).length;
  assert.equal(count, 25, 'All concurrent writes successfully persisted');
});

await test('3. PlayitApiClientV1 - Strict Protocol & Address Extraction', async () => {
  const client = new PlayitApiClientV1({
    apiBase: `http://127.0.0.1:${mockPort}`,
    secretKey: MOCK_SECRET_KEY,
  });

  const runData = await client.getAgentRunData();
  assert.equal(runData.agent_id, MOCK_AGENT_ID, 'Authoritative agent ID returned');

  // Test create tunnel
  const createRes = await client.createTunnel({
    name: 'test-mc-server',
    tunnelType: 'minecraft-java',
    agentId: MOCK_AGENT_ID,
    localIp: '127.0.0.1',
    localPort: 25565,
  });
  assert.ok(createRes.id, 'Tunnel ID created');

  // Test list tunnels and address parsing
  const listRes = await client.listTunnels();
  assert.ok(listRes.tunnels.length > 0, 'Tunnel list returned');
  const found = listRes.tunnels.find(t => t.id === createRes.id);
  assert.ok(found, 'Created tunnel is listed');

  const addrInfo = PlayitApiClientV1.extractConnectionAddress(found);
  assert.ok(addrInfo.publicAddress, 'Public connection address extracted');
  assert.ok(addrInfo.publicAddress.includes('.playit.gg:'), 'Contains playit domain and port');
  assert.ok(addrInfo.publicPort > 0, 'Extracted valid public port');
});

await test('4. PlayitApiClientV1 - Retry Policy on 503 & 429 Rate Limits', async () => {
  const client = new PlayitApiClientV1({
    apiBase: `http://127.0.0.1:${mockPort}`,
    secretKey: MOCK_SECRET_KEY,
    timeoutMs: 3000,
    maxRetries: 2,
  });

  // Inject 1 rate limit event (429)
  mockRateLimitRemaining = 1;
  const listRes = await client.listTunnels();
  assert.ok(listRes.tunnels, 'Successfully recovered from 429 rate limit via retry');

  // Inject 1 503 event
  mock503Remaining = 1;
  const listRes2 = await client.listTunnels();
  assert.ok(listRes2.tunnels, 'Successfully recovered from 503 transient error via retry');
});

await test('5. PlayitApiClientV1 - Fast Fail on Authentication Failure', async () => {
  const badClient = new PlayitApiClientV1({
    apiBase: `http://127.0.0.1:${mockPort}`,
    secretKey: 'invalid_secret_key',
    maxRetries: 2,
  });

  await assert.rejects(
    async () => { await badClient.getAgentRunData(); },
    err => {
      return err.code === PLAYIT_ERROR_CODES.AUTH_FAILED && err.status === 401;
    },
    'Rejected immediately with PLAYIT_AUTH_FAILED without wasting retries'
  );
});

await test('6. PlayitService - End-to-End Server Provisioning', async () => {
  // Seed a test node and server
  const testNode = nodes.findOne({ id: 1 }) || nodes.insert({ name: 'Node 1', fqdn: 'localhost' });
  const testAlloc = allocations.insert({
    node_id: testNode.id,
    ip: '127.0.0.1',
    port: 25565,
    is_primary: 1,
  });

  const testServer = servers.insert({
    name: 'Survival SMP',
    node_id: testNode.id,
    software: 'paper',
    minecraft_version: '1.21.1',
    status: 'offline',
  });

  allocations.update(testAlloc.id, { server_id: testServer.id });

  // Provision tunnel asynchronously
  await playitService.provisionServerTunnels(testServer.id);

  // Verify tunnel created in DB
  const tunnel = playit_tunnels.findOne({ server_id: testServer.id });
  assert.ok(tunnel, 'playit_tunnels record created');
  assert.equal(tunnel.status, TUNNEL_STATUS.ACTIVE, 'Tunnel marked ACTIVE');
  assert.ok(tunnel.public_address, 'Public address populated');
  assert.equal(tunnel.local_port, 25565, 'Bound to server local port');
  assert.equal(tunnel.tunnel_type, 'minecraft-java', 'Detected Java tunnel type');

  // Verify safe data serialization (No secrets exposed)
  const safe = playitService.getSafeTunnelData(tunnel);
  assert.equal(safe.publicAddress, tunnel.public_address);
  assert.equal(safe.secret, undefined);
  assert.equal(safe.encrypted_secret, undefined);
  assert.equal(safe.authHeader, undefined);
});

await test('7. PlayitService - Idempotency & Duplicate Request Protection', async () => {
  const server = servers.findOne({ name: 'Survival SMP' });
  const initialTunnel = playit_tunnels.findOne({ server_id: server.id });
  const initialTunnelId = initialTunnel.playit_tunnel_id;

  // Re-run provisioning
  await playitService.provisionServerTunnels(server.id);

  // Verify it did not create a new tunnel at Playit or duplicate in DB
  const afterTunnels = playit_tunnels.find({ server_id: server.id });
  assert.equal(afterTunnels.length, 1, 'Only one tunnel exists for this server');
  assert.equal(afterTunnels[0].playit_tunnel_id, initialTunnelId, 'Existing tunnel was reused');
});

await test('8. PlayitService - Primary Port Change Synchronization', async () => {
  const server = servers.findOne({ name: 'Survival SMP' });

  // Update primary port to 25570
  const success = await playitService.updateTunnelPort(server.id, 25570);
  assert.equal(success, true, 'updateTunnelPort returned true');

  const updatedTunnel = playit_tunnels.findOne({ server_id: server.id });
  assert.equal(updatedTunnel.local_port, 25570, 'DB local_port updated');
  assert.equal(lastConfiguredTunnel?.new_config?.fields?.find(f => f.name === 'local_port')?.value, '25570', 'API configureTunnel called with new port');
});

await test('9. PlayitService - Tunnel Toggle (Enable/Disable)', async () => {
  const server = servers.findOne({ name: 'Survival SMP' });

  // Disable tunnel
  await playitService.toggleTunnel(server.id, false);
  let tunnel = playit_tunnels.findOne({ server_id: server.id });
  assert.equal(tunnel.enabled, false);
  assert.equal(tunnel.status, TUNNEL_STATUS.DISABLED);

  // Enable tunnel
  await playitService.toggleTunnel(server.id, true);
  tunnel = playit_tunnels.findOne({ server_id: server.id });
  assert.equal(tunnel.enabled, true);
  assert.equal(tunnel.status, TUNNEL_STATUS.ACTIVE);
});

await test('10. PlayitService - Server Deletion Cleans Up Remote & Local Tunnels', async () => {
  const server = servers.findOne({ name: 'Survival SMP' });
  const tunnel = playit_tunnels.findOne({ server_id: server.id });
  const playitTunId = tunnel.playit_tunnel_id;

  await playitService.deleteTunnelsForServer(server.id);

  const remaining = playit_tunnels.findOne({ server_id: server.id });
  assert.equal(remaining, null, 'Local playit_tunnels records deleted');

  const remoteExists = mockTunnels.some(t => t.id === playitTunId);
  assert.equal(remoteExists, false, 'Remote tunnel removed from Playit provider');
});

await test('11. Official Claim Flow Simulation (Setup -> Exchange)', async () => {
  const client = playitService.getApiClientForNode(1);
  const code = 'claim_test_123';

  // 1. Claim Setup
  const setupRes = await client.claimSetup(code, 'self-managed', '1.0.10');
  assert.ok(setupRes, 'Claim setup returned');

  // 2. Claim Exchange
  const exchangeRes = await client.claimExchange(code);
  assert.equal(exchangeRes.secret_key, MOCK_SECRET_KEY, 'Exchanged valid secret key');
});

// Close Mock Server
await new Promise(res => mockServer.close(res));

// Clean up test data dir
try {
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
} catch {}

console.log('\n======================================================');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}
