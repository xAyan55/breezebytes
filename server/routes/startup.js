import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireServerAccess } from '../middleware/rbac.js';
import { servers, server_variables } from '../db/database.js';

const router = Router();

// GET /api/v1/servers/:id/startup
router.get('/:id/startup', authenticate, requireServerAccess('server.startup.manage'), (req, res) => {
  const server = req.server;
  const variables = server_variables.find({ server_id: server.id });
  return res.json({
    success: true,
    data: {
      javaVersion: server.java_version,
      startupCommand: server.startup_command,
      software: server.software,
      minecraftVersion: server.minecraft_version,
      variables
    }
  });
});

// POST /api/v1/servers/:id/startup
router.post('/:id/startup', authenticate, requireServerAccess('server.startup.manage'), (req, res) => {
  const { java_version, startup_command, software, minecraft_version, variables = [] } = req.body;
  const updates = {};
  if (java_version) updates.java_version = java_version;
  if (startup_command) updates.startup_command = startup_command;
  if (software) updates.software = software;
  if (minecraft_version) updates.minecraft_version = minecraft_version;

  servers.update(req.server.id, updates);

  // Update variables
  for (const v of variables) {
    if (v.key) {
      server_variables.deleteWhere({ server_id: req.server.id, key: v.key });
      server_variables.insert({
        server_id: req.server.id,
        key: v.key,
        value: v.value || ''
      });
    }
  }

  return res.json({ success: true, message: 'Startup configuration updated.' });
});

export default router;
