<template>
  <div class="bg-transparent">
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-bold text-2xl text-gray-900 tracking-tight">{{ isNew ? 'Новое меню' : 'Редактирование меню' }}</h1>
      <router-link to="/menus" class="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">← Назад к списку</router-link>
    </div>

    <!-- Create menu form (only for /menus/new) -->
    <div v-if="isNew" class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
      <div class="flex flex-col gap-6 max-w-xl">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Ключ (уникальный идентификатор)</label>
          <input v-model="form.key" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all font-mono" placeholder="например: header, footer, sidebar" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Название</label>
          <input v-model="form.name" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all" placeholder="Шапка сайта" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Описание (необязательно)</label>
          <textarea v-model="form.description" rows="2" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all resize-y" placeholder="Краткое описание меню"></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Порядок</label>
          <input v-model.number="form.order" type="number" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all" />
        </div>
        <div class="pt-2 flex items-center gap-3">
          <button class="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all shadow-sm" :disabled="saveLoading" @click="createMenu">Создать меню</button>
          <router-link to="/menus" class="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">Отмена</router-link>
        </div>
      </div>
    </div>

    <!-- Edit menu + items (for /menus/:id) -->
    <template v-else>
      <div v-if="menuLoading" class="animate-pulse space-y-4">
        <div class="h-48 bg-gray-100 rounded-2xl w-full"></div>
        <div class="h-64 bg-gray-100 rounded-2xl w-full"></div>
      </div>
      <div v-else-if="loadError" class="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800 text-sm">{{ loadError }}</div>

      <div v-else-if="menu" class="flex flex-col gap-6">
        <!-- Menu meta form -->
        <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
          <h2 class="font-bold text-lg text-gray-900 mb-4">Параметры меню</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Ключ</label>
              <input v-model="menuForm.key" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all font-mono" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Название</label>
              <input v-model="menuForm.name" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all" />
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-2">Описание</label>
              <textarea v-model="menuForm.description" rows="2" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all resize-y"></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Порядок</label>
              <input v-model.number="menuForm.order" type="number" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all" />
            </div>
          </div>
          <div class="mt-6 flex items-center gap-3 flex-wrap">
            <button class="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all shadow-sm" :disabled="saveMenuLoading" @click="saveMenu">Сохранить меню</button>
            <button type="button" class="px-6 py-3 bg-white border border-red-200 text-red-700 font-medium rounded-xl hover:bg-red-50 transition-colors" :disabled="deleteMenuLoading" @click="confirmDeleteMenu">Удалить меню</button>
          </div>
        </div>

        <!-- Menu items -->
        <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-bold text-lg text-gray-900">Пункты меню</h2>
            <button type="button" class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors" @click="openAddItem()">Добавить пункт</button>
          </div>

          <div v-if="!menu.items || menu.items.length === 0" class="text-sm text-gray-500 py-6">Пунктов пока нет. Добавьте первый пункт.</div>
          <div v-else class="space-y-2">
            <template v-for="root in menu.items" :key="root.id">
              <div class="flex flex-col gap-1 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                <div class="flex items-center gap-3 flex-wrap">
                  <span class="font-medium text-gray-900">{{ root.label }}</span>
                  <span class="text-xs text-gray-500">{{ linkSummary(root) }}</span>
                  <span class="text-xs text-gray-400">порядок: {{ root.order }}</span>
                  <div class="ml-auto flex items-center gap-2">
                    <button type="button" class="text-sm text-blue-600 hover:text-blue-700" @click="openEditItem(root)">Изменить</button>
                    <button type="button" class="text-sm text-blue-600 hover:text-blue-700" @click="openAddItem(root.id)">Добавить подпункт</button>
                    <button type="button" class="text-sm text-red-600 hover:text-red-700" @click="deleteItem(root.id)">Удалить</button>
                  </div>
                </div>
                <div v-if="root.children && root.children.length" class="pl-4 mt-2 space-y-2 border-l-2 border-gray-200">
                  <div v-for="child in root.children" :key="child.id" class="flex items-center gap-3 flex-wrap">
                    <span class="text-gray-700">{{ child.label }}</span>
                    <span class="text-xs text-gray-500">{{ linkSummary(child) }}</span>
                    <span class="text-xs text-gray-400">порядок: {{ child.order }}</span>
                    <div class="ml-auto flex items-center gap-2">
                      <button type="button" class="text-sm text-blue-600 hover:text-blue-700" @click="openEditItem(child)">Изменить</button>
                      <button type="button" class="text-sm text-red-600 hover:text-red-700" @click="deleteItem(child.id)">Удалить</button>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </template>

    <!-- Modal: add/edit item -->
    <div v-if="itemModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="itemModalOpen = false">
      <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" @click.stop>
        <h3 class="font-bold text-lg text-gray-900 mb-4">{{ editingItemId ? 'Редактировать пункт' : 'Добавить пункт' }}</h3>
        <div class="flex flex-col gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Подпись</label>
            <input v-model="itemForm.label" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none" placeholder="Текст ссылки" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Тип ссылки</label>
            <div class="flex flex-wrap gap-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="itemLinkType" type="radio" value="url" />
                <span>URL</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="itemLinkType" type="radio" value="section" />
                <span>Раздел</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="itemLinkType" type="radio" value="page" />
                <span>Страница</span>
              </label>
            </div>
          </div>
          <div v-if="itemLinkType === 'url'">
            <label class="block text-sm font-medium text-gray-700 mb-1">URL</label>
            <input v-model="itemForm.url" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none" placeholder="/about" />
          </div>
          <div v-if="itemLinkType === 'section'">
            <label class="block text-sm font-medium text-gray-700 mb-1">Раздел</label>
            <select v-model="itemForm.sectionId" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none">
              <option :value="undefined">— Выберите раздел —</option>
              <option v-for="s in sections" :key="s.id" :value="s.id">{{ s.title }}</option>
            </select>
          </div>
          <div v-if="itemLinkType === 'page'">
            <label class="block text-sm font-medium text-gray-700 mb-1">Страница</label>
            <select v-model="itemForm.pageId" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none">
              <option :value="undefined">— Выберите страницу —</option>
              <option v-for="pg in pages" :key="pg.id" :value="pg.id">{{ pg.title }} ({{ pg.slug }})</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Порядок</label>
            <input v-model.number="itemForm.order" type="number" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none" />
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <button type="button" class="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50" @click="itemModalOpen = false">Отмена</button>
          <button type="button" class="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700" :disabled="saveItemLoading" @click="saveItem">{{ editingItemId ? 'Сохранить' : 'Добавить' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api';

interface MenuItemTree {
  id: string;
  label: string;
  url?: string | null;
  sectionId?: string | null;
  order: number;
  parentId?: string | null;
  children?: MenuItemTree[];
}

interface MenuData {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  order: number;
  items?: MenuItemTree[];
}

const props = defineProps<{ id?: string }>();
const route = useRoute();
const router = useRouter();
const isNew = computed(() => route.path === '/menus/new' || route.name === 'MenuNew');
const menuId = computed(() => (route.params.id as string) || props.id);

const form = ref({ key: '', name: '', description: '', order: 0 });
const menu = ref<MenuData | null>(null);
const menuForm = ref({ key: '', name: '', description: '', order: 0 });
const sections = ref<{ id: string; title: string; slug: string }[]>([]);
const sectionsMap = computed(() => new Map(sections.value.map((s) => [s.id, s])));
const pages = ref<{ id: string; title: string; slug: string }[]>([]);
const loadError = ref('');
const menuLoading = ref(false);
const saveLoading = ref(false);
const saveMenuLoading = ref(false);
const deleteMenuLoading = ref(false);

const itemModalOpen = ref(false);
const editingItemId = ref<string | null>(null);
const itemFormParentId = ref<string | null>(null);
const itemForm = ref({
  label: '',
  url: '' as string | undefined,
  sectionId: undefined as string | undefined,
  pageId: undefined as string | undefined,
  order: 0,
});
const itemLinkType = ref<'url' | 'section' | 'page'>('url');
const saveItemLoading = ref(false);

function linkSummary(item: { url?: string | null; sectionId?: string | null }): string {
  if (item.url) {
    const page = pages.value.find((p) => `/${p.slug}` === item.url);
    if (page) return `страница: ${page.title}`;
    return item.url;
  }
  if (item.sectionId) return sectionsMap.value.get(item.sectionId)?.title ?? `раздел: ${item.sectionId}`;
  return '—';
}

function openAddItem(parentId?: string) {
  editingItemId.value = null;
  itemFormParentId.value = parentId ?? null;
  itemForm.value = {
    label: '',
    url: undefined,
    sectionId: undefined,
    pageId: undefined,
    order: menu.value?.items ? flatOrder(menu.value.items) : 0,
  };
  itemLinkType.value = 'url';
  itemModalOpen.value = true;
}

function flatOrder(items: MenuItemTree[]): number {
  let n = 0;
  for (const it of items) {
    n = Math.max(n, it.order + 1);
    if (it.children?.length) n = Math.max(n, flatOrder(it.children) + 1);
  }
  return n;
}

function openEditItem(item: MenuItemTree) {
  editingItemId.value = item.id;
  itemFormParentId.value = item.parentId ?? null;
  const matchedPage = item.url ? pages.value.find((p) => `/${p.slug}` === item.url) : null;
  itemForm.value = {
    label: item.label,
    url: item.url ?? undefined,
    sectionId: item.sectionId ?? undefined,
    pageId: matchedPage?.id ?? undefined,
    order: item.order,
  };
  itemLinkType.value = item.sectionId ? 'section' : matchedPage ? 'page' : 'url';
  itemModalOpen.value = true;
}

watch(itemLinkType, (t) => {
  if (t === 'url') {
    itemForm.value.sectionId = undefined;
    itemForm.value.pageId = undefined;
  } else if (t === 'section') {
    itemForm.value.url = undefined;
    itemForm.value.pageId = undefined;
  } else {
    itemForm.value.url = undefined;
    itemForm.value.sectionId = undefined;
  }
});

async function saveItem() {
  if (!menuId.value || menuId.value === 'new') return;
  if (!itemForm.value.label.trim()) {
    alert('Введите подпись пункта');
    return;
  }
  const payload = {
    label: itemForm.value.label.trim(),
    order: itemForm.value.order,
    parentId: itemFormParentId.value,
  } as { label: string; order: number; parentId?: string | null; url?: string; sectionId?: string };
  if (itemLinkType.value === 'url') {
    payload.url = itemForm.value.url || undefined;
    payload.sectionId = undefined;
  } else if (itemLinkType.value === 'page') {
    const page = pages.value.find((p) => p.id === itemForm.value.pageId);
    if (!page) {
      alert('Выберите страницу');
      return;
    }
    payload.url = `/${page.slug}`;
    payload.sectionId = undefined;
  } else {
    payload.sectionId = itemForm.value.sectionId || undefined;
    payload.url = undefined;
  }
  saveItemLoading.value = true;
  try {
    if (editingItemId.value) {
      await api().put(`/api/admin/menus/${menuId.value}/items/${editingItemId.value}`, payload);
    } else {
      await api().post(`/api/admin/menus/${menuId.value}/items`, payload);
    }
    itemModalOpen.value = false;
    await loadMenu();
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка сохранения');
  } finally {
    saveItemLoading.value = false;
  }
}

async function deleteItem(itemId: string) {
  if (!menuId.value || menuId.value === 'new') return;
  if (!confirm('Удалить этот пункт меню?')) return;
  try {
    await api().delete(`/api/admin/menus/${menuId.value}/items/${itemId}`);
    await loadMenu();
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка удаления');
  }
}

async function loadMenu() {
  if (!menuId.value || menuId.value === 'new') return;
  loadError.value = '';
  menuLoading.value = true;
  try {
    const data = await api().get<MenuData>(`/api/admin/menus/${menuId.value}`);
    menu.value = data;
    menuForm.value = {
      key: data.key,
      name: data.name,
      description: data.description ?? '',
      order: data.order,
    };
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Ошибка загрузки меню';
  } finally {
    menuLoading.value = false;
  }
}

async function loadSections() {
  try {
    sections.value = await api().get('/api/admin/sections');
  } catch {
    sections.value = [];
  }
}

async function loadPages() {
  try {
    pages.value = await api().get('/api/admin/pages');
  } catch {
    pages.value = [];
  }
}

onMounted(async () => {
  if (isNew.value) return;
  await Promise.all([loadSections(), loadPages()]);
  await loadMenu();
});

watch(menuId, (newId, oldId) => {
  if (!isNew.value && newId && newId !== oldId) {
    menu.value = null;
    loadMenu();
  }
});

async function createMenu() {
  if (!form.value.key.trim() || !form.value.name.trim()) {
    alert('Заполните ключ и название');
    return;
  }
  saveLoading.value = true;
  try {
    const created = await api().post<{ id: string }>('/api/admin/menus', {
      key: form.value.key.trim(),
      name: form.value.name.trim(),
      description: form.value.description?.trim() || undefined,
      order: form.value.order,
    });
    router.push(`/menus/${created.id}`);
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка создания');
  } finally {
    saveLoading.value = false;
  }
}

async function saveMenu() {
  if (!menuId.value || menuId.value === 'new') return;
  saveMenuLoading.value = true;
  try {
    await api().put(`/api/admin/menus/${menuId.value}`, {
      key: menuForm.value.key,
      name: menuForm.value.name,
      description: menuForm.value.description || undefined,
      order: menuForm.value.order,
    });
    await loadMenu();
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка сохранения');
  } finally {
    saveMenuLoading.value = false;
  }
}

function confirmDeleteMenu() {
  if (!confirm('Удалить это меню и все его пункты?')) return;
  deleteMenu();
}

async function deleteMenu() {
  if (!menuId.value || menuId.value === 'new') return;
  deleteMenuLoading.value = true;
  try {
    await api().delete(`/api/admin/menus/${menuId.value}`);
    router.push('/menus');
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка удаления');
  } finally {
    deleteMenuLoading.value = false;
  }
}
</script>
