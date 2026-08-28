import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireServerAccess } from '../middleware/rbac.js';
import { server_subusers, users } from '../db/database.js';

const router = Router();

// GET /api/v1/servers/:id/subusers
router.get('/:id/subusers', authenticate, requireServerAccess('server.users.manage'), (req, res) => {
  const list = server_subusers.find({ server_id: req.server.id });
  const enriched = list.map(sub => {
    const u = users.findById(sub.user_id);
    let perms = [];
    try {
      perms = JSON.parse(sub.permissions || '[]');
    } catch {
      perms = [];
    }
    return {
      id: sub.id,
      user_id: sub.user_id,
      email: u ? u.email : 'Unknown',
      username: u ? u.username : 'Unknown',
      permissions: perms,
      created_at: sub.created_at
    };
  });
  return res.json({ success: true, data: enriched });
});

// POST /api/v1/servers/:id/subusers
router.post('/:id/subusers', authenticate, requireServerAccess('server.users.manage'), (req, res) => {
  const { email, permissions = [] } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: { code: 'EMAIL_REQUIRED', message: 'User email is required.' } });
  }

  const targetUser = users.findOne({ email: email.trim().toLowerCase() });
  if (!targetUser) {
    return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'No registered user found with that email.' } });
  }

  if (targetUser.id === req.server.owner_id) {
    return res.status(400).json({ success: false, error: { code: 'CANNOT_ADD_OWNER', message: 'The server owner already has full access.' } });
  }

  if (server_subusers.findOne({ server_id: req.server.id, user_id: targetUser.id })) {
    return res.status(400).json({ success: false, error: { code: 'ALREADY_SUBUSER', message: 'This user is already added as a subuser.' } });
  }

  const newSub = server_subusers.insert({
    server_id: req.server.id,
    user_id: targetUser.id,
    permissions: JSON.stringify(permissions)
  });

  return res.json({
    success: true,
    data: {
      id: newSub.id,
      email: targetUser.email,
      username: targetUser.username,
      permissions
    }
  });
});

// DELETE /api/v1/servers/:id/subusers/:subId
router.delete('/:id/subusers/:subId', authenticate, requireServerAccess('server.users.manage'), (req, res) => {
  server_subusers.delete(req.params.subId);
  return res.json({ success: true, message: 'Subuser access revoked.' });
});

export default router;
