<template>
  <div>
    <div v-if="pending" class="loading">Загрузка...</div>
    <div v-else-if="error || !page" class="error">Страница не найдена</div>
    <article v-else class="page">
      <h1>{{ page.title }}</h1>
      <div class="body" v-html="sanitizedBody"></div>
    </article>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const slug = route.params.slug as string;
const config = useRuntimeConfig();
const apiBase = config.public.apiBase as string;

const { data: page, pending, error } = await useFetch<{ title: string; body: string }>(
  () => `${apiBase}/api/pages/${slug}`,
  { key: `page-${slug}` }
);

const sanitizedBody = computed(() => {
  const raw = page.value?.body ?? '';
  const nuxt = useNuxtApp();
  if (nuxt.$sanitize) return nuxt.$sanitize(raw);
  return raw.replace(/<script\b[\s\S]*?<\/script>/gi, '');
});
</script>

<style scoped>
.page { max-width: 700px; line-height: 1.6; }
.body :deep(a) { color: #0d6efd; }
.loading, .error { padding: 1rem; }
.error { color: #c00; }
</style>
