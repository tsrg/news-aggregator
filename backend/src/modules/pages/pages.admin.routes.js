import { z } from 'zod';
import { Router } from 'express';
import { prisma } from '../../config/prisma.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';

const router = Router();
router.use(requireAuth);
router.use(requirePermission('pages'));

const pageSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  body: z.string(),
  order: z.number().optional(),
  isVisible: z.boolean().optional(),
});

router.get('/', async (req, res) => {
  try {
    const list = await prisma.page.findMany({ orderBy: { order: 'asc' } });
    return res.json(list);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const page = await prisma.page.findFirst({
      where: { OR: [{ id: req.params.id }, { slug: req.params.id }] },
    });
    if (!page) return res.status(404).json({ error: 'Not found' });
    return res.json(page);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = pageSchema.parse(req.body);
    const page = await prisma.page.create({ data });
    return res.status(201).json(page);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: e.errors });
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const data = pageSchema.partial().parse(req.body);
    const page = await prisma.page.update({ where: { id: req.params.id }, data });
    return res.json(page);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: e.errors });
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.page.delete({ where: { id: req.params.id } }).catch(() => null);
    return res.status(204).send();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
