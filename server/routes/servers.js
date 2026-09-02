import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { servers, allocations, nodes, server_subusers, activity_logs, audit_logs, users, playit_tunnels } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { requireServerAccess } from '../middleware/rbac.js';
import { processManager } from '../daemon/processManager.js';
import { installer } from '../daemon/installer.js';
import { fileManager } from '../daemon/fileManager.js';
import { withUserLock, validateUserResourceQuota, getUserResourceStats } from '../services/resourceService.js';
import { playitService } from '../services/playit/playitService.js';

const router = Router();

// GET /api/v1/servers - List accessible servers
router.get('/', authenticate, (req, res) => {
  let list = [];
  if (req.user.role === 'owner' || req.user.role === 'admin') {
    list = servers.find();
  } else {
    // Owned servers
    const owned = servers.find({ owner_id: req.user.id });
    // Subuser servers
    const subuserEntries = server_subusers.find({ user_id: req.user.id });
    const subIds = new Set(subuserEntries.map(s => s.server_id));
    const subServers = servers.find(s => subIds.has(s.id));
    list = [...owned, ...subServers];
  }

  const enriched = list.map(server => {
    const alloc = allocations.findOne({ server_id: server.id, is_primary: 1 }) || allocations.findOne({ server_id: server.id });
    const node = nodes.findById(server.node_id);
    const liveStatus = processManager.getStatus(server.id);
    const primaryTunnel = playit_tunnels.findOne({ server_id: server.id, is_primary: 1 }) || playit_tunnels.findOne({ server_id: server.id });

    return {
      ...server,
      status: liveStatus,
      allocation: alloc ? { ip: alloc.ip, port: alloc.port } : null,
      nodeName: node ? node.name : 'Default Node',
      playit: playitService.getSafeTunnelData(primaryTunnel),
    };
  });

  return res.json({ success: true, data: enriched });
});

// POST /api/v1/servers - Create server with concurrency lock and quota validation
router.post('/', authenticate, async (req, res) => {
  const {
    name,
    description = '',
    node_id,
    allocation_id,
    memory,
    cpu,
    disk,
    minecraft_version = '1.20.4',
    software = 'paper',
    java_version = '21',
    startup_command
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Server name is required.' } });
  }

  // Serialized execution per user to guarantee atomic quota checks and prevent race conditions
  return withUserLock(req.user.id, async () => {
    // Determine defaults from user's remaining available quota if not provided
    const userStats = getUserResourceStats(req.user.id);
    const reqMemory = memory !== undefined ? Number(memory) : (userStats?.ram?.available || 4096);
    const reqCpu = cpu !== undefined ? Number(cpu) : (userStats?.cpu?.available || 100);
    const reqDisk = disk !== undefined ? Number(disk) : (userStats?.disk?.available || 10240);

    if (isNaN(reqMemory) || reqMemory <= 0 || isNaN(reqCpu) || reqCpu <= 0 || isNaN(reqDisk) || reqDisk <= 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_RESOURCES', message: 'Memory, CPU, and Disk must be positive numbers.' } });
    }

    try {
      const isPrivileged = req.user.role === 'admin' || req.user.role === 'owner';
      validateUserResourceQuota(
        req.user.id,
        { memory: reqMemory, cpu: reqCpu, disk: reqDisk },
        isPrivileged
      );
    } catch (quotaErr) {
      return res.status(quotaErr.status || 400).json({
        success: false,
        error: {
          code: quotaErr.code || 'QUOTA_EXCEEDED',
          message: quotaErr.message,
        },
      });
    }

    // 1. Validate Node
    const node = node_id ? nodes.findById(node_id) : nodes.findOne();
    if (!node) {
      return res.status(400).json({ success: false, error: { code: 'NO_NODE', message: 'No available node found for server allocation.' } });
    }

    // 2. Validate Allocation
    let alloc = null;
    if (allocation_id) {
      alloc = allocations.findById(allocation_id);
      if (!alloc || (alloc.server_id && alloc.server_id !== null)) {
        return res.status(400).json({ success: false, error: { code: 'ALLOCATION_UNAVAILABLE', message: 'Selected port allocation is already in use.' } });
      }
    } else {
      // Find first free allocation on node
      alloc = allocations.findOne(a => a.node_id === node.id && !a.server_id);
      if (!alloc) {
        return res.status(400).json({ success: false, error: { code: 'NO_ALLOCATIONS', message: 'No free port allocations available on this node.' } });
      }
    }

    const serverUuid = uuidv4 ? uuidv4() : Math.random().toString(36).substring(2, 10) + '-' + Date.now();
    const identifier = serverUuid.substring(0, 8);

    const defaultStartup = startup_command || 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar server.jar nogui';

    const newServer = servers.insert({
      uuid: serverUuid,
      identifier: identifier,
      name: name.trim(),
      description: description.trim(),
      owner_id: req.user.id,
      node_id: node.id,
      status: 'installing',
      memory: reqMemory,
      cpu: reqCpu,
      disk: reqDisk,
      minecraft_version,
      software,
      java_version,
      startup_command: defaultStartup,
      auto_restart: 1,
      is_suspended: 0
    });

    // Bind allocation
    allocations.update(alloc.id, { server_id: newServer.id, is_primary: 1 });

    // Mark onboarding complete now that server creation has reached verified creation
    users.update(req.user.id, { onboarding_completed: true });

    // Log activity
    activity_logs.insert({
      server_id: newServer.id,
      user_id: req.user.id,
      action: 'server_create',
      metadata: JSON.stringify({ name: newServer.name, port: alloc.port })
    });

    audit_logs.insert({
      user_id: req.user.id,
      action: 'server_create',
      target_type: 'server',
      target_id: newServer.id,
      details: JSON.stringify({ name: newServer.name, memory: reqMemory, software })
    });

    // Asynchronously trigger server installation
    installer.installServer(newServer).catch((err) => {
      console.error(`[SERVERS] Installation failed for server #${newServer.id}:`, err);
      servers.update(newServer.id, { status: 'offline' });
    });

    // Asynchronously trigger zero-config Playit tunnel provisioning
    playitService.provisionServerTunnels(newServer.id).catch((err) => {
      console.error(`[SERVERS] Playit provisioning background error for server #${newServer.id}:`, err);
    });

    return res.json({
      success: true,
      data: {
        ...newServer,
        allocation: { ip: alloc.ip, port: alloc.port },
        playit: { status: 'pending', publicAddress: null }
      }
    });
  });
});

// GET /api/v1/servers/:id - Server details
router.get('/:id', authenticate, requireServerAccess('server.view'), (req, res) => {
  const server = req.server;
  const node = nodes.findById(server.node_id);
  const allocs = allocations.find({ server_id: server.id });
  const liveStatus = processManager.getStatus(server.id);
  const tunnels = playit_tunnels.find({ server_id: server.id });
  const primaryTunnel = tunnels.find(t => t.is_primary) || tunnels[0] || null;
  const primaryAlloc = allocs.find(a => a.is_primary === 1) || allocs[0] || null;

  return res.json({
    success: true,
    data: {
      ...server,
      status: liveStatus,
      node: node ? { id: node.id, name: node.name, fqdn: node.fqdn } : null,
      allocation: primaryAlloc ? { ip: primaryAlloc.ip, port: primaryAlloc.port } : null,
      allocations: allocs.map(a => ({ id: a.id, ip: a.ip, port: a.port, isPrimary: a.is_primary === 1 })),
      playit: playitService.getSafeTunnelData(primaryTunnel),
      playitTunnels: tunnels.map(t => playitService.getSafeTunnelData(t)),
    }
  });
});

// PATCH /api/v1/servers/:id - Update settings
router.patch('/:id', authenticate, requireServerAccess('server.settings.manage'), (req, res) => {
  const { name, description, auto_restart } = req.body;
  const updates = {};
  if (name && name.trim()) updates.name = name.trim();
  if (description !== undefined) updates.description = description;
  if (auto_restart !== undefined) updates.auto_restart = auto_restart ? 1 : 0;

  const updated = servers.update(req.server.id, updates);
  return res.json({ success: true, data: updated });
});

// POST /api/v1/servers/:id/reinstall
router.post('/:id/reinstall', authenticate, requireServerAccess('server.settings.manage'), async (req, res) => {
  if (processManager.getStatus(req.server.id) === 'running') {
    await processManager.stopServer(req.server.id);
  }
  installer.installServer(req.server).catch(console.error);
  return res.json({ success: true, message: 'Reinstallation started.' });
});

// DELETE /api/v1/servers/:id - Delete server
router.delete('/:id', authenticate, requireServerAccess('server.settings.manage'), async (req, res) => {
  const id = req.server.id;

  // 1. Force stop process if running
  try {
    await processManager.killServer(id);
  } catch {
    // ignore
  }

  // 2. Clean up Playit tunnels for this server (resilient)
  try {
    await playitService.deleteTunnelsForServer(id);
  } catch (err) {
    console.warn(`[SERVERS] Playit tunnel cleanup warning on server delete #${id}:`, err.message);
  }

  // 3. Free allocations
  allocations.find({ server_id: id }).forEach(a => {
    allocations.update(a.id, { server_id: null, is_primary: 0 });
  });

  // 4. Delete server files from disk
  try {
    const root = fileManager.getServerRoot(id);
    fileManager.deletePath(id, root);
  } catch {
    // ignore
  }

  // 5. Delete database record
  servers.delete(id);

  audit_logs.insert({
    user_id: req.user.id,
    action: 'server_delete',
    target_type: 'server',
    target_id: id,
    details: JSON.stringify({ name: req.server.name })
  });

  return res.json({ success: true, message: 'Server deleted successfully.' });
});

export default router;
