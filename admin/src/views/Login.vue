<template>
  <div class="login">
    <h1>Вход</h1>
    <form @submit.prevent="submit">
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="password" type="password" placeholder="Пароль" required />
      <p v-if="error" class="error">{{ error }}</p>
      <button type="submit" :disabled="loading">Войти</button>
    </form>
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

<style scoped>
.login { max-width: 320px; margin: 2rem auto; }
.login input { display: block; width: 100%; margin-bottom: 0.75rem; padding: 0.5rem; }
.login button { padding: 0.5rem 1rem; cursor: pointer; }
.error { color: #c00; font-size: 0.9rem; }
</style>
