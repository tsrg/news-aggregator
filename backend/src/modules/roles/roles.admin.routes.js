import { z } from 'zod';
import { Router } from 'express';
import { prisma } from '../../config/prisma.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';

const router = Router();
router.use(requireAuth);
router.use(requirePermission('roles'));

const roleSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9_-]+$/),
  isFullAccess: z.boolean().optional(),
  permissionIds: z.array(z.string()).optional(),
});

/** List all permissions (for role form) */
router.get('/permissions', async (req, res) => {
  try {
    const list = await prisma.permission.findMany({ orderBy: { code: 'asc' } });
    return res.json(list);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** List roles with permission codes */
router.get('/', async (req, res) => {
  try {
    const list = await prisma.authRole.findMany({
      orderBy: { slug: 'asc' },
      include: {
        permissions: { include: { permission: true } },
      },
    });
    const out = list.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      isFullAccess: r.isFullAccess,
      permissions: r.permissions.map((rp) => rp.permission.code),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
    return res.json(out);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await prisma.authRole.findUnique({
      where: { id: req.params.id },
      include: {
        permissions: { include: { permission: true } },
      },
    });
    if (!r) return res.status(404).json({ error: 'Not found' });
    return res.json({
      id: r.id,
      name: r.name,
      slug: r.slug,
      isFullAccess: r.isFullAccess,
      permissionIds: r.permissions.map((rp) => rp.permissionId),
      permissions: r.permissions.map((rp) => rp.permission.code),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = roleSchema.parse(req.body);
    const { permissionIds, ...roleData } = data;
    const role = await prisma.authRole.create({
      data: {
        ...roleData,
        isFullAccess: roleData.isFullAccess ?? false,
      },
    });
    if (permissionIds && permissionIds.length > 0 && !role.isFullAccess) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }
    const created = await prisma.authRole.findUnique({
      where: { id: role.id },
      include: {
        permissions: { include: { permission: true } },
      },
    });
    const out = {
      ...created,
      permissions: created.permissions.map((rp) => rp.permission.code),
    };
    return res.status(201).json(out);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: e.errors });
    if (e.code === 'P2002') return res.status(400).json({ error: 'Role with this slug already exists' });
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const data = roleSchema.partial().parse(req.body);
    const { permissionIds, ...roleData } = data;
    const existing = await prisma.authRole.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    await prisma.authRole.update({
      where: { id: req.params.id },
      data: roleData,
    });

    if (permissionIds !== undefined) {
      await prisma.rolePermission.deleteMany({ where: { roleId: req.params.id } });
      if (permissionIds.length > 0 && !(roleData.isFullAccess ?? existing.isFullAccess)) {
        await prisma.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: req.params.id,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }
    }

    const updated = await prisma.authRole.findUnique({
      where: { id: req.params.id },
      include: {
        permissions: { include: { permission: true } },
      },
    });
    return res.json({
      ...updated,
      permissions: updated.permissions.map((rp) => rp.permission.code),
    });
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: e.errors });
    if (e.code === 'P2002') return res.status(400).json({ error: 'Role with this slug already exists' });
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const count = await prisma.user.count({ where: { roleId: req.params.id } });
    if (count > 0) {
      return res.status(400).json({ error: 'Cannot delete role that has users' });
    }
    await prisma.authRole.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
