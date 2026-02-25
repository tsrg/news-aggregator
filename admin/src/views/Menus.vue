<template>
  <div>
    <h1>Меню</h1>
    <div v-if="loading" class="loading">Загрузка...</div>
    <ul v-else class="list">
      <li v-for="m in list" :key="m.id" class="row">
        <span>{{ m.name }} ({{ m.key }})</span>
        <span>Пунктов: {{ m._count?.items ?? 0 }}</span>
      </li>
    </ul>
    <p v-if="list.length === 0 && !loading">Меню нет.</p>
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

<style scoped>
.list { list-style: none; padding: 0; }
.row { padding: 0.5rem 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
</style>
