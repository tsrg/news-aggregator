import { z } from 'zod';
import { Router } from 'express';
import { prisma } from '../../config/prisma.js';
import { requireAuth, requireAdmin } from '../auth/auth.middleware.js';

const router = Router();
router.use(requireAuth);
router.use(requireAdmin);

const menuSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  order: z.number().optional(),
});

const itemSchema = z.object({
  label: z.string().min(1),
  url: z.string().optional(),
  sectionId: z.string().optional(),
  order: z.number().optional(),
  parentId: z.string().optional().nullable(),
});

router.get('/', async (req, res) => {
  try {
    const list = await prisma.menu.findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { items: true } } },
    });
    return res.json(list);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const menu = await prisma.menu.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          where: { parentId: null },
          orderBy: { order: 'asc' },
          include: { children: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!menu) return res.status(404).json({ error: 'Not found' });
    return res.json(menu);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/items', async (req, res) => {
  try {
    const items = await prisma.menuItem.findMany({
      where: { menuId: req.params.id },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    return res.json(items);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = menuSchema.parse(req.body);
    const menu = await prisma.menu.create({ data });
    return res.status(201).json(menu);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: e.errors });
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/items', async (req, res) => {
  try {
    const data = itemSchema.parse(req.body);
    const item = await prisma.menuItem.create({
      data: { ...data, menuId: req.params.id, parentId: data.parentId || undefined },
    });
    return res.status(201).json(item);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: e.errors });
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:menuId/items/:itemId', async (req, res) => {
  try {
    const data = itemSchema.partial().parse(req.body);
    const item = await prisma.menuItem.update({
      where: { id: req.params.itemId },
      data: { ...data, parentId: data.parentId === null ? null : data.parentId },
    });
    return res.json(item);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: e.errors });
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:menuId/items/:itemId', async (req, res) => {
  try {
    await prisma.menuItem.delete({ where: { id: req.params.itemId } }).catch(() => null);
    return res.status(204).send();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const data = menuSchema.partial().parse(req.body);
    const menu = await prisma.menu.update({ where: { id: req.params.id }, data });
    return res.json(menu);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: e.errors });
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.menu.delete({ where: { id: req.params.id } }).catch(() => null);
    return res.status(204).send();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
