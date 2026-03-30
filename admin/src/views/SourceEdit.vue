<template>
  <div class="bg-transparent">
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-bold text-2xl text-gray-900 tracking-tight">{{ isNew ? 'Новый источник' : 'Редактирование источника' }}</h1>
      <router-link to="/sources" class="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">← К списку</router-link>
    </div>

    <div v-if="loading && !isNew" class="animate-pulse space-y-4">
      <div class="h-48 bg-gray-100 rounded-2xl w-full"></div>
      <div class="h-64 bg-gray-100 rounded-2xl w-full"></div>
    </div>
    <div v-else-if="loadError" class="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800 text-sm">{{ loadError }}</div>

    <div v-else class="space-y-6">
      <!-- Основные настройки -->
      <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
        <h2 class="font-semibold text-lg text-gray-900 mb-6">Основные настройки</h2>
        <div class="flex flex-col gap-6 max-w-2xl">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Название</label>
            <input
              v-model="form.name"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
              placeholder="Например: РИА Новости"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">{{ urlFieldLabel }}</label>
            <input
              v-model="form.url"
              type="url"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all font-mono text-sm"
              :placeholder="urlPlaceholder"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Тип источника</label>
            <select
              v-model="form.type"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            >
              <option value="rss">RSS</option>
              <option value="sitemap">Sitemap</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Регион по умолчанию</label>
            <select
              v-model="form.defaultRegion"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            >
              <option value="">Не указан</option>
              <option v-for="region in availableRegions" :key="region" :value="region">
                {{ region }}
              </option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <input
              v-model="form.isActive"
              type="checkbox"
              id="source-active"
              class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-100"
            />
            <label for="source-active" class="text-sm font-medium text-gray-700">Активен (включить парсинг)</label>
          </div>
        </div>
      </div>

      <!-- Фильтры -->
      <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="font-semibold text-lg text-gray-900">Фильтры новостей</h2>
            <p class="text-sm text-gray-500 mt-1">Настройте какие новости сохранять из RSS-ленты</p>
          </div>
          <button
            @click="addFilter"
            class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" /></svg>
            Добавить фильтр
          </button>
        </div>

        <div v-if="form.filters.length === 0" class="text-center py-8 bg-gray-50 rounded-2xl">
          <p class="text-sm text-gray-500">Нет настроенных фильтров. Все новости из источника будут сохранены.</p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="(filter, index) in form.filters"
            :key="index"
            class="border border-gray-200 rounded-2xl p-4 md:p-5 bg-gray-50/50"
          >
            <div class="flex flex-col md:flex-row gap-4 items-start">
              <!-- Тип фильтра -->
              <div class="w-full md:w-40">
                <label class="block text-xs font-medium text-gray-500 mb-1.5">Действие</label>
                <select
                  v-model="filter.type"
                  class="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="INCLUDE">Включить если</option>
                  <option value="EXCLUDE">Исключить если</option>
                </select>
              </div>

              <!-- Поле -->
              <div class="w-full md:w-40">
                <label class="block text-xs font-medium text-gray-500 mb-1.5">Поле</label>
                <select
                  v-model="filter.field"
                  class="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="title">Заголовок</option>
                  <option value="content">Содержание</option>
                  <option value="category">Категория</option>
                  <option value="author">Автор</option>
                  <option value="url">URL</option>
                </select>
              </div>

              <!-- Оператор -->
              <div class="w-full md:w-48">
                <label class="block text-xs font-medium text-gray-500 mb-1.5">Условие</label>
                <select
                  v-model="filter.operator"
                  class="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="contains">содержит</option>
                  <option value="not_contains">не содержит</option>
                  <option value="equals">равно</option>
                  <option value="starts_with">начинается с</option>
                  <option value="ends_with">заканчивается на</option>
                  <option value="regex">соответствует regex</option>
                </select>
              </div>

              <!-- Значение -->
              <div class="flex-1">
                <label class="block text-xs font-medium text-gray-500 mb-1.5">Значение</label>
                <input
                  v-model="filter.value"
                  class="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                  placeholder="Введите значение..."
                />
              </div>

              <!-- Активность и удаление -->
              <div class="flex items-center gap-2 pt-6">
                <input
                  v-model="filter.isActive"
                  type="checkbox"
                  :id="`filter-active-${index}`"
                  class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-100"
                  title="Активен"
                />
                <button
                  @click="removeFilter(index)"
                  class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Удалить фильтр"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Описание фильтра -->
            <div class="mt-3 text-xs text-gray-500">
              <span v-if="filter.type === 'INCLUDE'" class="text-green-700 bg-green-50 px-2 py-1 rounded-full">Включить</span>
              <span v-else class="text-red-700 bg-red-50 px-2 py-1 rounded-full">Исключить</span>
              новости где
              <span class="font-medium text-gray-700">{{ fieldLabels[filter.field] }}</span>
              <span class="font-medium text-gray-700">{{ operatorLabels[filter.operator] }}</span>
              <span class="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{{ filter.value || '...' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Кнопки действий -->
      <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
        <div class="flex items-center gap-3 flex-wrap">
          <button
            class="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all shadow-sm"
            :disabled="saveLoading"
            @click="save"
          >
            {{ isNew ? 'Создать источник' : 'Сохранить' }}
          </button>
          <router-link to="/sources" class="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">
            Отмена
          </router-link>
          <button
            v-if="!isNew && sourceId"
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

interface SourceFilter {
  id?: string;
  type: 'INCLUDE' | 'EXCLUDE';
  field: 'title' | 'content' | 'category' | 'author' | 'url';
  operator: 'contains' | 'not_contains' | 'equals' | 'starts_with' | 'ends_with' | 'regex';
  value: string;
  isActive: boolean;
}

interface SourceData {
  id: string;
  type?: 'rss' | 'sitemap';
  name: string;
  url: string;
  params?: Record<string, unknown> | null;
  isActive: boolean;
  lastFetchedAt?: string;
  filters: SourceFilter[];
}

const route = useRoute();
const router = useRouter();
const isNew = computed(() => route.path === '/sources/new' || route.name === 'SourceNew');
const sourceId = computed(() => (route.params.id as string) || '');

const form = ref({
  type: 'rss' as 'rss' | 'sitemap',
  name: '',
  url: '',
  defaultRegion: '',
  rawParams: {} as Record<string, unknown>,
  isActive: true,
  filters: [] as SourceFilter[],
});
const loading = ref(false);
const loadError = ref('');
const saveLoading = ref(false);
const deleteLoading = ref(false);
const availableRegions = ref<string[]>([]);

const fieldLabels: Record<string, string> = {
  title: 'заголовок',
  content: 'содержание',
  category: 'категория',
  author: 'автор',
  url: 'url',
};

const operatorLabels: Record<string, string> = {
  contains: 'содержит',
  not_contains: 'не содержит',
  equals: 'равно',
  starts_with: 'начинается с',
  ends_with: 'заканчивается на',
  regex: 'соответствует regex',
};

const urlFieldLabel = computed(() => (
  form.value.type === 'sitemap'
    ? 'URL sitemap (sitemap.xml, включая .xml.gz)'
    : 'URL RSS-ленты'
));

const urlPlaceholder = computed(() => (
  form.value.type === 'sitemap'
    ? 'https://example.com/sitemap.xml'
    : 'https://example.com/rss.xml'
));

function createEmptyFilter(): SourceFilter {
  return {
    type: 'INCLUDE',
    field: 'title',
    operator: 'contains',
    value: '',
    isActive: true,
  };
}

function addFilter() {
  form.value.filters.push(createEmptyFilter());
}

function removeFilter(index: number) {
  form.value.filters.splice(index, 1);
}

function normalizeRegion(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

async function loadAvailableRegions() {
  try {
    const data = await api().get<{ regions: string[] }>('/api/admin/settings/regions');
    availableRegions.value = Array.isArray(data.regions) ? data.regions.slice().sort((a, b) => a.localeCompare(b, 'ru')) : [];
  } catch {
    availableRegions.value = [];
  }
}

async function loadSource() {
  if (!sourceId.value || isNew.value) return;
  loadError.value = '';
  loading.value = true;
  try {
    const data = await api().get<SourceData>(`/api/admin/sources/${sourceId.value}`);
    form.value = {
      type: data.type || 'rss',
      name: data.name,
      url: data.url,
      defaultRegion: typeof data.params?.region === 'string' ? data.params.region : '',
      rawParams: (data.params && typeof data.params === 'object') ? { ...data.params } : {},
      isActive: data.isActive ?? true,
      filters: (data.filters || []).map(f => ({
        id: f.id,
        type: f.type,
        field: f.field,
        operator: f.operator,
        value: f.value,
        isActive: f.isActive ?? true,
      })),
    };
    const currentRegion = normalizeRegion(form.value.defaultRegion);
    if (currentRegion && !availableRegions.value.includes(currentRegion)) {
      availableRegions.value = [currentRegion, ...availableRegions.value];
    }
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Ошибка загрузки источника';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadAvailableRegions();
  if (!isNew.value) loadSource();
});

watch(sourceId, (newId, oldId) => {
  if (!isNew.value && newId && newId !== oldId) loadSource();
});

function validate(): boolean {
  if (!form.value.name.trim()) {
    alert('Введите название источника');
    return false;
  }
  if (!form.value.url.trim()) {
    alert('Введите URL RSS-ленты');
    return false;
  }
  try {
    new URL(form.value.url);
  } catch {
    alert('Введите корректный URL');
    return false;
  }

  // Проверяем фильтры
  for (const filter of form.value.filters) {
    if (!filter.value.trim()) {
      alert('Все фильтры должны иметь значение');
      return false;
    }
  }

  return true;
}

async function save() {
  if (!validate()) return;
  saveLoading.value = true;
  try {
    const mergedParams: Record<string, unknown> = {
      ...form.value.rawParams,
    };
    const normalizedRegion = form.value.defaultRegion.trim();
    if (normalizedRegion) mergedParams.region = normalizedRegion;
    else delete mergedParams.region;

    const payload = {
      type: form.value.type,
      name: form.value.name.trim(),
      url: form.value.url.trim(),
      params: mergedParams,
      isActive: form.value.isActive,
      filters: form.value.filters.map(f => ({
        type: f.type,
        field: f.field,
        operator: f.operator,
        value: f.value.trim(),
        isActive: f.isActive,
      })),
    };
    if (isNew.value) {
      await api().post<SourceData>('/api/admin/sources', payload);
    } else {
      await api().put(`/api/admin/sources/${sourceId.value}`, payload);
    }
    router.push('/sources');
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка сохранения');
  } finally {
    saveLoading.value = false;
  }
}

function confirmDelete() {
  if (!confirm('Удалить этот источник? Все связанные новости будут удалены.')) return;
  deleteSource();
}

async function deleteSource() {
  if (!sourceId.value || isNew.value) return;
  deleteLoading.value = true;
  try {
    await api().delete(`/api/admin/sources/${sourceId.value}`);
    router.push('/sources');
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка удаления');
  } finally {
    deleteLoading.value = false;
  }
}
</script>
