<script setup lang="ts">
/**
 * PopoutProgress — 悬挂时间进度小窗
 * 无边框 (decorations: false), data-tauri-drag-region 允许拖拽移动窗口
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'

const now = ref(new Date())
let timer: ReturnType<typeof setInterval>

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  clearInterval(timer)
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

// 鼠标悬停显示详细进度文本
const isHovering = ref(false)

async function closeWindow() {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('close_popout', { label: 'popout-progress' })
  } catch {
    window.close() // fallback
  }
}
</script>

<template>
  <div 
    class="progress-bar-container" 
    data-tauri-drag-region 
    @mouseenter="isHovering = true" 
    @mouseleave="isHovering = false"
  >
    <div class="date-block" data-tauri-drag-region>
      <span class="time" data-tauri-drag-region>{{ timeStr }}</span>
      <span class="week-day" data-tauri-drag-region>{{ weekDay }} • W{{ weekNumber }}</span>
    </div>

    <div class="progress-section" data-tauri-drag-region>
      <div class="track-row" data-tauri-drag-region>
        <span class="track-label" data-tauri-drag-region>DAY</span>
        <div class="track" data-tauri-drag-region>
          <div class="fill day-fill" :style="{ width: `${dayProgress * 100}%` }"></div>
        </div>
      </div>
      <div class="track-row" data-tauri-drag-region>
        <span class="track-label" data-tauri-drag-region>YEAR</span>
        <div class="track" data-tauri-drag-region>
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
