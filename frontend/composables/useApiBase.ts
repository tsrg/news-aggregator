/**
 * API base URL: on server (SSR) uses apiBaseServer when set (e.g. Docker: http://backend:3000),
 * on client uses public.apiBase only (e.g. http://localhost:3000).
 */
export function useApiBase(): string {
  const config = useRuntimeConfig();
  if (import.meta.server) {
    const serverBase = config.apiBaseServer;
    if (serverBase) return serverBase;
  }
  return (config.public.apiBase as string) || 'http://localhost:3000';
}
