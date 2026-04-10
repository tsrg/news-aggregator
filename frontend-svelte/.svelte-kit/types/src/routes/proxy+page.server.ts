// @ts-nocheck
import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';

type NewsItem = {
  id: string; title: string; summary?: string | null;
  imageUrl?: string | null; sourcePublishedAt?: string | null;
  publishedAt?: string | null; source?: { name: string } | null;
};
type NewsResponse = { items: NewsItem[]; total: number };
type Section = { id: string; slug: string; title: string };

export const load = async ({ fetch, depends, parent }: Parameters<PageServerLoad>[0]) => {
  depends('app:news');

  const serverBase = env.API_BASE_SERVER || env.PUBLIC_API_BASE || 'http://localhost:3002';
  const region = env.PUBLIC_REGION || '';

  // Get sections from parent layout (already fetched)
  const { sections } = await parent() as { sections: Section[] };

  const sectionSlugs = sections.filter(
    (s) => !['top', 'main', 'region', 'general'].includes(s.slug)
  );
  const regionSectionId = sections.find((s) => s.slug === 'region')?.id ?? null;

  const regionParam = region ? `&region=${encodeURIComponent(region)}` : '';

  const [topRes, regionRes, generalRes, sectionNewsRes] = await Promise.allSettled([
    fetch(`${serverBase}/api/news?limit=4${regionParam}`).then((r) => r.json() as Promise<NewsResponse>),
    region
      ? fetch(`${serverBase}/api/news?region=${encodeURIComponent(region)}&limit=6`).then((r) => r.json() as Promise<NewsResponse>)
      : Promise.resolve(null),
    fetch(`${serverBase}/api/news?noRegion=1&limit=5`).then((r) => r.json() as Promise<NewsResponse>),
    Promise.all(
      sectionSlugs.map((sec) =>
        fetch(`${serverBase}/api/news?section=${sec.id}&limit=3`)
          .then((r) => r.json() as Promise<NewsResponse>)
          .then((res) => ({ id: sec.id, items: res.items ?? [] }))
          .catch(() => ({ id: sec.id, items: [] }))
      )
    ),
  ]);

  const top = topRes.status === 'fulfilled' ? topRes.value : { items: [], total: 0 };
  const regionData = regionRes.status === 'fulfilled' ? regionRes.value : null;
  const general = generalRes.status === 'fulfilled' ? generalRes.value : { items: [], total: 0 };
  const sectionNews: Record<string, NewsItem[]> = {};
  if (sectionNewsRes.status === 'fulfilled') {
    for (const { id, items } of sectionNewsRes.value) {
      sectionNews[id] = items;
    }
  }

  return {
    top,
    regionData,
    general,
    sectionSlugs,
    sectionNews,
    regionSectionId,
    region,
  };
};
