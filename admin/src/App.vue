<template>
  <div class="app">
    <header v-if="user" class="header">
      <router-link to="/" class="logo">Админ</router-link>
      <nav>
        <router-link to="/news">Новости</router-link>
        <template v-if="isAdmin">
          <router-link to="/sources">Источники</router-link>
          <router-link to="/sections">Разделы</router-link>
          <router-link to="/menus">Меню</router-link>
          <router-link to="/pages">Страницы</router-link>
        </template>
        <button class="logout" @click="logout">Выход</button>
      </nav>
    </header>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from './stores/auth';

const auth = useAuthStore();
const user = computed(() => auth.user);
const isAdmin = computed(() => auth.user?.role === 'ADMIN');

function logout() {
  auth.logout();
  router.push('/login');
}
import { useRouter } from 'vue-router';
const router = useRouter();
</script>

<style scoped>
.app { min-height: 100vh; display: flex; flex-direction: column; }
.header {
  padding: 0.75rem 1.5rem;
  background: #1a1a2e;
  color: #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.logo { font-weight: 700; color: inherit; text-decoration: none; margin-right: 1.5rem; }
nav { display: flex; align-items: center; gap: 1rem; }
nav a { color: #aaa; text-decoration: none; }
nav a.router-link-active { color: #fff; }
.logout { background: transparent; border: 1px solid #666; color: #ccc; padding: 0.35rem 0.75rem; cursor: pointer; border-radius: 4px; }
.main { flex: 1; padding: 1.5rem; }
</style>
