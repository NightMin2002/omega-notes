<script setup lang="ts">
import { computed, ref, shallowRef, watch, onMounted, onUnmounted } from 'vue'
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
const milkdownEditorRef = shallowRef<InstanceType<typeof MilkdownEditor> | null>(null)

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
  milkdownRef: milkdownEditorRef,
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

/** 悬挂笔记 — 在独立窗口打开 */
async function popoutNote() {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('open_popout', { kind: 'note', noteId: route.params.id })
  } catch {
    // 浏览器环境不支持
  }
}

</script>

<template>
  <div class="detail-page">
    <template v-if="note">
      <!-- 顶部操作栏 -->
      <div class="detail-toolbar">
        <!-- 编辑模式：左侧“取消” / 阅读模式：“返回” -->
        <button v-if="isEditing" class="toolbar-btn toolbar-btn--cancel" @click="cancelEdit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          <span>取消</span>
        </button>
        <button v-else class="toolbar-btn" @click="router.push('/notes')">
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
              <button class="mode-btn" :class="{ active: readingTheme === 'source' }" @click="readingTheme = 'source'" data-tooltip="源码">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                </svg>
              </button>
            </div>

            <!-- 编辑模式：顶栏保存按钮 -->
            <button class="toolbar-btn toolbar-btn--save" :disabled="!editContent.trim()" @click="saveEdit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span>保存</span>
            </button>
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
              <button
                class="mode-btn"
                :class="{ active: readingTheme === 'source' }"
                @click="readingTheme = 'source'"
                data-tooltip="源码模式"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                </svg>
                <span>源码</span>
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
          <button v-if="!isEditing" class="toolbar-btn" @click="popoutNote" data-tooltip="在独立窗口打开">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            <span>悬挂</span>
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

      <!-- 编辑模式时的编辑器工具条（不随内容滚动） -->
      <template v-if="isEditing && editorMode === 'wysiwyg'">
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
      </template>

      <!-- 内容区域（阅读/WYSIWYG 滚动，分屏时 flex 填充） -->
      <div class="detail-content" :class="{ 'split-active': isEditing && editorMode === 'split' }">
        <!-- 编辑模式 -->
        <template v-if="isEditing">
          <form class="edit-form" :class="`theme-${readingTheme}`" @submit.prevent="saveEdit" novalidate>
            <input v-model="editTitle" type="text" class="edit-title" placeholder="笔记标题">

            <!-- WYSIWYG 模式 -->
            <template v-if="editorMode === 'wysiwyg'">
              <MilkdownEditor ref="milkdownEditorRef" :key="editorKey" v-model="editContent" />
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
              <template v-if="readingTheme === 'source'">
                <pre class="source-raw"><code>{{ note.content }}</code></pre>
              </template>
              <MarkdownRenderer
                v-else
                :content="note.content"
                :editable-content="note.content"
                @update:editable-content="(val: string) => { if (note) notesStore.updateNote(note.id, { content: val }) }"
              />
            </div>

            <BacklinksPanel :backlinks="backlinks" />
          </article>
        </template>
      </div>
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
  display: flex;
  flex-direction: column;
  /* 负 margin 抵消父级 .app-main 的 padding，避免页面切换时布局跳动 */
  margin: calc(-1 * var(--app-main-padding));
  height: calc(100% + 2 * var(--app-main-padding));
  overflow: hidden;
}

.detail-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-divider);
  flex-wrap: wrap;
  gap: var(--space-3);
  flex-shrink: 0;
  background: var(--color-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 10;
}

/* 编辑器工具条（不滚动） */
.editor-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-6);
  background: var(--color-bg-tertiary);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  z-index: var(--z-dropdown);
}

/* EditorToolbar 组件也不滚动 */
.detail-page > :deep(.editor-toolbar-strip) {
  flex-shrink: 0;
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-top: none;
  padding-left: var(--space-6);
  padding-right: var(--space-6);
}

/* 可滚动内容区域（阅读/WYSIWYG 模式） */
.detail-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-6);
  min-height: 0;
}

/* 分屏模式：不滚动，flex 填充高度，让 SplitEditor 内部管理滚动 */
.detail-content.split-active {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.detail-content.split-active > .edit-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 内容区域内的表单/文章居中约束 */
.detail-content > form,
.detail-content > article {
  max-width: 960px;
  margin: 0 auto;
}

/* 分屏模式下不限制宽度 */
.detail-content.split-active > .edit-form {
  max-width: none;
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

/* ─── 顶栏编辑操作按钮 ─── */
.toolbar-btn--cancel {
  color: var(--color-text-tertiary);
  border-color: var(--color-border);
}

.toolbar-btn--save {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
}

.toolbar-btn--save:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (hover: hover) {
  .toolbar-btn--cancel:hover {
    color: var(--color-danger);
    border-color: var(--color-danger);
    background: var(--color-danger-muted);
  }
  .toolbar-btn--save:hover:not(:disabled) {
    background: color-mix(in oklch, var(--color-accent), white 12%);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px var(--color-accent-muted);
  }
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

/* 编辑器工具条中的按钮 */

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
   青绿渐变光晕、真实北极光色调
   ========================================= */
.theme-aurora {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.theme-aurora .note-hero {
  padding: var(--space-8) var(--space-8) var(--space-6);
  background:
    linear-gradient(135deg, oklch(0.25 0.06 170 / 0.18) 0%, transparent 50%),
    linear-gradient(225deg, oklch(0.3 0.06 200 / 0.12) 0%, transparent 50%),
    var(--color-bg-primary);
  border-radius: var(--radius-lg);
  border: 1px solid oklch(0.5 0.08 170 / 0.15);
  box-shadow:
    0 4px 24px oklch(0.5 0.1 170 / 0.1),
    0 0 0 1px oklch(0.5 0.06 170 / 0.08),
    inset 0 1px 0 oklch(0.8 0.04 170 / 0.2);
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.4s ease, transform 0.3s ease;
}

/* 极光光带装饰 */
.theme-aurora .note-hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: -50%;
  width: 200%;
  height: 3px;
  background: linear-gradient(90deg,
    transparent,
    oklch(0.65 0.18 170),
    oklch(0.7 0.15 200),
    oklch(0.6 0.16 140),
    transparent
  );
  opacity: 0.6;
  animation: aurora-shimmer 8s ease-in-out infinite;
}

@keyframes aurora-shimmer {
  0%, 100% { transform: translateX(-20%); opacity: 0.4; }
  50% { transform: translateX(20%); opacity: 0.8; }
}

@media (prefers-reduced-motion: reduce) {
  .theme-aurora .note-hero::before { animation: none; opacity: 0.6; }
}

.theme-aurora .note-hero:hover {
  box-shadow:
    0 8px 32px oklch(0.5 0.12 170 / 0.18),
    0 0 0 1px oklch(0.5 0.08 170 / 0.15),
    inset 0 1px 0 oklch(0.8 0.05 170 / 0.25);
  transform: translateY(-1px);
}

.theme-aurora .note-body {
  background: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  border: 1px solid var(--color-border);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  position: relative;
}

/* note-body 顶部微光渐变 */
.theme-aurora .note-body::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 80px;
  background: linear-gradient(
    180deg,
    oklch(0.5 0.05 170 / 0.06) 0%,
    transparent 100%
  );
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  pointer-events: none;
}

/* 渐变色标题 */
.theme-aurora .note-title {
  font-size: clamp(1.5rem, 4vw, 2.2rem);
  font-weight: 800;
  background: linear-gradient(135deg,
    oklch(0.7 0.15 170),
    oklch(0.65 0.14 200),
    oklch(0.7 0.16 140)
  );
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: var(--space-4);
}

/* 浅色模式下标题渐变更深 */
[data-theme='light'] .theme-aurora .note-title {
  background: linear-gradient(135deg,
    oklch(0.42 0.15 170),
    oklch(0.38 0.14 200),
    oklch(0.42 0.16 140)
  );
  background-clip: text;
  -webkit-background-clip: text;
}

.theme-aurora .note-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
}

/* 渐变分类药丸 */
.theme-aurora .meta-category {
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  padding: 3px var(--space-3);
  background: linear-gradient(135deg, oklch(0.5 0.14 170), oklch(0.48 0.12 200));
  border-radius: var(--radius-full);
  box-shadow: 0 2px 8px oklch(0.5 0.12 170 / 0.3);
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
  color: oklch(0.6 0.12 170);
  padding: var(--space-1) var(--space-2);
  background: oklch(0.5 0.08 170 / 0.1);
  border: 1px solid oklch(0.5 0.08 170 / 0.15);
  border-radius: var(--radius-sm);
  transition: background-color var(--duration-fast) var(--ease-out);
}

[data-theme='light'] .theme-aurora .tag {
  color: oklch(0.4 0.12 170);
  background: oklch(0.5 0.08 170 / 0.08);
  border-color: oklch(0.5 0.08 170 / 0.12);
}

@media (hover: hover) {
  .theme-aurora .tag:hover {
    background: oklch(0.5 0.08 170 / 0.2);
  }
}

/* =========================================
   阅读模式 — 视觉方案：笔墨 (Ink)
   横线纸纹理 + 左侧红线 + 首字下沉
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

/* 左侧红色竖线 */
.theme-ink .note-hero::after {
  content: '';
  position: absolute;
  left: var(--space-6);
  top: 0;
  bottom: 0;
  width: 2px;
  background: oklch(0.65 0.2 25);
}

/* 页眉底部装饰线 */
.theme-ink .note-hero::before {
  content: '✦';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
  background: var(--color-bg-primary);
  padding: 0 var(--space-3);
  z-index: 1;
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
  /* 横线纸纹理 */
  background-image: repeating-linear-gradient(
    180deg,
    transparent,
    transparent 31px,
    oklch(0.5 0.01 250 / 0.1) 31px,
    oklch(0.5 0.01 250 / 0.1) 32px
  );
  background-size: 100% 32px;
  background-position-y: 15px;
}

/* 左侧红色竖线延续 */
.theme-ink .note-body::before {
  content: '';
  position: absolute;
  left: var(--space-6);
  top: 0;
  bottom: 0;
  width: 2px;
  background: oklch(0.65 0.2 25);
}

.theme-ink .note-body :deep(.md-rendered) {
  padding-left: var(--space-6);
  line-height: 2;  /* 与横线间距对齐 */
}

/* 浅色模式横线颜色 */
[data-theme='light'] .theme-ink .note-body {
  background-image: repeating-linear-gradient(
    180deg,
    transparent,
    transparent 31px,
    oklch(0.7 0.02 250 / 0.2) 31px,
    oklch(0.7 0.02 250 / 0.2) 32px
  );
}

/* =========================================
   阅读模式 — 视觉方案：终端 (Terminal)
   CRT 扫描线 + 窗口标题栏 + 打字光标
   ========================================= */
.theme-terminal {
  background: oklch(0.14 0.005 160);
  border-radius: var(--radius-lg);
  border: 1px solid oklch(0.25 0.04 145);
  overflow: hidden;
  position: relative;
}

/* CRT 扫描线效果 */
.theme-terminal::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    oklch(0 0 0 / 0.03) 2px,
    oklch(0 0 0 / 0.03) 4px
  );
  pointer-events: none;
  z-index: 1;
  border-radius: var(--radius-lg);
}

@media (prefers-reduced-motion: reduce) {
  .theme-terminal::after { opacity: 0.5; }
}

/* 窗口标题栏 */
.theme-terminal .note-hero {
  padding: var(--space-2) var(--space-4) var(--space-4);
  border-bottom: 1px solid oklch(0.25 0.04 145);
  position: relative;
}

/* 三色窗口按钮 */
.theme-terminal .note-hero::after {
  content: '● ● ●';
  position: absolute;
  top: var(--space-2);
  left: var(--space-4);
  font-size: 0.5rem;
  letter-spacing: 4px;
  background: linear-gradient(90deg,
    oklch(0.65 0.2 25) 0%, oklch(0.65 0.2 25) 28%,
    oklch(0.75 0.18 95) 28%, oklch(0.75 0.18 95) 61%,
    oklch(0.65 0.15 145) 61%
  );
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.theme-terminal .note-hero::before {
  content: '~/notes >';
  color: oklch(0.5 0.08 145);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  display: block;
  margin-top: var(--space-4);
  margin-bottom: var(--space-2);
}

.theme-terminal .note-title {
  font-family: var(--font-mono);
  font-size: clamp(1.1rem, 3vw, 1.5rem);
  font-weight: 600;
  color: oklch(0.85 0.18 145);
  display: inline;
}

/* 打字闪烁光标 */
.theme-terminal .note-title::after {
  content: '█';
  font-weight: 400;
  color: oklch(0.7 0.18 145);
  animation: cursor-blink 1s step-end infinite;
  margin-left: 2px;
}

@keyframes cursor-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .theme-terminal .note-title::after { animation: none; }
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

/* 终端主题 — 浅色模式适配 */
[data-theme='light'] .theme-terminal {
  background: oklch(0.96 0.008 200);
  border-color: oklch(0.82 0.03 200);
}

[data-theme='light'] .theme-terminal .note-hero {
  border-bottom-color: oklch(0.85 0.025 200);
}

[data-theme='light'] .theme-terminal .note-hero::before {
  color: oklch(0.45 0.15 160);
}

[data-theme='light'] .theme-terminal .note-title {
  color: oklch(0.3 0.12 160);
}

[data-theme='light'] .theme-terminal .meta-category {
  color: oklch(0.4 0.1 200);
  border-color: oklch(0.75 0.06 200);
}

[data-theme='light'] .theme-terminal .meta-date {
  color: oklch(0.55 0.02 200);
}

[data-theme='light'] .theme-terminal .tag {
  color: oklch(0.45 0.08 80);
}

[data-theme='light'] .theme-terminal .note-body :deep(.md-rendered) {
  color: oklch(0.3 0.04 200);
}

[data-theme='light'] .theme-terminal .note-body :deep(.md-rendered h1),
[data-theme='light'] .theme-terminal .note-body :deep(.md-rendered h2),
[data-theme='light'] .theme-terminal .note-body :deep(.md-rendered h3) {
  color: oklch(0.3 0.12 160);
  border-bottom-color: oklch(0.82 0.03 160);
}

[data-theme='light'] .theme-terminal .note-body :deep(.md-rendered code) {
  color: oklch(0.4 0.12 80);
  background: oklch(0.92 0.01 200);
}

[data-theme='light'] .theme-terminal .note-body :deep(.md-rendered a) {
  color: oklch(0.4 0.12 200);
}

[data-theme='light'] .theme-terminal .copy-content-btn {
  background: oklch(0.93 0.008 200);
  border-color: oklch(0.82 0.03 200);
  color: oklch(0.5 0.08 160);
}

/* =========================================
   阅读模式 — 视觉方案：羊皮纸 (Parchment)
   纸张做旧纹理 + 古典装饰 + 首字下沉
   ========================================= */
.theme-parchment {
  background: oklch(0.93 0.03 80);
  border-radius: var(--radius-lg);
  border: 1px solid oklch(0.82 0.04 75);
  box-shadow:
    inset 0 0 60px oklch(0.85 0.03 70 / 0.4),
    inset 0 0 120px oklch(0.8 0.02 65 / 0.2);
  overflow: hidden;
  position: relative;
}

/* 纸张做旧肌理（角落深色渐变 + 噪点纹理） */
.theme-parchment::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 0% 0%, oklch(0.7 0.04 60 / 0.18), transparent 50%),
    radial-gradient(ellipse at 100% 100%, oklch(0.7 0.04 60 / 0.15), transparent 50%),
    radial-gradient(ellipse at 100% 0%, oklch(0.72 0.03 55 / 0.08), transparent 40%),
    radial-gradient(ellipse at 0% 100%, oklch(0.72 0.03 55 / 0.08), transparent 40%);
  pointer-events: none;
  z-index: 0;
}

/* 噪点纹理 — 模拟磨砂磨砗的古纸表面 */
.theme-parchment::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  background-size: 200px 200px;
  opacity: 0.6;
  pointer-events: none;
  z-index: 0;
  border-radius: var(--radius-lg);
}

.theme-parchment .note-hero {
  padding: var(--space-8) var(--space-8) var(--space-6);
  text-align: center;
  border-bottom: none;
  position: relative;
  z-index: 1;
}

/* 装饰性分割线 */
.theme-parchment .note-hero::after {
  content: '— ✦ —';
  display: block;
  margin-top: var(--space-4);
  font-size: 0.8rem;
  color: oklch(0.6 0.06 60);
  letter-spacing: 8px;
}

.theme-parchment .note-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: clamp(1.5rem, 4vw, 2.2rem);
  font-weight: 700;
  color: oklch(0.3 0.04 50);
  letter-spacing: 0.05em;
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
  font-size: 0.72rem;
  font-weight: 500;
  font-variant: small-caps;
  letter-spacing: 0.08em;
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
  padding: var(--space-8) var(--space-10) var(--space-12);
  position: relative;
  z-index: 1;
}

/* 页脚装饰 */
.theme-parchment .note-body::after {
  content: '❧';
  display: block;
  text-align: center;
  margin-top: var(--space-8);
  font-size: 1.5rem;
  color: oklch(0.65 0.06 60);
}

.theme-parchment .note-body :deep(.md-rendered) {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 1rem;
  line-height: 2;
  color: oklch(0.28 0.03 50);
  text-align: justify;
}

/* 古典羊皮纸阅读域整体左缩进 */
.theme-parchment .note-body :deep(.md-rendered) {
  padding-left: clamp(1rem, 5vw, 3rem) !important;
  padding-right: clamp(1rem, 5vw, 3rem) !important;
}

.theme-parchment .note-body :deep(.md-rendered blockquote) {
  margin-left: -1rem; /* 让引用微微跳出排版网格，显出复古感 */
}

/* 列表缩进优化 */
.theme-parchment .note-body :deep(.md-rendered ul),
.theme-parchment .note-body :deep(.md-rendered ol) {
  padding-left: 1.5rem;
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

/* 羊皮纸：表格适配 */
.theme-parchment .note-body :deep(.md-rendered table) {
  border-collapse: collapse;
}

.theme-parchment .note-body :deep(.md-rendered th) {
  background: oklch(0.88 0.035 70);
  color: oklch(0.3 0.04 50);
  border-color: oklch(0.78 0.04 65);
}

.theme-parchment .note-body :deep(.md-rendered td) {
  border-color: oklch(0.82 0.035 70);
  color: oklch(0.28 0.03 50);
}

.theme-parchment .note-body :deep(.md-rendered tr:nth-child(even)) {
  background: oklch(0.91 0.025 75);
}

/* 羊皮纸：代码块适配 */
.theme-parchment .note-body :deep(.md-rendered pre) {
  background: oklch(0.96 0.015 75);
  border-color: oklch(0.82 0.035 70);
}

.theme-parchment .note-body :deep(.md-rendered pre code) {
  color: oklch(0.3 0.02 50);
}

.theme-parchment .note-body :deep(.md-rendered .hljs) {
  background: oklch(0.96 0.015 75) !important;
}

/* highlight.js 语法色 — 羊皮纸浅色暖调 */
.theme-parchment .note-body :deep(.hljs-keyword),
.theme-parchment .note-body :deep(.hljs-selector-tag),
.theme-parchment .note-body :deep(.hljs-built_in),
.theme-parchment .note-body :deep(.hljs-type) {
  color: oklch(0.45 0.18 310);
}

.theme-parchment .note-body :deep(.hljs-string),
.theme-parchment .note-body :deep(.hljs-attr) {
  color: oklch(0.42 0.14 25);
}

.theme-parchment .note-body :deep(.hljs-number),
.theme-parchment .note-body :deep(.hljs-literal) {
  color: oklch(0.48 0.15 55);
}

.theme-parchment .note-body :deep(.hljs-comment) {
  color: oklch(0.55 0.02 60);
  font-style: italic;
}

.theme-parchment .note-body :deep(.hljs-function),
.theme-parchment .note-body :deep(.hljs-title) {
  color: oklch(0.4 0.14 200);
}

/* 羊皮纸：行内代码适配 */
.theme-parchment .note-body :deep(.md-rendered code) {
  background: oklch(0.9 0.025 70);
  color: oklch(0.38 0.1 30);
}

/* 羊皮纸：分割线 */
.theme-parchment .note-body :deep(.md-rendered hr) {
  border-top-color: oklch(0.78 0.04 65);
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

/* 羊皮纸暗色：表格 */
[data-theme='dark'] .theme-parchment .note-body :deep(.md-rendered th) {
  background: oklch(0.28 0.025 55);
  color: oklch(0.78 0.04 60);
  border-color: oklch(0.35 0.03 50);
}

[data-theme='dark'] .theme-parchment .note-body :deep(.md-rendered td) {
  border-color: oklch(0.32 0.025 55);
  color: oklch(0.75 0.02 60);
}

[data-theme='dark'] .theme-parchment .note-body :deep(.md-rendered tr:nth-child(even)) {
  background: oklch(0.24 0.018 55);
}

/* 羊皮纸暗色：代码块 */
[data-theme='dark'] .theme-parchment .note-body :deep(.md-rendered pre) {
  background: oklch(0.19 0.015 55);
  border-color: oklch(0.32 0.025 50);
}

[data-theme='dark'] .theme-parchment .note-body :deep(.md-rendered .hljs) {
  background: oklch(0.19 0.015 55) !important;
}

[data-theme='dark'] .theme-parchment .note-body :deep(.md-rendered code) {
  background: oklch(0.25 0.02 55);
  color: oklch(0.72 0.08 40);
}

[data-theme='dark'] .theme-parchment .note-body :deep(.md-rendered hr) {
  border-top-color: oklch(0.35 0.03 55);
}

/* ─── 编辑表单 ─── */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

/* ── 编辑标题 ── */
.edit-title {
  font-size: 1.3rem;
  font-weight: 700;
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-2);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  transition: border-color var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
}

.edit-title:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px oklch(from var(--color-accent) l c h / 0.12);
}

.edit-title::placeholder {
  color: var(--color-text-tertiary);
  font-weight: 400;
}

/* ── 元数据行 ── */
.edit-meta-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  padding: var(--space-4);
  margin-top: var(--space-2);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.edit-input {
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-size: 0.85rem;
  transition: border-color var(--duration-fast) var(--ease-out);
}

.edit-input:focus {
  border-color: var(--color-accent);
}

.edit-input::placeholder {
  color: var(--color-text-tertiary);
}


/* ════════════════════════════════════════════════
   编辑模式 — 主题适配
   ════════════════════════════════════════════════ */

/* ── Aurora 极光 ── */
.edit-form.theme-aurora {
  background: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.08),
              0 0 0 1px rgba(99, 102, 241, 0.1);
}

.edit-form.theme-aurora .edit-title {
  background: var(--color-bg-secondary);
  border-color: rgba(99, 102, 241, 0.15);
}

.edit-form.theme-aurora .edit-title:focus {
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.edit-form.theme-aurora .edit-meta-row {
  background: rgba(99, 102, 241, 0.03);
  border-color: rgba(99, 102, 241, 0.1);
}


.edit-form.theme-aurora :deep(.split-editor) {
  border-color: rgba(99, 102, 241, 0.15);
}

/* ── Ink 笔墨 ── */
.edit-form.theme-ink {
  border-left: 3px solid var(--color-accent-muted);
  padding-left: var(--space-6);
}

.edit-form.theme-ink .edit-title {
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--color-border);
  border-radius: 0;
  padding-left: 0;
  font-weight: 600;
}

.edit-form.theme-ink .edit-title:focus {
  border-bottom-color: var(--color-accent);
  box-shadow: none;
}

.edit-form.theme-ink .edit-meta-row {
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--color-border);
  border-radius: 0;
  padding: var(--space-3) 0;
}

.edit-form.theme-ink .edit-input {
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--color-border);
  border-radius: 0;
}


.edit-form.theme-ink :deep(.split-editor) {
  border-radius: var(--radius-sm);
}

/* ── Terminal 终端 ── */
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
  background: oklch(0.14 0.01 250);
  border-color: oklch(0.3 0.03 160);
}

.edit-form.theme-terminal .edit-title:focus {
  border-color: oklch(0.6 0.15 160);
  box-shadow: 0 0 0 3px oklch(0.3 0.08 145 / 0.3);
}

.edit-form.theme-terminal .edit-title::placeholder {
  color: oklch(0.4 0.04 145);
}

.edit-form.theme-terminal .edit-meta-row {
  background: oklch(0.14 0.01 250);
  border-color: oklch(0.3 0.03 160);
}

.edit-form.theme-terminal .edit-input {
  background: oklch(0.12 0.005 250);
  border-color: oklch(0.28 0.02 160);
  color: oklch(0.78 0.06 145);
  font-family: var(--font-mono);
}

.edit-form.theme-terminal .edit-input::placeholder {
  color: oklch(0.4 0.04 145);
}


.edit-form.theme-terminal :deep(.split-editor) {
  border-color: oklch(0.3 0.03 160);
  background: oklch(0.14 0.01 250);
}

.edit-form.theme-terminal :deep(.pane-header) {
  background: oklch(0.18 0.01 250);
  border-bottom-color: oklch(0.3 0.03 160);
}

.edit-form.theme-terminal :deep(.pane-label) {
  color: oklch(0.6 0.1 160);
}

.edit-form.theme-terminal :deep(.source-textarea) {
  color: oklch(0.78 0.06 145);
  font-family: var(--font-mono);
}

/* 终端编辑模式 — 浅色适配 */
[data-theme='light'] .edit-form.theme-terminal {
  background: oklch(0.96 0.008 200);
  border-color: oklch(0.82 0.03 200);
}

[data-theme='light'] .edit-form.theme-terminal .edit-title {
  color: oklch(0.3 0.12 160);
  background: oklch(0.94 0.006 200);
  border-color: oklch(0.82 0.03 200);
}

[data-theme='light'] .edit-form.theme-terminal .edit-title:focus {
  border-color: oklch(0.45 0.12 160);
  box-shadow: 0 0 0 3px oklch(0.5 0.1 160 / 0.15);
}

[data-theme='light'] .edit-form.theme-terminal .edit-title::placeholder {
  color: oklch(0.6 0.03 200);
}

[data-theme='light'] .edit-form.theme-terminal .edit-meta-row {
  background: oklch(0.94 0.006 200);
  border-color: oklch(0.82 0.03 200);
}

[data-theme='light'] .edit-form.theme-terminal .edit-input {
  background: oklch(0.97 0.004 200);
  border-color: oklch(0.84 0.02 200);
  color: oklch(0.3 0.04 200);
}

[data-theme='light'] .edit-form.theme-terminal .edit-input::placeholder {
  color: oklch(0.6 0.03 200);
}

[data-theme='light'] .edit-form.theme-terminal :deep(.split-editor) {
  border-color: oklch(0.82 0.03 200);
  background: oklch(0.94 0.006 200);
}

[data-theme='light'] .edit-form.theme-terminal :deep(.pane-header) {
  background: oklch(0.92 0.008 200);
  border-bottom-color: oklch(0.82 0.03 200);
}

[data-theme='light'] .edit-form.theme-terminal :deep(.pane-label) {
  color: oklch(0.4 0.08 160);
}

[data-theme='light'] .edit-form.theme-terminal :deep(.source-textarea) {
  color: oklch(0.3 0.04 200);
}

/* ── Parchment 羊皮纸 ── */
.edit-form.theme-parchment {
  background: oklch(0.95 0.02 80);
  border: 1px solid oklch(0.8 0.04 80);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}

.edit-form.theme-parchment .edit-title {
  background: oklch(0.93 0.015 75);
  border-color: oklch(0.82 0.035 70);
  color: oklch(0.28 0.03 50);
  font-family: 'Georgia', 'Noto Serif SC', serif;
}

.edit-form.theme-parchment .edit-title:focus {
  border-color: oklch(0.6 0.08 50);
  box-shadow: 0 0 0 3px oklch(0.7 0.06 60 / 0.2);
}

.edit-form.theme-parchment .edit-title::placeholder {
  color: oklch(0.6 0.03 65);
}

.edit-form.theme-parchment .edit-meta-row {
  background: oklch(0.93 0.015 75);
  border-color: oklch(0.82 0.035 70);
}

.edit-form.theme-parchment .edit-input {
  background: oklch(0.96 0.01 80);
  border-color: oklch(0.84 0.03 70);
  color: oklch(0.3 0.03 50);
}


.edit-form.theme-parchment :deep(.split-editor) {
  border-color: oklch(0.82 0.035 70);
  background: oklch(0.93 0.015 75);
}

.edit-form.theme-parchment :deep(.pane-header) {
  background: oklch(0.9 0.025 75);
  border-bottom-color: oklch(0.82 0.035 70);
}

.edit-form.theme-parchment :deep(.source-textarea) {
  color: oklch(0.28 0.03 50);
}

/* ── Parchment 暗色模式 ── */
[data-theme='dark'] .edit-form.theme-parchment {
  background: oklch(0.22 0.02 55);
  border-color: oklch(0.35 0.03 50);
}

[data-theme='dark'] .edit-form.theme-parchment .edit-title {
  background: oklch(0.2 0.015 55);
  border-color: oklch(0.32 0.025 50);
  color: oklch(0.82 0.04 60);
}

[data-theme='dark'] .edit-form.theme-parchment .edit-title:focus {
  border-color: oklch(0.5 0.06 50);
}

[data-theme='dark'] .edit-form.theme-parchment .edit-meta-row {
  background: oklch(0.2 0.015 55);
  border-color: oklch(0.32 0.025 50);
}

[data-theme='dark'] .edit-form.theme-parchment .edit-input {
  background: oklch(0.18 0.01 55);
  border-color: oklch(0.3 0.02 50);
  color: oklch(0.78 0.03 60);
}


[data-theme='dark'] .edit-form.theme-parchment :deep(.split-editor) {
  border-color: oklch(0.32 0.025 50);
  background: oklch(0.2 0.015 55);
}

[data-theme='dark'] .edit-form.theme-parchment :deep(.pane-header) {
  background: oklch(0.24 0.018 55);
  border-bottom-color: oklch(0.32 0.025 50);
}

[data-theme='dark'] .edit-form.theme-parchment :deep(.source-textarea) {
  color: oklch(0.78 0.03 60);
}

/* Parchment 编辑模式分屏预览内容适配 */
.edit-form.theme-parchment :deep(.md-rendered table) { border-collapse: collapse; }

.edit-form.theme-parchment :deep(.md-rendered th) {
  background: oklch(0.88 0.035 70); color: oklch(0.3 0.04 50); border-color: oklch(0.78 0.04 65);
}
.edit-form.theme-parchment :deep(.md-rendered td) {
  border-color: oklch(0.82 0.035 70); color: oklch(0.28 0.03 50); background: transparent;
}
.edit-form.theme-parchment :deep(.md-rendered tr:nth-child(even)) { background: oklch(0.91 0.025 75); }
.edit-form.theme-parchment :deep(.md-rendered pre) { background: oklch(0.96 0.015 75); border-color: oklch(0.82 0.035 70); }
.edit-form.theme-parchment :deep(.md-rendered pre code) { color: oklch(0.3 0.02 50); }
.edit-form.theme-parchment :deep(.md-rendered .hljs) { background: oklch(0.96 0.015 75) !important; }
.edit-form.theme-parchment :deep(.hljs-keyword),
.edit-form.theme-parchment :deep(.hljs-selector-tag),
.edit-form.theme-parchment :deep(.hljs-built_in),
.edit-form.theme-parchment :deep(.hljs-type) { color: oklch(0.45 0.18 310); }
.edit-form.theme-parchment :deep(.hljs-string),
.edit-form.theme-parchment :deep(.hljs-attr) { color: oklch(0.42 0.14 25); }
.edit-form.theme-parchment :deep(.hljs-number),
.edit-form.theme-parchment :deep(.hljs-literal) { color: oklch(0.48 0.15 55); }
.edit-form.theme-parchment :deep(.hljs-comment) { color: oklch(0.55 0.02 60); font-style: italic; }
.edit-form.theme-parchment :deep(.hljs-function),
.edit-form.theme-parchment :deep(.hljs-title) { color: oklch(0.4 0.14 200); }
.edit-form.theme-parchment :deep(.md-rendered code) { background: oklch(0.9 0.025 70); color: oklch(0.38 0.1 30); }
.edit-form.theme-parchment :deep(.md-rendered hr) { border-top-color: oklch(0.78 0.04 65); }

[data-theme='dark'] .edit-form.theme-parchment :deep(.md-rendered th) { background: oklch(0.28 0.025 55); color: oklch(0.78 0.04 60); border-color: oklch(0.35 0.03 50); }
[data-theme='dark'] .edit-form.theme-parchment :deep(.md-rendered td) { border-color: oklch(0.32 0.025 55); color: oklch(0.75 0.02 60); background: transparent; }
[data-theme='dark'] .edit-form.theme-parchment :deep(.md-rendered tr:nth-child(even)) { background: oklch(0.24 0.018 55); }
[data-theme='dark'] .edit-form.theme-parchment :deep(.md-rendered pre) { background: oklch(0.19 0.015 55); border-color: oklch(0.32 0.025 50); }
[data-theme='dark'] .edit-form.theme-parchment :deep(.md-rendered .hljs) { background: oklch(0.19 0.015 55) !important; }
[data-theme='dark'] .edit-form.theme-parchment :deep(.md-rendered code) { background: oklch(0.25 0.02 55); color: oklch(0.72 0.08 40); }

/* WYSIWYG 羊皮纸覆盖已移至 MilkdownEditor.vue 的全局样式 */

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

/* =========================================
   阅读模式 — 视觉方案：源码 (Source)
   原始 Markdown 文本，等宽字体，无渲染
   ========================================= */
.theme-source {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.theme-source .note-hero {
  padding: var(--space-6) var(--space-8);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-accent);
}

.theme-source .note-title {
  font-size: clamp(1.3rem, 3vw, 1.8rem);
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
}

.theme-source .note-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
}

.theme-source .meta-category {
  font-size: 0.75rem;
  font-weight: 600;
  font-family: var(--font-mono);
  color: var(--color-accent);
  padding: 2px var(--space-2);
  background: var(--color-accent-muted);
  border-radius: var(--radius-sm);
}

.theme-source .meta-date {
  font-size: 0.8rem;
  font-family: var(--font-mono);
  color: var(--color-text-tertiary);
}

.theme-source .note-tags {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.theme-source .tag {
  font-size: 0.72rem;
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
  padding: var(--space-1) var(--space-2);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.theme-source .note-body {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--space-6) var(--space-8);
  border: 1px solid var(--color-border);
  position: relative;
}

/* 源码原文展示块 */
.source-raw {
  margin: 0;
  padding: 0;
  background: transparent;
  border: none;
  white-space: pre-wrap;
  word-wrap: break-word;
  tab-size: 4;
  font-family: var(--font-mono);
  font-size: 0.88rem;
  line-height: 1.75;
  color: var(--color-text-primary);
  user-select: text;
  -webkit-user-select: text;
}

.source-raw code {
  font-family: inherit;
  font-size: inherit;
  background: transparent;
  color: inherit;
  padding: 0;
  border: none;
}
</style>


<!-- 编辑器主题适配（非 scoped，穿透 MilkdownEditor 组件） -->
<style>
/* ── Aurora 编辑器 ── */
.edit-form.theme-aurora .milkdown-wrapper {
  background: var(--color-bg-primary);
  border-color: rgba(99, 102, 241, 0.15);
}

.edit-form.theme-aurora .milkdown-wrapper:focus-within {
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* ── Ink 编辑器 ── */
.edit-form.theme-ink .milkdown-wrapper {
  border-radius: 0;
  border-left: 2px solid var(--color-accent-muted);
  border-top: none;
  border-right: none;
  border-bottom: none;
  background: transparent;
}

.edit-form.theme-ink .milkdown .ProseMirror {
  line-height: 1.9 !important;
}

.edit-form.theme-ink .milkdown-wrapper:focus-within {
  border-color: var(--color-accent);
  box-shadow: none;
}

/* ── Terminal 编辑器 ── */
.edit-form.theme-terminal .milkdown-wrapper {
  background: oklch(0.14 0.005 160);
  border-color: oklch(0.25 0.04 145);
}

.edit-form.theme-terminal .milkdown-wrapper:focus-within {
  border-color: oklch(0.5 0.15 145);
  box-shadow: 0 0 0 3px oklch(0.3 0.08 145 / 0.3);
}

.edit-form.theme-terminal .milkdown .ProseMirror {
  font-family: var(--font-mono) !important;
  font-size: 0.88rem !important;
  line-height: 1.7 !important;
  color: oklch(0.78 0.06 145) !important;
}

.edit-form.theme-terminal .milkdown .ProseMirror h1,
.edit-form.theme-terminal .milkdown .ProseMirror h2,
.edit-form.theme-terminal .milkdown .ProseMirror h3 {
  color: oklch(0.85 0.18 145) !important;
  border-bottom: 1px dashed oklch(0.3 0.04 145);
  padding-bottom: var(--space-1);
}

.edit-form.theme-terminal .milkdown .ProseMirror code {
  color: oklch(0.8 0.14 80) !important;
  background: oklch(0.18 0.005 160) !important;
}

.edit-form.theme-terminal .milkdown .ProseMirror pre {
  background: oklch(0.12 0.005 160) !important;
  border-color: oklch(0.25 0.04 145) !important;
}

.edit-form.theme-terminal .milkdown .ProseMirror a {
  color: oklch(0.7 0.15 200) !important;
}

.edit-form.theme-terminal .milkdown .ProseMirror blockquote {
  border-left-color: oklch(0.5 0.15 145) !important;
  color: oklch(0.65 0.06 145) !important;
}

.edit-form.theme-terminal .milkdown .ProseMirror p.is-editor-empty:first-child::before {
  color: oklch(0.4 0.04 145) !important;
}

/* Terminal WYSIWYG — 浅色模式 */
[data-theme='light'] .edit-form.theme-terminal .milkdown-wrapper {
  background: oklch(0.96 0.008 200);
  border-color: oklch(0.82 0.03 200);
}

[data-theme='light'] .edit-form.theme-terminal .milkdown-wrapper:focus-within {
  border-color: oklch(0.45 0.12 160);
  box-shadow: 0 0 0 3px oklch(0.5 0.1 160 / 0.15);
}

[data-theme='light'] .edit-form.theme-terminal .milkdown .ProseMirror {
  color: oklch(0.3 0.04 200) !important;
  background: transparent !important;
}

[data-theme='light'] .edit-form.theme-terminal .milkdown .ProseMirror h1,
[data-theme='light'] .edit-form.theme-terminal .milkdown .ProseMirror h2,
[data-theme='light'] .edit-form.theme-terminal .milkdown .ProseMirror h3,
[data-theme='light'] .edit-form.theme-terminal .milkdown .ProseMirror h4,
[data-theme='light'] .edit-form.theme-terminal .milkdown .ProseMirror h5,
[data-theme='light'] .edit-form.theme-terminal .milkdown .ProseMirror h6 {
  color: oklch(0.3 0.12 160) !important;
  border-bottom-color: oklch(0.82 0.03 160);
}

[data-theme='light'] .edit-form.theme-terminal .milkdown .ProseMirror code {
  color: oklch(0.4 0.12 80) !important;
  background: oklch(0.92 0.01 200) !important;
}

[data-theme='light'] .edit-form.theme-terminal .milkdown .ProseMirror pre {
  background: oklch(0.93 0.006 200) !important;
  border-color: oklch(0.82 0.03 200) !important;
}

[data-theme='light'] .edit-form.theme-terminal .milkdown .ProseMirror pre code {
  background: transparent !important;
  color: oklch(0.3 0.04 200) !important;
}

[data-theme='light'] .edit-form.theme-terminal .milkdown .ProseMirror a {
  color: oklch(0.4 0.12 200) !important;
}

[data-theme='light'] .edit-form.theme-terminal .milkdown .ProseMirror blockquote {
  border-left-color: oklch(0.45 0.12 160) !important;
  color: oklch(0.4 0.05 200) !important;
  background: oklch(0.93 0.006 200) !important;
}

[data-theme='light'] .edit-form.theme-terminal .milkdown .ProseMirror strong {
  color: oklch(0.25 0.06 200) !important;
}

[data-theme='light'] .edit-form.theme-terminal .milkdown .ProseMirror hr {
  border-color: oklch(0.82 0.03 200) !important;
}

/* ProseMirror 表格浅色适配 */
[data-theme='light'] .edit-form.theme-terminal .milkdown .ProseMirror table {
  border-collapse: collapse !important;
}

[data-theme='light'] .edit-form.theme-terminal .milkdown .ProseMirror th {
  background: oklch(0.92 0.01 200) !important;
  color: oklch(0.3 0.1 160) !important;
  border-color: oklch(0.82 0.03 200) !important;
}

[data-theme='light'] .edit-form.theme-terminal .milkdown .ProseMirror td {
  background: transparent !important;
  color: oklch(0.3 0.04 200) !important;
  border-color: oklch(0.85 0.02 200) !important;
}

[data-theme='light'] .edit-form.theme-terminal .milkdown .ProseMirror tr:nth-child(even) td {
  background: oklch(0.94 0.006 200) !important;
}

/* ProseMirror 列表标记颜色 */
[data-theme='light'] .edit-form.theme-terminal .milkdown .ProseMirror li::marker {
  color: oklch(0.45 0.1 160) !important;
}

[data-theme='light'] .edit-form.theme-terminal .milkdown .ProseMirror p.is-editor-empty:first-child::before {
  color: oklch(0.6 0.03 200) !important;
}

/* ── Parchment 编辑器 ── */
.edit-form.theme-parchment .milkdown-wrapper {
  background: oklch(0.95 0.02 80);
  border-color: oklch(0.82 0.04 75);
}

.edit-form.theme-parchment .milkdown-wrapper:focus-within {
  border-color: oklch(0.6 0.08 50);
  box-shadow: 0 0 0 3px oklch(0.7 0.06 60 / 0.2);
}

.edit-form.theme-parchment .milkdown .ProseMirror {
  font-family: 'Georgia', 'Noto Serif SC', serif !important;
  line-height: 2 !important;
  color: oklch(0.28 0.03 50) !important;
}

.edit-form.theme-parchment .milkdown .ProseMirror h1,
.edit-form.theme-parchment .milkdown .ProseMirror h2,
.edit-form.theme-parchment .milkdown .ProseMirror h3 {
  color: oklch(0.3 0.06 40) !important;
  font-family: 'Georgia', 'Noto Serif SC', serif !important;
}

.edit-form.theme-parchment .milkdown .ProseMirror blockquote {
  border-left-color: oklch(0.6 0.08 50) !important;
  background: oklch(0.9 0.03 75) !important;
  color: oklch(0.35 0.04 50) !important;
}

.edit-form.theme-parchment .milkdown .ProseMirror a {
  color: oklch(0.4 0.12 30) !important;
}

.edit-form.theme-parchment .milkdown .ProseMirror p.is-editor-empty:first-child::before {
  color: oklch(0.6 0.04 60) !important;
}

/* Parchment 暗色模式 */
[data-theme='dark'] .edit-form.theme-parchment .milkdown-wrapper {
  background: oklch(0.22 0.02 60);
  border-color: oklch(0.32 0.03 55);
}

[data-theme='dark'] .edit-form.theme-parchment .milkdown .ProseMirror {
  color: oklch(0.78 0.02 60) !important;
}

[data-theme='dark'] .edit-form.theme-parchment .milkdown .ProseMirror h1,
[data-theme='dark'] .edit-form.theme-parchment .milkdown .ProseMirror h2,
[data-theme='dark'] .edit-form.theme-parchment .milkdown .ProseMirror h3 {
  color: oklch(0.82 0.05 50) !important;
}

[data-theme='dark'] .edit-form.theme-parchment .milkdown .ProseMirror blockquote {
  border-left-color: oklch(0.45 0.06 50) !important;
  background: oklch(0.25 0.02 55) !important;
  color: oklch(0.7 0.03 55) !important;
}
</style>
