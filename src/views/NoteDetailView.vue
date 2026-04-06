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
import NoteOutline from '../components/NoteOutline.vue'
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
const detailContentRef = ref<HTMLElement | null>(null)

// 支持的阅读模式方案
const readingTheme = ref(localStorage.getItem('omega-reading-theme') || 'aurora')
const readingThemeChannel = new BroadcastChannel('omega-reading-theme-channel')
watch(readingTheme, (newVal) => {
  localStorage.setItem('omega-reading-theme', newVal)
  readingThemeChannel.postMessage({ theme: newVal })
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
              <button class="mode-btn" :class="{ active: readingTheme === 'aurora' }" @click="readingTheme = 'aurora'" data-tooltip="精读" data-tooltip-pos="bottom">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2v2" /><path d="M12 20v2" /><path d="M4.93 4.93l1.41 1.41" /><path d="M17.66 17.66l1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="M6.34 17.66l-1.41 1.41" /><path d="M19.07 4.93l-1.41 1.41" />
                </svg>
              </button>
              <button class="mode-btn" :class="{ active: readingTheme === 'ink' }" @click="readingTheme = 'ink'" data-tooltip="笔墨" data-tooltip-pos="bottom">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" />
                </svg>
              </button>
              <button class="mode-btn" :class="{ active: readingTheme === 'terminal' }" @click="readingTheme = 'terminal'" data-tooltip="终端" data-tooltip-pos="bottom">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
                </svg>
              </button>
              <button class="mode-btn" :class="{ active: readingTheme === 'parchment' }" @click="readingTheme = 'parchment'" data-tooltip="羊皮纸" data-tooltip-pos="bottom">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </button>
              <button class="mode-btn" :class="{ active: readingTheme === 'source' }" @click="readingTheme = 'source'" data-tooltip="源码" data-tooltip-pos="bottom">
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
                data-tooltip-pos="bottom"
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
                data-tooltip-pos="bottom"
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
                data-tooltip-pos="bottom"
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
                data-tooltip-pos="bottom"
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
                data-tooltip-pos="bottom"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                </svg>
                <span>源码</span>
              </button>
            </div>
          </template>

          <button class="toolbar-btn btn-favorite" :class="{ 'is-active': note.isFavorite }" @click="toggleFavorite">
            <svg width="16" height="16" viewBox="0 0 24 24" :fill="note.isFavorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>{{ note.isFavorite ? '取消收藏' : '收藏' }}</span>
          </button>
          <button class="toolbar-btn btn-pin" :class="{ 'is-active': note.isPinned }" @click="togglePin">
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
          <button v-if="!isEditing" class="toolbar-btn" @click="popoutNote" data-tooltip="在独立窗口打开" data-tooltip-pos="bottom">
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
              data-tooltip-pos="bottom"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
            <span class="zoom-value" data-tooltip="双击重置缩放" data-tooltip-pos="bottom" @dblclick="settingsStore.setContentZoom(100)">{{ settingsStore.contentZoom }}%</span>
            <button
              type="button"
              class="zoom-inline-btn"
              :disabled="settingsStore.contentZoom >= 150"
              @click="settingsStore.setContentZoom(settingsStore.contentZoom + 5)"
              data-tooltip="放大"
              data-tooltip-pos="bottom"
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
      <div ref="detailContentRef" class="detail-content" :class="{ 'split-active': isEditing && editorMode === 'split' }">
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
          <div class="reading-layout">
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

            <!-- 右侧目录大纲 -->
            <NoteOutline
              :content="note.content"
              :scroll-container="detailContentRef"
            />
          </div>
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

/* 内容区域内的表单居中约束 */
.detail-content > form {
  max-width: 960px;
  margin: 0 auto;
}

/* 阅读模式 Grid 三栏居中布局 */
.reading-layout {
  display: grid;
  grid-template-columns: 1fr minmax(0, 780px) 1fr;
  gap: 0 var(--space-6);
  width: 100%;
}

.reading-layout > .note-article {
  grid-column: 2;
  min-width: 0;
}

.reading-layout > :deep(.note-outline) {
  grid-column: 3;
  justify-self: start;
}

/* 分屏模式下不限制宽度 */
.detail-content.split-active > .edit-form {
  max-width: none;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
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
  white-space: nowrap;
  flex-shrink: 0;
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

.toolbar-btn.is-active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: var(--color-accent-muted);
}

.btn-favorite.is-active {
  color: var(--color-warning);
  border-color: var(--color-warning);
  background: var(--color-warning-muted);
}

.btn-pin.is-active {
  color: var(--color-success);
  border-color: var(--color-success);
  background: var(--color-success-muted);
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
    color: #fff;
    border-color: var(--color-accent);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px var(--color-accent-muted);
  }
  .btn-favorite.is-active:hover {
    color: var(--color-warning);
    border-color: var(--color-warning);
    background: color-mix(in srgb, var(--color-warning-muted), var(--color-warning) 10%);
  }
  .btn-pin.is-active:hover {
    color: var(--color-success);
    border-color: var(--color-success);
    background: color-mix(in srgb, var(--color-success-muted), var(--color-success) 10%);
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
  white-space: nowrap;
  flex-shrink: 0;
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

@media (max-width: 640px) {
  .edit-meta-row { grid-template-columns: 1fr; }

  .copy-content-btn {
    opacity: 1;
  }
}

</style>

