<template>
  <div class="bg-surface border-2 border-borderline p-6 shadow-sm">
    <div class="flex items-center justify-between mb-8 border-b-2 border-borderline pb-4">
      <h1 class="font-bold text-2xl uppercase tracking-wider text-ink">Источники RSS</h1>
      <router-link to="/sources/new" class="px-4 py-2 bg-primary text-surface font-bold text-xs uppercase tracking-wider hover:bg-blue-700 transition-colors">Добавить</router-link>
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
    <div class="overflow-x-auto" v-else>
      <table class="w-full text-left font-mono text-sm border-collapse">
        <thead>
          <tr class="bg-canvas border-b-2 border-borderline uppercase text-xs tracking-wider text-ink font-bold">
            <th class="p-3">Название</th>
            <th class="p-3">URL</th>
            <th class="p-3">Активен</th>
            <th class="p-3">Последний сбор</th>
            <th class="p-3">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in list" :key="s.id" class="border-b border-borderline hover:bg-canvas/50 transition-colors">
            <td class="p-3 font-sans font-semibold">{{ s.name }}</td>
            <td class="p-3 text-muted truncate max-w-xs" :title="s.url">{{ s.url }}</td>
            <td class="p-3">
              <span :class="s.isActive ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'" class="px-2 py-1 font-bold text-xs uppercase">
                {{ s.isActive ? 'Да' : 'Нет' }}
              </span>
            </td>
            <td class="p-3 text-muted">{{ s.lastFetchedAt ? formatDate(s.lastFetchedAt) : '—' }}</td>
            <td class="p-3">
              <button class="px-3 py-1 bg-ink text-surface font-bold text-xs uppercase tracking-wider hover:bg-opacity-80 transition-colors" @click="fetchOne(s.id)">Собрать</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../api';

const list = ref<{ id: string; name: string; url: string; isActive: boolean; lastFetchedAt?: string }[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    list.value = await api().get('/api/admin/sources');
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка');
  } finally {
    loading.value = false;
  }
});

function formatDate(d: string) {
  return new Date(d).toLocaleString('ru-RU');
}

async function fetchOne(id: string) {
  try {
    await api().post(`/api/admin/sources/${id}/fetch`, {});
    const s = await api().get(`/api/admin/sources/${id}`);
    const i = list.value.findIndex((x) => x.id === id);
    if (i >= 0) list.value[i] = s;
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка');
  }
}
</script>