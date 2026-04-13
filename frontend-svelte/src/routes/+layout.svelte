<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { slide } from 'svelte/transition';
  import NewsLiveUpdater from '$lib/components/NewsLiveUpdater.svelte';
  import { organizationSchema, websiteSchema } from '$lib/utils/schemaOrg.js';
  import { jsonLd } from '$lib/utils/jsonld.js';
  import { onMount } from 'svelte';
  import { onNavigate } from '$app/navigation';

  let { data, children } = $props();

  let menuOpen = $state(false);

  // Close mobile menu on navigation
  $effect(() => {
    void $page.url.pathname;
    menuOpen = false;
  });

  const isNewsPage = $derived(/^\/news\/[^/]+$/.test($page.url.pathname));

  // Sections map for resolving sectionId → slug in menu items
  const sectionsMap = $derived(
    new Map(data.sections.map((s: { id: string; slug: string; title: string }) => [s.id, s]))
  );

  function menuUrl(item: { url?: string; sectionId?: string }) {
    if (item.url) return item.url;
    if (item.sectionId) {
      const sec = sectionsMap.get(item.sectionId);
      if (sec) return `/section/${sec.slug}`;
    }
    return '/';
  }

  // Menu: use API-defined items or fallback to first 5 sections
  const menuItems = $derived(
    data.headerMenu.length > 0
      ? data.headerMenu
      : data.sections.slice(0, 5).map((s: { id: string; title: string }) => ({
          id: s.id, label: s.title, sectionId: s.id,
        }))
  );
  const footerItems = $derived(
    data.footerMenu.length > 0
      ? data.footerMenu
      : data.sections.map((s: { id: string; title: string }) => ({
          id: s.id, label: s.title, sectionId: s.id,
        }))
  );

  // Page transitions via View Transitions API — fade+lift for all routes,
  // directional slide for news-to-news (direction set via data-nav-dir on <html>)
  onNavigate((navigation) => {
    if (!document.startViewTransition) return;

    return new Promise((resolve) => {
      const transition = document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
      transition.finished.finally(() => {
        delete document.documentElement.dataset.navDir;
      });
    });
  });

  // Load Inter font non-blocking (same technique as Nuxt version)
  onMount(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/fonts/inter.css';
    link.media = 'print';
    link.onload = () => { link.media = 'all'; };
    document.head.appendChild(link);
  });
</script>

<svelte:head>
  <title>Иваново Онлайн</title>
  <meta name="description" content="Свежие новости Иванова и Ивановской области" />
  <meta name="keywords" content="новости Иваново, Ивановская область, региональные новости" />
  <meta name="robots" content="index, follow" />
  <meta name="author" content="Иваново Онлайн" />
  <meta property="og:site_name" content="Иваново Онлайн" />
  <meta property="og:locale" content="ru_RU" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://ivanovo.online/og-image.jpg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@ivanovo_online" />
  <meta name="twitter:image" content="https://ivanovo.online/og-image.jpg" />
  {@html jsonLd(organizationSchema())}
  {@html jsonLd(websiteSchema())}
</svelte:head>

<div class="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
  <!-- Header -->
  <header class="bg-white/95 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-200 shadow-sm transform-gpu">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <a href="/" class="flex items-center">
          <img
            src="/ivanovo-logo.png"
            alt="Иваново Онлайн"
            width="1024"
            height="490"
            class="h-10 w-auto sm:h-12 object-contain"
          />
        </a>

        <!-- Burger (mobile) -->
        <button
          type="button"
          class="md:hidden flex flex-col justify-center gap-1.5 w-8 h-8 focus:outline-none"
          aria-label="Открыть меню"
          aria-expanded={menuOpen}
          onclick={() => (menuOpen = !menuOpen)}
        >
          <span class="block w-6 h-0.5 bg-gray-600 rounded-full transition-all origin-center {menuOpen ? 'rotate-45 translate-y-2' : ''}"></span>
          <span class="block w-6 h-0.5 bg-gray-600 rounded-full transition-all {menuOpen ? 'opacity-0' : ''}"></span>
          <span class="block w-6 h-0.5 bg-gray-600 rounded-full transition-all origin-center {menuOpen ? '-rotate-45 -translate-y-2' : ''}"></span>
        </button>

        <!-- Desktop nav -->
        <nav class="hidden md:flex items-center gap-6">
          {#each menuItems as item (item.id)}
            <a
              href={menuUrl(item)}
              class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors px-2 py-1 rounded-md hover:bg-blue-50 {$page.url.pathname === menuUrl(item) ? 'text-blue-600 bg-blue-50' : ''}"
            >
              {item.label}
            </a>
          {/each}
        </nav>
      </div>
    </div>
  </header>

  <!-- Mobile dropdown menu -->
  {#if menuOpen}
    <div
      transition:slide={{ duration: 200 }}
      class="md:hidden bg-white border-b border-gray-200 fixed top-16 left-0 right-0 z-40 px-4 py-4 flex flex-col gap-2 shadow-lg rounded-b-2xl"
    >
      {#each menuItems as item (item.id)}
        <a
          href={menuUrl(item)}
          class="text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-4 py-3 rounded-xl transition-colors"
        >
          {item.label}
        </a>
      {/each}
    </div>
  {/if}

  <!-- Main content -->
  <main
    style="view-transition-name: page-content"
    class="flex-1 w-full mx-auto py-8 md:py-12 {isNewsPage
      ? 'max-w-full'
      : 'max-w-7xl px-4 sm:px-6 lg:px-8'}"
  >
    {@render children()}
  </main>

  <!-- Footer -->
  {#if footerItems.length}
    <footer class="bg-white border-t border-gray-200 py-12 mt-auto">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col md:flex-row items-center justify-between gap-6">
          <div class="flex items-center gap-2">
            <img
              src="/ivanovo-logo.png"
              alt="Иваново Онлайн"
              width="1024"
              height="490"
              class="h-8 w-auto object-contain opacity-80"
            />
          </div>
          <div class="flex flex-wrap justify-center gap-x-6 gap-y-3">
            {#each footerItems as item (item.id)}
              <a
                href={menuUrl(item)}
                class="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                {item.label}
              </a>
            {/each}
          </div>
        </div>
        <div class="mt-8 pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <p class="text-sm text-gray-400">© 2026 Regional News Aggregator. All rights reserved.</p>
        </div>
      </div>
    </footer>
  {/if}
</div>

<!-- Socket.IO live updates — client-only, deferred 2 s -->
<NewsLiveUpdater apiBase={data.apiBase} />
