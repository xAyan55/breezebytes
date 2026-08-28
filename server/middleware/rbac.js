import { servers, server_subusers } from '../db/database.js';

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    if (req.user.role === 'owner' || allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to perform this administration action.' } });
  };
}

export function requireServerAccess(permission = '') {
  return (req, res, next) => {
    const serverId = Number(req.params.id || req.params.serverId || req.body.serverId);
    if (!serverId) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Server ID is required.' } });
    }

    const server = servers.findById(serverId);
    if (!server) {
      return res.status(404).json({ success: false, error: { code: 'SERVER_NOT_FOUND', message: 'Server not found.' } });
    }

    req.server = server;

    // Owner and Admin have unrestricted access
    if (req.user.role === 'owner' || req.user.role === 'admin') {
      return next();
    }

    // Direct server owner
    if (server.owner_id === req.user.id) {
      return next();
    }

    // Subuser check
    const subuser = server_subusers.findOne({ server_id: serverId, user_id: req.user.id });
    if (subuser) {
      let perms = [];
      try {
        perms = JSON.parse(subuser.permissions || '[]');
      } catch {
        perms = [];
      }

      if (!permission || perms.includes('*') || perms.includes(permission)) {
        req.subuser = subuser;
        return next();
      }
    }

    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to access or manage this server.' } });
  };
}
