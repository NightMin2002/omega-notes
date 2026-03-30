<script setup lang="ts">
/**
 * DraftToast — 草稿恢复提示
 * 轻量 Toast，3秒自动消失
 */
import { ref, watch } from 'vue'

const props = defineProps<{
  show: boolean
  message?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const visible = ref(false)
let hideTimer: ReturnType<typeof setTimeout> | null = null

watch(() => props.show, (val) => {
  if (val) {
    visible.value = true
    if (hideTimer) clearTimeout(hideTimer)
    hideTimer = setTimeout(() => {
      visible.value = false
      emit('close')
    }, 3000)
  } else {
    visible.value = false
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="toast-slide">
      <div v-if="visible" class="draft-toast" @click="emit('close')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span>{{ message || '已恢复上次未保存的草稿' }}</span>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.draft-toast {
  position: fixed;
  bottom: var(--space-6);
  left: 50%;
  transform: translateX(-50%);
  z-index: var(--z-toast, 9999);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--color-bg-elevated, var(--color-bg-primary));
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-full);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--color-accent);
  cursor: pointer;
  white-space: nowrap;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: opacity var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .draft-toast:hover {
    opacity: 0.85;
  }
}

.toast-slide-enter-active {
  transition: opacity 0.25s var(--ease-out), transform 0.25s var(--ease-out);
}
.toast-slide-leave-active {
  transition: opacity 0.2s var(--ease-out), transform 0.2s var(--ease-out);
}
.toast-slide-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}
.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}

@media (prefers-reduced-motion: reduce) {
  .toast-slide-enter-active,
  .toast-slide-leave-active {
    transition: none;
  }
}
</style>
