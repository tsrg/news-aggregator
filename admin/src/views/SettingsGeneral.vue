<template>
  <div>
    <div class="mb-8">
      <h1 class="font-bold text-2xl text-gray-900 tracking-tight">Основные</h1>
      <p class="text-sm text-gray-500 mt-1">Общие параметры работы агрегатора</p>
    </div>

    <div class="max-w-2xl space-y-6">
      <div class="flex items-start justify-between gap-6 p-5 bg-gray-50 rounded-2xl border border-gray-100">
        <div>
          <p class="font-medium text-gray-900">Автоудаление старых неопубликованных новостей</p>
          <p class="text-sm text-gray-500 mt-1 leading-relaxed">
            Если включено, раз в час удаляются материалы со статусами «На модерации» и «Отклонённые», у которых дата создания в системе старше 48 часов. Опубликованные материалы не затрагиваются.
          </p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
          <input v-model="form.autoDeleteStaleUnpublishedNews" type="checkbox" class="sr-only peer" />
          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <div class="flex items-center gap-3 pt-2">
        <button
          type="button"
          class="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
          :disabled="saveLoading"
          @click="save"
        >
          <svg v-if="saveLoading" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ saveLoading ? 'Сохранение...' : 'Сохранить' }}
        </button>
        <span v-if="saveResult" :class="saveResult.success ? 'text-green-600' : 'text-red-600'" class="text-sm">
          {{ saveResult.message }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../api';

interface GeneralSettings {
  autoDeleteStaleUnpublishedNews: boolean;
}

const form = ref<GeneralSettings>({
  autoDeleteStaleUnpublishedNews: false,
});

const saveLoading = ref(false);
const saveResult = ref<{ success: boolean; message: string } | null>(null);

onMounted(async () => {
  try {
    const data = await api().get<GeneralSettings>('/api/admin/settings/general');
    form.value = { ...form.value, ...data };
  } catch {
    // дефолты
  }
});

async function save() {
  saveLoading.value = true;
  saveResult.value = null;
  try {
    await api().put('/api/admin/settings/general', {
      autoDeleteStaleUnpublishedNews: form.value.autoDeleteStaleUnpublishedNews,
    });
    saveResult.value = { success: true, message: 'Сохранено' };
    setTimeout(() => (saveResult.value = null), 3000);
  } catch (e) {
    saveResult.value = {
      success: false,
      message: e instanceof Error ? e.message : 'Ошибка сохранения',
    };
  } finally {
    saveLoading.value = false;
  }
}
</script>
