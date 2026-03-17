import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { config } from '../../config/index.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

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
    const isFullAccess = role.isFullAccess === true;
    const permissions = isFullAccess
      ? null
      : (role.permissions || []).map((rp) => rp.permission.code);
    const roleSlug = role.slug.toUpperCase(); // ADMIN, EDITOR for backward compat
    const token = jwt.sign(
      { userId: user.id, roleSlug },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: roleSlug,
        roleId: role.id,
        roleSlug: role.slug,
        isFullAccess,
        permissions: permissions || undefined,
      },
    });
  } catch (e) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors });
    }
    next(e);
  }
}
