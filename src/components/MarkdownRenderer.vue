<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, onUpdated, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import texmath from 'markdown-it-texmath'
import taskLists from 'markdown-it-task-lists'
import katex from 'katex'
import DOMPurify from 'dompurify'
import { useNotesStore } from '../stores/notes'
import { openUrl } from '@tauri-apps/plugin-opener'
import mermaid from 'mermaid'
import ImageLightbox from './ImageLightbox.vue'
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

/* ─── 灯箱状态 ─── */
const lightboxOpen = ref(false)
const lightboxSrc = ref('')
const lightboxSvgContent = ref('')
const lightboxAlt = ref('')

function openImageLightbox(src: string, alt?: string) {
  lightboxSrc.value = src
  lightboxSvgContent.value = ''
  lightboxAlt.value = alt || ''
  lightboxOpen.value = true
}

function openMermaidLightbox(svgHtml: string) {
  lightboxSrc.value = ''
  lightboxSvgContent.value = svgHtml
  lightboxAlt.value = 'Mermaid 图表'
  lightboxOpen.value = true
}

function closeLightbox() {
  lightboxOpen.value = false
}

let mermaidIdCounter = 0

const md = new MarkdownIt({
  /* 启用 HTML 以支持 <details>/<summary>/<br> 等安全标签，DOMPurify 负责过滤危险内容 */
  html: true,
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

/**
 * DOMPurify 配置 —— 允许所有安全的 Markdown / HTML 标签，
 * 同时抹除 <script>/<style>/<iframe>/<form>/<input>/<select> 等危险元素。
 * DOMPurify 默认已禁用 script/style/iframe，此处通过 ADD_TAGS 显式添加
 * Markdown 文档中常见的语义化扩展标签。
 */
const purifyConfig = {
  /* 在 DOMPurify 默认白名单基础上额外允许的标签 */
  /* input 必须保留：markdown-it-task-lists 生成 <input type="checkbox"> */
  ADD_TAGS: ['details', 'summary', 'mark', 'kbd', 'abbr', 'ruby', 'rt', 'rp', 'var', 'samp', 'dfn', 'ins', 'input'],
  /* 额外允许的属性（含 checkbox 所需的 type/checked/disabled） */
  ADD_ATTR: ['open', 'class', 'id', 'data-wiki-title', 'data-mermaid-processed', 'type', 'checked', 'disabled', 'data-bound'],
  /* 显式禁止的危险标签（DOMPurify 默认已禁止，此处做双重保险） */
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'select', 'textarea', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  RETURN_DOM: false as const,
  RETURN_DOM_FRAGMENT: false as const,
}

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

const rendered = computed(() => {
  const rawHtml = md.render(cleanContent(props.content))
  const safeHtml = DOMPurify.sanitize(rawHtml, purifyConfig) as string
  return renderWikiLinks(safeHtml)
})

/** 点击 wiki-link 导航到对应笔记，点击外部链接用系统浏览器打开，点击图片/Mermaid 打开灯箱 */
function handleClick(e: Event) {
  const el = e.target as HTMLElement

  /* 图片点击 → 灯箱 */
  if (el.tagName === 'IMG') {
    e.preventDefault()
    const img = el as HTMLImageElement
    openImageLightbox(img.src, img.alt)
    return
  }

  /* Mermaid 图表点击 → 灯箱 */
  const mermaidBlock = el.closest('.mermaid-block') as HTMLElement | null
  if (mermaidBlock) {
    const svg = mermaidBlock.querySelector('svg')
    if (svg) {
      e.preventDefault()
      openMermaidLightbox(mermaidBlock.innerHTML)
      return
    }
  }

  const target = el.closest('a') as HTMLAnchorElement | null
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
onUnmounted(() => {
  containerRef.value?.removeEventListener('click', handleClick)
})
</script>

<template>
  <div ref="containerRef" class="md-rendered" v-html="rendered" />
  <ImageLightbox
    :open="lightboxOpen"
    :src="lightboxSrc"
    :svg-content="lightboxSvgContent"
    :alt="lightboxAlt"
    @close="closeLightbox"
  />
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
  cursor: zoom-in;
  position: relative;
  transition: box-shadow 200ms ease-out,
              border-color 200ms ease-out;
}

@media (hover: hover) {
  .md-rendered :deep(.mermaid-block:hover) {
    border-color: var(--color-accent-muted);
    box-shadow: 0 4px 16px oklch(0% 0 0 / 0.1),
                0 0 0 1px var(--color-accent-muted);
  }
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
.md-rendered :deep(.task-list-item:has(input:checked)) {
  color: var(--color-text-tertiary);
  text-decoration: line-through;
}

/* ─── 折叠面板 (details/summary) ─── */
.md-rendered :deep(details) {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin: var(--space-4) 0;
  padding: 0;
  overflow: hidden;
  background: var(--color-bg-secondary);
  transition: background-color 200ms ease-out,
              border-color 200ms ease-out;
}

.md-rendered :deep(details[open]) {
  background: var(--color-bg-primary, var(--color-bg-secondary));
}

.md-rendered :deep(details summary) {
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  font-weight: 600;
  color: var(--color-text-primary);
  user-select: none;
  list-style: none;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  transition: background-color 200ms ease-out,
              color 200ms ease-out;
}

/* 移除默认三角 */
.md-rendered :deep(details summary::-webkit-details-marker) {
  display: none;
}

/* 自定义展开/收起箭头 */
.md-rendered :deep(details summary)::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  border-right: 2px solid var(--color-text-secondary);
  border-bottom: 2px solid var(--color-text-secondary);
  transform: rotate(-45deg);
  transition: transform 200ms ease-out;
  flex-shrink: 0;
}

.md-rendered :deep(details[open] > summary)::before {
  transform: rotate(45deg);
}

@media (hover: hover) {
  .md-rendered :deep(details summary:hover) {
    background: var(--color-bg-tertiary);
  }
}

.md-rendered :deep(details summary:focus-visible) {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-accent-muted);
}

/* details 内容区域 */
.md-rendered :deep(details > *:not(summary)) {
  padding-left: var(--space-4);
  padding-right: var(--space-4);
}

.md-rendered :deep(details > p:last-child),
.md-rendered :deep(details > ul:last-child),
.md-rendered :deep(details > ol:last-child) {
  padding-bottom: var(--space-3);
}

/* ─── 分割线 ─── */
.md-rendered :deep(hr) {
  border: none;
  border-top: 1px solid var(--color-divider);
  margin: var(--space-6) 0;
}

/* ─── mark 高亮 ─── */
.md-rendered :deep(mark) {
  background: oklch(85% 0.15 85);
  color: oklch(25% 0.02 85);
  padding: 0.1em 0.3em;
  border-radius: 3px;
}

[data-theme='dark'] .md-rendered :deep(mark) {
  background: oklch(45% 0.12 85);
  color: oklch(92% 0.02 85);
}

/* ─── kbd 键盘按键 ─── */
.md-rendered :deep(kbd) {
  font-family: var(--font-mono);
  font-size: 0.85em;
  padding: 0.15em 0.5em;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-tertiary);
  box-shadow: 0 1px 2px oklch(0% 0 0 / 0.1),
              inset 0 -1px 0 oklch(0% 0 0 / 0.08);
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
  cursor: zoom-in;
  transition: box-shadow 200ms ease-out,
              transform 200ms ease-out;
}

@media (hover: hover) {
  .md-rendered :deep(img:hover) {
    box-shadow: 0 4px 20px oklch(0% 0 0 / 0.15),
                0 0 0 2px var(--color-accent-muted);
    transform: translateY(-1px);
  }
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
