<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTodosStore } from '../stores/todos'
import CalendarWidget from '../components/CalendarWidget.vue'
import DatePicker from '../components/DatePicker.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import type { TodoPriority } from '../types'

const todosStore = useTodosStore()

/* ─── 筛选 ─── */
type FilterTab = 'all' | 'today' | 'week' | 'overdue'
const activeFilter = ref<FilterTab>('all')
const selectedDate = ref<string>('')

const filterTabs: { id: FilterTab; label: string; icon: string }[] = [
  { id: 'all', label: '全部', icon: 'M4 6h16M4 12h16M4 18h16' },
  { id: 'today', label: '今天', icon: 'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83' },
  { id: 'week', label: '本周', icon: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18' },
  { id: 'overdue', label: '逾期', icon: 'M12 8v4l3 3M12 2a10 10 0 100 20 10 10 0 000-20z' },
]

const filteredTodos = computed(() => {
  if (selectedDate.value) {
    return todosStore.todosByDate(selectedDate.value)
  }
  switch (activeFilter.value) {
    case 'today': return todosStore.todayTodos
    case 'week': return todosStore.upcomingTodos
    case 'overdue': return todosStore.overdueTodos
    default: return todosStore.pendingTodos
  }
})

/** 当前筛选条件的标题 */
const filterLabel = computed(() => {
  if (selectedDate.value) return `${selectedDate.value} 的待办`
  return filterTabs.find(t => t.id === activeFilter.value)?.label || '全部'
})

function selectFilter(tab: FilterTab) {
  activeFilter.value = tab
  selectedDate.value = ''
}

function handleDateSelect(date: string) {
  selectedDate.value = selectedDate.value === date ? '' : date
  if (selectedDate.value) activeFilter.value = 'all'
}

/* ─── 新建待办 ─── */
const showCreateForm = ref(false)
const newTitle = ref('')
const newDueDate = ref('')
const newPriority = ref<TodoPriority>('medium')
const newDescription = ref('')

/**
 * 关键：如果从日历选中了日期，打开新建表单时自动继承该日期
 */
function openCreateForm() {
  showCreateForm.value = true
  if (selectedDate.value && !newDueDate.value) {
    newDueDate.value = selectedDate.value
  }
}

function toggleCreateForm() {
  if (showCreateForm.value) {
    showCreateForm.value = false
  } else {
    openCreateForm()
  }
}

function createTodo() {
  if (!newTitle.value.trim()) return
  todosStore.addTodo({
    title: newTitle.value.trim(),
    dueDate: newDueDate.value || undefined,
    priority: newPriority.value,
    description: newDescription.value.trim() || undefined,
  })
  newTitle.value = ''
  newDueDate.value = ''
  newPriority.value = 'medium'
  newDescription.value = ''
  showCreateForm.value = false
}

/* ─── 编辑待办 ─── */
const editingId = ref<string | null>(null)
const editTitle = ref('')
const editDueDate = ref('')
const editPriority = ref<TodoPriority>('medium')
const editDescription = ref('')

function startEdit(todo: import('../types').TodoItem) {
  editingId.value = todo.id
  editTitle.value = todo.title
  editDueDate.value = todo.dueDate || ''
  editPriority.value = todo.priority
  editDescription.value = todo.description || ''
}

function saveEdit() {
  if (!editingId.value || !editTitle.value.trim()) return
  todosStore.updateTodo(editingId.value, {
    title: editTitle.value.trim(),
    dueDate: editDueDate.value || undefined,
    priority: editPriority.value,
    description: editDescription.value.trim() || undefined,
  })
  editingId.value = null
}

function cancelEdit() {
  editingId.value = null
}

/* ─── 已完成折叠 ─── */
const showCompleted = ref(false)

/* ─── 清除已完成 ─── */
const showClearConfirm = ref(false)

function handleClearConfirm() {
  todosStore.clearCompleted()
  showClearConfirm.value = false
}

/* ─── 格式化 ─── */
function formatDueDate(date: string): string {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  if (date === todayStr) return '今天'
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tmrStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
  if (date === tmrStr) return '明天'
  const d = new Date(date + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function isOverdue(date?: string): boolean {
  if (!date) return false
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return date < todayStr
}

const priorities: { value: TodoPriority; label: string }[] = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
]
</script>

<template>
  <div class="todos-page">
    <!-- 页头 -->
    <div class="todos-header">
      <h2 class="page-title">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <path d="M9 16l2 2 4-4" />
        </svg>
        待办事项
        <span v-if="todosStore.overdueCount > 0" class="overdue-badge">{{ todosStore.overdueCount }}</span>
      </h2>

      <!-- 美化的新建按钮 -->
      <button
        class="create-btn"
        :class="{ 'is-active': showCreateForm }"
        @click="toggleCreateForm"
      >
        <span class="create-btn-icon" :class="{ rotated: showCreateForm }">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
        <span class="create-btn-text">{{ showCreateForm ? '收起' : '新建待办' }}</span>
        <span class="create-btn-glow" />
      </button>
    </div>

    <!-- 新建表单 -->
    <Transition name="slide-down">
      <div v-if="showCreateForm" class="create-form">
        <div class="create-form-inner">
          <!-- 标题行 -->
          <div class="form-section">
            <label class="form-label-lg">标题</label>
            <input
              v-model="newTitle"
              class="form-input title-input"
              placeholder="待办标题..."
              @keydown.enter="createTodo"
            >
          </div>

          <!-- 日期 + 优先级 -->
          <div class="form-row form-row-duo">
            <div class="form-field">
              <label class="form-label">截止日期</label>
              <DatePicker
                v-model="newDueDate"
                placeholder="选择日期"
                :dot-map="todosStore.datePriorityMap"
              />
            </div>
            <div class="form-field">
              <label class="form-label">优先级</label>
              <div class="priority-selector">
                <button
                  v-for="p in priorities"
                  :key="p.value"
                  class="priority-btn"
                  :class="[`priority-${p.value}`, { active: newPriority === p.value }]"
                  @click="newPriority = p.value"
                >
                  <span class="priority-dot-mini" :class="`dot-${p.value}`" />
                  {{ p.label }}
                </button>
              </div>
            </div>
          </div>

          <!-- 备注 -->
          <div class="form-section">
            <label class="form-label">备注</label>
            <textarea
              v-model="newDescription"
              class="form-input form-textarea"
              placeholder="备注描述（可选）..."
              rows="2"
            />
          </div>

          <!-- 操作 -->
          <div class="form-actions">
            <button class="form-btn cancel" @click="showCreateForm = false">取消</button>
            <button class="form-btn confirm" :disabled="!newTitle.trim()" @click="createTodo">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              添加待办
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 主体：日历 + 列表 -->
    <div class="todos-body">
      <!-- 左侧日历 -->
      <aside class="todos-sidebar">
        <CalendarWidget
          :selected-date="selectedDate"
          :dot-map="todosStore.datePriorityMap"
          @select="handleDateSelect"
        />

        <!-- 筛选 Tabs -->
        <div class="filter-tabs">
          <button
            v-for="tab in filterTabs"
            :key="tab.id"
            class="filter-tab"
            :class="{ active: activeFilter === tab.id && !selectedDate }"
            @click="selectFilter(tab.id)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path :d="tab.icon" />
            </svg>
            {{ tab.label }}
            <span v-if="tab.id === 'overdue' && todosStore.overdueCount > 0" class="tab-badge danger">
              {{ todosStore.overdueCount }}
            </span>
            <span v-else-if="tab.id === 'today' && todosStore.todayTodos.length > 0" class="tab-badge">
              {{ todosStore.todayTodos.length }}
            </span>
          </button>
        </div>

        <!-- 统计 -->
        <div class="sidebar-stats">
          <div class="stat-item">
            <span class="stat-num">{{ todosStore.pendingCount }}</span>
            <span class="stat-label">待办</span>
          </div>
          <div class="stat-item">
            <span class="stat-num">{{ todosStore.completedTodos.length }}</span>
            <span class="stat-label">已完成</span>
          </div>
        </div>
      </aside>

      <!-- 右侧列表 -->
      <main class="todos-list-area">
        <div v-if="selectedDate" class="list-subtitle">
          <span>{{ selectedDate }} 的待办</span>
          <div class="list-subtitle-actions">
            <button class="subtitle-action-btn" @click="openCreateForm" data-tooltip="添加此日待办">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button class="clear-date-btn" @click="selectedDate = ''">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              清除
            </button>
          </div>
        </div>

        <!-- 待办列表 -->
        <div v-if="filteredTodos.length > 0" class="todo-items">
          <div
            v-for="todo in filteredTodos"
            :key="todo.id"
            class="todo-item"
            :class="{ 'is-overdue': isOverdue(todo.dueDate) }"
          >
            <!-- 编辑模式 -->
            <template v-if="editingId === todo.id">
              <div class="todo-edit-form">
                <input v-model="editTitle" class="form-input" placeholder="标题..." @keydown.enter="saveEdit" @keydown.esc="cancelEdit">
                <div class="form-row form-row-duo">
                  <DatePicker
                    v-model="editDueDate"
                    placeholder="截止日期"
                    :dot-map="todosStore.datePriorityMap"
                  />
                  <div class="priority-selector">
                    <button
                      v-for="p in priorities"
                      :key="p.value"
                      class="priority-btn"
                      :class="[`priority-${p.value}`, { active: editPriority === p.value }]"
                      @click="editPriority = p.value"
                    >
                      <span class="priority-dot-mini" :class="`dot-${p.value}`" />
                      {{ p.label }}
                    </button>
                  </div>
                </div>
                <textarea v-model="editDescription" class="form-input form-textarea" placeholder="备注..." rows="2" />
                <div class="form-actions">
                  <button class="form-btn cancel" @click="cancelEdit">取消</button>
                  <button class="form-btn confirm" @click="saveEdit">保存</button>
                </div>
              </div>
            </template>

            <!-- 显示模式 -->
            <template v-else>
              <button class="todo-check" @click="todosStore.toggleComplete(todo.id)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                </svg>
              </button>
              <div class="todo-body">
                <div class="todo-title-row">
                  <span class="todo-priority-dot" :class="`dot-${todo.priority}`" />
                  <span class="todo-title">{{ todo.title }}</span>
                </div>
                <div v-if="todo.description" class="todo-desc">{{ todo.description }}</div>
                <div v-if="todo.dueDate" class="todo-due" :class="{ overdue: isOverdue(todo.dueDate) }">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {{ formatDueDate(todo.dueDate) }}
                </div>
              </div>
              <div class="todo-actions">
                <button class="todo-action-btn" @click="startEdit(todo)" data-tooltip="编辑">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button class="todo-action-btn danger" @click="todosStore.removeTodo(todo.id)" data-tooltip="删除">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </template>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p>暂无待办事项</p>
          <button class="empty-action" @click="openCreateForm">创建一个</button>
        </div>

        <!-- 已完成区域 -->
        <div v-if="todosStore.completedTodos.length > 0" class="completed-section">
          <button class="completed-toggle" @click="showCompleted = !showCompleted">
            <svg
              class="toggle-chevron"
              :class="{ expanded: showCompleted }"
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
            >
              <polyline points="9 6 15 12 9 18" />
            </svg>
            已完成 ({{ todosStore.completedTodos.length }})
            <button
              v-if="showCompleted"
              class="clear-completed-btn"
              @click.stop="showClearConfirm = true"
            >
              清除
            </button>
          </button>

          <Transition name="section-expand">
            <div v-if="showCompleted" class="completed-items">
              <div
                v-for="todo in todosStore.completedTodos"
                :key="todo.id"
                class="todo-item completed"
              >
                <button class="todo-check checked" @click="todosStore.toggleComplete(todo.id)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="3" fill="currentColor" />
                    <polyline points="9 12 11.5 14.5 16 9.5" stroke="var(--color-bg-primary)" stroke-width="2.5" />
                  </svg>
                </button>
                <div class="todo-body">
                  <span class="todo-title">{{ todo.title }}</span>
                </div>
                <button class="todo-action-btn danger" @click="todosStore.removeTodo(todo.id)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </main>
    </div>

    <ConfirmDialog
      :open="showClearConfirm"
      title="清除已完成"
      message="确定要清除所有已完成的待办吗？此操作不可恢复。"
      confirmType="danger"
      @confirm="handleClearConfirm"
      @cancel="showClearConfirm = false"
    />
  </div>
</template>

<style scoped>
.todos-page {
  max-width: 1000px;
  margin: 0 auto;
}

/* ─── 页头 ─── */
.todos-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
}

.page-title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.overdue-badge {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-inverse);
  background: var(--color-danger, #ef4444);
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ─── 美化的新建按钮 ─── */
.create-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 10px 20px 10px 16px;
  background: linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent), white 18%));
  color: var(--color-text-inverse);
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 600;
  overflow: hidden;
  transition: transform var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
  box-shadow: 0 2px 12px rgba(108, 138, 255, 0.3),
              0 1px 3px rgba(0, 0, 0, 0.15);
}

@media (hover: hover) {
  .create-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(108, 138, 255, 0.4),
                0 2px 8px rgba(0, 0, 0, 0.2);
  }
}

.create-btn:active {
  transform: scale(0.97) translateY(0);
}

.create-btn.is-active {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  box-shadow: none;
}

.create-btn-icon {
  display: flex;
  transition: transform var(--duration-normal) var(--ease-spring);
}

.create-btn-icon.rotated {
  transform: rotate(45deg);
}

.create-btn-text {
  white-space: nowrap;
}

/* 微光效果 */
.create-btn-glow {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  animation: create-btn-shimmer 3s ease-in-out infinite;
  pointer-events: none;
}

.create-btn.is-active .create-btn-glow {
  display: none;
}

@keyframes create-btn-shimmer {
  0%, 100% { left: -100%; }
  50% { left: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .create-btn-glow { display: none; }
  .create-btn-icon { transition: none; }
}

/* ─── 新建表单 ─── */
.create-form {
  background: var(--color-surface);
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-xl);
  margin-bottom: var(--space-6);
  overflow: hidden;
}

.create-form-inner {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-6);
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-label-lg {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  letter-spacing: 0.03em;
}

.form-row {
  display: flex;
  gap: var(--space-4);
}

.form-row-duo {
  flex-wrap: wrap;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
  min-width: 140px;
}

.form-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.form-input {
  flex: 1;
}

.title-input {
  font-size: 1.05rem;
  font-weight: 600;
  padding: var(--space-3) var(--space-4);
}

.form-textarea {
  resize: vertical;
  min-height: 56px;
  line-height: 1.6;
  font-size: 0.88rem;
}

.priority-selector {
  display: flex;
  gap: var(--space-1);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: 3px;
}

.priority-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
  transition: all var(--duration-fast) var(--ease-out);
}

.priority-dot-mini {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.priority-dot-mini.dot-high { background: var(--color-danger, #ef4444); }
.priority-dot-mini.dot-medium { background: var(--color-warning, #e6a817); }
.priority-dot-mini.dot-low { background: var(--color-accent); }

.priority-btn.active.priority-high {
  background: rgba(239, 68, 68, 0.15);
  color: var(--color-danger, #ef4444);
}

.priority-btn.active.priority-medium {
  background: rgba(230, 168, 23, 0.15);
  color: var(--color-warning, #e6a817);
}

.priority-btn.active.priority-low {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-divider);
}

.form-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-md);
  font-size: 0.82rem;
  font-weight: 600;
  transition: all var(--duration-fast) var(--ease-out);
}

.form-btn.cancel {
  color: var(--color-text-tertiary);
}

@media (hover: hover) {
  .form-btn.cancel:hover { color: var(--color-text-primary); background: var(--color-bg-hover); }
}

.form-btn.confirm {
  background: var(--color-accent);
  color: var(--color-text-inverse);
  box-shadow: 0 1px 4px rgba(108, 138, 255, 0.25);
}

.form-btn.confirm:disabled { opacity: 0.4; box-shadow: none; }

@media (hover: hover) {
  .form-btn.confirm:not(:disabled):hover {
    opacity: 0.9;
    transform: translateY(-1px);
    box-shadow: 0 3px 12px rgba(108, 138, 255, 0.35);
  }
}

/* ─── 主体双栏 ─── */
.todos-body {
  display: flex;
  gap: var(--space-6);
  align-items: flex-start;
}

.todos-sidebar {
  width: 240px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-xl);
  padding: var(--space-4);
  position: sticky;
  top: var(--space-4);
}

.todos-list-area {
  flex: 1;
  min-width: 0;
}

/* ─── 筛选 Tabs ─── */
.filter-tabs {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-align: left;
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

.filter-tab svg {
  flex-shrink: 0;
  opacity: 0.6;
}

@media (hover: hover) {
  .filter-tab:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
  .filter-tab:hover svg { opacity: 1; }
}

.filter-tab.active {
  background: var(--color-accent-muted);
  color: var(--color-accent);
  font-weight: 600;
}

.filter-tab.active svg {
  opacity: 1;
  color: var(--color-accent);
}

.tab-badge {
  font-size: 0.65rem;
  font-weight: 600;
  background: var(--color-text-tertiary);
  color: var(--color-text-inverse);
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
}

.tab-badge.danger {
  background: var(--color-danger, #ef4444);
}

/* ─── 侧边栏统计 ─── */
.sidebar-stats {
  display: flex;
  gap: var(--space-3);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  flex: 1;
  padding: var(--space-2);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
}

.stat-num {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.stat-label {
  font-size: 0.6rem;
  color: var(--color-text-tertiary);
}

/* ─── 列表标题 ─── */
.list-subtitle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-3);
}

.list-subtitle-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.subtitle-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-md);
  color: var(--color-accent);
  transition: all var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .subtitle-action-btn:hover { background: var(--color-accent-muted); }
}

.clear-date-btn {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  transition: all var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .clear-date-btn:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
}

/* ─── 待办卡片 ─── */
.todo-items {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.todo-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-lg);
  transition: border-color var(--duration-fast) var(--ease-out),
              translate var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .todo-item:hover {
    border-color: var(--color-border-strong);
    translate: 0 -1px;
  }
}

.todo-item.is-overdue {
  border-left: 3px solid var(--color-danger, #ef4444);
}

.todo-item.completed {
  opacity: 0.55;
}

.todo-check {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
  padding: 2px;
  margin-top: 1px;
  transition: color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .todo-check:hover { color: var(--color-accent); }
}

.todo-check.checked {
  color: var(--color-accent);
}

.todo-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.todo-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.todo-priority-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.todo-priority-dot.dot-high { background: var(--color-danger, #ef4444); }
.todo-priority-dot.dot-medium { background: var(--color-warning, #e6a817); }
.todo-priority-dot.dot-low { background: var(--color-accent); }

.todo-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.completed .todo-title {
  text-decoration: line-through;
  color: var(--color-text-tertiary);
}

.todo-desc {
  font-size: 0.78rem;
  color: var(--color-text-tertiary);
  line-height: 1.4;
}

.todo-due {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--color-text-tertiary);
}

.todo-due.overdue {
  color: var(--color-danger, #ef4444);
}

.todo-actions {
  display: flex;
  gap: var(--space-1);
  flex-shrink: 0;
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.todo-item:hover .todo-actions { opacity: 1; }

.todo-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  color: var(--color-text-tertiary);
  transition: all var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .todo-action-btn:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
  .todo-action-btn.danger:hover { color: var(--color-danger, #ef4444); }
}

/* ─── 编辑表单 ─── */
.todo-edit-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* ─── 空状态 ─── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-12) 0;
  color: var(--color-text-tertiary);
}

.empty-action {
  padding: var(--space-2) var(--space-5);
  background: var(--color-accent);
  color: var(--color-text-inverse);
  border-radius: var(--radius-full);
  font-weight: 500;
  font-size: 0.85rem;
}

/* ─── 已完成区域 ─── */
.completed-section {
  margin-top: var(--space-6);
}

.completed-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
  padding: var(--space-2) 0;
}

.toggle-chevron {
  transition: transform var(--duration-fast) var(--ease-out);
}

.toggle-chevron.expanded { transform: rotate(90deg); }

.clear-completed-btn {
  margin-left: auto;
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  transition: all var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .clear-completed-btn:hover { color: var(--color-danger, #ef4444); background: var(--color-bg-hover); }
}

.completed-items {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

/* ─── 过渡 ─── */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all var(--duration-normal) var(--ease-out);
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.section-expand-enter-active,
.section-expand-leave-active {
  transition: all var(--duration-normal) var(--ease-out);
}

.section-expand-enter-from,
.section-expand-leave-to {
  opacity: 0;
}

/* ─── 响应式 ─── */
@media (max-width: 768px) {
  .todos-body {
    flex-direction: column;
  }

  .todos-sidebar {
    width: 100%;
    position: static;
  }
}

@media (prefers-reduced-motion: reduce) {
  .create-btn { transition: none; }
  .create-btn-icon { transition: none; }
}
</style>
