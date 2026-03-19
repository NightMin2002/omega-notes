<script setup lang="ts">
/**
 * EditorToolbar — Markdown 格式化工具栏
 *
 * 在分屏模式的源码编辑区使用。
 * 通过 emit 事件向父组件发送要插入的文本。
 */

const emit = defineEmits<{
  /** 在光标位置插入文本 */
  insert: [text: string]
  /** 用包裹语法包围选中文本（prefix + selection + suffix） */
  wrap: [prefix: string, suffix: string]
}>()

interface ToolItem {
  id: string
  label: string
  /** 动作类型：insert 直接插入，wrap 包围选中 */
  action: 'insert' | 'wrap'
  text?: string
  prefix?: string
  suffix?: string
}

const tools: ToolItem[] = [
  { id: 'h1', label: 'H1', action: 'insert', text: '# 标题\n' },
  { id: 'h2', label: 'H2', action: 'insert', text: '## 标题\n' },
  { id: 'h3', label: 'H3', action: 'insert', text: '### 标题\n' },
  { id: 'bold', label: 'B', action: 'wrap', prefix: '**', suffix: '**' },
  { id: 'italic', label: 'I', action: 'wrap', prefix: '*', suffix: '*' },
  { id: 'strike', label: 'S', action: 'wrap', prefix: '~~', suffix: '~~' },
  { id: 'code', label: '<>', action: 'wrap', prefix: '`', suffix: '`' },
  { id: 'quote', label: '>', action: 'insert', text: '> 引用文本\n' },
  { id: 'ul', label: '•', action: 'insert', text: '- 列表项\n' },
  { id: 'ol', label: '1.', action: 'insert', text: '1. 列表项\n' },
  { id: 'task', label: '☐', action: 'insert', text: '- [ ] 待办事项\n' },
  { id: 'hr', label: '—', action: 'insert', text: '\n---\n' },
  { id: 'codeblock', label: '```', action: 'insert', text: '\n```\n代码\n```\n' },
  { id: 'table', label: '⊞', action: 'insert', text: '\n| 列1 | 列2 | 列3 |\n|---|---|---|\n| | | |\n' },
]

function handleClick(tool: ToolItem) {
  if (tool.action === 'insert' && tool.text) {
    emit('insert', tool.text)
  } else if (tool.action === 'wrap' && tool.prefix && tool.suffix) {
    emit('wrap', tool.prefix, tool.suffix)
  }
}
</script>

<template>
  <div class="editor-toolbar-strip">
    <button
      v-for="tool in tools"
      :key="tool.id"
      type="button"
      class="toolbar-btn"
      :class="[`tb-${tool.id}`]"
      :data-tooltip="tool.label"
      @click="handleClick(tool)"
    >
      <!-- 标题级别 -->
      <template v-if="tool.id === 'h1'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4v16" /><path d="M20 4v16" /><path d="M4 12h16" />
        </svg>
        <span class="tb-sub">1</span>
      </template>
      <template v-else-if="tool.id === 'h2'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4v16" /><path d="M20 4v16" /><path d="M4 12h16" />
        </svg>
        <span class="tb-sub">2</span>
      </template>
      <template v-else-if="tool.id === 'h3'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4v16" /><path d="M20 4v16" /><path d="M4 12h16" />
        </svg>
        <span class="tb-sub">3</span>
      </template>

      <!-- 加粗 -->
      <template v-else-if="tool.id === 'bold'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
        </svg>
      </template>

      <!-- 斜体 -->
      <template v-else-if="tool.id === 'italic'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" />
        </svg>
      </template>

      <!-- 删除线 -->
      <template v-else-if="tool.id === 'strike'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 4H9a3 3 0 0 0-3 3 3 3 0 0 0 3 3h6" /><line x1="4" y1="12" x2="20" y2="12" /><path d="M15 12a3 3 0 0 1 0 6H8" />
        </svg>
      </template>

      <!-- 行内代码 -->
      <template v-else-if="tool.id === 'code'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
        </svg>
      </template>

      <!-- 引用 -->
      <template v-else-if="tool.id === 'quote'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 8H6a2 2 0 00-2 2v2a2 2 0 002 2h2v2H6a2 2 0 01-2-2V8a4 4 0 014-4h2v4zm10 0h-4a2 2 0 00-2 2v2a2 2 0 002 2h2v2h-2a2 2 0 01-2-2V8a4 4 0 014-4h2v4z" />
        </svg>
      </template>

      <!-- 无序列表 -->
      <template v-else-if="tool.id === 'ul'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </template>

      <!-- 有序列表 -->
      <template v-else-if="tool.id === 'ol'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
          <path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
        </svg>
      </template>

      <!-- 任务列表 -->
      <template v-else-if="tool.id === 'task'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="5" width="14" height="14" rx="2" /><path d="M9 12l2 2 4-4" />
        </svg>
      </template>

      <!-- 分割线 -->
      <template v-else-if="tool.id === 'hr'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="2" y1="12" x2="22" y2="12" />
        </svg>
      </template>

      <!-- 代码块 -->
      <template v-else-if="tool.id === 'codeblock'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="18" rx="2" /><polyline points="8 10 5 13 8 16" /><polyline points="16 10 19 13 16 16" />
        </svg>
      </template>

      <!-- 表格 -->
      <template v-else-if="tool.id === 'table'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
        </svg>
      </template>
    </button>
  </div>
</template>

<style scoped>
.editor-toolbar-strip {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: var(--space-1) var(--space-2);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  flex-wrap: wrap;
  overflow-x: auto;
}

/* 分隔符 - 在引用按钮前和分割线前 */
.tb-quote,
.tb-hr {
  margin-left: var(--space-1);
  padding-left: var(--space-1);
  border-left: 1px solid var(--color-divider);
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1px;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  color: var(--color-text-tertiary);
  font-size: 0.72rem;
  font-weight: 600;
  position: relative;
  flex-shrink: 0;
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .toolbar-btn:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
}

.toolbar-btn:active {
  transform: scale(0.98);
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

.toolbar-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-accent-muted);
}

.tb-sub {
  font-size: 0.6rem;
  font-weight: 700;
  margin-left: -1px;
  color: inherit;
}

/* 自定义 tooltip */
.toolbar-btn::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%) scale(0.9);
  padding: 2px 6px;
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
  font-size: 0.65rem;
  font-weight: 500;
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
  z-index: var(--z-dropdown);
}

@media (hover: hover) {
  .toolbar-btn:hover::after {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .toolbar-btn,
  .toolbar-btn::after {
    transition: none;
  }
}
</style>
