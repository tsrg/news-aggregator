// @ts-nocheck
import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';

export const load = async ({ fetch, params }: Parameters<PageServerLoad>[0]) => {
  const serverBase = env.API_BASE_SERVER || env.PUBLIC_API_BASE || 'http://localhost:3002';
  const slug = params.slug;

  const res = await fetch(`${serverBase}/api/pages/${slug}`).catch(() => null);
  if (!res || !res.ok) {
    throw error(404, 'Страница не найдена');
  }

  const page = await res.json() as { title: string; body: string };

  // Strip scripts server-side
  if (page.body) {
    page.body = page.body.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  }

  return { slug, page };
};
