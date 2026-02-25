import { z } from 'zod';
import { Router } from 'express';
import { prisma } from '../../config/prisma.js';
import { requireAuth, requireAdmin } from '../auth/auth.middleware.js';
import { fetchSource } from '../../jobs/fetchRss.js';

const router = Router();
router.use(requireAuth);
router.use(requireAdmin);

const sourceSchema = z.object({
  type: z.literal('rss').optional(),
  url: z.string().url(),
  name: z.string().min(1),
  params: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

router.get('/', async (req, res) => {
  try {
    const list = await prisma.source.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json(list);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const s = await prisma.source.findUnique({ where: { id: req.params.id } });
    if (!s) return res.status(404).json({ error: 'Not found' });
    return res.json(s);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = sourceSchema.parse(req.body);
    const s = await prisma.source.create({ data: { ...data, type: 'rss' } });
    return res.status(201).json(s);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: e.errors });
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const data = sourceSchema.partial().parse(req.body);
    const s = await prisma.source.update({ where: { id: req.params.id }, data });
    return res.json(s);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: e.errors });
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/fetch', async (req, res) => {
  try {
    const source = await prisma.source.findUnique({ where: { id: req.params.id } });
    if (!source) return res.status(404).json({ error: 'Not found' });
    await fetchSource(source.id);
    const updated = await prisma.source.update({
      where: { id: req.params.id },
      data: { lastFetchedAt: new Date() },
    });
    return res.json(updated);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Fetch failed', detail: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.source.delete({ where: { id: req.params.id } }).catch(() => null);
    return res.status(204).send();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
