<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MarkdownRenderer from '../../components/MarkdownRenderer.vue'
import { useNotesStore } from '../../stores/notes'
import type { Note } from '../../types'

const route = useRoute()
const router = useRouter()
const notesStore = useNotesStore()

const showDeleteConfirm = ref(false)
const copyState = ref<'idle' | 'done'>('idle')

const note = computed(() => {
  const id = route.params.id as string
  return notesStore.getNoteById(id)
})

const parentNote = computed(() => {
  if (!note.value?.parentId) return null
  return notesStore.getNoteById(note.value.parentId) || null
})

const childNotes = computed(() => {
  if (!note.value || note.value.parentId) return []
  return notesStore.getChildNotes(note.value.id)
})

watch(() => route.params.id, (id) => {
  if (typeof id === 'string') notesStore.recordOpen(id)
}, { immediate: true })

watch(() => route.query.edit, (edit) => {
  if (edit === '1' && note.value) {
    router.replace(`/m/write/${note.value.id}`)
  }
}, { immediate: true })

function backToList() {
  router.push('/m/notes')
}

function openNote(target: Note) {
  notesStore.recordOpen(target.id)
  router.push(`/m/note/${target.id}`)
}

function editNote() {
  if (!note.value) return
  router.push(`/m/write/${note.value.id}`)
}

async function toggleFavorite() {
  if (!note.value) return
  await notesStore.toggleFavorite(note.value.id)
}

async function togglePin() {
  if (!note.value) return
  await notesStore.togglePin(note.value.id)
}

async function updateContent(content: string) {
  if (!note.value) return
  await notesStore.updateNote(note.value.id, { content })
}

async function copyContent() {
  if (!note.value) return
  try {
    await navigator.clipboard.writeText(note.value.content)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = note.value.content
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
  copyState.value = 'done'
  window.setTimeout(() => {
    copyState.value = 'idle'
  }, 1400)
}

async function confirmDelete() {
  if (!note.value) return
  const id = note.value.id
  showDeleteConfirm.value = false
  await notesStore.deleteNote(id)
  router.replace('/m/notes')
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <section class="mobile-note-page">
    <header class="mobile-note-header">
      <button type="button" class="header-icon-btn" @click="backToList" aria-label="返回笔记列表">
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
      </button>

      <div class="header-title-block">
        <span>笔记</span>
        <strong>{{ note?.title || '未命名笔记' }}</strong>
      </div>

      <div class="header-actions">
        <button
          type="button"
          class="header-icon-btn"
          :class="{ active: note?.isFavorite }"
          :disabled="!note"
          @click="toggleFavorite"
          aria-label="收藏"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" :fill="note?.isFavorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
        <button type="button" class="header-icon-btn primary" :disabled="!note" @click="editNote" aria-label="编辑">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
          </svg>
        </button>
      </div>
    </header>

    <main class="mobile-note-scroll">
      <article v-if="note" class="mobile-note-article">
        <button v-if="parentNote" type="button" class="parent-link" @click="openNote(parentNote)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          返回父笔记：{{ parentNote.title || '未命名笔记' }}
        </button>

        <div class="note-hero">
          <h1>{{ note.title || '未命名笔记' }}</h1>
          <div class="note-meta">
            <span>{{ note.category || '未分类' }}</span>
            <span>更新于 {{ formatDate(note.updatedAt) }}</span>
          </div>
          <div v-if="note.tags.length" class="note-tags">
            <span v-for="tag in note.tags" :key="tag">{{ tag }}</span>
          </div>
        </div>

        <div v-if="childNotes.length" class="child-note-block">
          <div class="block-title">子笔记</div>
          <button
            v-for="child in childNotes"
            :key="child.id"
            type="button"
            class="child-note-row"
            @click="openNote(child)"
          >
            <span>{{ child.title || '未命名笔记' }}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>

        <div class="mobile-note-body">
          <MarkdownRenderer
            :content="note.content"
            :editable-content="note.content"
            note-path-prefix="/m/note"
            @update:editable-content="updateContent"
          />
        </div>

        <div class="mobile-note-actions">
          <button type="button" :class="{ active: note.isPinned }" @click="togglePin">
            <svg width="18" height="18" viewBox="0 0 24 24" :fill="note.isPinned ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2 15 8l6 1-4.5 4.4 1.1 6.2L12 16.7l-5.6 2.9 1.1-6.2L3 9l6-1z" />
            </svg>
            <span>{{ note.isPinned ? '已置顶' : '置顶' }}</span>
          </button>
          <button type="button" :class="{ active: copyState === 'done' }" @click="copyContent">
            <svg v-if="copyState === 'idle'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span>{{ copyState === 'done' ? '已复制' : '复制' }}</span>
          </button>
          <button type="button" class="danger" @click="showDeleteConfirm = true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
            <span>删除</span>
          </button>
        </div>
      </article>

      <div v-else class="mobile-note-empty">
        <span class="empty-icon">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
          </svg>
        </span>
        <p>笔记不存在或已被删除</p>
        <button type="button" @click="backToList">返回列表</button>
      </div>
    </main>

    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="mobile-confirm-mask" @click.self="showDeleteConfirm = false">
        <div class="mobile-confirm-sheet">
          <h2>删除笔记</h2>
          <p>这条笔记会进入回收站，可以之后恢复。</p>
          <div class="confirm-actions">
            <button type="button" @click="showDeleteConfirm = false">取消</button>
            <button type="button" class="danger" @click="confirmDelete">删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.mobile-note-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-bg-primary);
}

.mobile-note-header {
  height: calc(56px + env(safe-area-inset-top, 0px));
  padding: env(safe-area-inset-top, 0px) 12px 0;
  flex-shrink: 0;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--color-divider);
  background: var(--color-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: var(--z-sticky);
}

.header-icon-btn {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.header-icon-btn:disabled {
  opacity: 0.45;
}

.header-icon-btn.active {
  color: var(--color-warning);
  border-color: var(--color-warning);
  background: var(--color-warning-muted);
}

.header-icon-btn.primary {
  color: var(--color-text-inverse);
  border-color: var(--color-accent);
  background: var(--color-accent);
}

.header-title-block {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-title-block span {
  color: var(--color-text-tertiary);
  font-size: 0.68rem;
  font-weight: 700;
}

.header-title-block strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-primary);
  font-size: 0.94rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mobile-note-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.mobile-note-article {
  padding: 18px 16px 42px;
}

.parent-link {
  width: 100%;
  min-height: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  margin-bottom: 14px;
  border-radius: 8px;
  color: var(--color-accent-text);
  background: var(--color-accent-muted);
  font-size: 0.82rem;
  font-weight: 700;
  text-align: left;
}

.note-hero {
  padding-bottom: 18px;
  border-bottom: 1px solid var(--color-divider);
}

.note-hero h1 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 1.58rem;
  line-height: 1.24;
  letter-spacing: 0;
}

.note-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  color: var(--color-text-tertiary);
  font-size: 0.76rem;
}

.note-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.note-tags span {
  max-width: 100%;
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  border-radius: 8px;
  color: var(--color-accent-text);
  background: var(--color-accent-muted);
  font-size: 0.72rem;
  font-weight: 700;
}

.child-note-block {
  margin-top: 16px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.block-title {
  margin-bottom: 8px;
  color: var(--color-text-tertiary);
  font-size: 0.72rem;
  font-weight: 800;
}

.child-note-row {
  width: 100%;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--color-text-primary);
  font-size: 0.86rem;
  text-align: left;
}

.child-note-row + .child-note-row {
  border-top: 1px solid var(--color-divider);
}

.child-note-row span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-note-body {
  padding-top: 18px;
}

.mobile-note-body :deep(.md-rendered) {
  --md-font-size: 0.98rem;
  --md-line-height: 1.78;
}

.mobile-note-body :deep(.md-rendered h1) {
  font-size: 1.36rem;
}

.mobile-note-body :deep(.md-rendered h2) {
  font-size: 1.18rem;
}

.mobile-note-body :deep(.md-rendered pre) {
  margin-left: -2px;
  margin-right: -2px;
  padding: 12px;
  font-size: 0.82rem;
}

.mobile-note-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 22px;
}

.mobile-note-actions button {
  min-width: 0;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  font-size: 0.82rem;
  font-weight: 700;
}

.mobile-note-actions button.active {
  color: var(--color-accent-text);
  border-color: var(--color-accent);
  background: var(--color-accent-muted);
}

.mobile-note-actions button.danger {
  color: var(--color-danger);
  border-color: color-mix(in srgb, var(--color-danger), transparent 45%);
  background: var(--color-danger-muted);
}

.mobile-note-empty {
  min-height: 70%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  color: var(--color-text-tertiary);
  text-align: center;
}

.empty-icon {
  width: 58px;
  height: 58px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--color-accent-text);
  background: var(--color-accent-muted);
}

.mobile-note-empty p {
  margin: 0;
}

.mobile-note-empty button {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 8px;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  font-weight: 700;
}

.mobile-confirm-mask {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.55);
}

.mobile-confirm-sheet {
  width: min(420px, 100%);
  padding: 18px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  box-shadow: var(--shadow-lg);
}

.mobile-confirm-sheet h2 {
  margin: 0;
  font-size: 1.05rem;
}

.mobile-confirm-sheet p {
  margin: 8px 0 16px;
  color: var(--color-text-secondary);
  font-size: 0.88rem;
  line-height: 1.55;
}

.confirm-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.confirm-actions button {
  height: 42px;
  border-radius: 8px;
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  font-weight: 800;
}

.confirm-actions button.danger {
  color: var(--color-text-inverse);
  background: var(--color-danger);
}
</style>
