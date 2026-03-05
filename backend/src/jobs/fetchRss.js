import Parser from 'rss-parser';
import { prisma } from '../config/prisma.js';
import { articleQueue } from './queue.js';

const parser = new Parser();

function matchesFilter(value, operator, filterValue) {
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

function shouldIncludeItem(entry, filters) {
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

export async function fetchSource(sourceId) {
  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    include: { filters: true },
  });
  if (!source || !source.isActive) return;

  const feed = await parser.parseURL(source.url);
  const params = (source.params && typeof source.params === 'object') ? source.params : {};
  const region = params.region || null;

  let created = 0;
  let skipped = 0;

  for (const entry of feed.items || []) {
    const externalId = entry.guid || entry.link || entry.title;
    if (!externalId) continue;

    if (!shouldIncludeItem(entry, source.filters)) {
      skipped++;
      continue;
    }

    const existing = await prisma.newsItem.findUnique({
      where: { sourceId_externalId: { sourceId, externalId } },
    });
    if (existing) continue;

    // Создаём новость
    const newsItem = await prisma.newsItem.create({
      data: {
        sourceId,
        externalId,
        title: entry.title || 'Untitled',
        summary: entry.contentSnippet?.slice(0, 500) || entry.content?.slice(0, 500) || null,
        body: null, // Будет заполнено после парсинга полного текста
        url: entry.link || null,
        imageUrl: entry.enclosure?.url || null,
        region,
        status: 'PENDING',
      },
    });

    // Добавляем задачу на парсинг полного текста
    if (entry.link) {
      await articleQueue.add('parse-article', {
        newsItemId: newsItem.id,
        url: entry.link,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
    }

    created++;
  }

  await prisma.source.update({
    where: { id: sourceId },
    data: { lastFetchedAt: new Date() },
  });

  console.log(`Source ${sourceId}: created ${created}, skipped by filters ${skipped}`);
  return created;
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
