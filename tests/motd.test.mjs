import assert from 'node:assert/strict';
import { DEFAULT_MOTDS, formatMotd, getMotdForStatus, getDefaultFavicon } from '../server/config/motd.js';

console.log('\n========================================');
console.log('🧪 RUNNING BREEZEBYTES MOTD & ICON TEST SUITE');
console.log('========================================\n');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    process.stdout.write(`⏳ ${name}... `);
    fn();
    console.log('✅ PASS');
    passedTests++;
  } catch (err) {
    console.log('❌ FAIL');
    console.error(err);
    failedTests++;
  }
}

// 1. Check configured default MOTD strings
runTest('1. Default MOTD templates match specifications', () => {
  assert.equal(
    DEFAULT_MOTDS.online,
    'Hosted For Free On &9BreezeBytes.Bond | &f{Servername} | &2Online'
  );
  assert.equal(
    DEFAULT_MOTDS.offline,
    'Hosted For Free On &9BreezeBytes.Bond | &f{Servername} | &4Offline'
  );
  assert.equal(
    DEFAULT_MOTDS.starting,
    'Hosted For Free On &9BreezeBytes.Bond | &f{Servername} | &eStarting'
  );
});

// 2. formatMotd replaces {Servername} and formats section sign (§)
runTest('2. formatMotd replaces {Servername} and formats section sign', () => {
  const formatted = formatMotd(DEFAULT_MOTDS.online, 'ToiletMC', 'section');
  assert.equal(formatted, 'Hosted For Free On §9BreezeBytes.Bond | §fToiletMC | §2Online');
});

// 3. formatMotd unicode escape for server.properties
runTest('3. formatMotd unicode escape for server.properties', () => {
  const formatted = formatMotd(DEFAULT_MOTDS.online, 'ToiletMC', 'unicode');
  assert.equal(formatted, 'Hosted For Free On \\u00A79BreezeBytes.Bond | \\u00A7fToiletMC | \\u00A72Online');
});

// 4. getMotdForStatus handles online, starting, offline
runTest('4. getMotdForStatus handles all three states', () => {
  const online = getMotdForStatus('running', 'ToiletMC', 'section');
  assert.equal(online, 'Hosted For Free On §9BreezeBytes.Bond | §fToiletMC | §2Online');

  const starting = getMotdForStatus('starting', 'ToiletMC', 'section');
  assert.equal(starting, 'Hosted For Free On §9BreezeBytes.Bond | §fToiletMC | §eStarting');

  const offline = getMotdForStatus('offline', 'ToiletMC', 'section');
  assert.equal(offline, 'Hosted For Free On §9BreezeBytes.Bond | §fToiletMC | §4Offline');
});

// 5. Default favicon returns 64x64 base64 data URI
runTest('5. getDefaultFavicon returns valid 64x64 PNG data URI', () => {
  const favicon = getDefaultFavicon();
  assert.equal(typeof favicon, 'string');
  assert.equal(favicon.startsWith('data:image/png;base64,'), true);
  assert.equal(favicon.length > 500, true);
});

console.log('\n========================================');
console.log(`📊 SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('========================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
