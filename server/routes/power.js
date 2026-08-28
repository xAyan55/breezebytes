import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireServerAccess } from '../middleware/rbac.js';
import { processManager } from '../daemon/processManager.js';

const router = Router();

// POST /api/v1/servers/:id/power
router.post('/:id/power', authenticate, requireServerAccess('server.power'), async (req, res) => {
  const { action } = req.body;
  const serverId = req.server.id;

  try {
    if (action === 'start') {
      const result = await processManager.startServer(serverId);
      return res.json({ success: true, data: result });
    } else if (action === 'stop') {
      const result = await processManager.stopServer(serverId);
      return res.json({ success: true, data: result });
    } else if (action === 'restart') {
      const result = await processManager.restartServer(serverId);
      return res.json({ success: true, data: result });
    } else if (action === 'kill') {
      const result = await processManager.killServer(serverId);
      return res.json({ success: true, data: result });
    } else {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ACTION', message: 'Action must be start, stop, restart, or kill.' } });
    }
  } catch (err) {
    return res.status(400).json({ success: false, error: { code: 'POWER_ACTION_FAILED', message: err.message } });
  }
});

export default router;
