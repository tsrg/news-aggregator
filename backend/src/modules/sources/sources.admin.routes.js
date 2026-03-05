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

const filterSchema = z.object({
  type: z.enum(['INCLUDE', 'EXCLUDE']),
  field: z.enum(['title', 'content', 'category', 'author']),
  operator: z.enum(['contains', 'not_contains', 'equals', 'starts_with', 'ends_with', 'regex']),
  value: z.string().min(1),
  isActive: z.boolean().optional(),
});

router.get('/', async (req, res) => {
  try {
    const list = await prisma.source.findMany({
      orderBy: { createdAt: 'desc' },
      include: { filters: { where: { isActive: true } } },
    });
    return res.json(list);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const s = await prisma.source.findUnique({
      where: { id: req.params.id },
      include: { filters: true },
    });
    if (!s) return res.status(404).json({ error: 'Not found' });
    return res.json(s);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { filters, ...sourceData } = req.body;
    const data = sourceSchema.parse(sourceData);

    const s = await prisma.source.create({
      data: {
        ...data,
        type: 'rss',
        filters: filters && Array.isArray(filters)
          ? { create: filters.map(f => filterSchema.parse(f)) }
          : undefined,
      },
      include: { filters: true },
    });
    return res.status(201).json(s);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: e.errors });
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { filters, ...sourceData } = req.body;
    const data = sourceSchema.partial().parse(sourceData);

    // Обновляем источник
    const s = await prisma.source.update({
      where: { id: req.params.id },
      data: { ...data },
      include: { filters: true },
    });

    // Если переданы фильтры - обновляем их отдельно
    if (filters && Array.isArray(filters)) {
      // Удаляем существующие фильтры
      await prisma.sourceFilter.deleteMany({
        where: { sourceId: req.params.id },
      });

      // Создаём новые фильтры
      for (const f of filters) {
        const filterData = filterSchema.parse(f);
        await prisma.sourceFilter.create({
          data: { ...filterData, sourceId: req.params.id },
        });
      }

      // Получаем обновлённый источник с фильтрами
      const updated = await prisma.source.findUnique({
        where: { id: req.params.id },
        include: { filters: true },
      });
      return res.json(updated);
    }

    return res.json(s);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: e.errors });
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/fetch', async (req, res) => {
  try {
    const source = await prisma.source.findUnique({
      where: { id: req.params.id },
      include: { filters: true },
    });
    if (!source) return res.status(404).json({ error: 'Not found' });
    await fetchSource(source.id);
    const updated = await prisma.source.findUnique({
      where: { id: req.params.id },
      include: { filters: true },
    });
    return res.json(updated);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Fetch failed', detail: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.source.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await prisma.source.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
