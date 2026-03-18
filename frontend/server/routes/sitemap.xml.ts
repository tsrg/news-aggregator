import { defineEventHandler, setResponseHeader } from 'h3';

interface NewsItem {
  id: string;
  updatedAt?: string;
  createdAt: string;
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
  const apiBase = process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000';
  const hostname = 'https://ivanovo.online';
  
  const today = new Date().toISOString().split('T')[0];
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
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
  
  // Новости (последние 500)
  try {
    const newsResponse = await $fetch<{ items: NewsItem[] }>(`${apiBase}/api/news?limit=500`);
    if (newsResponse?.items) {
      for (const item of newsResponse.items) {
        const lastmod = item.updatedAt || item.createdAt || today;
        const date = new Date(lastmod).toISOString().split('T')[0];
        
        xml += `  <url>\n`;
        xml += `    <loc>${hostname}/news/${escapeXml(item.id)}</loc>\n`;
        xml += `    <lastmod>${date}</lastmod>\n`;
        xml += `    <changefreq>never</changefreq>\n`;
        xml += `    <priority>0.9</priority>\n`;
        xml += `  </url>\n`;
      }
    }
  } catch (error) {
    console.error('Failed to fetch news for sitemap:', error);
  }
  
  xml += '</urlset>';
  
  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8');
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600');
  
  return xml;
});
