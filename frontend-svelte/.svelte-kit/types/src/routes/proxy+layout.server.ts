// @ts-nocheck
import type { LayoutServerLoad } from './$types';
import { env } from '$env/dynamic/private';

type Section = { id: string; slug: string; title: string };
type MenuItem = { id: string; label: string; url?: string; sectionId?: string; children?: MenuItem[] };

/** Flatten nested menu items (children → top level). */
function flattenItems(items: MenuItem[] | undefined): Omit<MenuItem, 'children'>[] {
  if (!items) return [];
  const out: Omit<MenuItem, 'children'>[] = [];
  for (const it of items) {
    out.push({ id: it.id, label: it.label, url: it.url, sectionId: it.sectionId });
    if (Array.isArray(it.children)) out.push(...flattenItems(it.children));
  }
  return out;
}

export const load = async () => {
  // For server→server calls (Docker), use the internal backend URL.
  // The client receives publicApiBase for its own requests.
  const serverBase = env.API_BASE_SERVER || env.PUBLIC_API_BASE || 'http://backend:3000';
  const publicApiBase = env.PUBLIC_API_BASE || 'http://localhost:3002';
  const region = env.PUBLIC_REGION || '';

  const [sectionsRes, headerRes, footerRes] = await Promise.allSettled([
    globalThis.fetch(`${serverBase}/api/sections`).then((r) => r.json() as Promise<Section[]>),
    globalThis.fetch(`${serverBase}/api/menus/header`).then((r) => r.json() as Promise<{ items?: MenuItem[] }>),
    globalThis.fetch(`${serverBase}/api/menus/footer`).then((r) => r.json() as Promise<{ items?: MenuItem[] }>),
  ]);

  const rawSections = sectionsRes.status === 'fulfilled' ? sectionsRes.value : [];
  const sections: Section[] = Array.isArray(rawSections) ? rawSections : [];
  const headerMenu = flattenItems(headerRes.status === 'fulfilled' ? headerRes.value?.items : []);
  const footerMenu = flattenItems(footerRes.status === 'fulfilled' ? footerRes.value?.items : []);

  return { sections, headerMenu, footerMenu, apiBase: publicApiBase, region };
};
;null as any as LayoutServerLoad;