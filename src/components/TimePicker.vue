<script setup lang="ts">
/**
 * Ω TimePicker — 自定义时间选择器
 * 使用 Teleport + position:fixed 避免被父容器裁剪
 */
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  clearable?: boolean
  minuteStep?: number
}>(), {
  placeholder: '设置时间',
  clearable: true,
  minuteStep: 5,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
}>()

const isOpen = ref(false)
const hour = ref(0)
const minute = ref(0)
const triggerEl = ref<HTMLElement>()
const panelEl = ref<HTMLElement>()

/* 面板定位坐标 */
const panelStyle = ref({ top: '0px', left: '0px' })

watch(() => props.modelValue, (val) => {
  if (val) {
    const parts = val.split(':').map(Number)
    hour.value = parts[0] ?? 0
    minute.value = parts[1] ?? 0
  }
}, { immediate: true })

function calcPosition() {
  if (!triggerEl.value) return
  const rect = triggerEl.value.getBoundingClientRect()
  const panelW = 172 // 面板大致宽度
  const panelH = 170 // 面板大致高度
  const spaceBelow = window.innerHeight - rect.bottom
  const top = spaceBelow >= panelH
    ? rect.bottom + 6
    : rect.top - panelH - 6
  /* 水平居中于触发按钮，夹紧在视口内 */
  const centerX = rect.left + rect.width / 2 - panelW / 2
  const clampedX = Math.max(8, Math.min(centerX, window.innerWidth - panelW - 8))
  panelStyle.value = {
    top: `${Math.max(4, top)}px`,
    left: `${clampedX}px`,
  }
}

async function toggle() {
  if (!isOpen.value && props.modelValue) {
    const parts = props.modelValue.split(':').map(Number)
    hour.value = parts[0] ?? 0
    minute.value = parts[1] ?? 0
  }
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    await nextTick()
    calcPosition()
  }
}

function incHour() { hour.value = (hour.value + 1) % 24 }
function decHour() { hour.value = (hour.value - 1 + 24) % 24 }
function incMinute() { minute.value = (minute.value + props.minuteStep) % 60 }
function decMinute() { minute.value = (minute.value - props.minuteStep + 60) % 60 }

/** 滚轮调整小时/分钟 */
function onWheelHour(e: WheelEvent) {
  e.preventDefault()
  if (e.deltaY < 0) incHour()
  else decHour()
}
function onWheelMinute(e: WheelEvent) {
  e.preventDefault()
  if (e.deltaY < 0) incMinute()
  else decMinute()
}

/** 直接输入小时 */
function onHourInput(e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value, 10)
  if (!isNaN(val)) hour.value = Math.max(0, Math.min(23, val))
}
/** 直接输入分钟 */
function onMinuteInput(e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value, 10)
  if (!isNaN(val)) minute.value = Math.max(0, Math.min(59, val))
}
/** 失焦时修正显示 */
function onDigitBlur(e: Event) {
  const input = e.target as HTMLInputElement
  // 强制刷新显示值
  input.value = input.value.padStart(2, '0')
}
/** 聚焦时全选 */
function onDigitFocus(e: Event) {
  (e.target as HTMLInputElement).select()
}

function confirm() {
  const h = String(hour.value).padStart(2, '0')
  const m = String(minute.value).padStart(2, '0')
  emit('update:modelValue', `${h}:${m}`)
  isOpen.value = false
}

function clear() {
  emit('update:modelValue', undefined)
  isOpen.value = false
}

const displayText = computed(() => props.modelValue || props.placeholder)
const hasValue = computed(() => !!props.modelValue)
const formattedHour = computed(() => String(hour.value).padStart(2, '0'))
const formattedMinute = computed(() => String(minute.value).padStart(2, '0'))

function onClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (triggerEl.value?.contains(target)) return
  if (panelEl.value?.contains(target)) return
  isOpen.value = false
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<template>
  <div class="tp">
    <button
      ref="triggerEl"
      type="button"
      class="tp-trigger"
      :class="{ active: isOpen, 'has-value': hasValue }"
      @click="toggle"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span class="tp-text">{{ displayText }}</span>
    </button>

    <!-- Teleport 到 body 避免被父容器 overflow 裁剪 -->
    <Teleport to="body">
      <Transition name="tp-drop">
        <div
          v-if="isOpen"
          ref="panelEl"
          class="tp-panel"
          :style="panelStyle"
        >
          <div class="tp-steppers">
            <div class="tp-col" @wheel.prevent="onWheelHour">
              <button type="button" class="tp-arrow" @click="incHour">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </button>
              <input
                class="tp-digit"
                type="text"
                inputmode="numeric"
                maxlength="2"
                :value="formattedHour"
                @input="onHourInput"
                @blur="onDigitBlur"
                @focus="onDigitFocus"
              >
              <button type="button" class="tp-arrow" @click="decHour">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>

            <span class="tp-sep">:</span>

            <div class="tp-col" @wheel.prevent="onWheelMinute">
              <button type="button" class="tp-arrow" @click="incMinute">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </button>
              <input
                class="tp-digit"
                type="text"
                inputmode="numeric"
                maxlength="2"
                :value="formattedMinute"
                @input="onMinuteInput"
                @blur="onDigitBlur"
                @focus="onDigitFocus"
              >
              <button type="button" class="tp-arrow" @click="decMinute">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
          </div>

          <div class="tp-actions">
            <button v-if="clearable && hasValue" type="button" class="tp-btn tp-btn-clear" @click="clear">清除</button>
            <button type="button" class="tp-btn tp-btn-confirm" @click="confirm">确定</button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style>
/* Teleport 到 body 的元素不能用 scoped，需要全局样式 */

.tp {
  position: relative;
  display: inline-flex;
}

.tp-trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  font-size: 0.78rem;
  font-family: var(--font-mono);
  color: var(--color-text-tertiary);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              background-color var(--duration-fast) var(--ease-out);
}

.tp-trigger:active { transform: scale(0.98); }

.tp-trigger.has-value {
  color: var(--color-accent);
  border-color: var(--color-accent-muted);
}

.tp-trigger.active {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-muted);
}

@media (hover: hover) {
  .tp-trigger:hover {
    border-color: var(--color-border-strong);
    color: var(--color-text-secondary);
  }
  .tp-trigger.has-value:hover { border-color: var(--color-accent); }
}

.tp-trigger:focus-visible {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-muted);
  outline: none;
}

.tp-text { white-space: nowrap; }

/* ─── 面板 (Teleport 到 body) ─── */
.tp-panel {
  position: fixed;
  z-index: var(--z-dropdown);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  min-width: 160px;
}

.tp-steppers {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}

.tp-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
}

.tp-arrow {
  width: 36px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--color-text-tertiary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

.tp-arrow:active {
  transform: scale(0.9);
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

@media (hover: hover) {
  .tp-arrow:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
}

.tp-arrow:focus-visible {
  box-shadow: 0 0 0 2px var(--color-accent-muted);
  outline: none;
}

.tp-digit {
  font-family: var(--font-mono);
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--color-text-primary);
  width: 52px;
  text-align: center;
  line-height: 1;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--space-2) 0;
  border: 2px solid transparent;
  outline: none;
  cursor: text;
  transition: border-color var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
}

.tp-digit:focus-visible {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-muted);
}

.tp-sep {
  font-family: var(--font-mono);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-accent);
  padding-bottom: 2px;
  user-select: none;
}

.tp-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-1);
}

.tp-btn {
  font-size: 0.72rem;
  font-weight: 500;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

.tp-btn:active { transform: scale(0.96); }

.tp-btn-confirm {
  background: var(--color-accent);
  color: var(--color-text-inverse);
}

@media (hover: hover) {
  .tp-btn-confirm:hover { background: var(--color-accent-hover); }
}

.tp-btn-clear {
  background: transparent;
  color: var(--color-text-tertiary);
}

@media (hover: hover) {
  .tp-btn-clear:hover { color: var(--color-danger); }
}

.tp-btn-confirm:focus-visible,
.tp-btn-clear:focus-visible {
  box-shadow: 0 0 0 2px var(--color-accent-muted);
  outline: none;
}

/* ─── 动画 ─── */
.tp-drop-enter-active,
.tp-drop-leave-active {
  transition: opacity var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
}

.tp-drop-enter-from,
.tp-drop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.tp-drop-enter-to,
.tp-drop-leave-from {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .tp-drop-enter-active,
  .tp-drop-leave-active { transition: none; }
}
</style>
