<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useNotesStore } from '../stores/notes'
import { useRouter } from 'vue-router'
import type { FolderNode } from '../types'

const props = defineProps<{
  selectedId: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

const notesStore = useNotesStore()
const router = useRouter()

/* ─── 搜索 ─── */
const searchQuery = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null
const debouncedSearch = ref('')

watch(searchQuery, (val) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { debouncedSearch.value = val }, 200)
})

/* ─── 标签页：分类 / 全部 / 收藏 ─── */
type PanelTab = 'category' | 'all' | 'favorites'
const activeTab = ref<PanelTab>('category')

/* ─── 分类筛选 ─── */
const selectedCategory = ref<string>('all')

/* ─── 分类树展开状态 ─── */
const expandedFolders = ref<Set<string>>(new Set())

function toggleFolder(path: string) {
  if (expandedFolders.value.has(path)) {
    expandedFolders.value.delete(path)
  } else {
    expandedFolders.value.add(path)
  }
}

/* ─── 过滤后的笔记列表 ─── */
const filteredNotes = computed(() => {
  let result = notesStore.activeNotes

  // 标签页筛选
  if (activeTab.value === 'favorites') {
    result = result.filter(n => n.isFavorite)
  } else if (activeTab.value === 'category' && selectedCategory.value !== 'all') {
    result = result.filter(n =>
      n.category === selectedCategory.value ||
      n.category.startsWith(selectedCategory.value + '/')
    )
  }

  // 搜索筛选
  if (debouncedSearch.value.trim()) {
    const q = debouncedSearch.value.toLowerCase()
    result = result.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some(t => t.toLowerCase().includes(q))
    )
  }

  // 排序：置顶 > 时间倒序
  return [...result].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
})

function formatTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function selectCategory(path: string) {
  selectedCategory.value = path
  activeTab.value = 'category'
}

function handleNoteClick(id: string) {
  emit('select', id)
}

function handleNewNote() {
  const category = selectedCategory.value !== 'all' ? selectedCategory.value : ''
  const query = category ? `?category=${encodeURIComponent(category)}` : ''
  router.push(`/write${query}`)
}
</script>

<template>
  <div class="note-list-panel">
    <!-- 搜索框 -->
    <div class="panel-search">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        class="panel-search-input"
        placeholder="筛选笔记…"
      >
      <button
        class="panel-new-btn"
        data-tooltip="新建笔记"
        data-tooltip-pos="bottom"
        @click="handleNewNote"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>

    <!-- 标签页 -->
    <div class="panel-tabs">
      <button
        class="panel-tab"
        :class="{ active: activeTab === 'category' }"
        @click="activeTab = 'category'"
      >分类</button>
      <button
        class="panel-tab"
        :class="{ active: activeTab === 'all' }"
        @click="activeTab = 'all'"
      >全部</button>
      <button
        class="panel-tab"
        :class="{ active: activeTab === 'favorites' }"
        @click="activeTab = 'favorites'"
      >
        收藏
        <span v-if="notesStore.favoriteCount > 0" class="tab-count">{{ notesStore.favoriteCount }}</span>
      </button>
    </div>

    <!-- 分类树（仅 category 标签显示） -->
    <div v-if="activeTab === 'category'" class="category-tree">
      <button
        class="tree-item"
        :class="{ active: selectedCategory === 'all' }"
        @click="selectCategory('all')"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <span class="tree-label">全部笔记</span>
        <span class="tree-count">{{ notesStore.totalCount }}</span>
      </button>

      <!-- 递归分类树 -->
      <template v-for="node in notesStore.categoryTree" :key="node.fullPath">
        <div class="tree-branch">
          <button
            class="tree-item"
            :class="{ active: selectedCategory === node.fullPath }"
            @click="selectCategory(node.fullPath)"
          >
            <button
              v-if="node.children.length > 0"
              class="tree-toggle"
              @click.stop="toggleFolder(node.fullPath)"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" :class="{ rotated: expandedFolders.has(node.fullPath) }">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.4;">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span class="tree-label">{{ node.name }}</span>
            <span class="tree-count">{{ node.totalCount }}</span>
          </button>

          <!-- 子分类（递归展开） -->
          <div v-if="node.children.length > 0 && expandedFolders.has(node.fullPath)" class="tree-children">
            <button
              v-for="child in node.children"
              :key="child.fullPath"
              class="tree-item child"
              :class="{ active: selectedCategory === child.fullPath }"
              @click="selectCategory(child.fullPath)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.4;">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span class="tree-label">{{ child.name }}</span>
              <span class="tree-count">{{ child.totalCount }}</span>
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- 分隔线 -->
    <div class="panel-divider" />

    <!-- 笔记列表 -->
    <div class="note-entries">
      <div
        v-for="note in filteredNotes"
        :key="note.id"
        class="note-entry"
        :class="{ selected: note.id === selectedId, pinned: note.isPinned }"
        role="button"
        tabindex="0"
        @click="handleNoteClick(note.id)"
        @keydown.enter="handleNoteClick(note.id)"
      >
        <div class="entry-top">
          <div class="entry-badges">
            <svg v-if="note.isPinned" class="badge-pin" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            <svg v-if="note.isFavorite" class="badge-fav" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
          </div>
          <span class="entry-title">{{ note.title || '未命名笔记' }}</span>
        </div>
        <div class="entry-bottom">
          <span class="entry-cat">{{ note.category }}</span>
          <span class="entry-time">{{ formatTime(note.updatedAt) }}</span>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredNotes.length === 0" class="entries-empty">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
        </svg>
        <span>暂无笔记</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.note-list-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ─── 搜索框 ─── */
.panel-search {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-divider);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.panel-search-input {
  flex: 1;
  border: none;
  background: none;
  padding: 0;
  font-size: 0.85rem;
  min-width: 0;
}

.panel-search-input:focus {
  box-shadow: none;
  border-color: transparent;
}

.panel-new-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-sm);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .panel-new-btn:hover {
    background: var(--color-bg-hover);
    color: var(--color-accent);
  }
}

.panel-new-btn:active {
  transform: scale(0.9);
}

/* ─── 标签页 ─── */
.panel-tabs {
  display: flex;
  gap: 2px;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-divider);
  flex-shrink: 0;
}

.panel-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

.panel-tab.active {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

@media (hover: hover) {
  .panel-tab:not(.active):hover {
    background: var(--color-bg-hover);
    color: var(--color-text-secondary);
  }
}

.tab-count {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0 4px;
  background: var(--color-accent-muted);
  color: var(--color-accent);
  border-radius: var(--radius-full);
  line-height: 1.5;
}

/* ─── 分类树 ─── */
.category-tree {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: var(--space-2) var(--space-2);
  flex-shrink: 0;
  max-height: 220px;
  overflow-y: auto;
}

.tree-branch {
  display: flex;
  flex-direction: column;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-align: left;
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

.tree-item.active {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

@media (hover: hover) {
  .tree-item:not(.active):hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
}

.tree-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  color: var(--color-text-tertiary);
  transition: transform var(--duration-fast) var(--ease-out);
}

.tree-toggle svg.rotated {
  transform: rotate(90deg);
}

.tree-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-count {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
  opacity: 0.8;
}

.tree-children {
  padding-left: var(--space-5);
}

.tree-item.child {
  font-size: 0.78rem;
}

/* ─── 分隔线 ─── */
.panel-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-divider) 20%, var(--color-divider) 80%, transparent);
  margin: 0 var(--space-3);
  flex-shrink: 0;
}

/* ─── 笔记条目列表 ─── */
.note-entries {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.note-entry {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-out);
}

.note-entry.selected {
  background: var(--color-accent-muted);
}

@media (hover: hover) {
  .note-entry:not(.selected):hover {
    background: var(--color-bg-hover);
  }
}

.note-entry:active {
  transform: scale(0.99);
}

.entry-top {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.entry-badges {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.badge-pin {
  color: var(--color-accent);
}

.badge-fav {
  color: var(--color-warning, #e6a817);
}

.entry-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.note-entry.selected .entry-title {
  color: var(--color-accent);
}

.entry-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.entry-cat {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entry-time {
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  flex-shrink: 0;
}

/* ─── 空状态 ─── */
.entries-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-8) var(--space-4);
  color: var(--color-text-tertiary);
  font-size: 0.8rem;
}
</style>
