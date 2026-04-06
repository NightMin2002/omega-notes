<script setup lang="ts">
import { themeOptions, type ReadingTheme } from '../composables/useReadingTheme'

defineProps<{
  modelValue: ReadingTheme
  /** 紧凑模式（不显示文字标签） */
  compact?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ReadingTheme]
}>()
</script>

<template>
  <div class="theme-switcher" :class="{ compact }">
    <button
      v-for="opt in themeOptions"
      :key="opt.value"
      class="theme-btn"
      :class="{ active: modelValue === opt.value }"
      @click="emit('update:modelValue', opt.value)"
      :data-tooltip="opt.label"
      data-tooltip-pos="bottom"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path :d="opt.icon" />
      </svg>
      <span v-if="!compact" class="theme-label">{{ opt.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.theme-switcher {
  display: flex;
  gap: var(--space-1);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--space-1);
}

.theme-btn {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  flex-shrink: 0;
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

.theme-btn.active {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  box-shadow: 0 1px 3px var(--color-shadow);
}

@media (hover: hover) {
  .theme-btn:not(.active):hover {
    color: var(--color-text-secondary);
  }
}

.theme-btn:active {
  transform: scale(0.95);
}

.theme-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-accent-muted);
}

/* 紧凑模式 */
.compact .theme-btn {
  padding: 3px 6px;
}

.theme-label {
  font-size: 0.7rem;
}

@media (prefers-reduced-motion: reduce) {
  .theme-btn { transition: none; }
}
</style>
