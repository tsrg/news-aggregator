/**
 * Дата/время публикации материала в оригинальном источнике (не на нашем сайте).
 */

/**
 * @param {Record<string, unknown>} entry элемент RSS (rss-parser)
 * @returns {Date|null}
 */
export function parseDateFromRssItem(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const candidates = [
    entry.isoDate,
    entry.pubDate,
    entry.dcDate,
    entry['dc:date'],
    entry.updated,
    entry.date,
  ]
    .filter((v) => v != null && String(v).trim() !== '');

  for (const raw of candidates) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

/**
 * @param {string|null|undefined} raw lastmod из sitemap
 * @returns {Date|null}
 */
export function parseSitemapLastmod(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;

  let d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;

  // Формат вроде 2026-03-18 22:00:00 (без таймзоны)
  const m = s.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/,
  );
  if (m) {
    d = new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4]),
      Number(m[5]),
      Number(m[6]),
      0,
    );
    if (!Number.isNaN(d.getTime())) return d;
  }

  const dateOnly = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    d = new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
      12,
      0,
      0,
      0,
    );
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
}
