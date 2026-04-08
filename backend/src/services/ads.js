import { rewriteStorageUrlForBrowser } from './s3.js';

/**
 * @param {Date} now
 * @param {import('@prisma/client').AdCreative} c
 */
export function isCreativeActiveNow(now, c) {
  if (!c.isActive) return false;
  if (c.validFrom && c.validFrom > now) return false;
  if (c.validTo && c.validTo < now) return false;
  return true;
}

/**
 * @param {Record<string, string | undefined | null>} defaults
 * @param {import('@prisma/client').AdCreative} c
 */
export function resolveCreativeMarking(defaults, c) {
  return {
    erid: c.erid || defaults.erid || '',
    advertiserName: c.advertiserName || defaults.advertiserName || '',
    advertiserInn: c.advertiserInn || defaults.advertiserInn || '',
    advertiserOgrn: c.advertiserOgrn || defaults.advertiserOgrn || '',
  };
}

/**
 * @param {import('@prisma/client').AdCreative} c
 * @param {Record<string, string>} marking
 */
export function serializePublicCreative(c, marking) {
  const base = {
    id: c.id,
    type: c.type,
    sortOrder: c.sortOrder,
    internalRegistryId: c.internalRegistryId,
    marking,
  };
  if (c.type === 'BANNER') {
    return {
      ...base,
      imageUrl: c.imageUrl ? rewriteStorageUrlForBrowser(c.imageUrl) : null,
      targetUrl: c.targetUrl,
      openInNewTab: c.openInNewTab,
      altText: c.altText,
    };
  }
  return {
    ...base,
    yandexConfig: c.yandexConfig && typeof c.yandexConfig === 'object' ? c.yandexConfig : {},
  };
}
