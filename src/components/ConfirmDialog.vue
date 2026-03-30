<script setup lang="ts">
/**
 * ConfirmDialog — 通用确认弹窗
 * 替代原生 <dialog>，确保全局居中 + 统一视觉
 */
import { watch, nextTick, ref } from 'vue'

const props = withDefaults(defineProps<{
  open: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  /** danger = 红色确认按钮, accent = 主题色确认按钮 */
  confirmType?: 'danger' | 'accent'
}>(), {
  title: '确认操作',
  message: '此操作不可撤销，确定继续吗？',
  confirmText: '确认',
  cancelText: '取消',
  confirmType: 'danger',
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const confirmBtnRef = ref<HTMLButtonElement | null>(null)

watch(() => props.open, async (val) => {
  if (val) {
    await nextTick()
    confirmBtnRef.value?.focus()
  }
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    emit('cancel')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="confirm-dialog">
      <div
        v-if="open"
        class="confirm-overlay"
        @click.self="emit('cancel')"
        @keydown="handleKeydown"
      >
        <div class="confirm-panel" role="alertdialog" aria-modal="true" :aria-label="title">
          <svg class="confirm-icon" :class="confirmType" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h3 class="confirm-title">{{ title }}</h3>
          <p class="confirm-message" v-html="message" />
          <div class="confirm-actions">
            <button class="confirm-cancel-btn" @click="emit('cancel')">{{ cancelText }}</button>
            <button
              ref="confirmBtnRef"
              class="confirm-ok-btn"
              :class="confirmType"
              @click="emit('confirm')"
            >{{ confirmText }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 9000);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.confirm-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 400px;
  width: 90vw;
  padding: var(--space-8);
  background: var(--color-bg-elevated, var(--color-bg-primary));
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-xl, 20px);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.35),
              0 8px 20px rgba(0, 0, 0, 0.15);
  animation: confirm-in 0.2s var(--ease-out);
}

@keyframes confirm-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-8px);
  }
}

.confirm-icon {
  margin-bottom: var(--space-4);
  transition: color var(--duration-fast) var(--ease-out);
}

.confirm-icon.danger {
  color: var(--color-warning, #e6a817);
}

.confirm-icon.accent {
  color: var(--color-accent);
}

.confirm-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.confirm-message {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-bottom: var(--space-6);
}

.confirm-message :deep(strong) {
  font-weight: 700;
  color: var(--color-text-primary);
}

.confirm-actions {
  display: flex;
  gap: var(--space-3);
  width: 100%;
}

.confirm-cancel-btn,
.confirm-ok-btn {
  flex: 1;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-weight: 500;
  font-size: 0.88rem;
  transition: background-color var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
}

.confirm-cancel-btn {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.confirm-ok-btn.danger {
  background: var(--color-danger);
  color: var(--color-text-inverse);
}

.confirm-ok-btn.accent {
  background: var(--color-accent);
  color: var(--color-text-inverse);
}

@media (hover: hover) {
  .confirm-cancel-btn:hover {
    background: var(--color-bg-hover);
  }
  .confirm-ok-btn.danger:hover {
    filter: brightness(1.1);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }
  .confirm-ok-btn.accent:hover {
    filter: brightness(1.1);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }
}

.confirm-cancel-btn:active,
.confirm-ok-btn:active {
  transform: scale(0.97);
}

.confirm-ok-btn:focus-visible {
  box-shadow: 0 0 0 3px var(--color-accent-muted);
  outline: none;
}

/* ─── Transition ─── */
.confirm-dialog-enter-active {
  transition: opacity 0.2s var(--ease-out);
}

.confirm-dialog-leave-active {
  transition: opacity 0.15s var(--ease-out);
}

.confirm-dialog-enter-from,
.confirm-dialog-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .confirm-panel {
    animation: none;
  }
}
</style>
