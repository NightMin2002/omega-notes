<script setup lang="ts">
/**
 * QuickNote — 快速笔记弹窗
 * 随时随地记一笔，自动归类到"收件箱"
 */
import { ref, computed, watch } from 'vue'
import { useNotesStore } from '../stores/notes'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const notesStore = useNotesStore()
const content = ref('')
const isSaving = ref(false)
const justSaved = ref(false)

watch(() => props.open, (val) => {
  if (val) {
    content.value = ''
    justSaved.value = false
  }
})

/** 计算下一个速记编号 */
const nextQuickIndex = computed(() => {
  const count = notesStore.activeNotes.filter(
    n => n.category === '收件箱' && /^速记 #\d+$/.test(n.title)
  ).length
  return count + 1
})

/**
 * 将 textarea 的单换行转换为 Markdown 段落分隔（双换行），
 * 避免 Milkdown 编辑器和 markdown-it 渲染时吞掉换行。
 */
function normalizeLineBreaks(text: string): string {
  return text
    .replace(/\r\n/g, '\n')          // 统一为 LF
    .replace(/\n{3,}/g, '\n\n')       // 3+ 换行压缩为 2
    .replace(/(?<!\n)\n(?!\n)/g, '\n\n') // 单换行 → 双换行
}

async function save() {
  if (!content.value.trim() || isSaving.value) return
  isSaving.value = true

  const normalized = normalizeLineBreaks(content.value.trim())
  const title = `速记 #${nextQuickIndex.value}`

  await notesStore.addNote({
    title,
    content: normalized,
    category: '收件箱',
    tags: [],
  })

  isSaving.value = false
  justSaved.value = true
  content.value = ''

  setTimeout(() => {
    justSaved.value = false
  }, 1500)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    save()
  }
}
</script>

<template>
  <dialog
    :open="open"
    class="quick-note-backdrop"
    @click.self="emit('close')"
    @keydown="handleKeydown"
  >
    <div class="quick-note-dialog">
      <div class="quick-note-header">
        <h3 class="quick-note-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <span>快速笔记</span>
        </h3>
        <button class="quick-note-close" @click="emit('close')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <textarea
        ref="textareaRef"
        v-model="content"
        class="quick-note-input"
        placeholder="想到什么，先记下来…&#10;&#10;支持 Markdown 格式&#10;Ctrl+Enter 保存"
        spellcheck="false"
        autofocus
      />

      <div class="quick-note-footer">
        <span class="quick-note-hint">
          自动归类到「收件箱」
        </span>
        <div class="quick-note-actions">
          <Transition name="fade">
            <span v-if="justSaved" class="saved-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              已保存
            </span>
          </Transition>
          <button
            class="quick-note-save"
            :disabled="!content.trim() || isSaving"
            @click="save"
          >
            <span v-if="!isSaving">保存</span>
            <span v-else class="spinner" />
          </button>
        </div>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.quick-note-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12vh;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  border: none;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
}

.quick-note-backdrop:not([open]) {
  display: none;
}

.quick-note-dialog {
  width: 560px;
  max-width: 90vw;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  animation: dialog-in 0.2s var(--ease-out);
}

@keyframes dialog-in {
  from {
    opacity: 0;
    transform: translateY(-12px) scale(0.97);
  }
}

.quick-note-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.quick-note-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.quick-note-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  color: var(--color-text-tertiary);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .quick-note-close:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
}

.quick-note-input {
  flex: 1;
  min-height: 180px;
  max-height: 50vh;
  resize: vertical;
  padding: var(--space-4);
  font-family: var(--font-mono);
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--color-text-primary);
  background: transparent;
  border: none;
  outline: none;
  tab-size: 2;
}

.quick-note-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border);
}

.quick-note-hint {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

.quick-note-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.saved-badge {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-success);
}

.quick-note-save {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-weight: 500;
  font-size: 0.85rem;
  background: var(--color-accent);
  color: var(--color-text-inverse);
  border: 1px solid var(--color-accent);
  transition: background-color var(--duration-fast) var(--ease-out),
              opacity var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

.quick-note-save:disabled { opacity: 0.5; }

@media (hover: hover) {
  .quick-note-save:hover:not(:disabled) {
    background: var(--color-accent-hover);
    border-color: var(--color-accent-hover);
  }
}

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: currentColor;
  border-radius: var(--radius-full);
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.fade-enter-active,
.fade-leave-active { transition: opacity 0.3s var(--ease-out); }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
