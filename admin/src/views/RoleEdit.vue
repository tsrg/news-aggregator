<template>
  <div class="bg-transparent">
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-bold text-2xl text-gray-900 tracking-tight">{{ isNew ? 'Новая роль' : 'Редактирование роли' }}</h1>
      <router-link to="/settings/roles" class="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">← К списку</router-link>
    </div>

    <div v-if="loading && !isNew" class="animate-pulse space-y-4">
      <div class="h-48 bg-gray-100 rounded-2xl w-full"></div>
    </div>
    <div v-else-if="loadError" class="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800 text-sm">{{ loadError }}</div>

    <div v-else class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
      <div class="flex flex-col gap-6 max-w-2xl">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Название</label>
          <input
            v-model="form.name"
            class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            placeholder="Главный редактор"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Код (slug)</label>
          <input
            v-model="form.slug"
            class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all font-mono"
            placeholder="chief-editor"
          />
          <p class="text-xs text-gray-500 mt-1">Латиница, цифры, дефис и подчёркивание</p>
        </div>
        <div class="flex items-center gap-2">
          <input
            v-model="form.isFullAccess"
            type="checkbox"
            id="role-full-access"
            class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-100"
          />
          <label for="role-full-access" class="text-sm font-medium text-gray-700">Полный доступ ко всем разделам</label>
        </div>
        <div v-if="!form.isFullAccess">
          <label class="block text-sm font-medium text-gray-700 mb-2">Доступ к разделам</label>
          <div class="flex flex-wrap gap-3">
            <label
              v-for="p in permissions"
              :key="p.id"
              class="flex items-center gap-2 cursor-pointer"
            >
              <input
                v-model="form.permissionIds"
                type="checkbox"
                :value="p.id"
                class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-100"
              />
              <span class="text-sm text-gray-700">{{ p.name }}</span>
            </label>
          </div>
        </div>
        <div class="pt-2 flex items-center gap-3 flex-wrap">
          <button
            class="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all shadow-sm"
            :disabled="saveLoading"
            @click="save"
          >
            {{ isNew ? 'Создать' : 'Сохранить' }}
          </button>
          <router-link to="/settings/roles" class="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">
            Отмена
          </router-link>
          <button
            v-if="!isNew && roleId"
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

interface PermissionOption {
  id: string;
  code: string;
  name: string;
}

interface RoleData {
  id: string;
  name: string;
  slug: string;
  isFullAccess: boolean;
  permissionIds: string[];
  permissions: string[];
}

const route = useRoute();
const router = useRouter();
const isNew = computed(() => route.path === '/settings/roles/new' || route.name === 'RoleNew');
const roleId = computed(() => (route.params.id as string) || '');

const form = ref({
  name: '',
  slug: '',
  isFullAccess: false,
  permissionIds: [] as string[],
});
const permissions = ref<PermissionOption[]>([]);
const loading = ref(false);
const loadError = ref('');
const saveLoading = ref(false);
const deleteLoading = ref(false);

async function loadPermissions() {
  try {
    permissions.value = await api().get<PermissionOption[]>('/api/admin/permissions');
  } catch {
    permissions.value = [];
  }
}

async function loadRole() {
  if (!roleId.value || isNew.value) return;
  loadError.value = '';
  loading.value = true;
  try {
    const data = await api().get<RoleData>(`/api/admin/roles/${roleId.value}`);
    form.value = {
      name: data.name,
      slug: data.slug,
      isFullAccess: data.isFullAccess,
      permissionIds: data.permissionIds || [],
    };
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Ошибка загрузки';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await loadPermissions();
  if (!isNew.value) await loadRole();
});

watch(roleId, (newId, oldId) => {
  if (!isNew.value && newId && newId !== oldId) loadRole();
});

function validate(): boolean {
  if (!form.value.name.trim()) {
    alert('Введите название роли');
    return false;
  }
  const slug = form.value.slug.trim();
  if (!slug) {
    alert('Введите код (slug) роли');
    return false;
  }
  if (!/^[a-z0-9_-]+$/.test(slug)) {
    alert('Код роли: только латиница, цифры, дефис и подчёркивание');
    return false;
  }
  return true;
}

async function save() {
  if (!validate()) return;
  saveLoading.value = true;
  try {
    const payload = {
      name: form.value.name.trim(),
      slug: form.value.slug.trim(),
      isFullAccess: form.value.isFullAccess,
      permissionIds: form.value.isFullAccess ? [] : form.value.permissionIds,
    };
    if (isNew.value) {
      const created = await api().post<RoleData>('/api/admin/roles', payload);
      router.push(`/settings/roles/${created.id}`);
    } else {
      await api().put(`/api/admin/roles/${roleId.value}`, payload);
      await loadRole();
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
  if (!confirm('Удалить эту роль? Пользователи с этой ролью должны быть переназначены.')) return;
  deleteRole();
}

async function deleteRole() {
  if (!roleId.value || isNew.value) return;
  deleteLoading.value = true;
  try {
    await api().delete(`/api/admin/roles/${roleId.value}`);
    router.push('/settings/roles');
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Ошибка удаления';
    try {
      const j = JSON.parse(msg);
      alert(j.error || msg);
    } catch {
      alert(msg);
    }
  } finally {
    deleteLoading.value = false;
  }
}
</script>
