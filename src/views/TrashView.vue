<script setup lang="ts">
import { ref } from 'vue'
import { useNotesStore } from '../stores/notes'
import { stripMarkdown, truncateText } from '../utils/markdown'

const notesStore = useNotesStore()
const confirmEmptyDialog = ref<HTMLDialogElement | null>(null)

function formatDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 计算距离删除的天数 */
function daysAgo(iso: string): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / 86400000)
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  return `${days} 天前`
}

async function handleRestore(id: string) {
  await notesStore.restoreNote(id)
}

async function handlePermanentDelete(id: string) {
  await notesStore.permanentlyDelete(id)
}

function showEmptyConfirm() {
  confirmEmptyDialog.value?.showModal()
}

async function confirmEmpty() {
  await notesStore.emptyTrash()
  confirmEmptyDialog.value?.close()
}
</script>

<template>
  <div class="trash-page">
    <div class="page-header">
      <h2 class="page-title">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        回收站
        <span v-if="notesStore.trashCount > 0" class="trash-count">{{ notesStore.trashCount }}</span>
      </h2>
      <button
        v-if="notesStore.trashCount > 0"
        class="empty-btn"
        @click="showEmptyConfirm"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
        清空回收站
      </button>
    </div>

    <!-- 空状态 -->
    <div v-if="notesStore.trashCount === 0" class="empty-state">
      <svg class="empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
      <p class="empty-title">回收站为空</p>
      <p class="empty-desc">删除的笔记会暂存在这里，你可以随时恢复</p>
    </div>

    <!-- 笔记列表 -->
    <div v-else class="trash-list">
      <TransitionGroup name="trash-item">
        <div
          v-for="note in notesStore.trashNotes"
          :key="note.id"
          class="trash-card"
        >
          <div class="card-body">
            <div class="card-header">
              <h3 class="card-title">{{ note.title || '无标题' }}</h3>
              <span class="card-time" :data-tooltip="formatDate(note.deletedAt || '')">
                {{ daysAgo(note.deletedAt || '') }}
              </span>
            </div>
            <p class="card-preview">{{ truncateText(note.content, 120) }}</p>
            <div class="card-meta">
              <span class="card-category">{{ note.category }}</span>
              <span v-for="tag in note.tags.slice(0, 3)" :key="tag" class="card-tag">
                {{ tag }}
              </span>
            </div>
          </div>
          <div class="card-actions">
            <button class="action-restore" @click="handleRestore(note.id)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              恢复
            </button>
            <button class="action-delete" @click="handlePermanentDelete(note.id)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              永久删除
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- 清空确认对话框 -->
    <dialog ref="confirmEmptyDialog" class="confirm-dialog">
      <div class="dialog-content">
        <svg class="dialog-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h3 class="dialog-title">确认清空回收站</h3>
        <p class="dialog-desc">
          将永久删除 <strong>{{ notesStore.trashCount }}</strong> 条笔记，此操作不可撤销。
        </p>
        <div class="dialog-actions">
          <button class="dialog-cancel" @click="confirmEmptyDialog?.close()">取消</button>
          <button class="dialog-confirm" @click="confirmEmpty">确认清空</button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.trash-page {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
}

.page-title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.trash-count {
  font-size: 0.8rem;
  font-weight: 600;
  background: var(--color-text-tertiary);
  color: var(--color-text-inverse);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  min-width: 22px;
  text-align: center;
}

.empty-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--color-danger);
  background: var(--color-danger-muted);
  transition: background-color var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .empty-btn:hover {
    background: var(--color-danger);
    color: var(--color-text-inverse);
  }
}

.empty-btn:active {
  transform: scale(0.98);
}

/* ─── 空状态 ─── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-16) var(--space-6);
  text-align: center;
}

.empty-icon {
  color: var(--color-text-tertiary);
  opacity: 0.4;
  margin-bottom: var(--space-6);
}

.empty-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}

.empty-desc {
  font-size: 0.85rem;
  color: var(--color-text-tertiary);
}

/* ─── 笔记列表 ─── */
.trash-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.trash-card {
  display: flex;
  align-items: stretch;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: border-color var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .trash-card:hover {
    border-color: var(--color-border-strong);
    box-shadow: var(--shadow-sm);
  }
}

.card-body {
  flex: 1;
  padding: var(--space-4);
  min-width: 0;
}

.card-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.card-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-time {
  flex-shrink: 0;
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
}

.card-preview {
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: var(--space-2);
}

.card-meta {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.card-category {
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--color-accent-text);
  background: var(--color-accent-muted);
  padding: 1px var(--space-2);
  border-radius: var(--radius-full);
}

.card-tag {
  font-size: 0.68rem;
  color: var(--color-text-tertiary);
  background: var(--color-bg-tertiary);
  padding: 1px var(--space-2);
  border-radius: var(--radius-full);
}

/* ─── 操作按钮 ─── */
.card-actions {
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--color-border);
  flex-shrink: 0;
}

.action-restore,
.action-delete {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-4);
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

.action-restore {
  color: var(--color-success);
}

.action-delete {
  color: var(--color-danger);
  border-top: 1px solid var(--color-border);
}

@media (hover: hover) {
  .action-restore:hover {
    background: var(--color-success-muted);
  }
  .action-delete:hover {
    background: var(--color-danger-muted);
  }
}

.action-restore:active,
.action-delete:active {
  transform: scale(0.98);
}

/* ─── 确认对话框 ─── */
.confirm-dialog {
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-xl);
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
  padding: 0;
  max-width: 400px;
  width: 90vw;
  box-shadow: var(--shadow-lg);
}

.confirm-dialog::backdrop {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-8);
  text-align: center;
}

.dialog-icon {
  color: var(--color-warning);
  margin-bottom: var(--space-4);
}

.dialog-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: var(--space-2);
}

.dialog-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-6);
  line-height: 1.5;
}

.dialog-actions {
  display: flex;
  gap: var(--space-3);
  width: 100%;
}

.dialog-cancel,
.dialog-confirm {
  flex: 1;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-weight: 500;
  font-size: 0.88rem;
  transition: background-color var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
}

.dialog-cancel {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.dialog-confirm {
  background: var(--color-danger);
  color: var(--color-text-inverse);
}

@media (hover: hover) {
  .dialog-cancel:hover { background: var(--color-bg-hover); }
  .dialog-confirm:hover { filter: brightness(1.1); }
}

.dialog-cancel:active,
.dialog-confirm:active {
  transform: scale(0.98);
}

/* ─── 列表动画 ─── */
.trash-item-enter-active,
.trash-item-leave-active {
  transition: opacity var(--duration-normal) var(--ease-out),
              transform var(--duration-normal) var(--ease-out);
}

.trash-item-enter-from {
  opacity: 0;
  transform: translateX(-12px);
}

.trash-item-leave-to {
  opacity: 0;
  transform: translateX(12px);
}

@media (max-width: 640px) {
  .trash-card {
    flex-direction: column;
  }
  .card-actions {
    flex-direction: row;
    border-left: none;
    border-top: 1px solid var(--color-border);
  }
  .action-delete {
    border-top: none;
    border-left: 1px solid var(--color-border);
  }
}
</style>
