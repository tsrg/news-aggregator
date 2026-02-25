import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export function requireEditorOrAdmin(req, res, next) {
  if (req.userRole !== 'ADMIN' && req.userRole !== 'EDITOR') {
    return res.status(403).json({ error: 'Editor or admin access required' });
  }
  next();
}
