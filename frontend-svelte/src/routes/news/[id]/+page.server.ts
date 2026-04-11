import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';

type SourceSnapshot = {
  sourceId: string; sourceName: string; url?: string | null; originalTitle?: string;
};
type AdjacentPreview = {
  id: string; title: string; summary?: string; imageUrl?: string;
  publishedAt?: string; createdAt?: string;
};

export const load: PageServerLoad = async ({ params, depends }) => {
  depends('app:news');
  const serverBase = env.API_BASE_SERVER || env.PUBLIC_API_BASE || 'http://backend:3000';

  const res = await globalThis.fetch(`${serverBase}/api/news/${params.id}`);
  if (!res.ok) {
    throw error(res.status, res.status === 404 ? 'Новость не найдена' : 'Ошибка загрузки');
  }

  const article = await res.json() as {
    id: string; title: string; summary?: string; body?: string;
    imageUrl?: string; sourcePublishedAt?: string | null;
    publishedAt?: string; createdAt: string; updatedAt?: string;
    source?: { name: string };
    section?: { slug: string; title: string } | null;
    sourceSnapshots?: SourceSnapshot[] | null;
    prev?: AdjacentPreview | null;
    next?: AdjacentPreview | null;
  };

  // Strip <script> tags server-side as basic sanitization
  if (article.body) {
    article.body = article.body.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  }

  return { article };
};
