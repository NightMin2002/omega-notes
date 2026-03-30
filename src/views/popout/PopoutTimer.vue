<script setup lang="ts">
/**
 * PopoutTimer — 悬挂倒计时窗口
 * 圆形进度环 + 大号数字 + 控制按钮
 */
import { computed, ref } from 'vue'
import { useTasksStore } from '../../stores/tasks'

const store = useTasksStore()
const customMinutes = ref(25)

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const progress = computed(() => {
  const cd = store.countdown
  if (cd.totalSeconds === 0) return 0
  return ((cd.totalSeconds - cd.remainingSeconds) / cd.totalSeconds) * 100
})

const dashOffset = computed(() => (1 - progress.value / 100) * 326.73)

/* 关闭窗口 */
async function closeWindow() {
  try {
    const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    const win = getCurrentWebviewWindow()
    await win.destroy()
  } catch { /* ignore */ }
}
</script>

<template>
  <div class="popout-shell timer-shell">
    <header class="popout-header" data-tauri-drag-region>
      <span class="popout-title" data-tauri-drag-region>⏱ 倒计时</span>
      <button class="popout-close" @click="closeWindow">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </header>

    <div class="timer-body">
      <!-- 进度环 -->
      <div class="ring-wrap">
        <svg class="ring-svg" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" class="ring-bg" />
          <circle
            cx="60" cy="60" r="52"
            class="ring-fg"
            :class="{ active: store.countdown.isRunning, paused: store.countdown.isPaused, done: store.countdownFinished }"
            :style="{ strokeDashoffset: dashOffset }"
          />
        </svg>
        <span class="timer-digits" :class="{ done: store.countdownFinished }">
          {{ formatTime(store.countdown.remainingSeconds) }}
        </span>
      </div>

      <!-- 控制 -->
      <div class="timer-controls">
        <template v-if="!store.countdown.isRunning && store.countdown.remainingSeconds === store.countdown.totalSeconds">
          <div class="preset-btns">
            <button class="preset-btn" @click="store.startCountdown(25)">25m</button>
            <button class="preset-btn" @click="store.startCountdown(45)">45m</button>
            <button class="preset-btn" @click="store.startCountdown(60)">60m</button>
          </div>
          <div class="custom-row">
            <input
              :value="customMinutes"
              class="popout-input timer-input"
              inputmode="numeric"
              @input="(e: Event) => { const v = parseInt((e.target as HTMLInputElement).value); if (!isNaN(v) && v >= 1 && v <= 999) customMinutes = v }"
            />
            <span class="unit">min</span>
            <button class="ctrl-btn accent" @click="store.startCountdown(customMinutes)">开始</button>
          </div>
        </template>
        <template v-else>
          <div class="running-btns">
            <button
              class="ctrl-btn"
              :class="store.countdown.isPaused ? 'accent' : 'ghost'"
              @click="store.pauseCountdown()"
            >{{ store.countdown.isPaused ? '继续' : '暂停' }}</button>
            <button class="ctrl-btn ghost" @click="store.resetCountdown()">重置</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.popout-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  overflow: hidden;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-glass-border);
}

.popout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-divider);
  cursor: move;
  user-select: none;
  -webkit-app-region: drag;
}

.popout-title {
  font-size: 0.82rem;
  font-weight: 600;
}

.popout-close {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--color-text-tertiary);
  -webkit-app-region: no-drag;
  transition: background-color 150ms var(--ease-out), color 150ms var(--ease-out);
}

@media (hover: hover) {
  .popout-close:hover {
    background: var(--color-danger-muted, rgba(239, 68, 68, 0.15));
    color: var(--color-danger);
  }
}

.timer-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-3);
}

.ring-wrap {
  position: relative;
  width: 140px;
  height: 140px;
}

.ring-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: var(--color-bg-tertiary);
  stroke-width: 6;
}

.ring-fg {
  fill: none;
  stroke: var(--color-text-tertiary);
  stroke-width: 6;
  stroke-linecap: round;
  stroke-dasharray: 326.73;
  transition: stroke-dashoffset 1s linear;
}

.ring-fg.active { stroke: var(--color-accent); }
.ring-fg.paused { stroke: var(--color-warning); }
.ring-fg.done { stroke: var(--color-success); }

.timer-digits {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 1.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.timer-digits.done { color: var(--color-success); }

.timer-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
}

.preset-btns {
  display: flex;
  gap: var(--space-1);
}

.preset-btn {
  font-size: 0.72rem;
  font-weight: 600;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  transition: background-color 150ms var(--ease-out), color 150ms var(--ease-out), border-color 150ms var(--ease-out);
}

@media (hover: hover) {
  .preset-btn:hover {
    background: var(--color-accent-muted);
    color: var(--color-accent);
    border-color: var(--color-accent);
  }
}

.preset-btn:active { transform: scale(0.95); }

.custom-row {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.timer-input {
  width: 48px;
  text-align: center;
  font-family: var(--font-mono);
}

.unit {
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
}

.running-btns {
  display: flex;
  gap: var(--space-2);
}

.ctrl-btn {
  font-size: 0.75rem;
  font-weight: 500;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  transition: background-color 150ms var(--ease-out), color 150ms var(--ease-out);
}

.ctrl-btn.accent {
  background: var(--color-accent);
  color: var(--color-text-inverse);
}

.ctrl-btn.ghost {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

@media (hover: hover) {
  .ctrl-btn.accent:hover { background: var(--color-accent-hover); }
  .ctrl-btn.ghost:hover { background: var(--color-bg-hover); }
}

.ctrl-btn:active { transform: scale(0.95); }

.popout-input {
  padding: var(--space-1) var(--space-2);
  font-size: 0.78rem;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  outline: none;
  transition: border-color 150ms var(--ease-out), box-shadow 150ms var(--ease-out);
}

.popout-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-muted);
}
</style>
