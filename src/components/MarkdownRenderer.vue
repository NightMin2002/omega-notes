<script setup lang="ts">
/**
 * MarkdownRenderer — Markdown → HTML 渲染
 * 用于笔记详情的阅读模式 + 分屏实时预览
 * 支持 [[title]] 双向链接语法
 */
import { computed, onMounted, onUpdated, ref } from 'vue'
import { useRouter } from 'vue-router'
import MarkdownIt from 'markdown-it'
import highlightjs from 'markdown-it-highlightjs'
import texmath from 'markdown-it-texmath'
import taskLists from 'markdown-it-task-lists'
import katex from 'katex'
import { useNotesStore } from '../stores/notes'
import 'highlight.js/styles/github-dark.min.css'

const props = defineProps<{
  content: string
}>()

const router = useRouter()
const notesStore = useNotesStore()
const containerRef = ref<HTMLElement | null>(null)

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
})

md.use(highlightjs)
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

/** 点击 wiki-link 导航到对应笔记 */
function handleClick(e: Event) {
  const target = e.target as HTMLElement
  if (!target.classList.contains('wiki-link')) return

  e.preventDefault()
  const title = target.getAttribute('data-wiki-title')
  if (!title) return

  const note = notesStore.findNoteByTitle(title)
  if (note) {
    notesStore.recordOpen(note.id)
    router.push(`/note/${note.id}`)
  }
}

function bindClickHandler() {
  containerRef.value?.addEventListener('click', handleClick)
}

onMounted(bindClickHandler)
onUpdated(bindClickHandler)
</script>

<template>
  <div ref="containerRef" class="md-rendered" v-html="rendered" />
</template>

<style scoped>
.md-rendered {
  line-height: 1.8;
  color: var(--color-text-primary);
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

.md-rendered :deep(.task-list-item input[type="checkbox"]) {
  margin-right: var(--space-2);
  accent-color: var(--color-accent);
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
  color: var(--color-text-primary) !important;
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
