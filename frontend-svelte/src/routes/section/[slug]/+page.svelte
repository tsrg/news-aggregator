<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { fly, fade } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import NewsCard from '$lib/components/NewsCard.svelte';
  import AppBreadcrumbs from '$lib/components/AppBreadcrumbs.svelte';
  import { webPageSchema, breadcrumbSchema } from '$lib/utils/schemaOrg.js';

  let { data } = $props();

  function goToPage(p: number) {
    const url = new URL($page.url);
    url.searchParams.set('page', String(p));
    goto(url.toString());
  }
</script>

<svelte:head>
  <title>{data.pageTitle} | Иваново Онлайн</title>
  <meta name="description" content={data.description} />
  <meta property="og:title" content="{data.pageTitle} | Иваново Онлайн" />
  <meta property="og:description" content={data.description} />
  <meta property="og:url" content="https://ivanovo.online/section/{data.slug}" />
  <link rel="canonical" href="https://ivanovo.online/section/{data.slug}" />
  {@html jsonLd(webPageSchema({ title: data.pageTitle, description: data.description, url: `/section/${data.slug}`, type: 'CollectionPage' }))}
  {@html jsonLd(breadcrumbSchema([{ name: 'Главная', url: '/' }, { name: data.pageTitle }]))}
</svelte:head>

<div class="max-w-5xl mx-auto">
  <AppBreadcrumbs items={[{ label: data.pageTitle }]} class="mb-8 hidden md:flex" />

  <div class="bg-white p-8 md:p-12 rounded-3xl border border-gray-100 shadow-sm mb-12 text-center">
    <h1 class="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight">{data.pageTitle}</h1>
    <div class="mt-4 w-16 h-1.5 bg-blue-600 rounded-full mx-auto"></div>
  </div>

  {#if data.sectionNotFound}
    <div class="bg-gray-50 text-gray-500 p-12 rounded-3xl text-center border border-gray-100">
      <p class="font-medium text-lg">Раздел не найден.</p>
    </div>
  {:else if data.news.items.length === 0}
    <div class="bg-white text-gray-500 p-12 rounded-3xl text-center border border-gray-100">
      <p class="font-medium text-lg">В этом разделе пока нет новостей.</p>
    </div>
  {:else}
    <div class="flex flex-col gap-6">
      {#each data.news.items as item (item.id)}
        <div animate:flip={{ duration: 280 }} in:fly={{ y: 8, duration: 250 }} out:fly={{ y: -6, duration: 180 }}>
          <NewsCard {item} imagePosition="left" />
        </div>
      {/each}

      {#if data.totalPages > 1}
        <div class="mt-12 flex items-center justify-center gap-4 border-t border-gray-200 pt-8">
          <button
            disabled={data.page <= 1}
            onclick={() => goToPage(data.page - 1)}
            class="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-95"
          >
            ← Назад
          </button>
          <span class="text-sm font-medium text-gray-500 bg-gray-100 px-4 py-2 rounded-lg">
            Страница {data.page} из {data.totalPages}
          </span>
          <button
            disabled={data.page >= data.totalPages}
            onclick={() => goToPage(data.page + 1)}
            class="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-95"
          >
            Вперёд →
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  @media (prefers-reduced-motion: reduce) {
    * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
  }
</style>
