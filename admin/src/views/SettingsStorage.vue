<template>
  <div>
    <div class="mb-8">
      <h1 class="font-bold text-2xl text-gray-900 tracking-tight">Хранилище</h1>
      <p class="text-sm text-gray-500 mt-1">Настройка загрузки файлов в MinIO или внешний CDN API</p>
    </div>

    <div class="max-w-2xl space-y-6">
      <div class="flex items-start justify-between gap-6 p-5 bg-gray-50 rounded-2xl border border-gray-100">
        <div>
          <p class="font-medium text-gray-900">Использовать MinIO (S3)</p>
          <p class="text-sm text-gray-500 mt-1 leading-relaxed">
            Если выключено, загрузка файлов будет выполняться через HTTP API CDN.
          </p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
          <input v-model="form.minioEnabled" type="checkbox" class="sr-only peer" />
          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <div v-if="!form.minioEnabled" class="space-y-4 p-5 bg-gray-50 rounded-2xl border border-gray-100">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">CDN Base URL</label>
          <input
            v-model="form.baseUrl"
            type="url"
            class="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            placeholder="https://cdn.example.com"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Upload endpoint</label>
          <input
            v-model="form.uploadEndpoint"
            type="url"
            class="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            placeholder="https://api.example.com/upload"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">HTTP method</label>
          <select
            v-model="form.httpMethod"
            class="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
          >
            <option value="POST">POST (multipart/form-data)</option>
            <option value="PUT">PUT (binary body)</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Имя поля файла (POST)</label>
          <input
            v-model="form.fileFieldName"
            type="text"
            class="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            placeholder="file"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Имя поля пути (опционально)</label>
          <input
            v-model="form.pathFieldName"
            type="text"
            class="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            placeholder="path"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Путь до URL в JSON-ответе</label>
          <input
            v-model="form.responseUrlPath"
            type="text"
            class="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            placeholder="url или data.url"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Путь до файла в JSON-ответе (fallback)</label>
          <input
            v-model="form.responsePathPath"
            type="text"
            class="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            placeholder="data.path"
          />
        </div>
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
import { ref, onMounted, watch } from 'vue';
import { api } from '../api';

type HttpMethod = 'POST' | 'PUT';

interface StorageSettings {
  provider: 'minio' | 'cdn';
  minioEnabled: boolean;
  baseUrl: string;
  uploadEndpoint: string;
  httpMethod: HttpMethod;
  fileFieldName: string;
  pathFieldName: string;
  responseUrlPath: string;
  responsePathPath: string;
}

const form = ref<StorageSettings>({
  provider: 'minio',
  minioEnabled: true,
  baseUrl: '',
  uploadEndpoint: '',
  httpMethod: 'POST',
  fileFieldName: 'file',
  pathFieldName: '',
  responseUrlPath: 'url',
  responsePathPath: '',
});

const saveLoading = ref(false);
const saveResult = ref<{ success: boolean; message: string } | null>(null);

watch(
  () => form.value.minioEnabled,
  (enabled) => {
    form.value.provider = enabled ? 'minio' : 'cdn';
  }
);

onMounted(async () => {
  try {
    const data = await api().get<StorageSettings>('/api/admin/settings/storage');
    form.value = { ...form.value, ...data };
  } catch {
    // дефолты
  }
});

function validate(): string | null {
  if (form.value.minioEnabled) return null;
  if (!form.value.baseUrl.trim()) return 'Укажите CDN Base URL';
  if (!form.value.uploadEndpoint.trim()) return 'Укажите Upload endpoint';
  if (!form.value.responseUrlPath.trim() && !form.value.responsePathPath.trim()) {
    return 'Укажите responseUrlPath или responsePathPath';
  }
  return null;
}

async function save() {
  const validationError = validate();
  if (validationError) {
    saveResult.value = { success: false, message: validationError };
    return;
  }

  saveLoading.value = true;
  saveResult.value = null;
  try {
    await api().put('/api/admin/settings/storage', {
      ...form.value,
      provider: form.value.minioEnabled ? 'minio' : 'cdn',
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
