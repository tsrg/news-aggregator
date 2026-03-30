<template>
  <div class="max-w-5xl mx-auto">
    <AppBreadcrumbs :items="breadcrumbItems" class="mb-8 hidden md:flex" />
    
    <div class="bg-white p-8 md:p-12 rounded-3xl border border-gray-100 shadow-sm mb-12 text-center">
      <h1 class="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight">{{ pageTitle }}</h1>
      <div class="mt-4 w-16 h-1.5 bg-blue-600 rounded-full mx-auto"></div>
    </div>

    <div v-if="sectionNotFound" class="bg-gray-50 text-gray-500 p-12 rounded-3xl text-center border border-gray-100">
      <p class="font-medium text-lg">Раздел не найден.</p>
    </div>
    <div v-else-if="pending && !data?.items?.length" class="space-y-6">
      <div v-for="i in 5" :key="i" class="h-40 bg-white border border-gray-100 rounded-2xl animate-pulse"></div>
    </div>
    <div v-else-if="error" class="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 text-center">
      <p>{{ error.message }}</p>
    </div>
    <div v-else class="flex flex-col gap-6">
      <TransitionGroup name="news-list" tag="div" class="flex flex-col gap-6">
        <NewsCard
          v-for="item in data?.items"
          :key="item.id"
          :item="item"
          imagePosition="left"
        />
      </TransitionGroup>
      
      <div v-if="data?.items?.length === 0" class="bg-white text-gray-500 p-12 rounded-3xl text-center border border-gray-100">
        <p class="font-medium text-lg">В этом разделе пока нет новостей.</p>
      </div>
      
      <div v-else-if="data && data.total > data.items.length" class="mt-12 flex items-center justify-center gap-4 border-t border-gray-200 pt-8">
        <button 
          :disabled="page <= 1" 
          @click="page = Math.max(1, page - 1)"
          class="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          &larr; Назад
        </button>
        <span class="text-sm font-medium text-gray-500 bg-gray-100 px-4 py-2 rounded-lg">
          Страница {{ page }} из {{ totalPages }}
        </span>
        <button 
          :disabled="page >= totalPages" 
          @click="page = Math.min(totalPages, page + 1)"
          class="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Вперёд &rarr;
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from '#app';

const route = useRoute();
const slug = route.params.slug as string;
const apiBase = useApiBase();
const region = useRegion();

const { data: sections, pending: sectionsPending } = await useFetch<{ id: string; slug: string; title: string }[]>(`${apiBase}/api/sections`);
const section = computed(() => sections.value?.find((s) => s.slug === slug));
const sectionNotFound = computed(() => !sectionsPending.value && slug !== 'region' && slug !== 'general' && section.value === undefined);

// SEO
const pageTitle = computed(() => {
  if (slug === 'region') return 'Новости региона';
  if (slug === 'general') return 'Общие новости';
  return section.value?.title || slug;
});

const sectionDescriptions: Record<string, string> = {
  'region': 'Новости Ивановской области: события в Иванове и регионе',
  'politics': 'Политические новости Ивановской области',
  'society': 'Общественные события и социальные темы в Ивановской области',
  'sport': 'Спортивные новости Иванова и Ивановской области',
  'culture': 'Культурная жизнь Ивановской области: события, выставки, концерты',
  'economy': 'Экономика и бизнес Ивановской области',
  'general': 'Общие новости России и мира'
};

const description = computed(() => {
  return sectionDescriptions[slug] || `Новости раздела "${pageTitle.value}" на Иваново Онлайн`;
});

useHead(() => ({
  title: pageTitle.value,
  meta: [
    { name: 'description', content: description.value },
    { property: 'og:title', content: pageTitle.value },
    { property: 'og:description', content: description.value },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: `https://ivanovo.online/section/${slug}` },
  ],
  link: [
    { rel: 'canonical', href: `https://ivanovo.online/section/${slug}` }
  ]
}));

// Schema
useWebPageSchema({
  title: pageTitle.value,
  description: description.value,
  url: `/section/${slug}`,
  type: 'CollectionPage'
});

// Breadcrumb schema
const breadcrumbSchemaItems = computed(() => [
  { name: 'Главная', url: '/' },
  { name: pageTitle.value }
]);
useBreadcrumbSchema(breadcrumbSchemaItems);

const page = ref(1);
const limit = 20;

const isRegionSection = computed(() => slug === 'region' && !!region.value);
const isGeneralSection = computed(() => slug === 'general');

const newsQuery = computed(() => {
  const base = `${apiBase}/api/news?limit=${limit}&page=${page.value}`;
  if (isRegionSection.value) {
    return `${base}&region=${encodeURIComponent(region.value as string)}`;
  }
  if (isGeneralSection.value) {
    return `${base}&noRegion=1`;
  }
  const sectionId = section.value?.id;
  if (!sectionId) return '';
  return `${base}&section=${sectionId}`;
});

const hasValidQuery = computed(() => !!newsQuery.value);

const { data, pending, error } = await useFetch<{ items: { id: string; title: string; summary?: string; publishedAt?: string; sourcePublishedAt?: string | null; source?: { name: string }; imageUrl?: string | null }[]; total: number }>(
  () => (hasValidQuery.value ? newsQuery.value : null),
  { key: `section-news-${slug}`, watch: [newsQuery, hasValidQuery], immediate: true }
);

const totalPages = computed(() => {
  const t = data.value?.total ?? 0;
  return Math.max(1, Math.ceil(t / limit));
});

const breadcrumbItems = computed(() => [
  { label: 'Главная', to: '/' },
  { label: pageTitle.value },
]);
</script>

<style scoped>
.news-list-enter-active,
.news-list-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.news-list-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.news-list-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
.news-list-move {
  transition: transform 0.25s ease;
}
</style>