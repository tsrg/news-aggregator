import { z } from 'zod';
import { Router } from 'express';
import { prisma } from '../../config/prisma.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { enrichNewsItem, parseArticle } from '../../services/articleParser.js';
import { articleQueue } from '../../jobs/queue.js';
import { runDuplicateMergeBatch } from '../../services/newsMerge.js';
import { normalizeTitleForIndex } from '../../services/titleNormalize.js';
import { rewriteStorageUrlForBrowser } from '../../services/s3.js';
import { runLegalComplianceChecks } from '../../services/legalCompliance.js';
import { sanitizeNewsStrings } from '../../utils/newsInputSanitize.js';
import { onPromotionalNewsChange } from '../../services/ord.js';

const router = Router();

function withPublicImageUrl(item) {
  if (!item || typeof item !== 'object') return item;
  const o = { ...item };
  if (o.imageUrl) o.imageUrl = rewriteStorageUrlForBrowser(o.imageUrl);
  return o;
}
router.use(requireAuth);
router.use(requirePermission('news'));

/** Пустая строка из HTML-select ломает FK в Prisma — приводим к null */
const optionalSectionId = z
  .union([z.string().min(1), z.literal(''), z.null()])
  .optional()
  .transform((val) => (val === '' ? null : val));

const createSchema = z.object({
  sourceId: z.string().optional(),
  title: z.string().min(1),
  summary: z.string().optional(),
  body: z.string().optional(),
  url: z.string().optional(),
  imageUrl: z.string().optional(),
  region: z.string().optional(),
  sectionId: optionalSectionId,
  contentClass: z.enum(['NEWS', 'REPORT', 'ANALYSIS', 'OPINION', 'UNKNOWN']).optional(),
  /** Дата/время публикации в оригинальном источнике (ISO-строка или null для сброса) */
  sourcePublishedAt: z.preprocess(
    (v) => (v === '' ? null : v),
    z
      .union([
        z.null(),
        z.coerce.date().refine((d) => !Number.isNaN(d.getTime()), {
          message: 'Некорректная дата публикации в источнике',
        }),
      ])
      .optional(),
  ),
  isPromotional: z.boolean().optional(),
  promoErid: z.union([z.string(), z.null()]).optional(),
  promoAdvertiserName: z.union([z.string(), z.null()]).optional(),
  promoAdvertiserInn: z.union([z.string(), z.null()]).optional(),
  promoAdvertiserOgrn: z.union([z.string(), z.null()]).optional(),
});

const updateSchema = createSchema.partial().merge(
  z.object({
    legalReviewStatus: z
      .enum(['NOT_REQUIRED', 'PENDING', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED'])
      .optional(),
    legalReviewNotes: z.union([z.string(), z.null()]).optional(),
  }),
);

function normText(s) {
  if (s == null) return '';
  return String(s).trim();
}

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
    const { status, sectionId, region, contentClass, legalReviewStatus, page = '1', limit = '20', sort } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const where = { mergedIntoId: null };
    if (status) where.status = status;
    if (sectionId) where.sectionId = sectionId;
    if (region) where.region = region;
    if (contentClass) where.contentClass = contentClass;
    if (legalReviewStatus) where.legalReviewStatus = legalReviewStatus;

    let orderBy;
    if (sort === 'createdAt') {
      orderBy = { createdAt: 'desc' };
    } else {
      // По умолчанию и sort=sourcePublishedAt: дата в источнике (без даты — в конце), затем по созданию в системе
      orderBy = [
        { sourcePublishedAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.newsItem.findMany({
        where,
        include: { section: true, source: true },
        orderBy,
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

router.post('/merge-duplicates', async (req, res) => {
  try {
    const result = await runDuplicateMergeBatch();
    if (!result.ok) {
      if (result.code === 'disabled') {
        return res.status(400).json({
          error: 'Включите «Объединение дубликатов из разных источников» в Настройки → Основные.',
          code: 'disabled',
        });
      }
      if (result.code === 'no_ai_key') {
        return res.status(400).json({
          error: 'Укажите API-ключ в Настройки → Настройки AI.',
          code: 'no_ai_key',
        });
      }
      return res.status(400).json({ error: 'Невозможно запустить объединение', code: result.code });
    }
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await prisma.newsItem.findUnique({
      where: { id: req.params.id },
      include: {
        section: true,
        source: true,
        mergedInto: { include: { source: true, section: true } },
      },
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    return res.json(withPublicImageUrl(item));
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
    const data = sanitizeNewsStrings(createSchema.parse(req.body));
    let sourceId = data.sourceId;
    if (!sourceId) {
      const draft = await prisma.source.findFirst({ where: { name: 'Ручной ввод' } });
      if (!draft) return res.status(400).json({ error: 'No draft source. Run seed.' });
      sourceId = draft.id;
    }
    const item = await prisma.newsItem.create({
      data: {
        ...data,
        sourceId,
        externalId: data.externalId || undefined,
        titleNormalized: normalizeTitleForIndex(data.title),
        legalReviewStatus: 'PENDING',
      },
      include: { section: true, source: true },
    });
    await prisma.newsItemHistory.create({
      data: { newsItemId: item.id, userId: req.userId, snapshot: snapshot(item) },
    });
    if (item.isPromotional) {
      try {
        await onPromotionalNewsChange(item, 'create');
      } catch (e) {
        console.warn('ORD stub (promo news):', e.message);
      }
    }
    return res.status(201).json(withPublicImageUrl(item));
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: e.errors });
    console.error(e);
    if (e.code === 'P2003') {
      return res.status(400).json({
        error: 'Указан несуществующий раздел или нарушена связь с источником.',
        code: e.code,
      });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await prisma.newsItem.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const data = sanitizeNewsStrings(updateSchema.parse(req.body));
    const {
      legalReviewStatus: incomingLegal,
      legalReviewNotes: incomingNotes,
      ...rest
    } = data;
    const patch = { ...rest };
    if (patch.title !== undefined) {
      patch.titleNormalized = normalizeTitleForIndex(patch.title);
    }
    const contentChanged =
      (patch.title !== undefined && normText(patch.title) !== normText(existing.title)) ||
      (patch.summary !== undefined && normText(patch.summary) !== normText(existing.summary ?? '')) ||
      (patch.body !== undefined && normText(patch.body) !== normText(existing.body ?? ''));
    if (contentChanged) {
      patch.legalReviewStatus = 'PENDING';
      patch.legalReviewNotes = null;
    } else {
      if (incomingLegal !== undefined) patch.legalReviewStatus = incomingLegal;
      if (incomingNotes !== undefined) patch.legalReviewNotes = incomingNotes;
    }
    const item = await prisma.newsItem.update({
      where: { id: req.params.id },
      data: patch,
      include: { section: true, source: true },
    });
    await prisma.newsItemHistory.create({
      data: { newsItemId: item.id, userId: req.userId, snapshot: snapshot(item) },
    });
    if (item.isPromotional) {
      try {
        await onPromotionalNewsChange(item, 'update');
      } catch (e) {
        console.warn('ORD stub (promo news):', e.message);
      }
    }
    if (item.status === 'PUBLISHED') {
      try {
        const { broadcastNewsUpdated } = await import('../../ws.js');
        broadcastNewsUpdated(item);
      } catch (e) {
        console.warn('WebSocket broadcast:', e.message);
      }
    }
    return res.json(withPublicImageUrl(item));
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: e.errors });
    console.error('[news PUT]', e);
    if (e.code === 'P2003') {
      return res.status(400).json({
        error: 'Указан несуществующий раздел или нарушена связь с источником. Выберите раздел заново.',
        code: e.code,
      });
    }
    if (process.env.NODE_ENV !== 'production') {
      return res.status(500).json({
        error: e.message || 'Internal server error',
        code: e.code,
      });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['PENDING', 'PUBLISHED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const existing = await prisma.newsItem.findUnique({
      where: { id: req.params.id },
      include: { source: { include: { usageRule: true } } },
    });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    if (status === 'PUBLISHED') {
      const snapshots = Array.isArray(existing.sourceSnapshots)
        ? existing.sourceSnapshots
        : [{
            sourceId: existing.sourceId,
            sourceName: existing.source?.name || 'Источник',
            url: existing.url || null,
          }];
      const sourceIds = snapshots
        .map((s) => (s && typeof s.sourceId === 'string' ? s.sourceId : null))
        .filter(Boolean);
      const sources = sourceIds.length
        ? await prisma.source.findMany({
            where: { id: { in: sourceIds } },
            select: { id: true, usageRule: true },
          })
        : [];
      const ruleById = new Map(sources.map((s) => [s.id, s.usageRule]));
      const rules = sourceIds.map((id) => ruleById.get(id)).filter(Boolean);
      const legal = runLegalComplianceChecks({
        title: existing.title,
        summary: existing.summary || '',
        body: existing.body || '',
        sourceSnapshots: snapshots,
        sourceRules: rules,
        declaredContentClass: existing.contentClass,
      });
      if (legal.legalReviewStatus === 'REJECTED') {
        return res.status(400).json({ error: legal.legalReviewNotes || 'Публикация запрещена legal-правилами.' });
      }
      if (legal.legalReviewStatus === 'NEEDS_REVIEW') {
        const patched = await prisma.newsItem.update({
          where: { id: req.params.id },
          data: {
            legalReviewStatus: 'NEEDS_REVIEW',
            legalReviewNotes: legal.legalReviewNotes,
            contentClass: legal.contentClass,
          },
        });
        return res.status(400).json({
          error: patched.legalReviewNotes || 'Требуется ручная юридическая проверка перед публикацией.',
          code: 'needs_review',
        });
      }
    }

    const item = await prisma.newsItem.update({
      where: { id: req.params.id },
      data: {
        status,
        ...(status === 'PUBLISHED' ? { publishedAt: new Date() } : {}),
        ...(status === 'PUBLISHED' ? { legalReviewStatus: 'APPROVED' } : {}),
      },
      include: { section: true, source: true },
    });
    await prisma.newsItemHistory.create({
      data: { newsItemId: item.id, userId: req.userId, snapshot: snapshot(item) },
    });
    if (status === 'PUBLISHED') {
      try {
        const { broadcastNewsPublished } = await import('../../ws.js');
        broadcastNewsPublished(item);
      } catch (e) {
        console.warn('WebSocket broadcast:', e.message);
      }
    }
    return res.json(withPublicImageUrl(item));
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
      if (updated?.status === 'PUBLISHED') {
        try {
          const { broadcastNewsUpdated } = await import('../../ws.js');
          broadcastNewsUpdated(updated);
        } catch (e) {
          console.warn('WebSocket broadcast:', e.message);
        }
      }
      return res.json({ message: 'Parsing completed', item: withPublicImageUrl(updated) });
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
