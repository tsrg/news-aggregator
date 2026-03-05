<template>
  <div class="block-editor" ref="containerRef">
    <!-- Inline formatting bubble menu -->
    <bubble-menu
      :editor="editor"
      :tippy-options="{ duration: 150, placement: 'top' }"
      v-if="editor"
      class="bubble-toolbar"
    >
      <button
        v-for="item in inlineItems"
        :key="item.name"
        @click="item.action()"
        :class="{ active: item.isActive?.() }"
        type="button"
        :title="item.title"
      >
        <component :is="item.icon" class="w-4 h-4" />
      </button>
    </bubble-menu>

    <!-- Hidden file input for image uploads -->
    <input type="file" ref="fileInput" @change="handleImageUpload" accept="image/*" class="hidden" />

    <!-- Editor area -->
    <editor-content :editor="editor" />

    <!-- Slash command menu -->
    <Teleport to="body">
      <div
        v-if="slashMenu.open"
        ref="slashMenuRef"
        class="slash-menu"
        :style="{ top: slashMenu.top + 'px', left: slashMenu.left + 'px' }"
      >
        <div class="slash-menu-header">Блоки</div>
        <template v-if="filteredCommands.length">
          <button
            v-for="(cmd, i) in filteredCommands"
            :key="cmd.name"
            @mousedown.prevent="executeSlashCommand(cmd)"
            @mouseenter="slashMenu.selectedIndex = i"
            :class="['slash-item', { selected: slashMenu.selectedIndex === i }]"
            type="button"
          >
            <span class="slash-item-icon">
              <component :is="cmd.icon" class="w-5 h-5" />
            </span>
            <span class="slash-item-body">
              <span class="slash-item-title">{{ cmd.title }}</span>
              <span class="slash-item-desc">{{ cmd.description }}</span>
            </span>
          </button>
        </template>
        <div v-else class="slash-empty">Ничего не найдено</div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick, type Component } from 'vue';
import { Editor, EditorContent } from '@tiptap/vue-3';
import { BubbleMenu } from '@tiptap/vue-3/menus';
import StarterKit from '@tiptap/starter-kit';
import TiptapImage from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import {
  RiBold,
  RiItalic,
  RiStrikethrough,
  RiLinkM,
  RiCodeLine,
  RiH1,
  RiH2,
  RiH3,
  RiListUnordered,
  RiListOrdered,
  RiDoubleQuotesL,
  RiImageAddLine,
  RiSeparator,
  RiCodeBoxLine,
  RiText,
} from '@remixicon/vue';
import { api } from '../api';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>();

const editor = ref<Editor>();
const fileInput = ref<HTMLInputElement>();
const containerRef = ref<HTMLElement>();
const slashMenuRef = ref<HTMLElement>();

// --- Inline formatting items for BubbleMenu ---
const inlineItems = computed(() => {
  const ed = editor.value;
  if (!ed) return [];
  return [
    { name: 'bold', title: 'Жирный', icon: RiBold, isActive: () => ed.isActive('bold'), action: () => ed.chain().focus().toggleBold().run() },
    { name: 'italic', title: 'Курсив', icon: RiItalic, isActive: () => ed.isActive('italic'), action: () => ed.chain().focus().toggleItalic().run() },
    { name: 'strike', title: 'Зачеркнутый', icon: RiStrikethrough, isActive: () => ed.isActive('strike'), action: () => ed.chain().focus().toggleStrike().run() },
    { name: 'code', title: 'Код', icon: RiCodeLine, isActive: () => ed.isActive('code'), action: () => ed.chain().focus().toggleCode().run() },
    { name: 'link', title: 'Ссылка', icon: RiLinkM, isActive: () => ed.isActive('link'), action: () => setLink() },
  ];
});

// --- Slash command definitions ---
interface SlashCommand {
  name: string;
  title: string;
  description: string;
  icon: Component;
  keywords: string[];
  action: () => void;
}

const slashCommands = computed<SlashCommand[]>(() => {
  const ed = editor.value;
  if (!ed) return [];
  return [
    { name: 'paragraph', title: 'Текст', description: 'Обычный абзац', icon: RiText, keywords: ['text', 'paragraph', 'текст', 'абзац'], action: () => ed.chain().focus().setParagraph().run() },
    { name: 'h1', title: 'Заголовок 1', description: 'Крупный заголовок раздела', icon: RiH1, keywords: ['h1', 'heading', 'заголовок'], action: () => ed.chain().focus().toggleHeading({ level: 1 }).run() },
    { name: 'h2', title: 'Заголовок 2', description: 'Средний заголовок', icon: RiH2, keywords: ['h2', 'heading', 'заголовок', 'подзаголовок'], action: () => ed.chain().focus().toggleHeading({ level: 2 }).run() },
    { name: 'h3', title: 'Заголовок 3', description: 'Маленький заголовок', icon: RiH3, keywords: ['h3', 'heading', 'заголовок'], action: () => ed.chain().focus().toggleHeading({ level: 3 }).run() },
    { name: 'bullet', title: 'Маркированный список', description: 'Список с точками', icon: RiListUnordered, keywords: ['ul', 'bullet', 'list', 'список', 'маркированный'], action: () => ed.chain().focus().toggleBulletList().run() },
    { name: 'ordered', title: 'Нумерованный список', description: 'Список с числами', icon: RiListOrdered, keywords: ['ol', 'ordered', 'number', 'нумерованный', 'список'], action: () => ed.chain().focus().toggleOrderedList().run() },
    { name: 'blockquote', title: 'Цитата', description: 'Выделенная цитата', icon: RiDoubleQuotesL, keywords: ['quote', 'blockquote', 'цитата'], action: () => ed.chain().focus().toggleBlockquote().run() },
    { name: 'code-block', title: 'Блок кода', description: 'Фрагмент кода', icon: RiCodeBoxLine, keywords: ['code', 'codeblock', 'код'], action: () => ed.chain().focus().toggleCodeBlock().run() },
    { name: 'image', title: 'Изображение', description: 'Загрузить картинку', icon: RiImageAddLine, keywords: ['image', 'img', 'photo', 'изображение', 'картинка', 'фото'], action: () => triggerImageUpload() },
    { name: 'divider', title: 'Разделитель', description: 'Горизонтальная линия', icon: RiSeparator, keywords: ['hr', 'divider', 'separator', 'разделитель', 'линия'], action: () => ed.chain().focus().setHorizontalRule().run() },
  ];
});

// --- Slash menu state ---
const slashMenu = ref({
  open: false,
  top: 0,
  left: 0,
  query: '',
  selectedIndex: 0,
  triggerPos: 0,
});

const filteredCommands = computed(() => {
  const q = slashMenu.value.query.toLowerCase();
  if (!q) return slashCommands.value;
  return slashCommands.value.filter(
    c => c.title.toLowerCase().includes(q) || c.keywords.some(k => k.includes(q))
  );
});

function openSlashMenu() {
  const ed = editor.value;
  if (!ed) return;

  const { from } = ed.state.selection;
  slashMenu.value.triggerPos = from;

  const coords = ed.view.coordsAtPos(from);
  const containerRect = containerRef.value?.getBoundingClientRect();
  if (!containerRect) return;

  slashMenu.value.top = coords.bottom + window.scrollY + 4;
  slashMenu.value.left = coords.left + window.scrollX;
  slashMenu.value.query = '';
  slashMenu.value.selectedIndex = 0;
  slashMenu.value.open = true;

  nextTick(() => {
    const menu = slashMenuRef.value;
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (rect.right > vw - 8) {
      slashMenu.value.left -= rect.right - vw + 16;
    }
    if (rect.bottom > vh - 8) {
      slashMenu.value.top = coords.top + window.scrollY - rect.height - 4;
    }
  });
}

function closeSlashMenu() {
  slashMenu.value.open = false;
}

function deleteSlashQuery() {
  const ed = editor.value;
  if (!ed) return;
  const { from } = ed.state.selection;
  const start = slashMenu.value.triggerPos - 1; // include the "/"
  if (start >= 0 && from >= start) {
    ed.chain().focus().deleteRange({ from: start, to: from }).run();
  }
}

function executeSlashCommand(cmd: SlashCommand) {
  deleteSlashQuery();
  cmd.action();
  closeSlashMenu();
}

function handleSlashKeydown(event: KeyboardEvent): boolean {
  if (!slashMenu.value.open) return false;
  const cmds = filteredCommands.value;

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    slashMenu.value.selectedIndex = (slashMenu.value.selectedIndex + 1) % Math.max(cmds.length, 1);
    return true;
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    slashMenu.value.selectedIndex = (slashMenu.value.selectedIndex - 1 + cmds.length) % Math.max(cmds.length, 1);
    return true;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    if (cmds.length > 0) {
      executeSlashCommand(cmds[slashMenu.value.selectedIndex]);
    }
    return true;
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    closeSlashMenu();
    return true;
  }
  return false;
}

// --- Link helper ---
function setLink() {
  const ed = editor.value;
  if (!ed) return;
  const previousUrl = ed.getAttributes('link').href;
  const url = window.prompt('URL ссылки', previousUrl);
  if (url === null) return;
  if (url === '') {
    ed.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }
  ed.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
}

// --- Image upload ---
function triggerImageUpload() {
  fileInput.value?.click();
}

async function handleImageUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  try {
    const formData = new FormData();
    formData.append('image', file);
    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const base = api().base;
    const res = await fetch(`${base}/api/admin/upload`, { method: 'POST', headers, body: formData });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    editor.value?.chain().focus().setImage({ src: `${base}${data.url}` }).run();
  } catch {
    alert('Ошибка загрузки изображения');
  } finally {
    if (fileInput.value) fileInput.value.value = '';
  }
}

// --- Editor setup ---
onMounted(() => {
  editor.value = new Editor({
    content: props.modelValue,
    extensions: [
      StarterKit,
      TiptapImage.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false }),
      Extension.create({
        name: 'placeholder',
        addProseMirrorPlugins() {
          const placeholderText = 'Начните писать или введите «/» для вставки блока...';
          return [
            new Plugin({
              key: new PluginKey('placeholder'),
              props: {
                decorations: (state) => {
                  const { doc, selection } = state;
                  const isEditorEmpty = doc.textContent.length === 0 && doc.childCount <= 1;
                  if (!isEditorEmpty || !selection.empty) return DecorationSet.empty;
                  const decorations: Decoration[] = [];
                  doc.descendants((node, pos) => {
                    if (node.isBlock && node.childCount === 0 && node.type.name === 'paragraph') {
                      decorations.push(
                        Decoration.node(pos, pos + node.nodeSize, {
                          'class': 'is-editor-empty',
                          'data-placeholder': placeholderText,
                        })
                      );
                    }
                  });
                  return DecorationSet.create(doc, decorations);
                },
              },
            }),
          ];
        },
      }),
    ],
    onUpdate: ({ editor: ed }) => {
      emit('update:modelValue', ed.getHTML());

      if (slashMenu.value.open) {
        const { from } = ed.state.selection;
        const text = ed.state.doc.textBetween(slashMenu.value.triggerPos, from, '');
        slashMenu.value.query = text;
        slashMenu.value.selectedIndex = 0;

        const textBefore = ed.state.doc.textBetween(Math.max(0, slashMenu.value.triggerPos - 1), slashMenu.value.triggerPos, '');
        if (textBefore !== '/' || from < slashMenu.value.triggerPos) {
          closeSlashMenu();
        }
      }
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[300px] text-gray-900',
      },
      handleKeyDown: (_view, event) => {
        if (handleSlashKeydown(event)) return true;

        if (event.key === '/' && !slashMenu.value.open) {
          const ed = editor.value;
          if (!ed) return false;
          const { from } = ed.state.selection;
          const $pos = ed.state.doc.resolve(from);
          const lineText = $pos.parent.textContent;
          const isEmptyOrStart = lineText.length === 0 || $pos.parentOffset === 0;

          if (isEmptyOrStart) {
            setTimeout(() => openSlashMenu(), 0);
          }
        }
        return false;
      },
    },
  });
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});

watch(() => props.modelValue, (newVal) => {
  if (editor.value && editor.value.getHTML() !== newVal) {
    editor.value.commands.setContent(newVal, { emitUpdate: false });
  }
});
</script>

<style>
/* ---- Editor area ---- */
.block-editor {
  position: relative;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.block-editor:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,.12);
}
.block-editor .ProseMirror {
  padding: 1.25rem 1.5rem;
  outline: none !important;
  line-height: 1.75;
  font-size: 1rem;
}

/* Placeholder */
.block-editor .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  color: #9ca3af;
  float: left;
  height: 0;
  pointer-events: none;
}

/* Typography */
.block-editor .ProseMirror h1 { font-size: 1.875rem; font-weight: 800; margin: 1.5rem 0 0.5rem; line-height: 1.25; letter-spacing: -0.025em; }
.block-editor .ProseMirror h2 { font-size: 1.5rem; font-weight: 700; margin: 1.25rem 0 0.4rem; line-height: 1.3; }
.block-editor .ProseMirror h3 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.35rem; line-height: 1.35; }
.block-editor .ProseMirror p { margin: 0.15rem 0; }
.block-editor .ProseMirror a { color: #2563eb; text-decoration: underline; text-underline-offset: 2px; }
.block-editor .ProseMirror ul { list-style: disc; padding-left: 1.5rem; margin: 0.25rem 0; }
.block-editor .ProseMirror ol { list-style: decimal; padding-left: 1.5rem; margin: 0.25rem 0; }
.block-editor .ProseMirror li { margin: 0.1rem 0; }
.block-editor .ProseMirror blockquote {
  border-left: 3px solid #d1d5db;
  padding: 0.1rem 0 0.1rem 1rem;
  color: #4b5563;
  margin: 0.5rem 0;
}
.block-editor .ProseMirror pre {
  background: #1e293b;
  color: #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.85rem 1rem;
  font-family: ui-monospace, 'Cascadia Code', 'Fira Code', monospace;
  font-size: 0.875rem;
  overflow-x: auto;
  margin: 0.5rem 0;
}
.block-editor .ProseMirror code {
  background: #f1f5f9;
  color: #e11d48;
  padding: 0.15rem 0.35rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
  font-family: ui-monospace, 'Cascadia Code', monospace;
}
.block-editor .ProseMirror pre code {
  background: none;
  color: inherit;
  padding: 0;
  border-radius: 0;
  font-size: inherit;
}
.block-editor .ProseMirror hr {
  border: none;
  border-top: 2px solid #e5e7eb;
  margin: 1.25rem 0;
}
.block-editor .ProseMirror img {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  margin: 0.75rem 0;
}

/* ---- Bubble menu (inline formatting) ---- */
.bubble-toolbar {
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 4px;
  background: #1e293b;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,.2);
}
.bubble-toolbar button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 28px;
  border: none;
  background: transparent;
  color: #cbd5e1;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.bubble-toolbar button:hover { background: #334155; color: #f1f5f9; }
.bubble-toolbar button.active { background: #3b82f6; color: #fff; }

/* ---- Slash command menu ---- */
.slash-menu {
  position: absolute;
  z-index: 9999;
  width: 280px;
  max-height: 340px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.06);
  padding: 4px;
}
.slash-menu-header {
  padding: 6px 10px 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9ca3af;
}
.slash-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  background: transparent;
  border-radius: 7px;
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
}
.slash-item:hover,
.slash-item.selected {
  background: #f1f5f9;
}
.slash-item-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 7px;
  color: #475569;
}
.slash-item.selected .slash-item-icon {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #2563eb;
}
.slash-item-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.slash-item-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1e293b;
  line-height: 1.3;
}
.slash-item-desc {
  font-size: 0.75rem;
  color: #94a3b8;
  line-height: 1.3;
}
.slash-empty {
  padding: 16px 10px;
  text-align: center;
  font-size: 0.8rem;
  color: #94a3b8;
}
</style>
