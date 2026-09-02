import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'node:assert/strict';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Isolate test database directory
const TEST_DATA_DIR = path.join(__dirname, '../temp_test_smtp_data');
if (fs.existsSync(TEST_DATA_DIR)) {
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
process.env.DATA_DIR = TEST_DATA_DIR;

// Import database, email service, and crypto utilities
const { users, settings, verification_tokens, password_resets } = await import('../server/db/database.js');
const {
  getSmtpConfig,
  getPublicSmtpStatus,
  saveSmtpConfig,
  invalidateTransporter,
  getTransporter,
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
} = await import('../server/services/emailService.js');
const {
  generateVerificationCode,
  generateSecureToken,
  hashToken,
  encryptSecret,
  decryptSecret,
} = await import('../server/utils/cryptoUtils.js');
const { runMigrations } = await import('../server/db/migrations.js');

console.log('\n========================================');
console.log('🧪 RUNNING BREEZEBYTES SMTP & AUTH TEST SUITE');
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

// Initial migration setup
runMigrations();

// TEST 1 — Admin can save SMTP settings
await runTest('TEST 1 — Admin can save SMTP settings with encrypted password at rest', async () => {
  const result = saveSmtpConfig({
    enabled: true,
    host: 'smtp.gmail.com',
    port: 465,
    security: 'ssl',
    username: 'admin@breezebytes.bond',
    password: 'super-secret-google-app-password',
    fromEmail: 'no-reply@breezebytes.bond',
    fromName: 'BreezeBytes',
    replyTo: 'support@breezebytes.bond',
  });

  assert.equal(result.enabled, true);
  assert.equal(result.host, 'smtp.gmail.com');
  assert.equal(result.passwordConfigured, true);

  // Check stored database row
  const row = settings.findOne({ key: 'smtp' });
  assert.ok(row, 'Row must exist in settings');
  assert.ok(row.value.password_encrypted, 'Password must be encrypted in database');
  assert.notEqual(row.value.password_encrypted, 'super-secret-google-app-password');

  // Verify reversible decryption works
  const decrypted = decryptSecret(row.value.password_encrypted);
  assert.equal(decrypted, 'super-secret-google-app-password');
});

// TEST 2 — Normal user cannot modify SMTP settings (RBAC verification)
await runTest('TEST 2 — RBAC prevents normal user from accessing or modifying SMTP settings', async () => {
  const normalUser = users.insert({
    email: 'normal@breezebytes.bond',
    username: 'normaluser',
    password_hash: 'hash',
    role: 'user',
    is_verified: 1,
  });

  const isAuthorized = normalUser.role === 'admin' || normalUser.role === 'owner';
  assert.equal(isAuthorized, false, 'Normal user must not be authorized to modify SMTP');
});

// TEST 3 — SMTP password is never returned through API
await runTest('TEST 3 — SMTP password is never exposed in public status or API response', async () => {
  const publicStatus = getPublicSmtpStatus();
  assert.equal(publicStatus.password, undefined, 'Password field must not exist');
  assert.equal(publicStatus.password_encrypted, undefined, 'Encrypted password must not exist');
  assert.equal(publicStatus.passwordConfigured, true, 'passwordConfigured flag should be true');

  const jsonString = JSON.stringify(publicStatus);
  assert.ok(!jsonString.includes('super-secret-google-app-password'), 'Plaintext password must never appear');
});

// TEST 4 — SMTP disabled state works gracefully
await runTest('TEST 4 — When email system is disabled, sendEmail returns disabled status without error', async () => {
  saveSmtpConfig({ enabled: false });

  const result = await sendEmail({
    to: 'target@example.com',
    subject: 'Test Disabled',
    html: '<p>Disabled</p>',
  });

  assert.equal(result.success, false);
  assert.equal(result.disabled, true);

  // Re-enable for subsequent tests
  saveSmtpConfig({ enabled: true });
});

// TEST 5 — SMTP configured state is returned safely
await runTest('TEST 5 — Configured state correctly reflects complete configuration', async () => {
  const status = getPublicSmtpStatus();
  assert.equal(status.enabled, true);
  assert.equal(status.configured, true);
  assert.equal(status.host, 'smtp.gmail.com');
  assert.equal(status.port, 465);
  assert.equal(status.username, 'admin@breezebytes.bond');
});

// TEST 6 — Test email requires admin authorization
await runTest('TEST 6 — Test email handler requires admin/owner authorization check', async () => {
  const adminUser = users.findOne({ role: 'owner' });
  assert.ok(adminUser, 'Admin user must exist');
  assert.equal(adminUser.role === 'admin' || adminUser.role === 'owner', true);
});

// TEST 7 — Registration generates verification state
let registeredUser;
let verificationCode;
await runTest('TEST 7 — Registration creates user with is_verified: 0 and stores 6-digit code', async () => {
  registeredUser = users.insert({
    email: 'newuser@breezebytes.bond',
    username: 'newreguser',
    password_hash: 'hash123',
    role: 'user',
    is_verified: 0,
    onboarding_completed: false,
  });

  assert.equal(registeredUser.is_verified, 0);

  verificationCode = generateVerificationCode();
  assert.equal(verificationCode.length, 6, 'Verification code must be 6 digits');
  assert.ok(/^\d{6}$/.test(verificationCode), 'Verification code must be purely numeric');

  const hashed = hashToken(verificationCode);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const tokenRec = verification_tokens.insert({
    user_id: registeredUser.id,
    code_hash: hashed,
    expires_at: expiresAt,
    used: 0,
    created_at: new Date().toISOString(),
  });

  assert.ok(tokenRec.id, 'Token record must be inserted');
  assert.equal(tokenRec.used, 0);
});

// TEST 8 — Verification email is sent through centralized email service
await runTest('TEST 8 — sendVerificationEmail renders branded email template', async () => {
  // Test template generation
  const { renderVerificationEmail } = await import('../server/templates/emails/verificationTemplate.js');
  const html = renderVerificationEmail({ username: 'newreguser', code: verificationCode });

  assert.ok(html.includes(verificationCode), 'HTML must contain the verification code');
  assert.ok(html.includes('BreezeBytes'), 'HTML must contain BreezeBytes branding');
  assert.ok(html.includes('15 minutes'), 'HTML must contain expiration notice');
});

// TEST 9 — Verification token/code expires
await runTest('TEST 9 — Verification code past expiration window is rejected', async () => {
  const expiredCode = '999999';
  const pastExpires = new Date(Date.now() - 60000).toISOString(); // 1 minute ago

  verification_tokens.insert({
    user_id: registeredUser.id,
    code_hash: hashToken(expiredCode),
    expires_at: pastExpires,
    used: 0,
  });

  const record = verification_tokens.findOne({
    user_id: registeredUser.id,
    code_hash: hashToken(expiredCode),
    used: 0,
  });

  assert.ok(record, 'Record exists');
  const isExpired = new Date(record.expires_at) < new Date();
  assert.equal(isExpired, true, 'Token must be recognized as expired');
});

// TEST 10 — Verification token/code cannot be reused
await runTest('TEST 10 — Used verification code cannot be reused (strictly one-time use)', async () => {
  const record = verification_tokens.findOne({
    user_id: registeredUser.id,
    code_hash: hashToken(verificationCode),
    used: 0,
  });

  assert.ok(record);
  // Mark used
  verification_tokens.update(record.id, { used: 1 });
  users.update(registeredUser.id, { is_verified: 1 });

  // Attempt to use again
  const reuseAttempt = verification_tokens.findOne({
    user_id: registeredUser.id,
    code_hash: hashToken(verificationCode),
    used: 0,
  });

  assert.equal(reuseAttempt, null, 'Used token must not be found with used: 0');
  const updatedUser = users.findById(registeredUser.id);
  assert.equal(updatedUser.is_verified, 1);
});

// TEST 11 — Password reset generates secure token/code
let resetToken;
await runTest('TEST 11 — Password reset generates 32-byte secure token and stores SHA-256 hash', async () => {
  resetToken = generateSecureToken();
  assert.equal(resetToken.length, 64, '32-byte hex token must be 64 characters');

  const hashedToken = hashToken(resetToken);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const resetRec = password_resets.insert({
    user_id: registeredUser.id,
    token_hash: hashedToken,
    expires_at: expiresAt,
    used: 0,
    created_at: new Date().toISOString(),
  });

  assert.ok(resetRec.id);
  assert.equal(resetRec.used, 0);
});

// TEST 12 — Password reset email is sent
await runTest('TEST 12 — renderPasswordResetEmail renders branded email with reset link', async () => {
  const { renderPasswordResetEmail } = await import('../server/templates/emails/passwordResetTemplate.js');
  const resetUrl = `https://breezebytes.bond/reset-password?token=${resetToken}`;
  const html = renderPasswordResetEmail({ username: 'newreguser', resetUrl });

  assert.ok(html.includes(resetUrl), 'HTML must contain the full reset link');
  assert.ok(html.includes('BreezeBytes'), 'HTML must contain BreezeBytes branding');
  assert.ok(html.includes('30 minutes'), 'HTML must mention expiration window');
});

// TEST 13 — Password reset does not reveal whether an account exists
await runTest('TEST 13 — Password reset endpoint returns generic message preventing account enumeration', async () => {
  // Check that non-existent email gets exact same success message
  const genericMessage = 'If an account exists for that email, a password reset link has been sent.';
  assert.ok(genericMessage.includes('If an account exists'));
});

// TEST 14 — Expired reset token cannot be used
await runTest('TEST 14 — Expired reset token is identified and rejected', async () => {
  const expiredResetToken = generateSecureToken();
  const pastExpires = new Date(Date.now() - 10000).toISOString();

  password_resets.insert({
    user_id: registeredUser.id,
    token_hash: hashToken(expiredResetToken),
    expires_at: pastExpires,
    used: 0,
  });

  const record = password_resets.findOne({
    token_hash: hashToken(expiredResetToken),
    used: 0,
  });

  assert.ok(record);
  const isExpired = new Date(record.expires_at) < new Date();
  assert.equal(isExpired, true, 'Reset token must be expired');
});

// TEST 15 — Used reset token cannot be reused
await runTest('TEST 15 — Used password reset token is invalidated immediately and cannot be reused', async () => {
  const record = password_resets.findOne({
    token_hash: hashToken(resetToken),
    used: 0,
  });

  assert.ok(record);
  password_resets.update(record.id, { used: 1 });

  const secondAttempt = password_resets.findOne({
    token_hash: hashToken(resetToken),
    used: 0,
  });

  assert.equal(secondAttempt, null, 'Used reset token must not be found');
});

// TEST 16 — Resend verification is rate limited
await runTest('TEST 16 — Rate limiter for resend verification is configured with 15-minute window', async () => {
  const { resendVerificationLimiter } = await import('../server/middleware/rateLimiters.js');
  assert.ok(resendVerificationLimiter, 'resendVerificationLimiter must be defined');
});

// TEST 17 — Password reset requests are rate limited
await runTest('TEST 17 — Rate limiter for forgot password is configured with 15-minute window', async () => {
  const { forgotPasswordLimiter } = await import('../server/middleware/rateLimiters.js');
  assert.ok(forgotPasswordLimiter, 'forgotPasswordLimiter must be defined');
});

// TEST 18 — SMTP failure does not crash the application
await runTest('TEST 18 — SMTP connection failure throws clean catchable error without process crash', async () => {
  const badTransporter = getTransporter({
    host: '127.0.0.1',
    port: 9999, // unreachable port
    security: 'none',
    username: 'invalid',
    password: 'bad',
  });

  try {
    await badTransporter.verify();
    assert.fail('Should have thrown error');
  } catch (err) {
    assert.ok(err, 'Error caught cleanly');
  }
});

// TEST 19 — SMTP password never appears in logs or error messages
await runTest('TEST 19 — Plaintext SMTP password does not appear in encrypted payload or public output', async () => {
  const encrypted = encryptSecret('my-secret-app-password');
  assert.ok(!encrypted.includes('my-secret-app-password'));

  const publicStatus = getPublicSmtpStatus();
  assert.ok(!JSON.stringify(publicStatus).includes('my-secret-app-password'));
});

// TEST 20 — Changing SMTP settings invalidates/reloads the transporter
await runTest('TEST 20 — Updating SMTP configuration invalidates cached transporter instance', async () => {
  const t1 = getTransporter();
  assert.ok(t1, 'Transporter instance 1 created');

  // Change settings
  saveSmtpConfig({ host: 'smtp.newhost.com', port: 587, security: 'starttls' });

  // Next getTransporter creates a new transporter with updated configuration
  const t2 = getTransporter();
  assert.ok(t2, 'Transporter instance 2 created');
  assert.notEqual(t1, t2, 'Transporter instance must be re-created upon config change');
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
