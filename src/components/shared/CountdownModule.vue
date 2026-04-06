<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTasksStore } from '../../stores/tasks'

const store = useTasksStore()
const customMinutes = ref(25)
const zeroWarning = ref(false)

let warningTimeout: number | undefined

function startCustomCountdown() {
  if (customMinutes.value <= 0) {
    zeroWarning.value = true
    if (warningTimeout) clearTimeout(warningTimeout)
    warningTimeout = window.setTimeout(() => { zeroWarning.value = false }, 2000)
    return
  }
  zeroWarning.value = false
  store.startCountdown(customMinutes.value)
}

function updateCustomMinutes(e: Event) {
  const target = e.target as HTMLInputElement
  // 只允许输入数字
  let text = target.value.replace(/\D/g, '')
  let v = parseInt(text)
  if (isNaN(v)) v = 0
  
  // 限制合理范围 (提升到9999分钟以内，即~ 166小时)
  if (v > 9999) v = 9999
  
  customMinutes.value = v
  // 强制同步底层 DOM 的渲染，防止输入过长或非法字符滞留在输入框里
  target.value = String(v)
}

const formattedTime = computed(() => {
  const sec = store.countdown.remainingSeconds
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return {
    m: String(m).padStart(2, '0'),
    s: String(s).padStart(2, '0')
  }
})

const progressPercent = computed(() => {
  const cd = store.countdown
  if (cd.totalSeconds === 0) return 0
  return ((cd.totalSeconds - cd.remainingSeconds) / cd.totalSeconds) * 100
})
</script>

<template>
  <div class="countdown-module">
    <!-- ═══ 主舞台：数字展示区 ═══ -->
    <div class="display-stage" :class="{ 'is-running': store.countdown.isRunning && !store.countdown.isPaused, 'is-paused': store.countdown.isPaused, 'is-done': store.countdownFinished }">
      <!-- 背景光晕投影 -->
      <div class="glow-orb"></div>
      
      <div class="digits-wrapper">
        <span class="digit minutes">{{ formattedTime.m }}</span>
        <span class="colon">:</span>
        <span class="digit seconds">{{ formattedTime.s }}</span>
      </div>
      
      <!-- 线性进度条 -->
      <div class="progress-track" :class="{ active: store.countdown.isRunning || store.countdownFinished }">
        <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
      </div>
    </div>

    <!-- ═══ 操控键盘 (Grid Overlap 解决跳动) ═══ -->
    <div class="controls-stage">
      
      <!-- [状态 1] 闲置状态：预设/手填输入框 -->
      <transition name="panel-fade">
        <div class="control-panel idle-panel" v-if="!store.countdown.isRunning && store.countdown.remainingSeconds === store.countdown.totalSeconds">
          <div class="preset-row">
            <button class="preset-chip" @click="store.startCountdown(25)">25</button>
            <button class="preset-chip" @click="store.startCountdown(45)">45</button>
            <button class="preset-chip" @click="store.startCountdown(60)">60</button>
          </div>
          
          <div class="custom-stepper-row">
            <div class="stepper-group">
              <button class="stepper-btn" @click="customMinutes = Math.max(0, customMinutes - 1)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              <input
                type="text"
                inputmode="numeric"
                class="stepper-input"
                :value="customMinutes"
                @input="updateCustomMinutes"
                :style="{ width: `calc(${Math.max(2, String(customMinutes).length)}ch + 1.2ch)` }"
              />
              <span class="stepper-unit">m</span>
              <button class="stepper-btn" @click="customMinutes = Math.min(9999, customMinutes + 1)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              
              <Transition name="warning-fade">
                 <div v-if="zeroWarning" class="zero-warning">时间不能为0分钟</div>
              </Transition>
            </div>
            
            <button class="action-btn start-action" @click="startCustomCountdown">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </button>
          </div>
        </div>
      </transition>

      <!-- [状态 2] 运行状态：暂停/停止 -->
      <transition name="panel-fade">
        <div class="control-panel running-panel" v-if="store.countdown.isRunning || store.countdown.remainingSeconds !== store.countdown.totalSeconds">
          <div class="running-actions">
            <button 
              v-if="store.countdown.isRunning"
              class="action-btn"
              :class="store.countdown.isPaused ? 'resume-action' : 'pause-action'"
              @click="store.pauseCountdown()"
            >
              {{ store.countdown.isPaused ? '继续' : '暂停' }}
            </button>
            <button class="action-btn stop-action" @click="store.resetCountdown()">重置</button>
          </div>
        </div>
      </transition>

    </div>
  </div>
</template>

<style scoped>
/* ─── 容器重铸 ─── */
.countdown-module {
  display: flex;
  flex-direction: column;
  width: 100%;
  border-radius: var(--radius-xl, 24px);
  padding: var(--space-4);
  gap: var(--space-6);
  user-select: none;
}

/* ─── 展示区 ─── */
.display-stage {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-6) 0;
}

.digits-wrapper {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-family: var(--font-mono), monospace;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-primary);
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1),
              color 0.4s ease;
}

.digit {
  font-size: 4rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
}

.colon {
  font-size: 3rem;
  font-weight: 600;
  margin-bottom: 8px;
  opacity: 0.5;
}

/* 运行态动画 */
.display-stage.is-running .digits-wrapper {
  animation: breathe 3s ease-in-out infinite alternate;
}
.display-stage.is-done .digits-wrapper {
  color: var(--color-success, oklch(70% 0.15 150));
  animation: pulse-done 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes breathe {
  0% { transform: scale(1); }
  100% { transform: scale(1.02); }
}
@keyframes pulse-done {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); text-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); }
}

/* 极简发光光晕 */
.glow-orb {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 140px;
  height: 140px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in oklch, var(--color-accent) 15%, transparent) 0%, transparent 70%);
  filter: blur(20px);
  z-index: 0;
  transition: opacity 0.5s ease;
  opacity: 0;
}
.display-stage.is-running .glow-orb {
  opacity: 1;
}
.display-stage.is-paused .glow-orb {
  opacity: 0.3;
}
.display-stage.is-done .glow-orb {
  background: radial-gradient(circle, color-mix(in oklch, var(--color-success, #10b981) 25%, transparent) 0%, transparent 70%);
  opacity: 1;
  animation: flash 1s ease infinite;
}
@keyframes flash {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; filter: blur(30px); }
}

/* 流体进度条 */
.progress-track {
  width: 80%;
  height: 6px;
  border-radius: 99px;
  background: var(--color-bg-tertiary);
  margin-top: var(--space-4);
  overflow: hidden;
  position: relative;
  opacity: 0.3;
  transform: translateY(10px) scale(0.9);
  transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.progress-track.active {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.progress-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: 99px;
  transition: width 1s linear;
  box-shadow: 0 0 10px color-mix(in oklch, var(--color-accent) 50%, transparent);
}
.display-stage.is-done .progress-fill {
  background: var(--color-success, oklch(70% 0.15 150));
  box-shadow: 0 0 10px color-mix(in oklch, var(--color-success, #10b981) 50%, transparent);
}

/* ─── 操控键盘层 (彻底解决跳动) ─── */
.controls-stage {
  position: relative;
  width: 100%;
  height: 100px; /* 强制锁定舞台高度 */
}

.control-panel {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: var(--space-3);
}

/* ─── 闲置态 ─── */
.preset-row {
  display: flex;
  gap: var(--space-2);
}
.preset-chip {
  appearance: none;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  padding: 4px 16px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.preset-chip:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
  border-color: var(--color-text-tertiary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.preset-chip:active {
  transform: scale(0.95);
}

.custom-stepper-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.stepper-group {
  display: flex;
  align-items: center;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-full);
  padding: 4px 6px;
  border: 1px solid var(--color-border);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
  position: relative;
}
.stepper-btn {
  appearance: none;
  border: none;
  background: transparent;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all 0.2s;
}
.stepper-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-hover);
}
.stepper-input {
  appearance: none;
  border: none;
  background: transparent;
  min-width: 2ch;
  text-align: center;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
  outline: none;
  padding: 0;
  margin: 0;
  transition: width 0.1s ease-out;
}
.stepper-input:focus-visible {
  outline: none;
  box-shadow: none !important;
}

.stepper-group:has(.stepper-input:focus-visible) {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px color-mix(in oklch, var(--color-accent) 30%, transparent);
}

.stepper-unit {
  font-size: 0.85rem;
  color: var(--color-text-tertiary);
  font-weight: 600;
  margin-left: 2px;
  margin-right: 6px;
}

.action-btn {
  appearance: none;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 24px;
  border-radius: var(--radius-full);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.start-action {
  background: var(--color-accent);
  color: white;
  padding: 8px 16px;
  box-shadow: 0 4px 16px color-mix(in oklch, var(--color-accent) 40%, transparent);
}
.start-action:hover {
  background: color-mix(in oklch, var(--color-accent), white 10%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px color-mix(in oklch, var(--color-accent) 50%, transparent);
}
.start-action:active {
  transform: scale(0.95);
}

/* ─── 运行态 ─── */
.running-actions {
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-2);
}
.pause-action {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}
.resume-action {
  background: var(--color-warning, oklch(75% 0.15 50));
  color: white;
  box-shadow: 0 4px 16px color-mix(in oklch, var(--color-warning, #f59e0b) 40%, transparent);
}
.stop-action {
  background: var(--color-danger-muted, rgba(239, 68, 68, 0.1));
  color: var(--color-danger, #ef4444);
}
.action-btn:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
}
.action-btn:active {
  transform: scale(0.95);
}

/* ─── 过渡动画体系 ─── */
.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.panel-fade-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
.panel-fade-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.98);
}

.zero-warning {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 14px;
  font-size: 0.75rem;
  color: var(--color-danger);
  background: var(--color-danger-muted, color-mix(in oklch, var(--color-danger) 15%, transparent));
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.warning-fade-enter-active, .warning-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.warning-fade-enter-from, .warning-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}
</style>
