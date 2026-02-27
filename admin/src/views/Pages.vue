<template>
  <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
    <div class="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="font-bold text-2xl text-gray-900 tracking-tight">Страницы</h1>
        <p class="text-sm text-gray-500 mt-1">Статические страницы (О нас, Контакты и т.д.)</p>
      </div>
      <router-link
        to="/pages/new"
        class="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shrink-0"
      >
        Добавить страницу
      </router-link>
    </div>

    <div v-if="loading" class="animate-pulse space-y-4">
      <div v-for="i in 3" :key="i" class="h-16 bg-gray-50 rounded-2xl w-full"></div>
    </div>
    <div class="flex flex-col gap-3" v-else>
      <div v-for="p in list" :key="p.id" class="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-blue-100 transition-all bg-gray-50/30 gap-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <div>
            <router-link :to="`/${p.slug}`" class="font-medium text-gray-900 hover:text-blue-600 transition-colors">{{ p.title }}</router-link>
            <span class="block font-mono text-xs text-gray-500 mt-0.5">/{{ p.slug }}</span>
          </div>
        </div>
        <div class="flex items-center gap-3 self-start sm:self-auto">
          <span :class="p.isVisible ? 'text-green-700 bg-green-50 border-green-100' : 'text-gray-500 bg-gray-100 border-gray-200'" class="px-2.5 py-1 text-xs font-medium rounded-full border">
            {{ p.isVisible ? 'Опубликована' : 'Скрыта' }}
          </span>
          <router-link
            :to="`/pages/${p.id}`"
            class="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            Изменить
          </router-link>
        </div>
      </div>
    </div>
    
    <div v-if="list.length === 0 && !loading" class="text-center py-12">
      <p class="text-sm text-gray-500">Страниц пока нет.</p>
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
    list.value = await api().get('/api/admin/pages');
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка');
  } finally {
    loading.value = false;
  }
});
</script>