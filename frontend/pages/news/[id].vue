<template>
  <div class="max-w-3xl mx-auto">
    <AppBreadcrumbs v-if="data" :items="breadcrumbItems" class="mb-8" />
    
    <div v-if="pending" class="animate-pulse space-y-8">
      <div class="h-10 bg-gray-200 rounded-xl w-3/4"></div>
      <div class="h-4 bg-gray-200 rounded w-1/4"></div>
      <div class="h-64 bg-gray-200 rounded-3xl w-full"></div>
      <div class="space-y-4">
        <div class="h-4 bg-gray-200 rounded w-full"></div>
        <div class="h-4 bg-gray-200 rounded w-full"></div>
        <div class="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
    
    <div v-else-if="error" class="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 flex flex-col items-center justify-center text-center">
      <div class="text-3xl mb-2">😕</div>
      <h3 class="font-bold text-lg mb-1">Ой, произошла ошибка</h3>
      <p class="text-sm opacity-80">{{ error.message }}</p>
    </div>
    
    <div v-else-if="!data" class="bg-gray-50 text-gray-500 p-12 rounded-3xl text-center border border-gray-100">
      <p class="font-medium text-lg">Новость не найдена</p>
    </div>
    
    <article v-else class="bg-white p-6 md:p-10 rounded-[2rem] border border-gray-100 shadow-sm">
      <div class="mb-8">
        <div class="flex items-center gap-3 text-sm font-medium text-blue-600 mb-4 flex-wrap">
          <NuxtLink v-if="data.section" :to="`/section/${data.section.slug}`" class="px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors">
            {{ data.section.title }}
          </NuxtLink>
          <span class="text-gray-400 flex items-center gap-2">
             <span class="w-1 h-1 bg-gray-300 rounded-full"></span> 
             {{ formatDate(data.publishedAt || data.createdAt) }}
          </span>
          <span v-if="data.source" class="text-gray-400 flex items-center gap-2">
             <span class="w-1 h-1 bg-gray-300 rounded-full"></span> 
             Источник: <span class="text-gray-600 font-semibold">{{ data.source.name }}</span>
          </span>
        </div>
        <h1 class="text-3xl md:text-5xl font-bold text-gray-900 leading-tight tracking-tight mb-6">{{ data.title }}</h1>
        <p v-if="data.summary" class="text-lg md:text-xl text-gray-500 leading-relaxed font-medium">{{ data.summary }}</p>
      </div>

      <div v-if="data.imageUrl" class="mb-10 rounded-2xl overflow-hidden shadow-sm aspect-video bg-gray-100">
        <img
          :src="data.imageUrl"
          :alt="data.title"
          class="w-full h-full object-cover"
          fetchpriority="high"
          decoding="async"
        />
      </div>

      <div v-if="data.body" class="prose prose-lg prose-blue max-w-none text-gray-700 leading-relaxed marker:text-blue-600" v-html="sanitizedBody"></div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import { useRoute, useNuxtApp } from '#app';

const route = useRoute();
const apiBase = useApiBase();

const { data, pending, error } = await useFetch<{
  id: string;
  title: string;
  summary?: string;
  body?: string;
  imageUrl?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt?: string;
  source?: { name: string };
  section?: { slug: string; title: string } | null;
}>(() => `${apiBase}/api/news/${route.params.id}`, { key: `news-${route.params.id}` });

// SEO Meta Tags
useHead(() => {
  if (!data.value) return {};
  
  const description = data.value.summary || 
    (data.value.body ? data.value.body.substring(0, 160).replace(/<[^>]*>/g, '') : '') ||
    'Новость на Иваново Онлайн';
  
  const url = `https://ivanovo.online/news/${data.value.id}`;
  
  return {
    title: data.value.title,
    meta: [
      { name: 'description', content: description },
      { property: 'og:title', content: data.value.title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'article' },
      { property: 'og:url', content: url },
      { property: 'og:image', content: data.value.imageUrl || 'https://ivanovo.online/og-image.jpg' },
      { property: 'article:published_time', content: data.value.publishedAt || data.value.createdAt },
      { property: 'article:modified_time', content: data.value.updatedAt || data.value.publishedAt || data.value.createdAt },
      { property: 'article:section', content: data.value.section?.title || 'Новости' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: data.value.title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: data.value.imageUrl || 'https://ivanovo.online/og-image.jpg' },
    ],
    link: [
      { rel: 'canonical', href: url }
    ]
  };
});

// Schema.org разметка
useNewsArticleSchema(data);

// Breadcrumb schema
const breadcrumbSchemaItems = computed(() => {
  if (!data.value) return [];
  const items: { name: string; url?: string }[] = [{ name: 'Главная', url: '/' }];
  if (data.value.section) {
    items.push({ name: data.value.section.title, url: `/section/${data.value.section.slug}` });
  }
  items.push({ name: data.value.title });
  return items;
});
useBreadcrumbSchema(breadcrumbSchemaItems);

const breadcrumbItems = computed(() => {
  if (!data.value) return [];
  const items: { label: string; to?: string }[] = [{ label: 'Главная', to: '/' }];
  if (data.value.section) {
    items.push({ label: data.value.section.title, to: `/section/${data.value.section.slug}` });
  }
  items.push({ label: data.value.title });
  return items;
});

const sanitizedBody = ref('');
const nuxt = useNuxtApp();
watchEffect(async () => {
  const raw = data.value?.body ?? '';
  if (!raw) {
    sanitizedBody.value = '';
    return;
  }
  try {
    sanitizedBody.value = await (nuxt.$sanitize as (html: string) => Promise<string>)(raw);
  } catch {
    sanitizedBody.value = raw.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  }
});

function formatDate(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}
</script>

<style>
/* Base typography styling for the article body since we don't have typography plugin */
.prose p {
  margin-bottom: 1.5em;
}
.prose h2 {
  font-size: 1.875rem;
  font-weight: 700;
  color: #111827;
  margin-top: 2em;
  margin-bottom: 1em;
  line-height: 1.3;
  letter-spacing: -0.025em;
}
.prose h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin-top: 1.6em;
  margin-bottom: 0.8em;
  line-height: 1.4;
}
.prose a {
  color: #2563EB;
  text-decoration: none;
  font-weight: 500;
}
.prose a:hover {
  text-decoration: underline;
}
.prose ul {
  list-style-type: disc;
  padding-left: 1.5em;
  margin-bottom: 1.5em;
}
.prose ol {
  list-style-type: decimal;
  padding-left: 1.5em;
  margin-bottom: 1.5em;
}
.prose li {
  margin-bottom: 0.5em;
}
.prose blockquote {
  border-left: 4px solid #E5E7EB;
  padding-left: 1em;
  font-style: italic;
  color: #4B5563;
  margin-bottom: 1.5em;
  background: #F9FAFB;
  padding: 1.5em;
  border-radius: 0 1rem 1rem 0;
}
.prose img {
  border-radius: 1rem;
  margin-top: 2em;
  margin-bottom: 2em;
}
</style>