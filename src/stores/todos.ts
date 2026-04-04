/**
 * Ω Notes V2 — 待办事项 Store
 * 管理中长期待办（区别于每日任务的一次性计划）
 * 持久化：localStorage，跨窗口同步
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TodoItem, TodoPriority } from '@/types'

const TODOS_KEY = 'omega-todos'
const CLEAN_DAYS_KEY = 'omega-todos-clean-days'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return fallback
}

function saveJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

/** 今天的日期 key，格式 "YYYY-MM-DD" */
function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 优先级排序权重 */
const priorityWeight: Record<TodoPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

export const useTodosStore = defineStore('todos', () => {
  const todos = ref<TodoItem[]>(loadJSON(TODOS_KEY, []))

  /** 已完成待办自动清理天数（0 = 不清理） */
  const autoCleanDays = ref<number>(loadJSON(CLEAN_DAYS_KEY, 30))

  function persist() { saveJSON(TODOS_KEY, todos.value) }

  // ─── 计算属性 ───

  const pendingTodos = computed<TodoItem[]>(() =>
    todos.value
      .filter(t => t.status === 'pending')
      .sort((a, b) => {
        // 优先级 high > medium > low
        const pw = priorityWeight[a.priority] - priorityWeight[b.priority]
        if (pw !== 0) return pw
        // 有截止日的排在前面，截止日升序
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
        if (a.dueDate) return -1
        if (b.dueDate) return 1
        return a.sortOrder - b.sortOrder
      })
  )

  const completedTodos = computed<TodoItem[]>(() =>
    todos.value
      .filter(t => t.status === 'completed')
      .sort((a, b) =>
        new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
      )
  )

  const today = computed(() => todayStr())

  const overdueTodos = computed<TodoItem[]>(() =>
    pendingTodos.value.filter(t => t.dueDate && t.dueDate < today.value)
  )

  const todayTodos = computed<TodoItem[]>(() =>
    pendingTodos.value.filter(t => t.dueDate === today.value)
  )

  const upcomingTodos = computed<TodoItem[]>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    const weekLater = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return pendingTodos.value.filter(t =>
      t.dueDate && t.dueDate > today.value && t.dueDate <= weekLater
    )
  })

  const pendingCount = computed(() => pendingTodos.value.length)
  const overdueCount = computed(() => overdueTodos.value.length)

  /** 指定日期的待办列表（日历用） */
  function todosByDate(date: string): TodoItem[] {
    return todos.value.filter(t => t.dueDate === date && t.status === 'pending')
  }

  /** 日历日期 → 最高优先级映射 */
  const datePriorityMap = computed<Map<string, TodoPriority>>(() => {
    const map = new Map<string, TodoPriority>()
    for (const t of todos.value) {
      if (!t.dueDate || t.status !== 'pending') continue
      const existing = map.get(t.dueDate)
      if (!existing || priorityWeight[t.priority] < priorityWeight[existing]) {
        map.set(t.dueDate, t.priority)
      }
    }
    return map
  })

  // ─── Actions ───

  function addTodo(data: Partial<TodoItem>): TodoItem {
    const maxOrder = todos.value.reduce((m, t) => Math.max(m, t.sortOrder), 0)
    const todo: TodoItem = {
      id: generateId(),
      title: data.title || '',
      description: data.description,
      dueDate: data.dueDate,
      priority: data.priority || 'medium',
      status: 'pending',
      tags: data.tags || [],
      createdAt: new Date().toISOString(),
      sortOrder: maxOrder + 1,
    }
    todos.value.unshift(todo)
    persist()
    return todo
  }

  function updateTodo(id: string, patch: Partial<TodoItem>) {
    const t = todos.value.find(x => x.id === id)
    if (t) {
      Object.assign(t, patch)
      persist()
    }
  }

  function removeTodo(id: string) {
    todos.value = todos.value.filter(t => t.id !== id)
    persist()
  }

  function toggleComplete(id: string) {
    const t = todos.value.find(x => x.id === id)
    if (!t) return
    if (t.status === 'pending') {
      t.status = 'completed'
      t.completedAt = new Date().toISOString()
    } else {
      t.status = 'pending'
      t.completedAt = undefined
    }
    persist()
  }

  function clearCompleted() {
    todos.value = todos.value.filter(t => t.status !== 'completed')
    persist()
  }

  /** 导入待办（跳过已存在的 ID） */
  function importTodos(incoming: TodoItem[]): number {
    const existingIds = new Set(todos.value.map(t => t.id))
    let imported = 0
    for (const t of incoming) {
      if (!existingIds.has(t.id)) {
        todos.value.push(t)
        existingIds.add(t.id)
        imported++
      }
    }
    if (imported > 0) persist()
    return imported
  }

  /** 自动清理过期已完成待办 */
  function autoCleanCompleted() {
    const days = autoCleanDays.value
    if (days <= 0) return
    const cutoff = Date.now() - days * 86400000
    const before = todos.value.length
    todos.value = todos.value.filter(t => {
      if (t.status !== 'completed' || !t.completedAt) return true
      return new Date(t.completedAt).getTime() >= cutoff
    })
    if (todos.value.length !== before) persist()
  }

  function setAutoCleanDays(days: number) {
    autoCleanDays.value = days
    saveJSON(CLEAN_DAYS_KEY, days)
  }

  /** 跨窗口同步 */
  function syncFromStorage() {
    try {
      const raw = localStorage.getItem(TODOS_KEY)
      if (raw) {
        const fresh = JSON.parse(raw)
        if (JSON.stringify(todos.value) !== raw) {
          todos.value.splice(0, todos.value.length, ...fresh)
        }
      }
    } catch { /* ignore */ }
  }

  function init() {
    autoCleanCompleted()
    syncFromStorage()
    window.addEventListener('storage', (e) => {
      if (e.key === TODOS_KEY) syncFromStorage()
    })
  }

  return {
    todos,
    autoCleanDays,
    pendingTodos,
    completedTodos,
    overdueTodos,
    todayTodos,
    upcomingTodos,
    pendingCount,
    overdueCount,
    datePriorityMap,
    todosByDate,
    addTodo,
    updateTodo,
    removeTodo,
    toggleComplete,
    clearCompleted,
    importTodos,
    setAutoCleanDays,
    syncFromStorage,
    init,
  }
})
