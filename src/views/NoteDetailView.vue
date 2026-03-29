<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotesStore } from '../stores/notes'
import { useSettingsStore } from '../stores/settings'
import MilkdownEditor from '../components/MilkdownEditor.vue'
import MarkdownRenderer from '../components/MarkdownRenderer.vue'
import EditorToolbar from '../components/EditorToolbar.vue'
import WikiLinkPicker from '../components/WikiLinkPicker.vue'
import SplitEditor from '../components/SplitEditor.vue'
import BacklinksPanel from '../components/BacklinksPanel.vue'
import { useEditorActions } from '../composables/useEditorActions'
import type { EditorMode } from '../types'

const route = useRoute()
const router = useRouter()
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
})

const note = computed(() => {
  const id = route.params.id as string
  return notesStore.getNoteById(id)
})

/* 记录打开 */
{
  const id = route.params.id as string
  if (id) notesStore.recordOpen(id)
}

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

function handleDelete() {
  if (!note.value) return
  notesStore.deleteNote(note.value.id)
  router.push('/notes')
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

/** 反向链接 */
const backlinks = computed(() => {
  const id = route.params.id as string
  return id ? notesStore.getBacklinks(id) : []
})

</script>

<template>
  <div class="detail-page">
    <template v-if="note">
      <!-- 顶部操作栏 -->
      <div class="detail-toolbar">
        <button class="toolbar-btn" @click="router.push('/notes')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>返回</span>
        </button>

        <div class="toolbar-actions">
          <!-- 编辑时：模式切换 -->
          <template v-if="isEditing">
            <div class="mode-switcher">
              <button
                class="mode-btn"
                :class="{ active: editorMode === 'wysiwyg' }"
                @click="editorMode = 'wysiwyg'"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span>编辑</span>
              </button>
              <button
                class="mode-btn"
                :class="{ active: editorMode === 'split' }"
                @click="editorMode = 'split'"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" />
                </svg>
                <span>分屏</span>
              </button>
            </div>
          </template>

          <button class="toolbar-btn" :class="{ active: note.isFavorite }" @click="toggleFavorite">
            <svg width="16" height="16" viewBox="0 0 24 24" :fill="note.isFavorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>{{ note.isFavorite ? '取消收藏' : '收藏' }}</span>
          </button>
          <button class="toolbar-btn" :class="{ active: note.isPinned }" @click="togglePin">
            <svg width="16" height="16" viewBox="0 0 24 24" :fill="note.isPinned ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{{ note.isPinned ? '取消置顶' : '置顶' }}</span>
          </button>
          <button v-if="!isEditing" class="toolbar-btn" @click="startEdit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span>编辑</span>
          </button>
          <button class="toolbar-btn danger" @click="handleDelete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span>删除</span>
          </button>
        </div>
      </div>

      <!-- 编辑模式 -->
      <template v-if="isEditing">
        <form class="edit-form" @submit.prevent="saveEdit" novalidate>
          <input v-model="editTitle" type="text" class="edit-title" placeholder="笔记标题">

          <!-- WYSIWYG 模式 -->
          <template v-if="editorMode === 'wysiwyg'">
            <div class="editor-toolbar">
              <button type="button" class="pane-action" @click="insertImageFromFile">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                </svg>
                <span>插入图片</span>
              </button>
              <WikiLinkPicker
                :show="showLinkPicker"
                :search="linkSearch"
                :candidates="linkCandidates"
                @toggle="toggleLinkPicker"
                @update:search="linkSearch = $event"
                @select="insertWikiLink"
              />
              <button type="button" class="pane-action" :class="{ active: showFormatToolbar }" @click="showFormatToolbar = !showFormatToolbar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" />
                </svg>
                <span>格式</span>
              </button>
            </div>
            <EditorToolbar
              v-if="showFormatToolbar"
              @insert="handleToolbarInsert"
              @wrap="handleToolbarWrap"
            />
            <MilkdownEditor :key="editorKey" v-model="editContent" />
          </template>

          <!-- 分屏模式 -->
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
            <input v-model="editCategory" type="text" class="edit-input" placeholder="分类">
            <input v-model="editTags" type="text" class="edit-input" placeholder="标签（空格分隔）">
          </div>
          <div class="edit-actions">
            <button type="button" class="btn-cancel" @click="cancelEdit">取消</button>
            <button type="submit" class="btn-save" :disabled="!editContent.trim()">保存</button>
          </div>
        </form>
      </template>

      <!-- 阅读模式 -->
      <template v-else>
        <article class="note-article">
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
            <MarkdownRenderer :content="note.content" />
          </div>

          <BacklinksPanel :backlinks="backlinks" />
        </article>
      </template>
    </template>

    <!-- 404 -->
    <div v-else class="not-found">
      <p>笔记不存在</p>
      <RouterLink to="/notes" class="back-link">返回知识库</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.detail-page {
  max-width: 960px;
  margin: 0 auto;
}

.detail-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-divider);
  flex-wrap: wrap;
  gap: var(--space-3);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .toolbar-btn:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
  .toolbar-btn.danger:hover {
    background: var(--color-danger-muted);
    color: var(--color-danger);
  }
}

.toolbar-btn.active { color: var(--color-accent); }

/* ─── 模式切换 ─── */
.mode-switcher {
  display: flex;
  gap: var(--space-1);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--space-1);
  margin-right: var(--space-2);
}

.mode-btn {
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

.mode-btn.active {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  box-shadow: 0 1px 3px var(--color-shadow);
}

@media (hover: hover) {
  .mode-btn:not(.active):hover {
    color: var(--color-text-secondary);
  }
}

/* ─── 编辑器工具条 ─── */
.editor-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  position: relative;
  z-index: var(--z-dropdown);
}

.pane-action {
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
  .pane-action:hover {
    background: var(--color-bg-hover);
    color: var(--color-accent);
  }
}

/* ─── 阅读模式 — 方案 B：极光外发光 ─── */
.note-article {
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  overflow: hidden;
  /* 外发光双层 */
  box-shadow:
    0 0 0 1px rgba(91, 127, 245, 0.2),
    0 0 0 4px rgba(91, 127, 245, 0.06),
    0 4px 24px var(--color-shadow);
}

/* Hero 区：标题 + 元信息 */
.note-hero {
  background:
    linear-gradient(135deg, rgba(91, 127, 245, 0.08) 0%, transparent 60%),
    var(--color-bg-secondary);
  padding: var(--space-8) var(--space-8) var(--space-6);
  border-bottom: 1px solid var(--color-border);
  position: relative;
}

/* 顶部极光高光线 */
.note-hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg,
    transparent 10%,
    var(--color-accent) 30%,
    rgba(168, 85, 247, 0.8) 50%,
    var(--color-accent) 70%,
    transparent 90%
  );
  opacity: 0.5;
}

/* 底部分割高光 */
.note-hero::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(91, 127, 245, 0.4), transparent);
}

/* 正文区 */
.note-body {
  background: var(--color-bg-primary);
  padding: var(--space-6) var(--space-8) var(--space-12);
  min-height: 200px;
}

.note-title {
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.3;
  margin-bottom: var(--space-4);
}

.note-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
}

.meta-category {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-accent);
  padding: var(--space-1) var(--space-2);
  background: var(--color-accent-muted);
  border-radius: var(--radius-full);
}

.meta-date {
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
}

.note-tags {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.tag {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  padding: var(--space-1) var(--space-2);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
}

/* ─── 编辑表单 ─── */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.edit-title {
  font-size: 1.2rem;
  font-weight: 600;
  padding: var(--space-3) var(--space-4);
}

.edit-meta-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.edit-input { padding: var(--space-2) var(--space-3); }

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-divider);
}

.btn-save,
.btn-cancel {
  padding: var(--space-2) var(--space-6);
  border-radius: var(--radius-md);
  font-weight: 500;
  transition: background-color var(--duration-fast) var(--ease-out),
              opacity var(--duration-fast) var(--ease-out);
}

.btn-save {
  background: var(--color-accent);
  color: var(--color-text-inverse);
}

.btn-save:disabled { opacity: 0.5; }

@media (hover: hover) {
  .btn-save:hover:not(:disabled) { background: var(--color-accent-hover); }
  .btn-cancel:hover { background: var(--color-bg-hover); }
}

.btn-cancel {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-16) 0;
  color: var(--color-text-tertiary);
}

.back-link { color: var(--color-accent); }

@media (max-width: 640px) {
  .edit-meta-row { grid-template-columns: 1fr; }
}


</style>
