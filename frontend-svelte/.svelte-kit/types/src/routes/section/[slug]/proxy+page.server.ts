// @ts-nocheck
import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';

const PAGE_TITLES: Record<string, string> = {
  region: 'Новости Ивановской области',
  politics: 'Политика Ивановской области',
  society: 'Общество Ивановской области',
  sport: 'Спорт Иванова и Ивановской области',
  culture: 'Культура Ивановской области',
  economy: 'Экономика Ивановской области',
  general: 'Общие новости',
};
const PAGE_DESCRIPTIONS: Record<string, string> = {
  region: 'Актуальные новости Ивановской области сегодня — главные события Иванова и региона.',
  politics: 'Политические новости Ивановской области: власть, выборы, решения администрации.',
  society: 'Общественные события и социальные темы Ивановской области.',
  sport: 'Спортивные новости Иванова и Ивановской области.',
  culture: 'Культурная жизнь Ивановской области: выставки, концерты, театры, фестивали.',
  economy: 'Экономика и бизнес Ивановской области.',
  general: 'Общие новости России и мира на Иваново Онлайн.',
};

const LIMIT = 20;

export const load = async ({ params, url, depends, parent }: Parameters<PageServerLoad>[0]) => {
  depends('app:news');
  const serverBase = env.API_BASE_SERVER || env.PUBLIC_API_BASE || 'http://backend:3000';
  const region = env.PUBLIC_REGION || '';
  const slug = params.slug;

  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));

  // Get sections from parent layout
  const { sections } = await parent() as { sections: { id: string; slug: string; title: string }[] };
  const section = sections.find((s) => s.slug === slug);

  const isRegionSection = slug === 'region';
  const isGeneralSection = slug === 'general';
  const sectionNotFound = !isRegionSection && !isGeneralSection && section === undefined;

  const pageTitle = PAGE_TITLES[slug] || section?.title || slug;
  const description = PAGE_DESCRIPTIONS[slug] || `Новости раздела "${pageTitle}" на Иваново Онлайн`;

  let news = { items: [] as { id: string; title: string; summary?: string; publishedAt?: string; sourcePublishedAt?: string | null; source?: { name: string }; imageUrl?: string | null }[], total: 0 };

  if (!sectionNotFound) {
    let newsUrl = `${serverBase}/api/news?limit=${LIMIT}&page=${page}`;
    if (isRegionSection && region) newsUrl += `&region=${encodeURIComponent(region)}`;
    else if (isGeneralSection) newsUrl += `&noRegion=1`;
    else if (section) newsUrl += `&section=${section.id}`;

    const res = await globalThis.fetch(newsUrl).catch(() => null);
    if (res?.ok) news = await res.json();
  }

  return { slug, pageTitle, description, sectionNotFound, news, page, totalPages: Math.max(1, Math.ceil(news.total / LIMIT)) };
};
