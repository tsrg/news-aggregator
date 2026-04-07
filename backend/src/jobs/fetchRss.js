import Parser from 'rss-parser';
import { prisma } from '../config/prisma.js';
import { collectUrlsFromSitemap } from '../services/sitemapFetcher.js';
import { enrichNewsItem, parseArticleTitle } from '../services/articleParser.js';
import { normalizeNewsTitleIfNeeded } from '../services/ai.js';
import { parseDateFromRssItem, parseSitemapLastmod } from '../utils/sourcePublishedAt.js';
import { normalizeTitleForIndex } from '../services/titleNormalize.js';

const parser = new Parser({
  customFields: {
    item: [
      ['dc:date', 'dcDate'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
});

/** Полный HTML текста из элемента RSS (для резервного тела при неудачном скрейпинге). */
function pickRssContentHtml(entry) {
  if (!entry) return '';
  let c = entry.content;
  if (c && typeof c === 'object' && c._) c = c._;
  if (typeof c !== 'string') c = entry.contentEncoded || entry['content:encoded'] || '';
  if (typeof c !== 'string') c = entry.description || '';
  return typeof c === 'string' ? c : '';
}

export function matchesFilter(value, operator, filterValue) {
  if (!value) return false;
  const str = String(value).toLowerCase();
  const filter = String(filterValue).toLowerCase();

  switch (operator) {
    case 'contains':
      return str.includes(filter);
    case 'not_contains':
      return !str.includes(filter);
    case 'equals':
      return str === filter;
    case 'starts_with':
      return str.startsWith(filter);
    case 'ends_with':
      return str.endsWith(filter);
    case 'regex':
      try {
        const regex = new RegExp(filterValue, 'i');
        return regex.test(String(value));
      } catch {
        return false;
      }
    default:
      return false;
  }
}

export function shouldIncludeItem(entry, filters) {
  if (!filters || filters.length === 0) return true;

  const activeFilters = filters.filter(f => f.isActive !== false);
  if (activeFilters.length === 0) return true;

  const getFieldValue = (field) => {
    switch (field) {
      case 'title':
        return entry.title || '';
      case 'content':
        return entry.contentSnippet || entry.content || entry.description || '';
      case 'category':
        return entry.categories?.join(' ') || entry.category || '';
      case 'author':
        return entry.author || entry.creator || '';
      case 'url':
        return entry.url || entry.link || '';
      default:
        return '';
    }
  };

  const includeFilters = activeFilters.filter(f => f.type === 'INCLUDE');
  if (includeFilters.length > 0) {
    const hasMatch = includeFilters.some(f => {
      const value = getFieldValue(f.field);
      return matchesFilter(value, f.operator, f.value);
    });
    if (!hasMatch) return false;
  }

  const excludeFilters = activeFilters.filter(f => f.type === 'EXCLUDE');
  for (const f of excludeFilters) {
    const value = getFieldValue(f.field);
    if (matchesFilter(value, f.operator, f.value)) {
      return false;
    }
  }

  return true;
}

async function createNewsFromEntry(sourceId, region, filters, entry) {
  const externalId = entry.guid || entry.externalId || entry.link || entry.url || entry.title;
  if (!externalId) return { created: false, skippedByFilters: false };
  if (!shouldIncludeItem(entry, filters)) {
    return { created: false, skippedByFilters: true };
  }

  const existing = await prisma.newsItem.findUnique({
    where: { sourceId_externalId: { sourceId, externalId } },
  });
  if (existing) return { created: false, skippedByFilters: false };

  const sourcePublishedAt =
    entry.sourcePublishedAt instanceof Date && !Number.isNaN(entry.sourcePublishedAt.getTime())
      ? entry.sourcePublishedAt
      : parseDateFromRssItem(entry);

  const rawTitle = entry.title || 'Untitled';
  const displayTitle = await normalizeNewsTitleIfNeeded(rawTitle);

  const rssContentHtml = pickRssContentHtml(entry);

  const newsItem = await prisma.newsItem.create({
    data: {
      sourceId,
      externalId,
      title: displayTitle,
      titleNormalized: normalizeTitleForIndex(displayTitle),
      summary: entry.contentSnippet?.slice(0, 500) || entry.content?.slice(0, 500) || entry.summary?.slice(0, 500) || null,
      body: null,
      url: entry.link || entry.url || null,
      imageUrl: entry.enclosure?.url || null,
      region,
      ...(sourcePublishedAt ? { sourcePublishedAt } : {}),
      status: 'PENDING',
    },
  });

  const articleUrl = entry.link || entry.url;
  if (articleUrl) {
    const jobPayload = {
      newsItemId: newsItem.id,
      url: articleUrl,
      ...(rssContentHtml ? { rssContentHtml } : {}),
    };
    const { getArticleQueue } = await import('./queue.js');
    const q = getArticleQueue();
    if (q) {
      await q.add('parse-article', jobPayload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
    } else {
      enrichNewsItem(newsItem.id, articleUrl, { rssContentHtml: rssContentHtml || null }).catch((err) => {
        console.error(`enrichNewsItem without queue failed for ${articleUrl}:`, err.message);
      });
    }
  }

  return { created: true, skippedByFilters: false };
}

function buildTitleFromUrl(articleUrl) {
  try {
    const { pathname } = new URL(articleUrl);
    const tail = pathname.split('/').filter(Boolean).pop();
    if (!tail) return 'Новость';
    const normalized = decodeURIComponent(tail)
      .replace(/[-_]+/g, ' ')
      .replace(/\.html?$/i, '')
      .trim();

    // Частый случай sitemap-URL newsivanovo: fn_1234567.html (это не человекочитаемый заголовок).
    if (/^fn\s*\d+$/i.test(normalized)) {
      return 'Новость';
    }

    return normalized.slice(0, 180) || 'Новость';
  } catch {
    return 'Новость';
  }
}

function normalizeArticleUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    parsed.hash = '';
    if (parsed.pathname.length > 1) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

async function fetchRssSource(source) {
  const feed = await parser.parseURL(source.url);
  const params = (source.params && typeof source.params === 'object') ? source.params : {};
  const region = params.region || null;
  let created = 0;
  let skipped = 0;

  for (const entry of feed.items || []) {
    const result = await createNewsFromEntry(source.id, region, source.filters, entry);
    if (result.skippedByFilters) skipped++;
    if (result.created) created++;
  }

  return { created, skipped };
}

async function fetchSitemapSource(source) {
  const params = (source.params && typeof source.params === 'object') ? source.params : {};
  const region = params.region || null;
  const sitemapUrl = String(params.sitemapUrl || source.url || '').trim();
  if (!sitemapUrl) return { created: 0, skipped: 0 };

  const { entries } = await collectUrlsFromSitemap(sitemapUrl, params);

  let created = 0;
  let skipped = 0;
  for (const { url: loc, lastmod } of entries) {
    const normalizedUrl = normalizeArticleUrl(loc);
    const sourcePublishedAt = parseSitemapLastmod(lastmod);
    let resolvedTitle = buildTitleFromUrl(normalizedUrl);

    // Если title из URL выглядит как технический идентификатор, пробуем сразу получить заголовок страницы.
    if (resolvedTitle === 'Новость') {
      const parsedTitle = await parseArticleTitle(normalizedUrl);
      if (parsedTitle) {
        resolvedTitle = parsedTitle;
      }
    }

    resolvedTitle = await normalizeNewsTitleIfNeeded(resolvedTitle);

    const entry = {
      externalId: normalizedUrl,
      url: normalizedUrl,
      link: normalizedUrl,
      title: resolvedTitle,
      contentSnippet: null,
      summary: null,
      content: null,
      ...(sourcePublishedAt ? { sourcePublishedAt } : {}),
    };
    const result = await createNewsFromEntry(source.id, region, source.filters, entry);
    if (result.skippedByFilters) skipped++;
    if (result.created) created++;
  }

  return { created, skipped };
}

export async function fetchSource(sourceId) {
  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    include: { filters: true },
  });
  if (!source || !source.isActive) return;

  const sourceType = source.type === 'sitemap' ? 'sitemap' : 'rss';
  const result = sourceType === 'sitemap'
    ? await fetchSitemapSource(source)
    : await fetchRssSource(source);

  await prisma.source.update({
    where: { id: sourceId },
    data: { lastFetchedAt: new Date() },
  });

  console.log(`Source ${sourceId}: created ${result.created}, skipped by filters ${result.skipped}`);
  return result.created;
}

export async function fetchAllSources() {
  const sources = await prisma.source.findMany({
    where: { isActive: true },
    include: { filters: true },
  });
  let total = 0;
  for (const s of sources) {
    try {
      const n = await fetchSource(s.id);
      total += n || 0;
    } catch (e) {
      console.error('Fetch failed for source', s.id, e.message);
    }
  }
  return total;
}
