<template>
  <div class="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
    <header v-if="user" class="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <router-link to="/" class="font-bold text-xl tracking-tight text-gray-900 hover:text-blue-600 transition-colors flex items-center gap-2">
            <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-lg leading-none">A</span>
            </div>
            <span>Admin<span class="text-blue-600">Panel</span></span>
          </router-link>
          
          <nav class="hidden md:flex items-center gap-2">
            <router-link v-if="hasPermission('news')" to="/news" class="px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" active-class="text-blue-600 bg-blue-50">Новости</router-link>
            <router-link v-if="hasPermission('sources')" to="/sources" class="px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" active-class="text-blue-600 bg-blue-50">Источники</router-link>
            <router-link v-if="hasPermission('sections')" to="/sections" class="px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" active-class="text-blue-600 bg-blue-50">Разделы</router-link>
            <router-link v-if="hasPermission('menus')" to="/menus" class="px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" active-class="text-blue-600 bg-blue-50">Меню</router-link>
            <router-link v-if="hasPermission('pages')" to="/pages" class="px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" active-class="text-blue-600 bg-blue-50">Страницы</router-link>
            <router-link v-if="hasPermission('settings')" to="/settings" class="px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" active-class="text-blue-600 bg-blue-50">Настройки</router-link>
            <div class="w-px h-6 bg-gray-200 mx-2"></div>
            <button class="px-3 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none" @click="logout">Выход</button>
          </nav>
        </div>
      </div>
    </header>
    <main class="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';

const auth = useAuthStore();
const router = useRouter();
const user = computed(() => auth.user);
const hasPermission = auth.hasPermission;

function logout() {
  auth.logout();
  router.push('/login');
}
</script>
