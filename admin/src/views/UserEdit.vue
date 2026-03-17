<template>
  <div class="bg-transparent">
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-bold text-2xl text-gray-900 tracking-tight">{{ isNew ? 'Новый пользователь' : 'Редактирование пользователя' }}</h1>
      <router-link to="/settings/users" class="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">← К списку</router-link>
    </div>

    <div v-if="loading && !isNew" class="animate-pulse space-y-4">
      <div class="h-48 bg-gray-100 rounded-2xl w-full"></div>
    </div>
    <div v-else-if="loadError" class="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800 text-sm">{{ loadError }}</div>
    <div v-else-if="successMessage" class="bg-green-50 border border-green-200 rounded-2xl p-4 text-green-800 text-sm flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
      {{ successMessage }}
    </div>
    <div v-else class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
      <div v-if="validationError" class="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0 text-red-600" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
        {{ validationError }}
      </div>
      <div class="flex flex-col gap-6 max-w-2xl">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input
            v-model="form.email"
            type="email"
            class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            placeholder="user@example.com"
            @input="validationError = ''"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Роль</label>
          <select
            v-model="form.roleId"
            class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            @change="validationError = ''"
          >
            <option value="">— Выберите роль —</option>
            <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            {{ isNew ? 'Пароль' : 'Новый пароль (оставьте пустым, чтобы не менять)' }}
          </label>
          <input
            v-model="form.password"
            type="password"
            class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            :placeholder="isNew ? 'Минимум 6 символов' : 'Оставьте пустым'"
            @input="validationError = ''"
          />
        </div>
        <div class="pt-2 flex items-center gap-3 flex-wrap">
          <button
            class="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all shadow-sm"
            :disabled="saveLoading"
            @click="save"
          >
            {{ isNew ? 'Создать' : 'Сохранить' }}
          </button>
          <router-link to="/settings/users" class="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">
            Отмена
          </router-link>
          <button
            v-if="!isNew && userId && !isCurrentUser"
            type="button"
            class="px-6 py-3 bg-white border border-red-200 text-red-700 font-medium rounded-xl hover:bg-red-50 transition-colors"
            :disabled="deleteLoading"
            @click="confirmDelete"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api';
import { useAuthStore } from '../stores/auth';

interface RoleOption {
  id: string;
  name: string;
  slug: string;
}

interface UserData {
  id: string;
  email: string;
  roleId: string;
  roleRef: { id: string; name: string; slug: string };
}

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const isNew = computed(() => route.path === '/settings/users/new' || route.name === 'UserNew');
const userId = computed(() => (route.params.id as string) || '');
const isCurrentUser = computed(() => auth.user?.id === userId.value);

const form = ref({
  email: '',
  roleId: '',
  password: '',
});
const roles = ref<RoleOption[]>([]);
const loading = ref(false);
const loadError = ref('');
const saveLoading = ref(false);
const deleteLoading = ref(false);
const successMessage = ref('');
const validationError = ref('');

async function loadRoles() {
  try {
    roles.value = await api().get<RoleOption[]>('/api/admin/roles');
  } catch {
    roles.value = [];
  }
}

async function loadUser() {
  if (!userId.value || isNew.value) return;
  loadError.value = '';
  loading.value = true;
  try {
    const data = await api().get<UserData>(`/api/admin/users/${userId.value}`);
    form.value = {
      email: data.email,
      roleId: data.roleId,
      password: '',
    };
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Ошибка загрузки';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await loadRoles();
  if (!isNew.value) await loadUser();
});

watch(userId, (newId, oldId) => {
  if (!isNew.value && newId && newId !== oldId) loadUser();
});

function validate(): boolean {
  validationError.value = '';
  if (!form.value.email.trim()) {
    validationError.value = 'Введите email';
    return false;
  }
  if (!form.value.roleId) {
    validationError.value = 'Выберите роль';
    return false;
  }
  if (isNew.value && !form.value.password) {
    validationError.value = 'Введите пароль (минимум 6 символов)';
    return false;
  }
  if (isNew.value && form.value.password.length < 6) {
    validationError.value = 'Пароль должен быть не менее 6 символов';
    return false;
  }
  if (!isNew.value && form.value.password && form.value.password.length < 6) {
    validationError.value = 'Новый пароль должен быть не менее 6 символов';
    return false;
  }
  return true;
}

async function save() {
  if (!validate()) return;
  saveLoading.value = true;
  successMessage.value = '';
  try {
    const payload: { email: string; roleId: string; password?: string } = {
      email: form.value.email.trim(),
      roleId: form.value.roleId,
    };
    if (isNew.value) {
      payload.password = form.value.password;
      const created = await api().post<UserData>('/api/admin/users', payload);
      successMessage.value = 'Пользователь создан. Переход к списку...';
      setTimeout(() => router.push('/settings/users'), 1200);
    } else {
      if (form.value.password) payload.password = form.value.password;
      await api().put(`/api/admin/users/${userId.value}`, payload);
      successMessage.value = 'Изменения сохранены. Переход к списку...';
      setTimeout(() => router.push('/settings/users'), 1200);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Ошибка сохранения';
    try {
      const j = JSON.parse(msg);
      alert(j.error || msg);
    } catch {
      alert(msg);
    }
  } finally {
    saveLoading.value = false;
  }
}

function confirmDelete() {
  if (!confirm('Удалить этого пользователя?')) return;
  deleteUser();
}

async function deleteUser() {
  if (!userId.value || isNew.value) return;
  deleteLoading.value = true;
  try {
    await api().delete(`/api/admin/users/${userId.value}`);
    router.push('/settings/users');
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка удаления');
  } finally {
    deleteLoading.value = false;
  }
}
</script>
