import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireServerAccess } from '../middleware/rbac.js';
import { playerManager } from '../daemon/playerManager.js';

const router = Router();

// GET /api/v1/servers/:id/players
router.get('/:id/players', authenticate, requireServerAccess('server.players.read'), async (req, res) => {
  try {
    const data = await playerManager.getPlayersData(req.server.id);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, error: { code: 'PLAYERS_FETCH_FAILED', message: err.message } });
  }
});

// POST /api/v1/servers/:id/players/op
router.post('/:id/players/op', authenticate, requireServerAccess('server.players.write'), async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ success: false, error: { code: 'USERNAME_REQUIRED', message: 'Username is required.' } });

  await playerManager.opPlayer(req.server.id, username.trim());
  return res.json({ success: true, message: `Granted operator privileges to ${username}.` });
});

// POST /api/v1/servers/:id/players/deop
router.post('/:id/players/deop', authenticate, requireServerAccess('server.players.write'), async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ success: false, error: { code: 'USERNAME_REQUIRED', message: 'Username is required.' } });

  await playerManager.deopPlayer(req.server.id, username.trim());
  return res.json({ success: true, message: `Revoked operator privileges from ${username}.` });
});

// POST /api/v1/servers/:id/players/whitelist
router.post('/:id/players/whitelist', authenticate, requireServerAccess('server.players.write'), async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ success: false, error: { code: 'USERNAME_REQUIRED', message: 'Username is required.' } });

  await playerManager.whitelistPlayer(req.server.id, username.trim());
  return res.json({ success: true, message: `Added ${username} to whitelist.` });
});

// POST /api/v1/servers/:id/players/unwhitelist
router.post('/:id/players/unwhitelist', authenticate, requireServerAccess('server.players.write'), async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ success: false, error: { code: 'USERNAME_REQUIRED', message: 'Username is required.' } });

  await playerManager.unwhitelistPlayer(req.server.id, username.trim());
  return res.json({ success: true, message: `Removed ${username} from whitelist.` });
});

// POST /api/v1/servers/:id/players/ban
router.post('/:id/players/ban', authenticate, requireServerAccess('server.players.write'), async (req, res) => {
  const { username, reason } = req.body;
  if (!username) return res.status(400).json({ success: false, error: { code: 'USERNAME_REQUIRED', message: 'Username is required.' } });

  await playerManager.banPlayer(req.server.id, username.trim(), reason);
  return res.json({ success: true, message: `Banned player ${username}.` });
});

// POST /api/v1/servers/:id/players/unban
router.post('/:id/players/unban', authenticate, requireServerAccess('server.players.write'), async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ success: false, error: { code: 'USERNAME_REQUIRED', message: 'Username is required.' } });

  await playerManager.unbanPlayer(req.server.id, username.trim());
  return res.json({ success: true, message: `Unbanned player ${username}.` });
});

// POST /api/v1/servers/:id/players/kick
router.post('/:id/players/kick', authenticate, requireServerAccess('server.players.write'), async (req, res) => {
  const { username, reason } = req.body;
  if (!username) return res.status(400).json({ success: false, error: { code: 'USERNAME_REQUIRED', message: 'Username is required.' } });

  try {
    await playerManager.kickPlayer(req.server.id, username.trim(), reason);
    return res.json({ success: true, message: `Kicked player ${username}.` });
  } catch (err) {
    return res.status(400).json({ success: false, error: { code: 'KICK_FAILED', message: err.message } });
  }
});

export default router;
