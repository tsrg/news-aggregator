/// <reference types="node" />
export default defineNuxtConfig({
  compatibilityDate: '2025-03-01',
  devtools: { enabled: true },
  future: { compatibilityVersion: 4 },
  srcDir: '.',
  dir: { app: '.' },
  modules: ['@nuxtjs/tailwindcss'],
  app: {
    head: {
      link: [
        // Preconnect only; font stylesheet loaded asynchronously in plugin to avoid blocking FCP
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
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

function getApiOriginLink(): { rel: string; href: string; crossorigin?: 'anonymous' | 'use-credentials' }[] {
  const apiBase = process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000';
  try {
    const origin = new URL(apiBase).origin;
    return [{ rel: 'preconnect', href: origin, crossorigin: 'anonymous' }];
  } catch {
    return [];
  }
}
