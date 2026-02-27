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
        <select v-model="regionFilter" class="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all">
          <option value="">Все регионы</option>
          <option value="Иваново">Иваново</option>
          <option value="Другой">Другой</option>
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
            <th class="pb-3 px-4 font-medium">Регион</th>
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
            <td class="py-4 px-4 text-gray-500">{{ item.region || '—' }}</td>
            <td class="py-4 px-4">
              <select
                :value="item.status"
                class="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-2.5 py-1.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all min-w-[140px]"
                @change="onStatusChange(item, $event)"
              >
                <option value="PENDING">На модерации</option>
                <option value="PUBLISHED">Опубликовано</option>
                <option value="REJECTED">Отклонено</option>
              </select>
            </td>
            <td class="py-4 px-4 text-gray-500">{{ formatDate(item.createdAt) }}</td>
            <td class="py-4 px-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <router-link :to="`/news/${item.id}`" class="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors">Ред.</router-link>
                <button
                  type="button"
                  class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Удалить"
                  @click="remove(item)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
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

    <!-- Пагинация -->
    <div v-if="total > limit && !loading" class="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p class="text-sm text-gray-500">
        Показано {{ (page - 1) * limit + 1 }}–{{ Math.min(page * limit, total) }} из {{ total }}
      </p>
      <div class="flex items-center gap-2">
        <button
          :disabled="page <= 1"
          class="px-3 py-2 text-sm font-medium rounded-xl border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :class="page <= 1 ? 'border-gray-100 text-gray-400 bg-gray-50' : 'border-gray-200 text-gray-700 hover:bg-gray-50'"
          @click="page = Math.max(1, page - 1)"
        >
          Назад
        </button>
        <span class="px-3 py-2 text-sm text-gray-600">
          Страница {{ page }} из {{ totalPages }}
        </span>
        <button
          :disabled="page >= totalPages"
          class="px-3 py-2 text-sm font-medium rounded-xl border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :class="page >= totalPages ? 'border-gray-100 text-gray-400 bg-gray-50' : 'border-gray-200 text-gray-700 hover:bg-gray-50'"
          @click="page = Math.min(totalPages, page + 1)"
        >
          Вперёд
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { api } from '../../api';

const statusFilter = ref('');
const regionFilter = ref('');
const page = ref(1);
const limit = 20;
const items = ref<{ id: string; title?: string; source?: { name: string }; status: string; createdAt: string; region?: string }[]>([]);
const total = ref(0);
const loading = ref(true);
const error = ref('');

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)));

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const params = new URLSearchParams();
    if (statusFilter.value) params.set('status', statusFilter.value);
    if (regionFilter.value) params.set('region', regionFilter.value);
    params.set('page', String(page.value));
    params.set('limit', String(limit));
    const q = params.toString() ? `?${params.toString()}` : '';
    const data = await api().get<{ items: typeof items.value; total: number }>(`/api/admin/news${q}`);
    items.value = data.items;
    total.value = data.total ?? 0;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка';
  } finally {
    loading.value = false;
  }
}

watch([statusFilter, regionFilter], () => { page.value = 1; });
watch([statusFilter, regionFilter, page], load);
load();

async function onStatusChange(item: { id: string; status: string }, e: Event) {
  const status = (e.target as HTMLSelectElement).value;
  if (status === item.status) return;
  try {
    await api().patch(`/api/admin/news/${item.id}/status`, { status });
    item.status = status;
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Ошибка');
  }
}

async function remove(item: { id: string; title?: string }) {
  if (!confirm('Удалить новость?')) return;
  try {
    await api().delete(`/api/admin/news/${item.id}`);
    await load();
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка');
  }
}

function formatDate(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
</script>