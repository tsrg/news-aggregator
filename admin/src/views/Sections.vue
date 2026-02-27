<template>
  <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
    <div class="mb-8">
      <h1 class="font-bold text-2xl text-gray-900 tracking-tight">Разделы</h1>
      <p class="text-sm text-gray-500 mt-1">Категории для организации новостей</p>
    </div>
    
    <div v-if="loading" class="animate-pulse space-y-4">
      <div v-for="i in 4" :key="i" class="h-16 bg-gray-50 rounded-2xl w-full"></div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4" v-else>
      <div v-for="s in list" :key="s.id" class="flex justify-between items-center p-4 rounded-2xl border border-gray-100 hover:border-blue-100 hover:shadow-md hover:shadow-blue-50 transition-all bg-gray-50/30">
        <div>
          <span class="font-medium text-gray-900 block mb-0.5">{{ s.title }}</span>
          <span class="font-mono text-xs text-gray-500">/{{ s.slug }}</span>
        </div>
        <span :class="s.isVisible ? 'text-green-700 bg-green-50 border-green-100' : 'text-gray-500 bg-gray-100 border-gray-200'" class="px-2.5 py-1 text-xs font-medium rounded-full border">
          {{ s.isVisible ? 'Видим' : 'Скрыт' }}
        </span>
      </div>
    </div>
    
    <div v-if="list.length === 0 && !loading" class="text-center py-12">
      <p class="text-sm text-gray-500">Нет доступных разделов.</p>
    </div>
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