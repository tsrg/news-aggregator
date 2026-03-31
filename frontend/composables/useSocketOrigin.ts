/**
 * Публичный origin API в браузере: при сборке часто остаётся NUXT_PUBLIC_API_BASE=http://localhost:3002,
 * тогда fetch и WebSocket бьют в localhost → ERR_CONNECTION_REFUSED и hydration mismatch.
 * Если в конфиге localhost/127.0.0.1, а страница открыта с реального домена — используем origin страницы.
 */
export function resolveClientPublicOrigin(baked: string): string {
  if (import.meta.server) return baked;
  const pageOrigin = window.location.origin;
  const pageHost = window.location.hostname;
  try {
    const u = new URL(baked);
    const apiHost = u.hostname;
    const apiIsLocal =
      apiHost === 'localhost' ||
      apiHost === '127.0.0.1' ||
      apiHost === '0.0.0.0';
    if (apiIsLocal && pageHost !== 'localhost' && pageHost !== '127.0.0.1') {
      return pageOrigin;
    }
    return u.origin;
  } catch {
    return pageOrigin;
  }
}

/** @deprecated используйте resolveClientPublicOrigin */
export const resolveSocketOrigin = resolveClientPublicOrigin;
