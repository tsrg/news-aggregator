import { z } from 'zod';
import { Router } from 'express';
import { prisma } from '../../config/prisma.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';

const router = Router();
router.use(requireAuth);
router.use(requirePermission('sections'));

const sectionSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  order: z.number().optional(),
  isVisible: z.boolean().optional(),
});

router.get('/', async (req, res) => {
  try {
    const list = await prisma.section.findMany({ orderBy: { order: 'asc' } });
    return res.json(list);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const s = await prisma.section.findUnique({ where: { id: req.params.id } });
    if (!s) return res.status(404).json({ error: 'Not found' });
    return res.json(s);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = sectionSchema.parse(req.body);
    const s = await prisma.section.create({ data });
    return res.status(201).json(s);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: e.errors });
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const data = sectionSchema.partial().parse(req.body);
    const s = await prisma.section.update({ where: { id: req.params.id }, data });
    return res.json(s);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: e.errors });
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.section.delete({ where: { id: req.params.id } }).catch(() => null);
    return res.status(204).send();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
