<script setup lang="ts">
/**
 * HomeView — 效率中心
 * 聚合个人的工作流：时间问候、任务环、以及日程快捷操作
 */
import { computed } from 'vue'
import { useTasksStore } from '../stores/tasks'
import { useTodosStore } from '../stores/todos'
import { useNotesStore } from '../stores/notes'
import { useRouter } from 'vue-router'

const tasksStore = useTasksStore()
const todosStore = useTodosStore()
const notesStore = useNotesStore()
const router = useRouter()

/* ─── 动态时间问候 ─── */
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了，注意休息'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  if (h < 22) return '晚上好'
  return '夜深了，注意休息'
})

// 分离年份、月份、星期等以供高级排版
const dateParts = computed(() => {
  const d = new Date()
  return {
    year: d.getFullYear(),
    monthAndDay: d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }),
    weekday: d.toLocaleDateString('zh-CN', { weekday: 'long' })
  }
})

/* ─── 今日效率数据 ─── */
const taskTotal = computed(() => tasksStore.totalCount)
const taskDone = computed(() => tasksStore.completedCount)
const taskPercent = computed(() => {
  if (taskTotal.value === 0) return 0
  return Math.round((taskDone.value / taskTotal.value) * 100)
})

/* 环形进度条参数 - 扩大尺寸 */
const RING_R = 54
const RING_C = 2 * Math.PI * RING_R
const ringOffset = computed(() => RING_C - (RING_C * taskPercent.value) / 100)

/* 进度环完成状态 */
const isAllDone = computed(() => taskTotal.value > 0 && taskPercent.value === 100)

/* ─── 今日统计亮点 ─── */
const todayStats = computed(() => [
  { label: '待办', value: todosStore.pendingCount, color: 'var(--color-accent)' },
  { label: '逾期', value: todosStore.overdueCount, color: 'var(--color-danger)' },
  { label: '笔记', value: notesStore.totalCount, color: 'var(--color-success)' },
])
</script>

<template>
  <div class="home-page">
    
    <!-- 全屏宽度的超级视觉看板 -->
    <section class="mega-hero">
      <!-- 动态光效装饰 -->
      <div class="hero-glow hero-glow-1" aria-hidden="true"></div>
      <div class="hero-glow hero-glow-2" aria-hidden="true"></div>

      <div class="hero-content">
        <div class="hero-text-block">
          <div class="date-badge">
            <span class="db-year">{{ dateParts.year }}</span>
            <span class="db-dot">•</span>
            <span class="db-md">{{ dateParts.monthAndDay }}</span>
            <span class="db-dot">•</span>
            <span class="db-wk">{{ dateParts.weekday }}</span>
          </div>
          <h1 class="hero-greeting">{{ greeting }}</h1>
          <p class="hero-subline">掌控今日，稳步向前。开启你的高效时间。</p>

          <!-- 今日数据亮点 -->
          <div class="stats-chips">
            <div
              v-for="stat in todayStats"
              :key="stat.label"
              class="stat-chip"
            >
              <span class="chip-dot" :style="{ background: stat.color }"></span>
              <span class="chip-value">{{ stat.value }}</span>
              <span class="chip-label">{{ stat.label }}</span>
            </div>
          </div>
        </div>

        <div class="hero-interactive">
          <!-- 今日任务超级进度环 -->
          <div class="mega-ring-wrapper" :class="{ 'all-done': isAllDone }" @click="router.push('/tasks')">
            <svg class="mega-ring" viewBox="0 0 120 120">
              <defs>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="var(--color-accent-hover)" />
                  <stop offset="100%" stop-color="var(--color-accent)" />
                </linearGradient>
                <linearGradient id="ringGradDone" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="var(--color-success)" />
                  <stop offset="100%" stop-color="#22d3ee" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <circle class="ring-bg" cx="60" cy="60" :r="RING_R" />
              <circle
                class="ring-progress"
                cx="60" cy="60" :r="RING_R"
                :stroke-dasharray="RING_C"
                :stroke-dashoffset="ringOffset"
                :stroke="isAllDone ? 'url(#ringGradDone)' : 'url(#ringGrad)'"
                filter="url(#glow)"
              />
            </svg>
            <div class="ring-data">
              <span class="ring-pct" :class="{ done: isAllDone }">{{ taskTotal > 0 ? taskPercent : 0 }}<small>%</small></span>
              <span class="ring-count">{{ taskDone }} / {{ taskTotal }} 任务</span>
              <span v-if="isAllDone" class="ring-complete-text">🎉 全部完成</span>
            </div>
            
            <!-- 环绕悬浮光晕 -->
            <div class="ring-halo" :class="{ 'halo-done': isAllDone }"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- 效率行动指南 -->
    <section class="action-grid">
      <RouterLink to="/tasks" class="action-card primary">
        <div class="ac-glow" aria-hidden="true"></div>
        <div class="ac-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>
        <div class="ac-text">
          <h3>日常打卡</h3>
          <p>检查并完成今日循环习惯</p>
        </div>
        <div class="ac-arrow">→</div>
      </RouterLink>

      <RouterLink to="/todos" class="action-card secondary">
        <div class="ac-glow" aria-hidden="true"></div>
        <div class="ac-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="M9 16l2 2 4-4" />
          </svg>
          <span v-if="todosStore.overdueCount > 0" class="todos-badge">{{ todosStore.overdueCount }}</span>
        </div>
        <div class="ac-text">
          <h3>待办事项</h3>
          <p>规划里程碑与一次性任务</p>
        </div>
        <div class="ac-arrow">→</div>
      </RouterLink>

      <RouterLink to="/write" class="action-card tertiary">
        <div class="ac-glow" aria-hidden="true"></div>
        <div class="ac-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </div>
        <div class="ac-text">
          <h3>新建笔记</h3>
          <p>记录灵感与知识沉淀</p>
        </div>
        <div class="ac-arrow">→</div>
      </RouterLink>

      <RouterLink to="/notes" class="action-card quaternary">
        <div class="ac-glow" aria-hidden="true"></div>
        <div class="ac-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </div>
        <div class="ac-text">
          <h3>知识库</h3>
          <p>浏览全部笔记与分类</p>
        </div>
        <div class="ac-arrow">→</div>
      </RouterLink>
    </section>

  </div>
</template>

<style scoped>
.home-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-8) var(--space-12);
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

/* ─── Mega Hero Section ─── */
.mega-hero {
  position: relative;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--space-12) var(--space-12);
  min-height: 320px;
  display: flex;
  align-items: center;
  border: 1px solid var(--color-glass-border);
  box-shadow: 0 40px 80px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  overflow: hidden;
}

/* 背景全息质感渐变 */
.mega-hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, transparent 70%),
              radial-gradient(circle at 85% 50%, oklch(70% 0.1 260 / 0.1) 0%, transparent 60%);
  pointer-events: none;
  z-index: 0;
}

[data-theme='dark'] .mega-hero::before {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, transparent 70%),
              radial-gradient(circle at 85% 50%, oklch(50% 0.15 260 / 0.15) 0%, transparent 60%);
}

/* 动态浮动光效 */
.hero-glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
  filter: blur(80px);
  opacity: 0.3;
}

.hero-glow-1 {
  width: 300px;
  height: 300px;
  background: var(--color-accent);
  top: -80px;
  right: -60px;
  animation: float-glow-1 8s ease-in-out infinite;
}

.hero-glow-2 {
  width: 200px;
  height: 200px;
  background: oklch(70% 0.15 320);
  bottom: -60px;
  left: 10%;
  animation: float-glow-2 10s ease-in-out infinite;
}

@keyframes float-glow-1 {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; }
  50% { transform: translate(-30px, 20px) scale(1.1); opacity: 0.35; }
}

@keyframes float-glow-2 {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.2; }
  50% { transform: translate(20px, -15px) scale(1.15); opacity: 0.3; }
}

[data-theme='light'] .hero-glow {
  opacity: 0.12;
}

.hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: var(--space-10);
}

.hero-text-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 65%;
}

.date-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  margin-bottom: var(--space-6);
  font-family: var(--font-mono);
  font-size: 0.9rem;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
  box-shadow: var(--shadow-sm);
}

.db-year {
  color: var(--color-text-primary);
  font-weight: 700;
}

.db-dot {
  color: var(--color-border-strong);
  opacity: 0.5;
}

.hero-greeting {
  font-size: clamp(3rem, 7vw, 4.5rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  background: linear-gradient(135deg, var(--color-text-primary) 20%, var(--color-text-tertiary) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: var(--space-4);
  line-height: 1.1;
}

.hero-subline {
  font-size: 1.15rem;
  color: var(--color-text-secondary);
  font-weight: 400;
  line-height: 1.8;
  max-width: 80%;
  margin-bottom: var(--space-6);
}

/* ─── 今日数据亮点 Chips ─── */
.stats-chips {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  transition: transform var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .stat-chip:hover {
    transform: translateY(-1px);
    border-color: var(--color-border-strong);
  }
}

.chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.chip-value {
  font-weight: 700;
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: 0.85rem;
}

.chip-label {
  font-weight: 500;
}

/* ─── Mega Ring ─── */
.hero-interactive {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: var(--space-4);
}

.mega-ring-wrapper {
  position: relative;
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform var(--duration-normal) cubic-bezier(0.34, 1.56, 0.64, 1);
}

@media (hover: hover) {
  .mega-ring-wrapper:hover {
    transform: scale(1.05) translateY(-5px);
  }
  .mega-ring-wrapper:hover .ring-halo {
    opacity: 0.8;
    transform: scale(1.1);
  }
}

.mega-ring-wrapper:active {
  transform: scale(0.98);
}

.mega-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  z-index: 2;
}

.ring-bg {
  fill: var(--color-surface);
  stroke: var(--color-border);
  stroke-width: 10;
}

.ring-progress {
  fill: none;
  stroke-width: 10;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1);
}

.ring-data {
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ring-pct {
  font-size: 2.2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text-primary);
  line-height: 1;
  transition: color var(--duration-normal) var(--ease-out);
}

.ring-pct.done {
  background: linear-gradient(135deg, var(--color-success) 0%, #22d3ee 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.ring-pct small {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
  margin-left: 2px;
  -webkit-text-fill-color: var(--color-text-tertiary);
}

.ring-count {
  font-size: 0.9rem;
  color: var(--color-text-tertiary);
  margin-top: 6px;
  font-weight: 500;
}

.ring-complete-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-success);
  margin-top: 4px;
  animation: celebrate-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes celebrate-in {
  from { opacity: 0; transform: scale(0.6) translateY(4px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.ring-halo {
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  background: radial-gradient(circle closest-side, var(--color-accent-muted), transparent);
  opacity: 0.4;
  z-index: 1;
  transition: opacity var(--duration-normal) var(--ease-out),
              transform var(--duration-normal) var(--ease-out);
  pointer-events: none;
  animation: halo-breathe 4s ease-in-out infinite;
}

.ring-halo.halo-done {
  background: radial-gradient(circle closest-side, rgba(74, 222, 128, 0.25), transparent);
}

@keyframes halo-breathe {
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(1.05); }
}

/* ─── Action Grid ─── */
.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-6);
}

.action-card {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-6) var(--space-8);
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-glass-border);
  text-decoration: none;
  position: relative;
  overflow: hidden;
  transition: transform var(--duration-normal) var(--ease-out),
              box-shadow var(--duration-normal) var(--ease-out),
              border-color var(--duration-normal) var(--ease-out);
}

.action-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom right, rgba(255, 255, 255, 0.04), transparent);
  pointer-events: none;
}

/* 卡片顶部渐变色带 */
.action-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  opacity: 0;
  transition: opacity var(--duration-normal) var(--ease-out);
}

.action-card.primary::after {
  background: linear-gradient(90deg, var(--color-accent), var(--color-accent-hover));
  opacity: 1;
}

.action-card.secondary::after {
  background: linear-gradient(90deg, var(--color-warning), #f59e0b);
}

.action-card.tertiary::after {
  background: linear-gradient(90deg, var(--color-success), #22d3ee);
}

.action-card.quaternary::after {
  background: linear-gradient(90deg, oklch(70% 0.15 320), oklch(65% 0.2 280));
}

/* 悬浮底光 */
.ac-glow {
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  height: 40px;
  border-radius: 50%;
  filter: blur(20px);
  opacity: 0;
  transition: opacity var(--duration-normal) var(--ease-out);
  pointer-events: none;
}

.action-card.primary .ac-glow {
  background: var(--color-accent);
}

.action-card.secondary .ac-glow {
  background: var(--color-warning);
}

.action-card.tertiary .ac-glow {
  background: var(--color-success);
}

.action-card.quaternary .ac-glow {
  background: oklch(65% 0.2 280);
}

@media (hover: hover) {
  .action-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
    border-color: var(--color-border-strong);
  }
  .action-card:hover .ac-arrow {
    transform: translateX(6px);
    opacity: 1;
  }
  .action-card:hover::after {
    opacity: 1;
  }
  .action-card:hover .ac-glow {
    opacity: 0.15;
  }
}

.ac-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  flex-shrink: 0;
  box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.05);
  transition: transform var(--duration-normal) var(--ease-spring);
}

@media (hover: hover) {
  .action-card:hover .ac-icon {
    transform: scale(1.08);
  }
}

.action-card.primary .ac-icon {
  background: var(--color-accent);
  color: var(--color-text-inverse);
  box-shadow: 0 8px 16px var(--color-accent-muted);
}

.action-card.secondary .ac-icon {
  background: var(--color-warning);
  color: var(--color-text-inverse);
  box-shadow: 0 8px 16px var(--color-warning-muted);
}

.action-card.tertiary .ac-icon {
  background: var(--color-success);
  color: var(--color-text-inverse);
  box-shadow: 0 8px 16px var(--color-success-muted);
}

.action-card.quaternary .ac-icon {
  background: oklch(60% 0.18 280);
  color: white;
  box-shadow: 0 8px 16px rgba(120, 80, 220, 0.2);
}

.todos-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: var(--color-danger, #ef4444);
  color: white;
  font-size: 0.8rem;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: var(--radius-full);
  box-shadow: 0 4px 8px rgba(239, 68, 68, 0.4);
}

.ac-text {
  flex: 1;
}

.ac-text h3 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
}

.ac-text p {
  font-size: 0.88rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.ac-arrow {
  margin-left: auto;
  font-size: 1.5rem;
  color: var(--color-text-tertiary);
  opacity: 0.4;
  transition: transform var(--duration-fast) var(--ease-out),
              opacity var(--duration-fast) var(--ease-out);
}

/* ─── Responsive ─── */
@media (max-width: 768px) {
  .hero-content {
    flex-direction: column;
    align-items: flex-start;
    text-align: center;
  }
  
  .hero-text-block {
    max-width: 100%;
    align-items: center;
  }

  .stats-chips {
    justify-content: center;
  }
  
  .mega-hero {
    padding: var(--space-6);
  }

  .date-badge {
    margin: 0 auto var(--space-4) auto;
  }
  
  .hero-interactive {
    margin: 0 auto;
    width: 100%;
  }

  .action-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 960px) {
  .action-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
