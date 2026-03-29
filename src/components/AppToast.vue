<script setup lang="ts">
import { ref, computed } from 'vue'

export interface ToastItem {
  id: number
  title: string
  body: string
  type: 'info' | 'success' | 'warning'
  /** 创建时间戳 */
  createdAt: number
}

const toasts = ref<ToastItem[]>([])
let toastId = 0

function push(title: string, body: string, type: ToastItem['type'] = 'info', duration = 5000) {
  const id = ++toastId
  toasts.value.push({ id, title, body, type, createdAt: Date.now() })
  if (duration > 0) {
    setTimeout(() => dismiss(id), duration)
  }
}

function dismiss(id: number) {
  const idx = toasts.value.findIndex(t => t.id === id)
  if (idx >= 0) toasts.value.splice(idx, 1)
}

const visibleToasts = computed(() => toasts.value.slice(-5))

defineExpose({ push, dismiss })
</script>

<template>
  <Teleport to="body">
    <div class="toast-container" role="status" aria-live="polite">
      <TransitionGroup name="toast-slide">
        <div
          v-for="toast in visibleToasts"
          :key="toast.id"
          class="toast-item"
          :class="`toast-${toast.type}`"
        >
          <div class="toast-icon-area">
            <!-- info -->
            <svg v-if="toast.type === 'info'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <!-- success -->
            <svg v-else-if="toast.type === 'success'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <!-- warning -->
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div class="toast-content">
            <span class="toast-title">{{ toast.title }}</span>
            <span class="toast-body">{{ toast.body }}</span>
          </div>
          <button class="toast-close" @click="dismiss(toast.id)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: calc(var(--header-height, 40px) + var(--space-3));
  right: var(--space-4);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  pointer-events: none;
  max-width: 380px;
  width: 100%;
}

.toast-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border-button);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25),
              0 2px 8px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
  backdrop-filter: blur(12px);
}

.toast-info {
  border-left: 3px solid var(--color-accent);
}

.toast-success {
  border-left: 3px solid var(--color-success);
}

.toast-warning {
  border-left: 3px solid var(--color-warning);
}

.toast-icon-area {
  flex-shrink: 0;
  padding-top: 1px;
}

.toast-info .toast-icon-area { color: var(--color-accent); }
.toast-success .toast-icon-area { color: var(--color-success); }
.toast-warning .toast-icon-area { color: var(--color-warning); }

.toast-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.toast-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.3;
}

.toast-body {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
  word-break: break-word;
}

.toast-close {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--color-text-tertiary);
  transition: color var(--duration-fast) var(--ease-out),
              background-color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .toast-close:hover {
    color: var(--color-text-primary);
    background: var(--color-bg-hover);
  }
}

.toast-close:active {
  transform: scale(0.98);
}

/* ─── 动画 ─── */
.toast-slide-enter-active {
  transition: transform 0.25s var(--ease-out),
              opacity 0.25s var(--ease-out);
}

.toast-slide-leave-active {
  transition: transform 0.2s var(--ease-out),
              opacity 0.2s var(--ease-out);
}

.toast-slide-enter-from {
  opacity: 0;
  transform: translateX(60px) scale(0.96);
}

.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(60px) scale(0.96);
}

.toast-slide-move {
  transition: transform 0.25s var(--ease-out);
}

@media (prefers-reduced-motion: reduce) {
  .toast-slide-enter-active,
  .toast-slide-leave-active,
  .toast-slide-move {
    transition: none;
  }
}
</style>
