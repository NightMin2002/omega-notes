<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'

const props = defineProps<{
  // 供父组件传入的数据，一旦数据变更则重新计算是否显示左右按钮
  watchData?: any
}>()

const trackRef = ref<HTMLElement | null>(null)
const showLeftBtn = ref(false)
const showRightBtn = ref(false)
const isDragging = ref(false)

// 拖动与惯性滑行核心参数
let isMouseDown = false
let startX = 0
let startLeft = 0
let lastX = 0
let lastTime = 0
let velocity = 0
let rafId = 0
let hasMovedEnough = false // 标记是否位移超过阈值，用于拦截误触点击
let resizeObserver: ResizeObserver | null = null

// 更新左右按钮的可见性
const updateButtons = () => {
  const track = trackRef.value
  if (!track) return
  
  const scrollLeft = track.scrollLeft
  const scrollWidth = track.scrollWidth
  const clientWidth = track.clientWidth

  // scrollLeft 大于 5 像素，说明可以往左滚动，显示左按钮
  showLeftBtn.value = scrollLeft > 5
  // scrollLeft + clientWidth 小于 scrollWidth - 5 像素，说明可以往右滚动，显示右按钮
  showRightBtn.value = scrollLeft + clientWidth < scrollWidth - 5
}

// 左右侧外置按钮的点击滚动
const scrollBy = (offset: number) => {
  const track = trackRef.value
  if (!track) return
  
  // 点击时停止任何可能正在运行的惯性滑行动画
  cancelAnimationFrame(rafId)
  track.scrollBy({ left: offset, behavior: 'smooth' })
}

// 惯性滑行动画
const startInertia = () => {
  const track = trackRef.value
  if (!track) return

  let lastScrollLeft = track.scrollLeft
  const step = () => {
    if (Math.abs(velocity) < 0.05 || !track) {
      velocity = 0
      updateButtons()
      return
    }
    track.scrollLeft -= velocity * 16 // 约等于 60Hz 帧速率下的每帧滑行距离
    updateButtons()
    
    // 撞墙检测：如果位置没有改变，说明触及边界，立即停止滑行释放 CPU
    if (track.scrollLeft === lastScrollLeft) {
      velocity = 0
      return
    }
    lastScrollLeft = track.scrollLeft
    velocity *= 0.95 // 惯性衰减系数 (阻尼)
    rafId = requestAnimationFrame(step)
  }

  cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(step)
}

// 鼠标按下轨道
const handleMouseDown = (e: MouseEvent) => {
  const track = trackRef.value
  if (!track) return

  // 仅限左键拖拽
  if (e.button !== 0) return

  // 取消当前的惯性动画
  cancelAnimationFrame(rafId)

  isMouseDown = true
  isDragging.value = true
  hasMovedEnough = false

  startX = e.pageX
  startLeft = track.scrollLeft
  lastX = e.pageX
  lastTime = Date.now()
  velocity = 0

  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
}

// 鼠标拖拽移动
const handleMouseMove = (e: MouseEvent) => {
  if (!isMouseDown) return
  const track = trackRef.value
  if (!track) return

  const currentX = e.pageX
  const currentTime = Date.now()
  const walk = (currentX - startX) * 1.3 // 增加 1.3 倍的手势滑行灵敏度
  
  track.scrollLeft = startLeft - walk
  updateButtons()

  // 若拖拽位移大于等于 5px，则视为处于拖动中，后续屏蔽误触点击
  if (Math.abs(currentX - startX) >= 5) {
    hasMovedEnough = true
  }

  // 计算两帧之间的瞬时滑行速度
  const dt = currentTime - lastTime
  if (dt > 0) {
    velocity = (currentX - lastX) / dt
  }

  lastX = currentX
  lastTime = currentTime
}

// 鼠标松开释放
const handleMouseUp = () => {
  if (!isMouseDown) return
  isMouseDown = false
  isDragging.value = false

  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)

  // 达到滑行阈值时启用阻尼物理滑行
  if (hasMovedEnough && Math.abs(velocity) > 0.05) {
    startInertia()
  }
}

// 捕获阶段拦截误触点击，防止松开拖拽时触发标签的 select 事件
const handleCaptureClick = (e: MouseEvent) => {
  if (hasMovedEnough) {
    e.preventDefault()
    e.stopPropagation()
    hasMovedEnough = false // 重置
  }
}

// 绑定生命周期
onMounted(() => {
  const track = trackRef.value
  if (track) {
    track.addEventListener('scroll', updateButtons)
    window.addEventListener('resize', updateButtons)
    
    // 监听容器尺寸变化（包括侧边栏折叠/展开等局部变化）
    resizeObserver = new ResizeObserver(() => {
      updateButtons()
    })
    resizeObserver.observe(track)
    
    // 初始化后计算一次按钮状态
    nextTick(() => {
      updateButtons()
    })
  }
})

onUnmounted(() => {
  const track = trackRef.value
  if (track) {
    track.removeEventListener('scroll', updateButtons)
  }
  window.removeEventListener('resize', updateButtons)
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
  
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  
  cancelAnimationFrame(rafId)
})

// 监听外层传入的监控数据
watch(() => props.watchData, () => {
  nextTick(() => {
    updateButtons()
  })
}, { deep: true, immediate: true })
</script>

<template>
  <div class="scrollable-tag-bar-container">
    <!-- 左侧控制按钮 -->
    <button
      class="scroll-control-btn left"
      :class="{ hidden: !showLeftBtn }"
      type="button"
      aria-label="向左滚动"
      @click="scrollBy(-220)"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>

    <!-- 中间滚动轨道 -->
    <div
      ref="trackRef"
      class="scrollable-track"
      :class="{ dragging: isDragging }"
      @mousedown="handleMouseDown"
      @click.capture="handleCaptureClick"
    >
      <div class="scrollable-content">
        <slot />
      </div>
    </div>

    <!-- 右侧控制按钮 -->
    <button
      class="scroll-control-btn right"
      :class="{ hidden: !showRightBtn }"
      type="button"
      aria-label="向右滚动"
      @click="scrollBy(220)"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.scrollable-tag-bar-container {
  display: flex;
  align-items: center;
  position: relative;
  width: 100%;
  gap: var(--space-2);
}

/* 滚动轨道：隐藏原生滚动条，支持抓取手势 */
.scrollable-track {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  cursor: grab;
  /* 隐藏滚动条 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
  user-select: none;
  -webkit-user-select: none;
}

.scrollable-track::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

.scrollable-track.dragging {
  cursor: grabbing;
}

/* 确保内部插槽平铺且不折行 */
.scrollable-content {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: max-content;
}

/* 禁用插槽内所有子项的默认拖拽和文本选择 */
.scrollable-track :deep(button),
.scrollable-track :deep(a),
.scrollable-track :deep(*) {
  user-select: none !important;
  -webkit-user-drag: none !important;
  pointer-events: auto; /* 保证点击或拖拽卡片放置时仍有效 */
}

/* 左右外置控制按钮 */
.scroll-control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: var(--radius-full);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: opacity var(--duration-fast) var(--ease-out),
              visibility var(--duration-fast) var(--ease-out),
              background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
  z-index: 10;
}

.scroll-control-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.scroll-control-btn:active {
  background: var(--color-bg-active);
}

/* 占位淡出，绝对禁止使用 display: none */
.scroll-control-btn.hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
</style>
