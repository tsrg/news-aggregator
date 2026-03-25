/**
 * Нормализация заголовка для индекса похожести (pg_trgm) и согласованности с Jaccard в newsMerge.
 */
export function normalizeTitleForIndex(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[«»"'""„…]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
