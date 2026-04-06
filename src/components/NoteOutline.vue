<script setup lang="ts">
import { ref, computed, onUnmounted, watch, nextTick } from 'vue'

const props = defineProps<{
  content: string
  scrollContainer?: HTMLElement | null
}>()

interface Heading {
  level: number
  text: string
}

/** 从 Markdown 内容中提取标题（纯展示用） */
const headings = computed<Heading[]>(() => {
  if (!props.content) return []
  const lines = props.content.split('\n')
  const result: Heading[] = []
  let inCodeBlock = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue

    const match = trimmed.match(/^(#{1,4})\s+(.+)/)
    if (match && match[1] && match[2]) {
      const text = match[2]
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .trim()
      result.push({ level: match[1].length, text })
    }
  }
  return result
})

const hasToc = computed(() => headings.value.length >= 2)

/** 当前激活的标题索引（-1 = 无） */
const activeIndex = ref(-1)

/** 字数统计 */
const wordCount = computed(() => {
  if (!props.content) return 0
  const chinese = (props.content.match(/[\u4e00-\u9fff]/g) || []).length
  const english = (props.content.match(/[a-zA-Z]+/g) || []).length
  return chinese + english
})

/** 段落数 */
const paragraphCount = computed(() => {
  if (!props.content) return 0
  return props.content.split(/\n\s*\n/).filter(p => p.trim()).length
})

/** 预计阅读时间 */
const readingTime = computed(() => Math.max(1, Math.ceil(wordCount.value / 300)))

/** 阅读进度 */
const readProgress = ref(0)

/** 获取渲染区域内的标题 DOM 元素 */
function getRenderedHeadings(): HTMLElement[] {
  if (!props.scrollContainer) return []
  const rendered = props.scrollContainer.querySelector('.md-rendered, .source-raw')
  if (!rendered) return []
  return Array.from(rendered.querySelectorAll('h1, h2, h3, h4')) as HTMLElement[]
}

/** 通过索引滚动到指定标题 */
function scrollToHeading(index: number) {
  if (!props.scrollContainer) return
  const container = props.scrollContainer
  const elements = getRenderedHeadings()
  const el = elements[index]
  if (!el) return

  const containerRect = container.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  const scrollTop = container.scrollTop + (elRect.top - containerRect.top) - 80
  container.scrollTo({ top: scrollTop, behavior: 'smooth' })
}

/** 滚动追踪 + 进度 + 当前章节 */
function onScroll() {
  const container = props.scrollContainer
  if (!container) return

  // 阅读进度
  const scrollable = container.scrollHeight - container.clientHeight
  readProgress.value = scrollable > 0 ? Math.round((container.scrollTop / scrollable) * 100) : 0

  if (!hasToc.value) return
  const elements = getRenderedHeadings()
  if (elements.length === 0) return

  // 到底部 → 高亮最后一个
  const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 5
  if (isAtBottom) {
    activeIndex.value = elements.length - 1
    return
  }

  // 核心逻辑：找到最后一个 top <= 容器顶部 + 100px 的标题
  const containerTop = container.getBoundingClientRect().top
  let current = -1
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i]
    if (el && el.getBoundingClientRect().top <= containerTop + 100) {
      current = i
    }
  }
  activeIndex.value = current
}

let scrollEl: HTMLElement | null = null

watch(() => props.scrollContainer, (el) => {
  if (scrollEl) scrollEl.removeEventListener('scroll', onScroll)
  scrollEl = el || null
  if (scrollEl) {
    scrollEl.addEventListener('scroll', onScroll, { passive: true })
    nextTick(onScroll)
  }
}, { immediate: true })

onUnmounted(() => {
  if (scrollEl) scrollEl.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <aside class="note-outline">
    <!-- 统计卡片 -->
    <div class="outline-stats-card">
      <div class="stat-row">
        <span class="stat-item">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          {{ wordCount.toLocaleString() }} 字
        </span>
        <span class="stat-sep">·</span>
        <span class="stat-item">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          约 {{ readingTime }} 分钟
        </span>
      </div>
      <div class="stat-row stat-row--secondary">
        <span class="stat-item">{{ paragraphCount }} 段落</span>
        <span v-if="hasToc" class="stat-item">{{ headings.length }} 章节</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: readProgress + '%' }" />
      </div>
    </div>

    <!-- 目录导航 -->
    <template v-if="hasToc">
      <div class="outline-label">目录</div>
      <nav class="outline-nav">
        <button
          v-for="(h, idx) in headings"
          :key="idx"
          class="outline-item"
          :class="[
            `level-${h.level}`,
            {
              active: activeIndex === idx,
              'near-1': activeIndex >= 0 && Math.abs(idx - activeIndex) === 1,
              'near-2': activeIndex >= 0 && Math.abs(idx - activeIndex) === 2,
            }
          ]"
          @click="scrollToHeading(idx)"
        >
          <span class="outline-indicator" />
          <span class="outline-text">{{ h.text }}</span>
        </button>
      </nav>
    </template>

    <!-- 无目录提示 -->
    <div v-else class="outline-empty">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-icon">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="15" y2="12" />
        <line x1="3" y1="18" x2="9" y2="18" />
      </svg>
      <span class="empty-text">使用 Markdown 标题<br>（# 标题）即可生成目录</span>
    </div>
  </aside>
</template>

<style scoped>
.note-outline {
  position: sticky;
  top: var(--space-6);
  max-height: calc(100vh - 200px);
  width: 200px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* ─── 统计卡片 ─── */
.outline-stats-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.stat-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.stat-row--secondary { opacity: 0.7; }

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

.stat-sep {
  color: var(--color-text-tertiary);
  opacity: 0.4;
  font-size: 0.7rem;
}

/* ─── 进度条 ─── */
.progress-track {
  height: 2px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-top: var(--space-1);
}

.progress-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: var(--radius-full);
  transition: width 150ms var(--ease-out);
  min-width: 0;
}

/* ─── 目录标签 ─── */
.outline-label {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
  padding: 0 var(--space-1);
}

/* ─── 导航列表 ─── */
.outline-nav {
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow-y: auto;
  max-height: calc(100vh - 420px);
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}

.outline-nav::-webkit-scrollbar { width: 3px; }
.outline-nav::-webkit-scrollbar-track { background: transparent; }
.outline-nav::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: var(--radius-full);
}

/* ─── 单个项目 ─── */
.outline-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: 4px var(--space-2);
  border-radius: var(--radius-sm);
  text-align: left;
  font-size: 0.72rem;
  line-height: 1.45;
  color: var(--color-text-tertiary);
  transition: color var(--duration-fast) var(--ease-out),
              background-color var(--duration-fast) var(--ease-out);
}

.outline-item.level-1 { padding-left: var(--space-2); }
.outline-item.level-2 { padding-left: var(--space-4); }
.outline-item.level-3 { padding-left: var(--space-6); }
.outline-item.level-4 { padding-left: var(--space-8); }

.outline-item.level-1 { font-weight: 600; color: var(--color-text-secondary); }
.outline-item.level-2 { font-weight: 500; }

.outline-indicator {
  width: 4px;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--color-border);
  flex-shrink: 0;
  margin-top: 6px;
  transition: background-color var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
}

.outline-text {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.outline-item.active {
  color: var(--color-accent);
  background: var(--color-accent-muted);
}

/* 邻近高亮：距离 1 */
.outline-item.near-1 {
  color: color-mix(in oklch, var(--color-accent), var(--color-text-tertiary) 50%);
  background: color-mix(in oklch, var(--color-accent-muted), transparent 60%);
}

.outline-item.near-1 .outline-indicator {
  background: color-mix(in oklch, var(--color-accent), var(--color-border) 50%);
  transform: scale(1.2);
}

/* 邻近高亮：距离 2 */
.outline-item.near-2 {
  color: color-mix(in oklch, var(--color-accent), var(--color-text-tertiary) 80%);
}

.outline-item.near-2 .outline-indicator {
  background: color-mix(in oklch, var(--color-accent), var(--color-border) 75%);
  transform: scale(1.1);
}

.outline-item.active .outline-indicator {
  background: var(--color-accent);
  transform: scale(1.5);
}

@media (hover: hover) {
  .outline-item:not(.active):hover {
    color: var(--color-text-primary);
    background: var(--color-bg-hover);
  }
  .outline-item:not(.active):hover .outline-indicator {
    background: var(--color-text-tertiary);
  }
}

.outline-item:active { transform: scale(0.98); }

.outline-item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-accent-muted);
}

/* ─── 无目录提示 ─── */
.outline-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-3);
  text-align: center;
}

.empty-icon {
  color: var(--color-text-tertiary);
  opacity: 0.35;
}

.empty-text {
  font-size: 0.65rem;
  line-height: 1.5;
  color: var(--color-text-tertiary);
  opacity: 0.6;
}

/* ─── 响应式 ─── */
@media (max-width: 1100px) {
  .note-outline { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .progress-fill { transition: none; }
}
</style>
