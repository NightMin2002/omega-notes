<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TodoPriority } from '../types'

const props = withDefaults(defineProps<{
  selectedDate?: string
  dotMap?: Map<string, TodoPriority>
}>(), {
  selectedDate: '',
  dotMap: () => new Map(),
})

const emit = defineEmits<{
  select: [date: string]
}>()

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth()) // 0-indexed

const todayStr = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const monthLabel = computed(() => `${viewYear.value} 年 ${viewMonth.value + 1} 月`)

interface CalendarCell {
  date: string       // "YYYY-MM-DD"
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  dot?: TodoPriority
}

const cells = computed<CalendarCell[]>(() => {
  const y = viewYear.value
  const m = viewMonth.value
  const firstDay = new Date(y, m, 1)
  const lastDay = new Date(y, m + 1, 0)

  // 周一 = 0，周日 = 6
  let startWeekday = firstDay.getDay() - 1
  if (startWeekday < 0) startWeekday = 6

  const result: CalendarCell[] = []

  // 前月补齐
  const prevMonthLast = new Date(y, m, 0)
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = prevMonthLast.getDate() - i
    const date = formatDate(y, m - 1, d)
    result.push({
      date,
      day: d,
      isCurrentMonth: false,
      isToday: date === todayStr.value,
      isSelected: date === props.selectedDate,
      dot: props.dotMap.get(date),
    })
  }

  // 本月
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = formatDate(y, m, d)
    result.push({
      date,
      day: d,
      isCurrentMonth: true,
      isToday: date === todayStr.value,
      isSelected: date === props.selectedDate,
      dot: props.dotMap.get(date),
    })
  }

  // 后月补齐到 42 格（6 行）
  const remaining = 42 - result.length
  for (let d = 1; d <= remaining; d++) {
    const date = formatDate(y, m + 1, d)
    result.push({
      date,
      day: d,
      isCurrentMonth: false,
      isToday: date === todayStr.value,
      isSelected: date === props.selectedDate,
      dot: props.dotMap.get(date),
    })
  }

  return result
})

function formatDate(y: number, m: number, d: number): string {
  const dt = new Date(y, m, d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value--
  } else {
    viewMonth.value--
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value++
  } else {
    viewMonth.value++
  }
}

function goToday() {
  const d = new Date()
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
  emit('select', todayStr.value)
}
</script>

<template>
  <div class="calendar-widget">
    <!-- 头部导航 -->
    <div class="cal-header">
      <button class="cal-nav-btn" @click="prevMonth" aria-label="上个月">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button class="cal-title" @click="goToday">{{ monthLabel }}</button>
      <button class="cal-nav-btn" @click="nextMonth" aria-label="下个月">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 6 15 12 9 18" />
        </svg>
      </button>
    </div>

    <!-- 星期标题 -->
    <div class="cal-weekdays">
      <span v-for="w in WEEKDAYS" :key="w" class="cal-weekday">{{ w }}</span>
    </div>

    <!-- 日期网格 -->
    <div class="cal-grid">
      <button
        v-for="c in cells"
        :key="c.date"
        class="cal-cell"
        :class="{
          'other-month': !c.isCurrentMonth,
          'is-today': c.isToday,
          'is-selected': c.isSelected,
        }"
        @click="emit('select', c.date)"
      >
        <span class="cal-day">{{ c.day }}</span>
        <span
          v-if="c.dot"
          class="cal-dot"
          :class="`dot-${c.dot}`"
        />
      </button>
    </div>
  </div>
</template>

<style scoped>
.calendar-widget {
  user-select: none;
}

/* ─── 头部 ─── */
.cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.cal-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .cal-nav-btn:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
}

.cal-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-primary);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  transition: background-color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .cal-title:hover {
    background: var(--color-bg-hover);
  }
}

/* ─── 星期 ─── */
.cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: var(--space-1);
}

.cal-weekday {
  text-align: center;
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  padding: var(--space-1) 0;
}

/* ─── 日期网格 ─── */
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.cal-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--color-text-primary);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .cal-cell:hover {
    background: var(--color-bg-hover);
  }
}

.cal-cell.other-month {
  color: var(--color-text-tertiary);
  opacity: 0.4;
}

.cal-cell.is-today .cal-day {
  background: var(--color-accent);
  color: var(--color-text-inverse);
  border-radius: var(--radius-full);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.cal-cell.is-selected {
  background: var(--color-accent-muted);
}

.cal-cell.is-selected .cal-day {
  color: var(--color-accent);
  font-weight: 700;
}

/* 今天 + 选中同时存在时，保持今天的蓝色圆 */
.cal-cell.is-today.is-selected .cal-day {
  background: var(--color-accent);
  color: var(--color-text-inverse);
}

/* ─── 待办圆点 ─── */
.cal-dot {
  position: absolute;
  bottom: 3px;
  width: 5px;
  height: 5px;
  border-radius: var(--radius-full);
}

.dot-high {
  background: var(--color-danger, #ef4444);
}

.dot-medium {
  background: var(--color-warning, #e6a817);
}

.dot-low {
  background: var(--color-accent);
}
</style>
