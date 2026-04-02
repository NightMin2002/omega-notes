<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useTasksStore } from '../stores/tasks'
import TimePicker from '../components/TimePicker.vue'

const store = useTasksStore()

/* ─── 每日任务 ─── */
const newTaskTitle = ref('')
const newTaskTime = ref<string | undefined>()
const newTaskCategory = ref('')
const showAddForm = ref(false)
const editingId = ref<string | null>(null)
const editTitle = ref('')
const editTime = ref<string | undefined>()
const editCategory = ref('')
const activeFilter = ref<string | null>(null)

/* ─── 显示模式 & 主题 ─── */
const taskDisplayMode = ref<'list' | 'card'>(
  (localStorage.getItem('omega-task-display') as 'list' | 'card') || 'list'
)
const taskTheme = ref(
  localStorage.getItem('omega-task-theme') || 'default'
)
watch(taskDisplayMode, v => localStorage.setItem('omega-task-display', v))
watch(taskTheme, v => localStorage.setItem('omega-task-theme', v))

async function openPopout() {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('open_popout', { kind: 'progress' })
  } catch { /* browser fallback */ }
}

function handleAddTask() {
  if (!newTaskTitle.value.trim()) return
  store.addTask(
    newTaskTitle.value.trim(),
    newTaskTime.value,
    newTaskCategory.value || undefined
  )
  newTaskTitle.value = ''
  newTaskTime.value = undefined
  newTaskCategory.value = ''
  showAddForm.value = false
}

function startEdit(task: { id: string; title: string; reminderTime?: string; category?: string }) {
  editingId.value = task.id
  editTitle.value = task.title
  editTime.value = task.reminderTime
  editCategory.value = task.category ?? ''
}

function saveEdit() {
  if (editingId.value && editTitle.value.trim()) {
    store.updateTask(editingId.value, {
      title: editTitle.value.trim(),
      reminderTime: editTime.value,
      category: editCategory.value || undefined,
    })
  }
  editingId.value = null
}

function cancelEdit() {
  editingId.value = null
}

/** 按分类筛选后的任务 */
const filteredTasks = computed(() => {
  if (!activeFilter.value) return store.enabledTasks
  return store.enabledTasks.filter(t => (t.category || '未分类') === activeFilter.value)
})

/** 分组显示 */
const groupedTasks = computed(() => {
  const groups: { name: string; tasks: typeof store.enabledTasks }[] = []
  const map = new Map<string, typeof store.enabledTasks>()
  for (const t of filteredTasks.value) {
    const cat = t.category || '未分类'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(t)
  }
  for (const [name, tasks] of map) {
    if (name !== '未分类') groups.push({ name, tasks })
  }
  if (map.has('未分类')) {
    groups.push({ name: '未分类', tasks: map.get('未分类')! })
  }
  return groups
})

/** 所有出现过的分类（含预设） */
const allCategories = computed(() => {
  const set = new Set([...store.config.categories, ...store.usedCategories])
  return Array.from(set)
})

const progressPercent = computed(() => {
  if (store.totalCount === 0) return 0
  return Math.round((store.completedCount / store.totalCount) * 100)
})

/* ─── 健康提醒 ─── */
const newMessage = ref('')
const intervalOptions = [
  { value: 30, label: '30 分钟' },
  { value: 60, label: '60 分钟' },
  { value: 90, label: '90 分钟' },
  { value: 120, label: '120 分钟' },
]

function handleAddMessage() {
  if (!newMessage.value.trim()) return
  store.addReminderMessage(newMessage.value.trim())
  newMessage.value = ''
}

/* ─── 倒计时器 ─── */
const customMinutes = ref(25)

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const countdownProgress = computed(() => {
  const cd = store.countdown
  if (cd.totalSeconds === 0) return 0
  return ((cd.totalSeconds - cd.remainingSeconds) / cd.totalSeconds) * 100
})

/* ─── 设置面板 ─── */
const showSettings = ref(false)
const newCategoryName = ref('')

function handleAddCategory() {
  if (!newCategoryName.value.trim()) return
  store.addCategory(newCategoryName.value.trim())
  newCategoryName.value = ''
}

/* ─── 健康提醒静默时段双向绑定 ─── */
const quietStart = computed({
  get: () => store.healthReminder.quietStart,
  set: (v: string | undefined) => store.updateReminder({ quietStart: v ?? '23:00' }),
})
const quietEnd = computed({
  get: () => store.healthReminder.quietEnd,
  set: (v: string | undefined) => store.updateReminder({ quietEnd: v ?? '08:00' }),
})

const resetTime = computed({
  get: () => store.config.resetTime,
  set: (v: string | undefined) => store.updateConfig({ resetTime: v ?? '04:00' }),
})

/* ─── 实时时钟刷新 ─── */
const currentTime = ref(new Date())
const clockTimer = setInterval(() => { currentTime.value = new Date() }, 1000)
onUnmounted(() => clearInterval(clockTimer))

const timeDisplay = computed(() => {
  const d = currentTime.value
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
})

</script>

<template>
  <div class="tasks-page">
    <header class="page-header">
      <div class="page-title-row">
        <h1>日常管理</h1>
        <button class="btn-icon settings-toggle" :class="{ active: showSettings }" @click="showSettings = !showSettings" data-tooltip="设置">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
      <span class="current-time">{{ timeDisplay }}</span>
    </header>

    <!-- ═══ 设置面板 ═══ -->
    <Transition name="panel-slide">
      <section v-if="showSettings" class="card settings-card">
        <div class="card-header">
          <h2 class="card-title-text">任务设置</h2>
        </div>

        <div class="setting-row">
          <label class="setting-label">每日重置时间</label>
          <div class="reset-row">
            <TimePicker v-model="resetTime" placeholder="04:00" :clearable="false" :minute-step="30" />
            <span class="setting-hint">当前逻辑日期：{{ store.currentDayKey }}</span>
          </div>
        </div>

        <div class="setting-row">
          <label class="setting-label">任务分类管理</label>
          <div class="category-manage">
            <div class="chip-group">
              <span v-for="cat in store.config.categories" :key="cat" class="chip">
                {{ cat }}
                <button class="chip-x" @click="store.removeCategory(cat)">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </span>
            </div>
            <div class="inline-add-row">
              <input
                v-model="newCategoryName"
                class="omega-input flex-1"
                placeholder="新分类名称"
                @keydown.enter="handleAddCategory"
              />
              <button class="btn-sm btn-accent" @click="handleAddCategory">添加</button>
            </div>
          </div>
        </div>
      </section>
    </Transition>

    <div class="tasks-grid">
      <!-- ═══ 左：每日任务 ═══ -->
      <section class="card tasks-card">
        <div class="card-header">
          <div class="card-title-row">
            <svg class="card-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <h2>每日任务</h2>
          </div>
          <span class="task-counter">{{ store.completedCount }}/{{ store.totalCount }}</span>
          <div class="view-controls">
            <div class="view-toggle">
              <button type="button" class="view-btn" :class="{ active: taskDisplayMode === 'list' }" @click="taskDisplayMode = 'list'" data-tooltip="列表">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
              <button type="button" class="view-btn" :class="{ active: taskDisplayMode === 'card' }" @click="taskDisplayMode = 'card'" data-tooltip="卡片">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                </svg>
              </button>
            </div>
            <div class="theme-pills">
              <button type="button" class="theme-pill" :class="{ active: taskTheme === 'default' }" @click="taskTheme = 'default'">默认</button>
              <button type="button" class="theme-pill" :class="{ active: taskTheme === 'minimal' }" @click="taskTheme = 'minimal'">简约</button>
              <button type="button" class="theme-pill" :class="{ active: taskTheme === 'colorful' }" @click="taskTheme = 'colorful'">彩色</button>
            </div>
            <button type="button" class="view-btn" @click="openPopout" data-tooltip="悬挂窗口">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
          </div>
        </div>

        <!-- 分类筛选 -->
        <div v-if="allCategories.length > 0" class="filter-bar">
          <button
            class="pill"
            :class="{ active: activeFilter === null }"
            @click="activeFilter = null"
          >全部</button>
          <button
            v-for="cat in allCategories"
            :key="cat"
            class="pill"
            :class="{ active: activeFilter === cat }"
            @click="activeFilter = activeFilter === cat ? null : cat"
          >{{ cat }}</button>
        </div>

        <!-- 进度条 -->
        <div v-if="store.totalCount > 0" class="progress-track">
          <div
            class="progress-fill"
            :style="{ width: progressPercent + '%' }"
            :class="{ complete: progressPercent === 100 }"
          />
        </div>

        <!-- 任务列表 -->
        <div class="task-list" :class="[`display-${taskDisplayMode}`, `theme-${taskTheme}`]">
          <div v-if="filteredTasks.length === 0" class="empty-state">
            {{ activeFilter ? `「${activeFilter}」下没有任务` : '还没有任务，点击下方添加' }}
          </div>

          <template v-for="group in groupedTasks" :key="group.name">
            <div v-if="groupedTasks.length > 1 || group.name !== '未分类'" class="group-label">
              <span class="group-name">{{ group.name }}</span>
              <span class="group-count">{{ group.tasks.length }}</span>
              <button
                type="button"
                v-if="group.tasks.some(t => !store.isCompleted(t.id) && !store.isSkipped(t.id))"
                class="btn-complete-all"
                @click="store.completeAllInCategory(group.name)"
                data-tooltip="一键完成此分类"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                全部完成
              </button>
            </div>

            <div
              v-for="task in group.tasks"
              :key="task.id"
              class="task-row"
              :class="{ completed: store.isCompleted(task.id), skipped: store.isSkipped(task.id) }"
            >
              <!-- ── 编辑模式 ── -->
              <template v-if="editingId === task.id">
                <div class="task-edit">
                  <input
                    v-model="editTitle"
                    class="omega-input flex-1"
                    placeholder="任务名称"
                    @keydown.enter="saveEdit"
                    @keydown.escape="cancelEdit"
                  />
                  <div class="cat-pills-inline">
                    <button
                      v-for="cat in allCategories"
                      :key="cat"
                      class="pill-sm"
                      :class="{ active: editCategory === cat }"
                      @click="editCategory = editCategory === cat ? '' : cat"
                    >{{ cat }}</button>
                  </div>
                  <div class="edit-bottom-row">
                    <TimePicker v-model="editTime" placeholder="添加提醒" />
                    <div class="edit-actions">
                      <button class="btn-sm btn-accent" @click="saveEdit">保存</button>
                      <button class="btn-sm btn-ghost" @click="cancelEdit">取消</button>
                    </div>
                  </div>
                </div>
              </template>

              <!-- ── 正常显示 ── -->
              <template v-else>
                <label class="task-check">
                  <input
                    type="checkbox"
                    class="sr-only"
                    :checked="store.isCompleted(task.id)"
                    @change="store.toggleComplete(task.id)"
                  />
                  <span class="check-box" :class="{ checked: store.isCompleted(task.id) }">
                    <svg v-if="store.isCompleted(task.id)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                </label>

                <span class="task-name">{{ task.title }}</span>

                <span v-if="task.category && groupedTasks.length <= 1" class="badge badge-cat">{{ task.category }}</span>

                <span v-if="task.reminderTime" class="badge badge-time" data-tooltip="到时间未完成会弹窗提醒">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {{ task.reminderTime }}
                </span>

                <div class="task-actions">
                  <button
                    class="btn-icon" 
                    :class="{ 'skip-active': store.isSkipped(task.id) }"
                    @click="store.toggleSkip(task.id)" 
                    :data-tooltip="store.isSkipped(task.id) ? '取消跳过' : '今天不做'"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                  </button>
                  <button class="btn-icon" @click="startEdit(task)" data-tooltip="编辑">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button class="btn-icon danger" @click="store.removeTask(task.id)" data-tooltip="删除">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </template>
            </div>
          </template>
        </div>

        <!-- 添加任务 -->
        <div class="add-section">
          <Transition name="panel-slide">
            <div v-if="showAddForm" class="add-form">
              <input
                v-model="newTaskTitle"
                class="omega-input flex-1"
                placeholder="任务名称"
                @keydown.enter="handleAddTask"
                @keydown.escape="showAddForm = false"
              />
              <div class="cat-pills-inline">
                <button
                  v-for="cat in allCategories"
                  :key="cat"
                  class="pill-sm"
                  :class="{ active: newTaskCategory === cat }"
                  @click="newTaskCategory = newTaskCategory === cat ? '' : cat"
                >{{ cat }}</button>
              </div>
              <div class="edit-bottom-row">
                <TimePicker v-model="newTaskTime" placeholder="添加提醒" />
                <div class="edit-actions">
                  <button class="btn-sm btn-accent" @click="handleAddTask">添加</button>
                  <button class="btn-sm btn-ghost" @click="showAddForm = false">取消</button>
                </div>
              </div>
            </div>
          </Transition>
          <button v-if="!showAddForm" class="btn-add" @click="showAddForm = true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            添加任务
          </button>
        </div>
      </section>

      <!-- ═══ 右上：倒计时器 ═══ -->
      <section class="card countdown-card">
        <div class="card-header">
          <div class="card-title-row">
            <svg class="card-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <h2>倒计时</h2>
          </div>
        </div>

        <div class="cd-display">
          <svg class="cd-ring" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" class="ring-bg" />
            <circle
              cx="60" cy="60" r="52"
              class="ring-fg"
              :class="{ active: store.countdown.isRunning, paused: store.countdown.isPaused, done: store.countdownFinished }"
              :style="{ strokeDashoffset: (1 - countdownProgress / 100) * 326.73 }"
            />
          </svg>
          <span class="cd-time" :class="{ done: store.countdownFinished }">
            {{ formatTime(store.countdown.remainingSeconds) }}
          </span>
        </div>

        <div class="cd-controls">
          <template v-if="!store.countdown.isRunning && store.countdown.remainingSeconds === store.countdown.totalSeconds">
            <div class="preset-row">
              <button class="btn-preset" @click="store.startCountdown(25)">25m</button>
              <button class="btn-preset" @click="store.startCountdown(45)">45m</button>
              <button class="btn-preset" @click="store.startCountdown(60)">60m</button>
            </div>
            <div class="custom-start">
              <div class="stepper-inline">
                <button class="stepper-dec" @click="customMinutes = Math.max(1, customMinutes - 1)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <input
                  :value="customMinutes"
                  class="stepper-input"
                  inputmode="numeric"
                  @input="(e: Event) => { const v = parseInt((e.target as HTMLInputElement).value); if (!isNaN(v) && v >= 1 && v <= 999) customMinutes = v }"
                  @blur="(e: Event) => { const v = parseInt((e.target as HTMLInputElement).value); if (isNaN(v) || v < 1) customMinutes = 1 }"
                />
                <button class="stepper-inc" @click="customMinutes = Math.min(999, customMinutes + 1)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
              <span class="minutes-unit">分钟</span>
              <button class="btn-sm btn-accent" @click="store.startCountdown(customMinutes)">开始</button>
            </div>
          </template>
          <template v-else>
            <div class="running-row">
              <button
                v-if="store.countdown.isRunning"
                class="btn-sm"
                :class="store.countdown.isPaused ? 'btn-accent' : 'btn-ghost'"
                @click="store.pauseCountdown()"
              >{{ store.countdown.isPaused ? '继续' : '暂停' }}</button>
              <button class="btn-sm btn-ghost" @click="store.resetCountdown()">重置</button>
            </div>
          </template>
        </div>
      </section>

      <!-- ═══ 右下：健康提醒 ═══ -->
      <section class="card reminder-card">
        <div class="card-header">
          <div class="card-title-row">
            <svg class="card-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <h2>健康提醒</h2>
          </div>
          <label class="toggle">
            <input
              type="checkbox"
              class="sr-only"
              :checked="store.healthReminder.enabled"
              @change="store.updateReminder({ enabled: !store.healthReminder.enabled })"
            />
            <span class="toggle-track" :class="{ on: store.healthReminder.enabled }">
              <span class="toggle-thumb" />
            </span>
          </label>
        </div>

        <div class="reminder-body" :class="{ off: !store.healthReminder.enabled }">
          <!-- 间隔 -->
          <div class="setting-row">
            <label class="setting-label">提醒间隔</label>
            <div class="pill-group">
              <button
                v-for="opt in intervalOptions"
                :key="opt.value"
                class="pill"
                :class="{ active: store.healthReminder.intervalMinutes === opt.value }"
                @click="store.updateReminder({ intervalMinutes: opt.value })"
              >{{ opt.label }}</button>
            </div>
          </div>

          <!-- 静默时段 -->
          <div class="setting-row">
            <label class="setting-label">静默时段</label>
            <div class="quiet-row">
              <TimePicker v-model="quietStart" placeholder="23:00" :clearable="false" :minute-step="30" />
              <span class="quiet-sep">~</span>
              <TimePicker v-model="quietEnd" placeholder="08:00" :clearable="false" :minute-step="30" />
            </div>
          </div>

          <!-- 消息 -->
          <div class="setting-row">
            <label class="setting-label">提醒消息（随机轮播）</label>
            <div class="msg-list">
              <div
                v-for="(msg, i) in store.healthReminder.messages"
                :key="i"
                class="msg-item"
              >
                <span class="msg-text">{{ msg }}</span>
                <button class="btn-icon danger sm" @click="store.removeReminderMessage(i)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="inline-add-row">
              <input
                v-model="newMessage"
                class="omega-input flex-1"
                placeholder="添加新消息"
                @keydown.enter="handleAddMessage"
              />
              <button class="btn-sm btn-accent" @click="handleAddMessage">添加</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════
   页面框架
   ═══════════════════════════════ */
.tasks-page {
  padding: var(--space-6);
  max-width: 1100px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
}

.page-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.page-header h1 {
  font-size: clamp(1.4rem, 3vw, 1.8rem);
  font-weight: 700;
  color: var(--color-text-primary);
}

.settings-toggle {
  width: 32px;
  height: 32px;
  color: var(--color-text-tertiary);
  transition: color var(--duration-fast) var(--ease-out);
}

.settings-toggle.active {
  color: var(--color-accent);
}

.settings-toggle svg {
  transition: transform var(--duration-normal) var(--ease-out);
}

.settings-toggle.active svg {
  transform: rotate(90deg);
}

.current-time {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: var(--color-accent);
  background: var(--color-accent-muted);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
}

/* ═══════════════════════════════
   设置卡片
   ═══════════════════════════════ */
.settings-card { margin-bottom: var(--space-4); }

.card-title-text {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.reset-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.setting-hint {
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
}

.category-manage {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 0.75rem;
  padding: var(--space-1) var(--space-2);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
}

.chip-x {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: var(--radius-full);
  color: var(--color-text-tertiary);
  transition: color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .chip-x:hover { color: var(--color-danger); }
}

/* ═══════════════════════════════
   Grid
   ═══════════════════════════════ */
.tasks-grid {
  display: grid;
  grid-template-columns: 1fr 300px;
  grid-template-rows: auto auto;
  gap: var(--space-3);
}

.tasks-card { grid-row: 1 / 3; }
.countdown-card { grid-column: 2; }
.reminder-card { grid-column: 2; }

@media (max-width: 900px) {
  .tasks-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }
  .tasks-card { grid-row: auto; }
  .countdown-card,
  .reminder-card { grid-column: auto; }
}

/* ═══════════════════════════════
   Card
   ═══════════════════════════════ */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-2);
}

/* ── 视图控件 ── */
.view-controls {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: auto;
}

.view-toggle {
  display: flex;
  gap: 2px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  padding: 2px;
}

.view-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--color-text-tertiary);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

.view-btn.active {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  box-shadow: 0 1px 3px var(--color-shadow);
}

@media (hover: hover) {
  .view-btn:not(.active):hover {
    color: var(--color-text-secondary);
  }
}

.view-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-accent-muted);
}

.theme-pills {
  display: flex;
  gap: 2px;
}

.theme-pill {
  font-size: 0.62rem;
  font-weight: 500;
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  color: var(--color-text-tertiary);
  background: transparent;
  border: 1px solid var(--color-border);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

.theme-pill.active {
  background: var(--color-accent-muted);
  color: var(--color-accent);
  border-color: var(--color-accent);
}

@media (hover: hover) {
  .theme-pill:not(.active):hover {
    border-color: var(--color-border-strong);
    color: var(--color-text-secondary);
  }
}

.theme-pill:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-accent-muted);
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-primary);
}

.card-icon { flex-shrink: 0; }

.card-title-row h2 {
  font-size: 1rem;
  font-weight: 600;
}

.task-counter {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--color-text-tertiary);
}

/* ═══════════════════════════════
   分类筛选
   ═══════════════════════════════ */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

/* ═══════════════════════════════
   分组标题
   ═══════════════════════════════ */
.group-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  margin-top: var(--space-2);
}

.group-label:first-child { margin-top: 0; }

.group-name {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-tertiary);
}

.group-count {
  font-size: 0.65rem;
  font-family: var(--font-mono);
  color: var(--color-text-tertiary);
  background: var(--color-bg-tertiary);
  padding: 0 var(--space-1);
  border-radius: var(--radius-sm);
}

.btn-complete-all {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: auto;
  font-size: 0.62rem;
  font-weight: 500;
  padding: 1px var(--space-2);
  border-radius: var(--radius-full);
  color: var(--color-success, #48bb78);
  background: transparent;
  border: 1px solid var(--color-success, #48bb78);
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out),
              background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
}

.group-label:hover .btn-complete-all { opacity: 1; }

.btn-complete-all:active { transform: scale(0.95); }

@media (hover: hover) {
  .btn-complete-all:hover {
    background: var(--color-success, #48bb78);
    color: var(--color-text-inverse);
  }
}

@media (hover: none) {
  .btn-complete-all { opacity: 1; }
}

/* ═══════════════════════════════
   进度条
   ═══════════════════════════════ */
.progress-track {
  height: 4px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: var(--radius-full);
  transition: width var(--duration-normal) var(--ease-out);
}

.progress-fill.complete { background: var(--color-success); }

/* ═══════════════════════════════
   任务列表
   ═══════════════════════════════ */
.task-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.empty-state {
  color: var(--color-text-tertiary);
  font-size: 0.85rem;
  text-align: center;
  padding: var(--space-8) var(--space-4);
}

.task-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  transition: background-color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .task-row:hover { background: var(--color-bg-hover); }
  .task-row:hover .task-actions { opacity: 1; }
}

.task-row.completed .task-name {
  text-decoration: line-through;
  color: var(--color-text-tertiary);
}

/* ── 跳过（今天不做）── */
.task-row.skipped {
  background: var(--color-danger-muted, oklch(0.35 0.08 25 / 0.1));
  border-left: 3px solid var(--color-danger);
  padding-left: calc(var(--space-2) - 3px);
}

.task-row.skipped .task-name {
  text-decoration: line-through;
  color: var(--color-danger);
  opacity: 0.7;
}

.task-row.skipped .check-box {
  border-color: var(--color-danger);
  opacity: 0.5;
}

.btn-icon.skip-active {
  color: var(--color-danger);
  opacity: 1 !important;
}

/* ── Checkbox ── */
.sr-only {
  opacity: 0;
  position: absolute;
  width: 0;
  height: 0;
}

.task-check {
  display: flex;
  align-items: center;
  cursor: pointer;
  flex-shrink: 0;
}

.check-box {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

.check-box.checked {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-text-inverse);
}

.task-name {
  flex: 1;
  font-size: 0.9rem;
  color: var(--color-text-primary);
  transition: color var(--duration-fast) var(--ease-out);
}

/* ── 标签徽章 ── */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.65rem;
  padding: 1px var(--space-2);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  white-space: nowrap;
}

.badge-cat {
  color: var(--color-warning);
  background: var(--color-warning-muted);
}

.badge-time {
  font-family: var(--font-mono);
  color: var(--color-accent);
  background: var(--color-accent-muted);
}

.task-actions {
  display: flex;
  gap: var(--space-1);
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out);
}

@media (hover: none) {
  .task-actions { opacity: 1; }
}

/* ── 编辑表单 ── */
.task-edit {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
  padding: var(--space-2) 0;
}

.cat-pills-inline {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.pill-sm {
  font-size: 0.68rem;
  font-weight: 500;
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  background: var(--color-bg-tertiary);
  color: var(--color-text-tertiary);
  border: 1px solid var(--color-border);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

.pill-sm:active { transform: scale(0.96); }

.pill-sm.active {
  background: var(--color-accent-muted);
  color: var(--color-accent);
  border-color: var(--color-accent);
}

@media (hover: hover) {
  .pill-sm:hover { border-color: var(--color-border-strong); }
}

.edit-bottom-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.edit-actions {
  display: flex;
  gap: var(--space-2);
}

/* ═══════════════════════════════
   公共控件
   ═══════════════════════════════ */

/* ── Omega Input ── */
.omega-input {
  appearance: none;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  color: var(--color-text-primary);
  font-size: 0.85rem;
  flex: 1;
  min-width: 120px;
  transition: border-color var(--duration-fast) var(--ease-out),
              background-color var(--duration-fast) var(--ease-out);
}

.omega-input:focus-visible {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-muted);
  outline: none;
}

@media (hover: hover) {
  .omega-input:hover { border-color: var(--color-border-strong); }
}

.omega-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Pill ── */
.pill {
  font-size: 0.72rem;
  font-weight: 500;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  background: var(--color-bg-tertiary);
  color: var(--color-text-tertiary);
  border: 1px solid var(--color-border);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

.pill:active { transform: scale(0.96); }

@media (hover: hover) {
  .pill:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-secondary);
  }
}

.pill.active {
  background: var(--color-accent-muted);
  color: var(--color-accent);
  border-color: var(--color-accent);
}

/* ── btn-icon ── */
.btn-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--color-text-tertiary);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

.btn-icon:active { transform: scale(0.98); }

@media (hover: hover) {
  .btn-icon:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
  .btn-icon.danger:hover {
    background: var(--color-danger-muted);
    color: var(--color-danger);
  }
}

.btn-icon:focus-visible {
  box-shadow: 0 0 0 2px var(--color-accent-muted);
  outline: none;
}

.btn-icon.sm { width: 22px; height: 22px; }

/* ── btn-sm ── */
.btn-sm {
  font-size: 0.78rem;
  font-weight: 500;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

.btn-sm:active { transform: scale(0.98); }

.btn-accent {
  background: var(--color-accent);
  color: var(--color-text-inverse);
}

@media (hover: hover) {
  .btn-accent:hover { background: var(--color-accent-hover); }
}

.btn-ghost {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

@media (hover: hover) {
  .btn-ghost:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
}

/* ── btn-add ── */
.btn-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-tertiary);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

.btn-add:active { transform: scale(0.98); }

@media (hover: hover) {
  .btn-add:hover {
    background: var(--color-bg-hover);
    color: var(--color-accent);
    border-color: var(--color-accent);
  }
}

/* ── 添加表单 ── */
.add-section { margin-top: auto; }

.add-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.inline-add-row {
  display: flex;
  gap: var(--space-2);
}

.flex-1 { flex: 1; }

/* ═══════════════════════════════
   倒计时
   ═══════════════════════════════ */
.cd-display {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4) 0;
}

.cd-ring { width: 140px; height: 140px; }

.ring-bg {
  fill: none;
  stroke: var(--color-bg-tertiary);
  stroke-width: 6;
}

.ring-fg {
  fill: none;
  stroke: var(--color-accent);
  stroke-width: 6;
  stroke-linecap: round;
  stroke-dasharray: 326.73;
  stroke-dashoffset: 326.73;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
  transition: stroke-dashoffset 0.5s var(--ease-out);
}

.ring-fg.active { stroke: var(--color-accent); }
.ring-fg.paused { stroke: var(--color-warning); }
.ring-fg.done   { stroke: var(--color-success); }

.cd-time {
  position: absolute;
  font-family: var(--font-mono);
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: 0.05em;
}

.cd-time.done { color: var(--color-success); }

.cd-controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: center;
}

.preset-row {
  display: flex;
  gap: var(--space-2);
}

.btn-preset {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  font-weight: 500;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

.btn-preset:active { transform: scale(0.98); }

@media (hover: hover) {
  .btn-preset:hover {
    background: var(--color-accent-muted);
    color: var(--color-accent);
    border-color: var(--color-accent);
  }
}

.custom-start {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.stepper-inline {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-bg-tertiary);
}

.stepper-dec,
.stepper-inc {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

.stepper-dec:active,
.stepper-inc:active {
  transform: scale(0.92);
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

@media (hover: hover) {
  .stepper-dec:hover,
  .stepper-inc:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
}

.stepper-input {
  width: 44px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-primary);
  background: transparent;
  border: none;
  border-left: 1px solid var(--color-border);
  border-right: 1px solid var(--color-border);
  padding: 0;
  height: 32px;
  line-height: 32px;
}

.stepper-input:focus-visible {
  background: var(--color-accent-muted);
  outline: none;
  box-shadow: none;
}

.minutes-unit {
  font-size: 0.78rem;
  color: var(--color-text-tertiary);
}

.running-row {
  display: flex;
  gap: var(--space-2);
}

/* ═══════════════════════════════
   健康提醒
   ═══════════════════════════════ */
.toggle {
  cursor: pointer;
  display: flex;
  align-items: center;
}

.toggle-track {
  position: relative;
  width: 40px;
  height: 22px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  transition: background-color var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

.toggle-track.on {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: var(--color-text-primary);
  border-radius: var(--radius-full);
  transition: transform var(--duration-fast) var(--ease-spring);
}

.toggle-track.on .toggle-thumb {
  transform: translateX(18px);
  background: var(--color-text-inverse);
}

.reminder-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  transition: opacity var(--duration-fast) var(--ease-out);
}

.reminder-body.off {
  opacity: 0.4;
  pointer-events: none;
}

.setting-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.setting-label {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.pill-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.quiet-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.quiet-sep {
  color: var(--color-text-tertiary);
  font-size: 0.85rem;
}

.msg-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  max-height: 160px;
  overflow-y: auto;
}

.msg-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--color-bg-tertiary);
}

.msg-text {
  flex: 1;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

/* ═══════════════════════════════
   过渡动画
   ═══════════════════════════════ */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: opacity var(--duration-fast) var(--ease-out),
              max-height var(--duration-normal) var(--ease-out);
  overflow: hidden;
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  opacity: 0;
  max-height: 0;
}

.panel-slide-enter-to,
.panel-slide-leave-from {
  max-height: 400px;
}

/* ─── 无障碍 ─── */
@media (prefers-reduced-motion: reduce) {
  .progress-fill,
  .ring-fg,
  .toggle-thumb,
  .check-box,
  .settings-toggle {
    transition: none;
  }
}

/* ═══════════════════════════════
   #4 卡片视图模式
   ═══════════════════════════════ */
.task-list.display-card {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-2);
}

.display-card .group-label {
  grid-column: 1 / -1;
}

.display-card .task-row {
  flex-direction: column;
  align-items: stretch;
  padding: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  gap: var(--space-2);
  transition: translate var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .display-card .task-row:hover {
    translate: 0 -2px;
    box-shadow: var(--shadow-md);
    border-color: var(--color-border-strong);
  }
}

.display-card .task-row:active {
  transform: scale(0.98);
}

.display-card .task-check {
  order: -1;
}

.display-card .task-name {
  font-size: 0.85rem;
  font-weight: 500;
}

.display-card .task-actions {
  opacity: 1;
  justify-content: flex-end;
  border-top: 1px solid var(--color-divider);
  padding-top: var(--space-1);
  margin-top: auto;
}

.display-card .badge {
  align-self: flex-start;
}

/* ═══════════════════════════════
   #4 简约主题
   ═══════════════════════════════ */
.theme-minimal .task-row {
  border-bottom: 1px dashed var(--color-divider);
  border-radius: 0;
  padding: var(--space-1) 0;
}

@media (hover: hover) {
  .theme-minimal .task-row:hover {
    background: transparent;
  }
}

.theme-minimal .task-name {
  font-size: 0.82rem;
  color: var(--color-text-secondary);
}

.theme-minimal .task-row.completed .task-name {
  opacity: 0.4;
}

.theme-minimal .badge {
  opacity: 0.6;
  font-size: 0.6rem;
}

.theme-minimal .check-box {
  width: 16px;
  height: 16px;
  border-width: 1.5px;
  border-radius: var(--radius-full);
}

.theme-minimal .group-label {
  padding-left: 0;
  padding-right: 0;
}

/* card + minimal */
.display-card.theme-minimal .task-row {
  border-bottom: none;
  border: 1px dashed var(--color-divider);
  border-radius: var(--radius-sm);
  padding: var(--space-2);
}

/* ═══════════════════════════════
   #4 彩色主题
   ═══════════════════════════════ */
.theme-colorful .task-row {
  border-left: 3px solid var(--color-accent);
  padding-left: calc(var(--space-2) + 1px);
  border-radius: var(--radius-sm);
}

.theme-colorful .group-label {
  background: var(--color-accent-muted);
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-3);
}

.theme-colorful .group-name {
  color: var(--color-accent);
}

/* 不同分类用不同色相 */
.theme-colorful .task-row:nth-child(6n+1) { border-left-color: oklch(0.72 0.15 240); }
.theme-colorful .task-row:nth-child(6n+2) { border-left-color: oklch(0.72 0.15 160); }
.theme-colorful .task-row:nth-child(6n+3) { border-left-color: oklch(0.72 0.15 30); }
.theme-colorful .task-row:nth-child(6n+4) { border-left-color: oklch(0.72 0.15 300); }
.theme-colorful .task-row:nth-child(6n+5) { border-left-color: oklch(0.72 0.15 80); }

.theme-colorful .check-box.checked {
  background: oklch(0.72 0.15 160);
  border-color: oklch(0.72 0.15 160);
}

/* card + colorful */
.display-card.theme-colorful .task-row {
  border-left-width: 4px;
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--color-accent);
}

.display-card.theme-colorful .task-row:nth-child(6n+1) { border-left-color: oklch(0.72 0.15 240); }
.display-card.theme-colorful .task-row:nth-child(6n+2) { border-left-color: oklch(0.72 0.15 160); }
.display-card.theme-colorful .task-row:nth-child(6n+3) { border-left-color: oklch(0.72 0.15 30); }
.display-card.theme-colorful .task-row:nth-child(6n+4) { border-left-color: oklch(0.72 0.15 300); }
.display-card.theme-colorful .task-row:nth-child(6n+5) { border-left-color: oklch(0.72 0.15 80); }

</style>
