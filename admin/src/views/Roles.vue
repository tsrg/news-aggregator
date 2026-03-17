<template>
  <div>
    <div class="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="font-bold text-2xl text-gray-900 tracking-tight">Роли</h1>
        <p class="text-sm text-gray-500 mt-1">Права доступа к разделам админки</p>
      </div>
      <router-link
        to="/settings/roles/new"
        class="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shrink-0"
      >
        Добавить роль
      </router-link>
    </div>

    <div v-if="loading" class="animate-pulse space-y-4">
      <div v-for="i in 4" :key="i" class="h-16 bg-gray-50 rounded-2xl w-full"></div>
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="r in list"
        :key="r.id"
        class="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-blue-100 transition-all bg-gray-50/30 gap-4"
      >
        <div>
          <span class="font-medium text-gray-900 block">{{ r.name }}</span>
          <span class="font-mono text-xs text-gray-500">{{ r.slug }}</span>
          <div v-if="r.isFullAccess" class="mt-1">
            <span class="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">Полный доступ</span>
          </div>
          <div v-else-if="r.permissions?.length" class="mt-1 flex flex-wrap gap-1">
            <span
              v-for="p in r.permissions"
              :key="p"
              class="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded"
            >
              {{ p }}
            </span>
          </div>
        </div>
        <router-link
          :to="`/settings/roles/${r.id}`"
          class="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors self-start sm:self-auto"
        >
          Изменить
        </router-link>
      </div>
    </div>

    <div v-if="list.length === 0 && !loading" class="text-center py-12">
      <p class="text-sm text-gray-500">Нет ролей.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../api';

interface RoleRow {
  id: string;
  name: string;
  slug: string;
  isFullAccess: boolean;
  permissions: string[];
}

const list = ref<RoleRow[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    list.value = await api().get<RoleRow[]>('/api/admin/roles');
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка загрузки');
  } finally {
    loading.value = false;
  }
});
</script>
