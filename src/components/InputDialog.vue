<script setup lang="ts">
/**
 * InputDialog — 通用文本输入弹窗
 * 替代原生 prompt()，确保全局居中 + 统一视觉
 */
import { watch, nextTick, ref } from 'vue'

const props = withDefaults(defineProps<{
  open: boolean
  title?: string
  placeholder?: string
  initialValue?: string
  confirmText?: string
  cancelText?: string
  confirmType?: 'danger' | 'accent'
  allowEmpty?: boolean
  requiredMatch?: string
  description?: string
}>(), {
  title: '请输入',
  placeholder: '',
  initialValue: '',
  confirmText: '确认',
  cancelText: '取消',
  confirmType: 'accent',
  allowEmpty: false,
})

const emit = defineEmits<{
  confirm: [value: string]
  cancel: []
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const inputValue = ref('')

watch(() => props.open, async (val) => {
  if (val) {
    inputValue.value = props.initialValue
    await nextTick()
    if (inputRef.value) {
      inputRef.value.focus()
      inputRef.value.select()
    }
  }
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    emit('cancel')
  } else if (e.key === 'Enter') {
    e.preventDefault()
    e.stopPropagation()
    handleConfirm()
  }
}

function handleConfirm() {
  const v = inputValue.value.trim()
  if (!props.allowEmpty && !v) return
  if (props.requiredMatch && v !== props.requiredMatch) return
  emit('confirm', v)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="input-dialog">
      <div
        v-if="open"
        class="input-overlay"
        @click.self="emit('cancel')"
        @keydown="handleKeydown"
      >
        <div class="input-panel" role="dialog" aria-modal="true" :aria-label="title">
          <h3 class="input-title">{{ title }}</h3>
          <p v-if="description" class="input-description">{{ description }}</p>
          
          <div class="input-container">
            <input
              ref="inputRef"
              v-model="inputValue"
              type="text"
              class="input-field"
              :placeholder="placeholder"
              spellcheck="false"
            />
          </div>

          <div class="input-actions">
            <button class="input-cancel-btn" @click="emit('cancel')">{{ cancelText }}</button>
            <button
              class="input-ok-btn"
              :class="confirmType"
              :disabled="(requiredMatch ? inputValue !== requiredMatch : (!allowEmpty && !inputValue.trim()))"
              @click="handleConfirm"
            >{{ confirmText }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.input-overlay {
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

.input-panel {
  display: flex;
  flex-direction: column;
  max-width: 400px;
  width: 90vw;
  padding: var(--space-6);
  background: var(--color-bg-elevated, var(--color-bg-primary));
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-xl, 20px);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.35),
              0 8px 20px rgba(0, 0, 0, 0.15);
  animation: input-in 0.2s var(--ease-out);
}

@keyframes input-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-8px);
  }
}

.input-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
  text-align: center;
}

.input-description {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  text-align: center;
  margin-bottom: var(--space-4);
}

.input-container {
  margin-bottom: var(--space-6);
}

.input-field {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-family: inherit;
  font-size: 0.95rem;
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  transition: border-color var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
}

.input-field:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-muted);
}

.input-actions {
  display: flex;
  gap: var(--space-3);
  width: 100%;
}

.input-cancel-btn,
.input-ok-btn {
  flex: 1;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-weight: 500;
  font-size: 0.88rem;
  transition: background-color var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out),
              opacity var(--duration-fast);
}

.input-cancel-btn {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.input-ok-btn.danger {
  background: var(--color-danger);
  color: var(--color-text-inverse);
}

.input-ok-btn.accent {
  background: var(--color-accent);
  color: var(--color-text-inverse);
}

.input-ok-btn:disabled {
  opacity: 0.5;
  pointer-events: none;
}

@media (hover: hover) {
  .input-cancel-btn:hover {
    background: var(--color-bg-hover);
  }
  .input-ok-btn.danger:hover:not(:disabled) {
    filter: brightness(1.1);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }
  .input-ok-btn.accent:hover:not(:disabled) {
    filter: brightness(1.1);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }
}

.input-cancel-btn:active,
.input-ok-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.input-ok-btn:focus-visible {
  box-shadow: 0 0 0 3px var(--color-accent-muted);
  outline: none;
}

/* ─── Transition ─── */
.input-dialog-enter-active {
  transition: opacity 0.2s var(--ease-out);
}

.input-dialog-leave-active {
  transition: opacity 0.15s var(--ease-out);
}

.input-dialog-enter-from,
.input-dialog-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .input-panel {
    animation: none;
  }
}
</style>
