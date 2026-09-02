import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireServerAccess } from '../middleware/rbac.js';
import { allocations, playit_tunnels, playit_nodes } from '../db/database.js';
import { playitService } from '../services/playit/playitService.js';

const router = Router();

// GET /api/v1/servers/:id/network - List allocations
router.get('/:id/network', authenticate, requireServerAccess('server.network.manage'), (req, res) => {
  const list = allocations.find({ server_id: req.server.id });
  return res.json({ success: true, data: list });
});

// Alias for frontend compatibility: GET /api/v1/servers/:id/allocations
router.get('/:id/allocations', authenticate, requireServerAccess('server.network.manage'), (req, res) => {
  const list = allocations.find({ server_id: req.server.id });
  return res.json({ success: true, data: list });
});

// POST /api/v1/servers/:id/network/primary - Update primary port & sync with Playit
router.post('/:id/network/primary', authenticate, requireServerAccess('server.network.manage'), async (req, res) => {
  const { allocationId } = req.body;
  const targetAlloc = allocations.findById(allocationId);
  if (!targetAlloc || targetAlloc.server_id !== req.server.id) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_ALLOCATION', message: 'Target allocation does not belong to this server.' } });
  }

  allocations.find({ server_id: req.server.id }).forEach(a => {
    allocations.update(a.id, { is_primary: a.id === Number(allocationId) ? 1 : 0 });
  });

  // Asynchronously synchronize new primary port with Playit tunnel
  playitService.updateTunnelPort(req.server.id, targetAlloc.port).catch((err) => {
    console.warn(`[NETWORK] Playit port update warning for server #${req.server.id}:`, err.message);
  });

  return res.json({ success: true, message: 'Primary allocation updated and synced with tunnel.' });
});

// Alias: POST /api/v1/servers/:id/allocations/:allocationId/primary
router.post('/:id/allocations/:allocationId/primary', authenticate, requireServerAccess('server.network.manage'), async (req, res) => {
  const allocationId = req.params.allocationId;
  const targetAlloc = allocations.findById(allocationId);
  if (!targetAlloc || targetAlloc.server_id !== req.server.id) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_ALLOCATION', message: 'Target allocation does not belong to this server.' } });
  }

  allocations.find({ server_id: req.server.id }).forEach(a => {
    allocations.update(a.id, { is_primary: a.id === Number(allocationId) ? 1 : 0 });
  });

  playitService.updateTunnelPort(req.server.id, targetAlloc.port).catch((err) => {
    console.warn(`[NETWORK] Playit port update warning for server #${req.server.id}:`, err.message);
  });

  return res.json({ success: true, message: 'Primary allocation updated.' });
});

// POST /api/v1/servers/:id/network/assign - Assign additional port
router.post('/:id/network/assign', authenticate, requireServerAccess('server.network.manage'), (req, res) => {
  const freeAlloc = allocations.findOne(a => a.node_id === req.server.node_id && (!a.server_id || a.server_id === null));
  if (!freeAlloc) {
    return res.status(400).json({ success: false, error: { code: 'NO_ALLOCATION', message: 'No free port allocations available on this node.' } });
  }

  allocations.update(freeAlloc.id, { server_id: req.server.id, is_primary: 0 });
  return res.json({ success: true, data: freeAlloc });
});

// Alias: POST /api/v1/servers/:id/allocations
router.post('/:id/allocations', authenticate, requireServerAccess('server.network.manage'), (req, res) => {
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

// Alias: DELETE /api/v1/servers/:id/allocations/:allocationId
router.delete('/:id/allocations/:allocationId', authenticate, requireServerAccess('server.network.manage'), (req, res) => {
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

// ========================================================
// Dedicated Server Playit Zero-Config Endpoints
// ========================================================

// GET /api/v1/servers/:id/network/playit - Get server's public Playit tunnel info
router.get('/:id/network/playit', authenticate, requireServerAccess('server.view'), (req, res) => {
  const nodeId = req.server.node_id || 1;
  const tunnels = playit_tunnels.find({ server_id: req.server.id });
  const primaryTunnel = tunnels.find(t => t.is_primary) || tunnels[0] || null;
  const nodeConfig = playit_nodes.findOne({ node_id: nodeId });
  const secretKey = playitService.getNodeSecretKey(nodeId);

  // Auto-trigger background provisioning if agent is ready but tunnel hasn't been created yet
  if (!primaryTunnel && secretKey && (!nodeConfig || nodeConfig.auto_provision !== false)) {
    playitService.provisionServerTunnels(req.server.id).catch((err) => {
      console.warn(`[PLAYIT] Auto-provision trigger notice for server #${req.server.id}:`, err.message);
    });
  }

  return res.json({
    success: true,
    data: {
      nodeConfigured: Boolean(secretKey),
      nodeStatus: nodeConfig?.playit_status || (secretKey ? 'healthy' : 'unconfigured'),
      agentId: nodeConfig?.agent_id || null,
      agentVersion: nodeConfig?.agent_version || '1.0.10',
      nodeId,
      primary: playitService.getSafeTunnelData(primaryTunnel),
      tunnels: tunnels.map(t => playitService.getSafeTunnelData(t)),
    }
  });
});

// Alias for dedicated Connect page: GET /api/v1/servers/:id/connect
router.get('/:id/connect', authenticate, requireServerAccess('server.view'), (req, res) => {
  const nodeId = req.server.node_id || 1;
  const tunnels = playit_tunnels.find({ server_id: req.server.id });
  const primaryTunnel = tunnels.find(t => t.is_primary) || tunnels[0] || null;
  const nodeConfig = playit_nodes.findOne({ node_id: nodeId });
  const secretKey = playitService.getNodeSecretKey(nodeId);

  if (!primaryTunnel && secretKey && (!nodeConfig || nodeConfig.auto_provision !== false)) {
    playitService.provisionServerTunnels(req.server.id).catch(() => {});
  }

  return res.json({
    success: true,
    data: {
      nodeConfigured: Boolean(secretKey),
      nodeStatus: nodeConfig?.playit_status || (secretKey ? 'healthy' : 'unconfigured'),
      agentId: nodeConfig?.agent_id || null,
      agentVersion: nodeConfig?.agent_version || '1.0.10',
      nodeId,
      primary: playitService.getSafeTunnelData(primaryTunnel),
      tunnels: tunnels.map(t => playitService.getSafeTunnelData(t)),
    }
  });
});

// POST /api/v1/servers/:id/network/playit/retry - Retry tunnel provisioning
router.post('/:id/network/playit/retry', authenticate, requireServerAccess('server.network.manage'), async (req, res) => {
  playitService.provisionServerTunnels(req.server.id).catch((err) => {
    console.error(`[NETWORK] Manual Playit retry failed for server #${req.server.id}:`, err);
  });

  return res.json({
    success: true,
    message: 'Playit tunnel provisioning queued.',
  });
});

// POST /api/v1/servers/:id/network/playit/refresh - Live refresh & reconcile
router.post('/:id/network/playit/refresh', authenticate, requireServerAccess('server.view'), async (req, res) => {
  await playitService.reconcileNode(req.server.node_id).catch(() => {});
  const tunnels = playit_tunnels.find({ server_id: req.server.id });
  const primaryTunnel = tunnels.find(t => t.is_primary) || tunnels[0] || null;

  return res.json({
    success: true,
    data: {
      primary: playitService.getSafeTunnelData(primaryTunnel),
      tunnels: tunnels.map(t => playitService.getSafeTunnelData(t)),
    }
  });
});

// POST /api/v1/servers/:id/network/playit/toggle - Enable or disable tunnel
router.post('/:id/network/playit/toggle', authenticate, requireServerAccess('server.network.manage'), async (req, res) => {
  const { enabled } = req.body;
  try {
    await playitService.toggleTunnel(req.server.id, enabled !== false);
    const tunnels = playit_tunnels.find({ server_id: req.server.id });
    const primaryTunnel = tunnels.find(t => t.is_primary) || tunnels[0] || null;

    return res.json({
      success: true,
      data: playitService.getSafeTunnelData(primaryTunnel),
      message: `Tunnel ${enabled !== false ? 'enabled' : 'disabled'} successfully.`,
    });
  } catch (err) {
    return res.status(err.status || 400).json({
      success: false,
      error: { code: err.code || 'PLAYIT_TOGGLE_FAILED', message: err.message },
    });
  }
});

export default router;
