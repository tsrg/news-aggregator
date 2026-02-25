<template>
  <div>
    <h1>Разделы</h1>
    <div v-if="loading" class="loading">Загрузка...</div>
    <ul v-else class="list">
      <li v-for="s in list" :key="s.id" class="row">
        <span>{{ s.title }} ({{ s.slug }})</span>
        <span>{{ s.isVisible ? 'Видим' : 'Скрыт' }}</span>
      </li>
    </ul>
    <p v-if="list.length === 0 && !loading">Разделов нет.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../api';

const list = ref<{ id: string; title: string; slug: string; isVisible: boolean }[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    list.value = await api().get('/api/admin/sections');
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
