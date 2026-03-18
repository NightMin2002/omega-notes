<script setup lang="ts">
import { useThemeStore } from '../stores/theme'

defineProps<{
  sidebarCollapsed: boolean
}>()

const emit = defineEmits<{
  toggleSidebar: []
}>()

const themeStore = useThemeStore()
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <button class="header-btn" aria-label="切换导航侧栏" @click="emit('toggleSidebar')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <template v-if="sidebarCollapsed">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </template>
          <template v-else>
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </template>
        </svg>
      </button>
      <h1 class="app-title">
        <RouterLink to="/" class="title-link">Ω Notes</RouterLink>
      </h1>
    </div>

    <div class="header-right">
      <button class="header-btn theme-btn" aria-label="切换主题" @click="themeStore.toggle()">
        <Transition name="icon-swap" mode="out-in">
          <svg v-if="themeStore.theme === 'dark'" key="moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <svg v-else key="sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        </Transition>
      </button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  background: var(--color-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--color-glass-border);
  z-index: var(--z-sticky);
  flex-shrink: 0;
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.app-title {
  font-size: clamp(1rem, 2.5vw, 1.25rem);
  font-weight: 600;
  letter-spacing: -0.02em;
}

.title-link {
  color: var(--color-text-primary);
  transition: color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .title-link:hover {
    color: var(--color-accent);
  }
}

.header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .header-btn:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
}

/* ─── 图标切换动画 ─── */
.icon-swap-enter-active,
.icon-swap-leave-active {
  transition: opacity var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
}

.icon-swap-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.8);
}

.icon-swap-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.8);
}
</style>
