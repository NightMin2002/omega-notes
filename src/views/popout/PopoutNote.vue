<script setup lang="ts">
/**
 * PopoutNote — 悬挂笔记阅读窗口
 * 精简的笔记阅读视图，始终置顶
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useNotesStore } from '../../stores/notes'
import MarkdownRenderer from '../../components/MarkdownRenderer.vue'

const route = useRoute()
const notesStore = useNotesStore()

const note = computed(() => {
  const id = route.params.id as string
  return notesStore.getNoteById(id)
})

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN')
}

/* 关闭窗口 */
async function closeWindow() {
  try {
    const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    const win = getCurrentWebviewWindow()
    await win.destroy()
  } catch { /* ignore */ }
}
</script>

<template>
  <div class="popout-shell note-shell">
    <header class="popout-header" data-tauri-drag-region>
      <span class="popout-title" data-tauri-drag-region>📖 {{ note?.title || '笔记' }}</span>
      <button class="popout-close" @click="closeWindow">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </header>

    <div class="note-popout-body" v-if="note">
      <div class="note-popout-meta">
        <span class="meta-cat">{{ note.category }}</span>
        <span class="meta-date">{{ formatDate(note.updatedAt) }}</span>
      </div>
      <div v-if="note.tags.length > 0" class="note-popout-tags">
        <span v-for="tag in note.tags" :key="tag" class="mini-tag">{{ tag }}</span>
      </div>
      <div class="note-popout-content">
        <MarkdownRenderer :content="note.content" />
      </div>
    </div>

    <div v-else class="popout-empty">
      笔记不存在
    </div>
  </div>
</template>

<style scoped>
.popout-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  overflow: hidden;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-glass-border);
}

.popout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-divider);
  cursor: move;
  user-select: none;
  -webkit-app-region: drag;
}

.popout-title {
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.popout-close {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--color-text-tertiary);
  -webkit-app-region: no-drag;
  transition: background-color 150ms var(--ease-out), color 150ms var(--ease-out);
}

@media (hover: hover) {
  .popout-close:hover {
    background: var(--color-danger-muted, rgba(239, 68, 68, 0.15));
    color: var(--color-danger);
  }
}

.note-popout-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.note-popout-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.meta-cat {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--color-bg-primary);
  background: var(--color-accent);
  padding: 1px var(--space-2);
  border-radius: var(--radius-full);
}

.meta-date {
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
}

.note-popout-tags {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
}

.mini-tag {
  font-size: 0.62rem;
  color: var(--color-accent);
  background: var(--color-accent-muted);
  padding: 0 var(--space-1);
  border-radius: var(--radius-sm);
}

.note-popout-content {
  font-size: 0.88rem;
  line-height: 1.7;
}

.popout-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  font-size: 0.85rem;
}
</style>
