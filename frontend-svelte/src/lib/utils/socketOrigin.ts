/**
 * Resolve the public API origin for browser use.
 * During SSR builds NUXT_PUBLIC_API_BASE (now PUBLIC_API_BASE) is often
 * baked as http://localhost:3002. If the page is served from a real domain
 * and the baked URL is localhost, fall back to the page origin so
 * Socket.IO and fetch both reach the real server.
 */
export function resolveClientPublicOrigin(baked: string): string {
  if (typeof window === 'undefined') return baked;
  const pageOrigin = window.location.origin;
  const pageHost = window.location.hostname;
  try {
    const u = new URL(baked);
    const apiHost = u.hostname;
    const apiIsLocal =
      apiHost === 'localhost' || apiHost === '127.0.0.1' || apiHost === '0.0.0.0';
    if (apiIsLocal && pageHost !== 'localhost' && pageHost !== '127.0.0.1') {
      return pageOrigin;
    }
    return u.origin;
  } catch {
    return pageOrigin;
  }
}
