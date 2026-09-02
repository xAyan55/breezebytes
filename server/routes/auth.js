import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { users, audit_logs, verification_tokens, password_resets } from '../db/database.js';
import { authenticate, JWT_SECRET } from '../middleware/auth.js';
import { FREE_PLAN } from '../config/plans.js';
import { getUserResourceStats } from '../services/resourceService.js';
import emailService from '../services/emailService.js';
import { generateVerificationCode, generateSecureToken, hashToken } from '../utils/cryptoUtils.js';
import { forgotPasswordLimiter, resendVerificationLimiter } from '../middleware/rateLimiters.js';

const router = Router();

function formatUserResponse(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    is_verified: user.is_verified !== undefined ? Boolean(user.is_verified) : true,
    onboarding_completed: Boolean(user.onboarding_completed),
    hosting_ram: user.hosting_ram !== undefined ? user.hosting_ram : FREE_PLAN.ramMb,
    hosting_cpu: user.hosting_cpu !== undefined ? user.hosting_cpu : FREE_PLAN.cpuPercent,
    hosting_disk: user.hosting_disk !== undefined ? user.hosting_disk : FREE_PLAN.diskMb,
    hosting_server_slots: user.hosting_server_slots !== undefined ? user.hosting_server_slots : FREE_PLAN.serverSlots,
    resources: getUserResourceStats(user.id),
    createdAt: user.created_at,
  };
}

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Email and password are required.' } });
  }

  const user = users.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
  }

  if (user.is_suspended) {
    return res.status(403).json({ success: false, error: { code: 'ACCOUNT_SUSPENDED', message: 'This account has been suspended by an administrator.' } });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
  }

  // If email verification is enabled and user is not verified, require verification
  const smtpConfig = emailService.getSmtpConfig();
  if (smtpConfig.enabled && user.is_verified === 0) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address to access your account.',
        email: user.email,
        requireVerification: true,
      },
    });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  audit_logs.insert({
    user_id: user.id,
    action: 'auth_login',
    target_type: 'user',
    target_id: user.id,
    ip_address: req.ip
  });

  return res.json({
    success: true,
    data: {
      token,
      user: formatUserResponse(user),
    }
  });
});

// POST /api/v1/auth/register
router.post('/register', async (req, res) => {
  const { email, username, password } = req.body;
  if (!email || !username || !password) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'All fields are required.' } });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanUsername = username.trim();

  if (users.findOne({ email: cleanEmail })) {
    return res.status(400).json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists.' } });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 6 characters.' } });
  }

  const smtpConfig = emailService.getSmtpConfig();
  const isEmailEnabled = Boolean(smtpConfig.enabled && smtpConfig.host && smtpConfig.username);

  const salt = bcrypt.genSaltSync(12);
  const password_hash = bcrypt.hashSync(password, salt);

  const newUser = users.insert({
    email: cleanEmail,
    username: cleanUsername,
    password_hash,
    role: 'user',
    is_suspended: 0,
    is_verified: isEmailEnabled ? 0 : 1,
    hosting_ram: FREE_PLAN.ramMb,
    hosting_cpu: FREE_PLAN.cpuPercent,
    hosting_disk: FREE_PLAN.diskMb,
    hosting_server_slots: FREE_PLAN.serverSlots,
    onboarding_completed: false,
  });

  audit_logs.insert({
    user_id: newUser.id,
    action: 'auth_register',
    target_type: 'user',
    target_id: newUser.id,
    ip_address: req.ip
  });

  if (isEmailEnabled) {
    // Generate secure 6-digit code with 15-minute expiration
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    verification_tokens.insert({
      user_id: newUser.id,
      code_hash: hashToken(code),
      expires_at: expiresAt,
      used: 0,
      created_at: new Date().toISOString(),
    });

    try {
      await emailService.sendVerificationEmail(newUser, code);
    } catch (mailErr) {
      console.error('[AUTH] Failed to send verification email on register:', mailErr.message);
    }

    return res.json({
      success: true,
      requireVerification: true,
      email: newUser.email,
      message: 'Account created. Please check your email for your verification code.',
    });
  }

  // If email is disabled, automatically issue token
  const token = jwt.sign(
    { id: newUser.id, email: newUser.email, role: newUser.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.json({
    success: true,
    data: {
      token,
      user: formatUserResponse(newUser),
    }
  });
});

// POST /api/v1/auth/verify-email - Validate 6-digit confirmation code
router.post('/verify-email', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Email and verification code are required.' },
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();

  const user = users.findOne({ email: cleanEmail });
  if (!user) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_CODE', message: 'Invalid or expired verification code.' },
    });
  }

  if (user.is_verified === 1) {
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.json({
      success: true,
      data: {
        token,
        user: formatUserResponse(user),
      },
      message: 'Account is already verified.',
    });
  }

  const hashed = hashToken(cleanCode);
  const tokenRecord = verification_tokens.findOne({
    user_id: user.id,
    code_hash: hashed,
    used: 0,
  });

  if (!tokenRecord) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_CODE', message: 'Invalid verification code.' },
    });
  }

  if (new Date(tokenRecord.expires_at) < new Date()) {
    return res.status(400).json({
      success: false,
      error: { code: 'CODE_EXPIRED', message: 'Verification code has expired. Please request a new one.' },
    });
  }

  // Mark token used and user verified
  verification_tokens.update(tokenRecord.id, { used: 1 });
  users.update(user.id, { is_verified: 1 });

  audit_logs.insert({
    user_id: user.id,
    action: 'auth_verify_email',
    target_type: 'user',
    target_id: user.id,
    ip_address: req.ip,
  });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.json({
    success: true,
    data: {
      token,
      user: formatUserResponse(user),
    },
    message: 'Email address verified successfully.',
  });
});

// POST /api/v1/auth/resend-verification - Resend verification code (Rate Limited)
router.post('/resend-verification', resendVerificationLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Email is required.' },
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = users.findOne({ email: cleanEmail });

  // Generic response to prevent account enumeration
  const genericResponse = {
    success: true,
    message: 'If an unverified account exists for this email, a new verification code has been sent.',
  };

  if (!user || user.is_verified === 1 || user.is_suspended) {
    return res.json(genericResponse);
  }

  const smtpConfig = emailService.getSmtpConfig();
  if (!smtpConfig.enabled) {
    return res.json(genericResponse);
  }

  // Invalidate previous unused codes for this user
  const oldTokens = verification_tokens.find({ user_id: user.id, used: 0 });
  for (const old of oldTokens) {
    verification_tokens.update(old.id, { used: 1 });
  }

  // Generate new code
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  verification_tokens.insert({
    user_id: user.id,
    code_hash: hashToken(code),
    expires_at: expiresAt,
    used: 0,
    created_at: new Date().toISOString(),
  });

  try {
    await emailService.sendVerificationEmail(user, code);
  } catch (mailErr) {
    console.error('[AUTH] Failed to resend verification email:', mailErr.message);
  }

  return res.json(genericResponse);
});

// POST /api/v1/auth/forgot-password - Request password reset link (Rate Limited)
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Email address is required.' },
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = users.findOne({ email: cleanEmail });

  // Generic message to prevent account enumeration
  const genericResponse = {
    success: true,
    message: 'If an account exists for that email, a password reset link has been sent.',
  };

  if (!user || user.is_suspended) {
    return res.json(genericResponse);
  }

  const smtpConfig = emailService.getSmtpConfig();
  if (!smtpConfig.enabled) {
    console.warn('[AUTH] Password reset requested but SMTP is disabled.');
    return res.json(genericResponse);
  }

  // Invalidate previous unused reset tokens
  const existingTokens = password_resets.find({ user_id: user.id, used: 0 });
  for (const t of existingTokens) {
    password_resets.update(t.id, { used: 1 });
  }

  // Generate 32-byte secure token with 30-minute expiration
  const resetToken = generateSecureToken();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  password_resets.insert({
    user_id: user.id,
    token_hash: hashToken(resetToken),
    expires_at: expiresAt,
    used: 0,
    created_at: new Date().toISOString(),
  });

  try {
    await emailService.sendPasswordResetEmail(user, resetToken);
  } catch (err) {
    console.error('[AUTH] Failed to send password reset email:', err.message);
  }

  return res.json(genericResponse);
});

// POST /api/v1/auth/reset-password - Complete password reset
router.post('/reset-password', forgotPasswordLimiter, async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Reset token and new password are required.' },
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 6 characters.' },
    });
  }

  const hashed = hashToken(token.trim());
  const resetRecord = password_resets.findOne({
    token_hash: hashed,
    used: 0,
  });

  if (!resetRecord) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired password reset link.' },
    });
  }

  if (new Date(resetRecord.expires_at) < new Date()) {
    return res.status(400).json({
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'Password reset link has expired. Please request a new one.' },
    });
  }

  const user = users.findById(resetRecord.user_id);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'Account no longer exists.' },
    });
  }

  // Update password and invalidate token
  const salt = bcrypt.genSaltSync(12);
  const password_hash = bcrypt.hashSync(newPassword, salt);

  users.update(user.id, { password_hash });
  password_resets.update(resetRecord.id, { used: 1 });

  audit_logs.insert({
    user_id: user.id,
    action: 'auth_password_reset',
    target_type: 'user',
    target_id: user.id,
    ip_address: req.ip,
  });

  return res.json({
    success: true,
    message: 'Password has been reset successfully. You can now log in with your new password.',
  });
});

// GET /api/v1/auth/me
router.get('/me', authenticate, (req, res) => {
  return res.json({
    success: true,
    data: {
      user: formatUserResponse(req.user),
    }
  });
});

// POST /api/v1/auth/change-password
router.post('/change-password', authenticate, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Current and new password are required.' } });
  }

  const isMatch = bcrypt.compareSync(currentPassword, req.user.password_hash);
  if (!isMatch) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_PASSWORD', message: 'Current password does not match.' } });
  }

  const salt = bcrypt.genSaltSync(12);
  const password_hash = bcrypt.hashSync(newPassword, salt);
  users.update(req.user.id, { password_hash });

  return res.json({ success: true, message: 'Password changed successfully.' });
});

export default router;
