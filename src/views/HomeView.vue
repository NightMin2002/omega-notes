<script setup lang="ts">
/**
 * HomeView — 效率中心
 * 聚合个人的工作流：时间问候、任务环、以及日程快捷操作
 */
import { computed } from 'vue'
import { useTasksStore } from '../stores/tasks'
import { useTodosStore } from '../stores/todos'
import { useRouter } from 'vue-router'

const tasksStore = useTasksStore()
const todosStore = useTodosStore()
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
</script>

<template>
  <div class="home-page">
    
    <!-- 全屏宽度的超级视觉看板 -->
    <section class="mega-hero">
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
        </div>

        <div class="hero-interactive">
          <!-- 今日任务超级进度环 -->
          <div class="mega-ring-wrapper" @click="router.push('/tasks')">
            <svg class="mega-ring" viewBox="0 0 120 120">
              <defs>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="var(--color-accent-hover)" />
                  <stop offset="100%" stop-color="var(--color-accent)" />
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
                stroke="url(#ringGrad)"
                filter="url(#glow)"
              />
            </svg>
            <div class="ring-data">
              <span class="ring-pct">{{ taskTotal > 0 ? taskPercent : 0 }}<small>%</small></span>
              <span class="ring-count">{{ taskDone }} / {{ taskTotal }} 任务</span>
            </div>
            
            <!-- 环绕悬浮光晕 -->
            <div class="ring-halo"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- 效率行动指南 -->
    <section class="action-grid">
      <RouterLink to="/tasks" class="action-card primary">
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
    </section>

  </div>
</template>

<style scoped>
.home-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
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
  margin-bottom: var(--space-8);
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
  font-size: 1.25rem;
  color: var(--color-text-secondary);
  font-weight: 400;
  line-height: 1.8;
  max-width: 80%;
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
}

.ring-pct small {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
  margin-left: 2px;
}

.ring-count {
  font-size: 0.9rem;
  color: var(--color-text-tertiary);
  margin-top: 6px;
  font-weight: 500;
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
}

/* ─── Action Grid ─── */
.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: var(--space-8);
}

.action-card {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-8);
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
}

.ac-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  flex-shrink: 0;
  box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.05);
}

.action-card.primary .ac-icon {
  background: var(--color-accent);
  color: var(--color-text-inverse);
  box-shadow: 0 10px 20px var(--color-accent-muted);
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
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.ac-text p {
  font-size: 0.95rem;
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
}
</style>
