<script setup lang="ts">
/**
 * MarkdownRenderer — Markdown → HTML 渲染
 * 用于笔记详情的阅读模式
 */
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import highlightjs from 'markdown-it-highlightjs'
import texmath from 'markdown-it-texmath'
import katex from 'katex'
import 'highlight.js/styles/github-dark.min.css'

const props = defineProps<{
  content: string
}>()

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
})

md.use(highlightjs)
md.use(texmath, { engine: katex, delimiters: 'dollars' })

const rendered = computed(() => md.render(props.content))
</script>

<template>
  <div class="md-rendered" v-html="rendered" />
</template>

<style scoped>
.md-rendered {
  line-height: 1.8;
  color: var(--color-text-primary);
  word-break: break-word;
}

.md-rendered :deep(h1),
.md-rendered :deep(h2),
.md-rendered :deep(h3),
.md-rendered :deep(h4) {
  color: var(--color-text-primary);
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-top: var(--space-6);
  margin-bottom: var(--space-3);
}

.md-rendered :deep(h1) { font-size: 1.75rem; }
.md-rendered :deep(h2) { font-size: 1.4rem; }
.md-rendered :deep(h3) { font-size: 1.15rem; }

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

.md-rendered :deep(code) {
  font-family: var(--font-mono);
  background: var(--color-bg-tertiary);
  color: var(--color-accent-text);
  padding: 0.15em 0.4em;
  border-radius: var(--radius-sm);
  font-size: 0.88em;
}

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

.md-rendered :deep(blockquote) {
  border-left: 3px solid var(--color-accent);
  padding-left: var(--space-4);
  color: var(--color-text-secondary);
  margin: var(--space-4) 0;
  font-style: italic;
}

.md-rendered :deep(a) {
  color: var(--color-accent-text);
  text-decoration: underline;
  text-underline-offset: 2px;
}

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

.md-rendered :deep(hr) {
  border: none;
  border-top: 1px solid var(--color-divider);
  margin: var(--space-6) 0;
}

.md-rendered :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: var(--space-4) 0;
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

.md-rendered :deep(img) {
  max-width: 100%;
  border-radius: var(--radius-md);
}

/* ─── highlight.js 暗色覆盖 ─── */
.md-rendered :deep(.hljs) {
  background: var(--color-bg-tertiary) !important;
  color: var(--color-text-primary) !important;
}
</style>
