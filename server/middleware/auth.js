import jwt from 'jsonwebtoken';
import { users, api_keys } from '../db/database.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'breezebytes_super_secret_jwt_key_2026';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  // Support API Key
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    const parts = apiKey.split('.');
    if (parts.length === 2) {
      const prefix = parts[0];
      const keyRecord = api_keys.findOne({ key_prefix: prefix });
      if (keyRecord) {
        const user = users.findById(keyRecord.user_id);
        if (user && !user.is_suspended) {
          api_keys.update(keyRecord.id, { last_used_at: new Date().toISOString() });
          req.user = user;
          req.apiKey = keyRecord;
          return next();
        }
      }
    }
    return res.status(401).json({ success: false, error: { code: 'INVALID_API_KEY', message: 'API key is invalid or revoked.' } });
  }

  if (!token) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users.findById(decoded.id);
    if (!user || user.is_suspended) {
      return res.status(403).json({ success: false, error: { code: 'ACCOUNT_SUSPENDED', message: 'Account is suspended or does not exist.' } });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Session expired or invalid token.' } });
  }
}
