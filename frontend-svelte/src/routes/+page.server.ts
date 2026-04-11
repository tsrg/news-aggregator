import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';

type NewsItem = {
  id: string; title: string; summary?: string | null;
  imageUrl?: string | null; sourcePublishedAt?: string | null;
  publishedAt?: string | null; source?: { name: string } | null;
};
type NewsResponse = { items: NewsItem[]; total: number };
type Section = { id: string; slug: string; title: string };

export const load: PageServerLoad = async ({ depends, parent }) => {
  depends('app:news');

  const serverBase = env.API_BASE_SERVER || env.PUBLIC_API_BASE || 'http://backend:3000';
  const region = env.PUBLIC_REGION || '';

  // Get sections from parent layout (already fetched)
  const { sections } = await parent() as { sections: Section[] };

  const sectionSlugs = sections.filter(
    (s) => !['top', 'main', 'region', 'general'].includes(s.slug)
  );
  const regionSectionId = sections.find((s) => s.slug === 'region')?.id ?? null;

  const regionParam = region ? `&region=${encodeURIComponent(region)}` : '';

  const [topRes, regionRes, generalRes, sectionNewsRes] = await Promise.allSettled([
    globalThis.fetch(`${serverBase}/api/news?limit=4${regionParam}`).then((r) => r.json() as Promise<NewsResponse>),
    region
      ? globalThis.fetch(`${serverBase}/api/news?region=${encodeURIComponent(region)}&limit=6`).then((r) => r.json() as Promise<NewsResponse>)
      : Promise.resolve(null),
    globalThis.fetch(`${serverBase}/api/news?noRegion=1&limit=5`).then((r) => r.json() as Promise<NewsResponse>),
    Promise.all(
      sectionSlugs.map((sec) =>
        globalThis.fetch(`${serverBase}/api/news?section=${sec.id}&limit=3`)
          .then((r) => r.json() as Promise<NewsResponse>)
          .then((res) => ({ id: sec.id, items: res.items ?? [] }))
          .catch(() => ({ id: sec.id, items: [] }))
      )
    ),
  ]);

  const rawTop = topRes.status === 'fulfilled' ? topRes.value : null;
  const top = {
    items: Array.isArray(rawTop?.items) ? rawTop.items : [],
    total: typeof rawTop?.total === 'number' ? rawTop.total : 0,
  };
  const rawGeneral = generalRes.status === 'fulfilled' ? generalRes.value : null;
  const general = {
    items: Array.isArray(rawGeneral?.items) ? rawGeneral.items : [],
    total: typeof rawGeneral?.total === 'number' ? rawGeneral.total : 0,
  };
  const rawRegion = regionRes.status === 'fulfilled' ? regionRes.value : null;
  const regionData = rawRegion && Array.isArray(rawRegion.items) ? rawRegion : null;
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
