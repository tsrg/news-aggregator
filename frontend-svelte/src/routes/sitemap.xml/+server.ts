import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const SECTIONS = [
  { slug: 'region', priority: '0.9' },
  { slug: 'politics', priority: '0.8' },
  { slug: 'society', priority: '0.8' },
  { slug: 'sport', priority: '0.8' },
  { slug: 'culture', priority: '0.8' },
  { slug: 'economy', priority: '0.8' },
];
const STATIC_PAGES = [
  { url: '/about', priority: '0.5' },
  { url: '/contacts', priority: '0.5' },
  { url: '/advertising', priority: '0.4' },
  { url: '/privacy', priority: '0.3' },
  { url: '/terms', priority: '0.3' },
  { url: '/editorial', priority: '0.5' },
];

function esc(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export const GET: RequestHandler = async ({ fetch }) => {
  const apiBase = env.API_BASE_SERVER || env.PUBLIC_API_BASE || 'http://localhost:3002';
  const hostname = 'https://ivanovo.online';
  const today = new Date().toISOString().split('T')[0];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n';

  xml += `  <url><loc>${hostname}/</loc><lastmod>${today}</lastmod><changefreq>hourly</changefreq><priority>1.0</priority></url>\n`;

  for (const s of SECTIONS) {
    xml += `  <url><loc>${hostname}/section/${s.slug}</loc><lastmod>${today}</lastmod><changefreq>hourly</changefreq><priority>${s.priority}</priority></url>\n`;
  }
  for (const p of STATIC_PAGES) {
    xml += `  <url><loc>${hostname}${p.url}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>${p.priority}</priority></url>\n`;
  }

  try {
    const res = await fetch(`${apiBase}/api/news?limit=1000`);
    if (res.ok) {
      const { items } = await res.json() as { items: { id: string; title?: string; updatedAt?: string; publishedAt?: string; createdAt: string; sourcePublishedAt?: string | null }[] };
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

      for (const item of items) {
        const lastmod = (item.updatedAt || item.publishedAt || item.createdAt || today).split('T')[0];
        const pubDate = item.sourcePublishedAt || item.publishedAt || item.createdAt;
        const isRecent = pubDate && new Date(pubDate) >= twoDaysAgo;

        xml += `  <url>\n    <loc>${hostname}/news/${esc(item.id)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>never</changefreq>\n    <priority>0.9</priority>\n`;
        if (isRecent && item.title) {
          xml += `    <news:news>\n      <news:publication><news:name>Иваново Онлайн</news:name><news:language>ru</news:language></news:publication>\n      <news:publication_date>${new Date(pubDate!).toISOString()}</news:publication_date>\n      <news:title>${esc(item.title)}</news:title>\n    </news:news>\n`;
        }
        xml += `  </url>\n`;
      }
    }
  } catch (e) {
    console.error('sitemap: failed to fetch news', e);
  }

  xml += '</urlset>';

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
