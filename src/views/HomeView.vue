<script setup lang="ts">
/**
 * HomeView — 指挥中心
 * 集合问候、今日任务进度、统计、快速操作、最近笔记
 */
import { computed } from 'vue'
import { useNotesStore } from '../stores/notes'
import { useTasksStore } from '../stores/tasks'

const notesStore = useNotesStore()
const tasksStore = useTasksStore()

/* ─── 时间问候 ─── */
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了，注意休息'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  if (h < 22) return '晚上好'
  return '夜深了，注意休息'
})

const todayDate = computed(() => {
  const d = new Date()
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
})

/* ─── 统计 ─── */
const stats = computed(() => ({
  total: notesStore.totalCount,
  pinned: notesStore.pinnedCount,
  favorites: notesStore.favoriteCount,
  categories: notesStore.categories.length,
}))

/* ─── 今日任务进度 ─── */
const taskTotal = computed(() => tasksStore.totalCount)
const taskDone = computed(() => tasksStore.completedCount)
const taskPercent = computed(() => {
  if (taskTotal.value === 0) return 0
  return Math.round((taskDone.value / taskTotal.value) * 100)
})

/* 环形进度条参数 */
const RING_R = 38
const RING_C = 2 * Math.PI * RING_R
const ringOffset = computed(() => RING_C - (RING_C * taskPercent.value) / 100)

/* ─── 最近笔记 ─── */
const recentNotes = computed(() =>
  [...notesStore.notes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6)
)

function formatTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  return `${days} 天前`
}
</script>

<template>
  <div class="home-page">
    <!-- 问候 + 日期 + 任务环 -->
    <section class="hero-row">
      <div class="hero-text">
        <h2 class="hero-title">{{ greeting }}</h2>
        <p class="hero-date">{{ todayDate }}</p>
      </div>

      <!-- 今日任务进度环 -->
      <RouterLink v-if="taskTotal > 0" to="/tasks" class="task-ring-link" title="查看今日任务">
        <svg class="task-ring" viewBox="0 0 90 90">
          <circle class="ring-bg" cx="45" cy="45" :r="RING_R" />
          <circle
            class="ring-progress"
            cx="45" cy="45" :r="RING_R"
            :stroke-dasharray="RING_C"
            :stroke-dashoffset="ringOffset"
          />
        </svg>
        <div class="ring-center">
          <span class="ring-pct">{{ taskPercent }}%</span>
          <span class="ring-label">{{ taskDone }}/{{ taskTotal }}</span>
        </div>
      </RouterLink>
    </section>

    <!-- 统计卡片 -->
    <section class="stats-strip">
      <div class="stat-pill">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span class="stat-pill-val">{{ stats.total }}</span>
        <span class="stat-pill-label">笔记</span>
      </div>
      <div class="stat-pill">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <span class="stat-pill-val">{{ stats.categories }}</span>
        <span class="stat-pill-label">分类</span>
      </div>
      <div class="stat-pill">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <span class="stat-pill-val">{{ stats.favorites }}</span>
        <span class="stat-pill-label">收藏</span>
      </div>
      <div class="stat-pill">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="10" r="3" />
          <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" />
        </svg>
        <span class="stat-pill-val">{{ stats.pinned }}</span>
        <span class="stat-pill-label">置顶</span>
      </div>
    </section>

    <!-- 快速操作 -->
    <section class="quick-row">
      <RouterLink to="/write" class="qk-card qk-primary">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span>新建笔记</span>
      </RouterLink>
      <RouterLink to="/notes" class="qk-card">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <span>知识库</span>
      </RouterLink>
      <RouterLink to="/tasks" class="qk-card">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span>每日任务</span>
      </RouterLink>
    </section>

    <!-- 最近更新 -->
    <section v-if="recentNotes.length > 0" class="recent-section">
      <div class="section-head">
        <h3 class="section-title">最近更新</h3>
        <RouterLink to="/notes" class="section-more">查看全部 →</RouterLink>
      </div>
      <div class="recent-grid">
        <RouterLink
          v-for="note in recentNotes"
          :key="note.id"
          :to="`/note/${note.id}`"
          class="recent-card"
        >
          <span class="rc-title">{{ note.title || '未命名笔记' }}</span>
          <span class="rc-cat">{{ note.category }}</span>
          <span class="rc-time">{{ formatTime(note.updatedAt) }}</span>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  max-width: 860px;
  margin: 0 auto;
}

/* ─── Hero Row ─── */
.hero-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
  gap: var(--space-6);
}

.hero-title {
  font-size: clamp(1.5rem, 4vw, 2.25rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
}

.hero-date {
  color: var(--color-text-tertiary);
  font-size: 0.85rem;
}

/* ─── Task Ring ─── */
.task-ring-link {
  position: relative;
  width: 90px;
  height: 90px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .task-ring-link:hover {
    transform: scale(1.06);
  }
}

.task-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: var(--color-border);
  stroke-width: 5;
}

.ring-progress {
  fill: none;
  stroke: var(--color-accent);
  stroke-width: 5;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.6s var(--ease-out);
}

.ring-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  z-index: 1;
}

.ring-pct {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-accent);
  line-height: 1;
}

.ring-label {
  font-size: 0.65rem;
  color: var(--color-text-tertiary);
}

/* ─── Stats Strip ─── */
.stats-strip {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
}

.stat-pill {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-full);
  transition: transform var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .stat-pill:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }
}

.stat-pill svg {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.stat-pill-val {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.stat-pill-label {
  font-size: 0.78rem;
  color: var(--color-text-tertiary);
}

/* ─── Quick Actions ─── */
.quick-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-8);
}

.qk-card {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-lg);
  color: var(--color-text-primary);
  font-weight: 500;
  font-size: 0.88rem;
  transition: transform var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out),
              background-color var(--duration-fast) var(--ease-out);
}

.qk-card.qk-primary {
  background: var(--color-accent-muted);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

@media (hover: hover) {
  .qk-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  .qk-card.qk-primary:hover {
    box-shadow: var(--shadow-glow);
  }
}

.qk-card:active {
  transform: scale(0.97);
}

/* ─── Recent Section ─── */
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.section-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.section-more {
  font-size: 0.78rem;
  color: var(--color-accent);
  font-weight: 500;
  transition: opacity var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .section-more:hover {
    opacity: 0.75;
  }
}

.recent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-3);
}

.recent-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-md);
  transition: transform var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .recent-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
    border-color: var(--color-border-strong);
  }
}

.recent-card:active {
  transform: scale(0.98);
}

.rc-title {
  font-weight: 500;
  color: var(--color-text-primary);
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rc-cat {
  font-size: 0.72rem;
  color: var(--color-accent-text);
  background: var(--color-accent-muted);
  padding: 1px var(--space-2);
  border-radius: var(--radius-full);
  align-self: flex-start;
}

.rc-time {
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
}

/* ─── Responsive ─── */
@media (max-width: 640px) {
  .hero-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .task-ring-link {
    align-self: center;
  }

  .stats-strip {
    flex-wrap: wrap;
  }

  .quick-row {
    grid-template-columns: 1fr;
  }

  .recent-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ring-progress {
    transition: none;
  }
}
</style>
