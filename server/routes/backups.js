import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireServerAccess } from '../middleware/rbac.js';
import { backups } from '../db/database.js';
import { backupManager } from '../daemon/backupManager.js';

const router = Router();

// GET /api/v1/servers/:id/backups
router.get('/:id/backups', authenticate, requireServerAccess('server.backup.create'), (req, res) => {
  const list = backups.find({ server_id: req.server.id }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return res.json({ success: true, data: list });
});

// POST /api/v1/servers/:id/backups
router.post('/:id/backups', authenticate, requireServerAccess('server.backup.create'), async (req, res) => {
  const { name } = req.body;
  try {
    const result = await backupManager.createBackup(req.server.id, name);
    return res.json({ success: true, data: result.backup });
  } catch (err) {
    return res.status(400).json({ success: false, error: { code: 'BACKUP_FAILED', message: err.message } });
  }
});

// POST /api/v1/servers/:id/backups/:backupId/restore
router.post('/:id/backups/:backupId/restore', authenticate, requireServerAccess('server.backup.create'), async (req, res) => {
  try {
    await backupManager.restoreBackup(req.params.backupId);
    return res.json({ success: true, message: 'Backup restored successfully.' });
  } catch (err) {
    return res.status(400).json({ success: false, error: { code: 'RESTORE_FAILED', message: err.message } });
  }
});

// DELETE /api/v1/servers/:id/backups/:backupId
router.delete('/:id/backups/:backupId', authenticate, requireServerAccess('server.backup.delete'), async (req, res) => {
  try {
    await backupManager.deleteBackup(req.params.backupId);
    return res.json({ success: true, message: 'Backup deleted.' });
  } catch (err) {
    return res.status(400).json({ success: false, error: { code: 'DELETE_BACKUP_FAILED', message: err.message } });
  }
});

// GET /api/v1/servers/:id/backups/:backupId/download
router.get('/:id/backups/:backupId/download', authenticate, requireServerAccess('server.backup.create'), (req, res) => {
  try {
    const { path: filePath, filename } = backupManager.getBackupFilePath(req.params.backupId);
    return res.download(filePath, filename);
  } catch (err) {
    return res.status(404).json({ success: false, error: { code: 'FILE_NOT_FOUND', message: err.message } });
  }
});

export default router;
