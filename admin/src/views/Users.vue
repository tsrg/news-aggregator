<template>
  <div>
    <div class="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="font-bold text-2xl text-gray-900 tracking-tight">Пользователи</h1>
        <p class="text-sm text-gray-500 mt-1">Учётные записи и роли</p>
      </div>
      <router-link
        to="/settings/users/new"
        class="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shrink-0"
      >
        Добавить пользователя
      </router-link>
    </div>

    <div v-if="loading" class="animate-pulse space-y-4">
      <div v-for="i in 4" :key="i" class="h-16 bg-gray-50 rounded-2xl w-full"></div>
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="u in list"
        :key="u.id"
        class="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-blue-100 transition-all bg-gray-50/30 gap-4"
      >
        <div>
          <span class="font-medium text-gray-900 block">{{ u.email }}</span>
          <span class="text-sm text-gray-500">{{ u.roleRef?.name ?? '—' }}</span>
        </div>
        <div class="flex items-center gap-3 self-start sm:self-auto">
          <router-link
            :to="`/settings/users/${u.id}`"
            class="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            Изменить
          </router-link>
        </div>
      </div>
    </div>

    <div v-if="list.length === 0 && !loading" class="text-center py-12">
      <p class="text-sm text-gray-500">Нет пользователей.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../api';

interface UserRow {
  id: string;
  email: string;
  roleId: string;
  roleRef: { id: string; name: string; slug: string } | null;
}

const list = ref<UserRow[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    list.value = await api().get<UserRow[]>('/api/admin/users');
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка загрузки');
  } finally {
    loading.value = false;
  }
});
</script>
