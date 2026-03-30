import { z } from 'zod';
import { Router } from 'express';
import { prisma } from '../../config/prisma.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { fetchSource } from '../../jobs/fetchRss.js';
import { generateSourceUsageRuleFromText } from '../../services/ai.js';

const router = Router();
router.use(requireAuth);
router.use(requirePermission('sources'));

const generateSourceRuleSchema = z.object({
  sourceRulesText: z.string().trim().min(10).max(12000),
});

const sourceSchema = z.object({
  type: z.enum(['rss', 'sitemap']).optional(),
  url: z.string().url(),
  name: z.string().min(1),
  params: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

const filterSchema = z.object({
  type: z.enum(['INCLUDE', 'EXCLUDE']),
  field: z.enum(['title', 'content', 'category', 'author', 'url']),
  operator: z.enum(['contains', 'not_contains', 'equals', 'starts_with', 'ends_with', 'regex']),
  value: z.string().min(1),
  isActive: z.boolean().optional(),
});

const sourceUsageRuleSchema = z.object({
  rewriteInstructions: z.string().trim().max(6000).optional().nullable(),
  quoteLimitPercent: z.number().int().min(0).max(100).optional(),
  requireAttribution: z.boolean().optional(),
  forbidVerbatimCopy: z.boolean().optional(),
  allowMerge: z.boolean().optional(),
  requiresDirectLinkAtTop: z.boolean().optional(),
  allowAnalyticalReuse: z.boolean().optional(),
  requiresManualApprovalForAnalytical: z.boolean().optional(),
  contentClassDefault: z.enum(['NEWS', 'REPORT', 'ANALYSIS', 'OPINION', 'UNKNOWN']).optional(),
  mergeNotes: z.string().trim().max(3000).optional().nullable(),
});

function buildUsageRulePayload(input = {}) {
  const payload = {};
  if (Object.prototype.hasOwnProperty.call(input, 'rewriteInstructions')) {
    payload.rewriteInstructions = input.rewriteInstructions || null;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'quoteLimitPercent')) {
    payload.quoteLimitPercent = input.quoteLimitPercent;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'requireAttribution')) {
    payload.requireAttribution = input.requireAttribution;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'forbidVerbatimCopy')) {
    payload.forbidVerbatimCopy = input.forbidVerbatimCopy;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'allowMerge')) {
    payload.allowMerge = input.allowMerge;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'requiresDirectLinkAtTop')) {
    payload.requiresDirectLinkAtTop = input.requiresDirectLinkAtTop;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'allowAnalyticalReuse')) {
    payload.allowAnalyticalReuse = input.allowAnalyticalReuse;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'requiresManualApprovalForAnalytical')) {
    payload.requiresManualApprovalForAnalytical = input.requiresManualApprovalForAnalytical;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'contentClassDefault')) {
    payload.contentClassDefault = input.contentClassDefault;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'mergeNotes')) {
    payload.mergeNotes = input.mergeNotes || null;
  }
  return payload;
}

router.get('/', async (req, res) => {
  try {
    const list = await prisma.source.findMany({
      orderBy: { createdAt: 'desc' },
      include: { filters: { where: { isActive: true } }, usageRule: true },
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
      include: { filters: true, usageRule: true },
    });
    if (!s) return res.status(404).json({ error: 'Not found' });
    return res.json(s);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/ai/generate-usage-rule', async (req, res) => {
  try {
    const { sourceRulesText } = generateSourceRuleSchema.parse(req.body || {});
    const usageRule = await generateSourceUsageRuleFromText(sourceRulesText);
    return res.json(usageRule);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: e.errors });
    console.error(e);
    return res.status(500).json({ error: e.message || 'AI error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { filters, usageRule, ...sourceData } = req.body;
    const data = sourceSchema.parse(sourceData);
    const ruleData = usageRule ? sourceUsageRuleSchema.parse(usageRule) : null;
    const usageRuleCreate = ruleData ? buildUsageRulePayload(ruleData) : null;

    const s = await prisma.source.create({
      data: {
        ...data,
        type: data.type || 'rss',
        filters: filters && Array.isArray(filters)
          ? { create: filters.map(f => filterSchema.parse(f)) }
          : undefined,
        usageRule: usageRuleCreate ? { create: usageRuleCreate } : undefined,
      },
      include: { filters: true, usageRule: true },
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
    const { filters, usageRule, ...sourceData } = req.body;
    const data = sourceSchema.partial().parse(sourceData);
    const ruleData = usageRule ? sourceUsageRuleSchema.parse(usageRule) : null;
    const usageRulePayload = ruleData ? buildUsageRulePayload(ruleData) : null;
    const existing = await prisma.source.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const existingParams = (existing.params && typeof existing.params === 'object') ? existing.params : {};
    const incomingParams = (data.params && typeof data.params === 'object') ? data.params : null;
    const updateData = { ...data };
    if (incomingParams) {
      updateData.params = {
        ...existingParams,
        ...incomingParams,
      };
    }

    // Обновляем источник
    const s = await prisma.source.update({
      where: { id: req.params.id },
      data: {
        ...updateData,
        ...(usageRulePayload
          ? {
              usageRule: {
                upsert: {
                  create: usageRulePayload,
                  update: usageRulePayload,
                },
              },
            }
          : {}),
      },
      include: { filters: true, usageRule: true },
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
        include: { filters: true, usageRule: true },
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
      include: { filters: true, usageRule: true },
    });
    if (!source) return res.status(404).json({ error: 'Not found' });
    await fetchSource(source.id);
    const updated = await prisma.source.findUnique({
      where: { id: req.params.id },
      include: { filters: true, usageRule: true },
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
