<script setup lang="ts">
/**
 * ImageLightbox — 图片/SVG 灯箱放大查看组件
 * 支持图片和 Mermaid SVG 图表的全屏放大浏览
 * 包含缩放、平移、键盘导航等交互
 */
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps<{
  open: boolean
  /** 图片 src（图片模式） */
  src?: string
  /** SVG 内容字符串（Mermaid 模式） */
  svgContent?: string
  /** 图片 alt 文本 */
  alt?: string
}>()

const emit = defineEmits<{
  close: []
}>()

/* 缩放与平移状态 */
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const dragOrigin = ref({ x: 0, y: 0 })
const overlayRef = ref<HTMLElement | null>(null)

const contentStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  cursor: isDragging.value ? 'grabbing' : (scale.value > 1 ? 'grab' : 'zoom-in'),
}))

const zoomPercent = computed(() => Math.round(scale.value * 100))

/* 缩放控制 */
function zoomIn() {
  scale.value = Math.min(scale.value + 0.25, 5)
}

function zoomOut() {
  scale.value = Math.max(scale.value - 0.25, 0.25)
}

function resetZoom() {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

function fitScreen() {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

/* 滚轮缩放 */
function handleWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const newScale = Math.max(0.25, Math.min(5, scale.value + delta))
  scale.value = newScale
}

/* 拖拽平移 */
function handlePointerDown(e: PointerEvent) {
  if (scale.value <= 1) {
    // 单击放大
    scale.value = 2
    return
  }
  isDragging.value = true
  dragStart.value = { x: e.clientX, y: e.clientY }
  dragOrigin.value = { x: translateX.value, y: translateY.value }
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
}

function handlePointerMove(e: PointerEvent) {
  if (!isDragging.value) return
  const dx = e.clientX - dragStart.value.x
  const dy = e.clientY - dragStart.value.y
  translateX.value = dragOrigin.value.x + dx
  translateY.value = dragOrigin.value.y + dy
}

function handlePointerUp() {
  isDragging.value = false
}

/* 点击遮罩关闭 */
function handleOverlayClick(e: MouseEvent) {
  if (e.target === overlayRef.value) {
    emit('close')
  }
}

/* 键盘快捷键 */
function handleKeyDown(e: KeyboardEvent) {
  if (!props.open) return
  switch (e.key) {
    case 'Escape':
      emit('close')
      break
    case '+':
    case '=':
      zoomIn()
      break
    case '-':
      zoomOut()
      break
    case '0':
      resetZoom()
      break
  }
}

/* 重置所有状态 */
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    scale.value = 1
    translateX.value = 0
    translateY.value = 0
    isDragging.value = false
    nextTick(() => {
      overlayRef.value?.focus()
    })
  }
})

onMounted(() => window.addEventListener('keydown', handleKeyDown))
onUnmounted(() => window.removeEventListener('keydown', handleKeyDown))
</script>

<template>
  <Teleport to="body">
    <Transition name="lightbox">
      <div
        v-if="open"
        ref="overlayRef"
        class="lightbox-overlay"
        tabindex="-1"
        @click="handleOverlayClick"
        @wheel.prevent="handleWheel"
      >
        <!-- 顶部工具栏 -->
        <div class="lightbox-toolbar" @click.stop>
          <div class="lt-info">
            <span class="lt-zoom-badge">{{ zoomPercent }}%</span>
            <span v-if="alt" class="lt-alt">{{ alt }}</span>
          </div>
          <div class="lt-actions">
            <button class="lt-btn" @click="zoomOut" :disabled="scale <= 0.25" data-tooltip="缩小 (−)" data-tooltip-pos="bottom">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
            <button class="lt-btn" @click="zoomIn" :disabled="scale >= 5" data-tooltip="放大 (+)" data-tooltip-pos="bottom">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
            <button class="lt-btn" @click="resetZoom" data-tooltip="重置 (0)" data-tooltip-pos="bottom">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" /><path d="M23 10V4" /><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" /><path d="M1 14v6" />
              </svg>
            </button>
            <div class="lt-sep" />
            <button class="lt-btn lt-btn--close" @click="emit('close')" data-tooltip="关闭 (Esc)" data-tooltip-pos="bottom">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <!-- 内容区域 -->
        <div
          class="lightbox-content"
          :style="contentStyle"
          @pointerdown.prevent="handlePointerDown"
          @pointermove="handlePointerMove"
          @pointerup="handlePointerUp"
          @pointercancel="handlePointerUp"
        >
          <!-- 图片模式 -->
          <img
            v-if="src"
            :src="src"
            :alt="alt || '放大查看'"
            class="lightbox-img"
            draggable="false"
          />
          <!-- SVG 模式 (Mermaid) -->
          <div
            v-else-if="svgContent"
            class="lightbox-svg"
            v-html="svgContent"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ─── 遮罩层 ─── */
.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 999);
  display: flex;
  align-items: center;
  justify-content: center;
  background: oklch(0% 0 0 / 0.82);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  outline: none;
  overflow: hidden;
}

/* ─── 顶部工具栏 ─── */
.lightbox-toolbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-5);
  background: linear-gradient(180deg, oklch(0% 0 0 / 0.6) 0%, transparent 100%);
  z-index: 2;
  pointer-events: none;
}

.lightbox-toolbar > * { pointer-events: auto; }

.lt-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.lt-zoom-badge {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 600;
  color: oklch(92% 0 0);
  background: oklch(30% 0 0 / 0.6);
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  min-width: 42px;
  text-align: center;
}

.lt-alt {
  font-size: 0.8rem;
  color: oklch(80% 0 0);
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lt-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.lt-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  color: oklch(85% 0 0);
  transition: background-color 200ms ease-out,
              color 200ms ease-out,
              transform 200ms ease-out;
}

.lt-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

@media (hover: hover) {
  .lt-btn:not(:disabled):hover {
    background: oklch(40% 0 0 / 0.5);
    color: oklch(98% 0 0);
    transform: translateY(-1px);
  }
}

.lt-btn:not(:disabled):active {
  transform: scale(0.92);
}

.lt-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px oklch(70% 0.15 250);
}

.lt-btn--close {
  color: oklch(75% 0 0);
}

@media (hover: hover) {
  .lt-btn--close:hover {
    background: oklch(40% 0.08 25 / 0.6);
    color: oklch(90% 0.12 25);
  }
}

.lt-sep {
  width: 1px;
  height: 18px;
  background: oklch(50% 0 0 / 0.4);
  margin: 0 var(--space-1);
}

/* ─── 内容区域 ─── */
.lightbox-content {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 150ms ease-out;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}

.lightbox-img {
  max-width: 90vw;
  max-height: 85vh;
  border-radius: var(--radius-md);
  box-shadow: 0 8px 40px oklch(0% 0 0 / 0.4),
              0 2px 12px oklch(0% 0 0 / 0.3);
  object-fit: contain;
}

.lightbox-svg {
  background: oklch(98% 0 0);
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 40px oklch(0% 0 0 / 0.4),
              0 2px 12px oklch(0% 0 0 / 0.3);
  max-width: 90vw;
  max-height: 85vh;
  overflow: auto;
  /* 自定义滚动条 */
  scrollbar-width: thin;
  scrollbar-color: oklch(70% 0 0 / 0.3) transparent;
}

.lightbox-svg::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.lightbox-svg::-webkit-scrollbar-track {
  background: transparent;
}

.lightbox-svg::-webkit-scrollbar-thumb {
  background: oklch(70% 0 0 / 0.3);
  border-radius: 3px;
}

.lightbox-svg :deep(svg) {
  max-width: none; /* 允许 SVG 以原始尺寸展示 */
  height: auto;
}

/* ─── 动效 ─── */
.lightbox-enter-active {
  transition: opacity 250ms ease-out;
}

.lightbox-enter-active .lightbox-content {
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1),
              opacity 250ms ease-out;
}

.lightbox-leave-active {
  transition: opacity 200ms ease-in;
}

.lightbox-leave-active .lightbox-content {
  transition: transform 200ms ease-in,
              opacity 200ms ease-in;
}

.lightbox-enter-from {
  opacity: 0;
}

.lightbox-enter-from .lightbox-content {
  opacity: 0;
  transform: scale(0.85);
}

.lightbox-leave-to {
  opacity: 0;
}

.lightbox-leave-to .lightbox-content {
  opacity: 0;
  transform: scale(0.9);
}

/* ─── 减少动效偏好 ─── */
@media (prefers-reduced-motion: reduce) {
  .lightbox-enter-active,
  .lightbox-leave-active,
  .lightbox-enter-active .lightbox-content,
  .lightbox-leave-active .lightbox-content {
    transition: none;
  }
  .lt-btn {
    transition: none;
  }
}
</style>
