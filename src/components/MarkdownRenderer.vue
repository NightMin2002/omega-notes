<script setup lang="ts">
import { computed, nextTick, onMounted, onUpdated, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import texmath from 'markdown-it-texmath'
import taskLists from 'markdown-it-task-lists'
import katex from 'katex'
import { useNotesStore } from '../stores/notes'
import { openUrl } from '@tauri-apps/plugin-opener'
import mermaid from 'mermaid'
import 'highlight.js/styles/github-dark.min.css'

/* Mermaid 初始化 */
let mermaidInited = false
function ensureMermaidInit() {
  if (mermaidInited) return
  mermaidInited = true
  mermaid.initialize({
    startOnLoad: false,
    theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default',
    securityLevel: 'loose',
    fontFamily: 'var(--font-sans)',
  })
}

const props = defineProps<{
  content: string
  /**
   * 当提供此 prop 时，任务列表的 checkbox 可交互。
   * 变更后通过 update:editableContent 回写。
   */
  editableContent?: string
}>()

const emit = defineEmits<{
  'update:editableContent': [value: string]
}>()

const router = useRouter()
const notesStore = useNotesStore()
const containerRef = ref<HTMLElement | null>(null)

let mermaidIdCounter = 0

const md = new MarkdownIt({
  /* 笔记正文默认按纯 Markdown 处理，避免 <select>/<input> 等文本被渲染成真实控件 */
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight(str, lang): string {
    /* Mermaid 图表：输出占位 div，后续由 mermaid.run() 渲染 */
    if (lang === 'mermaid') {
      const id = `mermaid-${++mermaidIdCounter}`
      return `<div class="mermaid-block" id="${id}">${md.utils.escapeHtml(str)}</div>`
    }
    /* 只对 hljs 已注册的语言做高亮，其余原样输出 */
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`
      } catch { /* fallback */ }
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
  },
})

md.use(texmath, { engine: katex, delimiters: 'dollars' })
md.use(taskLists, { enabled: true })

/** 清理粘贴内容中常见的代码围栏包裹 */
function cleanContent(raw: string): string {
  let s = raw.trim()
  const fenceRe = /^```\w*\s*\n/
  if (fenceRe.test(s)) {
    s = s.replace(fenceRe, '')
    if (s.endsWith('```')) {
      s = s.slice(0, -3)
    }
  }
  return s.trim()
}

/** 将 [[title]] 或 \[\[title\]\]（Milkdown 转义）转为维基链接 HTML */
function renderWikiLinks(html: string): string {
  return html.replace(
    /\\?\[\\?\[([^\]]+?)\\?\]\\?\]/g,
    (_match, title) => {
      const escapedTitle = title.replace(/"/g, '&quot;')
      return `<a class="wiki-link" data-wiki-title="${escapedTitle}">${title}</a>`
    }
  )
}

const rendered = computed(() => renderWikiLinks(md.render(cleanContent(props.content))))

/** 点击 wiki-link 导航到对应笔记，点击外部链接用系统浏览器打开 */
function handleClick(e: Event) {
  const target = (e.target as HTMLElement).closest('a') as HTMLAnchorElement | null
  if (!target) return

  /* wiki-link */
  if (target.classList.contains('wiki-link')) {
    e.preventDefault()
    const title = target.getAttribute('data-wiki-title')
    if (!title) return
    const note = notesStore.findNoteByTitle(title)
    if (note) {
      notesStore.recordOpen(note.id)
      router.push(`/note/${note.id}`)
    }
    return
  }

  /* 外部链接：拦截并用系统浏览器打开 */
  const href = target.getAttribute('href')
  if (href && /^https?:\/\//i.test(href)) {
    e.preventDefault()
    openUrl(href).catch(() => window.open(href, '_blank'))
  }
}

/**
 * 可交互任务列表：启用 checkbox 并绑定 change 事件。
 * 当 checkbox 状态变化时，找到源 Markdown 中对应的 `- [ ]` / `- [x]` 并切换。
 */
function enableInteractiveCheckboxes() {
  const el = containerRef.value
  if (!el || props.editableContent === undefined) return

  const checkboxes = el.querySelectorAll('.task-list-item input[type="checkbox"]')
  checkboxes.forEach((cb, index) => {
    const input = cb as HTMLInputElement
    input.disabled = false
    input.style.cursor = 'pointer'
    // 用 data 属性标记已绑定，避免重复
    if (input.dataset.bound) return
    input.dataset.bound = '1'
    input.addEventListener('change', () => {
      toggleTaskInSource(index, input.checked)
    })
  })
}

/** 在 Markdown 源文本中切换第 N 个任务的完成状态 */
function toggleTaskInSource(taskIndex: number, checked: boolean) {
  const source = props.editableContent
  if (source === undefined) return

  const taskPattern = /^(\s*[-*+]\s*)\[( |x|X)\]/gm
  let count = 0
  const newContent = source.replace(taskPattern, (match, prefix: string, mark: string) => {
    if (count++ === taskIndex) {
      return `${prefix}[${checked ? 'x' : ' '}]`
    }
    return match
  })

  if (newContent !== source) {
    emit('update:editableContent', newContent)
  }
}

/** 渲染占位 div 中的 Mermaid 图表 */
async function renderMermaidBlocks() {
  const el = containerRef.value
  if (!el) return
  const blocks = el.querySelectorAll<HTMLElement>('.mermaid-block:not([data-mermaid-processed])')
  if (blocks.length === 0) return
  ensureMermaidInit()
  // 根据当前主题更新 mermaid 配色
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  mermaid.initialize({ theme: isDark ? 'dark' : 'default' })
  blocks.forEach(b => b.setAttribute('data-mermaid-processed', '1'))
  try {
    await mermaid.run({ nodes: blocks })
  } catch { /* 语法错误时显示原文 */ }
}

function bindHandlers() {
  containerRef.value?.addEventListener('click', handleClick)
  enableInteractiveCheckboxes()
  nextTick(() => renderMermaidBlocks())
}

onMounted(bindHandlers)
onUpdated(bindHandlers)
</script>

<template>
  <div ref="containerRef" class="md-rendered" v-html="rendered" />
</template>

<style scoped>
.md-rendered {
  font-family: var(--md-font-family, inherit);
  font-size: var(--md-font-size, 1rem);
  line-height: var(--md-line-height, 1.8);
  color: var(--md-text-color, var(--color-text-primary));
  word-break: break-word;
}

/* ─── 标题 ─── */
.md-rendered :deep(h1),
.md-rendered :deep(h2),
.md-rendered :deep(h3),
.md-rendered :deep(h4) {
  color: var(--color-text-primary);
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-top: var(--space-6);
  margin-bottom: var(--space-3);
  line-height: 1.3;
}

.md-rendered :deep(h1) { font-size: 1.75rem; border-bottom: 1px solid var(--color-divider); padding-bottom: var(--space-3); }
.md-rendered :deep(h2) { font-size: 1.4rem; border-bottom: 1px solid var(--color-divider); padding-bottom: var(--space-2); }
.md-rendered :deep(h3) { font-size: 1.15rem; }
.md-rendered :deep(h4) { font-size: 1rem; }

/* ─── 段落 / 文本 ─── */
.md-rendered :deep(p) {
  margin-bottom: var(--space-3);
}

.md-rendered :deep(strong) {
  font-weight: 700;
  color: var(--color-text-primary);
}

.md-rendered :deep(em) {
  font-style: italic;
}

.md-rendered :deep(del) {
  text-decoration: line-through;
  color: var(--color-text-tertiary);
}

/* ─── 行内代码 ─── */
.md-rendered :deep(code) {
  font-family: var(--font-mono);
  background: var(--color-bg-tertiary);
  color: var(--color-accent-text);
  padding: 0.15em 0.4em;
  border-radius: var(--radius-sm);
  font-size: 0.88em;
}

/* ─── 代码块 ─── */
.md-rendered :deep(pre) {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  overflow-x: auto;
  margin: var(--space-4) 0;
}

.md-rendered :deep(pre code) {
  background: transparent;
  padding: 0;
  color: inherit;
  font-size: 0.9rem;
  line-height: 1.6;
}

/* ─── Mermaid 图表 ─── */
.md-rendered :deep(.mermaid-block) {
  margin: var(--space-4) 0;
  padding: var(--space-4);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  text-align: center;
  overflow-x: auto;
}

.md-rendered :deep(.mermaid-block svg) {
  max-width: 100%;
  height: auto;
}

/* ─── 引用 ─── */
.md-rendered :deep(blockquote) {
  border-left: 3px solid var(--color-accent);
  padding-left: var(--space-4);
  color: var(--color-text-secondary);
  margin: var(--space-4) 0;
  font-style: italic;
}

.md-rendered :deep(blockquote p:last-child) {
  margin-bottom: 0;
}

/* ─── 链接 ─── */
.md-rendered :deep(a) {
  color: var(--color-accent-text);
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ─── 列表 ─── */
.md-rendered :deep(ul),
.md-rendered :deep(ol) {
  padding-left: var(--space-6);
  margin: var(--space-3) 0;
}

.md-rendered :deep(ul) { list-style: disc; }
.md-rendered :deep(ol) { list-style: decimal; }

.md-rendered :deep(li) {
  margin-bottom: var(--space-1);
}

.md-rendered :deep(li > p) {
  margin-bottom: var(--space-1);
}

/* ─── 任务列表 ─── */
.md-rendered :deep(.task-list-item) {
  list-style: none;
  position: relative;
  padding-left: var(--space-2);
}

/* 重建 checkbox 外观（因全局 appearance:none 导致原生样式消失） */
.md-rendered :deep(.task-list-item input[type="checkbox"]) {
  appearance: none;
  -webkit-appearance: none;
  position: relative;
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-border-strong, var(--color-text-tertiary));
  border-radius: 4px;
  background: transparent;
  vertical-align: middle;
  margin-right: var(--space-2);
  cursor: pointer;
  transition: background-color 200ms ease-out,
              border-color 200ms ease-out,
              box-shadow 200ms ease-out;
  flex-shrink: 0;
  padding: 0;
}

/* 勾选标记 — 用伪元素画对勾 */
.md-rendered :deep(.task-list-item input[type="checkbox"])::after {
  content: '';
  position: absolute;
  top: 1px;
  left: 4px;
  width: 6px;
  height: 10px;
  border: solid transparent;
  border-width: 0 2.5px 2.5px 0;
  transform: rotate(45deg) scale(0);
  transition: transform 150ms ease-out,
              border-color 150ms ease-out;
}

/* Checked 状态 */
.md-rendered :deep(.task-list-item input[type="checkbox"]:checked) {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.md-rendered :deep(.task-list-item input[type="checkbox"]:checked)::after {
  border-color: #fff;
  transform: rotate(45deg) scale(1);
}

/* Hover */
@media (hover: hover) {
  .md-rendered :deep(.task-list-item input[type="checkbox"]:not(:checked):hover) {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px var(--color-accent-muted);
  }
}

/* Focus-visible */
.md-rendered :deep(.task-list-item input[type="checkbox"]:focus-visible) {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-accent-muted);
}

/* 已完成任务的文字变淡 + 删除线 */
.md-rendered :deep(.task-list-item.checked) {
  color: var(--color-text-tertiary);
  text-decoration: line-through;
}

/* ─── 分割线 ─── */
.md-rendered :deep(hr) {
  border: none;
  border-top: 1px solid var(--color-divider);
  margin: var(--space-6) 0;
}

/* ─── 表格 ─── */
.md-rendered :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: var(--space-4) 0;
  font-size: 0.9rem;
}

.md-rendered :deep(th),
.md-rendered :deep(td) {
  border: 1px solid var(--color-border);
  padding: var(--space-2) var(--space-3);
  text-align: left;
}

.md-rendered :deep(th) {
  background: var(--color-bg-tertiary);
  font-weight: 600;
}

.md-rendered :deep(tr:nth-child(even)) {
  background: var(--color-bg-secondary);
}

/* ─── 图片 ─── */
.md-rendered :deep(img) {
  max-width: 100%;
  border-radius: var(--radius-md);
  margin: var(--space-3) 0;
}

/* ─── highlight.js 覆盖 ─── */
.md-rendered :deep(.hljs) {
  background: var(--color-bg-tertiary) !important;
  /* 不覆盖 color — 让 highlight.js 主题的 .hljs-keyword 等语法色正常生效 */
}


/* ─── KaTeX 公式 ─── */
.md-rendered :deep(.katex-display) {
  margin: var(--space-4) 0;
  overflow-x: auto;
}

/* ─── 双向链接 ─── */
.md-rendered :deep(.wiki-link) {
  color: var(--color-accent);
  text-decoration: none;
  border-bottom: 1px dashed var(--color-accent);
  padding-bottom: 1px;
  cursor: pointer;
  transition: opacity var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .md-rendered :deep(.wiki-link:hover) {
    opacity: 0.8;
    border-bottom-style: solid;
  }
}
</style>
