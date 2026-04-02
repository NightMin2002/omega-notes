<script setup lang="ts">
/**
 * PopoutProgress — 悬挂时间进度小窗
 * 无边框 (decorations: false), data-tauri-drag-region 允许拖拽移动窗口
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { currentMonitor } from '@tauri-apps/api/window'

const win = getCurrentWebviewWindow()
const now = ref(new Date())
let timer: ReturnType<typeof setInterval>
let fallbackTimer: ReturnType<typeof setInterval>

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 1000)
  
  // 备用兜底检查：如果系统丢失了 mouseleave 事件，每 1.5 秒尝试检查一下
  fallbackTimer = setInterval(() => {
    checkEdgeAndDock()
  }, 1500)
})

onUnmounted(() => {
  clearInterval(timer)
  clearInterval(fallbackTimer)
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

// 鼠标悬停及边缘吸附逻辑
const isHovering = ref(false)
const dockEdge = ref<'none'|'left'|'right'|'top'>('none')
let hideTimeout: ReturnType<typeof setTimeout>

async function checkEdgeAndDock() {
  if (isHovering.value || dockEdge.value !== 'none') return
  
  try {
    const pos = await win.outerPosition()
    const size = await win.outerSize()
    const monitor = await currentMonitor()
    if (!monitor) return
    
    const { width: mw } = monitor.size
    const THRESHOLD = 80 // 边缘 80 物理像素内自动吸附，增加容错区
    
    // 改变了 pos.x 和 y 之后，直接通过系统方法贴合边缘，并将内部 CSS transformed 出去
    if (pos.y <= THRESHOLD) {
      pos.y = 0
      await win.setPosition(pos)
      dockEdge.value = 'top'
    } else if (pos.x <= THRESHOLD) {
      pos.x = 0
      await win.setPosition(pos)
      dockEdge.value = 'left'
    } else if (pos.x + size.width >= mw - THRESHOLD) {
      pos.x = mw - size.width
      await win.setPosition(pos)
      dockEdge.value = 'right'
    }
  } catch (e) {
    console.warn('Edge detection failed', e)
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
    dockEdge.value = 'none'
  }
}

async function closeWindow() {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('close_popout', { label: 'popout-progress' })
  } catch {
    window.close() // fallback
  }
}

function startDrag(e: MouseEvent) {
  // Only trigger on left click and ignore buttons
  if (e.button === 0 && !(e.target as HTMLElement).closest('button')) {
    try {
      getCurrentWebviewWindow().startDragging()
    } catch {}
  }
}
</script>

<template>
  <!-- 外围包裹层，专门处理变宽溢出时的透明穿透，并将所有过渡绑定在这 -->
  <div 
    class="progress-bar-container" 
    :class="`dock-${dockEdge}`"
    @mousedown="startDrag"
    @mouseenter="handleMouseEnter" 
    @mouseleave="handleMouseLeave"
  >
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
.progress-bar-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  background: var(--color-bg-elevated, rgba(30, 30, 33, 0.85));
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  color: var(--color-text-primary);
  /* 圆角和阴影 */
  border-radius: 24px;
  border: 1px solid var(--color-border);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.05),
              0 8px 24px rgba(0, 0, 0, 0.4);
  /* 禁止选中文字 */
  user-select: none;
  touch-action: none;
  cursor: grab;
  position: relative;
  box-sizing: border-box;
  
  /* 添加边缘隐藏的平滑过渡，这非常重要 */
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.4s ease;
}

/* 边缘隐藏状态：直接将内部 DOM 移出视图范围，剩下几像素尾巴。
   基于 Webview 是透明无边框的原理实现物理悬挂缩回效果。*/
.progress-bar-container.dock-left {
  transform: translateX(calc(-100% + 16px));
  opacity: 0.8;
}

.progress-bar-container.dock-right {
  transform: translateX(calc(100% - 16px));
  opacity: 0.8;
}

.progress-bar-container.dock-top {
  transform: translateY(calc(-100% + 16px));
  opacity: 0.8;
}

.progress-bar-container:active {
  cursor: grabbing;
}

.date-block {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex-shrink: 0;
}

.time {
  font-family: var(--font-mono);
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
}

.track-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.track-label {
  font-size: 8px;
  font-family: var(--font-mono);
  color: var(--color-text-tertiary);
  width: 20px;
  font-weight: 600;
}

.track {
  flex: 1;
  height: 4px;
  background: var(--color-bg-tertiary);
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
  background: linear-gradient(90deg, #63b3ed, var(--color-accent));
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
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: none;
  cursor: pointer;
  z-index: 10;
  transition: background-color var(--duration-fast),
              color var(--duration-fast);
}

.close-btn:hover {
  background: var(--color-danger);
  color: var(--color-text-inverse);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
