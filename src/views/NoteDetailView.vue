<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotesStore } from '../stores/notes'
import { useSettingsStore } from '../stores/settings'
import MilkdownEditor from '../components/MilkdownEditor.vue'
import MarkdownRenderer from '../components/MarkdownRenderer.vue'
import EditorToolbar from '../components/EditorToolbar.vue'
import WikiLinkPicker from '../components/WikiLinkPicker.vue'
import SplitEditor from '../components/SplitEditor.vue'
import BacklinksPanel from '../components/BacklinksPanel.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import CategoryPicker from '../components/CategoryPicker.vue'
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

// 支持的阅读模式方案
const readingTheme = ref(localStorage.getItem('omega-reading-theme') || 'aurora')
watch(readingTheme, (newVal) => {
  localStorage.setItem('omega-reading-theme', newVal)
})

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

const showDeleteConfirm = ref(false)
const copySuccess = ref(false)

function handleDelete() {
  showDeleteConfirm.value = true
}

function confirmDelete() {
  if (!note.value) return
  showDeleteConfirm.value = false
  notesStore.deleteNote(note.value.id)
  router.push('/notes')
}

function cancelDelete() {
  showDeleteConfirm.value = false
}

async function copyContent() {
  if (!note.value) return
  try {
    await navigator.clipboard.writeText(note.value.content)
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, 1500)
  } catch {
    /* 降级：textarea 方式 */
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

/* ─── Ctrl+S 保存 ─── */
function handleGlobalKey(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (isEditing.value) saveEdit()
  }
}

onMounted(() => window.addEventListener('keydown', handleGlobalKey))
onUnmounted(() => window.removeEventListener('keydown', handleGlobalKey))

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

            <!-- 编辑时也可切换视觉主题 -->
            <div class="mode-switcher">
              <button class="mode-btn" :class="{ active: readingTheme === 'aurora' }" @click="readingTheme = 'aurora'" data-tooltip="精读">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2v2" /><path d="M12 20v2" /><path d="M4.93 4.93l1.41 1.41" /><path d="M17.66 17.66l1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="M6.34 17.66l-1.41 1.41" /><path d="M19.07 4.93l-1.41 1.41" />
                </svg>
              </button>
              <button class="mode-btn" :class="{ active: readingTheme === 'ink' }" @click="readingTheme = 'ink'" data-tooltip="笔墨">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" />
                </svg>
              </button>
              <button class="mode-btn" :class="{ active: readingTheme === 'terminal' }" @click="readingTheme = 'terminal'" data-tooltip="终端">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
                </svg>
              </button>
              <button class="mode-btn" :class="{ active: readingTheme === 'parchment' }" @click="readingTheme = 'parchment'" data-tooltip="羊皮纸">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </button>
            </div>
          </template>
          
          <template v-else>
            <!-- 阅读模式：视觉方案切换 -->
            <div class="mode-switcher">
              <button
                class="mode-btn"
                :class="{ active: readingTheme === 'aurora' }"
                @click="readingTheme = 'aurora'"
                data-tooltip="精读模式"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2v2" /><path d="M12 20v2" /><path d="M4.93 4.93l1.41 1.41" /><path d="M17.66 17.66l1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="M6.34 17.66l-1.41 1.41" /><path d="M19.07 4.93l-1.41 1.41" />
                </svg>
                <span>精读</span>
              </button>
              <button
                class="mode-btn"
                :class="{ active: readingTheme === 'ink' }"
                @click="readingTheme = 'ink'"
                data-tooltip="笔墨模式"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" />
                </svg>
                <span>笔墨</span>
              </button>
              <button
                class="mode-btn"
                :class="{ active: readingTheme === 'terminal' }"
                @click="readingTheme = 'terminal'"
                data-tooltip="终端模式"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
                </svg>
                <span>终端</span>
              </button>
              <button
                class="mode-btn"
                :class="{ active: readingTheme === 'parchment' }"
                @click="readingTheme = 'parchment'"
                data-tooltip="羊皮纸模式"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                <span>羊皮纸</span>
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

          <div class="toolbar-sep" />

          <!-- 缩放控件 -->
          <div class="zoom-inline">
            <button
              type="button"
              class="zoom-inline-btn"
              :disabled="settingsStore.contentZoom <= 80"
              @click="settingsStore.setContentZoom(settingsStore.contentZoom - 5)"
              data-tooltip="缩小"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
            <span class="zoom-value" data-tooltip="双击重置缩放" @dblclick="settingsStore.setContentZoom(100)">{{ settingsStore.contentZoom }}%</span>
            <button
              type="button"
              class="zoom-inline-btn"
              :disabled="settingsStore.contentZoom >= 150"
              @click="settingsStore.setContentZoom(settingsStore.contentZoom + 5)"
              data-tooltip="放大"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 编辑模式 -->
      <template v-if="isEditing">
        <form class="edit-form" :class="`theme-${readingTheme}`" @submit.prevent="saveEdit" novalidate>
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
            <CategoryPicker v-model="editCategory" />
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
        <article class="note-article" :class="`theme-${readingTheme}`">
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
              <svg v-if="!copySuccess" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
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

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      :open="showDeleteConfirm"
      title="确认删除笔记"
      :message="`将把 <strong>${note?.title || '未命名笔记'}</strong> 移入回收站。`"
      confirm-text="删除"
      confirm-type="danger"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
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
  padding-top: var(--space-4);
  border-bottom: 1px solid var(--color-divider);
  flex-wrap: wrap;
  gap: var(--space-3);
  /* #15: 粘性定位 */
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--color-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  margin-left: calc(-1 * var(--space-6, 24px));
  margin-right: calc(-1 * var(--space-6, 24px));
  padding-left: var(--space-6, 24px);
  padding-right: var(--space-6, 24px);
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
  border: 1px solid var(--color-border-button);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
}

.toolbar-btn:active {
  transform: scale(0.98);
}

@media (hover: hover) {
  .toolbar-btn:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
    border-color: var(--color-border-strong);
  }
  .toolbar-btn.danger:hover {
    background: var(--color-danger-muted);
    color: var(--color-danger);
    border-color: var(--color-danger);
  }
}

.toolbar-btn.active {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

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

/* ─── 工具栏分隔 ─── */
.toolbar-sep {
  width: 1px;
  height: 20px;
  background: var(--color-divider);
  margin: 0 var(--space-1);
}

/* ─── 内联缩放 ─── */
.zoom-inline {
  display: flex;
  align-items: center;
  gap: 2px;
}

.zoom-inline-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--color-text-tertiary);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

.zoom-inline-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.zoom-inline-btn:not(:disabled):active {
  transform: scale(0.9);
  color: var(--color-accent);
}

@media (hover: hover) {
  .zoom-inline-btn:not(:disabled):hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
}

.zoom-inline-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-accent-muted);
}

.zoom-value {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--color-text-tertiary);
  min-width: 32px;
  text-align: center;
  cursor: pointer;
  user-select: none;
  transition: color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .zoom-value:hover {
    color: var(--color-accent);
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

/* =========================================
   阅读模式 — 视觉方案：极光微光 (Aurora)
   ========================================= */
.theme-aurora {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.theme-aurora .note-hero {
  border-bottom: 1px solid var(--color-border);
  padding: var(--space-6) var(--space-8);
  background: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.08), 
              0 0 0 1px rgba(99, 102, 241, 0.1);
  transition: box-shadow 0.3s ease;
}

.theme-aurora .note-hero:hover {
  box-shadow: 0 4px 24px rgba(99, 102, 241, 0.15), 
              0 0 0 1px rgba(99, 102, 241, 0.2);
}

.theme-aurora .note-body {
  background: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05),
              0 0 0 1px var(--color-border);
}

.theme-aurora .note-title {
  font-size: clamp(1.5rem, 4vw, 2.2rem);
  font-weight: 800;
  color: var(--color-text-primary);
  margin-bottom: var(--space-4);
}

.theme-aurora .note-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
}

.theme-aurora .meta-category {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-bg-primary);
  padding: 2px var(--space-3);
  background: var(--color-accent);
  border-radius: var(--radius-full);
}

.theme-aurora .meta-date {
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
}

.theme-aurora .note-tags {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.theme-aurora .tag {
  font-size: 0.75rem;
  color: var(--color-accent);
  padding: var(--space-1) var(--space-2);
  background: var(--color-accent-muted);
  border-radius: var(--radius-sm);
}

/* =========================================
   阅读模式 — 视觉方案：笔墨 (Ink)
   极简层级，左侧边线 + 红线纸感
   ========================================= */
.theme-ink {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.theme-ink .note-hero {
  padding: var(--space-8) var(--space-8) var(--space-6);
  border-bottom: 2px solid var(--color-border);
  position: relative;
}

.theme-ink .note-hero::after {
  content: '';
  position: absolute;
  left: var(--space-6);
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--color-accent-muted);
}

.theme-ink .note-title {
  font-size: clamp(1.4rem, 4vw, 2rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text-primary);
  margin-bottom: var(--space-4);
  padding-left: var(--space-6);
}

.theme-ink .note-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
  padding-left: var(--space-6);
}

.theme-ink .meta-category {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-accent);
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
}

.theme-ink .meta-date {
  font-size: 0.8rem;
  font-family: var(--font-mono);
  color: var(--color-text-tertiary);
}

.theme-ink .note-tags {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  padding-left: var(--space-6);
}

.theme-ink .tag {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  padding: var(--space-1) var(--space-2);
  border-bottom: 1px dashed var(--color-text-tertiary);
}

.theme-ink .note-body {
  padding: var(--space-6) var(--space-8) var(--space-12);
  position: relative;
  min-height: 300px;
}

.theme-ink .note-body::before {
  content: '';
  position: absolute;
  left: var(--space-6);
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--color-accent-muted);
}

.theme-ink .note-body :deep(.md-rendered) {
  padding-left: var(--space-6);
  line-height: 1.9;
}

/* =========================================
   阅读模式 — 视觉方案：终端 (Terminal)
   绿色等宽字体，深色背景，hacker 风格
   ========================================= */
.theme-terminal {
  background: oklch(0.14 0.005 160);
  border-radius: var(--radius-lg);
  border: 1px solid oklch(0.25 0.04 145);
  overflow: hidden;
}

.theme-terminal .note-hero {
  padding: var(--space-6) var(--space-6) var(--space-4);
  border-bottom: 1px solid oklch(0.25 0.04 145);
}

.theme-terminal .note-hero::before {
  content: '> ';
  color: oklch(0.7 0.18 145);
  font-family: var(--font-mono);
  font-size: 1rem;
}

.theme-terminal .note-title {
  font-family: var(--font-mono);
  font-size: clamp(1.1rem, 3vw, 1.5rem);
  font-weight: 600;
  color: oklch(0.85 0.18 145);
  display: inline;
}

.theme-terminal .note-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-top: var(--space-3);
}

.theme-terminal .meta-category {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: oklch(0.7 0.12 200);
  padding: 1px var(--space-2);
  border: 1px solid oklch(0.35 0.08 200);
  border-radius: var(--radius-sm);
}

.theme-terminal .meta-date {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: oklch(0.5 0.02 160);
}

.theme-terminal .note-tags {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-top: var(--space-2);
}

.theme-terminal .tag {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: oklch(0.6 0.1 80);
  padding: 0 var(--space-1);
}

.theme-terminal .tag::before { content: '#'; }

.theme-terminal .note-body {
  padding: var(--space-4) var(--space-6) var(--space-8);
}

.theme-terminal .note-body :deep(.md-rendered) {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  line-height: 1.7;
  color: oklch(0.78 0.06 145);
}

.theme-terminal .note-body :deep(.md-rendered h1),
.theme-terminal .note-body :deep(.md-rendered h2),
.theme-terminal .note-body :deep(.md-rendered h3) {
  color: oklch(0.85 0.18 145);
  border-bottom: 1px dashed oklch(0.3 0.04 145);
  padding-bottom: var(--space-1);
}

.theme-terminal .note-body :deep(.md-rendered code) {
  color: oklch(0.8 0.14 80);
  background: oklch(0.18 0.005 160);
}

.theme-terminal .note-body :deep(.md-rendered a) {
  color: oklch(0.7 0.15 200);
  text-decoration: underline;
}

.theme-terminal .copy-content-btn {
  background: oklch(0.18 0.005 160);
  border-color: oklch(0.3 0.04 145);
  color: oklch(0.6 0.1 145);
}

/* =========================================
   阅读模式 — 视觉方案：羊皮纸 (Parchment)
   暖色调，衬线字体，书卷气
   ========================================= */
.theme-parchment {
  background: oklch(0.93 0.03 80);
  border-radius: var(--radius-lg);
  border: 1px solid oklch(0.82 0.04 75);
  box-shadow: inset 0 0 40px oklch(0.85 0.03 70 / 0.5);
  overflow: hidden;
}

.theme-parchment .note-hero {
  padding: var(--space-8) var(--space-8) var(--space-6);
  text-align: center;
  border-bottom: 2px double oklch(0.75 0.04 70);
}

.theme-parchment .note-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: clamp(1.5rem, 4vw, 2.2rem);
  font-weight: 700;
  color: oklch(0.3 0.04 50);
  letter-spacing: 0.02em;
  margin-bottom: var(--space-4);
}

.theme-parchment .note-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
}

.theme-parchment .meta-category {
  font-size: 0.75rem;
  font-weight: 500;
  color: oklch(0.45 0.1 30);
  padding: var(--space-1) var(--space-3);
  background: oklch(0.88 0.04 60);
  border-radius: var(--radius-full);
}

.theme-parchment .meta-date {
  font-size: 0.8rem;
  color: oklch(0.5 0.03 60);
  font-style: italic;
}

.theme-parchment .note-tags {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  justify-content: center;
}

.theme-parchment .tag {
  font-size: 0.72rem;
  color: oklch(0.5 0.06 50);
  padding: var(--space-1) var(--space-2);
  background: oklch(0.9 0.025 70);
  border-radius: var(--radius-sm);
}

.theme-parchment .note-body {
  padding: var(--space-6) var(--space-8) var(--space-12);
}

.theme-parchment .note-body :deep(.md-rendered) {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 1rem;
  line-height: 2;
  color: oklch(0.28 0.03 50);
  text-align: justify;
}

.theme-parchment .note-body :deep(.md-rendered h1),
.theme-parchment .note-body :deep(.md-rendered h2),
.theme-parchment .note-body :deep(.md-rendered h3) {
  color: oklch(0.3 0.06 40);
  font-family: 'Georgia', 'Noto Serif SC', serif;
}

.theme-parchment .note-body :deep(.md-rendered blockquote) {
  border-left-color: oklch(0.6 0.08 50);
  background: oklch(0.9 0.03 75);
  color: oklch(0.35 0.04 50);
  font-style: italic;
}

.theme-parchment .note-body :deep(.md-rendered a) {
  color: oklch(0.4 0.12 30);
}

.theme-parchment .copy-content-btn {
  background: oklch(0.9 0.03 70);
  border-color: oklch(0.78 0.04 65);
  color: oklch(0.5 0.04 50);
}

/* 羊皮纸 暗色模式适配 */
[data-theme='dark'] .theme-parchment {
  background: oklch(0.22 0.02 60);
  border-color: oklch(0.32 0.03 55);
  box-shadow: inset 0 0 40px oklch(0.18 0.02 50 / 0.5);
}

[data-theme='dark'] .theme-parchment .note-hero {
  border-bottom-color: oklch(0.35 0.03 55);
}

[data-theme='dark'] .theme-parchment .note-title {
  color: oklch(0.82 0.05 60);
}

[data-theme='dark'] .theme-parchment .meta-category {
  color: oklch(0.75 0.08 40);
  background: oklch(0.28 0.03 50);
}

[data-theme='dark'] .theme-parchment .meta-date {
  color: oklch(0.6 0.03 55);
}

[data-theme='dark'] .theme-parchment .tag {
  color: oklch(0.65 0.04 55);
  background: oklch(0.25 0.02 55);
}

[data-theme='dark'] .theme-parchment .note-body :deep(.md-rendered) {
  color: oklch(0.78 0.02 60);
}

[data-theme='dark'] .theme-parchment .note-body :deep(.md-rendered h1),
[data-theme='dark'] .theme-parchment .note-body :deep(.md-rendered h2),
[data-theme='dark'] .theme-parchment .note-body :deep(.md-rendered h3) {
  color: oklch(0.82 0.05 50);
}

[data-theme='dark'] .theme-parchment .note-body :deep(.md-rendered blockquote) {
  border-left-color: oklch(0.45 0.06 50);
  background: oklch(0.25 0.02 55);
  color: oklch(0.7 0.03 55);
}

[data-theme='dark'] .theme-parchment .note-body :deep(.md-rendered a) {
  color: oklch(0.7 0.1 40);
}

[data-theme='dark'] .theme-parchment .copy-content-btn {
  background: oklch(0.25 0.02 55);
  border-color: oklch(0.35 0.03 50);
  color: oklch(0.6 0.04 55);
}

/* ─── 编辑表单 ─── */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* ── 编辑模式主题适配 ── */
.edit-form.theme-aurora {
  background: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.08),
              0 0 0 1px rgba(99, 102, 241, 0.1);
}

.edit-form.theme-ink {
  border-left: 3px solid var(--color-accent-muted);
  padding-left: var(--space-6);
}

.edit-form.theme-terminal {
  background: oklch(0.16 0.015 250);
  border: 1px solid oklch(0.3 0.03 160);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  font-family: var(--font-mono);
}

.edit-form.theme-terminal .edit-title {
  font-family: var(--font-mono);
  color: oklch(0.85 0.15 160);
  border-color: oklch(0.3 0.03 160);
}

.edit-form.theme-parchment {
  background: oklch(0.95 0.02 80);
  border: 1px solid oklch(0.8 0.04 80);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}

[data-theme='dark'] .edit-form.theme-parchment {
  background: oklch(0.22 0.02 55);
  border-color: oklch(0.35 0.03 50);
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
  border: 1px solid var(--color-accent);
}

.btn-save:disabled { opacity: 0.5; }

@media (hover: hover) {
  .btn-save:hover:not(:disabled) {
    background: var(--color-accent-hover);
    border-color: var(--color-accent-hover);
  }
  .btn-cancel:hover {
    background: var(--color-bg-hover);
    border-color: var(--color-border-strong);
  }
}

.btn-cancel {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-button);
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

/* ─── 复制内容按钮 ─── */
.note-body {
  position: relative;
}

.copy-content-btn {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  color: var(--color-text-tertiary);
  opacity: 0;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: opacity var(--duration-fast) var(--ease-out),
              background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
}

.note-body:hover .copy-content-btn {
  opacity: 1;
}

.copy-content-btn.copied {
  opacity: 1;
  color: var(--color-success);
  border-color: var(--color-success);
  background: var(--color-success-muted, rgba(34, 197, 94, 0.1));
}

@media (hover: hover) {
  .copy-content-btn:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
    transform: translateY(-1px);
  }
}

.copy-content-btn:active {
  transform: scale(0.95);
}

/* 笔墨主题下复制按钮位置调整 */
.theme-ink .copy-content-btn {
  right: var(--space-4);
  top: var(--space-4);
}

@media (max-width: 640px) {
  .edit-meta-row { grid-template-columns: 1fr; }

  .copy-content-btn {
    opacity: 1;
  }
}
</style>
