/**
 * API base URL: on server (SSR) uses apiBaseServer when set (e.g. Docker: http://backend:3000),
 * on client and fallback uses public.apiBase (e.g. http://localhost:3000).
 */
export function useApiBase(): string {
  const config = useRuntimeConfig();
  return (config.apiBaseServer as string) || (config.public.apiBase as string) || 'http://localhost:3000';
}
