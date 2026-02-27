<template>
  <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
      <div>
        <h1 class="font-bold text-2xl text-gray-900 tracking-tight">Новости</h1>
        <p class="text-sm text-gray-500 mt-1">Управление новостным контентом</p>
      </div>
      <div class="flex items-center gap-4">
        <select v-model="statusFilter" class="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all">
          <option value="">Все статусы</option>
          <option value="PENDING">На модерации</option>
          <option value="PUBLISHED">Опубликовано</option>
          <option value="REJECTED">Отклонено</option>
        </select>
        <router-link to="/news/new" class="px-4 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 inline-flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" /></svg>
          Добавить
        </router-link>
      </div>
    </div>
    
    <div v-if="loading" class="animate-pulse space-y-4">
      <div v-for="i in 5" :key="i" class="h-16 bg-gray-50 rounded-2xl w-full"></div>
    </div>
    <div v-else-if="error" class="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-2 text-sm">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
      {{ error }}
    </div>
    <div class="overflow-x-auto" v-else>
      <table class="w-full text-left text-sm whitespace-nowrap">
        <thead>
          <tr class="text-gray-500 border-b border-gray-100">
            <th class="pb-3 px-4 font-medium w-1/2">Заголовок</th>
            <th class="pb-3 px-4 font-medium">Источник</th>
            <th class="pb-3 px-4 font-medium">Статус</th>
            <th class="pb-3 px-4 font-medium">Дата</th>
            <th class="pb-3 px-4 font-medium text-right">Действия</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="item in items" :key="item.id" class="hover:bg-gray-50/50 transition-colors group">
            <td class="py-4 px-4 font-medium text-gray-900 whitespace-normal">
              <span class="line-clamp-2 leading-snug">{{ item.title }}</span>
            </td>
            <td class="py-4 px-4 text-gray-500">{{ item.source?.name || 'Вручную' }}</td>
            <td class="py-4 px-4">
              <span 
                :class="{
                  'text-green-700 bg-green-50 border-green-100': item.status === 'PUBLISHED',
                  'text-amber-700 bg-amber-50 border-amber-100': item.status === 'PENDING',
                  'text-red-700 bg-red-50 border-red-100': item.status === 'REJECTED'
                }" 
                class="px-2.5 py-1 text-xs font-medium rounded-full border inline-flex items-center gap-1.5"
              >
                <span class="w-1.5 h-1.5 rounded-full" 
                  :class="{
                    'bg-green-500': item.status === 'PUBLISHED',
                    'bg-amber-500': item.status === 'PENDING',
                    'bg-red-500': item.status === 'REJECTED'
                  }">
                </span>
                {{ item.status === 'PUBLISHED' ? 'Опубликовано' : item.status === 'PENDING' ? 'Модерация' : 'Отклонено' }}
              </span>
            </td>
            <td class="py-4 px-4 text-gray-500">{{ formatDate(item.createdAt) }}</td>
            <td class="py-4 px-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <router-link :to="`/news/${item.id}`" class="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors">Ред.</router-link>
                <button v-if="item.status === 'PENDING'" class="px-3 py-1.5 bg-green-50 text-green-700 border border-green-100 text-xs font-medium rounded-lg hover:bg-green-100 transition-colors" @click="publish(item.id)">Опуб.</button>
                <button v-if="item.status === 'PENDING'" class="px-3 py-1.5 bg-red-50 text-red-700 border border-red-100 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors" @click="reject(item.id)">Откл.</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div v-if="items.length === 0 && !loading" class="text-center py-12">
      <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15M9 11l3 3L22 4" /></svg>
      </div>
      <h3 class="text-sm font-medium text-gray-900 mb-1">Нет новостей</h3>
      <p class="text-sm text-gray-500">По выбранным критериям ничего не найдено.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { api } from '../../api';

const statusFilter = ref('');
const items = ref<{ id: string; title?: string; source?: { name: string }; status: string; createdAt: string }[]>([]);
const loading = ref(true);
const error = ref('');

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const q = statusFilter.value ? `?status=${statusFilter.value}` : '';
    const data = await api().get<{ items: typeof items.value }>(`/api/admin/news${q}`);
    items.value = data.items;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка';
  } finally {
    loading.value = false;
  }
}

watch([statusFilter], load);
load();

function formatDate(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

async function publish(id: string) {
  try {
    await api().patch(`/api/admin/news/${id}/status`, { status: 'PUBLISHED' });
    load();
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка');
  }
}

async function reject(id: string) {
  try {
    await api().patch(`/api/admin/news/${id}/status`, { status: 'REJECTED' });
    load();
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка');
  }
}
</script>