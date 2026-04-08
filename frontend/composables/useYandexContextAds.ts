/**
 * Загрузка скрипта Яндекс РТБ / РСЯ (context.js) один раз на страницу.
 */
export function ensureYandexContextScript(): Promise<void> {
  if (import.meta.server) return Promise.resolve();

  const w = window as Window & {
    yaContextCb?: Array<() => void>;
    __yaContextAdsLoaded?: boolean;
  };

  w.yaContextCb = w.yaContextCb || [];

  if (w.__yaContextAdsLoaded) {
    return Promise.resolve();
  }

  if (document.querySelector('script[data-yandex-context-ads]')) {
    return new Promise((resolve) => {
      const check = () => {
        if (w.__yaContextAdsLoaded) resolve();
        else setTimeout(check, 50);
      };
      check();
    });
  }

  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://yandex.ru/ads/system/context.js';
    s.async = true;
    s.dataset.yandexContextAds = 'true';
    s.onload = () => {
      w.__yaContextAdsLoaded = true;
      resolve();
    };
    s.onerror = () => reject(new Error('Yandex context.js failed to load'));
    document.body.appendChild(s);
  });
}
