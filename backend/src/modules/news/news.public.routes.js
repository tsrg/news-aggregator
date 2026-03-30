import { Router } from 'express';
import { prisma } from '../../config/prisma.js';
import { rewriteStorageUrlForBrowser } from '../../services/s3.js';

const router = Router();

function withPublicImageUrl(item) {
  if (!item || typeof item !== 'object') return item;
  const o = { ...item };
  if (o.imageUrl) o.imageUrl = rewriteStorageUrlForBrowser(o.imageUrl);
  return o;
}

router.get('/', async (req, res) => {
  try {
    const { region, noRegion, section, dateFrom, dateTo, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const where = { status: 'PUBLISHED', mergedIntoId: null };
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
    return res.json({ items: items.map(withPublicImageUrl), total });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const raw = await prisma.newsItem.findFirst({
      where: { OR: [{ id }, { externalId: id }] },
      include: { section: true, source: true },
    });
    if (!raw) return res.status(404).json({ error: 'Not found' });
    const primaryId = raw.mergedIntoId ?? raw.id;
    const item = await prisma.newsItem.findFirst({
      where: { id: primaryId, status: 'PUBLISHED' },
      include: { section: true, source: true },
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    return res.json(withPublicImageUrl(item));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
