import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { config } from '../../config/index.js';

const COOKIE_NAME = 'admin_session';

/** Convert JWT expiresIn string (e.g. "7d", "24h") to seconds for cookie maxAge */
function expiresInToSeconds(expiresIn) {
  if (typeof expiresIn === 'number') return expiresIn;
  const m = String(expiresIn).match(/^(\d+)(d|h|m|s)?$/);
  if (!m) return 7 * 24 * 3600; // default 7 days
  const n = parseInt(m[1], 10);
  switch (m[2]) {
    case 'd': return n * 24 * 3600;
    case 'h': return n * 3600;
    case 'm': return n * 60;
    case 's':
    default: return n;
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function formatUserForResponse(user, role) {
  const roleSlug = role.slug.toUpperCase();
  const isFullAccess = role.isFullAccess === true;
  const permissions = isFullAccess
    ? null
    : (role.permissions || []).map((rp) => rp.permission.code);
  return {
    id: user.id,
    email: user.email,
    role: roleSlug,
    roleId: role.id,
    roleSlug: role.slug,
    isFullAccess,
    permissions: permissions || undefined,
  };
}

export async function login(req, res, next) {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: {
        roleRef: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });
    if (!user || !user.roleRef || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const role = user.roleRef;
    const token = jwt.sign(
      { userId: user.id, roleSlug: role.slug.toUpperCase() },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    const maxAge = expiresInToSeconds(config.jwt.expiresIn);
    const isProduction = config.nodeEnv === 'production';
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'lax' : 'lax',
      maxAge: maxAge * 1000, // cookie uses milliseconds
    });
    return res.json({
      user: formatUserForResponse(user, role),
    });
  } catch (e) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors });
    }
    next(e);
  }
}

/** GET /api/auth/me — current user from session cookie (for SPA session restore) */
export async function me(req, res) {
  const user = req.user;
  const role = req.roleRef;
  return res.json(formatUserForResponse(user, role));
}

/** POST /api/auth/logout — clear session cookie */
export function logout(_req, res) {
  const isProduction = config.nodeEnv === 'production';
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'lax' : 'lax',
    maxAge: 0,
  });
  return res.status(204).send();
}
