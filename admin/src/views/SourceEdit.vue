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

      <!-- Правила использования материалов -->
      <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
        <div class="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <h2 class="font-semibold text-lg text-gray-900">Правила использования материалов</h2>
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-blue-200 text-blue-700 text-sm font-medium rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="generatingUsageRule"
            @click="openUsageRuleGeneratorModal"
          >
            <span>Сгенерировать по правилам источника</span>
          </button>
        </div>
        <div class="flex flex-col gap-6 max-w-3xl">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Инструкции для переписывания</label>
            <textarea
              v-model="form.usageRule.rewriteInstructions"
              rows="4"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all resize-y"
              placeholder="Например: избегать дословного цитирования, указывать источник в конце материала..."
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Максимальная доля цитат, %</label>
            <input
              v-model.number="form.usageRule.quoteLimitPercent"
              type="number"
              min="0"
              max="100"
              class="w-full max-w-xs bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            />
          </div>
          <div class="flex flex-col gap-3">
            <label class="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
              <input v-model="form.usageRule.requireAttribution" type="checkbox" class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-100" />
              Требовать обязательную атрибуцию источника
            </label>
            <label class="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
              <input v-model="form.usageRule.forbidVerbatimCopy" type="checkbox" class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-100" />
              Запретить дословное копирование
            </label>
            <label class="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
              <input v-model="form.usageRule.allowMerge" type="checkbox" class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-100" />
              Разрешить объединение с другими источниками
            </label>
            <label class="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
              <input v-model="form.usageRule.requiresDirectLinkAtTop" type="checkbox" class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-100" />
              Требовать прямую ссылку на источник в начале материала
            </label>
            <label class="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
              <input v-model="form.usageRule.allowAnalyticalReuse" type="checkbox" class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-100" />
              Разрешить использование аналитических и авторских материалов
            </label>
            <label class="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
              <input v-model="form.usageRule.requiresManualApprovalForAnalytical" type="checkbox" class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-100" />
              Требовать ручное одобрение для аналитических материалов
            </label>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Класс материалов по умолчанию</label>
            <select
              v-model="form.usageRule.contentClassDefault"
              class="w-full max-w-sm bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            >
              <option value="UNKNOWN">Не определен</option>
              <option value="NEWS">Новость</option>
              <option value="REPORT">Репортаж</option>
              <option value="ANALYSIS">Аналитика</option>
              <option value="OPINION">Мнение</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Примечание для объединения новостей</label>
            <textarea
              v-model="form.usageRule.mergeNotes"
              rows="3"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all resize-y"
              placeholder="Опишите дополнительные условия, которые нужно учитывать при объединении материалов."
            />
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

    <div
      v-if="showUsageRuleGeneratorModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        class="absolute inset-0 bg-gray-900/50"
        @click="closeUsageRuleGeneratorModal"
        aria-label="Закрыть модальное окно"
      />
      <div class="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-7">
        <div class="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Генерация правил использования</h3>
            <p class="text-sm text-gray-500 mt-1">
              Вставьте текст правил источника, и система заполнит поля ниже автоматически.
            </p>
          </div>
          <button
            type="button"
            class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            @click="closeUsageRuleGeneratorModal"
            aria-label="Закрыть"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Правила источника (свободный текст)</label>
            <textarea
              v-model="sourceRulesPrompt"
              rows="10"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all resize-y"
              placeholder="Вставьте здесь правила использования материалов с сайта-источника..."
            />
          </div>
          <div class="flex items-center justify-end gap-3">
            <button
              type="button"
              class="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              :disabled="generatingUsageRule"
              @click="closeUsageRuleGeneratorModal"
            >
              Отмена
            </button>
            <button
              type="button"
              class="px-4 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              :disabled="generatingUsageRule"
              @click="generateUsageRuleFromPrompt"
            >
              {{ generatingUsageRule ? 'Генерация...' : 'Сгенерировать и подставить' }}
            </button>
          </div>
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
  usageRule?: {
    rewriteInstructions?: string | null;
    quoteLimitPercent?: number;
    requireAttribution?: boolean;
    forbidVerbatimCopy?: boolean;
    allowMerge?: boolean;
    requiresDirectLinkAtTop?: boolean;
    allowAnalyticalReuse?: boolean;
    requiresManualApprovalForAnalytical?: boolean;
    contentClassDefault?: 'NEWS' | 'REPORT' | 'ANALYSIS' | 'OPINION' | 'UNKNOWN';
    mergeNotes?: string | null;
  } | null;
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
  usageRule: {
    rewriteInstructions: '',
    quoteLimitPercent: 20,
    requireAttribution: true,
    forbidVerbatimCopy: true,
    allowMerge: true,
    requiresDirectLinkAtTop: false,
    allowAnalyticalReuse: false,
    requiresManualApprovalForAnalytical: true,
    contentClassDefault: 'UNKNOWN' as 'NEWS' | 'REPORT' | 'ANALYSIS' | 'OPINION' | 'UNKNOWN',
    mergeNotes: '',
  },
  isActive: true,
  filters: [] as SourceFilter[],
});
const loading = ref(false);
const loadError = ref('');
const saveLoading = ref(false);
const deleteLoading = ref(false);
const availableRegions = ref<string[]>([]);
const showUsageRuleGeneratorModal = ref(false);
const sourceRulesPrompt = ref('');
const generatingUsageRule = ref(false);

interface SourceUsageRulePayload {
  rewriteInstructions: string;
  quoteLimitPercent: number;
  requireAttribution: boolean;
  forbidVerbatimCopy: boolean;
  allowMerge: boolean;
  requiresDirectLinkAtTop: boolean;
  allowAnalyticalReuse: boolean;
  requiresManualApprovalForAnalytical: boolean;
  contentClassDefault: 'NEWS' | 'REPORT' | 'ANALYSIS' | 'OPINION' | 'UNKNOWN';
  mergeNotes: string;
}

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

function openUsageRuleGeneratorModal() {
  showUsageRuleGeneratorModal.value = true;
}

function closeUsageRuleGeneratorModal() {
  if (generatingUsageRule.value) return;
  showUsageRuleGeneratorModal.value = false;
}

function parseBool(v: unknown, fallback: boolean): boolean {
  if (v === true || v === false) return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return fallback;
}

function normalizeUsageRuleFromApi(raw: unknown): SourceUsageRulePayload {
  const root = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const inner =
    root.usageRule && typeof root.usageRule === 'object'
      ? (root.usageRule as Record<string, unknown>)
      : root;

  const str = (a: unknown, b: unknown) => {
    const v = a !== undefined && a !== null ? a : b;
    return typeof v === 'string' ? v.trim() : '';
  };

  const quoteRaw =
    inner.quoteLimitPercent ??
    inner.quote_limit_percent ??
    inner.quoteLimit;
  const quoteLimitRaw = Number(quoteRaw);
  const quoteLimitPercent = Number.isFinite(quoteLimitRaw)
    ? Math.max(0, Math.min(100, Math.round(quoteLimitRaw)))
    : 20;

  return {
    rewriteInstructions: str(inner.rewriteInstructions, inner.rewrite_instructions),
    quoteLimitPercent,
    requireAttribution: parseBool(
      inner.requireAttribution ?? inner.require_attribution,
      true,
    ),
    forbidVerbatimCopy: parseBool(
      inner.forbidVerbatimCopy ?? inner.forbid_verbatim_copy,
      true,
    ),
    allowMerge: parseBool(inner.allowMerge ?? inner.allow_merge, true),
    requiresDirectLinkAtTop: parseBool(
      inner.requiresDirectLinkAtTop ?? inner.requires_direct_link_at_top,
      false,
    ),
    allowAnalyticalReuse: parseBool(
      inner.allowAnalyticalReuse ?? inner.allow_analytical_reuse,
      false,
    ),
    requiresManualApprovalForAnalytical: parseBool(
      inner.requiresManualApprovalForAnalytical ?? inner.requires_manual_approval_for_analytical,
      true,
    ),
    contentClassDefault: (
      typeof (inner.contentClassDefault ?? inner.content_class_default) === 'string'
        ? String(inner.contentClassDefault ?? inner.content_class_default).toUpperCase()
        : 'UNKNOWN'
    ) as 'NEWS' | 'REPORT' | 'ANALYSIS' | 'OPINION' | 'UNKNOWN',
    mergeNotes: str(inner.mergeNotes, inner.merge_notes),
  };
}

function applyUsageRuleToForm(usageRule: SourceUsageRulePayload) {
  form.value.usageRule = {
    ...form.value.usageRule,
    rewriteInstructions: usageRule.rewriteInstructions || '',
    quoteLimitPercent: usageRule.quoteLimitPercent,
    requireAttribution: usageRule.requireAttribution,
    forbidVerbatimCopy: usageRule.forbidVerbatimCopy,
    allowMerge: usageRule.allowMerge,
    requiresDirectLinkAtTop: usageRule.requiresDirectLinkAtTop,
    allowAnalyticalReuse: usageRule.allowAnalyticalReuse,
    requiresManualApprovalForAnalytical: usageRule.requiresManualApprovalForAnalytical,
    contentClassDefault: usageRule.contentClassDefault,
    mergeNotes: usageRule.mergeNotes || '',
  };
}

async function generateUsageRuleFromPrompt() {
  const sourceRulesText = sourceRulesPrompt.value.trim();
  if (sourceRulesText.length < 10) {
    alert('Введите текст правил источника (минимум 10 символов)');
    return;
  }
  generatingUsageRule.value = true;
  try {
    const raw = await api().post<unknown>(
      '/api/admin/sources/ai/generate-usage-rule',
      { sourceRulesText },
    );
    const usageRule = normalizeUsageRuleFromApi(raw);
    applyUsageRuleToForm(usageRule);
    showUsageRuleGeneratorModal.value = false;
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка генерации правил');
  } finally {
    generatingUsageRule.value = false;
  }
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
      usageRule: {
        rewriteInstructions: data.usageRule?.rewriteInstructions || '',
        quoteLimitPercent: typeof data.usageRule?.quoteLimitPercent === 'number' ? data.usageRule.quoteLimitPercent : 20,
        requireAttribution: data.usageRule?.requireAttribution !== false,
        forbidVerbatimCopy: data.usageRule?.forbidVerbatimCopy !== false,
        allowMerge: data.usageRule?.allowMerge !== false,
        requiresDirectLinkAtTop: data.usageRule?.requiresDirectLinkAtTop === true,
        allowAnalyticalReuse: data.usageRule?.allowAnalyticalReuse === true,
        requiresManualApprovalForAnalytical: data.usageRule?.requiresManualApprovalForAnalytical !== false,
        contentClassDefault: data.usageRule?.contentClassDefault || 'UNKNOWN',
        mergeNotes: data.usageRule?.mergeNotes || '',
      },
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
  const quoteLimit = Number(form.value.usageRule.quoteLimitPercent);
  if (!Number.isFinite(quoteLimit) || quoteLimit < 0 || quoteLimit > 100) {
    alert('Доля цитат должна быть в диапазоне 0–100');
    return false;
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
      usageRule: {
        rewriteInstructions: form.value.usageRule.rewriteInstructions.trim() || null,
        quoteLimitPercent: Number(form.value.usageRule.quoteLimitPercent),
        requireAttribution: Boolean(form.value.usageRule.requireAttribution),
        forbidVerbatimCopy: Boolean(form.value.usageRule.forbidVerbatimCopy),
        allowMerge: Boolean(form.value.usageRule.allowMerge),
        requiresDirectLinkAtTop: Boolean(form.value.usageRule.requiresDirectLinkAtTop),
        allowAnalyticalReuse: Boolean(form.value.usageRule.allowAnalyticalReuse),
        requiresManualApprovalForAnalytical: Boolean(form.value.usageRule.requiresManualApprovalForAnalytical),
        contentClassDefault: form.value.usageRule.contentClassDefault,
        mergeNotes: form.value.usageRule.mergeNotes.trim() || null,
      },
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
