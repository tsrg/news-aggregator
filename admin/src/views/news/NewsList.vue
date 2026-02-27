<template>
  <div class="bg-surface border-2 border-borderline p-6 shadow-sm">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b-2 border-borderline pb-4">
      <h1 class="font-bold text-2xl uppercase tracking-wider text-ink">Новости</h1>
      <div class="flex items-center gap-4">
        <select v-model="statusFilter" class="border-2 border-borderline bg-canvas p-2 font-mono text-sm focus:border-primary focus:outline-none transition-colors">
          <option value="">Все статусы</option>
          <option value="PENDING">На модерации</option>
          <option value="PUBLISHED">Опубликовано</option>
          <option value="REJECTED">Отклонено</option>
        </select>
        <router-link to="/news/new" class="px-4 py-2 bg-primary text-surface font-bold text-xs uppercase tracking-wider hover:bg-blue-700 transition-colors">Добавить</router-link>
      </div>
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
    <div v-else-if="error" class="text-red-600 font-bold text-sm bg-red-50 p-4 border-l-4 border-red-600">{{ error }}</div>
    <div class="overflow-x-auto" v-else>
      <table class="w-full text-left font-mono text-sm border-collapse">
        <thead>
          <tr class="bg-canvas border-b-2 border-borderline uppercase text-xs tracking-wider text-ink font-bold">
            <th class="p-3 w-1/2">Заголовок</th>
            <th class="p-3">Источник</th>
            <th class="p-3">Статус</th>
            <th class="p-3">Дата</th>
            <th class="p-3">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id" class="border-b border-borderline hover:bg-canvas/50 transition-colors">
            <td class="p-3 font-sans font-semibold text-base leading-tight">{{ item.title?.slice(0, 60) }}{{ (item.title?.length || 0) > 60 ? '…' : '' }}</td>
            <td class="p-3 text-muted">{{ item.source?.name || '—' }}</td>
            <td class="p-3">
              <span 
                :class="{
                  'text-green-600 bg-green-50 border-green-200': item.status === 'PUBLISHED',
                  'text-yellow-600 bg-yellow-50 border-yellow-200': item.status === 'PENDING',
                  'text-red-600 bg-red-50 border-red-200': item.status === 'REJECTED'
                }" 
                class="px-2 py-1 border font-bold text-xs uppercase tracking-wider"
              >
                {{ item.status }}
              </span>
            </td>
            <td class="p-3 text-muted">{{ formatDate(item.createdAt) }}</td>
            <td class="p-3 flex gap-2 flex-wrap">
              <router-link :to="`/news/${item.id}`" class="px-2 py-1 bg-canvas border border-borderline text-ink font-bold text-xs uppercase hover:bg-borderline transition-colors">Ред.</router-link>
              <button v-if="item.status === 'PENDING'" class="px-2 py-1 bg-green-600 text-white font-bold text-xs uppercase hover:bg-green-700 transition-colors" @click="publish(item.id)">Опуб.</button>
              <button v-if="item.status === 'PENDING'" class="px-2 py-1 bg-red-600 text-white font-bold text-xs uppercase hover:bg-red-700 transition-colors" @click="reject(item.id)">Откл.</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="items.length === 0 && !loading" class="text-muted font-mono italic p-4 mt-4">Новостей нет.</p>
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
  return new Date(d).toLocaleString('ru-RU');
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