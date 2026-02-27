<template>
  <div class="min-h-[80vh] flex items-center justify-center">
    <div class="bg-surface border-2 border-borderline p-8 shadow-sm w-full max-w-md">
      <h1 class="font-bold text-2xl uppercase tracking-wider text-ink mb-6 text-center border-b-2 border-borderline pb-4">Вход в систему</h1>
      <form @submit.prevent="submit" class="flex flex-col gap-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-ink mb-2">Email</label>
          <input v-model="email" type="email" placeholder="admin@example.com" required class="w-full border-2 border-borderline bg-canvas p-3 text-ink focus:border-primary focus:outline-none transition-colors font-mono text-sm" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-ink mb-2">Пароль</label>
          <input v-model="password" type="password" placeholder="••••••••" required class="w-full border-2 border-borderline bg-canvas p-3 text-ink focus:border-primary focus:outline-none transition-colors font-mono text-sm" />
        </div>
        <p v-if="error" class="text-red-600 font-bold text-sm bg-red-50 p-3 border-l-4 border-red-600">{{ error }}</p>
        <button type="submit" :disabled="loading" class="mt-4 w-full bg-primary text-surface font-bold uppercase tracking-widest text-sm p-4 hover:bg-blue-700 focus:outline-none disabled:opacity-50 transition-colors">
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