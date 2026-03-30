import { prisma } from '../config/prisma.js';
import { getGeneralSettings, getAISettings } from './settings.js';
import { synthesizeMergedNewsFromSources, combineSourceUsageRules } from './ai.js';
import { normalizeTitleForIndex } from './titleNormalize.js';
import { runLegalComplianceChecks } from './legalCompliance.js';

/** Окно поиска «того же события» по времени создания записи */
const MERGE_TIME_WINDOW_MS = 72 * 60 * 60 * 1000;
/** Порог похожести заголовков (Jaccard по словам) */
const TITLE_SIMILARITY_THRESHOLD = 0.72;
/** Нижний порог pg_trgm similarity перед финальным Jaccard */
const TRIGRAM_MIN_SIMILARITY = 0.28;
const TRIGRAM_CANDIDATE_LIMIT = 25;

function tokenSet(title) {
  const words = normalizeTitleForIndex(title).split(' ').filter((w) => w.length > 2);
  return new Set(words);
}

export function titleSimilarity(a, b) {
  const A = tokenSet(a);
  const B = tokenSet(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const x of A) {
    if (B.has(x)) inter += 1;
  }
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

function regionMatches(a, b) {
  const ra = (a ?? '').trim();
  const rb = (b ?? '').trim();
  if (!ra && !rb) return true;
  return ra === rb;
}

function buildSnapshot(item, source) {
  return {
    sourceId: item.sourceId,
    sourceName: source?.name ?? 'Источник',
    url: item.url,
    originalTitle: item.title,
    summary: item.summary,
    body: item.body,
    imageUrl: item.imageUrl,
    sourcePublishedAt: item.sourcePublishedAt ? item.sourcePublishedAt.toISOString() : null,
    mergedAt: new Date().toISOString(),
  };
}

function mergeSnapshots(canonical, duplicate, canonicalSource, duplicateSource) {
  const prev = Array.isArray(canonical.sourceSnapshots) ? canonical.sourceSnapshots : [];
  const byId = new Map();
  for (const s of prev) {
    if (s && s.sourceId) byId.set(s.sourceId, s);
  }
  if (!byId.has(canonical.sourceId)) {
    byId.set(canonical.sourceId, buildSnapshot(canonical, canonicalSource));
  }
  byId.set(duplicate.sourceId, buildSnapshot(duplicate, duplicateSource));
  return Array.from(byId.values());
}

/**
 * Резервный полный перебор кандидатов (если pg_trgm недоступен или нормализованный заголовок пуст).
 */
async function findMergeCandidateLegacy(incoming) {
  const windowStart = new Date(incoming.createdAt.getTime() - MERGE_TIME_WINDOW_MS);

  const candidates = await prisma.newsItem.findMany({
    where: {
      id: { not: incoming.id },
      mergedIntoId: null,
      sourceId: { not: incoming.sourceId },
      createdAt: {
        lt: incoming.createdAt,
        gte: windowStart,
      },
    },
    include: { source: true },
  });

  let best = null;
  let bestScore = 0;
  for (const c of candidates) {
    if (!regionMatches(c.region, incoming.region)) continue;
    const score = titleSimilarity(c.title, incoming.title);
    if (score >= TITLE_SIMILARITY_THRESHOLD && score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

/**
 * Ищет более старую новость, в которую можно объединить текущую (incoming).
 */
export async function findMergeCandidate(incoming) {
  const windowStart = new Date(incoming.createdAt.getTime() - MERGE_TIME_WINDOW_MS);
  const norm = normalizeTitleForIndex(incoming.title);

  if (norm.length < 2) {
    return findMergeCandidateLegacy(incoming);
  }

  let rows;
  try {
    rows = await prisma.$queryRaw`
      SELECT ni.id AS id
      FROM news_items ni
      WHERE ni.merged_into_id IS NULL
        AND ni.source_id <> ${incoming.sourceId}
        AND ni.created_at < ${incoming.createdAt}
        AND ni.created_at >= ${windowStart}
        AND ni.title_normalized IS NOT NULL
        AND length(trim(ni.title_normalized)) > 0
        AND similarity(ni.title_normalized, ${norm}) > ${TRIGRAM_MIN_SIMILARITY}
      ORDER BY similarity(ni.title_normalized, ${norm}) DESC
      LIMIT ${TRIGRAM_CANDIDATE_LIMIT}
    `;
  } catch (e) {
    console.warn('[newsMerge] trigram query failed, falling back:', e.message);
    return findMergeCandidateLegacy(incoming);
  }

  const ids = rows.map((r) => r.id);
  if (ids.length === 0) {
    return findMergeCandidateLegacy(incoming);
  }

  const candidates = await prisma.newsItem.findMany({
    where: { id: { in: ids }, mergedIntoId: null },
    include: { source: true },
  });
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

  let best = null;
  let bestScore = 0;
  for (const c of ordered) {
    if (!regionMatches(c.region, incoming.region)) continue;
    const score = titleSimilarity(c.title, incoming.title);
    if (score >= TITLE_SIMILARITY_THRESHOLD && score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  if (!best) {
    return findMergeCandidateLegacy(incoming);
  }
  return best;
}

/**
 * После успешного enrich: при включённой настройке и валидном ИИ — объединить с более старой дубликат-новостью.
 */
export async function maybeMergeNewsItem(newsItemId) {
  const general = await getGeneralSettings();
  if (!general.mergeDuplicateNews) {
    return { merged: false, reason: 'disabled' };
  }

  const ai = await getAISettings();
  if (!ai?.apiKey) {
    console.warn('[newsMerge] mergeDuplicateNews включён, но API Key не настроен — пропуск слияния');
    return { merged: false, reason: 'no_ai_key' };
  }

  const incoming = await prisma.newsItem.findUnique({
    where: { id: newsItemId },
    include: { source: true },
  });

  if (!incoming || incoming.mergedIntoId) {
    return { merged: false, reason: 'skip_item' };
  }
  if (!incoming.body || incoming.body.length < 80) {
    return { merged: false, reason: 'thin_body' };
  }

  const canonical = await findMergeCandidate(incoming);
  if (!canonical) {
    return { merged: false, reason: 'no_candidate' };
  }

  const canonicalFull = await prisma.newsItem.findUnique({
    where: { id: canonical.id },
    include: { source: true },
  });

  if (!canonicalFull || canonicalFull.mergedIntoId) {
    return { merged: false, reason: 'canonical_changed' };
  }

  const snapshots = mergeSnapshots(canonicalFull, incoming, canonicalFull.source, incoming.source);
  const sourceIds = Array.from(
    new Set(
      snapshots
        .map((s) => (s && typeof s.sourceId === 'string' ? s.sourceId : null))
        .filter(Boolean),
    ),
  );
  const sourcesWithRules = sourceIds.length > 0
    ? await prisma.source.findMany({
        where: { id: { in: sourceIds } },
        select: { id: true, usageRule: true, name: true },
      })
    : [];
  const usageRules = sourcesWithRules.map((s) => s.usageRule).filter(Boolean);
  const combinedRule = combineSourceUsageRules(usageRules);
  if (!combinedRule.allowMerge) {
    return { merged: false, reason: 'rules_conflict' };
  }

  let synthesized;
  try {
    synthesized = await synthesizeMergedNewsFromSources(
      { sources: snapshots },
      { sourceRules: usageRules },
    );
  } catch (e) {
    console.error('[newsMerge] AI synthesis failed:', e.message);
    if (e.message === 'Merge is forbidden by source usage rules') {
      return { merged: false, reason: 'rules_conflict' };
    }
    return { merged: false, reason: 'ai_error', error: e.message };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.newsItem.findUnique({
        where: { id: incoming.id },
        select: { id: true, mergedIntoId: true },
      });
      if (!fresh || fresh.mergedIntoId) {
        throw new Error('aborted');
      }

      const canonCheck = await tx.newsItem.findUnique({
        where: { id: canonicalFull.id },
        select: { id: true, mergedIntoId: true },
      });
      if (!canonCheck || canonCheck.mergedIntoId) {
        throw new Error('aborted');
      }

      await tx.newsItem.update({
        where: { id: canonicalFull.id },
        data: {
          title: synthesized.title,
          body: synthesized.body,
          summary: synthesized.summary || synthesized.title.slice(0, 280),
          sourceSnapshots: snapshots,
          confirmedFacts: Array.isArray(synthesized.confirmedFacts) ? synthesized.confirmedFacts : undefined,
          differences: Array.isArray(synthesized.differences) ? synthesized.differences : undefined,
          titleNormalized: normalizeTitleForIndex(synthesized.title),
          contentClass: synthesized.contentClass || 'UNKNOWN',
        },
      });

      await tx.newsItem.update({
        where: { id: incoming.id },
        data: {
          mergedIntoId: canonicalFull.id,
          status: 'MERGED',
        },
      });
    });
  } catch (e) {
    if (e.message === 'aborted') {
      return { merged: false, reason: 'race' };
    }
    throw e;
  }

  const legal = runLegalComplianceChecks({
    title: synthesized.title,
    summary: synthesized.summary || '',
    body: synthesized.body || '',
    sourceSnapshots: snapshots,
    sourceRules: usageRules,
    declaredContentClass: synthesized.contentClass || 'UNKNOWN',
  });
  await prisma.newsItem.update({
    where: { id: canonicalFull.id },
    data: {
      legalReviewStatus: legal.legalReviewStatus,
      legalReviewNotes: legal.legalReviewNotes,
      contentClass: legal.contentClass,
    },
  });

  const sim = titleSimilarity(canonicalFull.title, incoming.title);
  console.log(`[newsMerge] merged ${incoming.id} into ${canonicalFull.id}`);
  return {
    merged: true,
    canonicalId: canonicalFull.id,
    duplicateId: incoming.id,
    canonicalTitle: canonicalFull.title,
    duplicateTitle: incoming.title,
    similarity: sim,
  };
}

const SKIPPED_SAMPLE_LIMIT = 50;

/**
 * Пакетный запуск слияния дубликатов (для админки). Требует mergeDuplicateNews и API-ключ ИИ.
 */
export async function runDuplicateMergeBatch() {
  const general = await getGeneralSettings();
  if (!general.mergeDuplicateNews) {
    return { ok: false, code: 'disabled' };
  }

  const ai = await getAISettings();
  if (!ai?.apiKey) {
    return { ok: false, code: 'no_ai_key' };
  }

  const started = Date.now();
  const rows = await prisma.newsItem.findMany({
    where: {
      mergedIntoId: null,
      status: { not: 'MERGED' },
      body: { not: null },
    },
    include: { source: true },
    orderBy: { createdAt: 'desc' },
  });

  const eligible = rows.filter((r) => String(r.body || '').length >= 80);

  const merged = [];
  const skippedByReason = {};
  const skippedSamples = [];
  const errors = [];

  function bumpReason(reason) {
    skippedByReason[reason] = (skippedByReason[reason] || 0) + 1;
  }

  function pushSample(id, title, reason) {
    if (skippedSamples.length >= SKIPPED_SAMPLE_LIMIT) return;
    skippedSamples.push({ id, title, reason });
  }

  for (const row of eligible) {
    try {
      const r = await maybeMergeNewsItem(row.id);
      if (r.merged) {
        merged.push({
          duplicateId: r.duplicateId,
          canonicalId: r.canonicalId,
          duplicateTitle: r.duplicateTitle,
          canonicalTitle: r.canonicalTitle,
          similarity: r.similarity,
        });
      } else {
        const reason = r.reason || 'unknown';
        bumpReason(reason);
        pushSample(row.id, row.title, reason);
      }
    } catch (e) {
      bumpReason('exception');
      errors.push({ id: row.id, message: e.message || String(e), phase: 'exception' });
      pushSample(row.id, row.title, 'exception');
    }
  }

  return {
    ok: true,
    durationMs: Date.now() - started,
    processedCount: eligible.length,
    merged,
    skippedByReason,
    skippedSamples,
    errors,
  };
}
