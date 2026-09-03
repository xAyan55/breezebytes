import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireServerAccess } from '../middleware/rbac.js';
import { playerManager } from '../daemon/playerManager.js';

const router = Router();

// GET /api/v1/servers/:id/players - Reconciled player snapshot
router.get('/:id/players', authenticate, requireServerAccess('server.players.read'), async (req, res) => {
  try {
    const data = await playerManager.getPlayersData(req.server.id);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: { code: err.code || 'PLAYERS_FETCH_FAILED', message: err.message || 'Failed to fetch player roster.' }
    });
  }
});

// POST /api/v1/servers/:id/players/kick - Kick player (online only)
router.post('/:id/players/kick', authenticate, requireServerAccess('server.players.write'), async (req, res) => {
  const { username, reason } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, error: { code: 'USERNAME_REQUIRED', message: 'Username is required.' } });
  }

  try {
    const result = await playerManager.kickPlayer(req.server.id, username.trim(), reason, req.user?.id);
    return res.json({ success: true, data: result, message: result.message });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: { code: err.code || 'KICK_FAILED', message: err.message || 'Failed to kick player.' }
    });
  }
});

// POST /api/v1/servers/:id/players/ban - Ban player (online or offline)
router.post('/:id/players/ban', authenticate, requireServerAccess('server.players.write'), async (req, res) => {
  const { username, reason } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, error: { code: 'USERNAME_REQUIRED', message: 'Username is required.' } });
  }

  try {
    const result = await playerManager.banPlayer(req.server.id, username.trim(), reason, req.user?.id);
    return res.json({ success: true, data: result, message: result.message });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: { code: err.code || 'BAN_FAILED', message: err.message || 'Failed to ban player.' }
    });
  }
});

// POST /api/v1/servers/:id/players/unban - Pardon player (online or offline)
router.post('/:id/players/unban', authenticate, requireServerAccess('server.players.write'), async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, error: { code: 'USERNAME_REQUIRED', message: 'Username is required.' } });
  }

  try {
    const result = await playerManager.unbanPlayer(req.server.id, username.trim(), req.user?.id);
    return res.json({ success: true, data: result, message: result.message });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: { code: err.code || 'UNBAN_FAILED', message: err.message || 'Failed to unban player.' }
    });
  }
});

// POST /api/v1/servers/:id/players/op - Grant operator privileges
router.post('/:id/players/op', authenticate, requireServerAccess('server.players.write'), async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, error: { code: 'USERNAME_REQUIRED', message: 'Username is required.' } });
  }

  try {
    const result = await playerManager.opPlayer(req.server.id, username.trim(), req.user?.id);
    return res.json({ success: true, data: result, message: result.message });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: { code: err.code || 'OP_FAILED', message: err.message || 'Failed to grant operator privileges.' }
    });
  }
});

// POST /api/v1/servers/:id/players/deop - Revoke operator privileges
router.post('/:id/players/deop', authenticate, requireServerAccess('server.players.write'), async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, error: { code: 'USERNAME_REQUIRED', message: 'Username is required.' } });
  }

  try {
    const result = await playerManager.deopPlayer(req.server.id, username.trim(), req.user?.id);
    return res.json({ success: true, data: result, message: result.message });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: { code: err.code || 'DEOP_FAILED', message: err.message || 'Failed to revoke operator privileges.' }
    });
  }
});

// POST /api/v1/servers/:id/players/whitelist - Add player to whitelist
router.post('/:id/players/whitelist', authenticate, requireServerAccess('server.players.write'), async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, error: { code: 'USERNAME_REQUIRED', message: 'Username is required.' } });
  }

  try {
    const result = await playerManager.whitelistPlayer(req.server.id, username.trim(), req.user?.id);
    return res.json({ success: true, data: result, message: result.message });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: { code: err.code || 'WHITELIST_FAILED', message: err.message || 'Failed to whitelist player.' }
    });
  }
});

// POST /api/v1/servers/:id/players/unwhitelist - Remove player from whitelist
router.post('/:id/players/unwhitelist', authenticate, requireServerAccess('server.players.write'), async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, error: { code: 'USERNAME_REQUIRED', message: 'Username is required.' } });
  }

  try {
    const result = await playerManager.unwhitelistPlayer(req.server.id, username.trim(), req.user?.id);
    return res.json({ success: true, data: result, message: result.message });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: { code: err.code || 'UNWHITELIST_FAILED', message: err.message || 'Failed to remove player from whitelist.' }
    });
  }
});

// Backward compatibility alias routes
router.post('/:id/players/ops', authenticate, requireServerAccess('server.players.write'), async (req, res) => {
  const { username } = req.body;
  try {
    const result = await playerManager.opPlayer(req.server.id, (username || '').trim(), req.user?.id);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ success: false, error: { code: err.code || 'OP_FAILED', message: err.message } });
  }
});

router.delete('/:id/players/ops/:username', authenticate, requireServerAccess('server.players.write'), async (req, res) => {
  try {
    const result = await playerManager.deopPlayer(req.server.id, (req.params.username || '').trim(), req.user?.id);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ success: false, error: { code: err.code || 'DEOP_FAILED', message: err.message } });
  }
});

router.delete('/:id/players/whitelist/:username', authenticate, requireServerAccess('server.players.write'), async (req, res) => {
  try {
    const result = await playerManager.unwhitelistPlayer(req.server.id, (req.params.username || '').trim(), req.user?.id);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ success: false, error: { code: err.code || 'UNWHITELIST_FAILED', message: err.message } });
  }
});

router.delete('/:id/players/banned/:username', authenticate, requireServerAccess('server.players.write'), async (req, res) => {
  try {
    const result = await playerManager.unbanPlayer(req.server.id, (req.params.username || '').trim(), req.user?.id);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ success: false, error: { code: err.code || 'UNBAN_FAILED', message: err.message } });
  }
});

export default router;
