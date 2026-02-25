<template>
  <div class="edit-page">
    <h1>{{ id ? 'Редактирование новости' : 'Новая новость' }}</h1>
    <div class="layout">
      <div class="form">
        <div class="field">
          <label>Заголовок</label>
          <input v-model="form.title" />
        </div>
        <div class="field">
          <label>Лид</label>
          <textarea v-model="form.summary" rows="2"></textarea>
        </div>
        <div class="field">
          <label>Текст</label>
          <textarea v-model="form.body" rows="8"></textarea>
        </div>
        <div class="field">
          <label>Раздел</label>
          <select v-model="form.sectionId">
            <option :value="undefined">—</option>
            <option v-for="s in sections" :key="s.id" :value="s.id">{{ s.title }}</option>
          </select>
        </div>
        <div class="actions">
          <button class="btn primary" @click="save">Сохранить</button>
          <router-link to="/news" class="btn">Отмена</router-link>
        </div>
      </div>
      <aside class="ai-panel">
        <h3>Редактирование с помощью ИИ</h3>
        <button class="btn block" :disabled="aiLoading" @click="factCheck">Проверить факты</button>
        <button class="btn block" :disabled="aiLoading" @click="aiAction('improve')">Улучшить текст</button>
        <button class="btn block" :disabled="aiLoading" @click="aiAction('shorten')">Сократить</button>
        <button class="btn block" :disabled="aiLoading" @click="aiAction('generate-title')">Сгенерировать заголовок</button>
        <button class="btn block" :disabled="aiLoading" @click="aiAction('generate-summary')">Сгенерировать лид</button>
        <div v-if="aiResult" class="ai-result">
          <h4>Результат</h4>
          <p class="ai-text">{{ aiResult }}</p>
          <button class="btn btn-sm" @click="applyAiResult">Подставить в поле</button>
        </div>
        <div v-if="factCheckResult" class="ai-result">
          <h4>Проверка фактов</h4>
          <p class="ai-text">{{ factCheckResult }}</p>
        </div>
      </aside>
    </div>
    <div v-if="id" class="history">
      <h3>История изменений</h3>
      <ul>
        <li v-for="h in history" :key="h.id">
          {{ formatDate(h.createdAt) }} — snapshot сохранён
        </li>
      </ul>
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
  return new Date(d).toLocaleString('ru-RU');
}
</script>

<style scoped>
.layout { display: flex; gap: 2rem; align-items: flex-start; }
.form { flex: 1; max-width: 600px; }
.field { margin-bottom: 1rem; }
.field label { display: block; margin-bottom: 0.25rem; }
.field input, .field textarea, .field select { width: 100%; padding: 0.5rem; }
.ai-panel { width: 280px; padding: 1rem; background: #f5f5f5; border-radius: 8px; }
.ai-panel h3 { margin-top: 0; }
.btn { padding: 0.5rem 1rem; margin-right: 0.5rem; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; background: #fff; text-decoration: none; color: inherit; display: inline-block; }
.btn.primary { background: #0d6efd; color: #fff; border-color: #0d6efd; }
.btn.block { display: block; width: 100%; margin-bottom: 0.5rem; }
.btn-sm { font-size: 0.85rem; padding: 0.35rem 0.75rem; margin-top: 0.5rem; }
.ai-result { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #ddd; }
.ai-text { font-size: 0.9rem; white-space: pre-wrap; }
.actions { margin-top: 1rem; }
.history { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd; }
.history ul { margin: 0; padding-left: 1.5rem; }
</style>
