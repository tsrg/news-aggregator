<template>
  <div>
    <div class="mb-8">
      <h1 class="font-bold text-2xl text-gray-900 tracking-tight">Хранилище</h1>
      <p class="text-sm text-gray-500 mt-1">Настройка загрузки файлов: MinIO, S3-совместимый CDN или HTTP API</p>
    </div>

    <div class="max-w-2xl space-y-6">
      <!-- Выбор провайдера -->
      <div class="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
        <p class="font-medium text-gray-900">Провайдер хранилища</p>

        <label class="flex items-start gap-3 cursor-pointer group">
          <input v-model="form.provider" type="radio" value="minio" class="mt-0.5 accent-blue-600" />
          <div>
            <p class="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">MinIO (Docker)</p>
            <p class="text-sm text-gray-500">Локальный MinIO, настраивается через переменные окружения S3_ENDPOINT, S3_BUCKET, AWS_ACCESS_KEY_ID и т.д.</p>
          </div>
        </label>

        <label class="flex items-start gap-3 cursor-pointer group">
          <input v-model="form.provider" type="radio" value="s3" class="mt-0.5 accent-blue-600" />
          <div>
            <p class="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">S3-совместимое хранилище</p>
            <p class="text-sm text-gray-500">Beget CDN, Yandex Cloud Object Storage, AWS S3, Selectel и другие — по протоколу S3.</p>
          </div>
        </label>

        <label class="flex items-start gap-3 cursor-pointer group">
          <input v-model="form.provider" type="radio" value="cdn" class="mt-0.5 accent-blue-600" />
          <div>
            <p class="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">HTTP CDN API</p>
            <p class="text-sm text-gray-500">Произвольный HTTP-эндпоинт загрузки файлов (POST multipart или PUT binary).</p>
          </div>
        </label>
      </div>

      <!-- S3-совместимое хранилище -->
      <div v-if="form.provider === 's3'" class="space-y-4 p-5 bg-gray-50 rounded-2xl border border-gray-100">
        <p class="font-medium text-gray-700 text-sm uppercase tracking-wide">Параметры S3-совместимого хранилища</p>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">S3 Endpoint</label>
          <input
            v-model="form.s3Endpoint"
            type="url"
            class="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            placeholder="https://s3.beget.com"
          />
          <p class="text-xs text-gray-400 mt-1">Для Beget: https://s3.beget.com</p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Регион</label>
            <input
              v-model="form.s3Region"
              type="text"
              class="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
              placeholder="ru-1"
            />
            <p class="text-xs text-gray-400 mt-1">Для Beget: ru-1</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Бакет (Bucket)</label>
            <input
              v-model="form.s3Bucket"
              type="text"
              class="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
              placeholder="my-bucket"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Access Key ID</label>
          <input
            v-model="form.s3AccessKeyId"
            type="text"
            autocomplete="off"
            class="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            placeholder="Ключ доступа"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Secret Access Key</label>
          <input
            v-model="form.s3SecretAccessKey"
            type="password"
            autocomplete="new-password"
            class="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            placeholder="Секретный ключ"
          />
          <p class="text-xs text-gray-400 mt-1">Хранится в зашифрованном виде. Оставьте пустым, чтобы не менять.</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Публичный базовый URL (Public Base URL)</label>
          <input
            v-model="form.s3PublicBaseUrl"
            type="url"
            class="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            placeholder="https://s3.beget.com/my-bucket"
          />
          <p class="text-xs text-gray-400 mt-1">Если не указан — будет сформирован автоматически из endpoint + bucket.</p>
        </div>

        <div class="flex items-center gap-3">
          <label class="relative inline-flex items-center cursor-pointer shrink-0">
            <input v-model="form.s3ForcePathStyle" type="checkbox" class="sr-only peer" />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
          <div>
            <p class="text-sm font-medium text-gray-700">Force Path Style</p>
            <p class="text-xs text-gray-400">Включить для Beget CDN и большинства не-AWS провайдеров.</p>
          </div>
        </div>
      </div>

      <!-- HTTP CDN API -->
      <div v-if="form.provider === 'cdn'" class="space-y-4 p-5 bg-gray-50 rounded-2xl border border-gray-100">
        <p class="font-medium text-gray-700 text-sm uppercase tracking-wide">Параметры HTTP CDN API</p>

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

      <!-- MinIO — информационный блок -->
      <div v-if="form.provider === 'minio'" class="p-5 bg-blue-50 rounded-2xl border border-blue-100 text-sm text-blue-800 space-y-1">
        <p class="font-medium">MinIO настраивается через переменные окружения.</p>
        <p class="text-blue-600">Убедитесь, что в docker-compose заданы: <code class="bg-blue-100 px-1 rounded">S3_ENDPOINT</code>, <code class="bg-blue-100 px-1 rounded">S3_BUCKET</code>, <code class="bg-blue-100 px-1 rounded">AWS_ACCESS_KEY_ID</code>, <code class="bg-blue-100 px-1 rounded">AWS_SECRET_ACCESS_KEY</code>.</p>
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

type StorageProvider = 'minio' | 's3' | 'cdn';
type HttpMethod = 'POST' | 'PUT';

interface StorageSettings {
  provider: StorageProvider;
  // S3-compatible
  s3Endpoint: string;
  s3Region: string;
  s3Bucket: string;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
  s3PublicBaseUrl: string;
  s3ForcePathStyle: boolean;
  // HTTP CDN API
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
  s3Endpoint: '',
  s3Region: 'us-east-1',
  s3Bucket: '',
  s3AccessKeyId: '',
  s3SecretAccessKey: '',
  s3PublicBaseUrl: '',
  s3ForcePathStyle: true,
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

onMounted(async () => {
  try {
    const data = await api().get<StorageSettings>('/api/admin/settings/storage');
    // Нормализуем provider из старых данных (minioEnabled)
    if (!data.provider) {
      data.provider = (data as any).minioEnabled ? 'minio' : 'cdn';
    }
    form.value = { ...form.value, ...data };
  } catch {
    // дефолты
  }
});

function validate(): string | null {
  if (form.value.provider === 's3') {
    if (!form.value.s3Endpoint.trim()) return 'Укажите S3 Endpoint';
    if (!form.value.s3Bucket.trim()) return 'Укажите название бакета';
    if (!form.value.s3AccessKeyId.trim()) return 'Укажите Access Key ID';
  }
  if (form.value.provider === 'cdn') {
    if (!form.value.baseUrl.trim()) return 'Укажите CDN Base URL';
    if (!form.value.uploadEndpoint.trim()) return 'Укажите Upload endpoint';
    if (!form.value.responseUrlPath.trim() && !form.value.responsePathPath.trim()) {
      return 'Укажите responseUrlPath или responsePathPath';
    }
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
    const payload: StorageSettings = { ...form.value };
    // Если секрет не менялся (маска) — не отправляем
    if (payload.s3SecretAccessKey.startsWith('••••')) {
      payload.s3SecretAccessKey = '';
    }
    await api().put('/api/admin/settings/storage', payload);
    saveResult.value = { success: true, message: 'Сохранено' };
    // Перезагружаем, чтобы получить замаскированный ключ
    const refreshed = await api().get<StorageSettings>('/api/admin/settings/storage');
    form.value = { ...form.value, ...refreshed };
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
