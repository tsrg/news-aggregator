<template>
  <div>
    <div class="mb-8">
      <h1 class="font-bold text-2xl text-gray-900 tracking-tight">Настройки AI</h1>
      <p class="text-sm text-gray-500 mt-1">Подключение к нейросетям для генерации и обработки контента</p>
    </div>

    <div class="space-y-6">
      <div class="border-b border-gray-100 pb-6">
        <!-- Провайдер -->
        <div class="max-w-2xl space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Провайдер AI</label>
            <div class="relative">
              <select v-model="settings.aiProvider" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all appearance-none pr-10">
                <option value="openai">OpenAI (ChatGPT)</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="zai">Z.ai (GigaChat)</option>
                <option value="yandex">YandexGPT</option>
                <option value="gigachat">GigaChat Direct (Сбер)</option>
                <option value="custom">Пользовательский API</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
          </div>

          <!-- API Key -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">API Key</label>
            <div class="relative">
              <input 
                v-model="settings.apiKey" 
                :type="showApiKey ? 'text' : 'password'"
                class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all pr-12"
                placeholder="sk-..."
              />
              <button 
                @click="showApiKey = !showApiKey"
                class="absolute inset-y-0 right-0 px-4 text-gray-500 hover:text-gray-700 transition-colors"
                type="button"
              >
                <svg v-if="showApiKey" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd" />
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 2.015 0 3.861-.598 5.454-1.303z" />
                </svg>
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-1">Ключ хранится в зашифрованном виде</p>
          </div>

          <!-- Базовый URL (для custom) -->
          <div v-if="settings.aiProvider === 'custom'">
            <label class="block text-sm font-medium text-gray-700 mb-2">Базовый URL API</label>
            <input 
              v-model="settings.baseUrl" 
              type="url"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
              placeholder="https://api.example.com/v1"
            />
          </div>

          <!-- Модель -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Модель</label>
            <input 
              v-model="settings.model" 
              type="text"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
              :placeholder="modelPlaceholder"
            />
            <p class="text-xs text-gray-500 mt-1">Например: gpt-4, gpt-3.5-turbo, claude-3-opus-20240229</p>
          </div>

          <!-- Температура -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Температура (креативность)</label>
            <div class="flex items-center gap-4">
              <input 
                v-model.number="settings.temperature" 
                type="range"
                min="0"
                max="2"
                step="0.1"
                class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span class="w-12 text-sm font-medium text-gray-700 text-center">{{ settings.temperature }}</span>
            </div>
            <p class="text-xs text-gray-500 mt-1">0 — более точные ответы, 2 — более креативные</p>
          </div>

          <!-- Макс. токенов -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Максимальное количество токенов</label>
            <input 
              v-model.number="settings.maxTokens" 
              type="number"
              min="100"
              max="8000"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            />
          </div>

          <!-- Тест соединения -->
          <div class="pt-4 flex items-center gap-3">
            <button 
              @click="testConnection"
              :disabled="testLoading || !settings.apiKey"
              class="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              <svg v-if="testLoading" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              Проверить соединение
            </button>
            
            <span v-if="testResult" :class="testResult.success ? 'text-green-600' : 'text-red-600'" class="text-sm">
              {{ testResult.message }}
            </span>
          </div>
        </div>
      </div>

      <div class="border-b border-gray-100 pb-6">
        <div class="max-w-2xl space-y-6">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Изображения (обложки новостей)</h2>
            <p class="text-sm text-gray-500 mt-1">
              Генерация обложек через API совместимое с OpenAI <code class="text-xs bg-gray-100 px-1 rounded">POST …/images/generations</code>.
              Если ключ в этом блоке не указан, подставляется ключ основного чата при совпадении провайдера (OpenAI/Custom или Z.ai).
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Провайдер изображений</label>
            <div class="relative">
              <select
                v-model="imageSettings.imageProvider"
                class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all appearance-none pr-10"
              >
                <option value="openai">OpenAI (DALL·E)</option>
                <option value="custom">Пользовательский URL (OpenAI-совместимый)</option>
                <option value="zai">Z.ai</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
            <p class="text-xs text-gray-500 mt-1">{{ imageProviderHint }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">API Key (Images)</label>
            <div class="relative">
              <input
                v-model="imageSettings.apiKey"
                :type="showImageApiKey ? 'text' : 'password'"
                class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all pr-12"
                placeholder="sk-... (необязательно, см. текст выше)"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 px-4 text-gray-500 hover:text-gray-700 transition-colors"
                @click="showImageApiKey = !showImageApiKey"
              >
                <svg v-if="showImageApiKey" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd" />
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 2.015 0 3.861-.598 5.454-1.303z" />
                </svg>
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Базовый URL Images API</label>
            <input
              v-model="imageSettings.baseUrl"
              type="url"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
              :placeholder="imageBaseUrlPlaceholder"
            />
            <p class="text-xs text-gray-500 mt-1">{{ imageBaseUrlHint }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Модель изображений</label>
            <input
              v-model="imageSettings.model"
              type="text"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
              :placeholder="imageModelPlaceholder"
            />
            <p v-if="imageSettings.imageProvider === 'zai'" class="text-xs text-gray-500 mt-1">
              Для Z.ai: <code class="text-xs bg-gray-100 px-1 rounded">glm-image</code> или <code class="text-xs bg-gray-100 px-1 rounded">cogview-4-250304</code>. Значение «dall-e-3» на сервере заменяется на glm-image.
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">{{ imageSizeLabel }}</label>
            <div class="relative">
              <select
                v-model="imageSettings.size"
                class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all appearance-none pr-10"
              >
                <option value="1024x1024">1024×1024</option>
                <option value="1792x1024">1792×1024 (широкий)</option>
                <option value="1024x1792">1024×1792 (вертикальный)</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Кнопки сохранения -->
      <div class="flex items-center gap-3 pt-2">
        <button 
          @click="saveSettings"
          :disabled="saveLoading"
          class="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
        >
          <svg v-if="saveLoading" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ saveLoading ? 'Сохранение...' : 'Сохранить настройки' }}
        </button>
        
        <span v-if="saveResult" :class="saveResult.success ? 'text-green-600' : 'text-red-600'" class="text-sm">
          {{ saveResult.message }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '../api';

interface AISettings {
  aiProvider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

interface ImageGenSettings {
  imageProvider: 'openai' | 'custom' | 'zai';
  apiKey: string;
  baseUrl: string;
  model: string;
  size: string;
}

const settings = ref<AISettings>({
  aiProvider: 'openai',
  apiKey: '',
  baseUrl: '',
  model: '',
  temperature: 0.7,
  maxTokens: 2000,
});

const imageSettings = ref<ImageGenSettings>({
  imageProvider: 'openai',
  apiKey: '',
  baseUrl: '',
  model: 'dall-e-3',
  size: '1792x1024',
});

const showApiKey = ref(false);
const showImageApiKey = ref(false);
const saveLoading = ref(false);
const saveResult = ref<{ success: boolean; message: string } | null>(null);
const testLoading = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);

const modelPlaceholder = computed(() => {
  const placeholders: Record<string, string> = {
    openai: 'gpt-4, gpt-3.5-turbo',
    anthropic: 'claude-3-opus-20240229, claude-3-sonnet-20240229',
    zai: 'glm-5, glm-4',
    yandex: 'yandexgpt-lite, yandexgpt',
    gigachat: 'GigaChat, GigaChat-Pro',
    custom: 'model-name',
  };
  return placeholders[settings.value.aiProvider] || 'model-name';
});

const imageProviderHint = computed(() => {
  const p = imageSettings.value.imageProvider;
  if (p === 'custom') {
    return 'Укажите базовый URL до /v1 (как у OpenAI). Ключ можно задать здесь или использовать OpenAI/Custom из чата.';
  }
  if (p === 'zai') {
    return 'По умолчанию используется endpoint Z.ai; ключ можно задать здесь или взять из чата при провайдере Z.ai.';
  }
  return 'Стандартный OpenAI Images API. Ключ можно задать здесь или использовать из чата при провайдере OpenAI или «Пользовательский API».';
});

const imageBaseUrlPlaceholder = computed(() => {
  const p = imageSettings.value.imageProvider;
  if (p === 'zai') return 'https://api.z.ai/api/paas/v4';
  if (p === 'custom') return 'https://api.example.com/v1';
  return 'https://api.openai.com/v1';
});

const imageBaseUrlHint = computed(() => {
  const p = imageSettings.value.imageProvider;
  if (p === 'custom') {
    return 'Обязательно укажите URL, если не используете тот же базовый URL, что и в чате (OpenAI/Custom).';
  }
  if (p === 'zai') {
    return 'Укажите только корень до /v4 (например https://api.z.ai/api/paas/v4), без …/images/generations. Пусто — подставится api.z.ai/api/paas/v4 или URL чата Z.ai.';
  }
  return 'Пусто — как у основного чата (OpenAI/Custom) или https://api.openai.com/v1';
});

const imageModelPlaceholder = computed(() =>
  imageSettings.value.imageProvider === 'zai' ? 'glm-image' : 'dall-e-3',
);

const imageSizeLabel = computed(() =>
  imageSettings.value.imageProvider === 'zai'
    ? 'Размер (подбирается под GLM-Image)'
    : 'Размер (DALL·E 3)',
);

onMounted(async () => {
  try {
    const data = await api().get<AISettings>('/api/admin/settings/ai');
    settings.value = { ...settings.value, ...data };
  } catch {
    // Используем дефолтные значения
  }
  try {
    const img = await api().get<ImageGenSettings>('/api/admin/settings/ai-image');
    imageSettings.value = { ...imageSettings.value, ...img };
  } catch {
    // дефолты
  }
});

async function saveSettings() {
  saveLoading.value = true;
  saveResult.value = null;
  try {
    await api().put('/api/admin/settings/ai', settings.value);
    await api().put('/api/admin/settings/ai-image', imageSettings.value);
    saveResult.value = { success: true, message: 'Настройки сохранены' };
    setTimeout(() => saveResult.value = null, 3000);
  } catch (e) {
    saveResult.value = { success: false, message: e instanceof Error ? e.message : 'Ошибка сохранения' };
  } finally {
    saveLoading.value = false;
  }
}

async function testConnection() {
  testLoading.value = true;
  testResult.value = null;
  try {
    await api().post('/api/admin/settings/ai/test', {
      provider: settings.value.aiProvider,
      apiKey: settings.value.apiKey,
      baseUrl: settings.value.baseUrl || undefined,
      model: settings.value.model || undefined,
    });
    testResult.value = { success: true, message: 'Соединение успешно' };
  } catch (e) {
    testResult.value = { success: false, message: e instanceof Error ? e.message : 'Ошибка соединения' };
  } finally {
    testLoading.value = false;
  }
}
</script>
