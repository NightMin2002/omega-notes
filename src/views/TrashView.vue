<script setup lang="ts">
/**
 * TrashView — 回收站（主从双栏布局）
 * 左侧：已删除笔记列表
 * 右侧：选中笔记的完整内容预览
 */
import { ref, computed } from 'vue'
import { useNotesStore } from '../stores/notes'
import { previewHtml } from '../utils/markdown'
import MarkdownRenderer from '../components/MarkdownRenderer.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const notesStore = useNotesStore()
const showEmptyConfirm = ref(false)
const showDeleteConfirm = ref(false)
const deleteTargetId = ref('')
const deleteTargetTitle = ref('')

/* ─── 选中的笔记 ─── */
const selectedNoteId = ref<string | null>(null)

const selectedNote = computed(() => {
  if (!selectedNoteId.value) return null
  return notesStore.trashNotes.find(n => n.id === selectedNoteId.value) || null
})

function selectNote(id: string) {
  selectedNoteId.value = selectedNoteId.value === id ? null : id
}

/* ─── 格式化 ─── */
function formatDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function daysAgo(iso: string): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / 86400000)
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  return `${days}天前`
}

function wordCount(content: string): number {
  return content.replace(/\s+/g, '').length
}

/* ─── 操作 ─── */
async function handleRestore(id: string) {
  await notesStore.restoreNote(id)
  if (selectedNoteId.value === id) selectedNoteId.value = null
}

function requestDelete(id: string, title: string) {
  deleteTargetId.value = id
  deleteTargetTitle.value = title || '未命名笔记'
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  await notesStore.permanentlyDelete(deleteTargetId.value)
  if (selectedNoteId.value === deleteTargetId.value) selectedNoteId.value = null
  showDeleteConfirm.value = false
}

async function confirmEmpty() {
  await notesStore.emptyTrash()
  selectedNoteId.value = null
  showEmptyConfirm.value = false
}
</script>

<template>
  <div class="trash-page">
    <!-- ═══ 空状态（无回收站内容） ═══ -->
    <div v-if="notesStore.trashCount === 0" class="page-empty">
      <div class="page-empty-inner">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        <p class="empty-title">回收站为空</p>
        <p class="empty-desc">删除的笔记会暂存在这里，你可以随时恢复</p>
      </div>
    </div>

    <!-- ═══ 主从布局 ═══ -->
    <template v-else>
      <!-- 左侧列表 -->
      <aside class="trash-list">
        <div class="list-header">
          <h2 class="list-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            回收站
            <span class="list-badge">{{ notesStore.trashCount }}</span>
          </h2>
          <button class="btn-empty" @click="showEmptyConfirm = true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            清空
          </button>
        </div>

        <div class="list-entries">
          <TransitionGroup name="trash-item">
            <div
              v-for="note in notesStore.trashNotes"
              :key="note.id"
              class="trash-entry"
              :class="{ selected: note.id === selectedNoteId }"
              @click="selectNote(note.id)"
            >
              <div class="te-row-top">
                <h3 class="te-title">{{ note.title || '无标题' }}</h3>
                <span class="te-ago">{{ daysAgo(note.deletedAt || '') }}</span>
                <div class="te-quick">
                  <button class="te-qbtn te-qbtn--restore" @click.stop="handleRestore(note.id)" data-tooltip="恢复" data-tooltip-pos="bottom">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                  </button>
                  <button class="te-qbtn te-qbtn--delete" @click.stop="requestDelete(note.id, note.title)" data-tooltip="永久删除" data-tooltip-pos="bottom">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
              <p class="te-snippet" v-html="previewHtml(note.content, 80)" />
              <div class="te-row-bottom">
                <span class="te-cat">{{ note.category }}</span>
                <span v-for="tag in note.tags.slice(0, 2)" :key="tag" class="te-tag">{{ tag }}</span>
                <span class="te-stat">{{ wordCount(note.content) }}字</span>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </aside>

      <!-- 右侧预览 -->
      <main class="trash-preview">
        <!-- 已选中笔记 -->
        <template v-if="selectedNote">
          <div class="preview-header">
            <div class="ph-info">
              <h2 class="ph-title">{{ selectedNote.title || '无标题' }}</h2>
              <div class="ph-meta">
                <span class="ph-cat">{{ selectedNote.category }}</span>
                <span class="ph-date">删除于 {{ formatDate(selectedNote.deletedAt || '') }}</span>
                <span class="ph-sep">·</span>
                <span class="ph-date">创建于 {{ formatDate(selectedNote.createdAt) }}</span>
                <span class="ph-stat">{{ wordCount(selectedNote.content) }} 字</span>
              </div>
              <div v-if="selectedNote.tags.length > 0" class="ph-tags">
                <span v-for="tag in selectedNote.tags" :key="tag" class="ph-tag">{{ tag }}</span>
              </div>
            </div>
            <div class="ph-actions">
              <button class="ph-btn ph-btn--restore" @click="handleRestore(selectedNote.id)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
                恢复笔记
              </button>
              <button class="ph-btn ph-btn--delete" @click="requestDelete(selectedNote.id, selectedNote.title)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                永久删除
              </button>
            </div>
          </div>
          <div class="preview-body">
            <MarkdownRenderer :content="selectedNote.content" />
          </div>
        </template>

        <!-- 空占位 -->
        <div v-else class="preview-placeholder">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <p class="empty-title">选择笔记查看内容</p>
          <p class="empty-desc">点击左侧卡片即可预览完整内容，确认后再恢复或删除</p>
        </div>
      </main>
    </template>

    <!-- 弹窗 -->
    <ConfirmDialog
      :open="showEmptyConfirm"
      title="确认清空回收站"
      :message="`将永久删除 <strong>${notesStore.trashCount}</strong> 条笔记，此操作不可撤销。`"
      confirm-text="确认清空"
      confirm-type="danger"
      @confirm="confirmEmpty"
      @cancel="showEmptyConfirm = false"
    />
    <ConfirmDialog
      :open="showDeleteConfirm"
      title="确认永久删除"
      :message="`将永久删除 <strong>${deleteTargetTitle}</strong>，此操作不可撤销。`"
      confirm-text="永久删除"
      confirm-type="danger"
      @confirm="confirmDelete"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>

<style scoped>
/* ═══ 页面容器 ═══ */
.trash-page {
  display: flex;
  margin: calc(-1 * var(--app-main-padding));
  height: calc(100% + 2 * var(--app-main-padding));
  overflow: hidden;
}

/* ═══ 空状态（整页居中） ═══ */
.page-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-empty-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  text-align: center;
  padding: var(--space-8);
}

.page-empty-inner svg {
  color: var(--color-text-tertiary);
  opacity: 0.25;
}

.empty-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.empty-desc {
  font-size: 0.82rem;
  color: var(--color-text-tertiary);
  max-width: 280px;
  line-height: 1.5;
}

/* ═══ 左侧列表 ═══ */
.trash-list {
  width: 360px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border-right: 1px solid var(--color-divider);
  background: var(--color-surface);
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-divider);
  flex-shrink: 0;
}

.list-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 1rem;
  font-weight: 700;
}

.list-badge {
  font-size: 0.65rem;
  font-weight: 700;
  background: var(--color-danger-muted);
  color: var(--color-danger);
  padding: 1px 6px;
  border-radius: var(--radius-full);
  min-width: 18px;
  text-align: center;
}

.btn-empty {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-danger);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .btn-empty:hover {
    background: var(--color-danger-muted);
  }
}

.btn-empty:active {
  transform: scale(0.96);
}

/* ── 列表滚动区 ── */
.list-entries {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* ── 卡片条目 ── */
.trash-entry {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  cursor: pointer;
  border: 1px solid transparent;
  transition: background-color var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

.trash-entry.selected {
  background: var(--color-accent-muted);
  border-color: color-mix(in oklch, var(--color-accent), transparent 70%);
}

@media (hover: hover) {
  .trash-entry:not(.selected):hover {
    background: var(--color-bg-hover);
  }
  .trash-entry:hover .te-ago {
    display: none;
  }
  .trash-entry:hover .te-quick {
    display: flex;
  }
}

.te-row-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: 2px;
}

.te-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.trash-entry.selected .te-title {
  color: var(--color-accent);
}

.te-ago {
  flex-shrink: 0;
  font-size: 0.65rem;
  color: var(--color-text-tertiary);
}

.te-snippet {
  font-size: 0.76rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: var(--space-1);
  opacity: 0.8;
}

.te-row-bottom {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.te-cat {
  font-size: 0.62rem;
  font-weight: 600;
  color: var(--color-accent-text);
  background: var(--color-accent-muted);
  padding: 0 5px;
  border-radius: var(--radius-full);
  line-height: 1.6;
}

.te-tag {
  font-size: 0.6rem;
  color: var(--color-text-tertiary);
  background: var(--color-bg-tertiary);
  padding: 0 4px;
  border-radius: var(--radius-full);
  line-height: 1.6;
}

.te-stat {
  font-size: 0.6rem;
  color: var(--color-text-tertiary);
  margin-left: auto;
}

/* ── 悬停快捷按钮 ── */
.te-quick {
  display: none;
  gap: 2px;
  flex-shrink: 0;
  margin-left: auto;
}

.trash-entry.selected .te-ago {
  display: none;
}

.trash-entry.selected .te-quick {
  display: flex;
}

.te-qbtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  color: var(--color-text-tertiary);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

.te-qbtn:active { transform: scale(0.88); }

@media (hover: hover) {
  .te-qbtn--restore:hover {
    background: var(--color-success-muted);
    color: var(--color-success);
  }
  .te-qbtn--delete:hover {
    background: var(--color-danger-muted);
    color: var(--color-danger);
  }
}

/* ═══ 右侧预览 ═══ */
.trash-preview {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── 预览空占位 ── */
.preview-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  text-align: center;
  padding: var(--space-8);
}

.preview-placeholder svg {
  color: var(--color-text-tertiary);
  opacity: 0.2;
}

/* ── 预览头部 ── */
.preview-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-divider);
  flex-shrink: 0;
  background: var(--color-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.ph-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.ph-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.3;
}

.ph-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
}

.ph-cat {
  font-weight: 600;
  color: var(--color-accent-text);
  background: var(--color-accent-muted);
  padding: 0 6px;
  border-radius: var(--radius-full);
}

.ph-sep {
  opacity: 0.3;
}

.ph-stat {
  padding-left: var(--space-2);
  border-left: 1px solid var(--color-divider);
}

.ph-tags {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
  margin-top: 2px;
}

.ph-tag {
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  padding: 1px 6px;
  border-radius: var(--radius-full);
}

/* ── 操作按钮 ── */
.ph-actions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}

.ph-btn {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-size: 0.78rem;
  font-weight: 500;
  white-space: nowrap;
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
}

.ph-btn:active { transform: scale(0.96); }

.ph-btn--restore {
  color: var(--color-success);
  background: var(--color-success-muted);
}

.ph-btn--delete {
  color: var(--color-danger);
  background: var(--color-danger-muted);
}

@media (hover: hover) {
  .ph-btn--restore:hover {
    background: var(--color-success);
    color: var(--color-text-inverse);
  }
  .ph-btn--delete:hover {
    background: var(--color-danger);
    color: var(--color-text-inverse);
  }
}

/* ── 预览正文 ── */
.preview-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6);
}

.preview-body > :deep(.markdown-body) {
  max-width: 780px;
  margin: 0 auto;
}

/* ═══ 列表动画 ═══ */
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

/* ═══ 响应式 ═══ */
@media (max-width: 768px) {
  .trash-page {
    flex-direction: column;
  }
  .trash-list {
    width: 100% !important;
    height: 45%;
    border-right: none;
    border-bottom: 1px solid var(--color-divider);
  }
  .trash-preview {
    height: 55%;
  }
}
</style>
