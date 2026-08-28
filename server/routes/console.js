import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireServerAccess } from '../middleware/rbac.js';
import { processManager } from '../daemon/processManager.js';

const router = Router();

// GET /api/v1/servers/:id/logs
router.get('/:id/logs', authenticate, requireServerAccess('server.console'), (req, res) => {
  const logs = processManager.getLogs(req.server.id);
  return res.json({ success: true, data: logs });
});

// POST /api/v1/servers/:id/command
router.post('/:id/command', authenticate, requireServerAccess('server.console'), (req, res) => {
  const { command } = req.body;
  if (!command || !command.trim()) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_COMMAND', message: 'Command string is required.' } });
  }

  try {
    processManager.sendCommand(req.server.id, command);
    return res.json({ success: true, message: 'Command sent to process.' });
  } catch (err) {
    return res.status(400).json({ success: false, error: { code: 'COMMAND_FAILED', message: err.message } });
  }
});

export default router;
