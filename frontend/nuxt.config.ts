export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  experimental: {
    appManifest: false,
  },
  app: {
    head: {
      link: [
        // Preconnect only; font stylesheet loaded asynchronously in plugin to avoid blocking FCP
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        // Preconnect to API origin for faster first request when front and API are on different hosts
        ...(getApiOriginLink()),
      ]
    }
  },
  runtimeConfig: {
    apiBaseServer: process.env.NUXT_API_BASE_SERVER || '',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000',
      region: process.env.NUXT_PUBLIC_REGION || 'Иваново',
    },
  },
});

function getApiOriginLink(): { rel: string; href: string; crossorigin?: string }[] {
  const apiBase = process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000';
  try {
    const origin = new URL(apiBase).origin;
    return [{ rel: 'preconnect', href: origin, crossorigin: '' }];
  } catch {
    return [];
  }
}
