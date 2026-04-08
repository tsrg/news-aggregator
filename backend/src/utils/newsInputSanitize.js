/**
 * PostgreSQL не принимает NUL в текстовых полях — Prisma падает на update.
 */
export function stripNullBytes(str) {
  if (typeof str !== 'string') return str;
  return str.includes('\0') ? str.replace(/\u0000/g, '') : str;
}

/**
 * @param {Record<string, unknown>} data
 * @returns {Record<string, unknown>}
 */
export function sanitizeNewsStrings(data) {
  const out = { ...data };
  for (const key of [
    'title',
    'summary',
    'body',
    'imageUrl',
    'url',
    'region',
    'legalReviewNotes',
    'promoErid',
    'promoAdvertiserName',
    'promoAdvertiserInn',
    'promoAdvertiserOgrn',
  ]) {
    if (typeof out[key] === 'string') out[key] = stripNullBytes(out[key]);
  }
  return out;
}
