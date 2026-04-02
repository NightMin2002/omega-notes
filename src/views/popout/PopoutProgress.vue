<script setup lang="ts">
/**
 * PopoutProgress — 增强型多合一时间枢纽 (Hub)
 * 无边框, 悬浮。向上展开集成任务、番茄钟、人生进度。
 *
 * 设计原则：无过渡动画，所有窗口操作通过 Rust 端原子化执行，
 * 严禁通过 hide/show 掩盖几何更新，避免触发 Windows 焦点链与任务栏闪烁。
 */
import { ref, nextTick, onMounted, onUnmounted, computed } from 'vue'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { currentMonitor, type Monitor } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api/core'

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
const expandDirection = ref<'up' | 'down'>('up')
const activeTab = ref<'tasks' | 'timer' | 'life' | 'settings'>('tasks')
const isTransitioning = ref(false) // 防止几何更新期间 mouse 事件重入

// 父组件自行初始化 config，避免依赖 HubSettings.onMounted emit 触发不必要的 DOM 重排
const _savedConfig = (() => {
  try { return JSON.parse(localStorage.getItem('hub-config') || '{}') } catch { return {} }
})()
const hubConfig = ref({
  showDay: true,
  showYear: true,
  showWeek: true,
  useDetailedText: true,
  detailedTextType: 'elapsed',
  ..._savedConfig,
})

/* ─── 窗口尺寸常量 ─── */
const FULL_WIDTH = 420
const COLLAPSED_HEIGHT = 48
const EXPANDED_HEIGHT = 380
const DOCK_VISIBLE_PX = 10
const EDGE_THRESHOLD = 15
const WIN_LABEL = 'popout-progress'
type GeometryOrder = 'position-first' | 'size-first'
type WorkAreaMetrics = {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
  scaleFactor: number
  fullWidthPx: number
  collapsedHeightPx: number
  expandedHeightPx: number
  dockVisiblePx: number
  edgeThresholdPx: number
}

/** 原子化窗口几何更新：单次 IPC 同步执行 position + size，消除中间帧闪烁 */
async function updateGeometry(
  x: number,
  y: number,
  w: number,
  h: number,
  order: GeometryOrder = 'position-first',
) {
  await invoke('update_popout_geometry', { label: WIN_LABEL, x, y, w, h, order })
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
    width,
    height,
    scaleFactor,
    fullWidthPx: Math.round(FULL_WIDTH * scaleFactor),
    collapsedHeightPx: Math.round(COLLAPSED_HEIGHT * scaleFactor),
    expandedHeightPx: Math.round(EXPANDED_HEIGHT * scaleFactor),
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
  clearTimeout(hideTimeout)
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

const timeStr = computed(() => {
  const h = now.value.getHours().toString().padStart(2, '0')
  const m = now.value.getMinutes().toString().padStart(2, '0')
  const s = now.value.getSeconds().toString().padStart(2, '0')
  return { m: `${h}:${m}`, s: `:${s}` }
})

/* ─── 展开与折叠 ─── */
async function toggleExpand() {
  if (isTransitioning.value) return
  isTransitioning.value = true
  const previousExpanded = isExpanded.value
  const previousDirection = expandDirection.value
  const previousPreExpand = preExpandPosition ? { ...preExpandPosition } : null
  try {
    const monitor = await currentMonitor()
    if (!monitor) return
    const metrics = getWorkAreaMetrics(monitor)
    const pos = await win.outerPosition()
    const safeX = clamp(pos.x, metrics.left, metrics.right - metrics.fullWidthPx)
    const deltaY = metrics.expandedHeightPx - metrics.collapsedHeightPx

    if (isExpanded.value) {
      // 折叠
      isExpanded.value = false
      const finalX = clamp(preExpandPosition?.x ?? safeX, metrics.left, metrics.right - metrics.fullWidthPx)
      const finalY = clamp(
        preExpandPosition?.y ?? (expandDirection.value === 'up' ? pos.y + deltaY : pos.y),
        metrics.top,
        metrics.bottom - metrics.collapsedHeightPx,
      )
      await settleLayout()
      await updateGeometry(finalX, finalY, FULL_WIDTH, COLLAPSED_HEIGHT, 'size-first')
      preExpandPosition = null
    } else {
      // 根据工作区上下剩余空间决定方向，避免下半屏仍强制按顶部逻辑计算
      preExpandPosition = {
        x: safeX,
        y: clamp(pos.y, metrics.top, metrics.bottom - metrics.collapsedHeightPx),
      }
      const spaceAbove = pos.y - metrics.top
      const spaceBelow = metrics.bottom - (pos.y + metrics.collapsedHeightPx)
      const canExpandUp = spaceAbove >= deltaY
      const canExpandDown = spaceBelow >= deltaY

      if (canExpandUp && (!canExpandDown || spaceAbove >= spaceBelow)) {
        expandDirection.value = 'up'
      } else if (canExpandDown) {
        expandDirection.value = 'down'
      } else {
        expandDirection.value = spaceAbove >= spaceBelow ? 'up' : 'down'
      }

      const newY = clamp(
        expandDirection.value === 'up' ? pos.y - deltaY : pos.y,
        metrics.top,
        metrics.bottom - metrics.expandedHeightPx,
      )
      isExpanded.value = true
      await settleLayout()
      await updateGeometry(
        safeX,
        newY,
        FULL_WIDTH,
        EXPANDED_HEIGHT,
        expandDirection.value === 'up' ? 'position-first' : 'size-first',
      )
    }
  } catch (e) {
    console.error('Resize failed', e)
    isExpanded.value = previousExpanded
    expandDirection.value = previousDirection
    preExpandPosition = previousPreExpand
  } finally {
    isTransitioning.value = false
  }
}

/* ─── 边缘吸附 (dock) ─── */
const isHovering = ref(false)
const dockEdge = ref<'none' | 'left' | 'right' | 'top'>('none')
let hideTimeout: ReturnType<typeof setTimeout>
let preDockPosition: { x: number; y: number } | null = null
let preExpandPosition: { x: number; y: number } | null = null

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
    } else if (edge === 'top') {
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
  try {
    const savedEdge = dockEdge.value
    const pos = await win.outerPosition()

    // 计算目标位置
    let targetX = preDockPosition?.x ?? pos.x
    let targetY = preDockPosition?.y ?? pos.y

    // 安全边界约束
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
  } catch (e) {
    console.error('Undock failed', e)
    dockEdge.value = previousEdge
    preDockPosition = previousPreDock
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
  } catch (e) {}
}

function handleMouseLeave() {
  if (isTransitioning.value) return
  isHovering.value = false
  hideTimeout = setTimeout(() => {
    checkEdgeAndDock()
  }, 1000)
}

function handleMouseEnter() {
  if (isTransitioning.value) return
  isHovering.value = true
  clearTimeout(hideTimeout)
  if (dockEdge.value !== 'none') undock()
}

async function closeWindow() {
  try {
    await invoke('close_popout', { label: WIN_LABEL })
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
    class="app-container"
    :class="{ 'expand-up': expandDirection === 'up' && isExpanded }"
  >
    <div
      class="progress-wrapper"
      :class="{
        'is-docked': dockEdge !== 'none',
        'is-expanded': isExpanded,
      }"
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
          <button v-if="isHovering || isExpanded" class="hub-btn expand-btn" @click="toggleExpand">
            <svg v-if="!isExpanded" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <button v-if="isHovering || isExpanded" class="hub-btn close-btn" @click="closeWindow">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
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
.app-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 向上展开时内容沉底 */
.app-container.expand-up {
  justify-content: flex-end;
}

.progress-wrapper {
  width: 100%;
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
}

/* 展开时内容撑满整个窗口 */
.progress-wrapper.is-expanded {
  height: 100%;
  border-radius: 12px;
}

/* expand-up 时：时间栏在底部，内容区在上方 */
.app-container.expand-up .progress-wrapper.is-expanded {
  flex-direction: column-reverse;
}

.app-container.expand-up .hub-body-area {
  border-top: none;
  border-bottom: 1px solid var(--color-border);
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
.fill { height: 100%; border-radius: 3px; }
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
  transition: background-color 0.15s ease, color 0.15s ease;
}
.hub-btn:hover { background: var(--color-bg-hover, rgba(255, 255, 255, 0.15)); color: var(--color-text-primary); }
.hub-btn:active { opacity: 0.8; }
.close-btn:hover { background: var(--color-danger, #f43f5e); color: #fff; }
.hub-btn:focus-visible { box-shadow: 0 0 0 2px var(--color-accent, #6366f1); outline: none; }

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
  appearance: none;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.tab-btn:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
.tab-btn.active { background: var(--color-bg-elevated); color: var(--color-accent); font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.tab-btn:focus-visible { box-shadow: 0 0 0 2px var(--color-accent, #6366f1); outline: none; }
.hub-content {
  flex: 1; overflow: hidden; position: relative;
}
</style>
