<script setup lang="ts">
import { ref } from 'vue'
import { useTodosStore } from '../../stores/todos'

const todosStore = useTodosStore()

const quickTitle = ref('')

function quickAdd() {
  const title = quickTitle.value.trim()
  if (!title) return
  todosStore.addTodo({ title, priority: 'medium' })
  quickTitle.value = ''
}

function isOverdue(date?: string): boolean {
  if (!date) return false
  const d = new Date()
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return date < today
}

function formatDue(date: string): string {
  const d = new Date()
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (date === today) return '今天'
  const tmr = new Date(d)
  tmr.setDate(tmr.getDate() + 1)
  const tmrStr = `${tmr.getFullYear()}-${String(tmr.getMonth() + 1).padStart(2, '0')}-${String(tmr.getDate()).padStart(2, '0')}`
  if (date === tmrStr) return '明天'
  const dt = new Date(date + 'T00:00:00')
  return `${dt.getMonth() + 1}/${dt.getDate()}`
}
</script>

<template>
  <div class="hub-todos">
    <!-- 头部统计 -->
    <div class="hub-todos-header">
      <span class="hub-todos-title">待办</span>
      <div class="hub-todos-badges">
        <span v-if="todosStore.overdueCount > 0" class="badge danger">逾期 {{ todosStore.overdueCount }}</span>
        <span v-if="todosStore.todayTodos.length > 0" class="badge">今日 {{ todosStore.todayTodos.length }}</span>
      </div>
    </div>

    <!-- 列表 -->
    <div class="hub-todos-list">
      <div
        v-for="todo in todosStore.pendingTodos.slice(0, 8)"
        :key="todo.id"
        class="hub-todo-item"
        :class="{ overdue: isOverdue(todo.dueDate) }"
      >
        <button class="hub-todo-check" @click="todosStore.toggleComplete(todo.id)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
          </svg>
        </button>
        <span class="hub-todo-dot" :class="`dot-${todo.priority}`" />
        <span class="hub-todo-title">{{ todo.title }}</span>
        <span v-if="todo.dueDate" class="hub-todo-due" :class="{ 'is-overdue': isOverdue(todo.dueDate) }">
          {{ formatDue(todo.dueDate) }}
        </span>
      </div>

      <div v-if="todosStore.pendingCount === 0" class="hub-empty">
        暂无待办
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
  gap: 6px;
}

.hub-todos-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 4px;
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

/* ─── 列表 ─── */
.hub-todos-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hub-todo-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 0.73rem;
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
  transition: color 0.15s ease;
}

@media (hover: hover) {
  .hub-todo-check:hover { color: var(--color-accent); }
}

.hub-todo-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.hub-todo-dot.dot-high { background: var(--color-danger, #ef4444); }
.hub-todo-dot.dot-medium { background: var(--color-warning, #e6a817); }
.hub-todo-dot.dot-low { background: var(--color-accent); }

.hub-todo-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-text-primary);
  font-weight: 500;
}

.hub-todo-due {
  flex-shrink: 0;
  font-size: 0.65rem;
  color: var(--color-text-tertiary);
}

.hub-todo-due.is-overdue {
  color: var(--color-danger, #ef4444);
  font-weight: 600;
}

.hub-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  font-size: 0.7rem;
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
</style>
