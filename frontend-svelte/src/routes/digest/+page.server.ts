import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ url }) => {
  const serverBase = env.API_BASE_SERVER || env.PUBLIC_API_BASE || 'http://backend:3000';
  const page = url.searchParams.get('page') || '1';

  try {
    const res = await globalThis.fetch(`${serverBase}/api/digest/list?page=${page}&limit=20`);
    if (!res.ok) return { digests: [], total: 0 };
    const data = await res.json() as { items: unknown[]; total: number };
    return { digests: Array.isArray(data.items) ? data.items : [], total: data.total ?? 0 };
  } catch {
    return { digests: [], total: 0 };
  }
};
