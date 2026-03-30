<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useNotesStore } from '../stores/notes'
import { useSettingsStore } from '../stores/settings'
import { useRouter, useRoute } from 'vue-router'
import MilkdownEditor from '../components/MilkdownEditor.vue'
import EditorToolbar from '../components/EditorToolbar.vue'
import WikiLinkPicker from '../components/WikiLinkPicker.vue'
import SplitEditor from '../components/SplitEditor.vue'
import CategoryPicker from '../components/CategoryPicker.vue'
import DraftToast from '../components/DraftToast.vue'
import { getTemplates, type NoteTemplate } from '../utils/templates'
import { useEditorActions } from '../composables/useEditorActions'
import { useDraft } from '../composables/useDraft'
import type { EditorMode } from '../types'

const notesStore = useNotesStore()
const settingsStore = useSettingsStore()
const router = useRouter()
const route = useRoute()

/* ─── 草稿系统 ─── */
const {
  draftTitle: title,
  draftContent: content,
  draftCategory: category,
  draftTags: tags,
  wasRestored: showDraftToast,
  clearDraft,
} = useDraft('write-new')

/* 如果路由带有 ?category=xxx，预填分类（优先于草稿） */
const prefillCat = route.query.category as string | undefined
if (prefillCat) category.value = prefillCat

const isSaving = ref(false)
const showTemplates = ref(!title.value && !content.value)
const hasSubmitted = ref(false)
const templates = getTemplates()

const editorMode = ref<EditorMode>(settingsStore.defaultEditorMode)
const editorKey = ref(0)
const sourceTextareaRef = ref<HTMLTextAreaElement | null>(null)

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
  content,
  editorMode,
  editorKey,
  textareaRef: sourceTextareaRef,
})

function applyTemplate(tpl: NoteTemplate) {
  title.value = tpl.title
  content.value = tpl.content
  /* Bug #6 fix: 如果 URL 带有 ?category= 预填分类，则保留；否则使用模板分类 */
  if (!prefillCat || !category.value) {
    category.value = tpl.category
  }
  showTemplates.value = false
  if (tpl.content) {
    editorMode.value = 'split'
  }
}

async function handleSubmit() {
  if (!content.value.trim() || isSaving.value || hasSubmitted.value) return

  isSaving.value = true
  hasSubmitted.value = true

  try {
    const note = await notesStore.addNote({
      title: title.value.trim(),
      content: content.value.trim(),
      category: category.value.trim() || '未分类',
      tags: tags.value.trim() ? tags.value.trim().split(/\s+/) : [],
    })

    console.log('笔记已保存, id:', note.id)
    clearDraft()

    /* 用 replace 而不是 push，避免返回到已清空的 write 页 */
    await router.replace(`/note/${note.id}`)
  } catch (err) {
    console.error('保存或跳转失败:', err)
    hasSubmitted.value = false
    isSaving.value = false
  }
}

/* ─── Bug #2 fix: 取消按钮逻辑 ─── */
function handleCancel() {
  /* 如果正在编辑（非模板选择），先返回模板选择器 */
  if (!showTemplates.value) {
    showTemplates.value = true
    title.value = ''
    content.value = ''
    category.value = prefillCat || ''
    return
  }
  /* 已在模板选择器，导航离开 */
  clearDraft()
  if (window.history.length > 1) {
    router.back()
  } else {
    router.replace('/notes')
  }
}

/* ─── Ctrl+S 保存 ─── */
function handleGlobalKey(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (!showTemplates.value) handleSubmit()
  }
}

onMounted(() => window.addEventListener('keydown', handleGlobalKey))
onUnmounted(() => window.removeEventListener('keydown', handleGlobalKey))

</script>

<template>
  <div class="write-page">
    <div class="page-header">
      <h2 class="page-title">新建笔记</h2>
      <div class="header-actions">
        <button
          v-if="!showTemplates"
          class="template-back-btn"
          @click="showTemplates = true; title = ''; content = ''; category = ''"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>模板</span>
        </button>
        <div v-if="!showTemplates" class="mode-switcher">
          <button
            class="mode-btn"
            :class="{ active: editorMode === 'wysiwyg' }"
            @click="editorMode = 'wysiwyg'"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <span>编辑</span>
          </button>
          <button
            class="mode-btn"
            :class="{ active: editorMode === 'split' }"
            @click="editorMode = 'split'"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" />
            </svg>
            <span>分屏</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 模板选择器 -->
    <div v-if="showTemplates" class="template-grid">
      <button
        v-for="tpl in templates"
        :key="tpl.id"
        class="template-card"
        @click="applyTemplate(tpl)"
      >
        <!-- file -->
        <svg v-if="tpl.icon === 'file'" class="template-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <!-- users -->
        <svg v-else-if="tpl.icon === 'users'" class="template-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <!-- book -->
        <svg v-else-if="tpl.icon === 'book'" class="template-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <!-- calendar -->
        <svg v-else-if="tpl.icon === 'calendar'" class="template-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <!-- lightbulb -->
        <svg v-else-if="tpl.icon === 'lightbulb'" class="template-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18h6" /><path d="M10 22h4" />
          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
        </svg>
        <!-- check -->
        <svg v-else-if="tpl.icon === 'check'" class="template-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span class="template-name">{{ tpl.name }}</span>
        <span class="template-desc">{{ tpl.description }}</span>
      </button>
    </div>

    <form v-else class="write-form" @submit.prevent="handleSubmit" novalidate>
      <input
        v-model="title"
        type="text"
        class="write-title"
        placeholder="笔记标题（可选）"
      >

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
        <MilkdownEditor :key="editorKey" v-model="content" />
      </template>

      <!-- 分屏模式 -->
      <SplitEditor
        v-else
        v-model:content="content"
        v-model:textarea-ref="sourceTextareaRef"
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

      <div class="write-meta">
        <div class="meta-field">
          <label class="meta-label">分类</label>
          <CategoryPicker v-model="category" />
        </div>

        <div class="meta-field">
          <label class="meta-label">标签</label>
          <input
            v-model="tags"
            type="text"
            class="meta-input"
            placeholder="空格分隔"
          >
        </div>
      </div>

      <div class="write-actions">
        <button type="button" class="btn-secondary" @click="handleCancel">取消</button>
        <button
          type="submit"
          class="btn-primary"
          :class="{ 'is-loading': isSaving }"
          :disabled="!content.trim() || isSaving || hasSubmitted"
        >
          <span v-if="hasSubmitted && !isSaving">已保存 ✓</span>
          <span v-else-if="!isSaving">保存笔记</span>
          <span v-else class="spinner" />
        </button>
      </div>
    </form>

    <DraftToast :show="showDraftToast" @close="showDraftToast = false" />
  </div>
</template>

<style scoped>
.write-page {
  max-width: 960px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.template-back-btn {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text-tertiary);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .template-back-btn:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
}

/* ─── 模板网格 ─── */
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--space-4);
}

.template-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-6) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-lg);
  text-align: center;
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .template-card:hover {
    transform: translateY(-3px);
    border-color: var(--color-accent);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }
  .template-card:hover .template-icon {
    color: var(--color-accent);
  }
}

.template-icon {
  color: var(--color-text-tertiary);
  transition: color var(--duration-fast) var(--ease-out);
}

.template-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.template-desc {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

/* ─── 模式切换 ─── */
.mode-switcher {
  display: flex;
  gap: var(--space-1);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--space-1);
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
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

/* ─── 表单 ─── */
.write-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.write-title {
  font-size: 1.2rem;
  font-weight: 600;
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

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

/* ─── 元信息 ─── */
.write-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.meta-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.meta-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.meta-input {
  padding: var(--space-2) var(--space-3);
  font-size: 0.9rem;
}

/* ─── 按钮 ─── */
.write-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-divider);
}

.btn-primary,
.btn-secondary {
  padding: var(--space-2) var(--space-6);
  border-radius: var(--radius-md);
  font-weight: 500;
  font-size: 0.9rem;
  transition: background-color var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out),
              opacity var(--duration-fast) var(--ease-out);
}

.btn-primary {
  background: var(--color-accent);
  color: var(--color-text-inverse);
}

.btn-primary:disabled { opacity: 0.5; }
.btn-primary.is-loading { pointer-events: none; }

@media (hover: hover) {
  .btn-primary:hover:not(:disabled) { background: var(--color-accent-hover); }
  .btn-secondary:hover { background: var(--color-bg-hover); }
}

.btn-secondary {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: currentColor;
  border-radius: var(--radius-full);
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 640px) {
  .write-meta { grid-template-columns: 1fr; }
}
</style>
