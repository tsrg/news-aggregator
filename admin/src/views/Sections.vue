<template>
  <div class="bg-surface border-2 border-borderline p-6 shadow-sm">
    <div class="flex items-center justify-between mb-8 border-b-2 border-borderline pb-4">
      <h1 class="font-bold text-2xl uppercase tracking-wider text-ink">Разделы</h1>
    </div>
    
    <div v-if="loading" class="animate-pulse flex space-x-4">
      <div class="flex-1 space-y-4 py-1">
        <div class="h-4 bg-canvas rounded w-3/4"></div>
        <div class="space-y-2">
          <div class="h-4 bg-canvas rounded"></div>
          <div class="h-4 bg-canvas rounded w-5/6"></div>
        </div>
      </div>
    </div>
    <ul v-else class="flex flex-col border-t border-borderline">
      <li v-for="s in list" :key="s.id" class="flex justify-between items-center p-4 border-b border-borderline hover:bg-canvas transition-colors">
        <span class="font-sans font-semibold text-lg">{{ s.title }} <span class="font-mono text-sm text-muted bg-canvas px-2 py-1 ml-2 border border-borderline">{{ s.slug }}</span></span>
        <span :class="s.isVisible ? 'text-green-600 border-green-600' : 'text-red-600 border-red-600'" class="px-2 py-1 border font-bold text-xs uppercase tracking-wider">
          {{ s.isVisible ? 'Видим' : 'Скрыт' }}
        </span>
      </li>
    </ul>
    <p v-if="list.length === 0 && !loading" class="text-muted font-mono italic p-4">Разделов нет.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../api';

const list = ref<{ id: string; title: string; slug: string; isVisible: boolean }[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    list.value = await api().get('/api/admin/sections');
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка');
  } finally {
    loading.value = false;
  }
});
</script>