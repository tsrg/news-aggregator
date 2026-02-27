<template>
  <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
    <div class="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="font-bold text-2xl text-gray-900 tracking-tight">Разделы</h1>
        <p class="text-sm text-gray-500 mt-1">Категории для организации новостей</p>
      </div>
      <router-link
        to="/sections/new"
        class="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shrink-0"
      >
        Добавить раздел
      </router-link>
    </div>
    
    <div v-if="loading" class="animate-pulse space-y-4">
      <div v-for="i in 4" :key="i" class="h-16 bg-gray-50 rounded-2xl w-full"></div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4" v-else>
      <div v-for="s in list" :key="s.id" class="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-blue-100 transition-all bg-gray-50/30 gap-4">
        <div>
          <span class="font-medium text-gray-900 block mb-0.5">{{ s.title }}</span>
          <span class="font-mono text-xs text-gray-500">/{{ s.slug }}</span>
        </div>
        <div class="flex items-center gap-3 self-start sm:self-auto">
          <span :class="s.isVisible ? 'text-green-700 bg-green-50 border-green-100' : 'text-gray-500 bg-gray-100 border-gray-200'" class="px-2.5 py-1 text-xs font-medium rounded-full border">
            {{ s.isVisible ? 'Видим' : 'Скрыт' }}
          </span>
          <router-link
            :to="`/sections/${s.id}`"
            class="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            Изменить
          </router-link>
        </div>
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