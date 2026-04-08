import { defineEventHandler, setResponseHeader } from 'h3';

interface NewsItem {
  id: string;
  title: string;
  updatedAt?: string;
  createdAt: string;
  publishedAt?: string;
  sourcePublishedAt?: string | null;
}

interface Section {
  id: string;
  slug: string;
}

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
  { url: '/rss', priority: '0.4' },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default defineEventHandler(async (event) => {
  // На сервере используем приватный apiBaseServer (например, http://backend:3002 в Docker
  // или http://localhost:3002 при прямом запуске). Если он не задан — берём публичный URL.
  const config = useRuntimeConfig(event);
  const apiBase = (config.apiBaseServer as string) || (config.public.apiBase as string) || 'http://localhost:3002';
  const hostname = 'https://ivanovo.online';
  
  const today = new Date().toISOString().split('T')[0];
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n';
  
  // Главная страница
  xml += `  <url>\n`;
  xml += `    <loc>${hostname}/</loc>\n`;
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += `    <changefreq>hourly</changefreq>\n`;
  xml += `    <priority>1.0</priority>\n`;
  xml += `  </url>\n`;
  
  // Разделы
  for (const section of SECTIONS) {
    xml += `  <url>\n`;
    xml += `    <loc>${hostname}/section/${section.slug}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>hourly</changefreq>\n`;
    xml += `    <priority>${section.priority}</priority>\n`;
    xml += `  </url>\n`;
  }
  
  // Статические страницы
  for (const page of STATIC_PAGES) {
    xml += `  <url>\n`;
    xml += `    <loc>${hostname}${page.url}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>monthly</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += `  </url>\n`;
  }
  
  // Новости (последние 1000) — включаем <news:news> для Google News
  try {
    const newsResponse = await $fetch<{ items: NewsItem[] }>(`${apiBase}/api/news?limit=1000`);
    if (newsResponse?.items) {
      // Граница для Google News: только статьи за последние 2 дня
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

      for (const item of newsResponse.items) {
        const lastmod = item.updatedAt || item.publishedAt || item.createdAt || today;
        const date = new Date(lastmod).toISOString().split('T')[0];
        const pubDate = item.sourcePublishedAt || item.publishedAt || item.createdAt;
        const isRecent = pubDate && new Date(pubDate) >= twoDaysAgo;

        xml += `  <url>\n`;
        xml += `    <loc>${hostname}/news/${escapeXml(item.id)}</loc>\n`;
        xml += `    <lastmod>${date}</lastmod>\n`;
        xml += `    <changefreq>never</changefreq>\n`;
        xml += `    <priority>0.9</priority>\n`;
        // Добавляем news:news только для свежих статей (требование Google News Sitemap)
        if (isRecent && item.title) {
          const pubIso = new Date(pubDate!).toISOString();
          xml += `    <news:news>\n`;
          xml += `      <news:publication>\n`;
          xml += `        <news:name>Иваново Онлайн</news:name>\n`;
          xml += `        <news:language>ru</news:language>\n`;
          xml += `      </news:publication>\n`;
          xml += `      <news:publication_date>${pubIso}</news:publication_date>\n`;
          xml += `      <news:title>${escapeXml(item.title)}</news:title>\n`;
          xml += `    </news:news>\n`;
        }
        xml += `  </url>\n`;
      }
    }
  } catch (err) {
    console.error('Failed to fetch news for sitemap:', err);
  }
  
  xml += '</urlset>';
  
  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8');
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600');
  
  return xml;
});
