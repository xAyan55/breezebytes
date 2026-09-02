import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { users, audit_logs } from '../db/database.js';
import { authenticate, JWT_SECRET } from '../middleware/auth.js';
import { FREE_PLAN } from '../config/plans.js';
import { getUserResourceStats } from '../services/resourceService.js';

const router = Router();

function formatUserResponse(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
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

  const salt = bcrypt.genSaltSync(12);
  const password_hash = bcrypt.hashSync(password, salt);

  const newUser = users.insert({
    email: cleanEmail,
    username: cleanUsername,
    password_hash,
    role: 'user',
    is_suspended: 0,
    hosting_ram: FREE_PLAN.ramMb,
    hosting_cpu: FREE_PLAN.cpuPercent,
    hosting_disk: FREE_PLAN.diskMb,
    hosting_server_slots: FREE_PLAN.serverSlots,
    onboarding_completed: false,
  });

  const token = jwt.sign(
    { id: newUser.id, email: newUser.email, role: newUser.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  audit_logs.insert({
    user_id: newUser.id,
    action: 'auth_register',
    target_type: 'user',
    target_id: newUser.id,
    ip_address: req.ip
  });

  return res.json({
    success: true,
    data: {
      token,
      user: formatUserResponse(newUser),
    }
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
