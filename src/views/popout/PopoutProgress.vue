<script setup lang="ts">
/**
 * PopoutProgress — 底部时间条窗口
 * 只负责时间显示、停靠与打开独立的展开面板窗口，避免透明 WebView resize 闪烁。
 */
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

const bc = new BroadcastChannel('omega-hub-channel')
bc.onmessage = (e) => {
  if (e.data?.type === 'request-direction') {
    bc.postMessage({ type: 'direction', direction: expandDirection.value })
  }
}
import { currentMonitor, type Monitor } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api/core'
import { emitTo } from '@tauri-apps/api/event'
import { useTasksStore } from '../../stores/tasks'

const tasksStore = useTasksStore()
tasksStore.init()

const win = getCurrentWebviewWindow()
const now = ref(new Date())
let timer: ReturnType<typeof setInterval>
let edgeCheckTimer: ReturnType<typeof setInterval>
let hideTimeout: ReturnType<typeof setTimeout>
let unlistenCollapseRequest: (() => void) | null = null

/* ─── Hub 状态 ─── */
const isExpanded = ref(false)
const expandDirection = ref<'up' | 'down'>('up')
const isTransitioning = ref(false)
const isGeometryHidden = ref(false) // 右侧吸附恢复时先隐藏，避免窄条中间帧可见
const isHovering = ref(false)
const dockEdge = ref<'none' | 'left' | 'right' | 'top'>('none')

/* ─── 配置同步 ─── */
const defaultHubConfig = {
  showDay: true,
  showYear: true,
  showWeek: true,
  useDetailedText: true,
  detailedTextType: 'elapsed',
}

function readHubConfig() {
  try {
    return {
      ...defaultHubConfig,
      ...JSON.parse(localStorage.getItem('hub-config') || '{}'),
    }
  } catch {
    return { ...defaultHubConfig }
  }
}

const hubConfig = ref(readHubConfig())

function handleStorage(e: StorageEvent) {
  if (e.key === 'hub-config') {
    hubConfig.value = readHubConfig()
  }
}

/* ─── 窗口尺寸常量 ─── */
const FULL_WIDTH = 420
const COLLAPSED_HEIGHT = 48
const PANEL_HEIGHT = 380
const DOCK_VISIBLE_PX = 10
const EDGE_THRESHOLD = 15
const WIN_LABEL = 'popout-progress'
const PANEL_LABEL = 'popout-progress-panel'

type GeometryOrder = 'position-first' | 'size-first'
type WorkAreaMetrics = {
  left: number
  top: number
  right: number
  bottom: number
  scaleFactor: number
  fullWidthPx: number
  collapsedHeightPx: number
  panelHeightPx: number
  dockVisiblePx: number
  edgeThresholdPx: number
}

let preDockPosition: { x: number; y: number } | null = null
let preExpandPosition: { x: number; y: number } | null = null

async function updateGeometry(
  x: number,
  y: number,
  w: number,
  h: number,
  order: GeometryOrder = 'position-first',
) {
  await invoke('update_popout_geometry', { label: WIN_LABEL, x, y, w, h, order })
}

async function showPanel(x: number, y: number) {
  await invoke('show_progress_panel', { x, y })
}

async function hidePanel() {
  await invoke('hide_progress_panel')
}

function syncPanelDirection(direction: 'up' | 'down') {
  localStorage.setItem('hub-panel-direction', direction)
  // 通过原生的 BroadcastChannel，无视 Tauri 休眠机制，光速直达各 Webview
  bc.postMessage({ type: 'direction', direction })
  return emitTo(PANEL_LABEL, 'hub:panel-direction', { direction }).catch(() => {})
}

function getWorkAreaMetrics(monitor: Monitor): WorkAreaMetrics {
  const workArea = monitor.workArea ?? { position: monitor.position, size: monitor.size }
  const scaleFactor = monitor.scaleFactor || 1
  const left = workArea.position.x
  const top = workArea.position.y
  const width = workArea.size.width
  const height = workArea.size.height

  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    scaleFactor,
    fullWidthPx: Math.round(FULL_WIDTH * scaleFactor),
    collapsedHeightPx: Math.round(COLLAPSED_HEIGHT * scaleFactor),
    panelHeightPx: Math.round(PANEL_HEIGHT * scaleFactor),
    dockVisiblePx: Math.max(1, Math.round(DOCK_VISIBLE_PX * scaleFactor)),
    edgeThresholdPx: Math.max(1, Math.round(EDGE_THRESHOLD * scaleFactor)),
  }
}

function clamp(value: number, min: number, max: number) {
  if (max < min) return min
  return Math.min(Math.max(value, min), max)
}

async function settleLayout() {
  await nextTick()
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
}

async function collapsePanelAndRestorePosition() {
  if (!isExpanded.value) return

  const monitor = await currentMonitor()
  if (!monitor) return
  const metrics = getWorkAreaMetrics(monitor)
  const pos = await win.outerPosition()
  const safeX = clamp(pos.x, metrics.left, metrics.right - metrics.fullWidthPx)
  const targetX = clamp(preExpandPosition?.x ?? safeX, metrics.left, metrics.right - metrics.fullWidthPx)
  const targetY = clamp(
    preExpandPosition?.y ?? pos.y,
    metrics.top,
    metrics.bottom - metrics.collapsedHeightPx,
  )

  await hidePanel()
  await updateGeometry(targetX, targetY, FULL_WIDTH, COLLAPSED_HEIGHT, 'position-first')
  isExpanded.value = false
  preExpandPosition = null
}

/* ─── 时间与进度 ─── */
const year = computed(() => now.value.getFullYear())

const dayProgress = computed(() => {
  const start = new Date(now.value.getFullYear(), now.value.getMonth(), now.value.getDate()).getTime()
  return (now.value.getTime() - start) / (24 * 60 * 60 * 1000)
})

const yearProgress = computed(() => {
  const start = new Date(year.value, 0, 1).getTime()
  const end = new Date(year.value + 1, 0, 1).getTime()
  return (now.value.getTime() - start) / (end - start)
})

const dayDetailedText = computed(() => {
  if (hubConfig.value.detailedTextType === 'remaining') {
    const start = new Date(now.value.getFullYear(), now.value.getMonth(), now.value.getDate()).getTime()
    const remMs = 24 * 3600 * 1000 - (now.value.getTime() - start)
    const h = Math.floor(remMs / 3600000)
    const m = Math.floor((remMs % 3600000) / 60000)
    return `今日余 ${h}时${m}分`
  }
  return `今日已过 ${now.value.getHours()}时${now.value.getMinutes()}分`
})

const yearDetailedText = computed(() => {
  const start = new Date(year.value, 0, 1).getTime()
  const end = new Date(year.value + 1, 0, 1).getTime()
  const d = Math.floor((now.value.getTime() - start) / (1000 * 60 * 60 * 24))
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

const timeStr = computed(() => {
  const isC = tasksStore.countdown.isRunning
  const rem = tasksStore.countdown.remainingSeconds
  const h = isC ? Math.floor(rem / 3600).toString().padStart(2, '0') : now.value.getHours().toString().padStart(2, '0')
  const m = isC ? Math.floor((rem % 3600) / 60).toString().padStart(2, '0') : now.value.getMinutes().toString().padStart(2, '0')
  const s = isC ? (rem % 60).toString().padStart(2, '0') : now.value.getSeconds().toString().padStart(2, '0')
  
  if (isC) {
    if (rem >= 3600) return { m: `${h}:${m}`, s: `:${s}`, runningTimer: true }
    return { m: `${m}:${s}`, s: '', runningTimer: true }
  }
  return { m: `${h}:${m}`, s: `:${s}`, runningTimer: false }
})

/* ─── 展开与折叠 ─── */
async function toggleExpand() {
  if (isTransitioning.value) return
  isTransitioning.value = true
  const previousExpanded = isExpanded.value
  const previousPreExpand = preExpandPosition ? { ...preExpandPosition } : null

  try {
    if (isExpanded.value) {
      await collapsePanelAndRestorePosition()
      return
    }

    const monitor = await currentMonitor()
    if (!monitor) return
    const metrics = getWorkAreaMetrics(monitor)
    const pos = await win.outerPosition()
    const safeX = clamp(pos.x, metrics.left, metrics.right - metrics.fullWidthPx)
    const safeY = clamp(pos.y, metrics.top, metrics.bottom - metrics.collapsedHeightPx)
    const spaceAbove = safeY - metrics.top
    const spaceBelow = metrics.bottom - (safeY + metrics.collapsedHeightPx)
    const nextDirection: 'up' | 'down' =
      spaceBelow >= metrics.panelHeightPx && (spaceBelow >= spaceAbove || spaceAbove < metrics.panelHeightPx)
        ? 'down'
        : 'up'

    preExpandPosition = { x: safeX, y: safeY }
    expandDirection.value = nextDirection

    const panelY = clamp(
      nextDirection === 'down'
        ? safeY + metrics.collapsedHeightPx
        : safeY - metrics.panelHeightPx,
      metrics.top,
      metrics.bottom - metrics.panelHeightPx,
    )

    await syncPanelDirection(nextDirection)
    await showPanel(safeX, panelY)
    
    // 冗余触发：在窗口创建并可能有稍许延迟后再次发送，彻底治愈同步遗漏
    setTimeout(() => {
      syncPanelDirection(nextDirection)
    }, 150)
    
    isExpanded.value = true
  } catch (e) {
    console.error('Toggle panel failed', e)
    isExpanded.value = previousExpanded
    preExpandPosition = previousPreExpand
  } finally {
    isTransitioning.value = false
  }
}

/* ─── 边缘吸附 (dock) ─── */
async function dockToEdge(edge: 'left' | 'right' | 'top') {
  if (isExpanded.value || isTransitioning.value) return
  isTransitioning.value = true
  const previousEdge = dockEdge.value
  const previousPreDock = preDockPosition ? { ...preDockPosition } : null

  try {
    const pos = await win.outerPosition()
    const monitor = await currentMonitor()
    if (!monitor) return
    const metrics = getWorkAreaMetrics(monitor)

    preDockPosition = {
      x: clamp(pos.x, metrics.left, metrics.right - metrics.fullWidthPx),
      y: clamp(pos.y, metrics.top, metrics.bottom - metrics.collapsedHeightPx),
    }

    const targetY = clamp(pos.y, metrics.top, metrics.bottom - metrics.collapsedHeightPx)
    const targetX = clamp(pos.x, metrics.left, metrics.right - metrics.fullWidthPx)

    dockEdge.value = edge
    await settleLayout()

    if (edge === 'left') {
      await updateGeometry(metrics.left, targetY, DOCK_VISIBLE_PX, COLLAPSED_HEIGHT, 'size-first')
    } else if (edge === 'right') {
      await updateGeometry(metrics.right - metrics.dockVisiblePx, targetY, DOCK_VISIBLE_PX, COLLAPSED_HEIGHT, 'position-first')
    } else {
      await updateGeometry(targetX, metrics.top, FULL_WIDTH, DOCK_VISIBLE_PX, 'size-first')
    }
  } catch (e) {
    console.error('Dock failed', e)
    dockEdge.value = previousEdge
    preDockPosition = previousPreDock
  } finally {
    isTransitioning.value = false
  }
}

async function undock() {
  if (isTransitioning.value) return
  isTransitioning.value = true
  const previousEdge = dockEdge.value
  const previousPreDock = preDockPosition ? { ...preDockPosition } : null
  const previousGeometryHidden = isGeometryHidden.value

  try {
    const savedEdge = dockEdge.value
    if (savedEdge !== 'none') {
      isGeometryHidden.value = true
      await settleLayout()
    }

    const pos = await win.outerPosition()
    let targetX = preDockPosition?.x ?? pos.x
    let targetY = preDockPosition?.y ?? pos.y

    const monitor = await currentMonitor()
    if (monitor) {
      const metrics = getWorkAreaMetrics(monitor)
      if (savedEdge === 'right') targetX = metrics.right - metrics.fullWidthPx
      else if (savedEdge === 'left') targetX = metrics.left
      else targetX = clamp(targetX, metrics.left, metrics.right - metrics.fullWidthPx)

      if (savedEdge === 'top') targetY = metrics.top
      else targetY = clamp(targetY, metrics.top, metrics.bottom - metrics.collapsedHeightPx)
    }

    preDockPosition = null
    dockEdge.value = 'none'
    await settleLayout()
    await updateGeometry(targetX, targetY, FULL_WIDTH, COLLAPSED_HEIGHT, 'size-first')
    await settleLayout()
    isGeometryHidden.value = false
  } catch (e) {
    console.error('Undock failed', e)
    dockEdge.value = previousEdge
    preDockPosition = previousPreDock
    isGeometryHidden.value = previousGeometryHidden
  } finally {
    isTransitioning.value = false
  }
}

async function checkEdgeAndDock() {
  if (isHovering.value || dockEdge.value !== 'none' || isExpanded.value || isTransitioning.value) return

  try {
    const pos = await win.outerPosition()
    const size = await win.outerSize()
    const monitor = await currentMonitor()
    if (!monitor) return

    const metrics = getWorkAreaMetrics(monitor)
    if (pos.y <= metrics.top + metrics.edgeThresholdPx) await dockToEdge('top')
    else if (pos.x <= metrics.left + metrics.edgeThresholdPx) await dockToEdge('left')
    else if (pos.x + size.width >= metrics.right - metrics.edgeThresholdPx) await dockToEdge('right')
  } catch {
    // ignore
  }
}

function handleMouseLeave() {
  if (isTransitioning.value) return
  isHovering.value = false
  hideTimeout = setTimeout(() => {
    void checkEdgeAndDock()
  }, 1000)
}

function handleMouseEnter() {
  if (isTransitioning.value) return
  isHovering.value = true
  clearTimeout(hideTimeout)
  if (dockEdge.value !== 'none') {
    void undock()
  }
}

async function closeWindow() {
  try {
    await invoke('close_popout', { label: WIN_LABEL })
  } catch {
    window.close()
  }
}

function startDrag(e: MouseEvent) {
  if (e.button !== 0) return
  if ((e.target as HTMLElement).closest('button')) return
  if (isExpanded.value) return

  try {
    win.startDragging()
  } catch {
    // ignore
  }
}

onMounted(async () => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 1000)

  edgeCheckTimer = setInterval(() => {
    if (!isHovering.value && dockEdge.value === 'none' && !isExpanded.value) {
      void checkEdgeAndDock()
    }
  }, 1500)

  window.addEventListener('storage', handleStorage)
  unlistenCollapseRequest = await win.listen('hub:collapse-request', () => {
    if (isTransitioning.value || !isExpanded.value) return
    void toggleExpand()
  })
})

onUnmounted(() => {
  clearInterval(timer)
  clearInterval(edgeCheckTimer)
  clearTimeout(hideTimeout)
  window.removeEventListener('storage', handleStorage)
  unlistenCollapseRequest?.()
})
</script>

<template>
  <div class="app-container">
    <div
      class="progress-wrapper"
      :class="{
        'is-docked': dockEdge !== 'none',
        'is-expanded': isExpanded,
        'expand-down': isExpanded && expandDirection === 'down',
        'expand-up': isExpanded && expandDirection === 'up',
        'is-geometry-hidden': isGeometryHidden,
      }"
      @mousedown="startDrag"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <div v-if="dockEdge !== 'none'" class="dock-indicator">
        <div class="dock-pulse"></div>
      </div>

      <template v-else>
        <div class="hub-header-bar">
          <div class="date-block">
            <span class="time" :class="{ 'is-timer-active': timeStr.runningTimer }">
              {{ timeStr.m }}<span class="sec">{{ timeStr.s }}</span>
            </span>
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
            <button v-if="isHovering || isExpanded" class="hub-btn expand-btn" @click="toggleExpand">
              <svg v-if="!isExpanded" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            <button v-if="isHovering || isExpanded" class="hub-btn close-btn" @click="closeWindow">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style>
html, body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: transparent !important;
}

#app {
  height: 100vh;
  display: flex;
  background: transparent !important;
}
</style>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.progress-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-elevated, rgba(30, 30, 33, 0.92));
  backdrop-filter: blur(20px) saturate(1.2);
  -webkit-backdrop-filter: blur(20px) saturate(1.2);
  color: var(--color-text-primary);
  border-radius: 16px;
  clip-path: inset(0 round 16px);
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  user-select: none;
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
}

.progress-wrapper.is-expanded {
  box-shadow:
    0 12px 24px rgba(0, 0, 0, 0.18);
}

.progress-wrapper.expand-up {
  border-radius: 0 0 16px 16px;
  clip-path: inset(0 round 0 0 16px 16px);
  border-top: none;
  box-shadow:
    0 12px 24px rgba(0, 0, 0, 0.18),
    inset 0 -1px 0 rgba(255, 255, 255, 0.04);
}

.progress-wrapper.expand-down {
  border-radius: 16px 16px 0 0;
  clip-path: inset(0 round 16px 16px 0 0);
  border-bottom: none;
  box-shadow:
    0 12px 24px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.progress-wrapper.is-geometry-hidden {
  opacity: 0;
}

.progress-wrapper.is-docked {
  border-radius: 0;
  clip-path: none;
  border: none;
  background: var(--color-accent, #6366f1);
  box-shadow: 0 0 8px rgba(99, 102, 241, 0.4);
  justify-content: center;
}

.dock-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.dock-pulse {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    opacity: 0.5;
    transform: scale(0.8);
  }

  50% {
    opacity: 1;
    transform: scale(1.2);
  }
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

.progress-wrapper.is-expanded .hub-header-bar {
  cursor: default;
}

.hub-header-bar:active {
  cursor: grabbing;
}

.date-block {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex-shrink: 0;
  min-width: 60px;
}

.time {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.5px;
  transition: color 0.3s ease;
}

.time.is-timer-active {
  color: var(--color-accent, #6366f1);
  letter-spacing: 0.5px;
}

.sec {
  font-size: 11px;
  opacity: 0.8;
  font-weight: 500;
}

.week-day {
  font-size: 9px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  margin-top: 2px;
}

.progress-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  justify-content: center;
  margin-right: 8px;
}

.track-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.track-label {
  font-size: 8px;
  font-family: var(--font-mono);
  color: var(--color-text-tertiary);
  width: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.track {
  flex: 1;
  height: 6px;
  background: var(--color-bg-tertiary, rgba(255, 255, 255, 0.08));
  border-radius: 3px;
  position: relative;
  display: flex;
  align-items: center;
}

.fill {
  height: 100%;
  border-radius: 3px;
}

.day-fill {
  background: linear-gradient(90deg, #63b3ed, var(--color-accent, #6366f1));
}

.year-fill {
  background: linear-gradient(90deg, #f6e05e, #ed8936);
}

.detailed-text {
  font-size: 8px;
  color: var(--color-text-secondary);
  font-weight: 500;
  font-family: var(--font-sans);
  white-space: nowrap;
  flex-shrink: 0;
}

.actions {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-left: auto;
  flex-shrink: 0;
  width: 50px;
  justify-content: flex-end;
}

.hub-btn {
  width: 22px;
  height: 22px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-tertiary, rgba(255, 255, 255, 0.1));
  color: var(--color-text-secondary);
  border: none;
  cursor: pointer;
  appearance: none;
  padding: 0;
  transition: background-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
}

@media (hover: hover) {
  .hub-btn:hover {
    background: var(--color-bg-hover, rgba(255, 255, 255, 0.15));
    color: var(--color-text-primary);
    transform: translateY(-1px);
  }

  .close-btn:hover {
    background: var(--color-danger, #f43f5e);
    color: #fff;
  }
}

.hub-btn:active {
  transform: scale(0.97);
}

.hub-btn:focus-visible {
  box-shadow: 0 0 0 2px var(--color-accent, #6366f1);
  outline: none;
}

@media (prefers-reduced-motion: reduce) {
  .dock-pulse,
  .hub-btn {
    animation: none;
    transition: none;
  }
}
</style>
