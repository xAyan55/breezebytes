import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middleware/auth.js';
import { requireServerAccess } from '../middleware/rbac.js';
import { server_databases } from '../db/database.js';

const router = Router();

// GET /api/v1/servers/:id/databases
router.get('/:id/databases', authenticate, requireServerAccess('server.database.manage'), (req, res) => {
  const list = server_databases.find({ server_id: req.server.id });
  return res.json({ success: true, data: list });
});

// POST /api/v1/servers/:id/databases
router.post('/:id/databases', authenticate, requireServerAccess('server.database.manage'), (req, res) => {
  const { database_name } = req.body;
  if (!database_name) {
    return res.status(400).json({ success: false, error: { code: 'NAME_REQUIRED', message: 'Database name is required.' } });
  }

  const cleanName = 's' + req.server.id + '_' + database_name.replace(/[^a-zA-Z0-9_]/g, '');
  const username = 'u' + req.server.id + '_' + Math.random().toString(36).substring(2, 7);
  const password = Math.random().toString(36).substring(2, 12);
  const salt = bcrypt.genSaltSync(10);
  const password_hash = bcrypt.hashSync(password, salt);

  const newDb = server_databases.insert({
    server_id: req.server.id,
    database_name: cleanName,
    username,
    password_hash,
    host: '127.0.0.1',
    port: 3306
  });

  return res.json({
    success: true,
    data: {
      ...newDb,
      plainPassword: password // Only shown upon creation
    }
  });
});

// DELETE /api/v1/servers/:id/databases/:dbId
router.delete('/:id/databases/:dbId', authenticate, requireServerAccess('server.database.manage'), (req, res) => {
  server_databases.delete(req.params.dbId);
  return res.json({ success: true, message: 'Database deleted.' });
});

export default router;
