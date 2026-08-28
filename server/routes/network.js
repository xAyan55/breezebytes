import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireServerAccess } from '../middleware/rbac.js';
import { allocations } from '../db/database.js';

const router = Router();

// GET /api/v1/servers/:id/network
router.get('/:id/network', authenticate, requireServerAccess('server.network.manage'), (req, res) => {
  const list = allocations.find({ server_id: req.server.id });
  return res.json({ success: true, data: list });
});

// POST /api/v1/servers/:id/network/primary
router.post('/:id/network/primary', authenticate, requireServerAccess('server.network.manage'), (req, res) => {
  const { allocationId } = req.body;
  allocations.find({ server_id: req.server.id }).forEach(a => {
    allocations.update(a.id, { is_primary: a.id === Number(allocationId) ? 1 : 0 });
  });
  return res.json({ success: true, message: 'Primary allocation updated.' });
});

// POST /api/v1/servers/:id/network/assign
router.post('/:id/network/assign', authenticate, requireServerAccess('server.network.manage'), (req, res) => {
  const freeAlloc = allocations.findOne(a => a.node_id === req.server.node_id && (!a.server_id || a.server_id === null));
  if (!freeAlloc) {
    return res.status(400).json({ success: false, error: { code: 'NO_ALLOCATION', message: 'No free port allocations available on this node.' } });
  }

  allocations.update(freeAlloc.id, { server_id: req.server.id, is_primary: 0 });
  return res.json({ success: true, data: freeAlloc });
});

// DELETE /api/v1/servers/:id/network/:allocationId
router.delete('/:id/network/:allocationId', authenticate, requireServerAccess('server.network.manage'), (req, res) => {
  const alloc = allocations.findById(req.params.allocationId);
  if (!alloc || alloc.server_id !== req.server.id) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Allocation not found on this server.' } });
  }
  if (alloc.is_primary) {
    return res.status(400).json({ success: false, error: { code: 'CANNOT_DELETE_PRIMARY', message: 'Cannot unassign primary port.' } });
  }

  allocations.update(alloc.id, { server_id: null, is_primary: 0 });
  return res.json({ success: true, message: 'Allocation unassigned.' });
});

export default router;
