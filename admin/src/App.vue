<template>
  <div class="min-h-screen flex flex-col bg-canvas text-ink font-sans selection:bg-primary selection:text-white">
    <header v-if="user" class="flex items-center justify-between border-b-2 border-borderline px-6 py-4 bg-surface shadow-sm sticky top-0 z-50">
      <router-link to="/" class="font-bold text-xl uppercase tracking-widest text-primary hover:text-ink transition-colors">Админ</router-link>
      <nav class="flex items-center gap-6">
        <router-link to="/news" class="text-sm font-semibold uppercase tracking-wider hover:text-primary transition-colors pb-1 border-b-2 border-transparent" active-class="border-primary text-primary">Новости</router-link>
        <template v-if="isAdmin">
          <router-link to="/sources" class="text-sm font-semibold uppercase tracking-wider hover:text-primary transition-colors pb-1 border-b-2 border-transparent" active-class="border-primary text-primary">Источники</router-link>
          <router-link to="/sections" class="text-sm font-semibold uppercase tracking-wider hover:text-primary transition-colors pb-1 border-b-2 border-transparent" active-class="border-primary text-primary">Разделы</router-link>
          <router-link to="/menus" class="text-sm font-semibold uppercase tracking-wider hover:text-primary transition-colors pb-1 border-b-2 border-transparent" active-class="border-primary text-primary">Меню</router-link>
          <router-link to="/pages" class="text-sm font-semibold uppercase tracking-wider hover:text-primary transition-colors pb-1 border-b-2 border-transparent" active-class="border-primary text-primary">Страницы</router-link>
        </template>
        <button class="ml-4 px-4 py-1.5 border-2 border-ink text-ink font-bold text-xs uppercase tracking-wider hover:bg-ink hover:text-surface transition-colors focus:outline-none" @click="logout">Выход</button>
      </nav>
    </header>
    <main class="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8">
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
const isAdmin = computed(() => auth.user?.role === 'ADMIN');

function logout() {
  auth.logout();
  router.push('/login');
}
</script>