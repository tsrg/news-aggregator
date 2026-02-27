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
            <textarea v-model="form.body" rows="12" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all resize-y font-mono text-sm leading-relaxed" placeholder="Полный текст новости (поддерживается HTML)..."></textarea>
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
          
          <div class="pt-4 mt-2 border-t border-gray-100 flex items-center gap-3">
            <button class="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all shadow-sm shadow-blue-200" @click="save">Сохранить новость</button>
            <router-link to="/news" class="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">Отмена</router-link>
          </div>
        </div>
      </div>
      
      <div class="w-full lg:w-[320px] shrink-0 flex flex-col gap-6">
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
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../../api';

const props = defineProps<{ id?: string }>();
const route = useRoute();
const router = useRouter();
const id = computed(() => props.id || (route.params.id as string));

const form = ref({
  title: '',
  summary: '',
  body: '',
  sectionId: undefined as string | undefined,
});

const sections = ref<{ id: string; title: string }[]>([]);
const history = ref<{ id: string; createdAt: string }[]>([]);
const aiLoading = ref(false);
const aiResult = ref('');
const factCheckResult = ref('');
const lastAiField = ref<'title' | 'summary' | 'body'>('body');

onMounted(async () => {
  try {
    const s = await api().get<{ id: string; title: string }[]>('/api/admin/sections');
    sections.value = s;
  } catch {}
  if (id.value) {
    try {
      const item = await api().get<{ title: string; summary?: string; body?: string; sectionId?: string }>(`/api/admin/news/${id.value}`);
      form.value = {
        title: item.title || '',
        summary: item.summary || '',
        body: item.body || '',
        sectionId: item.sectionId || undefined,
      };
      const hist = await api().get<{ id: string; createdAt: string }[]>(`/api/admin/news/${id.value}/history`);
      history.value = hist;
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка загрузки');
    }
  }
});

async function save() {
  try {
    if (id.value) {
      await api().put(`/api/admin/news/${id.value}`, form.value);
    } else {
      await api().post('/api/admin/news', form.value);
    }
    router.push('/news');
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка сохранения');
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
  const text = field === 'title' ? form.value.title : field === 'summary' ? form.value.summary : form.value.body;
  if (!text && (action === 'improve' || action === 'shorten')) {
    alert('Введите текст для обработки');
    return;
  }
  aiLoading.value = true;
  try {
    const r = await api().post<{ text: string }>('/api/admin/news/ai/edit', {
      newsId: id.value || undefined,
      text: text || form.value.body || form.value.title,
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

function formatDate(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
</script>