<template>
  <div>
    <h1>Новости</h1>
    <div class="toolbar">
      <select v-model="statusFilter">
        <option value="">Все статусы</option>
        <option value="PENDING">На модерации</option>
        <option value="PUBLISHED">Опубликовано</option>
        <option value="REJECTED">Отклонено</option>
      </select>
      <router-link to="/news/new" class="btn">Добавить</router-link>
    </div>
    <div v-if="loading" class="loading">Загрузка...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <table v-else class="table">
      <thead>
        <tr>
          <th>Заголовок</th>
          <th>Источник</th>
          <th>Статус</th>
          <th>Дата</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <td>{{ item.title?.slice(0, 60) }}{{ (item.title?.length || 0) > 60 ? '…' : '' }}</td>
          <td>{{ item.source?.name }}</td>
          <td><span :class="'status-' + item.status">{{ item.status }}</span></td>
          <td>{{ formatDate(item.createdAt) }}</td>
          <td>
            <router-link :to="`/news/${item.id}`">Редактировать</router-link>
            <button v-if="item.status === 'PENDING'" class="btn-sm" @click="publish(item.id)">Опубликовать</button>
            <button v-if="item.status === 'PENDING'" class="btn-sm danger" @click="reject(item.id)">Отклонить</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="items.length === 0 && !loading">Новостей нет.</p>
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

<style scoped>
.toolbar { display: flex; gap: 1rem; margin-bottom: 1rem; align-items: center; }
.btn { padding: 0.5rem 1rem; background: #0d6efd; color: #fff; text-decoration: none; border-radius: 4px; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { padding: 0.5rem; text-align: left; border-bottom: 1px solid #ddd; }
.status-PUBLISHED { color: green; }
.status-PENDING { color: orange; }
.status-REJECTED { color: red; }
.btn-sm { margin-left: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.85rem; cursor: pointer; }
.danger { background: #dc3545; color: #fff; border: none; border-radius: 4px; }
.loading, .error { padding: 1rem; }
.error { color: #c00; }
</style>
