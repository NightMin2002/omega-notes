<script setup lang="ts">
/**
 * PopoutProgress — 悬挂时间进度小窗
 * 无边框 (decorations: false), 拖拽移动窗口
 *
 * 核心改进：
 * 1. 缩进(dock)时使用真实窗口尺寸调整 (win.setSize + win.setPosition)
 *    替代 CSS transform 伪缩进，解决点击穿透问题
 * 2. 使用 clip-path 裁剪四角，彻底消除透明泄露
 * 3. 移除对 data-tauri-drag-region 的依赖，使用 startDragging() API
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { currentMonitor } from '@tauri-apps/api/window'
import { LogicalSize, LogicalPosition } from '@tauri-apps/api/dpi'

const win = getCurrentWebviewWindow()
const now = ref(new Date())
let timer: ReturnType<typeof setInterval>
let edgeCheckTimer: ReturnType<typeof setInterval>

/* ─── 窗口原始尺寸常量 ─── */
const FULL_WIDTH = 420
const FULL_HEIGHT = 48
const DOCK_VISIBLE_PX = 10  // dock 后露出的像素宽度
const EDGE_THRESHOLD = 80   // 边缘吸附阈值 (物理像素)

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 1000)

  // 每 1.5 秒兜底检查边缘吸附
  edgeCheckTimer = setInterval(() => {
    if (!isHovering.value && dockEdge.value === 'none') {
      checkEdgeAndDock()
    }
  }, 1500)
})

onUnmounted(() => {
  clearInterval(timer)
  clearInterval(edgeCheckTimer)
})

const year = computed(() => now.value.getFullYear())

// 今天过了多少百分比
const dayProgress = computed(() => {
  const start = new Date(now.value.getFullYear(), now.value.getMonth(), now.value.getDate()).getTime()
  const current = now.value.getTime()
  const total = 24 * 60 * 60 * 1000
  return (current - start) / total
})

// 今年过了多少百分比
const yearProgress = computed(() => {
  const start = new Date(year.value, 0, 1).getTime()
  const end = new Date(year.value + 1, 0, 1).getTime()
  const current = now.value.getTime()
  return (current - start) / (end - start)
})

// 当前是第几周
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
  return `${h}:${m}`
})

/* ─── 边缘吸附 (dock) 逻辑 ─── */
const isHovering = ref(false)
const dockEdge = ref<'none' | 'left' | 'right' | 'top'>('none')
let hideTimeout: ReturnType<typeof setTimeout>

// 保存 dock 前的窗口位置，用于恢复
let preDockPosition: { x: number; y: number } | null = null

/**
 * 真实缩进：通过调整窗口物理尺寸 + 位置来实现
 * 窗口只保留 DOCK_VISIBLE_PX 宽度的条，其余部分真正"消失"
 */
async function dockToEdge(edge: 'left' | 'right' | 'top') {
  try {
    const pos = await win.outerPosition()
    const monitor = await currentMonitor()
    if (!monitor) return

    const sf = monitor.scaleFactor
    // 保存 dock 前位置（逻辑像素）
    preDockPosition = { x: pos.x / sf, y: pos.y / sf }

    const { width: mw } = monitor.size

    if (edge === 'left') {
      // 窗口移到屏幕最左，只留右侧 DOCK_VISIBLE_PX
      await win.setSize(new LogicalSize(DOCK_VISIBLE_PX, FULL_HEIGHT))
      await win.setPosition(new LogicalPosition(0, pos.y / sf))
    } else if (edge === 'right') {
      // 窗口移到屏幕最右，只留左侧 DOCK_VISIBLE_PX
      const logicalMw = mw / sf
      await win.setSize(new LogicalSize(DOCK_VISIBLE_PX, FULL_HEIGHT))
      await win.setPosition(new LogicalPosition(logicalMw - DOCK_VISIBLE_PX, pos.y / sf))
    } else if (edge === 'top') {
      // 窗口移到屏幕最顶，只留底部 DOCK_VISIBLE_PX
      await win.setSize(new LogicalSize(FULL_WIDTH, DOCK_VISIBLE_PX))
      await win.setPosition(new LogicalPosition(pos.x / sf, 0))
    }

    dockEdge.value = edge
  } catch (e) {
    console.warn('[PopoutProgress] dock failed:', e)
  }
}

/**
 * 恢复到完整尺寸
 * 关键：先移回安全位置，再恢复尺寸，避免在边缘展开时溢出屏幕
 */
async function undock() {
  try {
    const savedEdge = dockEdge.value
    dockEdge.value = 'none'

    // 计算恢复位置：如果有保存的位置就用它，否则根据当前 dock 边缘计算安全位置
    let targetX = 100
    let targetY = 100

    if (preDockPosition) {
      targetX = preDockPosition.x
      targetY = preDockPosition.y
      preDockPosition = null
    } else {
      // 没有保存位置时，根据 dock 边缘计算一个安全位置
      const monitor = await currentMonitor()
      if (monitor) {
        const sf = monitor.scaleFactor
        const logicalMw = monitor.size.width / sf
        const logicalMh = monitor.size.height / sf
        if (savedEdge === 'right') targetX = logicalMw - FULL_WIDTH - 50
        else if (savedEdge === 'left') targetX = 50
        if (savedEdge === 'top') targetY = 50
        else targetY = Math.min(targetY, logicalMh - FULL_HEIGHT - 50)
      }
    }

    // 屏幕边界校验：确保恢复后窗口完全在屏幕内
    const monitor = await currentMonitor()
    if (monitor) {
      const sf = monitor.scaleFactor
      const logicalMw = monitor.size.width / sf
      const logicalMh = monitor.size.height / sf
      targetX = Math.max(0, Math.min(targetX, logicalMw - FULL_WIDTH))
      targetY = Math.max(0, Math.min(targetY, logicalMh - FULL_HEIGHT))
    }

    // 关键：先移到安全位置，再恢复尺寸
    await win.setPosition(new LogicalPosition(targetX, targetY))
    await win.setSize(new LogicalSize(FULL_WIDTH, FULL_HEIGHT))
  } catch (e) {
    console.warn('[PopoutProgress] undock failed:', e)
  }
}

async function checkEdgeAndDock() {
  if (isHovering.value || dockEdge.value !== 'none') return

  try {
    const pos = await win.outerPosition()
    const size = await win.outerSize()
    const monitor = await currentMonitor()
    if (!monitor) return

    const { width: mw } = monitor.size

    if (pos.y <= EDGE_THRESHOLD) {
      await dockToEdge('top')
    } else if (pos.x <= EDGE_THRESHOLD) {
      await dockToEdge('left')
    } else if (pos.x + size.width >= mw - EDGE_THRESHOLD) {
      await dockToEdge('right')
    }
  } catch (e) {
    console.warn('[PopoutProgress] edge detection failed:', e)
  }
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
  if (dockEdge.value !== 'none') {
    undock()
  }
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
  if (e.button === 0 && !(e.target as HTMLElement).closest('button')) {
    try {
      getCurrentWebviewWindow().startDragging()
    } catch { /* noop */ }
  }
}
</script>

<template>
  <div
    class="progress-wrapper"
    :class="{ 'is-docked': dockEdge !== 'none' }"
    @mousedown="startDrag"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- dock 状态下的指示条 -->
    <div v-if="dockEdge !== 'none'" class="dock-indicator">
      <div class="dock-pulse"></div>
    </div>

    <!-- dock 状态下不渲染主内容以避免溢出 -->
    <template v-if="dockEdge === 'none'">
      <div class="date-block">
        <span class="time">{{ timeStr }}</span>
        <span class="week-day">{{ weekDay }} • W{{ weekNumber }}</span>
      </div>

      <div class="progress-section">
        <div class="track-row">
          <span class="track-label">DAY</span>
          <div class="track">
            <div class="fill day-fill" :style="{ width: `${dayProgress * 100}%` }"></div>
          </div>
        </div>
        <div class="track-row">
          <span class="track-label">YEAR</span>
          <div class="track">
            <div class="fill year-fill" :style="{ width: `${yearProgress * 100}%` }"></div>
          </div>
        </div>
      </div>

      <Transition name="fade">
        <button v-if="isHovering" class="close-btn" @click="closeWindow">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </Transition>
    </template>
  </div>
</template>

<style>
/* Reset 基础覆盖，只在 popout 生效 */
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
.progress-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  background: var(--color-bg-elevated, rgba(30, 30, 33, 0.92));
  backdrop-filter: blur(20px) saturate(1.2);
  -webkit-backdrop-filter: blur(20px) saturate(1.2);
  color: var(--color-text-primary);

  /* 圆角 + overflow:hidden 裁剪所有子元素，消除四角透明泄露 */
  border-radius: 24px;
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
  /* 透明窗口中只用 inset 阴影，外部阴影会泄露到四角透明区域 */
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);

  user-select: none;
  touch-action: none;
  cursor: grab;
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
}

/* dock 状态下窗口只有 10px 宽/高，无需内容渲染 */
.progress-wrapper.is-docked {
  padding: 0;
  gap: 0;
  border-radius: 0;
  clip-path: none;
  border: none;
  background: var(--color-accent, #6366f1);
  box-shadow: 0 0 8px rgba(99, 102, 241, 0.4);
  cursor: pointer;
  justify-content: center;
}

.dock-indicator {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.dock-pulse {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.5; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

.progress-wrapper:active {
  cursor: grabbing;
}

.date-block {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex-shrink: 0;
}

.time {
  font-family: var(--font-mono, 'JetBrains Mono', 'Fira Code', monospace);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.5px;
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
}

.track-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.track-label {
  font-size: 8px;
  font-family: var(--font-mono, 'JetBrains Mono', 'Fira Code', monospace);
  color: var(--color-text-tertiary);
  width: 20px;
  font-weight: 600;
}

.track {
  flex: 1;
  height: 4px;
  background: var(--color-bg-tertiary, rgba(255, 255, 255, 0.08));
  border-radius: 2px;
  overflow: hidden;
  position: relative;
}

.fill {
  height: 100%;
  border-radius: 2px;
  transition: width 1s linear;
}

.day-fill {
  background: linear-gradient(90deg, #63b3ed, var(--color-accent, #6366f1));
}

.year-fill {
  background: linear-gradient(90deg, #f6e05e, #ed8936);
}

.close-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-tertiary, rgba(255, 255, 255, 0.1));
  color: var(--color-text-secondary);
  border: none;
  cursor: pointer;
  z-index: 10;
  appearance: none;
  padding: 0;
  transition: background-color 0.2s ease-out,
              color 0.2s ease-out,
              transform 0.2s ease-out;
}

.close-btn:hover {
  background: var(--color-danger, #f43f5e);
  color: #fff;
  transform: translateY(-50%) scale(1.1);
}

.close-btn:active {
  transform: translateY(-50%) scale(0.95);
}

.close-btn:focus-visible {
  box-shadow: 0 0 0 2px var(--color-accent, #6366f1);
  outline: none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .dock-pulse {
    animation: none;
  }
  .close-btn {
    transition: none;
  }
}
</style>
