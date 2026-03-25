<template>
  <div class="bg-transparent">
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-bold text-2xl text-gray-900 tracking-tight">{{ id ? 'Редактирование новости' : 'Новая новость' }}</h1>
      <router-link to="/news" class="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">← Назад к списку</router-link>
    </div>
    
    <div class="flex flex-col lg:flex-row gap-6 items-start">
      <div class="flex-1 w-full bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
        <div class="flex flex-col gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Заголовок</label>
            <input v-model="form.title" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all font-medium" placeholder="Введите заголовок новости" />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Лид (Summary)</label>
            <textarea v-model="form.summary" rows="3" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all resize-y" placeholder="Краткое содержание..."></textarea>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Текст</label>
            <BlockEditor v-model="form.body" />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Раздел</label>
            <div class="relative">
              <select v-model="form.sectionId" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all appearance-none pr-10">
                <option :value="undefined">— Без раздела —</option>
                <option v-for="s in sections" :key="s.id" :value="s.id">{{ s.title }}</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Регион</label>
            <div class="relative">
              <select v-model="form.region" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all appearance-none pr-10">
                <option value="">— Без региона —</option>
                <option value="Иваново">Иваново</option>
                <option value="Другой">Другой</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Публикация в источнике</label>
            <p class="text-xs text-gray-500 mb-2">Дата и время материала у первоисточника (RSS, sitemap, страница). Можно уточнить вручную.</p>
            <input
              v-model="form.sourcePublishedAtLocal"
              type="datetime-local"
              class="w-full max-w-md bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            />
            <button
              v-if="id"
              type="button"
              class="mt-2 text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2"
              @click="form.sourcePublishedAtLocal = ''"
            >
              Сбросить дату в источнике
            </button>
          </div>
          
          <!-- Индикатор статуса -->
          <div v-if="id && currentStatus" class="pt-2">
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium"
              :class="{
                'bg-yellow-50 text-yellow-700 border border-yellow-200': currentStatus === 'PENDING',
                'bg-green-50 text-green-700 border border-green-200': currentStatus === 'PUBLISHED',
                'bg-red-50 text-red-700 border border-red-200': currentStatus === 'REJECTED'
              }"
            >
              <span v-if="currentStatus === 'PENDING'">📝 На модерации</span>
              <span v-else-if="currentStatus === 'PUBLISHED'">✅ Опубликовано</span>
              <span v-else-if="currentStatus === 'REJECTED'">❌ Отклонено</span>
            </div>
          </div>
          
          <!-- Кнопки действий -->
          <div class="pt-4 mt-2 border-t border-gray-100 flex flex-wrap items-center gap-3">
            <!-- Для новой новости -->
            <template v-if="!id">
              <button class="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all shadow-sm shadow-blue-200" @click="saveAsPending">Создать новость</button>
              <router-link to="/news" class="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">Отмена</router-link>
            </template>
            
            <!-- Для существующей новости -->
            <template v-else>
              <button 
                class="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all shadow-sm shadow-blue-200 inline-flex items-center gap-2" 
                :disabled="saveLoading"
                @click="save"
              >
                <svg v-if="saveLoading" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" /></svg>
                {{ saveLoading ? 'Сохранение...' : 'Сохранить' }}
              </button>
              
              <button 
                v-if="currentStatus !== 'PUBLISHED'"
                class="px-6 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 focus:ring-4 focus:ring-green-100 focus:outline-none transition-all shadow-sm shadow-green-200 inline-flex items-center gap-2" 
                :disabled="publishLoading"
                @click="publish"
              >
                <svg v-if="publishLoading" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                {{ publishLoading ? 'Публикация...' : 'Опубликовать' }}
              </button>
              
              <button 
                v-if="currentStatus !== 'REJECTED'"
                class="px-6 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 focus:ring-4 focus:ring-red-100 focus:outline-none transition-all shadow-sm shadow-red-200 inline-flex items-center gap-2" 
                :disabled="rejectLoading"
                @click="reject"
              >
                <svg v-if="rejectLoading" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                {{ rejectLoading ? 'Отклонение...' : 'Отклонить' }}
              </button>
              
              <router-link to="/news" class="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">К списку</router-link>
              
              <button type="button" class="px-6 py-3 border border-gray-200 text-gray-500 font-medium rounded-xl hover:bg-gray-50 hover:text-red-600 transition-colors ml-auto" @click="remove">Удалить</button>
            </template>
          </div>
        </div>
      </div>
      
      <div class="w-full lg:w-[320px] shrink-0 flex flex-col gap-6">
        <!-- Парсинг текста -->
        <aside v-if="id" class="bg-emerald-50/50 rounded-3xl p-6 border border-emerald-100">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" /></svg>
            </div>
            <h3 class="font-bold text-gray-900">Парсинг текста</h3>
          </div>
          
          <div class="flex flex-col gap-2">
            <button 
              class="w-full text-left px-4 py-2.5 bg-white border border-emerald-100 rounded-xl text-sm font-medium text-gray-700 hover:border-emerald-300 hover:text-emerald-700 transition-all shadow-sm disabled:opacity-50" 
              :disabled="parseLoading" 
              @click="parseBody"
            >
              <span v-if="parseLoading" class="flex items-center gap-2">
                <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Загрузка...
              </span>
              <span v-else>Загрузить полный текст</span>
            </button>
          </div>
          
          <div v-if="parseResult" class="mt-4 pt-4 border-t border-emerald-100">
            <div :class="parseResult.success ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'" class="px-3 py-2 rounded-lg text-xs">
              {{ parseResult.message }}
            </div>
          </div>
        </aside>

        <aside class="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" /></svg>
            </div>
            <h3 class="font-bold text-gray-900">ИИ Ассистент</h3>
          </div>
          
          <div class="flex flex-col gap-2">
            <button class="w-full text-left px-4 py-2.5 bg-white border border-indigo-100 rounded-xl text-sm font-medium text-gray-700 hover:border-indigo-300 hover:text-indigo-700 transition-all shadow-sm disabled:opacity-50" :disabled="aiLoading" @click="factCheck">Проверить факты</button>
            <button class="w-full text-left px-4 py-2.5 bg-white border border-indigo-100 rounded-xl text-sm font-medium text-gray-700 hover:border-indigo-300 hover:text-indigo-700 transition-all shadow-sm disabled:opacity-50" :disabled="aiLoading" @click="aiAction('improve')">Улучшить текст</button>
            <button class="w-full text-left px-4 py-2.5 bg-white border border-indigo-100 rounded-xl text-sm font-medium text-gray-700 hover:border-indigo-300 hover:text-indigo-700 transition-all shadow-sm disabled:opacity-50" :disabled="aiLoading" @click="aiAction('shorten')">Сократить текст</button>
            <button class="w-full text-left px-4 py-2.5 bg-white border border-indigo-100 rounded-xl text-sm font-medium text-gray-700 hover:border-indigo-300 hover:text-indigo-700 transition-all shadow-sm disabled:opacity-50" :disabled="aiLoading" @click="aiAction('generate-title')">Придумать заголовок</button>
            <button class="w-full text-left px-4 py-2.5 bg-white border border-indigo-100 rounded-xl text-sm font-medium text-gray-700 hover:border-indigo-300 hover:text-indigo-700 transition-all shadow-sm disabled:opacity-50" :disabled="aiLoading" @click="aiAction('generate-summary')">Сгенерировать лид</button>
          </div>

          <div v-if="aiLoading" class="mt-4 flex items-center justify-center p-4">
             <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          </div>

          <div v-if="aiResult" class="mt-4 pt-4 border-t border-indigo-100">
            <h4 class="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">Результат ИИ</h4>
            <div class="bg-white rounded-xl p-3 border border-indigo-100 text-sm text-gray-700 mb-3 max-h-[300px] overflow-y-auto font-mono whitespace-pre-wrap leading-relaxed">{{ aiResult }}</div>
            <button class="w-full py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors" @click="applyAiResult">Подставить в поле</button>
          </div>
          
          <div v-if="factCheckResult" class="mt-4 pt-4 border-t border-indigo-100">
            <h4 class="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">Фактчекинг</h4>
            <div class="bg-white rounded-xl p-3 border border-indigo-100 text-sm text-gray-700 max-h-[300px] overflow-y-auto whitespace-pre-wrap">{{ factCheckResult }}</div>
          </div>
        </aside>

        <div v-if="id && history.length" class="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <h3 class="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            История
          </h3>
          <ul class="flex flex-col gap-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-gray-200">
            <li v-for="h in history" :key="h.id" class="flex gap-3 relative z-10">
              <div class="w-6 h-6 rounded-full bg-white border-2 border-gray-300 shrink-0 mt-0.5"></div>
              <div>
                <p class="text-sm font-medium text-gray-900">Сохранено</p>
                <p class="text-xs text-gray-500">{{ formatDate(h.createdAt) }}</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../../api';
import BlockEditor from '../../components/BlockEditor.vue';

const props = defineProps<{ id?: string }>();
const route = useRoute();
const router = useRouter();
const id = computed(() => props.id || (route.params.id as string));

const form = ref({
  title: '',
  summary: '',
  body: '',
  sectionId: undefined as string | undefined,
  region: '' as string,
  /** Значение для input[type=datetime-local] (локальное время браузера) */
  sourcePublishedAtLocal: '' as string,
});

const currentStatus = ref<'PENDING' | 'PUBLISHED' | 'REJECTED' | null>(null);

const sections = ref<{ id: string; title: string }[]>([]);
const history = ref<{ id: string; createdAt: string }[]>([]);
const aiLoading = ref(false);
const aiResult = ref('');
const factCheckResult = ref('');
const lastAiField = ref<'title' | 'summary' | 'body'>('body');
const parseLoading = ref(false);
const parseResult = ref<{ success: boolean; message: string } | null>(null);
const saveLoading = ref(false);
const publishLoading = ref(false);
const rejectLoading = ref(false);

function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sourcePublishedAtPayload(): Date | null {
  const local = form.value.sourcePublishedAtLocal;
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

onMounted(async () => {
  try {
    const s = await api().get<{ id: string; title: string }[]>('/api/admin/sections');
    sections.value = s;
  } catch {}
  if (id.value) {
    try {
      const item = await api().get<{
        title: string;
        summary?: string;
        body?: string;
        sectionId?: string;
        region?: string;
        status?: string;
        sourcePublishedAt?: string | null;
      }>(`/api/admin/news/${id.value}`);
      form.value = {
        title: item.title || '',
        summary: item.summary || '',
        body: item.body || '',
        sectionId: item.sectionId || undefined,
        region: item.region || '',
        sourcePublishedAtLocal: isoToDatetimeLocal(item.sourcePublishedAt),
      };
      currentStatus.value = (item.status === 'PUBLISHED' || item.status === 'REJECTED' ? item.status : 'PENDING') as 'PENDING' | 'PUBLISHED' | 'REJECTED';
      const hist = await api().get<{ id: string; createdAt: string }[]>(`/api/admin/news/${id.value}/history`);
      history.value = hist;
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка загрузки');
    }
  }
});

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
});

// Создать новую новость со статусом PENDING
async function saveAsPending() {
  try {
    const body: Record<string, unknown> = {
      title: form.value.title,
      summary: form.value.summary,
      body: form.value.body,
      sectionId: form.value.sectionId,
      region: form.value.region,
    };
    const sp = sourcePublishedAtPayload();
    if (sp !== null) body.sourcePublishedAt = sp;
    await api().post('/api/admin/news', body);
    router.push('/news');
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка сохранения');
  }
}

// Сохранить изменения без изменения статуса
async function save() {
  if (!id.value) return;
  saveLoading.value = true;
  try {
    await api().put(`/api/admin/news/${id.value}`, { 
      title: form.value.title, 
      summary: form.value.summary, 
      body: form.value.body, 
      sectionId: form.value.sectionId, 
      region: form.value.region,
      sourcePublishedAt: sourcePublishedAtPayload(),
    });
    router.push('/news');
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка сохранения');
  } finally {
    saveLoading.value = false;
  }
}

// Опубликовать новость (сохранить + опубликовать)
async function publish() {
  if (!id.value) return;
  publishLoading.value = true;
  try {
    // Сначала сохраняем изменения
    await api().put(`/api/admin/news/${id.value}`, { 
      title: form.value.title, 
      summary: form.value.summary, 
      body: form.value.body, 
      sectionId: form.value.sectionId, 
      region: form.value.region,
      sourcePublishedAt: sourcePublishedAtPayload(),
    });
    // Затем меняем статус на PUBLISHED
    await api().patch(`/api/admin/news/${id.value}/status`, { status: 'PUBLISHED' });
    currentStatus.value = 'PUBLISHED';
    router.push('/news');
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка публикации');
  } finally {
    publishLoading.value = false;
  }
}

// Отклонить новость (сохранить + отклонить + закрыть)
async function reject() {
  if (!id.value) return;
  rejectLoading.value = true;
  try {
    // Сначала сохраняем изменения
    await api().put(`/api/admin/news/${id.value}`, { 
      title: form.value.title, 
      summary: form.value.summary, 
      body: form.value.body, 
      sectionId: form.value.sectionId, 
      region: form.value.region,
      sourcePublishedAt: sourcePublishedAtPayload(),
    });
    // Затем меняем статус на REJECTED
    await api().patch(`/api/admin/news/${id.value}/status`, { status: 'REJECTED' });
    currentStatus.value = 'REJECTED';
    router.push('/news');
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка отклонения');
  } finally {
    rejectLoading.value = false;
  }
}

async function remove() {
  if (!id.value) return;
  if (!confirm('Удалить новость?')) return;
  try {
    await api().delete(`/api/admin/news/${id.value}`);
    router.push('/news');
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка удаления');
  }
}

async function factCheck() {
  if (!id.value) { alert('Сначала сохраните новость'); return; }
  factCheckResult.value = '';
  aiLoading.value = true;
  try {
    const r = await api().post<{ summary?: string; raw?: string }>(`/api/admin/news/${id.value}/fact-check`, {});
    factCheckResult.value = r.summary || (typeof r.raw === 'string' ? r.raw : JSON.stringify(r));
  } catch (e) {
    factCheckResult.value = e instanceof Error ? e.message : 'Ошибка проверки';
  } finally {
    aiLoading.value = false;
  }
}

async function aiAction(action: string) {
  aiResult.value = '';
  const field = action === 'generate-title' ? 'title' : action === 'generate-summary' ? 'summary' : 'body';
  lastAiField.value = field;
  
  // Определяем текст для обработки
  let text = '';
  if (action === 'generate-title' || action === 'generate-summary') {
    // Для генерации используем body, если есть, иначе title
    text = form.value.body || form.value.title || '';
  } else {
    // Для improve/shorten используем соответствующее поле
    text = field === 'title' ? form.value.title : field === 'summary' ? form.value.summary : form.value.body;
  }
  
  if (!text && (action === 'improve' || action === 'shorten')) {
    alert('Введите текст для обработки');
    return;
  }
  
  if (!text && (action === 'generate-title' || action === 'generate-summary')) {
    alert('Введите текст новости для генерации');
    return;
  }
  
  aiLoading.value = true;
  try {
    const r = await api().post<{ text: string }>('/api/admin/news/ai/edit', {
      newsId: id.value || undefined,
      text,
      field,
      action,
    });
    aiResult.value = r.text || '';
  } catch (e) {
    aiResult.value = e instanceof Error ? e.message : 'Ошибка ИИ';
  } finally {
    aiLoading.value = false;
  }
}

function applyAiResult() {
  if (lastAiField.value === 'title') form.value.title = aiResult.value;
  else if (lastAiField.value === 'summary') form.value.summary = aiResult.value;
  else form.value.body = aiResult.value;
}

async function parseBody() {
  if (!id.value) return;
  parseLoading.value = true;
  parseResult.value = null;
  try {
    const r = await api().post<{ message: string; item?: { body?: string; sourcePublishedAt?: string | null } }>(
      `/api/admin/news/${id.value}/parse-body`,
      {},
    );
    parseResult.value = { success: true, message: r.message || 'Текст загружается...' };
    if (r.item?.body) {
      form.value.body = r.item.body;
    }
    if (r.item?.sourcePublishedAt) {
      form.value.sourcePublishedAtLocal = isoToDatetimeLocal(r.item.sourcePublishedAt);
    }
    if (!r.item?.body) {
      startPollingForBody();
    }
  } catch (e) {
    parseResult.value = { success: false, message: e instanceof Error ? e.message : 'Ошибка загрузки текста' };
  } finally {
    parseLoading.value = false;
  }
}

let pollInterval: number | null = null;

function startPollingForBody() {
  // Очищаем предыдущий интервал если есть
  if (pollInterval) {
    clearInterval(pollInterval);
  }
  
  let attempts = 0;
  const maxAttempts = 30; // 30 секунд максимум
  
  pollInterval = window.setInterval(async () => {
    attempts++;
    
    try {
      const item = await api().get<{ body?: string; sourcePublishedAt?: string | null }>(`/api/admin/news/${id.value}`);
      if (item.sourcePublishedAt && !form.value.sourcePublishedAtLocal) {
        form.value.sourcePublishedAtLocal = isoToDatetimeLocal(item.sourcePublishedAt);
      }
      if (item.body && item.body !== form.value.body) {
        form.value.body = item.body;
        parseResult.value = { success: true, message: 'Текст успешно загружен!' };
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      }
    } catch (e) {
      console.error('Polling error:', e);
    }
    
    // Останавливаем после максимального количества попыток
    if (attempts >= maxAttempts && pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
      parseResult.value = { success: false, message: 'Время ожидания истекло. Попробуйте обновить страницу.' };
    }
  }, 1000); // Проверяем каждую секунду
}

function formatDate(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
</script>