<template>
  <div>
    <h1>Источники RSS</h1>
    <router-link to="/sources/new" class="btn">Добавить</router-link>
    <div v-if="loading" class="loading">Загрузка...</div>
    <table v-else class="table">
      <thead>
        <tr>
          <th>Название</th>
          <th>URL</th>
          <th>Активен</th>
          <th>Последний сбор</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in list" :key="s.id">
          <td>{{ s.name }}</td>
          <td>{{ s.url }}</td>
          <td>{{ s.isActive ? 'Да' : 'Нет' }}</td>
          <td>{{ s.lastFetchedAt ? formatDate(s.lastFetchedAt) : '—' }}</td>
          <td>
            <button class="btn-sm" @click="fetchOne(s.id)">Собрать</button>
          </td>
        </tr>
      </tbody>
    </table>
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

<style scoped>
.btn { display: inline-block; padding: 0.5rem 1rem; background: #0d6efd; color: #fff; text-decoration: none; border-radius: 4px; margin-bottom: 1rem; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { padding: 0.5rem; text-align: left; border-bottom: 1px solid #ddd; }
.btn-sm { padding: 0.25rem 0.5rem; font-size: 0.85rem; cursor: pointer; }
</style>
