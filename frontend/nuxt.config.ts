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
      titleTemplate: '%s | Иваново Онлайн',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Свежие новости Иванова и Ивановской области сегодня — политика, общество, спорт, культура, экономика. Читайте последние события региона на Иваново Онлайн.' },
        { name: 'keywords', content: 'новости Иваново, Ивановская область, региональные новости, последние новости' },
        { name: 'robots', content: 'index, follow' },
        { name: 'author', content: 'Иваново Онлайн' },
        { name: 'theme-color', content: '#2563EB' },
        { property: 'og:site_name', content: 'Иваново Онлайн' },
        { property: 'og:locale', content: 'ru_RU' },
        { property: 'og:type', content: 'website' },
        { property: 'og:image', content: 'https://ivanovo.online/og-image.jpg' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:site', content: '@ivanovo_online' },
        { name: 'twitter:image', content: 'https://ivanovo.online/og-image.jpg' },
      ],
      link: [
        // Preconnect only; font stylesheet loaded asynchronously in plugin to avoid blocking FCP
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
        // Preconnect to API origin for faster first request when front and API are on different hosts
        ...(getApiOriginLink()),
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'manifest', href: '/site.webmanifest' },
      ]
    }
  },
  runtimeConfig: {
    apiBaseServer: process.env.NUXT_API_BASE_SERVER || '',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3002',
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
