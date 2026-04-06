<script setup lang="ts">
/**
 * NoteReaderPanel — Explorer 主从布局的 Detail 面板
 * 嵌入式笔记阅读/编辑器，不触发路由跳转
 */
import { computed, ref, shallowRef, watch, onMounted, onUnmounted } from 'vue'
import { useNotesStore } from '../stores/notes'
import { useSettingsStore } from '../stores/settings'
import MilkdownEditor from './MilkdownEditor.vue'
import MarkdownRenderer from './MarkdownRenderer.vue'
import EditorToolbar from './EditorToolbar.vue'
import WikiLinkPicker from './WikiLinkPicker.vue'
import SplitEditor from './SplitEditor.vue'
import BacklinksPanel from './BacklinksPanel.vue'
import NoteOutline from './NoteOutline.vue'
import ThemeSwitcher from './ThemeSwitcher.vue'
import CategoryPicker from './CategoryPicker.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { useEditorActions } from '../composables/useEditorActions'
import { useReadingTheme } from '../composables/useReadingTheme'
import type { EditorMode } from '../types'

const props = defineProps<{
  noteId: string
}>()

const emit = defineEmits<{
  navigate: [id: string]
  deleted: []
}>()

const notesStore = useNotesStore()
const settingsStore = useSettingsStore()

const isEditing = ref(false)
const editTitle = ref('')
const editContent = ref('')
const editCategory = ref('')
const editTags = ref('')

const editorMode = ref<EditorMode>(settingsStore.defaultEditorMode)
const detailTextareaRef = ref<HTMLTextAreaElement | null>(null)
const editorKey = ref(0)
const milkdownEditorRef = shallowRef<InstanceType<typeof MilkdownEditor> | null>(null)
const readerContentRef = ref<HTMLElement | null>(null)

const { readingTheme } = useReadingTheme()

const {
  insertImageFromFile,
  showLinkPicker,
  linkSearch,
  linkCandidates,
  insertWikiLink,
  toggleLinkPicker,
  showFormatToolbar,
  handleToolbarInsert,
  handleToolbarWrap,
  handlePaste,
} = useEditorActions({
  content: editContent,
  editorMode,
  editorKey,
  textareaRef: detailTextareaRef,
  milkdownRef: milkdownEditorRef,
})

const note = computed(() => notesStore.getNoteById(props.noteId))

/* 切换笔记时退出编辑模式 + 记录打开 */
watch(() => props.noteId, (id) => {
  isEditing.value = false
  if (id) notesStore.recordOpen(id)
}, { immediate: true })

function startEdit() {
  if (!note.value) return
  editTitle.value = note.value.title
  editContent.value = note.value.content
  editCategory.value = note.value.category
  editTags.value = note.value.tags.join(' ')
  editorMode.value = 'wysiwyg'
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
}

function saveEdit() {
  if (!note.value || !editContent.value.trim()) return
  notesStore.updateNote(note.value.id, {
    title: editTitle.value.trim(),
    content: editContent.value.trim(),
    category: editCategory.value.trim() || '未分类',
    tags: editTags.value.trim() ? editTags.value.trim().split(/\s+/) : [],
  })
  isEditing.value = false
}

const showDeleteConfirm = ref(false)
const copySuccess = ref(false)

function handleDelete() {
  showDeleteConfirm.value = true
}

function confirmDelete() {
  if (!note.value) return
  showDeleteConfirm.value = false
  notesStore.deleteNote(note.value.id)
  emit('deleted')
}

async function copyContent() {
  if (!note.value) return
  try {
    await navigator.clipboard.writeText(note.value.content)
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, 1500)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = note.value.content
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, 1500)
  }
}

function togglePin() {
  if (!note.value) return
  notesStore.togglePin(note.value.id)
}

function toggleFavorite() {
  if (!note.value) return
  notesStore.toggleFavorite(note.value.id)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const backlinks = computed(() => props.noteId ? notesStore.getBacklinks(props.noteId) : [])

/* Ctrl+S 保存 */
function handleGlobalKey(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (isEditing.value) saveEdit()
  }
}

onMounted(() => window.addEventListener('keydown', handleGlobalKey))
onUnmounted(() => window.removeEventListener('keydown', handleGlobalKey))
</script>

<template>
  <div class="reader-panel">
    <template v-if="note">
      <!-- 简化版工具栏 -->
      <div class="reader-toolbar">
        <div class="rt-left">
          <template v-if="isEditing">
            <button class="rt-btn rt-btn--cancel" @click="cancelEdit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              <span>取消</span>
            </button>
            <!-- 编辑/分屏模式切换 -->
            <div class="rt-mode-switcher">
              <button class="rt-mode-btn" :class="{ active: editorMode === 'wysiwyg' }" @click="editorMode = 'wysiwyg'">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                <span>编辑</span>
              </button>
              <button class="rt-mode-btn" :class="{ active: editorMode === 'split' }" @click="editorMode = 'split'">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" /></svg>
                <span>分屏</span>
              </button>
            </div>
          </template>
        </div>

        <div class="rt-right">
          <button class="rt-btn rt-btn-fav" :class="{ 'is-active': note.isFavorite }" @click="toggleFavorite" data-tooltip-pos="bottom" :data-tooltip="note.isFavorite ? '取消收藏' : '收藏'">
            <svg width="14" height="14" viewBox="0 0 24 24" :fill="note.isFavorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
          </button>
          <button class="rt-btn rt-btn-pin" :class="{ 'is-active': note.isPinned }" @click="togglePin" data-tooltip-pos="bottom" :data-tooltip="note.isPinned ? '取消置顶' : '置顶'">
            <svg width="14" height="14" viewBox="0 0 24 24" :fill="note.isPinned ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
          </button>

          <template v-if="isEditing">
            <button class="rt-btn rt-btn--save" :disabled="!editContent.trim()" @click="saveEdit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
              <span>保存</span>
            </button>
          </template>
          <template v-else>
            <button class="rt-btn" @click="startEdit" data-tooltip="编辑" data-tooltip-pos="bottom">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </button>
          </template>

          <button class="rt-btn rt-btn--danger" @click="handleDelete" data-tooltip="删除" data-tooltip-pos="bottom">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
          </button>
        </div>

        <!-- 主题切换器（紧凑➡️工具栏内） -->
        <ThemeSwitcher v-if="!isEditing" v-model="readingTheme" compact />
      </div>

      <!-- WYSIWYG 编辑器工具条（不滚动） -->
      <template v-if="isEditing && editorMode === 'wysiwyg'">
        <div class="reader-editor-bar">
          <button type="button" class="reb-action" @click="insertImageFromFile">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
            <span>图片</span>
          </button>
          <WikiLinkPicker
            :show="showLinkPicker"
            :search="linkSearch"
            :candidates="linkCandidates"
            @toggle="toggleLinkPicker"
            @update:search="linkSearch = $event"
            @select="insertWikiLink"
          />
          <button type="button" class="reb-action" :class="{ active: showFormatToolbar }" @click="showFormatToolbar = !showFormatToolbar">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" /></svg>
            <span>格式</span>
          </button>
        </div>
        <EditorToolbar
          v-if="showFormatToolbar"
          @insert="handleToolbarInsert"
          @wrap="handleToolbarWrap"
        />
      </template>

      <!-- 内容区域 -->
      <div ref="readerContentRef" class="reader-content" :class="{ 'split-active': isEditing && editorMode === 'split' }">
        <!-- 编辑模式 -->
        <template v-if="isEditing">
          <form class="reader-edit-form" :class="`theme-${readingTheme}`" @submit.prevent="saveEdit" novalidate>
            <input v-model="editTitle" type="text" class="edit-title" placeholder="笔记标题">

            <template v-if="editorMode === 'wysiwyg'">
              <MilkdownEditor ref="milkdownEditorRef" :key="editorKey" v-model="editContent" />
            </template>

            <SplitEditor
              v-else
              v-model:content="editContent"
              v-model:textarea-ref="detailTextareaRef"
              :show-link-picker="showLinkPicker"
              :link-search="linkSearch"
              :link-candidates="linkCandidates"
              @insert-image="insertImageFromFile"
              @toggle-link-picker="toggleLinkPicker"
              @update:link-search="linkSearch = $event"
              @select-link="insertWikiLink"
              @toolbar-insert="handleToolbarInsert"
              @toolbar-wrap="handleToolbarWrap"
              @paste="handlePaste"
            />

            <div class="edit-meta-row">
              <CategoryPicker v-model="editCategory" />
              <input v-model="editTags" type="text" class="edit-input" placeholder="标签（空格分隔）">
            </div>
          </form>
        </template>

        <!-- 阅读模式 -->
        <template v-else>
          <div class="reader-reading-layout">
            <article class="reader-article" :class="`theme-${readingTheme}`">
              <header class="note-hero">
                <h1 class="note-title">{{ note.title || '未命名笔记' }}</h1>
                <div class="note-meta">
                  <span class="meta-category">{{ note.category }}</span>
                  <span class="meta-date">创建于 {{ formatDate(note.createdAt) }}</span>
                  <span v-if="note.createdAt !== note.updatedAt" class="meta-date">
                    · 更新于 {{ formatDate(note.updatedAt) }}
                  </span>
                </div>
                <div v-if="note.tags.length > 0" class="note-tags">
                  <span v-for="tag in note.tags" :key="tag" class="tag">{{ tag }}</span>
                </div>
              </header>
              <div class="note-body">
                <button class="copy-content-btn" :class="{ copied: copySuccess }" @click="copyContent" :data-tooltip="copySuccess ? '已复制' : '复制内容'">
                  <svg v-if="!copySuccess" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                  <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </button>
                <MarkdownRenderer :content="note.content" />
              </div>
              <BacklinksPanel :backlinks="backlinks" />
            </article>

            <!-- 右侧目录大纲 -->
            <NoteOutline
              :content="note.content"
              :scroll-container="readerContentRef"
            />
          </div>
        </template>
      </div>
    </template>

    <!-- 笔记不存在 -->
    <div v-else class="reader-404">
      <p>笔记不存在或已被删除</p>
    </div>

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      :open="showDeleteConfirm"
      title="确认删除笔记"
      :message="`将把 <strong>${note?.title || '未命名笔记'}</strong> 移入回收站。`"
      confirm-text="删除"
      confirm-type="danger"
      @confirm="confirmDelete"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>

<style scoped>
.reader-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ─── 工具栏 ─── */
.reader-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--color-divider);
  flex-shrink: 0;
  gap: var(--space-2);
  background: var(--color-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.rt-left, .rt-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.rt-btn {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-tertiary);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .rt-btn:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
  .rt-btn--danger:hover {
    background: var(--color-danger-muted);
    color: var(--color-danger);
  }
}

.rt-btn:active {
  transform: scale(0.95);
}

.rt-btn.is-active {
  color: var(--color-accent);
}

.rt-btn-fav.is-active {
  color: var(--color-warning);
}

.rt-btn-pin.is-active {
  color: var(--color-success);
}

.rt-btn--cancel {
  color: var(--color-text-tertiary);
}

@media (hover: hover) {
  .rt-btn--cancel:hover {
    color: var(--color-danger);
    background: var(--color-danger-muted);
  }
}

.rt-btn--save {
  background: var(--color-accent);
  color: #fff;
  padding: var(--space-1) var(--space-3);
}

.rt-btn--save:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (hover: hover) {
  .rt-btn--save:hover:not(:disabled) {
    background: color-mix(in oklch, var(--color-accent), white 12%);
    transform: translateY(-1px);
  }
}

/* ─── 编辑/分屏切换 ─── */
.rt-mode-switcher {
  display: flex;
  gap: 2px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  padding: 2px;
}

.rt-mode-btn {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border-radius: calc(var(--radius-sm) - 1px);
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--color-text-tertiary);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

.rt-mode-btn.active {
  background: var(--color-surface);
  color: var(--color-text-primary);
  box-shadow: 0 1px 2px var(--color-shadow);
}

/* ─── 编辑器工具条 ─── */
.reader-editor-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-4);
  background: var(--color-bg-tertiary);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.reb-action {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--color-text-tertiary);
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .reb-action:hover {
    background: var(--color-bg-hover);
    color: var(--color-accent);
  }
}

/* ─── 内容区域 ─── */
.reader-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-4) var(--space-6);
  min-height: 0;
}

.reader-content.split-active {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.reader-content.split-active > .reader-edit-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-width: none;
}

.reader-content > form {
  max-width: 800px;
  margin: 0 auto;
}

/* 阅读模式双栏布局 */
.reader-reading-layout {
  display: flex;
  gap: var(--space-4);
  max-width: 900px;
  margin: 0 auto;
  align-items: flex-start;
}

.reader-reading-layout > .reader-article {
  flex: 1;
  min-width: 0;
}

/* ─── 编辑表单 ─── */
.edit-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
  border: none;
  background: none;
  padding: 0;
  margin-bottom: var(--space-4);
  width: 100%;
}

.edit-title:focus {
  box-shadow: none;
  border-color: transparent;
}

.edit-meta-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-4);
  flex-shrink: 0;
}

.edit-input {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
}

.edit-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-muted);
}

/* ─── 阅读文章 ─── */
.reader-article {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.note-hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-divider);
}

.note-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.3;
}

.note-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.meta-category {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-accent-text);
  padding: 2px var(--space-2);
  background: var(--color-accent-muted);
  border-radius: var(--radius-full);
}

.meta-date {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

.note-tags {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.tag {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  padding: 2px var(--space-2);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
}

.note-body {
  position: relative;
}

.copy-content-btn {
  position: absolute;
  top: 0;
  right: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--color-text-tertiary);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
  z-index: 2;
}

@media (hover: hover) {
  .copy-content-btn:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
}

.copy-content-btn.copied {
  color: var(--color-success);
}

/* ─── 404 ─── */
.reader-404 {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-tertiary);
  font-size: 0.9rem;
}
</style>
