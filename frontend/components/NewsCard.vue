<template>
  <NuxtLink :to="`/news/${item.id}`" class="group block bg-white rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-[transform,box-shadow] duration-300 border border-gray-100 h-full flex flex-col will-change-transform">
    <div :class="['flex flex-col gap-0 h-full', imagePosition === 'left' ? 'md:flex-row' : '']">
      <div
        v-if="item.imageUrl"
        :class="[
          'overflow-hidden w-full relative bg-gray-100',
          imagePosition === 'left' ? 'md:w-2/5 shrink-0' : '',
          featured ? 'aspect-video md:aspect-video' : 'aspect-[4/3] md:aspect-[4/3]'
        ]"
      >
        <img
          :src="item.imageUrl"
          :alt="item.title || ''"
          class="w-full h-full object-cover transform-gpu group-hover:scale-105 transition-transform duration-700 ease-out will-change-transform"
          :loading="priority ? undefined : 'lazy'"
          :fetchpriority="priority ? 'high' : undefined"
          :decoding="priority ? 'async' : undefined"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      </div>
      <div class="flex flex-col justify-between flex-1 p-5 md:p-6 bg-white">
        <div>
          <div class="flex items-center gap-2 text-xs font-medium text-blue-600 mb-3">
            <span v-if="item.source?.name" class="px-2.5 py-1 bg-blue-50 rounded-full">{{ item.source.name }}</span>
            <ClientOnly>
              <span class="text-gray-400">{{ formatDate(displayDate) }}</span>
              <template #fallback>
                <span class="text-gray-400">{{ formatDateUTC(displayDate) }}</span>
              </template>
            </ClientOnly>
          </div>
          <h2 class="font-bold text-gray-900 leading-snug group-hover:text-blue-600 transition-colors" :class="featured ? 'text-2xl md:text-4xl mb-4' : 'text-lg md:text-xl mb-3'">{{ item.title }}</h2>
          <p v-if="item.summary" class="text-gray-500 leading-relaxed" :class="featured ? 'text-base md:text-lg mb-6 line-clamp-3' : 'text-sm mb-4 line-clamp-2'">{{ item.summary }}</p>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  item: {
    id: string;
    title: string;
    summary?: string | null;
    imageUrl?: string | null;
    publishedAt?: string | null;
    sourcePublishedAt?: string | null;
    source?: { name: string } | null;
  };
  featured?: boolean;
  imagePosition?: 'top' | 'left';
  /** Set true for LCP candidate (e.g. first card above the fold) to avoid lazy load and use fetchpriority="high" */
  priority?: boolean;
}>();

const displayDate = computed(() => props.item.sourcePublishedAt || props.item.publishedAt);

function formatDate(d: string | undefined | null): string {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  const diffMs = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isSameLocalDay = now.getDate() === date.getDate() &&
    now.getMonth() === date.getMonth() &&
    now.getFullYear() === date.getFullYear();
  if (diffDays <= 1 && isSameLocalDay) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

/** UTC version for SSR fallback so server and ClientOnly fallback match (avoids hydration mismatch). */
function formatDateUTC(d: string | undefined | null): string {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  const diffMs = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const opts: Intl.DateTimeFormatOptions = { timeZone: 'UTC' };
  const isSameUTCDay = now.getUTCDate() === date.getUTCDate() &&
    now.getUTCMonth() === date.getUTCMonth() &&
    now.getUTCFullYear() === date.getUTCFullYear();
  if (diffDays <= 1 && isSameUTCDay) {
    return date.toLocaleTimeString('ru-RU', { ...opts, hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('ru-RU', { ...opts, day: 'numeric', month: 'short' });
}
</script>