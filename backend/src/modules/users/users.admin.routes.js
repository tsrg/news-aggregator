import bcrypt from 'bcrypt';
import { z } from 'zod';
import { Router } from 'express';
import { prisma } from '../../config/prisma.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';

const router = Router();
router.use(requireAuth);
router.use(requirePermission('users'));

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  roleId: z.string().min(1),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  roleId: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
});

const userSelect = {
  id: true,
  email: true,
  roleId: true,
  createdAt: true,
  roleRef: {
    select: { id: true, name: true, slug: true },
  },
};

router.get('/', async (req, res) => {
  try {
    const list = await prisma.user.findMany({
      select: userSelect,
      orderBy: { email: 'asc' },
    });
    return res.json(list);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: userSelect,
    });
    if (!user) return res.status(404).json({ error: 'Not found' });
    return res.json(user);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = createUserSchema.parse(req.body);
    const role = await prisma.authRole.findUnique({ where: { id: data.roleId } });
    if (!role) return res.status(400).json({ error: 'Invalid role' });
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        roleId: data.roleId,
      },
      select: userSelect,
    });
    return res.status(201).json(user);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: e.errors });
    if (e.code === 'P2002') return res.status(400).json({ error: 'Email already exists' });
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    if (req.params.id === req.userId) {
      return res.status(400).json({ error: 'Use profile settings to change your own account' });
    }
    const data = updateUserSchema.parse(req.body);
    const updateData = {};
    if (data.email !== undefined) updateData.email = data.email;
    if (data.roleId !== undefined) {
      const role = await prisma.authRole.findUnique({ where: { id: data.roleId } });
      if (!role) return res.status(400).json({ error: 'Invalid role' });
      updateData.roleId = data.roleId;
    }
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: userSelect,
    });
    return res.json(user);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: e.errors });
    if (e.code === 'P2002') return res.status(400).json({ error: 'Email already exists' });
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (req.params.id === req.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
