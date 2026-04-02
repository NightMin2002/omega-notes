<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { emitTo } from '@tauri-apps/api/event'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'

import HubExpandedBody from './HubExpandedBody.vue'

let unlistenCloseRequested: (() => void) | null = null
let unlistenDirectionEvent: (() => void) | null = null
const panelDirection = ref<'up' | 'down'>((localStorage.getItem('hub-panel-direction') as 'up' | 'down') || 'up')

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
})

onUnmounted(() => {
  unlistenCloseRequested?.()
  unlistenDirectionEvent?.()
  window.removeEventListener('storage', handleStorage)
})
</script>

<template>
  <div class="panel-shell" :class="`panel-shell--${panelDirection}`">
    <HubExpandedBody />
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
  border-radius: 16px 16px 0 0;
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
  border-bottom: none;
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.28),
    0 6px 18px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  box-sizing: border-box;
}

.panel-shell--up {
  --panel-shift-closed: 10px;
  border-radius: 16px 16px 0 0;
  border-bottom: none;
  transform-origin: bottom center;
}

.panel-shell--down {
  --panel-shift-closed: -10px;
  border-radius: 0 0 16px 16px;
  border-top: none;
  transform-origin: top center;
}
</style>
