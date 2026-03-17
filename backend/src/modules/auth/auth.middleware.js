import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { prisma } from '../../config/prisma.js';

/**
 * Verify JWT and load user with role and permissions. Sets req.userId, req.user, req.roleRef, req.isFullAccess, req.permissions.
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        roleRef: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });
    if (!user || !user.roleRef) {
      return res.status(401).json({ error: 'User or role not found' });
    }
    req.userId = user.id;
    req.user = user;
    req.roleRef = user.roleRef;
    req.isFullAccess = user.roleRef.isFullAccess === true;
    req.permissions =
      req.isFullAccess
        ? null
        : (user.roleRef.permissions || []).map((rp) => rp.permission.code);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Require one of the permission codes. Use after requireAuth. If role has isFullAccess, allows; otherwise checks req.permissions.
 */
export function requirePermission(code) {
  return (req, res, next) => {
    if (req.isFullAccess) return next();
    if (req.permissions && req.permissions.includes(code)) return next();
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}

/** Require full admin (legacy: slug admin or isFullAccess). Use for routes that only full admin should access. */
export function requireAdmin(req, res, next) {
  if (req.isFullAccess || (req.roleRef && req.roleRef.slug === 'admin')) {
    return next();
  }
  return res.status(403).json({ error: 'Admin access required' });
}

/** Require permission 'news' (editor or admin). Kept for backward compat. */
export function requireEditorOrAdmin(req, res, next) {
  if (req.isFullAccess) return next();
  if (req.permissions && req.permissions.includes('news')) return next();
  return res.status(403).json({ error: 'Editor or admin access required' });
}
