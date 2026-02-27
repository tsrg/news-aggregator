<template>
  <div class="bg-transparent">
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-bold text-2xl text-gray-900 tracking-tight">{{ isNew ? 'Новый раздел' : 'Редактирование раздела' }}</h1>
      <router-link to="/sections" class="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">← К списку</router-link>
    </div>

    <div v-if="loading && !isNew" class="animate-pulse space-y-4">
      <div class="h-48 bg-gray-100 rounded-2xl w-full"></div>
      <div class="h-64 bg-gray-100 rounded-2xl w-full"></div>
    </div>
    <div v-else-if="loadError" class="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800 text-sm">{{ loadError }}</div>

    <div v-else class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
      <div class="flex flex-col gap-6 max-w-2xl">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">URL (slug)</label>
          <input
            v-model="form.slug"
            class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all font-mono"
            placeholder="например: politics, sport"
          />
          <p class="text-xs text-gray-500 mt-1">Только латиница, цифры и дефис. На сайте раздел будет по адресу /section/{{ form.slug || '...' }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Заголовок</label>
          <input
            v-model="form.title"
            class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            placeholder="Политика"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Описание (необязательно)</label>
          <textarea
            v-model="form.description"
            rows="3"
            class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all resize-y"
            placeholder="Краткое описание раздела"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Порядок</label>
          <input
            v-model.number="form.order"
            type="number"
            class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all max-w-32"
          />
        </div>
        <div class="flex items-center gap-2">
          <input
            v-model="form.isVisible"
            type="checkbox"
            id="section-visible"
            class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-100"
          />
          <label for="section-visible" class="text-sm font-medium text-gray-700">Видим на сайте</label>
        </div>
        <div class="pt-2 flex items-center gap-3 flex-wrap">
          <button
            class="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all shadow-sm"
            :disabled="saveLoading"
            @click="save"
          >
            {{ isNew ? 'Создать раздел' : 'Сохранить' }}
          </button>
          <router-link to="/sections" class="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">
            Отмена
          </router-link>
          <button
            v-if="!isNew && sectionId"
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

interface SectionData {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  order: number;
  isVisible: boolean;
}

const route = useRoute();
const router = useRouter();
const isNew = computed(() => route.path === '/sections/new' || route.name === 'SectionNew');
const sectionId = computed(() => (route.params.id as string) || '');

const form = ref({
  slug: '',
  title: '',
  description: '' as string,
  order: 0,
  isVisible: true,
});
const loading = ref(false);
const loadError = ref('');
const saveLoading = ref(false);
const deleteLoading = ref(false);

async function loadSection() {
  if (!sectionId.value || isNew.value) return;
  loadError.value = '';
  loading.value = true;
  try {
    const data = await api().get<SectionData>(`/api/admin/sections/${sectionId.value}`);
    form.value = {
      slug: data.slug,
      title: data.title,
      description: data.description ?? '',
      order: data.order ?? 0,
      isVisible: data.isVisible ?? true,
    };
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Ошибка загрузки раздела';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (!isNew.value) loadSection();
});

watch(sectionId, (newId, oldId) => {
  if (!isNew.value && newId && newId !== oldId) loadSection();
});

function validate(): boolean {
  const slug = form.value.slug.trim();
  if (!slug) {
    alert('Введите URL (slug) раздела');
    return false;
  }
  if (!/^[a-zA-Z0-9-]+$/.test(slug)) {
    alert('URL может содержать только латинские буквы, цифры и дефис');
    return false;
  }
  if (!form.value.title.trim()) {
    alert('Введите заголовок');
    return false;
  }
  return true;
}

async function save() {
  if (!validate()) return;
  saveLoading.value = true;
  try {
    const payload = {
      slug: form.value.slug.trim(),
      title: form.value.title.trim(),
      description: form.value.description.trim() || undefined,
      order: form.value.order,
      isVisible: form.value.isVisible,
    };
    if (isNew.value) {
      const created = await api().post<SectionData>('/api/admin/sections', payload);
      router.push(`/sections/${created.id}`);
    } else {
      await api().put(`/api/admin/sections/${sectionId.value}`, payload);
      await loadSection();
    }
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка сохранения');
  } finally {
    saveLoading.value = false;
  }
}

function confirmDelete() {
  if (!confirm('Удалить этот раздел?')) return;
  deleteSection();
}

async function deleteSection() {
  if (!sectionId.value || isNew.value) return;
  deleteLoading.value = true;
  try {
    await api().delete(`/api/admin/sections/${sectionId.value}`);
    router.push('/sections');
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка удаления');
  } finally {
    deleteLoading.value = false;
  }
}
</script>
