<script setup lang="ts">
/**
 * PopoutNote — 悬挂笔记阅读窗口
 * 精简的笔记阅读视图，始终置顶
 */
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useNotesStore } from '../../stores/notes'
import MarkdownRenderer from '../../components/MarkdownRenderer.vue'

const route = useRoute()
const notesStore = useNotesStore()
notesStore.init()

const note = computed(() => {
  const id = route.params.id as string
  return notesStore.getNoteById(id)
})

/* 从 localStorage 读取阅读主题 */
const readingTheme = ref(localStorage.getItem('omega-reading-theme') || 'aurora')

/* ─── 跨窗口主题同步 ─── */
const themeChannel = new BroadcastChannel('omega-reading-theme-channel')

function handleThemeMessage(e: MessageEvent) {
  if (e.data?.theme) {
    readingTheme.value = e.data.theme
  }
}

function handleStorageChange(e: StorageEvent) {
  if (e.key === 'omega-reading-theme' && e.newValue) {
    readingTheme.value = e.newValue
  }
}

onMounted(() => {
  themeChannel.onmessage = handleThemeMessage
  window.addEventListener('storage', handleStorageChange)
})

onUnmounted(() => {
  themeChannel.close()
  window.removeEventListener('storage', handleStorageChange)
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
  <div class="popout-shell note-shell" :class="`theme-${readingTheme}`">
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
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
      <span>笔记不存在或已删除</span>
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

.popout-close:active {
  transform: scale(0.9);
}

.popout-close:focus-visible {
  box-shadow: 0 0 0 2px var(--color-danger-muted);
  outline: none;
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  color: var(--color-text-tertiary);
  font-size: 0.85rem;
}

.popout-empty svg {
  opacity: 0.35;
}

@media (prefers-reduced-motion: reduce) {
  .popout-close {
    transition: none;
  }
}
</style>

<!-- 阅读主题（非 scoped，使 :deep 可穿透到 MarkdownRenderer） -->
<style>
/* ═══════════ Aurora — 微光极光 ═══════════ */
.theme-aurora.popout-shell {
  border-color: rgba(99, 102, 241, 0.2);
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.08);
}

.theme-aurora .note-popout-content .md-rendered {
  line-height: 1.8;
}

.theme-aurora .meta-cat {
  color: var(--color-bg-primary);
  background: var(--color-accent);
}

/* ═══════════ Ink — 笔墨 ═══════════ */
.theme-ink.popout-shell {
  border-color: var(--color-border);
}

.theme-ink .note-popout-body {
  border-left: 2px solid var(--color-accent-muted);
  margin-left: var(--space-2);
}

.theme-ink .note-popout-content .md-rendered {
  line-height: 1.9;
}

.theme-ink .meta-cat {
  color: var(--color-accent);
  background: transparent;
  border: 1px solid var(--color-accent);
}

.theme-ink .meta-date {
  font-family: var(--font-mono);
}

.theme-ink .mini-tag {
  color: var(--color-text-tertiary);
  background: transparent;
  border-bottom: 1px dashed var(--color-text-tertiary);
  border-radius: 0;
  padding: 0;
}

/* ═══════════ Terminal — 终端 ═══════════ */
.theme-terminal.popout-shell {
  background: oklch(0.14 0.005 160);
  border-color: oklch(0.25 0.04 145);
  color: oklch(0.78 0.06 145);
}

.theme-terminal .popout-header {
  border-bottom-color: oklch(0.25 0.04 145);
}

.theme-terminal .popout-title {
  color: oklch(0.85 0.18 145);
  font-family: var(--font-mono);
}

.theme-terminal .popout-close {
  color: oklch(0.5 0.06 145);
}

.theme-terminal .note-popout-content .md-rendered {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  line-height: 1.7;
  color: oklch(0.78 0.06 145);
}

.theme-terminal .note-popout-content .md-rendered h1,
.theme-terminal .note-popout-content .md-rendered h2,
.theme-terminal .note-popout-content .md-rendered h3 {
  color: oklch(0.85 0.18 145);
  border-bottom: 1px dashed oklch(0.3 0.04 145);
}

.theme-terminal .note-popout-content .md-rendered code {
  color: oklch(0.8 0.14 80);
  background: oklch(0.18 0.005 160);
}

.theme-terminal .note-popout-content .md-rendered a {
  color: oklch(0.7 0.15 200);
}

.theme-terminal .meta-cat {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  color: oklch(0.7 0.12 200);
  background: transparent;
  border: 1px solid oklch(0.35 0.08 200);
}

.theme-terminal .meta-date {
  font-family: var(--font-mono);
  color: oklch(0.5 0.02 160);
}

.theme-terminal .mini-tag {
  font-family: var(--font-mono);
  font-size: 0.58rem;
  color: oklch(0.6 0.1 80);
  background: transparent;
}

.theme-terminal .mini-tag::before { content: '#'; }

/* ═══════════ Parchment — 羊皮纸 ═══════════ */
.theme-parchment.popout-shell {
  background: oklch(0.93 0.03 80);
  border-color: oklch(0.82 0.04 75);
  box-shadow: inset 0 0 40px oklch(0.85 0.03 70 / 0.5);
  color: oklch(0.3 0.04 50);
}

.theme-parchment .popout-header {
  border-bottom: 2px double oklch(0.75 0.04 70);
}

.theme-parchment .popout-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  color: oklch(0.3 0.04 50);
}

.theme-parchment .note-popout-content .md-rendered {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 0.95rem;
  line-height: 2;
  color: oklch(0.28 0.03 50);
  text-align: justify;
}

.theme-parchment .note-popout-content .md-rendered h1,
.theme-parchment .note-popout-content .md-rendered h2,
.theme-parchment .note-popout-content .md-rendered h3 {
  color: oklch(0.3 0.06 40);
  font-family: 'Georgia', 'Noto Serif SC', serif;
}

.theme-parchment .note-popout-content .md-rendered blockquote {
  border-left-color: oklch(0.6 0.08 50);
  background: oklch(0.9 0.03 75);
  color: oklch(0.35 0.04 50);
  font-style: italic;
}

.theme-parchment .note-popout-content .md-rendered a {
  color: oklch(0.4 0.12 30);
}

.theme-parchment .meta-cat {
  color: oklch(0.45 0.1 30);
  background: oklch(0.88 0.04 60);
}

.theme-parchment .meta-date {
  color: oklch(0.5 0.03 60);
  font-style: italic;
}

.theme-parchment .mini-tag {
  color: oklch(0.5 0.06 50);
  background: oklch(0.9 0.025 70);
}

/* 羊皮纸 暗色模式适配 */
[data-theme='dark'] .theme-parchment.popout-shell {
  background: oklch(0.22 0.02 60);
  border-color: oklch(0.32 0.03 55);
  box-shadow: inset 0 0 40px oklch(0.18 0.02 50 / 0.5);
}

[data-theme='dark'] .theme-parchment .popout-header {
  border-bottom-color: oklch(0.35 0.03 55);
}

[data-theme='dark'] .theme-parchment .popout-title {
  color: oklch(0.82 0.05 60);
}

[data-theme='dark'] .theme-parchment .meta-cat {
  color: oklch(0.75 0.08 40);
  background: oklch(0.28 0.03 50);
}

[data-theme='dark'] .theme-parchment .note-popout-content .md-rendered {
  color: oklch(0.78 0.02 60);
}

[data-theme='dark'] .theme-parchment .note-popout-content .md-rendered h1,
[data-theme='dark'] .theme-parchment .note-popout-content .md-rendered h2,
[data-theme='dark'] .theme-parchment .note-popout-content .md-rendered h3 {
  color: oklch(0.82 0.05 50);
}

[data-theme='dark'] .theme-parchment .note-popout-content .md-rendered blockquote {
  border-left-color: oklch(0.45 0.06 50);
  background: oklch(0.25 0.02 55);
  color: oklch(0.7 0.03 55);
}

[data-theme='dark'] .theme-parchment .note-popout-content .md-rendered a {
  color: oklch(0.7 0.1 40);
}

[data-theme='dark'] .theme-parchment .mini-tag {
  color: oklch(0.65 0.04 55);
  background: oklch(0.25 0.02 55);
}
</style>
