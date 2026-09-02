import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middleware/auth.js';
import { api_keys, notifications, activity_logs, users } from '../db/database.js';
import { getUserResourceStats } from '../services/resourceService.js';

const router = Router();

// GET /api/v1/account/resources - Canonical resource usage and limits
router.get('/resources', authenticate, (req, res) => {
  const stats = getUserResourceStats(req.user.id);
  if (!stats) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } });
  }
  return res.json({ success: true, data: stats });
});

// POST /api/v1/account/onboarding/skip - Skip onboarding without consuming any quota
router.post('/onboarding/skip', authenticate, (req, res) => {
  users.update(req.user.id, { onboarding_completed: true });
  const updatedStats = getUserResourceStats(req.user.id);

  return res.json({
    success: true,
    message: 'Onboarding completed.',
    data: {
      onboarding_completed: true,
      resources: updatedStats,
    }
  });
});

// GET /api/v1/account/api-keys
router.get('/api-keys', authenticate, (req, res) => {
  const list = api_keys.find({ user_id: req.user.id });
  return res.json({ success: true, data: list });
});

// POST /api/v1/account/api-keys
router.post('/api-keys', authenticate, (req, res) => {
  const { name, permissions = ['*'] } = req.body;
  if (!name) return res.status(400).json({ success: false, error: { code: 'NAME_REQUIRED', message: 'Key name is required.' } });

  const rawKey = 'bb_key_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const prefix = rawKey.substring(0, 12);
  const salt = bcrypt.genSaltSync(8);
  const key_hash = bcrypt.hashSync(rawKey, salt);

  const newKey = api_keys.insert({
    user_id: req.user.id,
    name: name.trim(),
    key_prefix: prefix,
    key_hash,
    permissions: JSON.stringify(permissions)
  });

  return res.json({
    success: true,
    data: {
      id: newKey.id,
      name: newKey.name,
      token: rawKey // Only revealed once
    }
  });
});

// DELETE /api/v1/account/api-keys/:keyId
router.delete('/api-keys/:keyId', authenticate, (req, res) => {
  const key = api_keys.findById(req.params.keyId);
  if (!key || key.user_id !== req.user.id) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'API key not found.' } });
  }
  api_keys.delete(key.id);
  return res.json({ success: true, message: 'API key revoked.' });
});

// GET /api/v1/account/notifications
router.get('/notifications', authenticate, (req, res) => {
  const list = notifications.find({ user_id: req.user.id }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return res.json({ success: true, data: list });
});

// POST /api/v1/account/notifications/:id/read
router.post('/notifications/:id/read', authenticate, (req, res) => {
  notifications.update(req.params.id, { is_read: 1 });
  return res.json({ success: true, message: 'Marked as read.' });
});

// GET /api/v1/account/activity
router.get('/activity', authenticate, (req, res) => {
  const list = activity_logs.find({ user_id: req.user.id }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50);
  return res.json({ success: true, data: list });
});

// PUT /api/v1/account/password - Convenience endpoint matching AccountSettings.jsx
router.put('/password', authenticate, (req, res) => {
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

