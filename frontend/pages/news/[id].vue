<template>
  <div class="w-full 2xl:px-6 overflow-x-hidden">
    <AppBreadcrumbs v-if="data" :items="breadcrumbItems" class="mb-8 max-w-3xl mx-auto" />
    <div class="2xl:grid 2xl:grid-cols-[minmax(0,1fr)_48rem_minmax(0,1fr)] 2xl:gap-6 2xl:items-start">
      <aside class="hidden 2xl:block">
        <NuxtLink
          v-if="data?.prev"
          :to="`/news/${data.prev.id}`"
          class="block bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm opacity-60 hover:opacity-80 transition-opacity"
          aria-label="Перейти к предыдущей новости"
        >
          <div class="mb-6">
            <div class="flex items-center gap-3 text-sm font-medium text-blue-600 mb-4 flex-wrap">
              <span class="px-3 py-1 bg-blue-50 rounded-full">Предыдущая новость</span>
              <span v-if="previewDate(data.prev)" class="text-gray-400">{{ previewDate(data.prev) }}</span>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 leading-tight tracking-tight mb-4">{{ data.prev.title }}</h2>
            <p v-if="data.prev.summary" class="text-base text-gray-500 leading-relaxed font-medium line-clamp-4">
              {{ data.prev.summary }}
            </p>
          </div>
          <div v-if="data.prev.imageUrl" class="rounded-2xl overflow-hidden shadow-sm aspect-video bg-gray-100">
            <img :src="data.prev.imageUrl" :alt="data.prev.title" class="w-full h-full object-cover" loading="lazy" decoding="async" />
          </div>
        </NuxtLink>
      </aside>

      <div class="max-w-3xl mx-auto w-full 2xl:max-w-none">
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
          <span
            v-if="displayPublishedAt"
            class="text-gray-400 flex items-center gap-2 flex-wrap"
          >
            <span class="w-1 h-1 bg-gray-300 rounded-full shrink-0"></span>
            <time :datetime="displayPublishedAt" class="text-gray-500">
              <span v-if="data.sourcePublishedAt" class="text-gray-400">В источнике · </span>
              {{ formatDateTime(displayPublishedAt) }}
            </time>
          </span>
          <span v-if="data.source && !sourceSnapshotsList.length" class="text-gray-400 flex items-center gap-2">
             <span class="w-1 h-1 bg-gray-300 rounded-full"></span> 
             Источник: <span class="text-gray-600 font-semibold">{{ data.source.name }}</span>
          </span>
          <span v-else-if="sourceSnapshotsList.length" class="text-gray-400 flex items-center gap-2 flex-wrap">
            <span class="w-1 h-1 bg-gray-300 rounded-full shrink-0"></span>
            <span class="text-gray-600">Источники:</span>
            <span
              v-for="(s, idx) in sourceSnapshotsList"
              :key="s.sourceId + String(idx)"
              class="text-gray-600 font-semibold"
            >
              {{ s.sourceName }}<span v-if="idx < sourceSnapshotsList.length - 1">, </span>
            </span>
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

      <div
        v-if="data.body"
        class="article-overview prose prose-lg prose-blue max-w-none text-gray-700 leading-relaxed marker:text-blue-600"
        v-html="sanitizedBody"
      />

      <section
        v-if="sourceSnapshotsList.length"
        class="mt-10 pt-8 border-t border-gray-100"
      >
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Оригинальные материалы</h2>
        <ul class="space-y-3 text-sm text-gray-600">
          <li v-for="(s, idx) in sourceSnapshotsList" :key="`snap-${idx}-${s.sourceId}`">
            <a
              v-if="s.url"
              :href="s.url"
              class="text-blue-600 font-medium hover:underline"
              rel="noopener noreferrer"
              target="_blank"
            >{{ s.sourceName }}</a>
            <span v-else class="font-medium">{{ s.sourceName }}</span>
            <span v-if="s.originalTitle" class="text-gray-500"> — {{ s.originalTitle }}</span>
          </li>
        </ul>
      </section>
    </article>

        <section v-if="data && (data.prev || data.next)" class="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 2xl:hidden">
      <NuxtLink
        v-if="data.prev"
        :to="`/news/${data.prev.id}`"
        class="group relative h-40 rounded-2xl overflow-hidden border border-gray-200 bg-gray-100"
        aria-label="Перейти к предыдущей новости"
      >
        <img
          v-if="data.prev.imageUrl"
          :src="data.prev.imageUrl"
          :alt="data.prev.title"
          class="w-full h-full object-cover blur-[2px] scale-105 transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
          decoding="async"
        />
        <div v-else class="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
        <div class="absolute inset-0 bg-black/35" />
        <div class="absolute inset-0 p-4 flex flex-col justify-between text-white">
          <span class="text-xs font-semibold uppercase tracking-wide opacity-90">Предыдущая новость</span>
          <div>
            <p class="text-sm md:text-base font-semibold line-clamp-2">{{ data.prev.title }}</p>
            <p v-if="previewDate(data.prev)" class="mt-1 text-xs text-white/85">{{ previewDate(data.prev) }}</p>
          </div>
        </div>
      </NuxtLink>
      <div v-else class="hidden md:block" />

      <NuxtLink
        v-if="data.next"
        :to="`/news/${data.next.id}`"
        class="group relative h-40 rounded-2xl overflow-hidden border border-gray-200 bg-gray-100"
        aria-label="Перейти к следующей новости"
      >
        <img
          v-if="data.next.imageUrl"
          :src="data.next.imageUrl"
          :alt="data.next.title"
          class="w-full h-full object-cover blur-[2px] scale-105 transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
          decoding="async"
        />
        <div v-else class="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
        <div class="absolute inset-0 bg-black/35" />
        <div class="absolute inset-0 p-4 flex flex-col justify-between text-white text-right">
          <span class="text-xs font-semibold uppercase tracking-wide opacity-90">Следующая новость</span>
          <div>
            <p class="text-sm md:text-base font-semibold line-clamp-2">{{ data.next.title }}</p>
            <p v-if="previewDate(data.next)" class="mt-1 text-xs text-white/85">{{ previewDate(data.next) }}</p>
          </div>
        </div>
      </NuxtLink>
        </section>
      </div>

      <aside class="hidden 2xl:block">
        <NuxtLink
          v-if="data?.next"
          :to="`/news/${data.next.id}`"
          class="block bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm opacity-60 hover:opacity-80 transition-opacity"
          aria-label="Перейти к следующей новости"
        >
          <div class="mb-6">
            <div class="flex items-center justify-end gap-3 text-sm font-medium text-blue-600 mb-4 flex-wrap">
              <span v-if="previewDate(data.next)" class="text-gray-400">{{ previewDate(data.next) }}</span>
              <span class="px-3 py-1 bg-blue-50 rounded-full">Следующая новость</span>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 leading-tight tracking-tight mb-4 text-right">{{ data.next.title }}</h2>
            <p v-if="data.next.summary" class="text-base text-gray-500 leading-relaxed font-medium line-clamp-4 text-right">
              {{ data.next.summary }}
            </p>
          </div>
          <div v-if="data.next.imageUrl" class="rounded-2xl overflow-hidden shadow-sm aspect-video bg-gray-100">
            <img :src="data.next.imageUrl" :alt="data.next.title" class="w-full h-full object-cover" loading="lazy" decoding="async" />
          </div>
        </NuxtLink>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import { useRoute, useNuxtApp } from '#app';

const route = useRoute();
const apiBase = useApiBase();

type SourceSnapshot = {
  sourceId: string;
  sourceName: string;
  url?: string | null;
  originalTitle?: string;
};

type AdjacentNewsPreview = {
  id: string;
  title: string;
  summary?: string;
  imageUrl?: string;
  publishedAt?: string;
  createdAt?: string;
};

const { data, pending, error } = await useFetch<{
  id: string;
  title: string;
  summary?: string;
  body?: string;
  imageUrl?: string;
  sourcePublishedAt?: string | null;
  publishedAt?: string;
  createdAt: string;
  updatedAt?: string;
  source?: { name: string };
  section?: { slug: string; title: string } | null;
  sourceSnapshots?: SourceSnapshot[] | null;
  prev?: AdjacentNewsPreview | null;
  next?: AdjacentNewsPreview | null;
}>(() => `${apiBase}/api/news/${route.params.id}`, { key: `news-${route.params.id}` });

const sourceSnapshotsList = computed((): SourceSnapshot[] => {
  const raw = data.value?.sourceSnapshots;
  if (!raw || !Array.isArray(raw)) return [];
  return raw.filter(
    (x): x is SourceSnapshot =>
      x !== null &&
      typeof x === 'object' &&
      'sourceId' in x &&
      typeof (x as SourceSnapshot).sourceName === 'string',
  );
});

const displayPublishedAt = computed(() =>
  data.value?.sourcePublishedAt || data.value?.publishedAt || data.value?.createdAt || null,
);


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
      { property: 'article:published_time', content: data.value.sourcePublishedAt || data.value.publishedAt || data.value.createdAt },
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

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  });
}

function previewDate(item: AdjacentNewsPreview) {
  const date = item.publishedAt || item.createdAt;
  if (!date) return '';
  return formatDateTime(date);
}
</script>

<style>
/* Обзор из нескольких источников: читаемые подзаголовки и абзацы */
.article-overview.prose p {
  line-height: 1.75;
  margin-bottom: 1.15em;
}
.article-overview.prose p:has(> strong:only-child) {
  margin-top: 2rem;
  margin-bottom: 0.65rem;
}
.article-overview.prose p:has(> strong:only-child) > strong {
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.02em;
}
.article-overview.prose ul {
  margin-top: 0.5em;
  margin-bottom: 1.35em;
}
.article-overview.prose li {
  margin-bottom: 0.65em;
  line-height: 1.7;
}
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