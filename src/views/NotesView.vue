<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useNotesStore } from '../stores/notes'
import { useRouter, useRoute } from 'vue-router'
import { previewHtml } from '../utils/markdown'
import { useDraggable } from 'vue-draggable-plus'
import ContextMenu from '../components/ContextMenu.vue'
import type { ContextMenuItem } from '../components/ContextMenu.vue'
import InputDialog from '../components/InputDialog.vue'
import CategoryDialog from '../components/CategoryDialog.vue'

const notesStore = useNotesStore()
const router = useRouter()
const route = useRoute()

/* ─── 搜索防抖 ─── */
const localSearch = ref(notesStore.searchQuery)
let searchTimer: ReturnType<typeof setTimeout> | null = null

watch(localSearch, (val) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    notesStore.searchQuery = val
  }, 200)
})

/** 当前特殊视图：favorites / recent / null（普通模式） */
const activeView = computed(() => {
  const v = route.query.view
  if (v === 'favorites' || v === 'recent') return v
  return null
})

const pageTitle = computed(() => {
  if (activeView.value === 'favorites') return '收藏夹'
  if (activeView.value === 'recent') return '最近打开'
  if (activeTag.value) return `标签：${activeTag.value}`
  return '知识库'
})

/** 面包屑（当分类路径为嵌套时显示） */
const breadcrumbs = computed(() => {
  if (notesStore.currentCategory === 'all') return []
  const parts = notesStore.currentCategory.split('/')
  return parts.map((name, i) => ({
    name,
    path: parts.slice(0, i + 1).join('/'),
  }))
})

function navigateCrumb(path: string) {
  notesStore.currentCategory = path
  router.replace({ query: { category: path } })
}

/** 当前筛选标签（来自 URL query.tag） */
const activeTag = computed(() => {
  const t = route.query.tag
  return typeof t === 'string' ? t : null
})

/* 根据 URL query 自动切换分类 */
watch(() => route.query.category, (cat) => {
  if (typeof cat === 'string' && cat) {
    notesStore.currentCategory = cat
  }
}, { immediate: true })

/** 当前展示的笔记列表 */
const displayedNotes = computed(() => {
  if (activeView.value === 'favorites') return notesStore.favoriteNotes
  if (activeView.value === 'recent') return notesStore.recentNotes
  let result = notesStore.filteredNotes
  if (activeTag.value) {
    result = result.filter(n => n.tags.includes(activeTag.value!))
  }
  return result
})

function selectTag(tag: string | null) {
  if (tag) {
    router.replace({ query: { tag } })
  } else {
    router.replace({ query: {} })
  }
}

function selectCategory(cat: string) {
  notesStore.currentCategory = cat
  /* 清除 URL 中的 query 参数 */
  if (route.query.category || route.query.view) {
    router.replace({ query: {} })
  }
}

function openNote(id: string) {
  notesStore.recordOpen(id)
  router.push(`/note/${id}`)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}

/* ─── 拖拽排序（useDraggable composable）─── */
const gridRef = ref<HTMLElement | null>(null)
const draggableNotes = ref<typeof displayedNotes.value>([])
watch(displayedNotes, (val) => { draggableNotes.value = [...val] }, { immediate: true })

/**
 * FLIP 动画：记录拖拽前所有卡片位置，拖拽结束后
 * 计算位移差值，用 CSS transform 动画平滑过渡。
 */
let flipMap = new Map<string, DOMRect>()

function capturePositions() {
  flipMap.clear()
  if (!gridRef.value) return
  const cards = gridRef.value.querySelectorAll<HTMLElement>('.note-card')
  cards.forEach(card => {
    const id = card.dataset.noteId
    if (id) flipMap.set(id, card.getBoundingClientRect())
  })
}

function playFlipAnimation() {
  if (!gridRef.value || flipMap.size === 0) return
  const cards = gridRef.value.querySelectorAll<HTMLElement>('.note-card')
  cards.forEach(card => {
    const id = card.dataset.noteId
    if (!id) return
    const first = flipMap.get(id)
    if (!first) return
    const last = card.getBoundingClientRect()
    const dx = first.left - last.left
    const dy = first.top - last.top
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
    /* Invert: 先让卡片视觉上停留在旧位置 */
    card.style.transform = `translate(${dx}px, ${dy}px)`
    card.style.transition = 'none'
  })
  /* Play: 下一帧移除 transform，触发 CSS transition 动画到新位置 */
  requestAnimationFrame(() => {
    cards.forEach(card => {
      card.style.transition = 'transform 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      card.style.transform = ''
    })
    /* 动画结束后清理内联样式 */
    const cleanup = () => {
      cards.forEach(card => {
        card.style.transition = ''
        card.style.transform = ''
      })
    }
    setTimeout(cleanup, 280)
  })
  flipMap.clear()
}

useDraggable(gridRef, draggableNotes, {
  animation: 0,
  forceFallback: true,
  fallbackOnBody: true,
  fallbackTolerance: 3,
  ghostClass: 'sortable-ghost',
  chosenClass: 'sortable-chosen',
  fallbackClass: 'sortable-fallback',
  swapThreshold: 0.65,
  invertSwap: true,
  delay: 80,
  delayOnTouchOnly: true,
  onStart() {
    gridRef.value?.classList.add('is-dragging')
  },
  onEnd() {
    /* 1. 在 DOM 真正更新前记录所有卡片的当前位置 */
    capturePositions()
    /* 2. 保存新顺序 → 触发 Vue 重渲染 */
    const ids = draggableNotes.value.map(n => n.id)
    notesStore.reorderNotes(ids)
    /* 3. DOM 更新后播放 FLIP 动画 */
    nextTick(() => {
      playFlipAnimation()
      gridRef.value?.classList.remove('is-dragging')
    })
  },
})

/* ─── 卡片右键菜单 ─── */
const showContextMenu = ref(false)
const contextMenuPos = ref({ x: 0, y: 0 })
const contextMenuTarget = ref<string | null>(null)

const contextMenuItems = computed<ContextMenuItem[]>(() => [
  { id: 'rename', label: '重命名' },
  { id: 'move', label: '移动到分类...' },
  { id: 'divider', label: '', divider: true },
  { id: 'delete', label: '删除', danger: true },
])

function handleCardContextMenu(e: MouseEvent, noteId: string) {
  contextMenuTarget.value = noteId
  contextMenuPos.value = { x: e.clientX, y: e.clientY }
  showContextMenu.value = true
}

const showRenameDialog = ref(false)
const renameTargetId = ref('')
const renameInitialValue = ref('')

const showMoveDialog = ref(false)
const moveTargetId = ref('')
const moveInitialCategory = ref('')

async function handleContextMenuSelect(id: string) {
  const noteId = contextMenuTarget.value
  if (!noteId) return
  const note = notesStore.getNoteById(noteId)
  if (!note) return

  if (id === 'rename') {
    renameTargetId.value = noteId
    renameInitialValue.value = note.title
    showRenameDialog.value = true
  } else if (id === 'move') {
    moveTargetId.value = noteId
    moveInitialCategory.value = note.category
    showMoveDialog.value = true
  } else if (id === 'delete') {
    await notesStore.deleteNote(noteId)
  }
}

function handleRenameConfirm(newTitle: string) {
  showRenameDialog.value = false
  if (renameTargetId.value) {
    notesStore.updateNote(renameTargetId.value, { title: newTitle || '未命名笔记' })
  }
}

function handleMoveConfirm(newCategory: string) {
  showMoveDialog.value = false
  if (moveTargetId.value && newCategory) {
    notesStore.moveNoteToCategory(moveTargetId.value, newCategory)
  }
}
</script>

<template>
  <div class="notes-page">
    <div class="notes-header">
      <h2 class="page-title">{{ pageTitle }}</h2>
      <div class="search-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="localSearch"
          type="text"
          class="search-input"
          placeholder="搜索笔记…"
        >
      </div>
    </div>

    <!-- 面包屑（嵌套分类时显示） -->
    <nav v-if="breadcrumbs.length > 1 && !activeView" class="breadcrumbs">
      <button class="crumb" @click="selectCategory('all')">全部</button>
      <template v-for="(crumb, i) in breadcrumbs" :key="crumb.path">
        <span class="crumb-sep">/</span>
        <button
          class="crumb"
          :class="{ current: i === breadcrumbs.length - 1 }"
          @click="navigateCrumb(crumb.path)"
        >
          {{ crumb.name }}
        </button>
      </template>
    </nav>

    <!-- 分类药丸（收藏夹/最近视图时隐藏） -->
    <div v-if="!activeView" class="category-bar">
      <button
        class="category-pill"
        :class="{ active: notesStore.currentCategory === 'all' }"
        @click="selectCategory('all')"
      >
        全部
      </button>
      <button
        v-for="cat in notesStore.categories"
        :key="cat"
        class="category-pill"
        :class="{ active: notesStore.currentCategory === cat }"
        @click="selectCategory(cat)"
      >
        {{ cat }}
      </button>

      <!-- 在当前分类下新建笔记 -->
      <RouterLink
        v-if="notesStore.currentCategory !== 'all'"
        :to="`/write?category=${encodeURIComponent(notesStore.currentCategory)}`"
        class="category-pill cat-add-btn"
        title="在此分类新建笔记"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        新建
      </RouterLink>
    </div>

    <!-- 标签云（普通模式 + 有标签时显示） -->
    <div v-if="!activeView && notesStore.allTags.length > 0" class="tag-cloud">
      <button
        class="tag-pill"
        :class="{ active: !activeTag }"
        @click="selectTag(null)"
      >
        全部标签
      </button>
      <button
        v-for="t in notesStore.allTags"
        :key="t.name"
        class="tag-pill"
        :class="{ active: activeTag === t.name }"
        @click="selectTag(t.name)"
      >
        {{ t.name }}
        <span class="tag-count">{{ t.count }}</span>
      </button>
    </div>

    <!-- 笔记网格 -->
    <div
      v-show="displayedNotes.length > 0"
      ref="gridRef"
      class="notes-grid"
    >
      <div
        v-for="note in draggableNotes"
        :key="note.id"
        class="note-card"
        :class="{ pinned: note.isPinned }"
        :data-note-id="note.id"
        role="button"
        tabindex="0"
        @click="openNote(note.id)"
        @keydown.enter="openNote(note.id)"
        @contextmenu.prevent="handleCardContextMenu($event, note.id)"
      >
        <div class="card-badges">
          <svg v-if="note.isFavorite" class="fav-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <svg v-if="note.isPinned" class="pin-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <h3 class="note-card-title">{{ note.title || '未命名笔记' }}</h3>
        <div class="note-card-content" v-html="previewHtml(note.content)" />
        <div class="note-card-footer">
          <span class="note-card-category">{{ note.category }}</span>
          <span class="note-card-date">{{ formatDate(note.updatedAt) }}</span>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-show="displayedNotes.length === 0" class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <p>还没有笔记</p>
      <RouterLink to="/write" class="empty-action">创建第一篇</RouterLink>
    </div>

    <!-- UI 组件 -->
    <ContextMenu
      v-model:show="showContextMenu"
      :position="contextMenuPos"
      :items="contextMenuItems"
      @select="handleContextMenuSelect"
    />

    <InputDialog
      :open="showRenameDialog"
      title="重命名笔记"
      placeholder="留空默认为「未命名笔记」"
      :initialValue="renameInitialValue"
      :allowEmpty="true"
      @confirm="handleRenameConfirm"
      @cancel="showRenameDialog = false"
    />

    <CategoryDialog
      :open="showMoveDialog"
      title="移动到分类"
      :initialCategory="moveInitialCategory"
      @confirm="handleMoveConfirm"
      @cancel="showMoveDialog = false"
    />
  </div>
</template>

<style scoped>
.notes-page {
  max-width: 1000px;
  margin: 0 auto;
}

.notes-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.search-box {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  padding: var(--space-2) var(--space-3);
  min-width: 200px;
  color: var(--color-text-tertiary);
  transition: border-color var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
}

.search-box:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-muted);
}

.search-input {
  border: none;
  background: none;
  padding: 0;
  flex: 1;
  font-size: 0.9rem;
}

.search-input:focus {
  box-shadow: none;
  border-color: transparent;
}

/* ─── 面包屑 ─── */
.breadcrumbs {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 0.8rem;
  margin-bottom: var(--space-3);
  color: var(--color-text-tertiary);
}

.crumb {
  color: var(--color-text-tertiary);
  padding: var(--space-1) var(--space-1);
  border-radius: var(--radius-sm);
  transition: color var(--duration-fast) var(--ease-out),
              background-color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .crumb:hover {
    color: var(--color-text-primary);
    background: var(--color-bg-hover);
  }
}

.crumb.current {
  color: var(--color-accent);
  font-weight: 600;
}

.crumb-sep {
  opacity: 0.4;
}

/* ─── 分类药丸 ─── */
.category-bar {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  overflow-x: auto;
  padding-bottom: var(--space-2);
}

/* ─── 标签云 ─── */
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-6);
}

.tag-pill {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .tag-pill:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
}

.tag-pill.active {
  background: var(--color-info-muted, rgba(99, 179, 237, 0.15));
  color: var(--color-info, #63b3ed);
  border-color: var(--color-info, #63b3ed);
}

.tag-count {
  font-size: 0.65rem;
  font-weight: 600;
  opacity: 0.6;
}

.category-pill {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .category-pill:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
}

.category-pill.active {
  background: var(--color-accent-muted);
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.cat-add-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--color-accent);
  border-color: var(--color-accent);
  border-style: dashed;
  font-weight: 500;
}

@media (hover: hover) {
  .cat-add-btn:hover {
    background: var(--color-accent-muted);
  }
}

/* ─── 笔记网格（Flexbox — SortableJS 与 CSS Grid 不兼容，flex-wrap 是正解） ─── */
.notes-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.note-card {
  /* flex item 模拟 grid auto-fill minmax(280px, 1fr) */
  flex: 1 1 280px;
  max-width: calc(50% - var(--space-4) / 2);
  min-width: 280px;
  position: relative;
  text-align: left;
  padding: var(--space-4);
  background: var(--color-surface);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-lg);
  /* hover 过渡（translate/box-shadow 不干扰 FLIP 的 transform） */
  transition: translate var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
  cursor: grab;
  user-select: none;
  touch-action: none;
  will-change: transform;
}

@media (hover: hover) {
  .note-card:not(.sortable-chosen):hover {
    translate: 0 -3px;
    box-shadow: var(--shadow-md);
    border-color: var(--color-border-strong);
  }
}

.note-card.pinned {
  border-color: var(--color-accent-muted);
}

/* --- SortableJS 拖拽状态 --- */

/* ghost = 原位置占位符 */
.sortable-ghost {
  opacity: 0;
  pointer-events: none;
}

/* chosen = 被选中的原始元素 */
.sortable-chosen {
  cursor: grabbing;
}

/*
 * 拖拽进行中：禁用 hover 过渡效果，
 * 避免与 SortableJS 的 DOM 操作产生冲突。
 * FLIP 动画使用内联 style.transition，不受此规则影响。
 */
.is-dragging .note-card {
  translate: none !important;
}

@media (max-width: 640px) {
  .note-card {
    max-width: 100%;
  }
}

.card-badges {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  display: flex;
  gap: var(--space-1);
}

.fav-icon {
  color: var(--color-warning, #e6a817);
}

.pin-icon {
  color: var(--color-accent);
}

.note-card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.note-card-content {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  /* 3 行 × 1.5 行高 × 0.85rem ≈ 3.825rem，取整为 4em */
  max-height: 4em;
  overflow: hidden;
  margin-bottom: var(--space-3);
  word-break: break-word;
}

/* 预览内粗体 */
.note-card-content :deep(strong) {
  font-weight: 600;
  color: var(--color-text-primary);
}

/* 预览内斜体 */
.note-card-content :deep(em) {
  font-style: italic;
  opacity: 0.85;
}

.note-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.note-card-category {
  font-size: 0.75rem;
  color: var(--color-accent-text);
  padding: var(--space-1) var(--space-2);
  background: var(--color-accent-muted);
  border-radius: var(--radius-full);
}

.note-card-date {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

/* ─── 空状态 ─── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-16) 0;
  color: var(--color-text-tertiary);
}

.empty-action {
  padding: var(--space-2) var(--space-6);
  background: var(--color-accent);
  color: var(--color-text-inverse);
  border-radius: var(--radius-full);
  font-weight: 500;
  transition: opacity var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .empty-action:hover {
    opacity: 0.9;
    transform: translateY(-1px);
    color: var(--color-text-inverse);
  }
}
</style>
