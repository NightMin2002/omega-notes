<script setup lang="ts">
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

const dashOffset = computed(() => (1 - progress.value / 100) * 251.2) // 2 * pi * 40

</script>

<template>
  <div class="hub-timer">
    <!-- 进度环 -->
    <div class="ring-wrap">
      <svg class="ring-svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" class="ring-bg" />
        <circle
          cx="50" cy="50" r="40"
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
            class="hub-input timer-input"
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
</template>

<style scoped>
.hub-timer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  height: 100%;
}

.ring-wrap {
  position: relative;
  width: 120px;
  height: 120px;
  margin-bottom: var(--space-4);
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
  stroke-dasharray: 251.2;
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
  font-size: 1.6rem;
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
  gap: var(--space-2);
}

.preset-btn {
  font-size: 0.72rem;
  font-weight: 600;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  transition: all 150ms var(--ease-out);
  cursor: pointer;
}
.preset-btn:hover {
  background: var(--color-accent-muted);
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.preset-btn:active { transform: scale(0.95); }

.custom-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
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
  transition: all 150ms var(--ease-out);
  cursor: pointer;
  border: none;
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
.ctrl-btn.accent:hover { background: var(--color-accent-hover); }
.ctrl-btn.ghost:hover { background: var(--color-bg-hover); }
.ctrl-btn:active { transform: scale(0.95); }

.hub-input {
  padding: var(--space-1) var(--space-2);
  font-size: 0.78rem;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  outline: none;
  transition: all 150ms var(--ease-out);
}
.hub-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-muted);
}
</style>
