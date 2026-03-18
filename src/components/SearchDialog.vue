<script setup lang="ts">
/**
 * SearchDialog — Ctrl+K 全局搜索
 * 全文搜索笔记标题 + 内容，快速跳转
 */
import { ref, computed, watch, nextTick } from 'vue'
import { useNotesStore } from '../stores/notes'
import { useRouter } from 'vue-router'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const notesStore = useNotesStore()
const router = useRouter()
const query = ref('')
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

watch(() => props.open, async (val) => {
  if (val) {
    query.value = ''
    selectedIndex.value = 0
    await nextTick()
    inputRef.value?.focus()
  }
})

const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return notesStore.notes.slice(0, 8)

  return notesStore.notes
    .filter(n =>
      n.title.toLowerCase().includes(q)
      || n.content.toLowerCase().includes(q)
      || n.category.toLowerCase().includes(q)
      || n.tags.some(t => t.toLowerCase().includes(q))
    )
    .slice(0, 12)
})

watch(results, () => {
  selectedIndex.value = 0
})

function highlightMatch(text: string, maxLen = 80): string {
  const q = query.value.trim()
  if (!q) return text.slice(0, maxLen)

  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return text.slice(0, maxLen)

  const start = Math.max(0, idx - 20)
  const end = Math.min(text.length, idx + q.length + 40)
  let slice = text.slice(start, end)
  if (start > 0) slice = '…' + slice
  if (end < text.length) slice += '…'

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return slice.replace(
    new RegExp(`(${escaped})`, 'gi'),
    '<mark>$1</mark>'
  )
}

function go(noteId: string) {
  router.push(`/note/${noteId}`)
  emit('close')
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
    return
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, results.value.length - 1)
    return
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
    return
  }
  if (e.key === 'Enter' && results.value.length > 0) {
    e.preventDefault()
    go(results.value[selectedIndex.value]!.id)
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}
</script>

<template>
  <dialog
    :open="open"
    class="search-backdrop"
    @click.self="emit('close')"
    @keydown="handleKeydown"
  >
    <div class="search-dialog">
      <!-- 搜索输入 -->
      <div class="search-input-wrapper">
        <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref="inputRef"
          v-model="query"
          class="search-input"
          type="text"
          placeholder="搜索笔记标题、内容、标签…"
          autocomplete="off"
        >
        <kbd class="search-kbd">ESC</kbd>
      </div>

      <!-- 结果列表 -->
      <div class="search-results" v-if="results.length > 0">
        <button
          v-for="(note, i) in results"
          :key="note.id"
          class="search-item"
          :class="{ selected: i === selectedIndex }"
          @click="go(note.id)"
          @mouseenter="selectedIndex = i"
        >
          <div class="search-item-main">
            <span class="search-item-title" v-html="highlightMatch(note.title || '未命名笔记', 60)" />
            <span
              v-if="query.trim()"
              class="search-item-snippet"
              v-html="highlightMatch(note.content, 100)"
            />
          </div>
          <div class="search-item-meta">
            <span class="search-item-category">{{ note.category }}</span>
            <span class="search-item-date">{{ formatDate(note.updatedAt) }}</span>
          </div>
        </button>
      </div>

      <div v-else class="search-empty">
        <p>没有找到匹配的笔记</p>
      </div>

      <!-- 底部提示 -->
      <div class="search-footer">
        <span class="search-footer-hint">
          <kbd>↑↓</kbd> 导航
          <kbd>Enter</kbd> 打开
          <kbd>ESC</kbd> 关闭
        </span>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.search-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  border: none;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
}

.search-backdrop:not([open]) {
  display: none;
}

.search-dialog {
  width: 600px;
  max-width: 90vw;
  max-height: 70vh;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: dialog-in 0.15s var(--ease-out);
}

@keyframes dialog-in {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
  }
}

/* ─── 输入框 ─── */
.search-input-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.search-icon {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  font-size: 1rem;
  color: var(--color-text-primary);
  background: transparent;
  border: none;
  outline: none;
}

.search-kbd {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
  background: var(--color-bg-tertiary);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

/* ─── 结果列表 ─── */
.search-results {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2) 0;
}

.search-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3) var(--space-4);
  text-align: left;
  color: var(--color-text-primary);
  transition: background-color var(--duration-fast) var(--ease-out);
}

.search-item.selected {
  background: var(--color-bg-hover);
}

.search-item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.search-item-title {
  font-weight: 600;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-item-snippet {
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-item-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.search-item-category {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--color-accent);
  background: var(--color-accent-muted);
  padding: 1px 6px;
  border-radius: var(--radius-full);
}

.search-item-date {
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
}

/* ─── 高亮 ─── */
.search-item :deep(mark) {
  background: var(--color-accent-muted);
  color: var(--color-accent);
  border-radius: 2px;
  padding: 0 1px;
}

/* ─── 空状态 ─── */
.search-empty {
  padding: var(--space-8) var(--space-4);
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 0.9rem;
}

/* ─── 底部 ─── */
.search-footer {
  padding: var(--space-2) var(--space-4);
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.search-footer-hint {
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
  display: flex;
  gap: var(--space-3);
}

.search-footer-hint kbd {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  background: var(--color-bg-tertiary);
  padding: 1px 4px;
  border-radius: 3px;
  border: 1px solid var(--color-border);
  margin-right: 2px;
}
</style>
