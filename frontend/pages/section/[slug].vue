<template>
  <div>
    <h1>Раздел: {{ section?.title || slug }}</h1>
    <div v-if="pending" class="loading">Загрузка...</div>
    <div v-else-if="error" class="error">{{ error.message }}</div>
    <div v-else class="news-list">
      <NuxtLink
        v-for="item in data?.items"
        :key="item.id"
        :to="`/news/${item.id}`"
        class="news-card"
      >
        <h2 class="news-title">{{ item.title }}</h2>
        <p v-if="item.summary" class="news-summary">{{ item.summary }}</p>
        <span class="news-meta">{{ item.publishedAt ? formatDate(item.publishedAt) : '' }}</span>
      </NuxtLink>
      <p v-if="data?.items?.length === 0" class="empty">В этом разделе пока нет новостей.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const slug = route.params.slug as string;
const config = useRuntimeConfig();
const apiBase = config.public.apiBase as string;

const { data: sections } = await useFetch<{ id: string; slug: string; title: string }[]>(`${apiBase}/api/sections`);
const section = computed(() => sections.value?.find((s) => s.slug === slug));

const sectionId = computed(() => section.value?.id);
const { data, pending, error } = await useFetch<{ items: { id: string; title: string; summary?: string; publishedAt?: string }[] }>(
  () => `${apiBase}/api/news?section=${sectionId.value}&limit=20`,
  { watch: [sectionId] }
);

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ru-RU');
}
</script>

<style scoped>
.news-list { display: flex; flex-direction: column; gap: 1.5rem; }
.news-card {
  padding: 1rem;
  border: 1px solid #eee;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  display: block;
}
.news-card:hover { background: #f8f8f8; }
.news-title { margin: 0 0 0.5rem; font-size: 1.1rem; }
.news-summary { margin: 0; color: #555; }
.news-meta { font-size: 0.85rem; color: #888; }
.loading, .error, .empty { padding: 1rem; }
.error { color: #c00; }
</style>
