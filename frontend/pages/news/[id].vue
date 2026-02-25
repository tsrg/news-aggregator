<template>
  <div>
    <div v-if="pending" class="loading">Загрузка...</div>
    <div v-else-if="error" class="error">{{ error.message }}</div>
    <div v-else-if="!data" class="error">Не найдено</div>
    <article v-else class="article">
      <h1>{{ data.title }}</h1>
      <p class="meta">{{ formatDate(data.publishedAt || data.createdAt) }} · {{ data.source?.name }}</p>
      <img v-if="data.imageUrl" :src="data.imageUrl" alt="" class="thumb" />
      <p v-if="data.summary" class="summary">{{ data.summary }}</p>
      <div v-if="data.body" class="body" v-html="sanitizedBody"></div>
    </article>
  </div>
</template>

<script setup lang="ts">
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
  source?: { name: string };
}>(() => `${apiBase}/api/news/${route.params.id}`);

const sanitizedBody = computed(() => {
  const raw = data.value?.body ?? '';
  const nuxt = useNuxtApp();
  if (nuxt.$sanitize) return nuxt.$sanitize(raw);
  return raw.replace(/<script\b[\s\S]*?<\/script>/gi, '');
});

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ru-RU');
}
</script>

<style scoped>
.article { max-width: 700px; }
.meta { color: #666; font-size: 0.9rem; }
.thumb { max-width: 100%; border-radius: 8px; margin: 1rem 0; }
.summary { font-size: 1.05rem; color: #444; }
.body { margin-top: 1rem; line-height: 1.6; }
.loading, .error { padding: 1rem; }
.error { color: #c00; }
</style>
