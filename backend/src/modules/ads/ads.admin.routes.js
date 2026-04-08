import { z } from 'zod';
import { Router } from 'express';
import { prisma } from '../../config/prisma.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { getAdMarkingDefaults, updateSettings, AD_MARKING_SETTINGS_KEY } from '../../services/settings.js';
import { onAdCreativeChange } from '../../services/ord.js';
import { rewriteStorageUrlForBrowser } from '../../services/s3.js';
import { sendPrismaClientError } from '../../utils/prismaClientError.js';

const router = Router();
router.use(requireAuth);
router.use(requirePermission('ads'));

const markingPutSchema = z.object({
  advertiserName: z.string().optional(),
  advertiserInn: z.string().optional(),
  advertiserOgrn: z.string().optional(),
  distributorNote: z.string().optional(),
});

const optionalDate = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : v),
  z.union([z.null(), z.coerce.date()]).optional(),
);

const creativeBaseSchema = z.object({
  placementId: z.string().min(1),
  sortOrder: z.number().int().optional(),
  type: z.enum(['BANNER', 'YANDEX_RTB']),
  isActive: z.boolean().optional(),
  validFrom: optionalDate,
  validTo: optionalDate,
  imageUrl: z.string().optional().nullable(),
  targetUrl: z.string().optional().nullable(),
  openInNewTab: z.boolean().optional(),
  altText: z.string().optional().nullable(),
  yandexConfig: z.any().optional().nullable(),
  erid: z.string().optional().nullable(),
  advertiserName: z.string().optional().nullable(),
  advertiserInn: z.string().optional().nullable(),
  advertiserOgrn: z.string().optional().nullable(),
});

const creativeCreateSchema = creativeBaseSchema;

const creativeUpdateSchema = creativeBaseSchema.partial();

function withCreativeImageUrl(item) {
  if (!item || typeof item !== 'object') return item;
  const o = { ...item };
  if (o.imageUrl) o.imageUrl = rewriteStorageUrlForBrowser(o.imageUrl);
  return o;
}

router.get('/marking', async (req, res) => {
  try {
    const settings = await getAdMarkingDefaults();
    return res.json(settings);
  } catch (e) {
    return sendPrismaClientError(res, e, 'ads/marking GET');
  }
});

router.put('/marking', async (req, res) => {
  try {
    const parsed = markingPutSchema.parse(req.body);
    const current = await getAdMarkingDefaults();
    await updateSettings(AD_MARKING_SETTINGS_KEY, { ...current, ...parsed });
    const updated = await getAdMarkingDefaults();
    return res.json(updated);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: e.errors });
    return sendPrismaClientError(res, e, 'ads/marking PUT');
  }
});

router.get('/placements', async (req, res) => {
  try {
    const list = await prisma.adPlacement.findMany({
      orderBy: { code: 'asc' },
      include: {
        _count: { select: { creatives: true } },
      },
    });
    return res.json(list);
  } catch (e) {
    return sendPrismaClientError(res, e, 'ads/placements GET');
  }
});

router.patch('/placements/:id', async (req, res) => {
  try {
    const schema = z.object({
      title: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
    });
    const data = schema.parse(req.body);
    const item = await prisma.adPlacement.update({
      where: { id: req.params.id },
      data,
    });
    return res.json(item);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: e.errors });
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    return sendPrismaClientError(res, e, 'ads/placements PATCH');
  }
});

router.get('/creatives', async (req, res) => {
  try {
    const placementId = typeof req.query.placementId === 'string' ? req.query.placementId : undefined;
    const where = placementId ? { placementId } : {};
    const list = await prisma.adCreative.findMany({
      where,
      orderBy: [{ placementId: 'asc' }, { sortOrder: 'asc' }],
      include: { placement: true },
    });
    return res.json(list.map(withCreativeImageUrl));
  } catch (e) {
    return sendPrismaClientError(res, e, 'ads/creatives GET');
  }
});

router.post('/creatives', async (req, res) => {
  try {
    const data = creativeCreateSchema.parse(req.body);
    const placement = await prisma.adPlacement.findUnique({ where: { id: data.placementId } });
    if (!placement) return res.status(400).json({ error: 'Unknown placement' });

    const yandexConfig =
      data.type === 'YANDEX_RTB'
        ? data.yandexConfig && typeof data.yandexConfig === 'object'
          ? data.yandexConfig
          : {}
        : null;

    const createData = {
      placementId: data.placementId,
      sortOrder: data.sortOrder ?? 0,
      type: data.type,
      isActive: data.isActive ?? true,
      validFrom: data.validFrom ?? null,
      validTo: data.validTo ?? null,
      imageUrl: data.imageUrl ?? null,
      targetUrl: data.targetUrl ?? null,
      openInNewTab: data.openInNewTab ?? true,
      altText: data.altText ?? null,
      yandexConfig,
      erid: data.erid ?? null,
      advertiserName: data.advertiserName ?? null,
      advertiserInn: data.advertiserInn ?? null,
      advertiserOgrn: data.advertiserOgrn ?? null,
    };

    const creative = await prisma.adCreative.create({
      data: createData,
      include: { placement: true },
    });
    await onAdCreativeChange(creative, 'create');
    return res.status(201).json(withCreativeImageUrl(creative));
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: e.errors });
    return sendPrismaClientError(res, e, 'ads/creatives POST');
  }
});

router.put('/creatives/:id', async (req, res) => {
  try {
    const data = creativeUpdateSchema.parse(req.body);
    const existing = await prisma.adCreative.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const patch = {};
    for (const k of [
      'placementId',
      'sortOrder',
      'type',
      'isActive',
      'validFrom',
      'validTo',
      'imageUrl',
      'targetUrl',
      'openInNewTab',
      'altText',
      'yandexConfig',
      'erid',
      'advertiserName',
      'advertiserInn',
      'advertiserOgrn',
    ]) {
      if (data[k] !== undefined) patch[k] = data[k];
    }

    if (patch.placementId) {
      const placement = await prisma.adPlacement.findUnique({ where: { id: patch.placementId } });
      if (!placement) return res.status(400).json({ error: 'Unknown placement' });
    }

    if (patch.type === 'BANNER' && patch.yandexConfig === undefined) {
      patch.yandexConfig = null;
    } else if (patch.type === 'YANDEX_RTB' && patch.yandexConfig === undefined && existing.type === 'BANNER') {
      patch.yandexConfig = {};
    }
    if (
      patch.yandexConfig != null &&
      patch.yandexConfig !== undefined &&
      typeof patch.yandexConfig !== 'object'
    ) {
      return res.status(400).json({ error: 'yandexConfig must be an object' });
    }

    const creative = await prisma.adCreative.update({
      where: { id: req.params.id },
      data: patch,
      include: { placement: true },
    });
    await onAdCreativeChange(creative, 'update');
    return res.json(withCreativeImageUrl(creative));
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: e.errors });
    return sendPrismaClientError(res, e, 'ads/creatives PUT');
  }
});

router.delete('/creatives/:id', async (req, res) => {
  try {
    const existing = await prisma.adCreative.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await prisma.adCreative.delete({ where: { id: req.params.id } });
    await onAdCreativeChange(existing, 'delete');
    return res.json({ ok: true });
  } catch (e) {
    return sendPrismaClientError(res, e, 'ads/creatives DELETE');
  }
});

export default router;
