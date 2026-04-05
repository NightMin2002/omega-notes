<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { emitTo } from '@tauri-apps/api/event'
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'

import HubExpandedBody from '../../components/popout/HubExpandedBody.vue'

let unlistenCloseRequested: (() => void) | null = null
let unlistenDirectionEvent: (() => void) | null = null
let posCheckInterval: ReturnType<typeof setInterval>
const panelDirection = ref<'up' | 'down'>((localStorage.getItem('hub-panel-direction') as 'up' | 'down') || 'up')
const isVisible = ref(false)

const bc = new BroadcastChannel('omega-hub-channel')
bc.onmessage = (e) => {
  if (e.data?.type === 'direction') {
    applyDirection(e.data.direction)
  }
  if (e.data?.type === 'anim-prepare') {
    isVisible.value = false
    applyDirection(e.data.direction)
  }
  if (e.data?.type === 'anim-start') {
    isVisible.value = true
  }
  if (e.data?.type === 'anim-close') {
    isVisible.value = false
  }
}

function applyDirection(direction: unknown) {
  panelDirection.value = direction === 'down' ? 'down' : 'up'
}

function handleStorage(e: StorageEvent) {
  if (e.key === 'hub-panel-direction') {
    applyDirection(e.newValue)
  }
}

onMounted(async () => {
  unlistenCloseRequested = await getCurrentWindow().onCloseRequested((event) => {
    event.preventDefault()
    emitTo('popout-progress', 'hub:collapse-request', { reason: 'panel-close-request' }).catch(() => {})
  })

  unlistenDirectionEvent = await getCurrentWebviewWindow().listen<{ direction?: 'up' | 'down' }>('hub:panel-direction', (event) => {
    applyDirection(event.payload?.direction)
  })

  window.addEventListener('storage', handleStorage)

  // 改用光速级的原生 BroadcastChannel 握手
  bc.postMessage({ type: 'request-direction' })

  // [终极防漏判定]：直接越过 IPC，读取两个窗口在操作系统底层的绝对物理坐标（Absolute Geometry）。
  // 如果当前面板 Y 坐标严格大于主时间条 Y 坐标，则证明面板在下方（向下展开），反之亦然。绝对可靠的最后防线。
  posCheckInterval = setInterval(async () => {
    try {
      const mainWin = await WebviewWindow.getByLabel('popout-progress')
      if (!mainWin) return
      
      const pWin = getCurrentWebviewWindow()
      const pPos = await pWin.outerPosition()
      const mPos = await mainWin.outerPosition()
      
      const correctDirection = pPos.y > mPos.y ? 'down' : 'up'
      if (panelDirection.value !== correctDirection) {
        panelDirection.value = correctDirection
      }
    } catch {
      // 忽略因窗口被短暂休眠而产生的拿取异常
    }
  }, 100)
})

onUnmounted(() => {
  clearInterval(posCheckInterval)
  unlistenCloseRequested?.()
  unlistenDirectionEvent?.()
  window.removeEventListener('storage', handleStorage)
})
</script>

<template>
  <div
    class="panel-shell"
    :class="[`panel-shell--${panelDirection}`, isVisible ? 'is-visible' : 'is-hidden']"
    @mouseenter="bc.postMessage({ type: 'panel-hover', hovering: true })"
    @mouseleave="bc.postMessage({ type: 'panel-hover', hovering: false })"
  >
    <HubExpandedBody :direction="panelDirection" />
  </div>
</template>

<style>
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
.panel-shell {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-bg-elevated, rgba(30, 30, 33, 0.92));
  backdrop-filter: blur(20px) saturate(1.2);
  -webkit-backdrop-filter: blur(20px) saturate(1.2);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
  box-sizing: border-box;
  transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.25s ease-out;
}

.panel-shell--up.is-hidden {
  transform: translateY(100%);
  opacity: 0;
}

.panel-shell--down.is-hidden {
  transform: translateY(-100%);
  opacity: 0;
}

.panel-shell.is-visible {
  transform: translateY(0);
  opacity: 1;
}

.panel-shell--up {
  --panel-shift-closed: 10px;
  border-radius: 16px 16px 0 0;
  clip-path: inset(0 round 16px 16px 0 0);
  border-bottom: none;
  border-top: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.28),
    0 6px 18px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  transform-origin: bottom center;
}

.panel-shell--down {
  --panel-shift-closed: -10px;
  border-radius: 0 0 16px 16px;
  clip-path: inset(0 round 0 0 16px 16px);
  border-top: none;
  border-bottom: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.28),
    0 6px 18px rgba(0, 0, 0, 0.2),
    inset 0 -1px 0 rgba(255, 255, 255, 0.03);
  transform-origin: top center;
}
</style>
