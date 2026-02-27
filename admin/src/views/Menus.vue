<template>
  <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
    <div class="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="font-bold text-2xl text-gray-900 tracking-tight">Меню</h1>
        <p class="text-sm text-gray-500 mt-1">Навигационные меню на сайте</p>
      </div>
      <router-link
        to="/menus/new"
        class="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Добавить меню
      </router-link>
    </div>
    
    <div v-if="loading" class="animate-pulse space-y-4">
      <div v-for="i in 3" :key="i" class="h-16 bg-gray-50 rounded-2xl w-full"></div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" v-else>
      <router-link
        v-for="m in list"
        :key="m.id"
        :to="`/menus/${m.id}`"
        class="block p-5 rounded-2xl border border-gray-100 hover:border-blue-100 hover:shadow-md hover:shadow-blue-50 transition-all bg-gray-50/30 cursor-pointer"
      >
        <div class="flex items-start justify-between mb-4">
          <div>
            <span class="font-bold text-gray-900 block mb-0.5">{{ m.name }}</span>
            <span class="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{{ m.key }}</span>
          </div>
          <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
             {{ m._count?.items ?? 0 }}
          </div>
        </div>
        <p class="text-xs text-gray-500">Пунктов меню внутри</p>
      </router-link>
    </div>
    
    <div v-if="list.length === 0 && !loading" class="text-center py-12">
      <p class="text-sm text-gray-500">Меню не настроены.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../api';

const list = ref<{ id: string; name: string; key: string; _count?: { items: number } }[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    list.value = await api().get('/api/admin/menus');
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка');
  } finally {
    loading.value = false;
  }
});
</script>