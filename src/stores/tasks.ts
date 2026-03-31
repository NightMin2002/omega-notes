/**
 * Ω Notes V2 — 日常管理 Store
 * 管理每日任务、健康提醒、倒计时器
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DailyTask, DailyRecord, HealthReminder, CountdownState } from '@/types'
import { isTauri } from '@/utils/storage'

/* ─── 存储 Key ─── */
const TASKS_KEY = 'omega-daily-tasks'
const RECORDS_KEY = 'omega-daily-records'
const REMINDER_KEY = 'omega-health-reminder'
const CONFIG_KEY = 'omega-tasks-config'
const COUNTDOWN_KEY = 'omega-countdown'
const COUNTDOWN_NOTIFIED_KEY = 'omega-countdown-notified'

/* ─── 任务配置 ─── */
interface TasksConfig {
  /** 每日重置时间，格式 "HH:mm"，默认 "04:00" */
  resetTime: string
  /** 预设分类列表 */
  categories: string[]
}

const defaultConfig: TasksConfig = {
  resetTime: '04:00',
  categories: ['游戏', '健康', '学习', '工作', '生活'],
}

/* ─── 默认值 ─── */
const defaultReminder: HealthReminder = {
  enabled: false,
  intervalMinutes: 60,
  messages: [
    '起来走动一下吧，久坐伤身',
    '记得喝水！',
    '眼睛看看远处，休息一下',
    '伸展一下身体吧',
    '深呼吸，放松肩膀',
  ],
  quietStart: '23:00',
  quietEnd: '08:00',
}

/* ─── 工具函数 ─── */

/**
 * 根据自定义重置时间计算「逻辑日期」。
 * 例如重置时间 04:00，则 03:59 属于昨天，04:00 属于今天。
 */
function todayKey(resetTime: string): string {
  const now = new Date()
  const [rh, rm] = resetTime.split(':').map(Number)
  const resetMinutes = (rh ?? 4) * 60 + (rm ?? 0)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  // 如果当前时间 < 重置时间，则逻辑上还是「昨天」
  const d = new Date(now)
  if (currentMinutes < resetMinutes) {
    d.setDate(d.getDate() - 1)
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch { /* 忽略 */ }
  return fallback
}

function saveJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

/* ─── 通知函数（延迟加载） ─── */
let _sendNotification: ((options: { title: string; body: string }) => void) | null = null
let _notifyReady = false

async function ensureNotify() {
  if (_notifyReady) return
  _notifyReady = true
  if (!isTauri()) return
  try {
    const mod = await import('@tauri-apps/plugin-notification')
    let perm = await mod.isPermissionGranted()
    if (!perm) {
      const result = await mod.requestPermission()
      perm = result === 'granted'
    }
    if (perm) {
      _sendNotification = mod.sendNotification
    }
  } catch (e) {
    console.warn('[tasks] notification plugin not available:', e)
  }
}

function notify(title: string, body: string) {
  if (_sendNotification) {
    _sendNotification({ title, body })
  }
}

export const useTasksStore = defineStore('tasks', () => {
  /* ═══════════════════════════════════
     配置
     ═══════════════════════════════════ */
  const config = ref<TasksConfig>(loadJSON(CONFIG_KEY, { ...defaultConfig }))

  function updateConfig(patch: Partial<TasksConfig>) {
    Object.assign(config.value, patch)
    saveJSON(CONFIG_KEY, config.value)
  }

  function addCategory(name: string) {
    if (name.trim() && !config.value.categories.includes(name.trim())) {
      config.value.categories.push(name.trim())
      saveJSON(CONFIG_KEY, config.value)
    }
  }

  function removeCategory(name: string) {
    config.value.categories = config.value.categories.filter(c => c !== name)
    saveJSON(CONFIG_KEY, config.value)
  }

  /* ═══════════════════════════════════
     每日任务
     ═══════════════════════════════════ */
  const tasks = ref<DailyTask[]>(loadJSON(TASKS_KEY, []))
  const records = ref<DailyRecord[]>(loadJSON(RECORDS_KEY, []))

  /** 当前逻辑日期 key */
  const currentDayKey = computed(() => todayKey(config.value.resetTime))

  /** 当日已完成 ID 集合 */
  const todayCompletedIds = computed(() => {
    const today = currentDayKey.value
    const rec = records.value.find(r => r.date === today)
    return new Set(rec?.completedIds ?? [])
  })

  /** 启用中的任务 */
  const enabledTasks = computed(() =>
    tasks.value.filter(t => t.enabled).sort((a, b) => a.sortOrder - b.sortOrder)
  )

  /** 按分类分组的任务 */
  const tasksByCategory = computed(() => {
    const groups = new Map<string, DailyTask[]>()
    for (const t of enabledTasks.value) {
      const cat = t.category || '未分类'
      if (!groups.has(cat)) groups.set(cat, [])
      groups.get(cat)!.push(t)
    }
    return groups
  })

  /** 所有已使用的分类 */
  const usedCategories = computed(() => {
    const cats = new Set<string>()
    for (const t of tasks.value) {
      if (t.category) cats.add(t.category)
    }
    return Array.from(cats)
  })

  /** 今日完成数 */
  const completedCount = computed(() => {
    const set = todayCompletedIds.value
    return enabledTasks.value.filter(t => set.has(t.id)).length
  })

  /** 今日任务总数 */
  const totalCount = computed(() => enabledTasks.value.length)

  function persistTasks() { saveJSON(TASKS_KEY, tasks.value) }
  function persistRecords() { saveJSON(RECORDS_KEY, records.value) }

  function addTask(title: string, reminderTime?: string, category?: string) {
    const maxOrder = tasks.value.reduce((m, t) => Math.max(m, t.sortOrder), 0)
    tasks.value.push({
      id: generateId(),
      title,
      reminderTime,
      category,
      enabled: true,
      createdAt: new Date().toISOString(),
      sortOrder: maxOrder + 1,
    })
    persistTasks()
  }

  function updateTask(id: string, patch: Partial<Pick<DailyTask, 'title' | 'reminderTime' | 'enabled' | 'category'>>) {
    const t = tasks.value.find(x => x.id === id)
    if (t) {
      Object.assign(t, patch)
      persistTasks()
    }
  }

  function removeTask(id: string) {
    tasks.value = tasks.value.filter(t => t.id !== id)
    persistTasks()
  }

  function toggleComplete(id: string) {
    const today = currentDayKey.value
    let rec = records.value.find(r => r.date === today)
    if (!rec) {
      rec = { date: today, completedIds: [] }
      records.value.push(rec)
    }
    const idx = rec.completedIds.indexOf(id)
    if (idx >= 0) {
      rec.completedIds.splice(idx, 1)
    } else {
      rec.completedIds.push(id)
    }
    persistRecords()
  }

  function isCompleted(id: string): boolean {
    return todayCompletedIds.value.has(id)
  }

  /** 清理超过 30 天的记录 */
  function cleanOldRecords() {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    records.value = records.value.filter(r => r.date >= cutoffStr)
    persistRecords()
  }

  /** 当日跳过 ID 集合 */
  const todaySkippedIds = computed(() => {
    const today = currentDayKey.value
    const rec = records.value.find(r => r.date === today)
    return new Set(rec?.skippedIds ?? [])
  })

  /** 切换跳过状态（今天不做） */
  function toggleSkip(id: string) {
    const today = currentDayKey.value
    let rec = records.value.find(r => r.date === today)
    if (!rec) {
      rec = { date: today, completedIds: [], skippedIds: [] }
      records.value.push(rec)
    }
    if (!rec.skippedIds) rec.skippedIds = []
    const idx = rec.skippedIds.indexOf(id)
    if (idx >= 0) {
      rec.skippedIds.splice(idx, 1)
    } else {
      rec.skippedIds.push(id)
    }
    persistRecords()
  }

  function isSkipped(id: string): boolean {
    return todaySkippedIds.value.has(id)
  }

  /** 一键完成某分类下所有未完成任务 */
  function completeAllInCategory(category: string) {
    const today = currentDayKey.value
    let rec = records.value.find(r => r.date === today)
    if (!rec) {
      rec = { date: today, completedIds: [], skippedIds: [] }
      records.value.push(rec)
    }
    for (const task of enabledTasks.value) {
      const taskCat = task.category || '未分类'
      if (taskCat === category && !rec.completedIds.includes(task.id)) {
        rec.completedIds.push(task.id)
      }
    }
    persistRecords()
  }

  /** 导入任务（跳过已存在的 ID） */
  function importTasks(incoming: DailyTask[], incomingRecords?: DailyRecord[]): number {
    const existingIds = new Set(tasks.value.map(t => t.id))
    let imported = 0
    for (const t of incoming) {
      if (!existingIds.has(t.id)) {
        tasks.value.push(t)
        existingIds.add(t.id)
        imported++
      }
    }
    if (imported > 0) persistTasks()

    /* 合并完成记录 */
    if (incomingRecords && incomingRecords.length > 0) {
      for (const ir of incomingRecords) {
        const existing = records.value.find(r => r.date === ir.date)
        if (existing) {
          for (const cid of ir.completedIds) {
            if (!existing.completedIds.includes(cid)) existing.completedIds.push(cid)
          }
          if (ir.skippedIds) {
            if (!existing.skippedIds) existing.skippedIds = []
            for (const sid of ir.skippedIds) {
              if (!existing.skippedIds.includes(sid)) existing.skippedIds.push(sid)
            }
          }
        } else {
          records.value.push(ir)
        }
      }
      persistRecords()
    }

    return imported
  }

  /* ═══════════════════════════════════
     健康提醒
     ═══════════════════════════════════ */
  const healthReminder = ref<HealthReminder>(loadJSON(REMINDER_KEY, { ...defaultReminder }))

  function updateReminder(patch: Partial<HealthReminder>) {
    Object.assign(healthReminder.value, patch)
    saveJSON(REMINDER_KEY, healthReminder.value)
  }

  function addReminderMessage(msg: string) {
    if (msg.trim() && !healthReminder.value.messages.includes(msg.trim())) {
      healthReminder.value.messages.push(msg.trim())
      saveJSON(REMINDER_KEY, healthReminder.value)
    }
  }

  function removeReminderMessage(index: number) {
    healthReminder.value.messages.splice(index, 1)
    saveJSON(REMINDER_KEY, healthReminder.value)
  }

  /** 上次健康提醒触发的分钟标记（避免同一分钟重复触发） */
  const lastHealthTrigger = ref('')

  /* ═══════════════════════════════════
     倒计时器
     ═══════════════════════════════════ */
  const countdown = ref<CountdownState>({
    isRunning: false,
    isPaused: false,
    totalSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
  })

  /** 倒计时结束标记（供 UI 读取） */
  const countdownFinished = ref(false)

  let countdownTimer: ReturnType<typeof setInterval> | null = null

  /**
   * 倒计时结束时发通知（防重：只有第一个窗口写入 flag 的才发）
   */
  function notifyCountdownOnce() {
    const flagKey = COUNTDOWN_NOTIFIED_KEY
    const existing = localStorage.getItem(flagKey)
    if (existing) {
      const ts = parseInt(existing, 10)
      // 5秒内的重复通知视为重复
      if (Date.now() - ts < 5000) return
    }
    localStorage.setItem(flagKey, String(Date.now()))
    const mins = Math.round(countdown.value.totalSeconds / 60)
    notify('Ω Notes — 计时结束', `${mins} 分钟倒计时已结束！`)
  }

  function startCountdown(minutes: number) {
    stopCountdown()
    countdownFinished.value = false
    localStorage.removeItem(COUNTDOWN_NOTIFIED_KEY)
    const secs = minutes * 60
    countdown.value = {
      isRunning: true,
      isPaused: false,
      totalSeconds: secs,
      remainingSeconds: secs,
    }
    persistCountdown()
    countdownTimer = setInterval(() => {
      if (!countdown.value.isPaused && countdown.value.isRunning) {
        countdown.value.remainingSeconds--
        if (countdown.value.remainingSeconds <= 0) {
          countdown.value.remainingSeconds = 0
          countdown.value.isRunning = false
          countdownFinished.value = true
          stopCountdown()
          persistCountdown()
          notifyCountdownOnce()
        } else if (countdown.value.remainingSeconds % 5 === 0) {
          persistCountdown()
        }
      }
    }, 1000)
  }

  function pauseCountdown() {
    countdown.value.isPaused = !countdown.value.isPaused
    persistCountdown()
  }

  function stopCountdown() {
    if (countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }

  function resetCountdown() {
    stopCountdown()
    countdownFinished.value = false
    countdown.value = {
      isRunning: false,
      isPaused: false,
      totalSeconds: countdown.value.totalSeconds,
      remainingSeconds: countdown.value.totalSeconds,
    }
    persistCountdown()
  }

  /** 持久化倒计时状态 */
  function persistCountdown() {
    saveJSON(COUNTDOWN_KEY, {
      ...countdown.value,
      /** 存储时间戳，用于跨窗口同步剩余时间 */
      savedAt: Date.now(),
    })
  }

  /**
   * 跨窗口同步：从 localStorage 重新读取所有状态
   * 供主窗口和悬挂窗口共同使用
   */
  function syncFromStorage() {
    try {
      const rawTasks = localStorage.getItem(TASKS_KEY)
      if (rawTasks) {
        const fresh = JSON.parse(rawTasks)
        if (JSON.stringify(tasks.value) !== rawTasks) {
          tasks.value.splice(0, tasks.value.length, ...fresh)
        }
      }
      const rawRecords = localStorage.getItem(RECORDS_KEY)
      if (rawRecords) {
        const fresh = JSON.parse(rawRecords)
        if (JSON.stringify(records.value) !== rawRecords) {
          records.value.splice(0, records.value.length, ...fresh)
        }
      }
      const rawCd = localStorage.getItem(COUNTDOWN_KEY)
      if (rawCd) {
        const saved = JSON.parse(rawCd) as CountdownState & { savedAt?: number }
        // 如果另一个窗口正在运行倒计时，计算已过去的时间
        if (saved.isRunning && !saved.isPaused && saved.savedAt) {
          const elapsed = Math.floor((Date.now() - saved.savedAt) / 1000)
          saved.remainingSeconds = Math.max(0, saved.remainingSeconds - elapsed)
          if (saved.remainingSeconds <= 0) {
            saved.isRunning = false
            saved.remainingSeconds = 0
          }
        }
        countdown.value = {
          isRunning: saved.isRunning,
          isPaused: saved.isPaused,
          totalSeconds: saved.totalSeconds,
          remainingSeconds: saved.remainingSeconds,
        }
        // ★ 不在这里启动定时器！
        // 同步窗口只更新显示值，避免多个窗口各自运行独立定时器导致多重通知。
        // 定时器恢复仅在 init() 中执行（窗口刷新/重开时接管）。
      }
    } catch { /* ignore parse errors */ }
  }

  /* ─── 初始化 ─── */
  async function init() {
    cleanOldRecords()
    syncFromStorage()

    /* 窗口（重新）打开时，如果倒计时正在运行，接管定时器 */
    if (countdown.value.isRunning && !countdownTimer) {
      countdownTimer = setInterval(() => {
        if (!countdown.value.isPaused && countdown.value.isRunning) {
          countdown.value.remainingSeconds--
          if (countdown.value.remainingSeconds <= 0) {
            countdown.value.remainingSeconds = 0
            countdown.value.isRunning = false
            countdownFinished.value = true
            stopCountdown()
            persistCountdown()
            notifyCountdownOnce()
          } else if (countdown.value.remainingSeconds % 5 === 0) {
            persistCountdown()
          }
        }
      }, 1000)
    }

    await ensureNotify()

    /* 监听其他窗口的 localStorage 变化（storage 事件只在其他窗口触发） */
    window.addEventListener('storage', (e) => {
      if (e.key === TASKS_KEY || e.key === RECORDS_KEY || e.key === COUNTDOWN_KEY) {
        syncFromStorage()
      }
    })
  }

  return {
    // 配置
    config,
    updateConfig,
    addCategory,
    removeCategory,
    // 每日任务
    tasks,
    records,
    currentDayKey,
    enabledTasks,
    tasksByCategory,
    usedCategories,
    todayCompletedIds,
    completedCount,
    totalCount,
    addTask,
    updateTask,
    removeTask,
    toggleComplete,
    isCompleted,
    cleanOldRecords,
    toggleSkip,
    isSkipped,
    completeAllInCategory,
    importTasks,
    // 健康提醒
    healthReminder,
    lastHealthTrigger,
    updateReminder,
    addReminderMessage,
    removeReminderMessage,
    // 倒计时
    countdown,
    countdownFinished,
    startCountdown,
    pauseCountdown,
    stopCountdown,
    resetCountdown,
    // 跨窗口同步
    syncFromStorage,
    // 通知（供 scheduler 复用）
    notify,
    // 初始化
    init,
  }
})
