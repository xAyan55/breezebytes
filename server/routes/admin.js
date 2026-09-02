import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { users, nodes, allocations, servers, audit_logs } from '../db/database.js';
import { processManager } from '../daemon/processManager.js';
import { FREE_PLAN } from '../config/plans.js';
import emailService from '../services/emailService.js';
import { smtpTestLimiter } from '../middleware/rateLimiters.js';

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
    return {
      ...n,
      serversCount: nodeServers.length,
      allocationsCount: allocs.length,
      usedAllocations: allocs.filter(a => a.server_id).length
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

export default router;
