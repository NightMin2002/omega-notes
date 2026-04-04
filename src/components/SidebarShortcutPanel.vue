<script setup lang="ts">
import { ref } from 'vue'

const showShortcuts = ref(false)
</script>

<template>
  <button class="shortcuts-toggle" @click="showShortcuts = !showShortcuts">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 8h.001" /><path d="M10 8h.001" /><path d="M14 8h.001" /><path d="M18 8h.001" />
      <path d="M6 12h.001" /><path d="M18 12h.001" />
      <path d="M8 16h8" />
    </svg>
    <span>快捷键</span>
    <svg
      class="chevron"
      :class="{ expanded: showShortcuts }"
      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  </button>

  <Transition name="shortcuts-slide">
    <div v-if="showShortcuts" class="shortcuts-list">
      <div class="shortcut-row">
        <kbd>Ctrl K</kbd><span>搜索笔记</span>
      </div>
      <div class="shortcut-row">
        <kbd>Ctrl Q</kbd><span>快速笔记</span>
      </div>
      <div class="shortcut-row">
        <kbd>Ctrl Enter</kbd><span>保存（快速笔记中）</span>
      </div>
      <div class="shortcut-row">
        <kbd>ESC</kbd><span>关闭弹窗</span>
      </div>
      <div class="shortcut-row">
        <kbd>↑ ↓ Enter</kbd><span>搜索结果导航</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ─── 快捷键折叠 ─── */
.shortcuts-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-tertiary);
  padding: var(--space-1) 0;
  transition: color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .shortcuts-toggle:hover { color: var(--color-text-secondary); }
}

.chevron {
  margin-left: auto;
  transition: transform var(--duration-fast) var(--ease-out);
}

.chevron.expanded { transform: rotate(180deg); }

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2) 0;
}

.shortcut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
}

.shortcut-row kbd {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  background: var(--color-bg-tertiary);
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

/* ─── 快捷键展开动画 ─── */
.shortcuts-slide-enter-active,
.shortcuts-slide-leave-active {
  transition: opacity var(--duration-fast) var(--ease-out),
              max-height var(--duration-fast) var(--ease-out);
  overflow: hidden;
}

.shortcuts-slide-enter-from,
.shortcuts-slide-leave-to {
  opacity: 0;
  max-height: 0;
}

.shortcuts-slide-enter-to,
.shortcuts-slide-leave-from {
  max-height: 200px;
}
</style>
