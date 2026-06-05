<script setup lang="ts">
import { computed, ref } from 'vue'
import { useNotesStore } from '../../stores/notes'
import { truncateText } from '../../utils/markdown'
import type { Note } from '../../types'

type PendingAction =
  | { type: 'delete'; note: Note }
  | { type: 'empty' }

const notesStore = useNotesStore()
const pendingAction = ref<PendingAction | null>(null)

const trashNotes = computed(() => notesStore.trashNotes)

async function restore(note: Note) {
  await notesStore.restoreNote(note.id)
}

function askDelete(note: Note) {
  pendingAction.value = { type: 'delete', note }
}

function askEmpty() {
  pendingAction.value = { type: 'empty' }
}

async function confirmAction() {
  if (!pendingAction.value) return
  const action = pendingAction.value
  pendingAction.value = null

  if (action.type === 'delete') {
    await notesStore.permanentlyDelete(action.note.id)
  } else {
    await notesStore.emptyTrash()
  }
}

function formatDate(date?: string) {
  if (!date) return '未知时间'
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
</script>

<template>
  <section class="mobile-trash-page">
    <div class="trash-summary">
      <div>
        <span>{{ trashNotes.length }}</span>
        <p>已删除笔记</p>
      </div>
      <button type="button" :disabled="trashNotes.length === 0" @click="askEmpty">清空</button>
    </div>

    <div class="trash-list">
      <div v-if="trashNotes.length === 0" class="mobile-empty">
        <span class="empty-icon">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </span>
        <p>回收站为空</p>
      </div>

      <template v-else>
        <article v-for="note in trashNotes" :key="note.id" class="trash-row">
          <div class="trash-row-main">
            <h2>{{ note.title || '未命名笔记' }}</h2>
            <p>{{ truncateText(note.content, 88) || '没有正文内容' }}</p>
            <span>删除于 {{ formatDate(note.deletedAt) }}</span>
          </div>
          <div class="trash-actions">
            <button type="button" @click="restore(note)">恢复</button>
            <button type="button" class="danger" @click="askDelete(note)">删除</button>
          </div>
        </article>
      </template>
    </div>

    <Teleport to="body">
      <div v-if="pendingAction" class="mobile-confirm-mask" @click.self="pendingAction = null">
        <div class="mobile-confirm-sheet">
          <h2>{{ pendingAction.type === 'empty' ? '清空回收站' : '永久删除笔记' }}</h2>
          <p>
            {{
              pendingAction.type === 'empty'
                ? '回收站中的所有笔记都会被永久删除。'
                : '这条笔记会被永久删除，不能再恢复。'
            }}
          </p>
          <div class="confirm-actions">
            <button type="button" @click="pendingAction = null">取消</button>
            <button type="button" class="danger" @click="confirmAction">确认删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.mobile-trash-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.trash-summary {
  flex-shrink: 0;
  margin: 14px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.trash-summary span {
  display: block;
  color: var(--color-text-primary);
  font-size: 1.4rem;
  font-weight: 850;
  line-height: 1;
}

.trash-summary p {
  margin: 6px 0 0;
  color: var(--color-text-tertiary);
  font-size: 0.78rem;
}

.trash-summary button {
  height: 38px;
  padding: 0 14px;
  border-radius: 8px;
  color: var(--color-danger);
  border: 1px solid color-mix(in srgb, var(--color-danger), transparent 42%);
  background: var(--color-danger-muted);
  font-weight: 800;
}

.trash-summary button:disabled {
  opacity: 0.42;
}

.trash-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 14px 96px;
}

.trash-row {
  padding: 14px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.trash-row-main h2 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 0.98rem;
  line-height: 1.35;
}

.trash-row-main p {
  margin: 8px 0 10px;
  color: var(--color-text-secondary);
  font-size: 0.82rem;
  line-height: 1.45;
}

.trash-row-main span {
  color: var(--color-text-tertiary);
  font-size: 0.72rem;
}

.trash-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
}

.trash-actions button {
  height: 39px;
  border-radius: 8px;
  color: var(--color-text-primary);
  background: var(--color-bg-tertiary);
  font-weight: 800;
}

.trash-actions button.danger {
  color: var(--color-danger);
  background: var(--color-danger-muted);
}

.mobile-empty {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--color-text-tertiary);
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

.mobile-empty p {
  margin: 0;
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
  color: var(--color-text-primary);
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
