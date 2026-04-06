<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '../stores/theme'
import { useShortcutsStore } from '../stores/shortcuts'
import { useAppShortcuts } from '../composables/useAppShortcuts'

defineProps<{
  sidebarCollapsed: boolean
}>()

const emit = defineEmits<{
  toggleSidebar: []
  openSearch: []
  openQuickNote: []
}>()

const themeStore = useThemeStore()
const shortcutsStore = useShortcutsStore()
const { formatKeysForDisplay } = useAppShortcuts()

const searchKeys = computed(() => {
  const sc = shortcutsStore.getShortcut('app-search')
  return (sc && sc.enabled) ? formatKeysForDisplay(sc.currentKeys).replace(/ \+ /g, ' ') : ''
})

const quickNoteKeys = computed(() => {
  const sc = shortcutsStore.getShortcut('app-quick-note')
  return (sc && sc.enabled) ? ` ${formatKeysForDisplay(sc.currentKeys).replace(/ \+ /g, '+')}` : ''
})
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <button class="header-btn" aria-label="切换导航侧栏" @click="emit('toggleSidebar')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-toggle-icon" :class="{ collapsed: sidebarCollapsed }" style="overflow: visible">
          <line class="bar bar-top" x1="3" y1="6" x2="21" y2="6" />
          <line class="bar bar-mid" x1="3" y1="12" x2="21" y2="12" />
          <line class="bar bar-bot" x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <h1 class="app-title">
        <RouterLink to="/" class="title-link">Ω Notes</RouterLink>
      </h1>
    </div>

    <div class="header-right">
      <!-- 搜索按钮 -->
      <button class="header-btn search-trigger" aria-label="搜索笔记" @click="emit('openSearch')">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span class="search-trigger-label">搜索</span>
        <kbd v-if="searchKeys" class="search-trigger-kbd">{{ searchKeys }}</kbd>
      </button>

      <!-- 快速笔记按钮 -->
      <button class="header-btn" aria-label="快速笔记" @click="emit('openQuickNote')" :data-tooltip="`快速笔记${quickNoteKeys}`" data-tooltip-pos="bottom">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <!-- 主题切换 -->
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
  overflow: visible;
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .header-btn:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
}

/* ─── 搜索触发按钮 ─── */
.search-trigger {
  width: auto;
  gap: var(--space-2);
  padding: 0 var(--space-3);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
}

.search-trigger-label {
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
}

.search-trigger-kbd {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid var(--color-border);
}

@media (max-width: 640px) {
  .search-trigger-label,
  .search-trigger-kbd { display: none; }
  .search-trigger {
    width: 36px;
    padding: 0;
    justify-content: center;
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
/* ─── 侧边栏切换图标动画（☰ ↔ ×） ─── */
.sidebar-toggle-icon .bar {
  transition: transform var(--duration-normal) var(--ease-out),
              opacity var(--duration-fast) var(--ease-out);
}
.sidebar-toggle-icon .bar-top { transform-origin: 12px 6px; }
.sidebar-toggle-icon .bar-mid { transform-origin: 12px 12px; }
.sidebar-toggle-icon .bar-bot { transform-origin: 12px 18px; }

.sidebar-toggle-icon:not(.collapsed) .bar-top {
  transform: translateY(6px) rotate(45deg);
}

.sidebar-toggle-icon:not(.collapsed) .bar-mid {
  opacity: 0;
}

.sidebar-toggle-icon:not(.collapsed) .bar-bot {
  transform: translateY(-6px) rotate(-45deg);
}
</style>
