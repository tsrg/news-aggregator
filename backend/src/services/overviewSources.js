import axios from 'axios';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { getAISettings } from './settings.js';
import { normalizeTitleForIndex } from './titleNormalize.js';
import { titleSimilarity } from './newsMerge.js';

/** Окно по дате создания записи (±14 дней от центральной даты новости) */
const OVERVIEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
/** Ниже порога merge — чтобы подобрать «соседние» материалы по теме */
const OVERVIEW_TRIGRAM_MIN = 0.22;
/** Минимальная похожесть по словам (Jaccard), ниже чем у merge-дубликатов */
const OVERVIEW_JACCARD_MIN = 0.38;
const OVERVIEW_SQL_LIMIT = 45;
const OVERVIEW_MAX_ADDITIONAL_DB = 8;
const OVERVIEW_MAX_TAVILY = 4;

function regionMatches(a, b) {
  const ra = (a ?? '').trim();
  const rb = (b ?? '').trim();
  if (!ra && !rb) return true;
  return ra === rb;
}

function urlKey(u) {
  if (!u || typeof u !== 'string') return '';
  try {
    const x = new URL(u);
    return `${x.hostname}${x.pathname.replace(/\/$/, '')}`.toLowerCase();
  } catch {
    return String(u).trim().toLowerCase();
  }
}

function sourceAllowsMerge(rule) {
  if (!rule || typeof rule !== 'object') return true;
  return rule.allowMerge !== false;
}

function snapshotFromNewsItem(row, source) {
  return {
    sourceId: row.sourceId,
    sourceName: source?.name ?? 'Источник',
    url: row.url,
    originalTitle: row.title,
    summary: row.summary,
    body: row.body,
    imageUrl: row.imageUrl,
    sourcePublishedAt: row.sourcePublishedAt ? row.sourcePublishedAt.toISOString() : null,
    overviewEnrichedAt: new Date().toISOString(),
  };
}

/**
 * Собирает ключи уже учтённых источников (RSS-источник + URL).
 */
function collectExistingKeys(snapshots, item) {
  const sourceIds = new Set();
  const urls = new Set();
  if (item?.sourceId) sourceIds.add(item.sourceId);
  for (const s of snapshots || []) {
    if (s && typeof s.sourceId === 'string') sourceIds.add(s.sourceId);
    if (s && s.url) urls.add(urlKey(s.url));
  }
  return { sourceIds, urls };
}

/**
 * Ищет в БД другие новости по теме (другие источники, похожий заголовок).
 * @param {import('@prisma/client').NewsItem & { source?: import('@prisma/client').Source }} item
 * @param {Array<Record<string, unknown>>} baseSnapshots
 * @returns {Promise<Array<{ row: object, source: object, score: number }>>}
 */
async function findRelatedNewsFromDatabase(item, baseSnapshots) {
  const { sourceIds: existingSourceIds, urls: existingUrls } = collectExistingKeys(baseSnapshots, item);
  const norm = normalizeTitleForIndex(item.title);
  if (norm.length < 2) return [];

  const center = item.sourcePublishedAt || item.createdAt;
  const windowStart = new Date(center.getTime() - OVERVIEW_WINDOW_MS);
  const windowEnd = new Date(center.getTime() + OVERVIEW_WINDOW_MS);

  const excludeSources = Array.from(existingSourceIds);
  const excludeClause =
    excludeSources.length > 0
      ? Prisma.sql`AND ni.source_id NOT IN (${Prisma.join(excludeSources)})`
      : Prisma.empty;

  let rows;
  try {
    rows = await prisma.$queryRaw`
      SELECT ni.id AS id, similarity(ni.title_normalized, ${norm}) AS sim
      FROM news_items ni
      WHERE ni.id <> ${item.id}
        AND ni.merged_into_id IS NULL
        AND ni.status IN ('PENDING', 'PUBLISHED')
        AND ni.title_normalized IS NOT NULL
        AND length(trim(ni.title_normalized)) > 0
        AND similarity(ni.title_normalized, ${norm}) > ${OVERVIEW_TRIGRAM_MIN}
        ${excludeClause}
        AND ni.created_at >= ${windowStart}
        AND ni.created_at <= ${windowEnd}
      ORDER BY similarity(ni.title_normalized, ${norm}) DESC
      LIMIT ${OVERVIEW_SQL_LIMIT}
    `;
  } catch (e) {
    console.warn('[overviewSources] trigram query failed:', e.message);
    return [];
  }

  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return [];

  const candidates = await prisma.newsItem.findMany({
    where: { id: { in: ids }, mergedIntoId: null },
    include: { source: true },
  });
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

  const out = [];
  for (const row of ordered) {
    if (!regionMatches(row.region, item.region)) continue;
    const score = titleSimilarity(row.title, item.title);
    if (score < OVERVIEW_JACCARD_MIN) continue;
    if (row.url && existingUrls.has(urlKey(row.url))) continue;
    out.push({ row, source: row.source, score });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, OVERVIEW_MAX_ADDITIONAL_DB);
}

/**
 * Опционально: Tavily Search — короткие выдержки с URL (настройки AI → Tavily или TAVILY_API_KEY).
 */
async function fetchTavilySnippets(query, excludeUrlKeys) {
  const ai = await getAISettings();
  const key =
    (typeof ai.tavilyApiKey === 'string' && ai.tavilyApiKey.trim()) ||
    process.env.TAVILY_API_KEY ||
    '';
  if (!key || !query?.trim()) return [];

  try {
    const { data } = await axios.post(
      'https://api.tavily.com/search',
      {
        api_key: key,
        query: query.trim().slice(0, 400),
        search_depth: 'basic',
        max_results: OVERVIEW_MAX_TAVILY,
        include_answer: false,
      },
      { timeout: 28000, headers: { 'Content-Type': 'application/json' } },
    );
    const results = Array.isArray(data?.results) ? data.results : [];
    const out = [];
    for (const r of results) {
      const u = typeof r.url === 'string' ? r.url : '';
      if (!u) continue;
      const k = urlKey(u);
      if (excludeUrlKeys.has(k)) continue;
      excludeUrlKeys.add(k);
      let host = 'веб';
      try {
        host = new URL(u).hostname.replace(/^www\./, '');
      } catch {
        /* ignore */
      }
      out.push({
        sourceId: null,
        sourceName: host,
        url: u,
        originalTitle: typeof r.title === 'string' ? r.title : host,
        summary: typeof r.content === 'string' ? r.content.slice(0, 1200) : '',
        body: '',
        overviewFromWebSearch: true,
      });
    }
    return out;
  } catch (e) {
    console.warn('[overviewSources] Tavily search failed:', e.message);
    return [];
  }
}

/**
 * Дополняет снимки источников для обзора: БД + опционально Tavily.
 * @returns {Promise<{ snapshots: Array, rules: Array, meta: object }>}
 */
export async function enrichSnapshotsForOverview(item, baseSnapshots) {
  const meta = {
    addedFromDb: 0,
    addedFromWeb: 0,
    skippedDisallowMerge: 0,
  };

  const snapshots = [...baseSnapshots];
  const { sourceIds: seenSourceIds, urls: seenUrls } = collectExistingKeys(baseSnapshots, item);

  const related = await findRelatedNewsFromDatabase(item, baseSnapshots);
  const ruleById = new Map();
  const newRules = [];

  const extraSourceIds = related.map((r) => r.row.sourceId).filter(Boolean);
  if (extraSourceIds.length > 0) {
    const sources = await prisma.source.findMany({
      where: { id: { in: [...new Set(extraSourceIds)] } },
      select: { id: true, usageRule: true },
    });
    for (const s of sources) ruleById.set(s.id, s.usageRule);
  }

  for (const { row, source } of related) {
    if (seenSourceIds.has(row.sourceId)) continue;
    const ur = ruleById.get(row.sourceId);
    if (!sourceAllowsMerge(ur)) {
      meta.skippedDisallowMerge += 1;
      continue;
    }
    if (row.url) seenUrls.add(urlKey(row.url));
    seenSourceIds.add(row.sourceId);
    snapshots.push(snapshotFromNewsItem(row, source));
    if (ur) newRules.push(ur);
    meta.addedFromDb += 1;
  }

  const regionBit = item.region ? `${item.region} ` : '';
  const tavilyQuery = `${regionBit}${item.title}`.trim();
  const tavilySnippets = await fetchTavilySnippets(tavilyQuery, seenUrls);
  for (const s of tavilySnippets) {
    snapshots.push(s);
    meta.addedFromWeb += 1;
  }

  return { snapshots, newRules, meta };
}
