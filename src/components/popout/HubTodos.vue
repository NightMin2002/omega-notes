<script setup lang="ts">
/**
 * Ω Notes V2 — 桌面微件待办模块
 * 分组视图：今日 / 本周 / 本月 / 全部
 * 显示备注摘要 + 优化布局密度
 */
import { ref, computed } from 'vue'
import { useTodosStore } from '../../stores/todos'

const todosStore = useTodosStore()

type ViewTab = 'today' | 'week' | 'month' | 'all'
const activeView = ref<ViewTab>('all')

const quickTitle = ref('')

function quickAdd() {
  const title = quickTitle.value.trim()
  if (!title) return
  todosStore.addTodo({ title, priority: 'medium' })
  quickTitle.value = ''
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isOverdue(date?: string): boolean {
  if (!date) return false
  return date < todayStr()
}

/** 本周末最后一天 */
function weekEndStr(): string {
  const d = new Date()
  d.setDate(d.getDate() + (7 - d.getDay()))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 本月最后一天 */
function monthEndStr(): string {
  const d = new Date()
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
}

const viewTodos = computed(() => {
  const today = todayStr()
  const weekEnd = weekEndStr()
  const monthEnd = monthEndStr()
  const pending = todosStore.pendingTodos

  switch (activeView.value) {
    case 'today':
      // 今日 = 截止今天 + 逾期
      return pending.filter(t => t.dueDate && t.dueDate <= today)
    case 'week':
      return pending.filter(t => t.dueDate && t.dueDate <= weekEnd)
    case 'month':
      return pending.filter(t => t.dueDate && t.dueDate <= monthEnd)
    default:
      return pending
  }
})

const viewCount = computed(() => viewTodos.value.length)

function formatDue(date: string): string {
  const today = todayStr()
  if (date === today) return '今天'
  const d = new Date()
  const tmr = new Date(d)
  tmr.setDate(tmr.getDate() + 1)
  const tmrStr = `${tmr.getFullYear()}-${String(tmr.getMonth() + 1).padStart(2, '0')}-${String(tmr.getDate()).padStart(2, '0')}`
  if (date === tmrStr) return '明天'
  if (date < today) return '逾期'
  const dt = new Date(date + 'T00:00:00')
  return `${dt.getMonth() + 1}/${dt.getDate()}`
}

const viewTabs: { id: ViewTab; label: string }[] = [
  { id: 'today', label: '今日' },
  { id: 'week', label: '本周' },
  { id: 'month', label: '本月' },
  { id: 'all', label: '全部' },
]

const tabCounts = computed(() => {
  const pending = todosStore.pendingTodos
  const today = todayStr()
  const weekEnd = weekEndStr()
  const monthEnd = monthEndStr()
  let todayC = 0, weekC = 0, monthC = 0

  for (const t of pending) {
    if (!t.dueDate) continue
    if (t.dueDate <= today) todayC++
    if (t.dueDate <= weekEnd) weekC++
    if (t.dueDate <= monthEnd) monthC++
  }

  return {
    today: todayC,
    week: weekC,
    month: monthC,
    all: 0
  }
})
</script>

<template>
  <div class="hub-todos">
    <!-- 头部 -->
    <div class="hub-todos-header">
      <span class="hub-todos-title">待办</span>
      <div class="hub-todos-badges">
        <span v-if="todosStore.overdueCount > 0" class="badge danger">{{ todosStore.overdueCount }}</span>
        <span class="badge count">{{ todosStore.pendingCount }}</span>
      </div>
    </div>

    <!-- 分组 Tabs -->
    <div class="hub-view-tabs">
      <button
        v-for="tab in viewTabs"
        :key="tab.id"
        class="hub-view-tab"
        :class="{ active: activeView === tab.id }"
        @click="activeView = tab.id"
      >
        {{ tab.label }}
        <span v-if="tabCounts[tab.id] > 0" class="sub-badge">{{ tabCounts[tab.id] > 99 ? '99+' : tabCounts[tab.id] }}</span>
      </button>
    </div>

    <!-- 列表 -->
    <div class="hub-todos-list">
      <div
        v-for="todo in viewTodos.slice(0, 10)"
        :key="todo.id"
        class="hub-todo-item"
        :class="{ overdue: isOverdue(todo.dueDate) }"
      >
        <button class="hub-todo-check" @click="todosStore.toggleComplete(todo.id)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
          </svg>
        </button>
        <div class="hub-todo-body">
          <div class="hub-todo-top">
            <span class="hub-todo-dot" :class="`dot-${todo.priority}`" />
            <span class="hub-todo-title">{{ todo.title }}</span>
            <span v-if="todo.dueDate" class="hub-todo-due" :class="{ 'is-overdue': isOverdue(todo.dueDate) }">
              {{ formatDue(todo.dueDate) }}
            </span>
          </div>
          <div v-if="todo.description" class="hub-todo-desc">
            {{ todo.description.length > 40 ? todo.description.slice(0, 40) + '...' : todo.description }}
          </div>
        </div>
      </div>

      <!-- 更多提示 -->
      <div v-if="viewTodos.length > 10" class="hub-more">
        + {{ viewTodos.length - 10 }} 更多
      </div>

      <div v-if="viewCount === 0" class="hub-empty">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <path d="M9 16l2 2 4-4" />
        </svg>
        <span>{{ activeView === 'today' ? '今日无待办 🎉' : '暂无待办' }}</span>
      </div>
    </div>

    <!-- 快速添加 -->
    <div class="hub-quick-add">
      <input
        v-model="quickTitle"
        class="hub-quick-input"
        placeholder="快速添加..."
        @keydown.enter="quickAdd"
      >
      <button class="hub-add-btn" :disabled="!quickTitle.trim()" @click="quickAdd">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.hub-todos {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 4px;
}

.hub-todos-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 2px;
}

.hub-todos-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.hub-todos-badges {
  display: flex;
  gap: 4px;
}

.badge {
  font-size: 0.6rem;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: var(--radius-full);
  background: var(--color-text-tertiary);
  color: var(--color-text-inverse);
}

.badge.danger {
  background: var(--color-danger, #ef4444);
}

.badge.count {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

/* ─── 分组 Tabs ─── */
.hub-view-tabs {
  display: flex;
  background: var(--color-bg-tertiary);
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}

.hub-view-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex: 1;
  padding: 3px 0;
  font-size: 0.65rem;
  font-weight: 500;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.sub-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 12px;
  height: 12px;
  padding: 0 3px;
  font-size: 0.5rem;
  font-weight: 700;
  background: var(--color-danger, #ef4444);
  color: #fff;
  border-radius: 6px;
  transform: translateY(-0.5px);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

@media (hover: hover) {
  .hub-view-tab:hover {
    color: var(--color-text-primary);
    background: var(--color-bg-hover);
  }
}

.hub-view-tab:active { transform: scale(0.97); }

.hub-view-tab.active {
  background: var(--color-bg-elevated);
  color: var(--color-accent);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.hub-view-tab:focus-visible {
  box-shadow: 0 0 0 2px var(--color-accent);
  outline: none;
}

/* ─── 列表 ─── */
.hub-todos-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px 0;
}

.hub-todo-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 5px 6px;
  border-radius: 6px;
  transition: background-color 0.15s ease;
}

@media (hover: hover) {
  .hub-todo-item:hover { background: var(--color-bg-hover); }
}

.hub-todo-item.overdue {
  border-left: 2px solid var(--color-danger, #ef4444);
}

.hub-todo-check {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
  padding: 1px;
  margin-top: 1px;
  transition: color 0.15s ease;
}

@media (hover: hover) {
  .hub-todo-check:hover { color: var(--color-accent); }
}

.hub-todo-check:focus-visible {
  box-shadow: 0 0 0 2px var(--color-accent-muted);
  outline: none;
  border-radius: var(--radius-sm);
}

/* ─── Todo Body（两行布局） ─── */
.hub-todo-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.hub-todo-top {
  display: flex;
  align-items: center;
  gap: 5px;
}

.hub-todo-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.hub-todo-dot.dot-high { background: var(--color-danger, #ef4444); }
.hub-todo-dot.dot-medium { background: var(--color-warning, #e6a817); }
.hub-todo-dot.dot-low { background: var(--color-accent); }

.hub-todo-title {
  flex: 1;
  font-size: 0.72rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-text-primary);
  font-weight: 500;
}

.hub-todo-due {
  flex-shrink: 0;
  font-size: 0.6rem;
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.hub-todo-due.is-overdue {
  color: var(--color-danger, #ef4444);
  font-weight: 600;
}

/* ─── 备注描述 ─── */
.hub-todo-desc {
  font-size: 0.62rem;
  color: var(--color-text-tertiary);
  line-height: 1.3;
  padding-left: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.75;
}

.hub-more {
  text-align: center;
  font-size: 0.62rem;
  color: var(--color-text-tertiary);
  padding: 4px 0;
}

.hub-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--color-text-tertiary);
  font-size: 0.68rem;
}

.hub-empty svg {
  opacity: 0.4;
}

/* ─── 快速添加 ─── */
.hub-quick-add {
  display: flex;
  gap: 4px;
  padding-top: 4px;
  border-top: 1px solid var(--color-divider);
}

.hub-quick-input {
  flex: 1;
  padding: 4px 8px;
  font-size: 0.72rem;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
  appearance: none;
  color: var(--color-text-primary);
}

.hub-quick-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-muted);
}

.hub-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: var(--color-accent);
  transition: background-color 0.15s ease;
}

@media (hover: hover) {
  .hub-add-btn:hover { background: var(--color-accent-muted); }
}

.hub-add-btn:disabled { opacity: 0.3; }

.hub-add-btn:active {
  transform: scale(0.93);
}

.hub-add-btn:focus-visible {
  box-shadow: 0 0 0 2px var(--color-accent-muted);
  outline: none;
}

@media (prefers-reduced-motion: reduce) {
  .hub-view-tab { transition: none; }
  .hub-todo-item { transition: none; }
  .hub-todo-check { transition: none; }
}
</style>
