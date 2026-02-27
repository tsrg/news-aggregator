<template>
  <div class="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
    <header class="bg-white/95 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-200 shadow-sm transform-gpu">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <NuxtLink to="/" class="font-bold text-xl tracking-tight text-gray-900 hover:text-blue-600 transition-colors flex items-center gap-2">
            <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-lg leading-none">N</span>
            </div>
            <span>News<span class="text-blue-600">App</span></span>
          </NuxtLink>
          
          <button
            type="button"
            class="md:hidden flex flex-col justify-center gap-1.5 w-8 h-8 focus:outline-none"
            aria-label="Открыть меню"
            :aria-expanded="menuOpen"
            @click="menuOpen = !menuOpen"
          >
            <span class="block w-6 h-0.5 bg-gray-600 rounded-full transition-all origin-center" :class="menuOpen ? 'rotate-45 translate-y-2' : ''" />
            <span class="block w-6 h-0.5 bg-gray-600 rounded-full transition-all" :class="menuOpen ? 'opacity-0' : ''" />
            <span class="block w-6 h-0.5 bg-gray-600 rounded-full transition-all origin-center" :class="menuOpen ? '-rotate-45 -translate-y-2' : ''" />
          </button>

          <nav
            class="hidden md:flex items-center gap-6"
          >
            <NuxtLink
              v-for="item in menuItems"
              :key="item.id"
              :to="item.url || (item.sectionId ? `/section/${sectionsMap.get(item.sectionId)?.slug}` : '#')"
              class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors px-2 py-1 rounded-md hover:bg-blue-50"
              active-class="text-blue-600 bg-blue-50"
            >
              {{ item.label }}
            </NuxtLink>
          </nav>
        </div>
      </div>
    </header>
    
    <div v-if="menuOpen" class="md:hidden bg-white border-b border-gray-200 fixed top-16 left-0 right-0 z-40 px-4 py-4 flex flex-col gap-2 shadow-lg rounded-b-2xl">
      <NuxtLink
        v-for="item in menuItems"
        :key="item.id"
        :to="item.url || (item.sectionId ? `/section/${sectionsMap.get(item.sectionId)?.slug}` : '#')"
        class="text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-4 py-3 rounded-xl transition-colors"
        active-class="text-blue-600 bg-blue-50"
        @click="menuOpen = false"
      >
        {{ item.label }}
      </NuxtLink>
    </div>

    <main class="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <slot />
    </main>

    <footer v-if="footerItems.length" class="bg-white border-t border-gray-200 py-12 mt-auto">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col md:flex-row items-center justify-between gap-6">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 bg-gray-200 rounded-md flex items-center justify-center">
              <span class="text-gray-500 font-bold text-xs leading-none">N</span>
            </div>
            <span class="font-bold text-gray-400">NewsApp</span>
          </div>
          <div class="flex flex-wrap justify-center gap-x-6 gap-y-3">
            <NuxtLink
              v-for="item in footerItems"
              :key="item.id"
              :to="item.url || (item.sectionId ? `/section/${sectionsMap.get(item.sectionId)?.slug}` : '#')"
              class="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              {{ item.label }}
            </NuxtLink>
          </div>
        </div>
        <div class="mt-8 pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <p class="text-sm text-gray-400">
            © 2026 Regional News Aggregator. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
/// <reference path="../global.d.ts" />
import { ref, computed } from 'vue';

type Section = { id: string; slug: string; title: string };

const apiBase = useApiBase();
const menuOpen = ref(false);

// @ts-ignore - top-level await is supported by Nuxt (module/target set in .nuxt/tsconfig)
const { data: sections } = await useFetch<Section[]>(`${apiBase}/api/sections`, { key: 'layout-sections' });
const sectionsMap = computed(() => {
  const list = sections.value ?? [];
  return new Map<string, Section>(list.map((s: Section) => [s.id, s]));
});

// @ts-ignore - top-level await is supported by Nuxt (module/target set in .nuxt/tsconfig)
const { data: headerData } = await useFetch<{ items?: { id: string; label: string; url?: string; sectionId?: string }[] }>(
  `${apiBase}/api/menus/header`,
  { key: 'layout-header' }
);
// @ts-ignore - top-level await is supported by Nuxt (module/target set in .nuxt/tsconfig)
const { data: footerData } = await useFetch<{ items?: { id: string; label: string; url?: string; sectionId?: string }[] }>(
  `${apiBase}/api/menus/footer`,
  { key: 'layout-footer' }
);

function flattenItems(items: { id: string; label: string; url?: string; sectionId?: string; children?: { id: string; label: string; url?: string; sectionId?: string }[] }[] | undefined): { id: string; label: string; url?: string; sectionId?: string }[] {
  if (!items) return [];
  const out: { id: string; label: string; url?: string; sectionId?: string }[] = [];
  for (const it of items) {
    out.push({ id: it.id, label: it.label, url: it.url, sectionId: it.sectionId });
    if (Array.isArray(it.children)) out.push(...flattenItems(it.children));
  }
  return out;
}

const menuItems = computed(() => {
  const items = flattenItems(headerData.value?.items);
  if (items.length > 0) return items;
  // Fallback: use sections if no menu is configured
  return (sections.value || []).slice(0, 5).map((s: Section) => ({
    id: s.id,
    label: s.title,
    sectionId: s.id,
    url: ''
  }));
});

const footerItems = computed(() => {
  const items = flattenItems(footerData.value?.items);
  if (items.length > 0) return items;
  // Fallback: use sections if no menu is configured
  return (sections.value || []).map((s: Section) => ({
    id: s.id,
    label: s.title,
    sectionId: s.id,
    url: ''
  }));
});
</script>