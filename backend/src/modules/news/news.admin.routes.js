import { z } from 'zod';
import { Router } from 'express';
import { prisma } from '../../config/prisma.js';
import { requireAuth, requireEditorOrAdmin } from '../auth/auth.middleware.js';
import { enrichNewsItem, parseArticle } from '../../services/articleParser.js';
import { articleQueue } from '../../jobs/queue.js';

const router = Router();
router.use(requireAuth);
router.use(requireEditorOrAdmin);

const createSchema = z.object({
  sourceId: z.string().optional(),
  title: z.string().min(1),
  summary: z.string().optional(),
  body: z.string().optional(),
  url: z.string().optional(),
  imageUrl: z.string().optional(),
  region: z.string().optional(),
  sectionId: z.string().optional(),
});

const updateSchema = createSchema.partial();

function snapshot(item) {
  return {
    title: item.title,
    summary: item.summary,
    body: item.body,
    status: item.status,
    sectionId: item.sectionId,
  };
}

router.get('/', async (req, res) => {
  try {
    const { status, sectionId, region, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const where = {};
    if (status) where.status = status;
    if (sectionId) where.sectionId = sectionId;
    if (region) where.region = region;
    const [items, total] = await Promise.all([
      prisma.newsItem.findMany({
        where,
        include: { section: true, source: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(parseInt(limit, 10) || 20, 100),
      }),
      prisma.newsItem.count({ where }),
    ]);
    return res.json({ items, total });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await prisma.newsItem.findUnique({
      where: { id: req.params.id },
      include: { section: true, source: true },
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    return res.json(item);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/history', async (req, res) => {
  try {
    const list = await prisma.newsItemHistory.findMany({
      where: { newsItemId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(list);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = createSchema.parse(req.body);
    let sourceId = data.sourceId;
    if (!sourceId) {
      const draft = await prisma.source.findFirst({ where: { name: 'Ручной ввод' } });
      if (!draft) return res.status(400).json({ error: 'No draft source. Run seed.' });
      sourceId = draft.id;
    }
    const item = await prisma.newsItem.create({
      data: { ...data, sourceId, externalId: data.externalId || undefined },
      include: { section: true, source: true },
    });
    await prisma.newsItemHistory.create({
      data: { newsItemId: item.id, userId: req.userId, snapshot: snapshot(item) },
    });
    return res.status(201).json(item);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: e.errors });
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await prisma.newsItem.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const data = updateSchema.parse(req.body);
    const item = await prisma.newsItem.update({
      where: { id: req.params.id },
      data,
      include: { section: true, source: true },
    });
    await prisma.newsItemHistory.create({
      data: { newsItemId: item.id, userId: req.userId, snapshot: snapshot(item) },
    });
    return res.json(item);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: e.errors });
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['PENDING', 'PUBLISHED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const item = await prisma.newsItem.update({
      where: { id: req.params.id },
      data: {
        status,
        ...(status === 'PUBLISHED' ? { publishedAt: new Date() } : {}),
      },
      include: { section: true, source: true },
    });
    await prisma.newsItemHistory.create({
      data: { newsItemId: item.id, userId: req.userId, snapshot: snapshot(item) },
    });
    return res.json(item);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.newsItem.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await prisma.newsItem.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Парсинг полного текста новости по URL
router.post('/:id/parse-body', async (req, res) => {
  try {
    const item = await prisma.newsItem.findUnique({
      where: { id: req.params.id },
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    if (!item.url) return res.status(400).json({ error: 'News item has no URL' });

    // Запускаем парсинг асинхронно через очередь
    if (articleQueue) {
      const job = await articleQueue.add('parse-article', {
        newsItemId: item.id,
        url: item.url,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
      return res.json({ message: 'Parsing queued', jobId: job.id });
    }

    // Если очередь недоступна, парсим синхронно
    const result = await enrichNewsItem(item.id, item.url);
    if (result.success) {
      const updated = await prisma.newsItem.findUnique({
        where: { id: req.params.id },
        include: { section: true, source: true },
      });
      return res.json({ message: 'Parsing completed', item: updated });
    } else {
      return res.status(500).json({ error: 'Parsing failed', detail: result.error });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Тестирование парсера на произвольном URL
router.post('/parse-test', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const result = await parseArticle(url);
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
