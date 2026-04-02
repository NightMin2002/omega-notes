<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import CategoryPicker from './CategoryPicker.vue'

const props = defineProps<{
  open: boolean
  title?: string
  initialCategory?: string
}>()

const emit = defineEmits<{
  confirm: [category: string]
  cancel: []
}>()

const selectedCat = ref('')

watch(() => props.open, (val) => {
  if (val) {
    selectedCat.value = props.initialCategory || ''
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
  const v = selectedCat.value.trim()
  if (v) {
    emit('confirm', v)
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="cat-dialog">
      <div
        v-if="open"
        class="cat-dialog-overlay"
        @click.self="emit('cancel')"
        @keydown="handleKeydown"
      >
        <div class="cat-dialog-panel" role="dialog" aria-modal="true" :aria-label="title || '选择分类'">
          <h3 class="cat-dialog-title">{{ title || '移动到分类' }}</h3>
          
          <div class="cat-dialog-content">
            <CategoryPicker v-model="selectedCat" />
          </div>

          <div class="cat-dialog-actions">
            <button class="cat-dialog-cancel-btn" @click="emit('cancel')">取消</button>
            <button
              class="cat-dialog-ok-btn"
              :disabled="!selectedCat"
              @click="handleConfirm"
            >确认</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cat-dialog-overlay {
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

.cat-dialog-panel {
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
  animation: cat-dialog-in 0.2s var(--ease-out);
}

@keyframes cat-dialog-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-8px);
  }
}

.cat-dialog-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-4);
  text-align: center;
}

.cat-dialog-content {
  margin-bottom: var(--space-6);
  /* 确保 CategoryPicker 的 fixed dropdown 定位准确 */
  position: relative;
}

.cat-dialog-actions {
  display: flex;
  gap: var(--space-3);
  width: 100%;
}

.cat-dialog-cancel-btn,
.cat-dialog-ok-btn {
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

.cat-dialog-cancel-btn {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.cat-dialog-ok-btn {
  background: var(--color-accent);
  color: var(--color-text-inverse);
}

.cat-dialog-ok-btn:disabled {
  opacity: 0.5;
  pointer-events: none;
}

@media (hover: hover) {
  .cat-dialog-cancel-btn:hover {
    background: var(--color-bg-hover);
  }
  .cat-dialog-ok-btn:hover:not(:disabled) {
    filter: brightness(1.1);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }
}

.cat-dialog-cancel-btn:active,
.cat-dialog-ok-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.cat-dialog-ok-btn:focus-visible {
  box-shadow: 0 0 0 3px var(--color-accent-muted);
  outline: none;
}

/* ─── Transition ─── */
.cat-dialog-enter-active {
  transition: opacity 0.2s var(--ease-out);
}

.cat-dialog-leave-active {
  transition: opacity 0.15s var(--ease-out);
}

.cat-dialog-enter-from,
.cat-dialog-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .cat-dialog-panel {
    animation: none;
  }
}
</style>
