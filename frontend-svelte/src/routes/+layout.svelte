<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import NewsLiveUpdater from '$lib/components/NewsLiveUpdater.svelte';
  import { organizationSchema, websiteSchema } from '$lib/utils/schemaOrg.js';
  import { jsonLd } from '$lib/utils/jsonld.js';
  import { onMount } from 'svelte';
  import { afterNavigate } from '$app/navigation';

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

  // ── Page transitions ─────────────────────────────────────────────────────
  // Анимация на РЕАЛЬНОМ DOM через Svelte fly + {#key}.
  // Преимущество перед View Transitions API: нет дорогого snapshot всего <main>
  // (Chrome из-за этого дроп-фреймил на длинных статьях). Анимируется один
  // wrapper-div через transform: translate3d + opacity — всё на GPU.
  let isFirstRender = $state(true);
  $effect(() => {
    void $page.url.pathname; // подписка
    if (isFirstRender) isFirstRender = false;
  });

  // Очищаем data-nav-dir после завершения навигации (с задержкой,
  // чтобы успел доиграть `in:` транзишн)
  afterNavigate(() => {
    setTimeout(() => {
      if (typeof document !== 'undefined') {
        delete document.documentElement.dataset.navDir;
      }
    }, 600);
  });

  function navDir(): 'next' | 'prev' | null {
    if (typeof document === 'undefined') return null;
    const d = document.documentElement.dataset.navDir;
    return d === 'next' || d === 'prev' ? d : null;
  }

  /**
   * Единая transition-функция для page-обёртки.
   * - News ↔ news (data-nav-dir): чистый horizontal slide на 100% без opacity
   *   и без blur. Старый и новый элементы всё время непрозрачны и просто
   *   едут в одну сторону — настоящая карусель, нет момента моргания.
   * - Остальные переходы: только `out:` (fade + lift + blur), `in:` мгновенный.
   */
  function pageTransition(
    _node: Element,
    p: { isOut: boolean },
  ) {
    if (isFirstRender) return { duration: 0 };
    const dir = navDir();

    // News ↔ news: чистый slide, оба слоя всегда opacity 1
    if (dir === 'next' || dir === 'prev') {
      const distance = dir === 'next' ? -100 : 100; // куда уходит OUT
      return {
        duration: 380,
        easing: cubicOut,
        css: (_t: number, u: number) => {
          const pct = p.isOut ? u * distance : u * -distance;
          return `transform: translate3d(${pct}%, 0, 0);`;
        },
      };
    }

    // Default: только out, in мгновенный
    if (p.isOut) {
      return {
        duration: 220,
        easing: cubicOut,
        css: (t: number, u: number) =>
          `opacity: ${t};` +
          `transform: translate3d(0, ${u * -8}px, 0);` +
          `filter: blur(${(u * 3).toFixed(2)}px);`,
      };
    }
    return { duration: 0 };
  }

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
    class="flex-1 w-full mx-auto py-8 md:py-12 overflow-x-hidden grid grid-cols-1 page-stack {isNewsPage
      ? 'max-w-full'
      : 'max-w-7xl px-4 sm:px-6 lg:px-8'}"
  >
    {#key $page.url.pathname}
      <div in:pageTransition={{ isOut: false }} out:pageTransition={{ isOut: true }} class="page-anim">
        {@render children()}
      </div>
    {/key}
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
