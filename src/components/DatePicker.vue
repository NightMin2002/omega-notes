<script setup lang="ts">
/**
 * Ω Notes V2 — 自定义日期选择器
 * 替代原生 <input type="date">，复用 CalendarWidget 的月历能力
 * 支持 Teleport 定位、清除日期、深色/浅色双主题
 */
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import type { TodoPriority } from '../types'

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  dotMap?: Map<string, TodoPriority>
}>(), {
  modelValue: '',
  placeholder: '选择日期',
  dotMap: () => new Map(),
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

/* ─── 展开/收起 ─── */
const isOpen = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)

/* ─── 面板定位 ─── */
const panelStyle = ref<{ top: string; left: string; minWidth: string }>({
  top: '0px', left: '0px', minWidth: '260px',
})

function updatePanelPosition() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const panelHeight = 320

  if (spaceBelow >= panelHeight) {
    panelStyle.value.top = `${rect.bottom + 4}px`
  } else {
    panelStyle.value.top = `${rect.top - panelHeight - 4}px`
  }
  panelStyle.value.left = `${rect.left}px`
  panelStyle.value.minWidth = `${Math.max(rect.width, 260)}px`
}

function togglePanel() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => {
      updatePanelPosition()
      // 同步面板当前月到已选日期
      if (props.modelValue) {
        const d = new Date(props.modelValue + 'T00:00:00')
        viewYear.value = d.getFullYear()
        viewMonth.value = d.getMonth()
      }
    })
  }
}

function closePanel() {
  isOpen.value = false
}

/* ─── 点击外部关闭 ─── */
function onClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (
    triggerRef.value?.contains(target) ||
    panelRef.value?.contains(target)
  ) return
  closePanel()
}

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside)
  window.addEventListener('resize', updatePanelPosition)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside)
  window.removeEventListener('resize', updatePanelPosition)
})

/* ─── 日历逻辑（从 CalendarWidget 移植 + 内聚） ─── */
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())

const todayStr = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const monthLabel = computed(() => `${viewYear.value} 年 ${viewMonth.value + 1} 月`)

interface CalendarCell {
  date: string
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

  let startWeekday = firstDay.getDay() - 1
  if (startWeekday < 0) startWeekday = 6

  const result: CalendarCell[] = []

  // 前月补齐
  const prevMonthLast = new Date(y, m, 0)
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = prevMonthLast.getDate() - i
    const date = formatDate(y, m - 1, d)
    result.push({
      date, day: d, isCurrentMonth: false,
      isToday: date === todayStr.value,
      isSelected: date === props.modelValue,
      dot: props.dotMap.get(date),
    })
  }

  // 本月
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = formatDate(y, m, d)
    result.push({
      date, day: d, isCurrentMonth: true,
      isToday: date === todayStr.value,
      isSelected: date === props.modelValue,
      dot: props.dotMap.get(date),
    })
  }

  // 后月补齐到 42
  const remaining = 42 - result.length
  for (let d = 1; d <= remaining; d++) {
    const date = formatDate(y, m + 1, d)
    result.push({
      date, day: d, isCurrentMonth: false,
      isToday: date === todayStr.value,
      isSelected: date === props.modelValue,
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
  if (viewMonth.value === 0) { viewMonth.value = 11; viewYear.value-- }
  else viewMonth.value--
}

function nextMonth() {
  if (viewMonth.value === 11) { viewMonth.value = 0; viewYear.value++ }
  else viewMonth.value++
}

function goToday() {
  const d = new Date()
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
  selectDate(todayStr.value)
}

function selectDate(date: string) {
  emit('update:modelValue', date)
  closePanel()
}

function clearDate() {
  emit('update:modelValue', '')
  closePanel()
}

/* ─── 显示文本 ─── */
const displayText = computed(() => {
  if (!props.modelValue) return ''
  if (props.modelValue === todayStr.value) return '今天'
  const d = new Date(props.modelValue + 'T00:00:00')
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tmrStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
  if (props.modelValue === tmrStr) return '明天'
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})
</script>

<template>
  <div class="date-picker" ref="triggerRef">
    <!-- 触发按钮 -->
    <button
      type="button"
      class="date-trigger"
      :class="{ 'has-value': !!modelValue, 'is-open': isOpen }"
      @click="togglePanel"
    >
      <svg class="date-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      <span v-if="modelValue" class="date-text">{{ displayText }}</span>
      <span v-else class="date-placeholder">{{ placeholder }}</span>
      <!-- 清除按钮 -->
      <button
        v-if="modelValue"
        type="button"
        class="date-clear"
        @click.stop="clearDate"
        aria-label="清除日期"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </button>

    <!-- 日历面板 (Teleport) -->
    <Teleport to="body">
      <Transition name="dp-pop">
        <div
          v-if="isOpen"
          ref="panelRef"
          class="dp-panel"
          :style="panelStyle"
        >
          <!-- 头部导航 -->
          <div class="dp-header">
            <button class="dp-nav" @click="prevMonth" aria-label="上个月">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button class="dp-title" @click="goToday">{{ monthLabel }}</button>
            <button class="dp-nav" @click="nextMonth" aria-label="下个月">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </button>
          </div>

          <!-- 星期标题 -->
          <div class="dp-weekdays">
            <span v-for="w in WEEKDAYS" :key="w" class="dp-wd">{{ w }}</span>
          </div>

          <!-- 日期网格 -->
          <div class="dp-grid">
            <button
              v-for="c in cells"
              :key="c.date"
              class="dp-cell"
              :class="{
                'other-month': !c.isCurrentMonth,
                'is-today': c.isToday,
                'is-selected': c.isSelected,
              }"
              @click="selectDate(c.date)"
            >
              <span class="dp-day">{{ c.day }}</span>
              <span v-if="c.dot" class="dp-dot" :class="`dot-${c.dot}`" />
            </button>
          </div>

          <!-- 底部快捷 -->
          <div class="dp-footer">
            <button class="dp-quick" @click="goToday">今天</button>
            <button v-if="modelValue" class="dp-quick dp-quick-clear" @click="clearDate">清除</button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* ─── 触发按钮 ─── */
.date-picker {
  position: relative;
  display: inline-flex;
}

.date-trigger {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  min-width: 140px;
  transition: border-color var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out),
              background-color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .date-trigger:hover {
    border-color: var(--color-border-strong);
  }
}

.date-trigger.is-open {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-muted);
  background: var(--color-bg-elevated);
}

.date-trigger.has-value {
  color: var(--color-text-primary);
}

.date-trigger:focus-visible {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-muted);
}

.date-icon {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
}

.date-text {
  font-weight: 500;
}

.date-placeholder {
  color: var(--color-text-tertiary);
}

.date-clear {
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: var(--radius-full);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  transition: color var(--duration-fast) var(--ease-out),
              background-color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .date-clear:hover {
    color: var(--color-danger, #ef4444);
    background: var(--color-danger-muted);
  }
}

/* ─── 面板 ─── */
.dp-panel {
  position: fixed;
  z-index: var(--z-modal);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg), 0 0 0 1px var(--color-glass-border);
  padding: var(--space-3);
  user-select: none;
  width: 280px;
}

/* ─── 头部 ─── */
.dp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}

.dp-nav {
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
  .dp-nav:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
}

.dp-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text-primary);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  transition: background-color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .dp-title:hover { background: var(--color-bg-hover); }
}

/* ─── 星期 ─── */
.dp-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: var(--space-1);
}

.dp-wd {
  text-align: center;
  font-size: 0.62rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
  padding: var(--space-1) 0;
}

/* ─── 网格 ─── */
.dp-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.dp-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-primary);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .dp-cell:hover { background: var(--color-bg-hover); }
}

.dp-cell.other-month {
  color: var(--color-text-tertiary);
  opacity: 0.4;
}

.dp-cell.is-today .dp-day {
  background: var(--color-accent);
  color: var(--color-text-inverse);
  border-radius: var(--radius-full);
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.dp-cell.is-selected {
  background: var(--color-accent-muted);
}

.dp-cell.is-selected .dp-day {
  color: var(--color-accent);
  font-weight: 700;
}

.dp-cell.is-today.is-selected .dp-day {
  background: var(--color-accent);
  color: var(--color-text-inverse);
}

/* 圆点 */
.dp-dot {
  position: absolute;
  bottom: 2px;
  width: 4px;
  height: 4px;
  border-radius: var(--radius-full);
}

.dp-dot.dot-high { background: var(--color-danger, #ef4444); }
.dp-dot.dot-medium { background: var(--color-warning, #e6a817); }
.dp-dot.dot-low { background: var(--color-accent); }

/* ─── 底部快捷 ─── */
.dp-footer {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-divider);
}

.dp-quick {
  flex: 1;
  padding: var(--space-1) 0;
  font-size: 0.72rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
  color: var(--color-accent);
  transition: background-color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .dp-quick:hover { background: var(--color-accent-muted); }
}

.dp-quick-clear {
  color: var(--color-text-tertiary);
}

@media (hover: hover) {
  .dp-quick-clear:hover { color: var(--color-danger, #ef4444); background: var(--color-danger-muted); }
}

/* ─── 弹出过渡 ─── */
.dp-pop-enter-active,
.dp-pop-leave-active {
  transition: opacity var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
}

.dp-pop-enter-from,
.dp-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .dp-pop-enter-active,
  .dp-pop-leave-active {
    transition: none;
  }
}
</style>
