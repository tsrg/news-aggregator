<template>
  <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 class="font-bold text-2xl text-gray-900 tracking-tight">Источники RSS</h1>
        <p class="text-sm text-gray-500 mt-1">Управление парсингом новостей</p>
      </div>
      <router-link to="/sources/new" class="px-4 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 inline-flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" /></svg>
        Добавить
      </router-link>
    </div>
    
    <div v-if="loading" class="animate-pulse space-y-4">
      <div v-for="i in 5" :key="i" class="h-16 bg-gray-50 rounded-2xl w-full"></div>
    </div>
    <div class="overflow-x-auto" v-else>
      <table class="w-full text-left text-sm whitespace-nowrap">
        <thead>
          <tr class="text-gray-500 border-b border-gray-100">
            <th class="pb-3 px-4 font-medium">Название</th>
            <th class="pb-3 px-4 font-medium">URL</th>
            <th class="pb-3 px-4 font-medium">Регион</th>
            <th class="pb-3 px-4 font-medium">Статус</th>
            <th class="pb-3 px-4 font-medium">Фильтры</th>
            <th class="pb-3 px-4 font-medium">Последний сбор</th>
            <th class="pb-3 px-4 font-medium text-right">Действия</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="s in list" :key="s.id" class="hover:bg-gray-50/50 transition-colors group">
            <td class="py-4 px-4 font-medium text-gray-900">{{ s.name }}</td>
            <td class="py-4 px-4 text-gray-500 truncate max-w-[200px]" :title="s.url">{{ s.url }}</td>
            <td class="py-4 px-4 text-gray-500">{{ getSourceRegion(s) || '—' }}</td>
            <td class="py-4 px-4">
              <span :class="s.isActive ? 'text-green-700 bg-green-50 border-green-100' : 'text-red-700 bg-red-50 border-red-100'" class="px-2.5 py-1 text-xs font-medium rounded-full border">
                {{ s.isActive ? 'Активен' : 'Отключен' }}
              </span>
            </td>
            <td class="py-4 px-4">
              <span v-if="activeFiltersCount(s) > 0" class="text-blue-700 bg-blue-50 border-blue-100 px-2.5 py-1 text-xs font-medium rounded-full border">
                {{ activeFiltersCount(s) }} фильтр{{ activeFiltersCount(s) === 1 ? '' : activeFiltersCount(s) < 5 ? 'а' : 'ов' }}
              </span>
              <span v-else class="text-gray-400 text-xs">—</span>
            </td>
            <td class="py-4 px-4 text-gray-500">{{ s.lastFetchedAt ? formatDate(s.lastFetchedAt) : '—' }}</td>
            <td class="py-4 px-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <router-link :to="`/sources/${s.id}`" class="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  Редактировать
                </router-link>
                <button class="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors" @click="fetchOne(s.id)">Собрать</button>
                <button class="px-3 py-1.5 bg-white border border-red-200 text-red-700 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors" @click="confirmDelete(s.id)">Удалить</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="list.length === 0 && !loading" class="text-center py-12">
      <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
      </div>
      <h3 class="text-sm font-medium text-gray-900 mb-1">Нет источников</h3>
      <p class="text-sm text-gray-500">Добавьте первый RSS источник для сбора новостей.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../api';

interface SourceFilter {
  id: string;
  type: 'INCLUDE' | 'EXCLUDE';
  field: string;
  operator: string;
  value: string;
  isActive: boolean;
}

interface Source {
  id: string;
  name: string;
  url: string;
  params?: Record<string, unknown> | null;
  isActive: boolean;
  lastFetchedAt?: string;
  filters?: SourceFilter[];
}

const list = ref<Source[]>([]);
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    list.value = await api().get<Source[]>('/api/admin/sources');
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка');
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function activeFiltersCount(source: Source): number {
  return source.filters?.filter(f => f.isActive !== false).length || 0;
}

function getSourceRegion(source: Source): string {
  return typeof source.params?.region === 'string' ? source.params.region : '';
}

function formatDate(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

async function fetchOne(id: string) {
  try {
    await api().post(`/api/admin/sources/${id}/fetch`, {});
    const s = await api().get<Source>(`/api/admin/sources/${id}`);
    const i = list.value.findIndex((x) => x.id === id);
    if (i >= 0) list.value[i] = s;
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка');
  }
}

function confirmDelete(id: string) {
  if (!confirm('Удалить этот источник? Все связанные новости будут удалены.')) return;
  deleteSource(id);
}

async function deleteSource(id: string) {
  try {
    await api().delete(`/api/admin/sources/${id}`);
    await load();
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка удаления');
  }
}
</script>
