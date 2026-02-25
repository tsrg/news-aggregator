import Parser from 'rss-parser';
import { prisma } from '../config/prisma.js';

const parser = new Parser();

export async function fetchSource(sourceId) {
  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source || !source.isActive) return;
  const feed = await parser.parseURL(source.url);
  const params = (source.params && typeof source.params === 'object') ? source.params : {};
  const region = params.region || null;
  let created = 0;
  for (const entry of feed.items || []) {
    const externalId = entry.guid || entry.link || entry.title;
    if (!externalId) continue;
    const existing = await prisma.newsItem.findUnique({
      where: { sourceId_externalId: { sourceId, externalId } },
    });
    if (existing) continue;
    await prisma.newsItem.create({
      data: {
        sourceId,
        externalId,
        title: entry.title || 'Untitled',
        summary: entry.contentSnippet?.slice(0, 500) || entry.content?.slice(0, 500) || null,
        body: entry.content || null,
        url: entry.link || null,
        imageUrl: entry.enclosure?.url || null,
        region,
        status: 'PENDING',
      },
    });
    created++;
  }
  await prisma.source.update({
    where: { id: sourceId },
    data: { lastFetchedAt: new Date() },
  });
  return created;
}

export async function fetchAllSources() {
  const sources = await prisma.source.findMany({ where: { isActive: true } });
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
