import axios from 'axios';
import { gunzipSync } from 'zlib';
import { XMLParser } from 'fast-xml-parser';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  parseTagValue: true,
});

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/xml,text/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
};

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function parseMaybeGzip(buffer, sourceUrl, contentType = '') {
  const isGzipFile = sourceUrl.toLowerCase().endsWith('.gz');
  const isGzipContentType = String(contentType).toLowerCase().includes('gzip');
  if (!isGzipFile && !isGzipContentType) {
    return buffer.toString('utf8');
  }
  return gunzipSync(buffer).toString('utf8');
}

function normalizeAbsoluteUrl(rawUrl, baseUrl) {
  if (!rawUrl) return null;
  try {
    return new URL(String(rawUrl).trim(), baseUrl).toString();
  } catch {
    return null;
  }
}

function matchesInclude(url, includePatterns) {
  if (!includePatterns || includePatterns.length === 0) return true;
  return includePatterns.some((pattern) => url.includes(pattern));
}

function getSitemapLocs(doc, baseUrl) {
  const indexEntries = toArray(doc?.sitemapindex?.sitemap);
  return indexEntries
    .map((entry) => normalizeAbsoluteUrl(entry?.loc, baseUrl))
    .filter(Boolean);
}

function getUrlsetLocs(doc, baseUrl) {
  const urlEntries = toArray(doc?.urlset?.url);
  return urlEntries
    .map((entry) => normalizeAbsoluteUrl(entry?.loc, baseUrl))
    .filter(Boolean);
}

async function loadXmlDocument(sitemapUrl) {
  const response = await axios.get(sitemapUrl, {
    timeout: 20000,
    maxRedirects: 5,
    headers: REQUEST_HEADERS,
    responseType: 'arraybuffer',
  });
  const xml = parseMaybeGzip(Buffer.from(response.data), sitemapUrl, response.headers?.['content-type']);
  return xmlParser.parse(xml);
}

/**
 * Collects article URLs from sitemap index/urlset recursively.
 * @param {string} rootSitemapUrl
 * @param {{sitemapUrlInclude?: string[], maxUrls?: number, maxSitemaps?: number}} params
 */
export async function collectUrlsFromSitemap(rootSitemapUrl, params = {}) {
  const includePatterns = Array.isArray(params.sitemapUrlInclude)
    ? params.sitemapUrlInclude.filter((v) => typeof v === 'string' && v.trim())
    : [];
  const maxUrls = Number.isInteger(params.maxUrls) && params.maxUrls > 0 ? params.maxUrls : 5000;
  const maxSitemaps = Number.isInteger(params.maxSitemaps) && params.maxSitemaps > 0 ? params.maxSitemaps : 200;

  const queue = [rootSitemapUrl];
  const visited = new Set();
  const collected = [];
  const seenUrls = new Set();

  while (queue.length > 0 && collected.length < maxUrls && visited.size < maxSitemaps) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    let doc;
    try {
      doc = await loadXmlDocument(current);
    } catch (error) {
      console.warn(`Sitemap load failed for ${current}: ${error.message}`);
      continue;
    }

    const nestedSitemaps = getSitemapLocs(doc, current);
    if (nestedSitemaps.length > 0) {
      for (const nestedUrl of nestedSitemaps) {
        if (!visited.has(nestedUrl)) {
          queue.push(nestedUrl);
        }
      }
      continue;
    }

    const urls = getUrlsetLocs(doc, current);
    for (const url of urls) {
      if (!matchesInclude(url, includePatterns)) continue;
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);
      collected.push(url);
      if (collected.length >= maxUrls) break;
    }
  }

  return {
    urls: collected,
    visitedSitemaps: visited.size,
  };
}
