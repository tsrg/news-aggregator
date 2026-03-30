<template>
  <div class="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
    <div class="border-b border-gray-200">
      <nav class="flex flex-wrap gap-1 p-2" aria-label="Настройки">
        <router-link
          v-if="hasPermission('settings')"
          to="/settings/general"
          class="px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
          :class="isGeneralActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
        >
          Основные
        </router-link>
        <router-link
          v-if="hasPermission('settings')"
          to="/settings/ai"
          class="px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
          :class="isAiActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
        >
          Настройки AI
        </router-link>
        <router-link
          v-if="hasPermission('settings')"
          to="/settings/storage"
          class="px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
          :class="isStorageActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
        >
          Хранилище
        </router-link>
        <router-link
          v-if="hasPermission('settings')"
          to="/settings/regions"
          class="px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
          :class="isRegionsActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
        >
          Регионы
        </router-link>
        <router-link
          v-if="hasPermission('users')"
          to="/settings/users"
          class="px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
          :class="isUsersActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
        >
          Пользователи
        </router-link>
        <router-link
          v-if="hasPermission('roles')"
          to="/settings/roles"
          class="px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
          :class="isRolesActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
        >
          Роли
        </router-link>
      </nav>
    </div>
    <div class="p-6 md:p-8">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const auth = useAuthStore();
const hasPermission = auth.hasPermission;

const isGeneralActive = computed(() => route.path === '/settings/general' || route.path === '/settings' || route.path === '/settings/');
const isAiActive = computed(() => route.path === '/settings/ai');
const isStorageActive = computed(() => route.path === '/settings/storage');
const isRegionsActive = computed(() => route.path === '/settings/regions');
const isUsersActive = computed(() => route.path.startsWith('/settings/users'));
const isRolesActive = computed(() => route.path.startsWith('/settings/roles'));
</script>
