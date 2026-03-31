import { resolveClientPublicOrigin } from './useSocketOrigin';

/**
 * API base URL: SSR — apiBaseServer (Docker: http://backend:3000).
 * Клиент — NUXT_PUBLIC_API_BASE; если в билде остался localhost, а сайт на прод-домене — origin страницы.
 */
export function useApiBase(): string {
  const config = useRuntimeConfig();
  if (import.meta.server) {
    const serverBase = config.apiBaseServer;
    if (serverBase) return serverBase;
  }
  const baked = (config.public.apiBase as string) || 'http://localhost:3000';
  if (import.meta.client) {
    return resolveClientPublicOrigin(baked);
  }
  return baked;
}
