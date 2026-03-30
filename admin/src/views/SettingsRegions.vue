<template>
  <div>
    <div class="mb-8">
      <h1 class="font-bold text-2xl text-gray-900 tracking-tight">Регионы</h1>
      <p class="text-sm text-gray-500 mt-1">Список регионов сайта: используется в публичных фильтрах и при парсинге источников.</p>
    </div>

    <div class="max-w-2xl space-y-6">
      <div class="bg-gray-50 p-5 rounded-2xl border border-gray-100">
        <div class="flex items-center gap-3">
          <input
            v-model="newRegion"
            type="text"
            class="flex-1 w-full bg-white border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            placeholder="Например: Иваново"
          />
          <button
            type="button"
            class="px-5 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
            :disabled="saveLoading"
            @click="addRegion"
          >
            Добавить
          </button>
        </div>
        <p class="text-xs text-gray-500 mt-3">
          Опция «без региона» не хранится здесь — она задаётся отдельно в источниках как «Не указан».
        </p>
      </div>

      <div class="space-y-3">
        <div
          v-for="(region, idx) in regions"
          :key="`${region}-${idx}`"
          class="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-4"
        >
          <div v-if="editingIndex === idx" class="flex-1">
            <label class="block text-xs font-medium text-gray-500 mb-1.5">Регион</label>
            <input
              v-model="editingValue"
              type="text"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            />
          </div>

          <div v-else class="flex-1">
            <p class="font-medium text-gray-900">{{ region }}</p>
          </div>

          <div class="flex items-center gap-2">
            <button
              v-if="editingIndex === idx"
              type="button"
              class="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              :disabled="saveLoading"
              @click="applyEdit(idx)"
            >
              Готово
            </button>
            <button
              v-if="editingIndex === idx"
              type="button"
              class="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
              :disabled="saveLoading"
              @click="cancelEdit"
            >
              Отмена
            </button>

            <button
              v-else
              type="button"
              class="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
              :disabled="saveLoading"
              @click="startEdit(idx)"
            >
              Редактировать
            </button>

            <button
              type="button"
              class="px-3 py-1.5 bg-white border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors"
              :disabled="saveLoading"
              @click="removeRegion(idx)"
            >
              Удалить
            </button>
          </div>
        </div>

        <div v-if="regions.length === 0" class="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <p class="text-sm text-gray-500">Пока нет регионов. Добавьте первый.</p>
        </div>
      </div>

      <div class="flex items-center gap-3 pt-2">
        <button
          type="button"
          class="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
          :disabled="saveLoading"
          @click="save"
        >
          {{ saveLoading ? 'Сохранение...' : 'Сохранить изменения' }}
        </button>
        <span v-if="saveResult" :class="saveResult.success ? 'text-green-600' : 'text-red-600'" class="text-sm">
          {{ saveResult.message }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api';

interface RegionsResponse {
  regions: string[];
}

const regions = ref<string[]>([]);
const newRegion = ref('');
const saveLoading = ref(false);
const saveResult = ref<{ success: boolean; message: string } | null>(null);

const editingIndex = ref<number | null>(null);
const editingValue = ref('');

function normalize(value: string): string {
  return value.trim();
}

function isDuplicate(value: string, exceptIdx: number | null): boolean {
  const normalized = normalize(value);
  if (!normalized) return false;
  return regions.value.some((r, i) => r === normalized && (exceptIdx === null || i !== exceptIdx));
}

function startEdit(idx: number) {
  editingIndex.value = idx;
  editingValue.value = regions.value[idx] ?? '';
}

function cancelEdit() {
  editingIndex.value = null;
  editingValue.value = '';
}

function applyEdit(idx: number) {
  const v = normalize(editingValue.value);
  if (!v) {
    alert('Введите название региона');
    return;
  }
  if (isDuplicate(v, idx)) {
    alert('Регион с таким именем уже существует');
    return;
  }
  regions.value[idx] = v;
  cancelEdit();
}

function addRegion() {
  const v = normalize(newRegion.value);
  if (!v) {
    alert('Введите название региона');
    return;
  }
  if (regions.value.includes(v)) {
    alert('Такой регион уже существует');
    return;
  }
  regions.value.push(v);
  newRegion.value = '';
}

function removeRegion(idx: number) {
  const region = regions.value[idx];
  if (!region) return;
  if (!confirm(`Удалить регион «${region}»?`)) return;
  regions.value.splice(idx, 1);
  if (editingIndex.value === idx) cancelEdit();
}

async function save() {
  saveLoading.value = true;
  saveResult.value = null;
  try {
    await api().put<RegionsResponse>('/api/admin/settings/regions', {
      regions: regions.value,
    });
    saveResult.value = { success: true, message: 'Сохранено' };
  } catch (e) {
    saveResult.value = {
      success: false,
      message: e instanceof Error ? e.message : 'Ошибка сохранения',
    };
  } finally {
    saveLoading.value = false;
    setTimeout(() => (saveResult.value = null), 3000);
  }
}

onMounted(async () => {
  try {
    const data = await api().get<RegionsResponse>('/api/admin/settings/regions');
    regions.value = Array.isArray(data.regions) ? data.regions : [];
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка загрузки регионов');
  }
});
</script>

