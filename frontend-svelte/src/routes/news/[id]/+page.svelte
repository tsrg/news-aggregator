<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import AppBreadcrumbs from '$lib/components/AppBreadcrumbs.svelte';
  import { newsArticleSchema, breadcrumbSchema } from '$lib/utils/schemaOrg.js';
  import { jsonLd } from '$lib/utils/jsonld.js';

  let { data } = $props();
  const { article } = data;

  // DOMPurify: run client-side for extra XSS protection
  let sanitizedBody = $state(article.body ?? '');
  onMount(async () => {
    if (article.body) {
      const { default: DOMPurify } = await import('dompurify');
      sanitizedBody = DOMPurify.sanitize(article.body);
    }
  });

  const sourceSnapshots = $derived(
    Array.isArray(article.sourceSnapshots)
      ? article.sourceSnapshots.filter(
          (x: unknown): x is { sourceId: string; sourceName: string; url?: string | null; originalTitle?: string } =>
            x !== null && typeof x === 'object' && 'sourceName' in (x as object)
        )
      : []
  );

  const displayPublishedAt = $derived(
    article.sourcePublishedAt || article.publishedAt || article.createdAt || null
  );

  const description = $derived(
    article.summary ||
    (article.body ? article.body.substring(0, 160).replace(/<[^>]*>/g, '') : '') ||
    'Новость на Иваново Онлайн'
  );

  const canonicalUrl = `https://ivanovo.online/news/${article.id}`;

  const breadcrumbItems = $derived([
    { label: 'Главная', to: '/' },
    ...(article.section ? [{ label: article.section.title, to: `/section/${article.section.slug}` }] : []),
    { label: article.title },
  ]);

  function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow',
    });
  }
  function previewDate(item: { publishedAt?: string; createdAt?: string }) {
    const d = item.publishedAt || item.createdAt;
    return d ? formatDateTime(d) : '';
  }
</script>

<svelte:head>
  <title>{article.title} | Иваново Онлайн</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={article.title} />
  <meta property="og:description" content={description} />
  <meta property="og:type" content="article" />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:image" content={article.imageUrl || 'https://ivanovo.online/og-image.jpg'} />
  <meta property="article:section" content={article.section?.title || 'Новости'} />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="canonical" href={canonicalUrl} />
  {@html jsonLd(newsArticleSchema(article))}
  {@html jsonLd(breadcrumbSchema([
    { name: 'Главная', url: '/' },
    ...(article.section ? [{ name: article.section.title, url: `/section/${article.section.slug}` }] : []),
    { name: article.title },
  ]))}
</svelte:head>

<div class="w-full 2xl:px-6 overflow-x-hidden">
  <AppBreadcrumbs items={breadcrumbItems.slice(1)} class="mb-8 max-w-3xl mx-auto" />

  <div class="2xl:grid 2xl:grid-cols-[minmax(0,1fr)_48rem_minmax(0,1fr)] 2xl:gap-6 2xl:items-start">

    <!-- Prev article (desktop) -->
    <aside class="hidden 2xl:block">
      {#if article.prev}
        <a href="/news/{article.prev.id}" class="block bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm opacity-60 hover:opacity-80 transition-opacity">
          <div class="mb-6">
            <div class="flex items-center gap-3 text-sm font-medium text-blue-600 mb-4 flex-wrap">
              <span class="px-3 py-1 bg-blue-50 rounded-full">Предыдущая новость</span>
              {#if previewDate(article.prev)}<span class="text-gray-400">{previewDate(article.prev)}</span>{/if}
            </div>
            <h2 class="text-2xl font-bold text-gray-900 leading-tight tracking-tight mb-4">{article.prev.title}</h2>
            {#if article.prev.summary}<p class="text-base text-gray-500 leading-relaxed font-medium line-clamp-4">{article.prev.summary}</p>{/if}
          </div>
          {#if article.prev.imageUrl}
            <div class="rounded-2xl overflow-hidden shadow-sm aspect-video bg-gray-100">
              <img src={article.prev.imageUrl} alt={article.prev.title} class="w-full h-full object-cover" loading="lazy" decoding="async" />
            </div>
          {/if}
        </a>
      {/if}
    </aside>

    <!-- Main article -->
    <div class="max-w-3xl mx-auto w-full 2xl:max-w-none">
      <article class="bg-white p-6 md:p-10 rounded-[2rem] border border-gray-100 shadow-sm">
        <div class="mb-8">
          <div class="flex items-center gap-3 text-sm font-medium text-blue-600 mb-4 flex-wrap">
            {#if article.section}
              <a href="/section/{article.section.slug}" class="px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors">{article.section.title}</a>
            {/if}
            {#if displayPublishedAt}
              <span class="text-gray-400 flex items-center gap-2 flex-wrap">
                <span class="w-1 h-1 bg-gray-300 rounded-full shrink-0"></span>
                <time datetime={displayPublishedAt} class="text-gray-500">
                  {#if article.sourcePublishedAt}<span class="text-gray-400">В источнике · </span>{/if}
                  {formatDateTime(displayPublishedAt)}
                </time>
              </span>
            {/if}
            {#if sourceSnapshots.length === 0 && article.source}
              <span class="text-gray-400 flex items-center gap-2">
                <span class="w-1 h-1 bg-gray-300 rounded-full"></span>
                Источник: <span class="text-gray-600 font-semibold">{article.source.name}</span>
              </span>
            {:else if sourceSnapshots.length > 0}
              <span class="text-gray-400 flex items-center gap-2 flex-wrap">
                <span class="w-1 h-1 bg-gray-300 rounded-full shrink-0"></span>
                <span class="text-gray-600">Источники:</span>
                {#each sourceSnapshots as s, idx}
                  <span class="text-gray-600 font-semibold">{s.sourceName}{idx < sourceSnapshots.length - 1 ? ', ' : ''}</span>
                {/each}
              </span>
            {/if}
          </div>
          <h1 class="text-3xl md:text-5xl font-bold text-gray-900 leading-tight tracking-tight mb-6">{article.title}</h1>
          {#if article.summary}<p class="text-lg md:text-xl text-gray-500 leading-relaxed font-medium">{article.summary}</p>{/if}
        </div>

        {#if article.imageUrl}
          <div class="mb-10 rounded-2xl overflow-hidden shadow-sm aspect-video bg-gray-100">
            <img src={article.imageUrl} alt={article.title} class="w-full h-full object-cover" fetchpriority="high" decoding="async" />
          </div>
        {/if}

        {#if article.body}
          <div class="article-overview prose prose-lg prose-blue max-w-none text-gray-700 leading-relaxed">
            {@html sanitizedBody}
          </div>
        {/if}

        {#if sourceSnapshots.length}
          <section class="mt-10 pt-8 border-t border-gray-100">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Оригинальные материалы</h2>
            <ul class="space-y-3 text-sm text-gray-600">
              {#each sourceSnapshots as s, idx}
                <li>
                  {#if s.url}
                    <a href={s.url} class="text-blue-600 font-medium hover:underline" rel="noopener noreferrer" target="_blank">{s.sourceName}</a>
                  {:else}
                    <span class="font-medium">{s.sourceName}</span>
                  {/if}
                  {#if s.originalTitle}<span class="text-gray-500"> — {s.originalTitle}</span>{/if}
                </li>
              {/each}
            </ul>
          </section>
        {/if}
      </article>

      <!-- Prev/Next navigation (mobile / tablet) -->
      {#if article.prev || article.next}
        <section class="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 2xl:hidden">
          {#if article.prev}
            <a href="/news/{article.prev.id}" class="group relative h-40 rounded-2xl overflow-hidden border border-gray-200 bg-gray-100">
              {#if article.prev.imageUrl}
                <img src={article.prev.imageUrl} alt={article.prev.title} class="w-full h-full object-cover blur-[2px] scale-105 transition-transform duration-300 group-hover:scale-110" loading="lazy" decoding="async" />
              {:else}
                <div class="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300"></div>
              {/if}
              <div class="absolute inset-0 bg-black/35"></div>
              <div class="absolute inset-0 p-4 flex flex-col justify-between text-white">
                <span class="text-xs font-semibold uppercase tracking-wide opacity-90">Предыдущая новость</span>
                <div>
                  <p class="text-sm md:text-base font-semibold line-clamp-2">{article.prev.title}</p>
                  {#if previewDate(article.prev)}<p class="mt-1 text-xs text-white/85">{previewDate(article.prev)}</p>{/if}
                </div>
              </div>
            </a>
          {:else}
            <div class="hidden md:block"></div>
          {/if}

          {#if article.next}
            <a href="/news/{article.next.id}" class="group relative h-40 rounded-2xl overflow-hidden border border-gray-200 bg-gray-100">
              {#if article.next.imageUrl}
                <img src={article.next.imageUrl} alt={article.next.title} class="w-full h-full object-cover blur-[2px] scale-105 transition-transform duration-300 group-hover:scale-110" loading="lazy" decoding="async" />
              {:else}
                <div class="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300"></div>
              {/if}
              <div class="absolute inset-0 bg-black/35"></div>
              <div class="absolute inset-0 p-4 flex flex-col justify-between text-white text-right">
                <span class="text-xs font-semibold uppercase tracking-wide opacity-90">Следующая новость</span>
                <div>
                  <p class="text-sm md:text-base font-semibold line-clamp-2">{article.next.title}</p>
                  {#if previewDate(article.next)}<p class="mt-1 text-xs text-white/85">{previewDate(article.next)}</p>{/if}
                </div>
              </div>
            </a>
          {/if}
        </section>
      {/if}
    </div>

    <!-- Next article (desktop) -->
    <aside class="hidden 2xl:block">
      {#if article.next}
        <a href="/news/{article.next.id}" class="block bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm opacity-60 hover:opacity-80 transition-opacity">
          <div class="mb-6">
            <div class="flex items-center justify-end gap-3 text-sm font-medium text-blue-600 mb-4 flex-wrap">
              {#if previewDate(article.next)}<span class="text-gray-400">{previewDate(article.next)}</span>{/if}
              <span class="px-3 py-1 bg-blue-50 rounded-full">Следующая новость</span>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 leading-tight tracking-tight mb-4 text-right">{article.next.title}</h2>
            {#if article.next.summary}<p class="text-base text-gray-500 leading-relaxed font-medium line-clamp-4 text-right">{article.next.summary}</p>{/if}
          </div>
          {#if article.next.imageUrl}
            <div class="rounded-2xl overflow-hidden shadow-sm aspect-video bg-gray-100">
              <img src={article.next.imageUrl} alt={article.next.title} class="w-full h-full object-cover" loading="lazy" decoding="async" />
            </div>
          {/if}
        </a>
      {/if}
    </aside>
  </div>
</div>
