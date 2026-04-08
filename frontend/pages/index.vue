<template>
  <div class="flex flex-col gap-16 md:gap-20">
    <AppBreadcrumbs :items="[]" class="hidden" />

    <!-- Top Stories -->
    <section>
      <div class="flex items-center justify-between mb-8">
        <h2 class="font-bold text-2xl md:text-3xl text-gray-900 tracking-tight flex items-center gap-3">
          <span class="w-1.5 h-6 bg-blue-600 rounded-full"></span>
          Главное за сегодня
        </h2>
      </div>
      
      <Transition name="fade" mode="out-in">
        <div v-if="topPending && !topData?.items?.length" key="top-skeleton" class="animate-pulse flex space-x-4">
          <div class="flex-1 space-y-4 py-1">
            <div class="h-6 bg-gray-200 rounded w-1/4"></div>
            <div class="h-64 bg-gray-200 rounded-2xl w-full mt-4"></div>
          </div>
        </div>
        <div v-else-if="topData?.items?.length" key="top-content">
          <TransitionGroup
            name="news-list"
            tag="div"
            class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8"
          >
            <div key="featured" class="lg:col-span-8">
              <NewsCard :item="topData.items[0]!" :featured="true" imagePosition="top" :priority="true" />
            </div>
            <div key="top-side" class="lg:col-span-4 flex flex-col gap-6">
              <NewsCard
                v-for="item in topData.items.slice(1, 3)"
                :key="item.id"
                :item="item"
                imagePosition="top"
              />
            </div>
          </TransitionGroup>
        </div>
        <p v-else key="top-empty" class="text-gray-500 bg-white p-8 rounded-2xl text-center border border-gray-100">Нет новостей для отображения.</p>
      </Transition>
    </section>

    <AdSlot placement-code="home_below_top_block" />

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
      <!-- Left Column: Region News -->
      <section v-if="region" class="lg:col-span-8">
        <div class="flex items-center justify-between mb-8">
          <h2 class="font-bold text-2xl text-gray-900 tracking-tight flex items-center gap-3">
            <span class="w-1.5 h-6 bg-blue-400 rounded-full"></span>
            Новости региона
          </h2>
          <NuxtLink v-if="regionSectionId" :to="'/section/region'" class="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 group">
            Все новости
            <span class="transform-gpu group-hover:translate-x-1 transition-transform">→</span>
          </NuxtLink>
        </div>
        <Transition name="fade" mode="out-in">
          <div v-if="regionPending && !regionData?.items?.length" key="region-skeleton" class="animate-pulse space-y-6">
            <div v-for="i in 3" :key="i" class="h-32 bg-gray-200 rounded-2xl w-full"></div>
          </div>
          <div v-else-if="regionData?.items?.length" key="region-content">
            <TransitionGroup
              name="news-list"
              tag="div"
              class="flex flex-col gap-6"
            >
              <NewsCard
                v-for="item in regionData.items"
                :key="item.id"
                :item="item"
                imagePosition="left"
              />
            </TransitionGroup>
          </div>
          <p v-else key="region-empty" class="text-gray-500 bg-white p-8 rounded-2xl text-center border border-gray-100">Нет региональных новостей.</p>
        </Transition>
      </section>

      <!-- Right Column: General News -->
      <aside class="lg:col-span-4">
        <div class="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm sticky top-24">
          <h2 class="font-bold text-xl text-gray-900 tracking-tight mb-6">Общая картина</h2>
          <Transition name="fade" mode="out-in">
            <div v-if="generalPending && !generalData?.items?.length" key="general-skeleton" class="animate-pulse space-y-6">
              <div v-for="i in 4" :key="i" class="h-16 bg-gray-200 rounded-xl w-full"></div>
            </div>
            <div v-else-if="generalData?.items?.length" key="general-content">
              <TransitionGroup
                name="news-list"
                tag="div"
                class="flex flex-col gap-6"
              >
                <NuxtLink
                  v-for="item in generalData.items"
                  :key="item.id"
                  :to="`/news/${item.id}`"
                  class="group block relative"
                >
                  <div class="flex items-start gap-4">
                    <div class="w-10 h-10 shrink-0 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {{ formatDateShort(item.sourcePublishedAt || item.publishedAt) }}
                    </div>
                    <div>
                      <h3 class="font-medium text-gray-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-3">{{ item.title }}</h3>
                    </div>
                  </div>
                </NuxtLink>

                <div v-if="generalData && generalData.total > generalData.items.length" key="more-link" class="pt-6 border-t border-gray-100 text-center mt-2">
                  <NuxtLink to="/section/general" class="inline-flex items-center justify-center w-full py-3 px-4 bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-600 text-sm font-medium rounded-xl transition-colors">
                    Показать больше
                  </NuxtLink>
                </div>
              </TransitionGroup>
            </div>
            <p v-else key="general-empty" class="text-gray-500 text-center py-4">Нет общих новостей.</p>
          </Transition>
        </div>
      </aside>
    </div>

    <!-- Sections Grid -->
    <section class="pt-8">
      <div class="flex items-center justify-center mb-12">
        <h2 class="font-bold text-3xl md:text-4xl text-gray-900 tracking-tight text-center">По темам</h2>
      </div>
      
      <Transition name="fade" mode="out-in">
      <div v-if="sectionsPending" key="sections-skeleton" class="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <div v-for="i in 3" :key="i" class="h-64 bg-gray-200 rounded-3xl w-full"></div>
      </div>
      <div v-else-if="sectionSlugs.length" key="sections-content" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        <div
          v-for="sec in sectionSlugs"
          :key="sec.id"
          class="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full"
        >
          <div class="mb-6 flex justify-between items-center">
            <NuxtLink :to="`/section/${sec.slug}`" class="font-bold text-xl text-gray-900 hover:text-blue-600 transition-colors flex items-center gap-2">
              <span class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-sm">#</span>
              {{ sec.title }}
            </NuxtLink>
          </div>
          
          <div v-if="sectionNewsMap.get(sec.id)?.length" class="flex flex-col gap-5 flex-1">
            <TransitionGroup name="news-list" tag="div" class="flex flex-col gap-5 flex-1">
              <NuxtLink
                v-for="n in (sectionNewsMap.get(sec.id) ?? []).slice(0, 3)"
                :key="n.id"
                :to="`/news/${n.id}`"
                class="group block border-b border-gray-100 pb-5 last:border-0 last:pb-0"
              >
                <h4 class="font-medium text-gray-800 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">{{ n.title }}</h4>
              </NuxtLink>
            </TransitionGroup>
          </div>
          <div v-else class="flex-1 flex items-center justify-center py-8">
             <p class="text-sm text-gray-400">Нет новостей</p>
          </div>
          
          <NuxtLink :to="`/section/${sec.slug}`" class="mt-6 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors group">
            Перейти в раздел 
            <span class="ml-1 transform-gpu group-hover:translate-x-1 transition-transform">→</span>
          </NuxtLink>
        </div>
      </div>
      </Transition>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';

const apiBase = useApiBase();
const region = useRegion();

// SEO Meta Tags
useHead({
  title: 'Главные новости Ивановской области',
  meta: [
    { 
      name: 'description', 
      content: 'Свежие новости Иванова и Ивановской области. Политика, общество, спорт, культура, экономика. Последние новости региона.' 
    },
    { property: 'og:title', content: 'Главные новости Ивановской области' },
    { property: 'og:description', content: 'Свежие новости Иванова и Ивановской области' },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: 'https://ivanovo.online/' },
  ],
  link: [
    { rel: 'canonical', href: 'https://ivanovo.online/' }
  ]
});

// WebPage Schema
useWebPageSchema({
  title: 'Главные новости Ивановской области',
  description: 'Свежие новости Иванова и Ивановской области',
  url: '/',
  type: 'WebPage'
});

type NewsItem = {
  id: string;
  title: string;
  summary?: string | null;
  imageUrl?: string | null;
  sourcePublishedAt?: string | null;
  publishedAt?: string | null;
  source?: { name: string } | null;
};
type NewsResponse = { items: NewsItem[]; total: number };
type Section = { id: string; slug: string; title: string };

function formatDateShort(d: string | undefined | null): string {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' }).replace('.', '');
}

// Sections (for links and section blocks)
const { data: sections, pending: sectionsPending } = await useFetch<Section[]>(`${apiBase}/api/sections`, { key: 'index-sections' });
const sectionSlugs = computed(() => {
  const list = sections.value ?? [];
  return list.filter((s) => ['top', 'main', 'region', 'general'].indexOf(s.slug) === -1);
});
const regionSectionId = computed(() => sections.value?.find((s) => s.slug === 'region')?.id ?? null);

// Top stories (with region if set)
const topQuery = computed(() => {
  const r = region ? `&region=${encodeURIComponent(region)}` : '';
  return `${apiBase}/api/news?limit=4${r}`;
});
const { data: topData, pending: topPending } = await useFetch<NewsResponse>(() => topQuery.value, { key: 'index-top' });

// Region block
const regionQuery = computed(() => (region ? `${apiBase}/api/news?region=${encodeURIComponent(region)}&limit=6` : ''));
const { data: regionData, pending: regionPending } = await useFetch<NewsResponse>(() => regionQuery.value, {
  key: 'index-region',
  watch: [regionQuery],
  immediate: !!region,
});

// General news (no region)
const generalQuery = computed(() => `${apiBase}/api/news?noRegion=1&limit=5`);
const { data: generalData, pending: generalPending } = await useFetch<NewsResponse>(() => generalQuery.value, {
  key: 'index-general',
  watch: [generalQuery],
  immediate: true,
});

// Section previews: fetch last 3 per section for sectionSlugs; refetch when refreshTrigger changes (live publication)
const { refreshTrigger } = useNewsLive();
const sectionNewsMap = ref<Map<string, NewsItem[]>>(new Map());
const sectionSlugsRef = computed(() => sectionSlugs.value);
watchEffect(async () => {
  const list = sectionSlugsRef.value;
  refreshTrigger.value; // depend on trigger so we refetch when news:published fires
  if (!list.length) return;
  const map = new Map<string, NewsItem[]>();
  await Promise.all(
    list.map(async (sec) => {
      const res = await $fetch<NewsResponse>(`${apiBase}/api/news?section=${sec.id}&limit=3`);
      map.set(sec.id, res.items ?? []);
    })
  );
  sectionNewsMap.value = map;
});
</script>

<style scoped>
/* ── News list item transitions ────────────────────────────────────────────
   Enter: materialise from below with blur (Jakub Krehel recipe)
   Exit:  subtle fade-up — quieter than enter so it doesn't compete
   Move:  smooth FLIP reorder
   Custom cubic-bezier instead of bare `ease` (Emil: "easing is the most
   important part of any animation")
──────────────────────────────────────────────────────────────────────── */
.news-list-enter-active {
  transition:
    opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    filter 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.news-list-leave-active {
  transition:
    opacity 0.18s cubic-bezier(0.4, 0, 1, 1),
    transform 0.18s cubic-bezier(0.4, 0, 1, 1),
    filter 0.18s cubic-bezier(0.4, 0, 1, 1);
  /* keep leaving item in flow so siblings don't jump */
  position: absolute;
  width: 100%;
}
.news-list-enter-from {
  opacity: 0;
  transform: translateY(8px);
  filter: blur(4px);
}
.news-list-leave-to {
  opacity: 0;
  transform: translateY(-6px);
  filter: blur(3px);
}
.news-list-move {
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

/* ── Skeleton → content fade ───────────────────────────────────────────── */
.fade-enter-active {
  transition: opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-leave-active {
  transition: opacity 0.15s cubic-bezier(0.4, 0, 1, 1);
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.fade-leave-to { opacity: 0; }

/* ── Respect reduced-motion preference ─────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .news-list-enter-active,
  .news-list-leave-active,
  .news-list-move,
  .fade-enter-active,
  .fade-leave-active {
    transition-duration: 0.01ms !important;
  }
  .news-list-enter-from,
  .news-list-leave-to,
  .fade-enter-from {
    transform: none !important;
    filter: none !important;
  }
}
</style>