/**
 * Ω Notes V2 — 提醒调度器
 * 每 15 秒检查触发条件，发送系统通知
 * 倒计时通知已移入 store，此处仅负责：每日任务提醒 + 健康提醒
 */
import { useTasksStore } from '@/stores/tasks'

let schedulerTimer: ReturnType<typeof setInterval> | null = null

/** 检测当前是否在静默时段内 */
function isInQuietPeriod(quietStart: string, quietEnd: string): boolean {
  const now = new Date()
  const current = now.getHours() * 60 + now.getMinutes()

  const startParts = quietStart.split(':').map(Number)
  const endParts = quietEnd.split(':').map(Number)
  const start = (startParts[0] ?? 0) * 60 + (startParts[1] ?? 0)
  const end = (endParts[0] ?? 0) * 60 + (endParts[1] ?? 0)

  if (start > end) {
    return current >= start || current < end
  }
  return current >= start && current < end
}

/** 获取当前 HH:mm */
function nowHHmm(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 每 15 秒执行一次的检查 */
function tick() {
  const store = useTasksStore()
  const time = nowHHmm()
  const today = store.currentDayKey

  // ─── 1. 每日任务提醒 ───
  const rec = store.records.find(r => r.date === today)
  const completedSet = new Set(rec?.completedIds ?? [])

  for (const task of store.enabledTasks) {
    if (task.reminderTime && task.reminderTime === time && !completedSet.has(task.id)) {
      const key = `task-${task.id}-${today}-${time}`
      if (!triggeredKeys.has(key)) {
        triggeredKeys.add(key)
        store.notify('Ω Notes — 任务提醒', task.title)
      }
    }
  }

  // ─── 2. 健康提醒 ───
  const hr = store.healthReminder
  if (hr.enabled && hr.messages.length > 0) {
    if (!isInQuietPeriod(hr.quietStart, hr.quietEnd)) {
      const now = new Date()
      const mins = now.getMinutes()
      const triggerKey = `health-${now.getHours()}-${mins}`

      const shouldTrigger = hr.intervalMinutes <= 30
        ? mins % hr.intervalMinutes === 0
        : mins === 0 && now.getHours() % Math.max(1, Math.round(hr.intervalMinutes / 60)) === 0

      if (shouldTrigger && store.lastHealthTrigger !== triggerKey) {
        store.lastHealthTrigger = triggerKey
        const msg = hr.messages[Math.floor(Math.random() * hr.messages.length)] ?? ''
        store.notify('Ω Notes — 健康提醒', msg)
      }
    }
  }
}

/** 防重复触发标记集合 */
const triggeredKeys = new Set<string>()

function cleanTriggerKeys() {
  if (triggeredKeys.size > 100) {
    const arr = Array.from(triggeredKeys)
    arr.splice(0, arr.length - 50)
    triggeredKeys.clear()
    arr.forEach(k => triggeredKeys.add(k))
  }
}

/** 启动调度器 */
export function startScheduler() {
  if (schedulerTimer) return

  // 每 15 秒检查一次（比之前的 30 秒更及时）
  schedulerTimer = setInterval(() => {
    tick()
    cleanTriggerKeys()
  }, 15_000)

  // 启动时立即检查一次
  tick()
}

/** 停止调度器 */
export function stopScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer)
    schedulerTimer = null
  }
}
