<script setup lang="ts">
import { ref } from 'vue'
import ShortcutManagerDialog from './ShortcutManagerDialog.vue'

const showShortcuts = ref(false)
</script>

<template>
  <button class="shortcuts-toggle" @click="showShortcuts = true" title="快捷键管理">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 8h.001" /><path d="M10 8h.001" /><path d="M14 8h.001" /><path d="M18 8h.001" />
      <path d="M6 12h.001" /><path d="M18 12h.001" />
      <path d="M8 16h8" />
    </svg>
    <span>自定义快捷键</span>
  </button>

  <Teleport to="body">
    <ShortcutManagerDialog 
      :open="showShortcuts" 
      @close="showShortcuts = false" 
    />
  </Teleport>
</template>

<style scoped>
/* ─── 快捷键设置入口 ─── */
.shortcuts-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-tertiary);
  padding: var(--space-2) var(--space-3);
  margin-top: var(--space-1);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  appearance: none;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .shortcuts-toggle:hover { 
    color: var(--color-text-primary); 
    background: var(--color-bg-tertiary);
    border-color: var(--color-text-tertiary);
  }
}
</style>
