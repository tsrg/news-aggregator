<template>
  <div class="max-w-3xl mx-auto">
    <AppBreadcrumbs v-if="page" :items="[{ label: 'Главная', to: '/' }, { label: page.title }]" class="mb-8" />
    
    <div v-if="pending" class="animate-pulse space-y-8">
      <div class="h-12 bg-gray-200 rounded-xl w-3/4"></div>
      <div class="space-y-4">
        <div class="h-4 bg-gray-200 rounded w-full"></div>
        <div class="h-4 bg-gray-200 rounded w-full"></div>
        <div class="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
    
    <div v-else-if="error || !page" class="bg-gray-50 text-gray-500 p-12 rounded-3xl text-center border border-gray-100">
      <p class="font-medium text-lg">Страница не найдена</p>
    </div>
    
    <article v-else class="bg-white p-8 md:p-12 rounded-[2rem] border border-gray-100 shadow-sm">
      <h1 class="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight mb-8">{{ page.title }}</h1>
      <div class="prose prose-lg prose-blue max-w-none text-gray-700 leading-relaxed marker:text-blue-600" v-html="sanitizedBody"></div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { useRoute, useNuxtApp } from '#app';

const route = useRoute();
const slug = route.params.slug as string;
const apiBase = useApiBase();

const { data: page, pending, error } = await useFetch<{ title: string; body: string }>(
  () => `${apiBase}/api/pages/${slug}`,
  { key: `page-${slug}` }
);

const sanitizedBody = ref('');
const nuxt = useNuxtApp();
watchEffect(async () => {
  const raw = page.value?.body ?? '';
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
</script>

<style>
/* Base typography styling for the article body since we don't have typography plugin */
.prose p { margin-bottom: 1.5em; }
.prose h2 { font-size: 1.875rem; font-weight: 700; color: #111827; margin-top: 2em; margin-bottom: 1em; line-height: 1.3; letter-spacing: -0.025em; }
.prose h3 { font-size: 1.5rem; font-weight: 700; color: #111827; margin-top: 1.6em; margin-bottom: 0.8em; line-height: 1.4; }
.prose a { color: #2563EB; text-decoration: none; font-weight: 500; }
.prose a:hover { text-decoration: underline; }
.prose ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1.5em; }
.prose ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1.5em; }
.prose li { margin-bottom: 0.5em; }
</style>