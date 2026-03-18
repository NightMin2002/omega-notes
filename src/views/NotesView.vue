<script setup lang="ts">
import { useNotesStore } from '../stores/notes'
import { useRouter } from 'vue-router'
import { truncateText } from '../utils/markdown'

const notesStore = useNotesStore()
const router = useRouter()

function selectCategory(cat: string) {
  notesStore.currentCategory = cat
}

function openNote(id: string) {
  router.push(`/note/${id}`)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}
</script>

<template>
  <div class="notes-page">
    <div class="notes-header">
      <h2 class="page-title">知识库</h2>
      <div class="search-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="notesStore.searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索笔记…"
        >
      </div>
    </div>

    <!-- 分类药丸 -->
    <div class="category-bar">
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
    </div>

    <!-- 笔记网格 -->
    <div v-if="notesStore.filteredNotes.length > 0" class="notes-grid">
      <button
        v-for="note in notesStore.filteredNotes"
        :key="note.id"
        class="note-card"
        :class="{ pinned: note.isPinned }"
        @click="openNote(note.id)"
      >
        <div v-if="note.isPinned" class="pin-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <h3 class="note-card-title">{{ note.title || '未命名笔记' }}</h3>
        <p class="note-card-content">{{ truncateText(note.content) }}</p>
        <div class="note-card-footer">
          <span class="note-card-category">{{ note.category }}</span>
          <span class="note-card-date">{{ formatDate(note.updatedAt) }}</span>
        </div>
      </button>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <p>还没有笔记</p>
      <RouterLink to="/write" class="empty-action">创建第一篇</RouterLink>
    </div>
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

/* ─── 分类药丸 ─── */
.category-bar {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-6);
  overflow-x: auto;
  padding-bottom: var(--space-2);
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

/* ─── 笔记网格 ─── */
.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}

.note-card {
  position: relative;
  text-align: left;
  padding: var(--space-4);
  background: var(--color-surface);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-lg);
  transition: transform var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
  cursor: pointer;
}

@media (hover: hover) {
  .note-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
    border-color: var(--color-border-strong);
  }
}

.note-card.pinned {
  border-color: var(--color-accent-muted);
}

.pin-badge {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  color: var(--color-accent);
}

.note-card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.note-card-content {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: var(--space-3);
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
