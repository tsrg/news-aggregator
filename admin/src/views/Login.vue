<template>
  <div class="min-h-[80vh] flex items-center justify-center px-4">
    <div class="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-gray-100 w-full max-w-md">
      <div class="flex justify-center mb-8">
        <div class="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
           <span class="text-white font-bold text-2xl leading-none">A</span>
        </div>
      </div>
      <h1 class="font-bold text-2xl text-gray-900 mb-2 text-center tracking-tight">С возвращением</h1>
      <p class="text-gray-500 text-center text-sm mb-8">Войдите в панель управления</p>
      
      <form @submit.prevent="submit" class="flex flex-col gap-5">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input v-model="email" type="email" placeholder="admin@example.com" required class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Пароль</label>
          <input v-model="password" type="password" placeholder="••••••••" required class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all" />
        </div>
        
        <div v-if="error" class="text-red-600 text-sm bg-red-50 p-4 rounded-xl border border-red-100 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
          {{ error }}
        </div>
        
        <button type="submit" :disabled="loading" class="mt-2 w-full bg-blue-600 text-white font-medium rounded-xl p-3.5 hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-blue-200">
          {{ loading ? 'Вход...' : 'Войти' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    const r = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Ошибка входа');
    auth.setAuth(data.token, data.user);
    router.push('/');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка входа';
  } finally {
    loading.value = false;
  }
}
</script>