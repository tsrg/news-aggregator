<script lang="ts">
  import { onMount } from 'svelte';
  import AppBreadcrumbs from '$lib/components/AppBreadcrumbs.svelte';
  import { webPageSchema, breadcrumbSchema } from '$lib/utils/schemaOrg.js';
  import { jsonLd } from '$lib/utils/jsonld.js';

  let { data } = $props();
  const { slug, page } = data;

  let sanitizedBody = $state(page.body ?? '');
  onMount(async () => {
    if (page.body) {
      const { default: DOMPurify } = await import('dompurify');
      sanitizedBody = DOMPurify.sanitize(page.body);
    }
  });

  const description = $derived(
    page.body ? page.body.substring(0, 160).replace(/<[^>]*>/g, '') : page.title
  );
  const canonicalUrl = `https://ivanovo.online/${slug}`;
</script>

<svelte:head>
  <title>{page.title} | Иваново Онлайн</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={page.title} />
  <meta property="og:description" content={description} />
  <link rel="canonical" href={canonicalUrl} />
  {@html jsonLd(webPageSchema({ title: page.title, description, url: `/${slug}` }))}
  {@html jsonLd(breadcrumbSchema([{ name: 'Главная', url: '/' }, { name: page.title }]))}
</svelte:head>

<div class="max-w-3xl mx-auto">
  <AppBreadcrumbs items={[{ label: page.title }]} class="mb-8" />

  <article class="bg-white p-8 md:p-12 rounded-[2rem] border border-gray-100 shadow-sm">
    <h1 class="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight mb-8">{page.title}</h1>
    <div class="prose prose-lg prose-blue max-w-none text-gray-700 leading-relaxed">
      {@html sanitizedBody}
    </div>
  </article>
</div>
