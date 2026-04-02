<script setup lang="ts">
/**
 * PopoutProgress — 增强型多合一时间枢纽 (Hub)
 * 无边框, 悬浮。向上展开集成任务、番茄钟、人生进度。
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { currentMonitor } from '@tauri-apps/api/window'
import { LogicalSize, LogicalPosition } from '@tauri-apps/api/dpi'

import HubTasks from './HubTasks.vue'
import HubTimer from './HubTimer.vue'
import HubLife from './HubLife.vue'
import HubSettings from './HubSettings.vue'

const win = getCurrentWebviewWindow()
const now = ref(new Date())
let timer: ReturnType<typeof setInterval>
let edgeCheckTimer: ReturnType<typeof setInterval>

/* ─── Hub 状态 ─── */
const isExpanded = ref(false)
const activeTab = ref<'tasks' | 'timer' | 'life' | 'settings'>('tasks')
const hubConfig = ref({
  showDay: true,
  showYear: true,
  showWeek: true,
  useDetailedText: true,
  detailedTextType: 'elapsed',
})

/* ─── 窗口尺寸常量 ─── */
const FULL_WIDTH = 420
const COLLAPSED_HEIGHT = 48
const EXPANDED_HEIGHT = 380
const DOCK_VISIBLE_PX = 10
const EDGE_THRESHOLD = 80

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 1000)

  edgeCheckTimer = setInterval(() => {
    if (!isHovering.value && dockEdge.value === 'none' && !isExpanded.value) {
      checkEdgeAndDock()
    }
  }, 1500)
})

onUnmounted(() => {
  clearInterval(timer)
  clearInterval(edgeCheckTimer)
})

/* ─── 核心计算属性 ─── */
const year = computed(() => now.value.getFullYear())

const dayProgress = computed(() => {
  const start = new Date(now.value.getFullYear(), now.value.getMonth(), now.value.getDate()).getTime()
  const current = now.value.getTime()
  const total = 24 * 60 * 60 * 1000
  return (current - start) / total
})

const yearProgress = computed(() => {
  const start = new Date(year.value, 0, 1).getTime()
  const end = new Date(year.value + 1, 0, 1).getTime()
  const current = now.value.getTime()
  return (current - start) / (end - start)
})

const dayDetailedText = computed(() => {
  if (hubConfig.value.detailedTextType === 'remaining') {
    const start = new Date(now.value.getFullYear(), now.value.getMonth(), now.value.getDate()).getTime()
    const current = now.value.getTime()
    const remMs = 24 * 3600 * 1000 - (current - start)
    const h = Math.floor(remMs / 3600000)
    const m = Math.floor((remMs % 3600000) / 60000)
    return `今日余 ${h}时${m}分`
  }
  const h = now.value.getHours()
  const m = now.value.getMinutes()
  return `今日已过 ${h}时${m}分`
})

const yearDetailedText = computed(() => {
  const start = new Date(year.value, 0, 1).getTime()
  const end = new Date(year.value + 1, 0, 1).getTime()
  const current = now.value.getTime()
  const d = Math.floor((current - start) / (1000 * 60 * 60 * 24))
  if (hubConfig.value.detailedTextType === 'remaining') {
    const total = Math.floor((end - start) / (1000 * 60 * 60 * 24))
    return `今年余 ${total - d}天`
  }
  return `今年已过 ${d}天`
})

const weekNumber = computed(() => {
  const d = new Date(Date.UTC(now.value.getFullYear(), now.value.getMonth(), now.value.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
})

const days = ['日', '一', '二', '三', '四', '五', '六']
const weekDay = computed(() => `周${days[now.value.getDay()]}`)

// 显示秒数 15:21:55
const timeStr = computed(() => {
  const h = now.value.getHours().toString().padStart(2, '0')
  const m = now.value.getMinutes().toString().padStart(2, '0')
  const s = now.value.getSeconds().toString().padStart(2, '0')
  return { m: `${h}:${m}`, s: `:${s}` }
})

/* ─── 展开与折叠 ─── */
async function toggleExpand() {
  try {
    const monitor = await currentMonitor()
    const sf = monitor ? monitor.scaleFactor : 1
    const pos = await win.outerPosition()
    
    if (isExpanded.value) {
      // 折叠：窗口向下掉
      isExpanded.value = false
      await win.setSize(new LogicalSize(FULL_WIDTH, COLLAPSED_HEIGHT))
      await win.setPosition(new LogicalPosition(pos.x / sf, (pos.y / sf) + (EXPANDED_HEIGHT - COLLAPSED_HEIGHT)))
    } else {
      // 展开：如果上面空间够，则保持底部不动，向上生长；如果不够，则原位张开
      isExpanded.value = true
      let newY = (pos.y / sf) - (EXPANDED_HEIGHT - COLLAPSED_HEIGHT)
      if (newY < 0) {
        newY = pos.y / sf // 顶部空间不足，原位向下展开
      }
      
      // 先设置尺寸让页面流排开，同时调整位置
      await win.setSize(new LogicalSize(FULL_WIDTH, EXPANDED_HEIGHT))
      await win.setPosition(new LogicalPosition(pos.x / sf, newY))
    }
  } catch (e) {
    console.error('Resize failed', e)
    // 兜底
    isExpanded.value = !isExpanded.value
  }
}

/* ─── 边缘吸附 (dock) ─── */
const isHovering = ref(false)
const dockEdge = ref<'none' | 'left' | 'right' | 'top'>('none')
let hideTimeout: ReturnType<typeof setTimeout>
let preDockPosition: { x: number; y: number } | null = null

async function dockToEdge(edge: 'left' | 'right' | 'top') {
  if (isExpanded.value) return // 展开状态不 dock
  try {
    const pos = await win.outerPosition()
    const monitor = await currentMonitor()
    if (!monitor) return

    const sf = monitor.scaleFactor
    preDockPosition = { x: pos.x / sf, y: pos.y / sf }
    const { width: mw } = monitor.size

    if (edge === 'left') {
      await win.setSize(new LogicalSize(DOCK_VISIBLE_PX, COLLAPSED_HEIGHT))
      await win.setPosition(new LogicalPosition(0, pos.y / sf))
    } else if (edge === 'right') {
      const logicalMw = mw / sf
      await win.setSize(new LogicalSize(DOCK_VISIBLE_PX, COLLAPSED_HEIGHT))
      await win.setPosition(new LogicalPosition(logicalMw - DOCK_VISIBLE_PX, pos.y / sf))
    } else if (edge === 'top') {
      await win.setSize(new LogicalSize(FULL_WIDTH, DOCK_VISIBLE_PX))
      await win.setPosition(new LogicalPosition(pos.x / sf, 0))
    }
    dockEdge.value = edge
  } catch (e) {}
}

async function undock() {
  try {
    const savedEdge = dockEdge.value
    dockEdge.value = 'none'

    let targetX = 100, targetY = 100
    if (preDockPosition) {
      targetX = preDockPosition.x
      targetY = preDockPosition.y
      preDockPosition = null
    } else {
      const monitor = await currentMonitor()
      if (monitor) {
        const sf = monitor.scaleFactor
        const logicalMw = monitor.size.width / sf
        const logicalMh = monitor.size.height / sf
        if (savedEdge === 'right') targetX = logicalMw - FULL_WIDTH - 50
        else if (savedEdge === 'left') targetX = 50
        if (savedEdge === 'top') targetY = 50
        else targetY = Math.min(targetY, logicalMh - COLLAPSED_HEIGHT - 50)
      }
    }
    
    // Safety bounds
    const monitor = await currentMonitor()
    if (monitor) {
       const sf = monitor.scaleFactor
       const logicalMw = monitor.size.width / sf
       const logicalMh = monitor.size.height / sf
       targetX = Math.max(0, Math.min(targetX, logicalMw - FULL_WIDTH))
       targetY = Math.max(0, Math.min(targetY, logicalMh - COLLAPSED_HEIGHT))
    }

    await win.setPosition(new LogicalPosition(targetX, targetY))
    await win.setSize(new LogicalSize(FULL_WIDTH, COLLAPSED_HEIGHT))
  } catch (e) {}
}

async function checkEdgeAndDock() {
  if (isHovering.value || dockEdge.value !== 'none' || isExpanded.value) return
  try {
    const pos = await win.outerPosition()
    const size = await win.outerSize()
    const monitor = await currentMonitor()
    if (!monitor) return

    const { width: mw } = monitor.size
    if (pos.y <= EDGE_THRESHOLD) await dockToEdge('top')
    else if (pos.x <= EDGE_THRESHOLD) await dockToEdge('left')
    else if (pos.x + size.width >= mw - EDGE_THRESHOLD) await dockToEdge('right')
  } catch (e) {}
}

function handleMouseLeave() {
  isHovering.value = false
  hideTimeout = setTimeout(() => {
    checkEdgeAndDock()
  }, 1000)
}

function handleMouseEnter() {
  isHovering.value = true
  clearTimeout(hideTimeout)
  if (dockEdge.value !== 'none') undock()
}

async function closeWindow() {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('close_popout', { label: 'popout-progress' })
  } catch {
    window.close()
  }
}

function startDrag(e: MouseEvent) {
  if (e.button === 0 && !(e.target as HTMLElement).closest('button') && !(e.target as HTMLElement).closest('.hub-body-area')) {
    try {
      getCurrentWebviewWindow().startDragging()
    } catch {}
  }
}
</script>

<template>
  <div
    class="progress-wrapper"
    :class="{ 'is-docked': dockEdge !== 'none', 'is-expanded': isExpanded }"
    @mousedown="startDrag"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div v-if="dockEdge !== 'none'" class="dock-indicator">
      <div class="dock-pulse"></div>
    </div>

    <!-- 主悬浮条状态 -->
    <template v-if="dockEdge === 'none'">
      <!-- 固定的头部时间栏 -->
      <div class="hub-header-bar">
        <div class="date-block">
          <span class="time">{{ timeStr.m }}<span class="sec">{{ timeStr.s }}</span></span>
          <span v-if="hubConfig.showWeek" class="week-day">{{ year }} • {{ weekDay }} • W{{ weekNumber }}</span>
          <span v-else class="week-day">{{ year }} • {{ weekDay }}</span>
        </div>

        <div class="progress-section">
          <div v-if="hubConfig.showDay" class="track-row">
            <span class="track-label">DAY</span>
            <div class="track">
              <div class="fill day-fill" :style="{ width: `${dayProgress * 100}%` }"></div>
            </div>
            <span v-if="hubConfig.useDetailedText" class="detailed-text">{{ dayDetailedText }}</span>
          </div>
          <div v-if="hubConfig.showYear" class="track-row">
            <span class="track-label">YEA</span>
            <div class="track">
              <div class="fill year-fill" :style="{ width: `${yearProgress * 100}%` }"></div>
            </div>
            <span v-if="hubConfig.useDetailedText" class="detailed-text">{{ yearDetailedText }}</span>
          </div>
        </div>

        <div class="actions">
          <Transition name="fade">
            <button v-if="isHovering || isExpanded" class="hub-btn expand-btn" :class="{ rotated: isExpanded }" @click="toggleExpand">
              <svg v-if="!isExpanded" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </Transition>

          <Transition name="fade">
            <button v-if="isHovering || isExpanded" class="hub-btn close-btn" @click="closeWindow">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </Transition>
        </div>
      </div>
      
      <!-- 展开时的多功能区 -->
      <div v-if="isExpanded" class="hub-body-area">
        <div class="hub-tabs">
          <button class="tab-btn" :class="{ active: activeTab === 'tasks' }" @click="activeTab = 'tasks'">任务</button>
          <button class="tab-btn" :class="{ active: activeTab === 'timer' }" @click="activeTab = 'timer'">番茄钟</button>
          <button class="tab-btn" :class="{ active: activeTab === 'life' }" @click="activeTab = 'life'">人生进度</button>
          <button class="tab-btn" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">设置</button>
        </div>
        <div class="hub-content">
          <HubTasks v-if="activeTab === 'tasks'" />
          <HubTimer v-if="activeTab === 'timer'" />
          <HubLife v-if="activeTab === 'life'" />
          <HubSettings v-if="activeTab === 'settings'" @update="(v) => hubConfig = v" />
        </div>
      </div>
    </template>
  </div>
</template>

<style>
html, body {
  margin: 0; padding: 0; overflow: hidden; background: transparent !important;
}
#app {
  height: 100vh; display: flex; background: transparent !important;
}
</style>

<style scoped>
.progress-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-elevated, rgba(30, 30, 33, 0.92));
  backdrop-filter: blur(20px) saturate(1.2);
  -webkit-backdrop-filter: blur(20px) saturate(1.2);
  color: var(--color-text-primary);
  border-radius: 20px;
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  user-select: none;
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
  transition: border-radius 200ms ease;
}

.progress-wrapper.is-expanded {
  border-radius: 12px;
}

.hub-header-bar {
  display: flex;
  align-items: center;
  height: 48px;
  min-height: 48px;
  padding: 0 16px;
  gap: 16px;
  cursor: grab;
}
.hub-header-bar:active {
  cursor: grabbing;
}

/* Dock state */
.progress-wrapper.is-docked {
  border-radius: 0; border: none; background: var(--color-accent, #6366f1);
  box-shadow: 0 0 8px rgba(99, 102, 241, 0.4); justify-content: center; height: 100%;
}
.dock-indicator { display: flex; align-items: center; justify-content: center; height: 100%; }
.dock-pulse { width: 4px; height: 4px; border-radius: 50%; background: rgba(255, 255, 255, 0.8); animation: pulse-glow 2s ease-in-out infinite; }
@keyframes pulse-glow { 0%, 100% { opacity: 0.5; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }

/* Header components */
.date-block {
  display: flex; flex-direction: column; justify-content: center; flex-shrink: 0; min-width: 60px;
}
.time {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 15px; font-weight: 700; line-height: 1.1; letter-spacing: -0.5px;
}
.sec { font-size: 11px; opacity: 0.8; font-weight: 500; }
.week-day { font-size: 9px; font-weight: 600; color: var(--color-text-tertiary); text-transform: uppercase; margin-top: 2px; }

.progress-section {
  flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0; justify-content: center; margin-right: 8px;
}
.track-row { display: flex; align-items: center; gap: 6px; }
.track-label { font-size: 8px; font-family: var(--font-mono); color: var(--color-text-tertiary); width: 16px; font-weight: 600; flex-shrink: 0; }
.track {
  flex: 1; height: 6px; background: var(--color-bg-tertiary, rgba(255, 255, 255, 0.08));
  border-radius: 3px; position: relative; display: flex; align-items: center;
}
.fill { height: 100%; border-radius: 3px; transition: width 1s ease-out; }
.day-fill { background: linear-gradient(90deg, #63b3ed, var(--color-accent, #6366f1)); }
.year-fill { background: linear-gradient(90deg, #f6e05e, #ed8936); }
.detailed-text {
  font-size: 8px; color: var(--color-text-secondary); font-weight: 500;
  font-family: var(--font-sans); white-space: nowrap; flex-shrink: 0;
}

/* Actions */
.actions {
  display: flex; gap: 6px; align-items: center; margin-left: auto; flex-shrink: 0;
  width: 50px; justify-content: flex-end;
}
.hub-btn {
  width: 22px; height: 22px; border-radius: 11px; display: flex; align-items: center; justify-content: center;
  background: var(--color-bg-tertiary, rgba(255, 255, 255, 0.1)); color: var(--color-text-secondary);
  border: none; cursor: pointer; appearance: none; padding: 0;
  transition: all 0.2s ease-out;
}
.hub-btn:hover { background: var(--color-bg-hover, rgba(255, 255, 255, 0.15)); color: var(--color-text-primary); transform: scale(1.05); }
.close-btn:hover { background: var(--color-danger, #f43f5e); color: #fff; }
.hub-btn:active { transform: scale(0.95); }

/* Body area */
.hub-body-area {
  flex: 1; display: flex; flex-direction: column; background: var(--color-bg-primary);
  border-top: 1px solid var(--color-border); overflow: hidden;
}
.hub-tabs {
  display: flex; background: var(--color-bg-tertiary); padding: 4px; gap: 4px;
}
.tab-btn {
  flex: 1; padding: 4px 0; font-size: 0.75rem; border-radius: 6px; border: none;
  background: transparent; color: var(--color-text-secondary); font-weight: 500; cursor: pointer;
  transition: all 0.2s; appearance: none;
}
.tab-btn:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
.tab-btn.active { background: var(--color-bg-elevated); color: var(--color-accent); font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.hub-content {
  flex: 1; overflow: hidden; position: relative;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

