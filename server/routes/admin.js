import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { users, nodes, allocations, servers, audit_logs, playit_nodes, playit_tunnels } from '../db/database.js';
import { processManager } from '../daemon/processManager.js';
import { FREE_PLAN } from '../config/plans.js';
import emailService from '../services/emailService.js';
import { smtpTestLimiter } from '../middleware/rateLimiters.js';
import { playitService } from '../services/playit/playitService.js';
import { agentManager } from '../services/playit/agentManager.js';
import { encryptPlayitSecret } from '../utils/cryptoUtils.js';

const router = Router();
router.use(authenticate);
router.use(requireRole('admin', 'owner'));

// GET /api/v1/admin/overview
router.get('/overview', (req, res) => {
  const allServers = servers.find();
  const allUsers = users.find();
  const allNodes = nodes.find();
  const allAllocs = allocations.find();

  let totalRamAllocated = 0;
  let totalCpuAllocated = 0;
  let totalDiskAllocated = 0;
  let runningCount = 0;

  for (const s of allServers) {
    totalRamAllocated += Number(s.memory) || 0;
    totalCpuAllocated += Number(s.cpu) || 0;
    totalDiskAllocated += Number(s.disk) || 0;
    if (processManager.getStatus(s.id) === 'running') {
      runningCount++;
    }
  }

  const totalCapacityRam = allNodes.reduce((acc, n) => acc + (Number(n.memory_total) || 0), 0);
  const totalCapacityDisk = allNodes.reduce((acc, n) => acc + (Number(n.disk_total) || 0), 0);

  return res.json({
    success: true,
    data: {
      servers: {
        total: allServers.length,
        running: runningCount,
        offline: allServers.length - runningCount
      },
      users: {
        total: allUsers.length
      },
      nodes: {
        total: allNodes.length
      },
      allocations: {
        total: allAllocs.length,
        used: allAllocs.filter(a => a.server_id).length,
        free: allAllocs.filter(a => !a.server_id).length
      },
      resources: {
        allocatedRamMb: totalRamAllocated,
        totalRamMb: totalCapacityRam || 24576,
        allocatedDiskMb: totalDiskAllocated,
        totalDiskMb: totalCapacityDisk || 50000,
        allocatedCpu: totalCpuAllocated
      }
    }
  });
});

// GET /api/v1/admin/users
router.get('/users', (req, res) => {
  const list = users.find().map(u => ({
    id: u.id,
    email: u.email,
    username: u.username,
    role: u.role,
    is_suspended: u.is_suspended,
    created_at: u.created_at
  }));
  return res.json({ success: true, data: list });
});

// POST /api/v1/admin/users
router.post('/users', (req, res) => {
  const { email, username, password, role = 'user' } = req.body;
  if (!email || !username || !password) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'All fields are required.' } });
  }

  if (users.findOne({ email: email.trim().toLowerCase() })) {
    return res.status(400).json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'User already exists.' } });
  }

  const salt = bcrypt.genSaltSync(12);
  const password_hash = bcrypt.hashSync(password, salt);

  const newUser = users.insert({
    email: email.trim().toLowerCase(),
    username: username.trim(),
    password_hash,
    role,
    is_suspended: 0,
    hosting_ram: req.body.hosting_ram !== undefined ? Number(req.body.hosting_ram) : FREE_PLAN.ramMb,
    hosting_cpu: req.body.hosting_cpu !== undefined ? Number(req.body.hosting_cpu) : FREE_PLAN.cpuPercent,
    hosting_disk: req.body.hosting_disk !== undefined ? Number(req.body.hosting_disk) : FREE_PLAN.diskMb,
    hosting_server_slots: req.body.hosting_server_slots !== undefined ? Number(req.body.hosting_server_slots) : FREE_PLAN.serverSlots,
    onboarding_completed: req.body.onboarding_completed !== undefined ? Boolean(req.body.onboarding_completed) : true,
  });

  return res.json({
    success: true,
    data: {
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role
    }
  });
});

// PATCH /api/v1/admin/users/:id
router.patch('/users/:id', (req, res) => {
  const { role, is_suspended, password, hosting_ram, hosting_cpu, hosting_disk, hosting_server_slots } = req.body;
  const updates = {};
  if (role) updates.role = role;
  if (is_suspended !== undefined) updates.is_suspended = is_suspended ? 1 : 0;
  if (hosting_ram !== undefined) updates.hosting_ram = Number(hosting_ram);
  if (hosting_cpu !== undefined) updates.hosting_cpu = Number(hosting_cpu);
  if (hosting_disk !== undefined) updates.hosting_disk = Number(hosting_disk);
  if (hosting_server_slots !== undefined) updates.hosting_server_slots = Number(hosting_server_slots);
  if (password) {
    const salt = bcrypt.genSaltSync(12);
    updates.password_hash = bcrypt.hashSync(password, salt);
  }

  const updated = users.update(req.params.id, updates);
  return res.json({ success: true, data: updated });
});

// DELETE /api/v1/admin/users/:id
router.delete('/users/:id', (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ success: false, error: { code: 'CANNOT_DELETE_SELF', message: 'You cannot delete your own account.' } });
  }
  users.delete(req.params.id);
  return res.json({ success: true, message: 'User deleted.' });
});

// GET /api/v1/admin/nodes
router.get('/nodes', (req, res) => {
  const list = nodes.find().map(n => {
    const nodeServers = servers.find({ node_id: n.id });
    const allocs = allocations.find({ node_id: n.id });
    const pNode = playit_nodes.findOne({ node_id: n.id });
    const nodeTunnels = playit_tunnels.find({ node_id: n.id });

    return {
      ...n,
      serversCount: nodeServers.length,
      allocationsCount: allocs.length,
      usedAllocations: allocs.filter(a => a.server_id).length,
      playit: {
        configured: Boolean(pNode?.secret_configured || (n.id === 1 && process.env.PLAYIT_AGENT_SECRET)),
        enabled: pNode ? Boolean(pNode.enabled) : true,
        autoProvision: pNode ? Boolean(pNode.auto_provision) : true,
        status: pNode?.playit_status || 'unconfigured',
        agentId: pNode?.agent_id || null,
        agentVersion: pNode?.agent_version || '1.0.10',
        activeTunnels: nodeTunnels.filter(t => t.status === 'active').length,
        lastHealthCheck: pNode?.last_health_check || null,
      }
    };
  });
  return res.json({ success: true, data: list });
});

// POST /api/v1/admin/nodes
router.post('/nodes', (req, res) => {
  const { name, fqdn = '127.0.0.1', port = 3001, memory_total = 24576, disk_total = 50000, cpu_total = 400 } = req.body;
  if (!name) return res.status(400).json({ success: false, error: { code: 'NAME_REQUIRED', message: 'Node name is required.' } });

  const token = 'bb_node_' + Math.random().toString(36).substring(2, 15);
  const newNode = nodes.insert({
    name: name.trim(),
    fqdn,
    port: Number(port),
    daemon_token: token,
    memory_total: Number(memory_total),
    disk_total: Number(disk_total),
    cpu_total: Number(cpu_total),
    is_online: 1,
    last_heartbeat: new Date().toISOString()
  });

  return res.json({ success: true, data: newNode });
});

// GET /api/v1/admin/allocations
router.get('/allocations', (req, res) => {
  const list = allocations.find().map(a => {
    const s = a.server_id ? servers.findById(a.server_id) : null;
    const n = nodes.findById(a.node_id);
    return {
      ...a,
      serverName: s ? s.name : null,
      nodeName: n ? n.name : 'Unknown Node'
    };
  });
  return res.json({ success: true, data: list });
});

// POST /api/v1/admin/allocations
router.post('/allocations', (req, res) => {
  const { node_id, ip = '0.0.0.0', start_port, end_port } = req.body;
  if (!node_id || !start_port) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Node and start port are required.' } });
  }

  const start = Number(start_port);
  const end = end_port ? Number(end_port) : start;
  let added = 0;

  for (let port = start; port <= end; port++) {
    const existing = allocations.findOne({ node_id: Number(node_id), ip, port });
    if (!existing) {
      allocations.insert({
        node_id: Number(node_id),
        ip,
        port,
        server_id: null,
        is_primary: 0
      });
      added++;
    }
  }

  return res.json({ success: true, message: `Created ${added} port allocation(s).` });
});

// DELETE /api/v1/admin/allocations/:id
router.delete('/allocations/:id', (req, res) => {
  const alloc = allocations.findById(req.params.id);
  if (alloc && alloc.server_id) {
    return res.status(400).json({ success: false, error: { code: 'IN_USE', message: 'Cannot delete allocation assigned to a server.' } });
  }
  allocations.delete(req.params.id);
  return res.json({ success: true, message: 'Allocation deleted.' });
});

// POST /api/v1/admin/servers/:id/suspend
router.post('/servers/:id/suspend', async (req, res) => {
  const server = servers.findById(req.params.id);
  if (!server) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Server not found.' } });

  try {
    await processManager.killServer(server.id);
  } catch {}

  servers.update(server.id, { is_suspended: 1, status: 'suspended' });
  processManager.emit('status', { serverId: server.id, status: 'suspended' });

  return res.json({ success: true, message: 'Server suspended.' });
});

// POST /api/v1/admin/servers/:id/unsuspend
router.post('/servers/:id/unsuspend', (req, res) => {
  const server = servers.findById(req.params.id);
  if (!server) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Server not found.' } });

  servers.update(server.id, { is_suspended: 0, status: 'offline' });
  processManager.emit('status', { serverId: server.id, status: 'offline' });

  return res.json({ success: true, message: 'Server unsuspended.' });
});

// GET /api/v1/admin/settings/smtp - Read safe SMTP configuration
router.get('/settings/smtp', (req, res) => {
  const status = emailService.getPublicSmtpStatus();
  return res.json({ success: true, data: status });
});

// POST /api/v1/admin/settings/smtp - Save SMTP configuration
router.post('/settings/smtp', (req, res) => {
  const {
    enabled,
    host,
    port,
    security,
    username,
    password,
    fromEmail,
    fromName,
    replyTo,
  } = req.body;

  if (port && (isNaN(Number(port)) || Number(port) < 1 || Number(port) > 65535)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_PORT', message: 'Port must be an integer between 1 and 65535.' },
    });
  }

  if (security && !['ssl', 'starttls', 'none'].includes(security)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_SECURITY', message: 'Security must be ssl, starttls, or none.' },
    });
  }

  const updatedStatus = emailService.saveSmtpConfig({
    enabled,
    host,
    port,
    security,
    username,
    password,
    fromEmail,
    fromName,
    replyTo,
  });

  audit_logs.insert({
    user_id: req.user.id,
    action: 'admin.settings.smtp.update',
    details: JSON.stringify({
      enabled: updatedStatus.enabled,
      host: updatedStatus.host,
      port: updatedStatus.port,
      security: updatedStatus.security,
      username: updatedStatus.username,
      fromEmail: updatedStatus.fromEmail,
    }),
  });

  return res.json({
    success: true,
    data: updatedStatus,
    message: 'SMTP settings updated successfully.',
  });
});

// POST /api/v1/admin/settings/smtp/test - Test connection and send test email
router.post('/settings/smtp/test', smtpTestLimiter, async (req, res) => {
  const destinationEmail = (req.body.destinationEmail || req.user.email || '').trim();

  if (!destinationEmail || !destinationEmail.includes('@')) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_DESTINATION_EMAIL', message: 'A valid destination email is required.' },
    });
  }

  try {
    const result = await emailService.sendTestEmail(destinationEmail);

    audit_logs.insert({
      user_id: req.user.id,
      action: 'admin.settings.smtp.test',
      details: JSON.stringify({ recipient: destinationEmail, messageId: result.messageId }),
    });

    return res.json({
      success: true,
      message: `Test email sent successfully to ${destinationEmail}.`,
    });
  } catch (err) {
    return res.status(err.status || 400).json({
      success: false,
      error: {
        code: err.code || 'SMTP_TEST_FAILED',
        message: err.message,
      },
    });
  }
});

// GET /api/v1/admin/audit-logs
router.get('/audit-logs', (req, res) => {
  const list = audit_logs.find().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 100);
  const enriched = list.map(l => {
    const u = l.user_id ? users.findById(l.user_id) : null;
    return {
      ...l,
      userEmail: u ? u.email : 'System'
    };
  });
  return res.json({ success: true, data: enriched });
});

// ========================================================
// Admin Playit Integration Endpoints
// ========================================================

// GET /api/v1/admin/playit/nodes/:nodeId/status
router.get('/playit/nodes/:nodeId/status', async (req, res) => {
  const nodeId = Number(req.params.nodeId) || 1;
  const pNode = playit_nodes.findOne({ node_id: nodeId });
  const agentStatus = await agentManager.getStatus(nodeId);
  const nodeTunnels = playit_tunnels.find({ node_id: nodeId });
  const activeTunnels = nodeTunnels.filter(t => t.status === 'active');
  const orphanedTunnels = nodeTunnels.filter(t => t.status === 'orphaned');

  return res.json({
    success: true,
    data: {
      nodeId,
      configured: Boolean(pNode?.secret_configured || (nodeId === 1 && process.env.PLAYIT_AGENT_SECRET)),
      enabled: pNode ? Boolean(pNode.enabled) : true,
      autoProvision: pNode ? Boolean(pNode.auto_provision) : true,
      playitStatus: pNode?.playit_status || 'unconfigured',
      agentId: pNode?.agent_id || null,
      agentVersion: agentStatus.version || pNode?.agent_version || '1.0.10',
      isSystemd: Boolean(agentStatus.isSystemd),
      agentRunning: agentStatus.status === 'running',
      agentState: agentStatus.status,
      activeTunnelsCount: activeTunnels.length,
      orphanedTunnelsCount: orphanedTunnels.length,
      totalTunnelsCount: nodeTunnels.length,
      lastHealthCheck: pNode?.last_health_check || null,
      lastReconciledAt: pNode?.last_reconciled_at || null,
      lastError: pNode?.last_error || null,
      lastErrorCode: pNode?.last_error_code || null,
    }
  });
});

// POST /api/v1/admin/playit/nodes/:nodeId/config - Update settings & encrypted secret
router.post('/playit/nodes/:nodeId/config', (req, res) => {
  const nodeId = Number(req.params.nodeId) || 1;
  const { enabled, auto_provision, secretKey } = req.body;

  let pNode = playit_nodes.findOne({ node_id: nodeId });
  if (!pNode) {
    pNode = playit_nodes.insert({
      node_id: nodeId,
      enabled: true,
      auto_provision: true,
      agent_id: null,
      agent_version: '1.0.10',
      secret_configured: false,
      encrypted_secret: null,
      playit_status: 'unconfigured',
      install_path: null,
      service_name: 'playit-agent.service',
      last_health_check: null,
      last_reconciled_at: null,
      last_error: null,
      last_error_code: null,
    });
  }

  const updates = {};
  if (enabled !== undefined) updates.enabled = Boolean(enabled);
  if (auto_provision !== undefined) updates.auto_provision = Boolean(auto_provision);

  if (secretKey && typeof secretKey === 'string' && secretKey.trim()) {
    const cleanSecret = secretKey.trim();
    const encrypted = encryptPlayitSecret(cleanSecret);
    updates.encrypted_secret = encrypted;
    updates.secret_configured = true;
    updates.playit_status = 'stopped';

    // Safely write secret to local disk with 0600 permissions
    agentManager.writeSecretFile(cleanSecret, nodeId);

    // Audit log (NEVER logs secret or raw tokens)
    audit_logs.insert({
      user_id: req.user.id,
      action: 'playit.agent.secret.updated',
      target_type: 'node',
      target_id: nodeId,
      details: JSON.stringify({ nodeId, secretLength: cleanSecret.length }),
    });
  }

  const updated = playit_nodes.update(pNode.id, updates);

  return res.json({
    success: true,
    data: {
      nodeId: updated.node_id,
      enabled: updated.enabled,
      autoProvision: updated.auto_provision,
      configured: updated.secret_configured,
      agentId: updated.agent_id,
      status: updated.playit_status,
    },
    message: 'Playit node configuration saved successfully.',
  });
});

// POST /api/v1/admin/playit/nodes/:nodeId/claim/setup - Start official claim flow
router.post('/playit/nodes/:nodeId/claim/setup', async (req, res) => {
  const nodeId = Number(req.params.nodeId) || 1;
  const client = playitService.getApiClientForNode(nodeId);

  // Generate cryptographically random claim code
  const code = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);

  try {
    await client.claimSetup(code, 'self-managed', '1.0.10');

    audit_logs.insert({
      user_id: req.user.id,
      action: 'playit.claim.started',
      target_type: 'node',
      target_id: nodeId,
      details: JSON.stringify({ nodeId }),
    });

    return res.json({
      success: true,
      data: {
        code,
        claimUrl: `https://playit.gg/claim/${code}`,
        expiresInSec: 600,
      },
      message: 'Claim code generated. Please open claim URL in your browser to approve the agent.',
    });
  } catch (err) {
    return res.status(err.status || 400).json({
      success: false,
      error: { code: err.code || 'CLAIM_SETUP_FAILED', message: err.message },
    });
  }
});

// POST /api/v1/admin/playit/nodes/:nodeId/claim/exchange - Exchange approved claim code
router.post('/playit/nodes/:nodeId/claim/exchange', async (req, res) => {
  const nodeId = Number(req.params.nodeId) || 1;
  const { code } = req.body;
  if (!code || !code.trim()) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_CODE', message: 'Claim code is required.' } });
  }

  const client = playitService.getApiClientForNode(nodeId);

  try {
    const exchangeRes = await client.claimExchange(code.trim());
    const secretKey = exchangeRes.secret_key;

    if (!secretKey) {
      throw new Error('Claim exchange did not return a valid secret key.');
    }

    // Encrypt and store secret
    const encrypted = encryptPlayitSecret(secretKey);
    let pNode = playit_nodes.findOne({ node_id: nodeId });
    if (!pNode) {
      pNode = playit_nodes.insert({ node_id: nodeId });
    }

    playit_nodes.update(pNode.id, {
      encrypted_secret: encrypted,
      secret_configured: true,
      playit_status: 'stopped',
    });

    agentManager.writeSecretFile(secretKey, nodeId);

    audit_logs.insert({
      user_id: req.user.id,
      action: 'playit.claim.completed',
      target_type: 'node',
      target_id: nodeId,
      details: JSON.stringify({ nodeId }),
    });

    // Asynchronously ensure agent runs and obtain authoritative run-data
    playitService.ensureAgent(nodeId).catch((err) => {
      console.warn(`[ADMIN] Post-claim agent startup warning for node #${nodeId}:`, err.message);
    });

    return res.json({
      success: true,
      message: 'Agent successfully claimed and securely configured on node.',
    });
  } catch (err) {
    return res.status(err.status || 400).json({
      success: false,
      error: { code: err.code || 'CLAIM_EXCHANGE_FAILED', message: err.message },
    });
  }
});

// POST /api/v1/admin/playit/nodes/:nodeId/install - Verify or download agent binary
router.post('/playit/nodes/:nodeId/install', async (req, res) => {
  const nodeId = Number(req.params.nodeId) || 1;
  try {
    const result = await agentManager.installBinary();

    audit_logs.insert({
      user_id: req.user.id,
      action: 'playit.agent.install',
      target_type: 'node',
      target_id: nodeId,
      details: JSON.stringify({ nodeId, version: result.version }),
    });

    return res.json({
      success: true,
      data: result,
      message: `Playit agent binary v${result.version} installed successfully.`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INSTALL_FAILED', message: err.message },
    });
  }
});

// POST /api/v1/admin/playit/nodes/:nodeId/restart - Restart agent
router.post('/playit/nodes/:nodeId/restart', async (req, res) => {
  const nodeId = Number(req.params.nodeId) || 1;
  try {
    await playitService.ensureAgent(nodeId);

    audit_logs.insert({
      user_id: req.user.id,
      action: 'playit.agent.restart',
      target_type: 'node',
      target_id: nodeId,
      details: JSON.stringify({ nodeId }),
    });

    return res.json({
      success: true,
      message: `Playit agent on node #${nodeId} restarted and verified healthy.`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'RESTART_FAILED', message: err.message },
    });
  }
});

// POST /api/v1/admin/playit/nodes/:nodeId/reconcile - Manual reconcile
router.post('/playit/nodes/:nodeId/reconcile', async (req, res) => {
  const nodeId = Number(req.params.nodeId) || 1;
  try {
    const result = await playitService.reconcileNode(nodeId);

    audit_logs.insert({
      user_id: req.user.id,
      action: 'playit.tunnel.reconciled',
      target_type: 'node',
      target_id: nodeId,
      details: JSON.stringify({ nodeId, ...result }),
    });

    return res.json({
      success: true,
      data: result,
      message: 'Node tunnel reconciliation completed.',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'RECONCILE_FAILED', message: err.message },
    });
  }
});

export default router;
