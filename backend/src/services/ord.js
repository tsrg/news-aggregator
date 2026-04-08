/**
 * Заглушка под интеграцию с API операторов рекламных данных (ОРД).
 * Реальная синхронизация ERID — отдельный этап.
 */

/**
 * @param {import('@prisma/client').AdCreative} creative
 * @param {'create' | 'update' | 'delete'} action
 */
export async function onAdCreativeChange(creative, action) {
  if (process.env.ORD_ENABLED === 'true') {
    console.log('[ORD stub] onAdCreativeChange', action, creative?.id, creative?.internalRegistryId);
  }
  return { ok: true };
}

/**
 * @param {import('@prisma/client').NewsItem} newsItem
 * @param {'create' | 'update'} action
 */
export async function onPromotionalNewsChange(newsItem, action) {
  if (process.env.ORD_ENABLED === 'true') {
    console.log('[ORD stub] onPromotionalNewsChange', action, newsItem?.id);
  }
  return { ok: true };
}
