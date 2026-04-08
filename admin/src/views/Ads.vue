<template>
  <div class="max-w-5xl mx-auto">
    <h1 class="font-bold text-2xl text-gray-900 tracking-tight mb-6">Реклама</h1>

    <section class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Маркировка по умолчанию</h2>
      <p class="text-sm text-gray-500 mb-4">
        Подставляется в подпись «Реклама», если в креативе не указаны свои ИНН / ОГРН / наименование. ERID для креативов задаётся отдельно в каждом объявлении или после интеграции с ОРД.
      </p>
      <form class="flex flex-col gap-4 max-w-xl" @submit.prevent="saveMarking">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Наименование (распространитель / рекламодатель)</label>
          <input v-model="marking.advertiserName" type="text" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">ИНН</label>
          <input v-model="marking.advertiserInn" type="text" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">ОГРН</label>
          <input v-model="marking.advertiserOgrn" type="text" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Примечание (опционально)</label>
          <textarea v-model="marking.distributorNote" rows="2" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 resize-y" />
        </div>
        <div>
          <button
            type="submit"
            class="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50"
            :disabled="markingSaving"
          >
            {{ markingSaving ? 'Сохранение…' : 'Сохранить маркировку' }}
          </button>
        </div>
      </form>
    </section>

    <section class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
      <h2 class="text-lg font-semibold text-gray-900 mb-2">Креативы по слотам</h2>
      <p class="text-sm text-gray-500 mb-4">Несколько креативов в одном слоте показываются друг под другом. Срок — по полям «с / по».</p>

      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">Слот</label>
        <select
          v-model="selectedPlacementId"
          class="w-full max-w-lg bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900"
          @change="loadCreatives"
        >
          <option v-for="p in placements" :key="p.id" :value="p.id">{{ p.title }} ({{ p.code }})</option>
        </select>
      </div>

      <div v-if="creativesLoading" class="text-sm text-gray-500 py-8">Загрузка…</div>
      <div v-else class="overflow-x-auto rounded-xl border border-gray-100">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-50 text-left text-gray-600">
            <tr>
              <th class="px-4 py-3 font-medium">Порядок</th>
              <th class="px-4 py-3 font-medium">Тип</th>
              <th class="px-4 py-3 font-medium">Активен</th>
              <th class="px-4 py-3 font-medium">Срок</th>
              <th class="px-4 py-3 font-medium">ERID</th>
              <th class="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in creatives" :key="c.id" class="border-t border-gray-100 hover:bg-gray-50/80">
              <td class="px-4 py-3">{{ c.sortOrder }}</td>
              <td class="px-4 py-3">{{ c.type }}</td>
              <td class="px-4 py-3">{{ c.isActive ? 'да' : 'нет' }}</td>
              <td class="px-4 py-3 text-xs text-gray-600">
                <span v-if="c.validFrom">{{ fmtDate(c.validFrom) }}</span>
                <span v-else>—</span>
                —
                <span v-if="c.validTo">{{ fmtDate(c.validTo) }}</span>
                <span v-else>—</span>
              </td>
              <td class="px-4 py-3 font-mono text-xs truncate max-w-[140px]" :title="c.erid || ''">{{ c.erid || '—' }}</td>
              <td class="px-4 py-3 text-right">
                <button type="button" class="text-blue-600 hover:underline mr-3" @click="editCreative(c)">Изменить</button>
                <button type="button" class="text-red-600 hover:underline" @click="deleteCreative(c)">Удалить</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <button
        type="button"
        class="mt-6 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800"
        :disabled="!selectedPlacementId"
        @click="startNewCreative"
      >
        Добавить креатив
      </button>

      <div v-if="editorOpen" class="mt-8 pt-8 border-t border-gray-100">
        <h3 class="font-semibold text-gray-900 mb-4">{{ editingId ? 'Редактирование' : 'Новый креатив' }}</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Тип</label>
            <select v-model="draft.type" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3">
              <option value="BANNER">Баннер</option>
              <option value="YANDEX_RTB">Яндекс РТБ / РСЯ</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Порядок (sort)</label>
            <input v-model.number="draft.sortOrder" type="number" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3" />
          </div>
          <div class="md:col-span-2 flex items-center gap-2">
            <input id="ad-active" v-model="draft.isActive" type="checkbox" class="rounded border-gray-300" />
            <label for="ad-active" class="text-sm text-gray-700">Активен</label>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Показ с (дата/время, опционально)</label>
            <input v-model="draft.validFromLocal" type="datetime-local" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Показ по</label>
            <input v-model="draft.validToLocal" type="datetime-local" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3" />
          </div>

          <template v-if="draft.type === 'BANNER'">
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">URL изображения</label>
              <input v-model="draft.imageUrl" type="text" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm" />
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Ссылка перехода</label>
              <input v-model="draft.targetUrl" type="text" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm" />
            </div>
            <div class="md:col-span-2 flex items-center gap-2">
              <input id="ad-newtab" v-model="draft.openInNewTab" type="checkbox" class="rounded border-gray-300" />
              <label for="ad-newtab" class="text-sm text-gray-700">Новая вкладка</label>
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Alt</label>
              <input v-model="draft.altText" type="text" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3" />
            </div>
          </template>

          <template v-else>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">blockId (Яндекс)</label>
              <input v-model="draft.yandexBlockId" type="text" placeholder="R-A-XXXXXX-Y" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-mono text-sm" />
            </div>
          </template>

          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">ERID (токен маркировки)</label>
            <input v-model="draft.erid" type="text" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-mono text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Рекламодатель (переопределение)</label>
            <input v-model="draft.advertiserName" type="text" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">ИНН</label>
            <input v-model="draft.advertiserInn" type="text" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">ОГРН</label>
            <input v-model="draft.advertiserOgrn" type="text" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm" />
          </div>

          <div class="md:col-span-2 flex gap-3 pt-2">
            <button
              type="button"
              class="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50"
              :disabled="creativeSaving"
              @click="saveCreative"
            >
              {{ creativeSaving ? 'Сохранение…' : 'Сохранить креатив' }}
            </button>
            <button type="button" class="px-5 py-2.5 border border-gray-200 text-sm rounded-xl hover:bg-gray-50" @click="cancelEditor">Отмена</button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../api';

type Placement = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  _count?: { creatives: number };
};

type Creative = {
  id: string;
  placementId: string;
  sortOrder: number;
  type: 'BANNER' | 'YANDEX_RTB';
  isActive: boolean;
  validFrom?: string | null;
  validTo?: string | null;
  imageUrl?: string | null;
  targetUrl?: string | null;
  openInNewTab?: boolean;
  altText?: string | null;
  yandexConfig?: Record<string, unknown> | null;
  erid?: string | null;
  advertiserName?: string | null;
  advertiserInn?: string | null;
  advertiserOgrn?: string | null;
  internalRegistryId?: string;
};

const marking = ref({
  advertiserName: '',
  advertiserInn: '',
  advertiserOgrn: '',
  distributorNote: '',
});
const markingSaving = ref(false);

const placements = ref<Placement[]>([]);
const selectedPlacementId = ref('');
const creatives = ref<Creative[]>([]);
const creativesLoading = ref(false);

const editorOpen = ref(false);
const editingId = ref<string | null>(null);
const creativeSaving = ref(false);

const draft = ref({
  type: 'BANNER' as 'BANNER' | 'YANDEX_RTB',
  sortOrder: 0,
  isActive: true,
  validFromLocal: '',
  validToLocal: '',
  imageUrl: '',
  targetUrl: '',
  openInNewTab: true,
  altText: '',
  yandexBlockId: '',
  erid: '',
  advertiserName: '',
  advertiserInn: '',
  advertiserOgrn: '',
});

function isoToLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('ru-RU');
  } catch {
    return iso;
  }
}

async function loadMarking() {
  const m = await api().get<typeof marking.value>('/api/admin/ads/marking');
  marking.value = { ...marking.value, ...m };
}

async function saveMarking() {
  markingSaving.value = true;
  try {
    await api().put('/api/admin/ads/marking', marking.value);
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка');
  } finally {
    markingSaving.value = false;
  }
}

async function loadPlacements() {
  const list = await api().get<Placement[]>('/api/admin/ads/placements');
  placements.value = list;
  if (!selectedPlacementId.value && list.length) {
    selectedPlacementId.value = list[0].id;
  }
}

async function loadCreatives() {
  if (!selectedPlacementId.value) {
    creatives.value = [];
    return;
  }
  creativesLoading.value = true;
  try {
    creatives.value = await api().get<Creative[]>(
      `/api/admin/ads/creatives?placementId=${encodeURIComponent(selectedPlacementId.value)}`,
    );
  } finally {
    creativesLoading.value = false;
  }
}

function resetDraft() {
  editingId.value = null;
  draft.value = {
    type: 'BANNER',
    sortOrder: creatives.value.length,
    isActive: true,
    validFromLocal: '',
    validToLocal: '',
    imageUrl: '',
    targetUrl: '',
    openInNewTab: true,
    altText: '',
    yandexBlockId: '',
    erid: '',
    advertiserName: '',
    advertiserInn: '',
    advertiserOgrn: '',
  };
}

function startNewCreative() {
  resetDraft();
  editorOpen.value = true;
}

function editCreative(c: Creative) {
  editingId.value = c.id;
  const bid =
    c.yandexConfig && typeof c.yandexConfig === 'object'
      ? String((c.yandexConfig as { blockId?: string }).blockId || '')
      : '';
  draft.value = {
    type: c.type,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    validFromLocal: isoToLocal(c.validFrom),
    validToLocal: isoToLocal(c.validTo),
    imageUrl: c.imageUrl || '',
    targetUrl: c.targetUrl || '',
    openInNewTab: c.openInNewTab !== false,
    altText: c.altText || '',
    yandexBlockId: bid,
    erid: c.erid || '',
    advertiserName: c.advertiserName || '',
    advertiserInn: c.advertiserInn || '',
    advertiserOgrn: c.advertiserOgrn || '',
  };
  editorOpen.value = true;
}

function cancelEditor() {
  editorOpen.value = false;
  editingId.value = null;
}

async function saveCreative() {
  if (!selectedPlacementId.value) return;
  creativeSaving.value = true;
  try {
    const base: Record<string, unknown> = {
      placementId: selectedPlacementId.value,
      sortOrder: draft.value.sortOrder,
      type: draft.value.type,
      isActive: draft.value.isActive,
      validFrom: localToIso(draft.value.validFromLocal),
      validTo: localToIso(draft.value.validToLocal),
      erid: draft.value.erid.trim() || null,
      advertiserName: draft.value.advertiserName.trim() || null,
      advertiserInn: draft.value.advertiserInn.trim() || null,
      advertiserOgrn: draft.value.advertiserOgrn.trim() || null,
    };
    if (draft.value.type === 'BANNER') {
      base.imageUrl = draft.value.imageUrl.trim() || null;
      base.targetUrl = draft.value.targetUrl.trim() || null;
      base.openInNewTab = draft.value.openInNewTab;
      base.altText = draft.value.altText.trim() || null;
      base.yandexConfig = null;
    } else {
      base.imageUrl = null;
      base.targetUrl = null;
      base.altText = null;
      base.yandexConfig = { blockId: draft.value.yandexBlockId.trim() };
    }
    if (editingId.value) {
      await api().put(`/api/admin/ads/creatives/${editingId.value}`, base);
    } else {
      await api().post('/api/admin/ads/creatives', base);
    }
    await loadCreatives();
    cancelEditor();
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка сохранения');
  } finally {
    creativeSaving.value = false;
  }
}

async function deleteCreative(c: Creative) {
  if (!confirm('Удалить креатив?')) return;
  try {
    await api().delete(`/api/admin/ads/creatives/${c.id}`);
    await loadCreatives();
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка');
  }
}

onMounted(async () => {
  try {
    await loadMarking();
    await loadPlacements();
    await loadCreatives();
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка загрузки');
  }
});
</script>
