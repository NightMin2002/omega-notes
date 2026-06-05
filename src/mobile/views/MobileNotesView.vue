<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotesStore } from '../../stores/notes'
import { truncateText } from '../../utils/markdown'
import type { Note } from '../../types'

type NoteFilter = 'all' | 'favorite' | 'recent'

const route = useRoute()
const router = useRouter()
const notesStore = useNotesStore()

const search = ref('')
const selectedCategory = ref('all')
const activeFilter = ref<NoteFilter>(parseFilter(route.query.view))

watch(() => route.query.view, (view) => {
  activeFilter.value = parseFilter(view)
})

const filterTabs: { id: NoteFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'favorite', label: '收藏' },
  { id: 'recent', label: '最近' },
]

const sourceNotes = computed(() => {
  if (activeFilter.value === 'favorite') return notesStore.favoriteNotes
  if (activeFilter.value === 'recent') return notesStore.recentNotes.filter(note => !note.parentId && !note.isDeleted)
  return notesStore.activeNotes
})

const categoryCounts = computed(() => {
  const map = new Map<string, number>()
  for (const note of sourceNotes.value) {
    const category = note.category || '未分类'
    map.set(category, (map.get(category) || 0) + 1)
  }
  return map
})

const visibleNotes = computed(() => {
  const q = search.value.trim().toLowerCase()
  let result = sourceNotes.value

  if (selectedCategory.value !== 'all') {
    result = result.filter(note =>
      note.category === selectedCategory.value ||
      note.category.startsWith(`${selectedCategory.value}/`)
    )
  }

  if (q) {
    result = result.filter(note =>
      note.title.toLowerCase().includes(q) ||
      note.content.toLowerCase().includes(q) ||
      note.tags.some(tag => tag.toLowerCase().includes(q))
    )
  }

  return [...result].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
})

function parseFilter(value: unknown): NoteFilter {
  return value === 'favorite' || value === 'recent' ? value : 'all'
}

function setFilter(filter: NoteFilter) {
  activeFilter.value = filter
  selectedCategory.value = 'all'
  router.replace({
    path: route.path,
    query: filter === 'all' ? {} : { view: filter },
  })
}

function openNote(note: Note) {
  notesStore.recordOpen(note.id)
  router.push(`/m/note/${note.id}`)
}

function createNote() {
  router.push('/m/write')
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  })
}

function getPreview(note: Note) {
  return truncateText(note.content, 86) || '没有正文内容'
}
</script>

<template>
  <section class="mobile-notes-page">
    <div class="mobile-notes-tools">
      <label class="mobile-search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input v-model="search" type="search" placeholder="搜索标题、正文、标签">
      </label>

      <div class="mobile-stat-strip">
        <div class="mobile-stat-item">
          <span>{{ notesStore.totalCount }}</span>
          <small>笔记</small>
        </div>
        <div class="mobile-stat-item">
          <span>{{ notesStore.favoriteCount }}</span>
          <small>收藏</small>
        </div>
        <div class="mobile-stat-item">
          <span>{{ notesStore.categories.length }}</span>
          <small>分类</small>
        </div>
      </div>

      <div class="mobile-segmented">
        <button
          v-for="tab in filterTabs"
          :key="tab.id"
          type="button"
          :class="{ active: activeFilter === tab.id }"
          @click="setFilter(tab.id)"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="mobile-category-rail">
        <button
          type="button"
          class="category-chip"
          :class="{ active: selectedCategory === 'all' }"
          @click="selectedCategory = 'all'"
        >
          全部分类
        </button>
        <button
          v-for="category in notesStore.categories"
          :key="category"
          type="button"
          class="category-chip"
          :class="{ active: selectedCategory === category }"
          @click="selectedCategory = category"
        >
          <span>{{ category }}</span>
          <small>{{ categoryCounts.get(category) || 0 }}</small>
        </button>
      </div>
    </div>

    <div class="mobile-notes-list">
      <div v-if="notesStore.isLoading" class="mobile-empty">
        <span class="mobile-empty-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3v4" />
            <path d="M12 17v4" />
            <path d="M4.93 4.93l2.83 2.83" />
            <path d="M16.24 16.24l2.83 2.83" />
            <path d="M3 12h4" />
            <path d="M17 12h4" />
            <path d="M4.93 19.07l2.83-2.83" />
            <path d="M16.24 7.76l2.83-2.83" />
          </svg>
        </span>
        <p>正在加载笔记</p>
      </div>

      <div v-else-if="visibleNotes.length === 0" class="mobile-empty">
        <span class="mobile-empty-icon">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M8 13h8" />
            <path d="M8 17h5" />
          </svg>
        </span>
        <p>没有匹配的笔记</p>
        <button type="button" @click="createNote">新建一条</button>
      </div>

      <template v-else>
        <button
          v-for="note in visibleNotes"
          :key="note.id"
          type="button"
          class="mobile-note-row"
          @click="openNote(note)"
        >
          <div class="note-row-main">
            <div class="note-row-title-line">
              <span v-if="note.isPinned" class="note-pin" aria-label="置顶">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2 15 8l6 1-4.5 4.4 1.1 6.2L12 16.7l-5.6 2.9 1.1-6.2L3 9l6-1z" />
                </svg>
              </span>
              <strong>{{ note.title || '未命名笔记' }}</strong>
            </div>
            <p>{{ getPreview(note) }}</p>
            <div class="note-row-meta">
              <span>{{ note.category || '未分类' }}</span>
              <span>{{ formatDate(note.updatedAt) }}</span>
            </div>
          </div>
          <div class="note-row-side">
            <svg v-if="note.isFavorite" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>
        </button>
      </template>
    </div>

    <button class="mobile-fab" type="button" @click="createNote" aria-label="新建笔记">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    </button>
  </section>
</template>

<style scoped>
.mobile-notes-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.mobile-notes-tools {
  flex-shrink: 0;
  padding: 14px 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-bottom: 1px solid var(--color-divider);
  background: color-mix(in srgb, var(--color-bg-primary), transparent 8%);
}

.mobile-search {
  height: 44px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 13px;
  border-radius: 8px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  color: var(--color-text-tertiary);
}

.mobile-search input {
  min-width: 0;
  flex: 1;
  height: 100%;
  color: var(--color-text-primary);
  font-size: 0.95rem;
}

.mobile-search input::placeholder {
  color: var(--color-text-tertiary);
}

.mobile-stat-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.mobile-stat-item {
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-secondary);
}

.mobile-stat-item span {
  display: block;
  font-size: 1rem;
  font-weight: 800;
  color: var(--color-text-primary);
}

.mobile-stat-item small {
  display: block;
  margin-top: 2px;
  font-size: 0.68rem;
  color: var(--color-text-tertiary);
}

.mobile-segmented {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  padding: 4px;
  border-radius: 8px;
  background: var(--color-bg-tertiary);
}

.mobile-segmented button {
  min-width: 0;
  height: 34px;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-text-tertiary);
}

.mobile-segmented button.active {
  color: var(--color-text-primary);
  background: var(--color-bg-secondary);
  box-shadow: var(--shadow-sm);
}

.mobile-category-rail {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 1px;
}

.mobile-category-rail::-webkit-scrollbar {
  display: none;
}

.category-chip {
  height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  max-width: 190px;
  padding: 0 11px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  font-size: 0.78rem;
  font-weight: 650;
}

.category-chip span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-chip small {
  color: var(--color-text-tertiary);
  font-size: 0.68rem;
}

.category-chip.active {
  color: var(--color-accent-text);
  border-color: var(--color-accent);
  background: var(--color-accent-muted);
}

.mobile-notes-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 14px 96px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mobile-note-row {
  width: 100%;
  min-height: 104px;
  display: flex;
  align-items: stretch;
  gap: 10px;
  padding: 14px;
  text-align: left;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.note-row-main {
  flex: 1;
  min-width: 0;
}

.note-row-title-line {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.note-row-title-line strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.98rem;
  line-height: 1.3;
}

.note-pin {
  color: var(--color-warning);
  flex-shrink: 0;
}

.mobile-note-row p {
  margin: 8px 0 10px;
  color: var(--color-text-secondary);
  font-size: 0.82rem;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.note-row-meta {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--color-text-tertiary);
  font-size: 0.72rem;
}

.note-row-meta span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-row-side {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  color: var(--color-text-tertiary);
}

.note-row-side svg:first-child {
  color: var(--color-warning);
}

.mobile-empty {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--color-text-tertiary);
  text-align: center;
}

.mobile-empty-icon {
  width: 54px;
  height: 54px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--color-accent-text);
  background: var(--color-accent-muted);
}

.mobile-empty p {
  margin: 0;
  font-size: 0.9rem;
}

.mobile-empty button {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 8px;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  font-weight: 700;
}

.mobile-fab {
  position: fixed;
  right: 18px;
  bottom: calc(82px + env(safe-area-inset-bottom, 0px));
  width: 54px;
  height: 54px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  box-shadow: 0 14px 32px color-mix(in srgb, var(--color-accent), transparent 64%);
  z-index: var(--z-sticky);
}
</style>
