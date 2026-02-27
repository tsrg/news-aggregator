import { Router } from 'express';
import { prisma } from '../../config/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { region, noRegion, section, dateFrom, dateTo, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const where = { status: 'PUBLISHED' };
    if (noRegion) {
      where.OR = [{ region: null }, { region: '' }];
    } else if (region) {
      where.region = region;
    }
    if (section) where.sectionId = section;
    if (dateFrom || dateTo) {
      where.publishedAt = {};
      if (dateFrom) where.publishedAt.gte = new Date(dateFrom);
      if (dateTo) where.publishedAt.lte = new Date(dateTo);
    }
    const [items, total] = await Promise.all([
      prisma.newsItem.findMany({
        where,
        include: { section: true, source: { select: { name: true } } },
        orderBy: { publishedAt: 'desc' },
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
    const id = req.params.id;
    const item = await prisma.newsItem.findFirst({
      where: { status: 'PUBLISHED', OR: [{ id }, { externalId: id }] },
      include: { section: true, source: true },
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    return res.json(item);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
