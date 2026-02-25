<template>
  <div>
    <h1>Страницы</h1>
    <div v-if="loading" class="loading">Загрузка...</div>
    <ul v-else class="list">
      <li v-for="p in list" :key="p.id" class="row">
        <router-link :to="`/${p.slug}`">{{ p.title }} ({{ p.slug }})</router-link>
        <span>{{ p.isVisible ? 'Видима' : 'Скрыта' }}</span>
      </li>
    </ul>
    <p v-if="list.length === 0 && !loading">Страниц нет.</p>
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

<style scoped>
.list { list-style: none; padding: 0; }
.row { padding: 0.5rem 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
.row a { color: #0d6efd; text-decoration: none; }
</style>
