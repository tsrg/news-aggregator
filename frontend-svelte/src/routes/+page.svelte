<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import NewsCard from '$lib/components/NewsCard.svelte';
  import { webPageSchema } from '$lib/utils/schemaOrg.js';
  import { jsonLd } from '$lib/utils/jsonld.js';

  let { data } = $props();

  function formatDateShort(d: string | null | undefined): string {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' }).replace('.', '');
  }
</script>

<svelte:head>
  <title>Главные новости Ивановской области | Иваново Онлайн</title>
  <meta name="description" content="Свежие новости Иванова и Ивановской области сегодня — политика, общество, спорт, культура, экономика. Читайте последние события региона на Иваново Онлайн." />
  <meta property="og:title" content="Главные новости Ивановской области | Иваново Онлайн" />
  <meta property="og:description" content="Свежие новости Иванова и Ивановской области — политика, общество, спорт, культура, экономика." />
  <meta property="og:url" content="https://ivanovo.online/" />
  <link rel="canonical" href="https://ivanovo.online/" />
  {@html jsonLd(webPageSchema({ title: 'Главные новости Ивановской области', description: 'Свежие новости Иванова и Ивановской области', url: '/', type: 'WebPage' }))}
</svelte:head>

<div class="flex flex-col gap-16 md:gap-20">
  <!-- Top Stories -->
  <section>
    <h1 class="sr-only">Новости Иванова и Ивановской области</h1>
    <div class="flex items-center justify-between mb-8">
      <h2 class="font-bold text-2xl md:text-3xl text-gray-900 tracking-tight flex items-center gap-3">
        <span class="w-1.5 h-6 bg-blue-600 rounded-full"></span>
        Главное за сегодня
      </h2>
    </div>

    {#if data.top.items.length}
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <div class="lg:col-span-8">
          <NewsCard item={data.top.items[0]} featured={true} imagePosition="top" priority={true} />
        </div>
        <div class="lg:col-span-4 flex flex-col gap-6">
          {#each data.top.items.slice(1, 3) as item (item.id)}
            <div animate:flip={{ duration: 280 }} in:fly={{ y: 8, duration: 250 }} out:fly={{ y: -6, duration: 180 }}>
              <NewsCard {item} imagePosition="top" />
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <p class="text-gray-500 bg-white p-8 rounded-2xl text-center border border-gray-100">Нет новостей для отображения.</p>
    {/if}
  </section>

  <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
    <!-- Region News -->
    {#if data.region && data.regionData}
      <section class="lg:col-span-8">
        <div class="flex items-center justify-between mb-8">
          <h2 class="font-bold text-2xl text-gray-900 tracking-tight flex items-center gap-3">
            <span class="w-1.5 h-6 bg-blue-400 rounded-full"></span>
            Новости региона
          </h2>
          {#if data.regionSectionId}
            <a href="/section/region" class="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 group">
              Все новости
              <span class="transform-gpu group-hover:translate-x-1 transition-transform">→</span>
            </a>
          {/if}
        </div>
        {#if data.regionData.items.length}
          <div class="flex flex-col gap-6">
            {#each data.regionData.items as item (item.id)}
              <div animate:flip={{ duration: 280 }} in:fly={{ y: 8, duration: 250 }} out:fly={{ y: -6, duration: 180 }}>
                <NewsCard {item} imagePosition="left" />
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-gray-500 bg-white p-8 rounded-2xl text-center border border-gray-100">Нет региональных новостей.</p>
        {/if}
      </section>
    {/if}

    <!-- General News sidebar -->
    <aside class="lg:col-span-4">
      <div class="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm sticky top-24">
        <h2 class="font-bold text-xl text-gray-900 tracking-tight mb-6">Общая картина</h2>
        {#if data.general.items.length}
          <div class="flex flex-col gap-6">
            {#each data.general.items as item (item.id)}
              <a href="/news/{item.id}" class="group block relative" in:fly={{ y: 8, duration: 250 }}>
                <div class="flex items-start gap-4">
                  <div class="w-10 h-10 shrink-0 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {formatDateShort(item.sourcePublishedAt || item.publishedAt)}
                  </div>
                  <div>
                    <h3 class="font-medium text-gray-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-3">{item.title}</h3>
                  </div>
                </div>
              </a>
            {/each}
            {#if data.general.total > data.general.items.length}
              <div class="pt-6 border-t border-gray-100 text-center mt-2">
                <a href="/section/general" class="inline-flex items-center justify-center w-full py-3 px-4 bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-600 text-sm font-medium rounded-xl transition-colors">
                  Показать больше
                </a>
              </div>
            {/if}
          </div>
        {:else}
          <p class="text-gray-500 text-center py-4">Нет общих новостей.</p>
        {/if}
      </div>
    </aside>
  </div>

  <!-- Sections Grid -->
  <section class="pt-8">
    <div class="flex items-center justify-center mb-12">
      <h2 class="font-bold text-3xl md:text-4xl text-gray-900 tracking-tight text-center">По темам</h2>
    </div>
    {#if data.sectionSlugs.length}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {#each data.sectionSlugs as sec (sec.id)}
          <div
            class="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full"
            in:fade={{ duration: 220 }}
          >
            <div class="mb-6 flex justify-between items-center">
              <a href="/section/{sec.slug}" class="font-bold text-xl text-gray-900 hover:text-blue-600 transition-colors flex items-center gap-2">
                <span class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-sm">#</span>
                {sec.title}
              </a>
            </div>

            {#if data.sectionNews[sec.id]?.length}
              <div class="flex flex-col gap-5 flex-1">
                {#each (data.sectionNews[sec.id] ?? []).slice(0, 3) as n (n.id)}
                  <a href="/news/{n.id}" class="group block border-b border-gray-100 pb-5 last:border-0 last:pb-0">
                    <h4 class="font-medium text-gray-800 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">{n.title}</h4>
                  </a>
                {/each}
              </div>
            {:else}
              <div class="flex-1 flex items-center justify-center py-8">
                <p class="text-sm text-gray-400">Нет новостей</p>
              </div>
            {/if}

            <a href="/section/{sec.slug}" class="mt-6 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors group">
              Перейти в раздел
              <span class="ml-1 transform-gpu group-hover:translate-x-1 transition-transform">→</span>
            </a>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>

<style>
  @media (prefers-reduced-motion: reduce) {
    * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
  }
</style>
