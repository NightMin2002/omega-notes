<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { setAppModeOverride, toDesktopPath } from '../composables/useAppMode'

type MobileNavItem = {
  to: string
  label: string
  icon: 'notes' | 'write' | 'trash' | 'settings'
}

const route = useRoute()
const router = useRouter()

const title = computed(() => (route.meta.title as string) || 'Ω Notes')
const showShellHeader = computed(() => !route.meta.mobilePageHeader)
const showBottomNav = computed(() => !route.meta.mobileHideNav)

const navItems: MobileNavItem[] = [
  { to: '/m/notes', label: '笔记', icon: 'notes' },
  { to: '/m/write', label: '新建', icon: 'write' },
  { to: '/m/trash', label: '回收站', icon: 'trash' },
  { to: '/m/settings', label: '设置', icon: 'settings' },
]

function switchToDesktop() {
  setAppModeOverride('desktop')
  router.replace(toDesktopPath(route.path))
}
</script>

<template>
  <div class="mobile-shell" :class="{ 'without-nav': !showBottomNav }">
    <header v-if="showShellHeader" class="mobile-shell-header">
      <div class="mobile-brand">
        <span class="mobile-brand-mark">Ω</span>
        <span class="mobile-title">{{ title }}</span>
      </div>

      <button class="mobile-header-action" type="button" @click="switchToDesktop" aria-label="切换桌面模式">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M8 21h8" />
          <path d="M12 17v4" />
        </svg>
      </button>
    </header>

    <main class="mobile-shell-main">
      <RouterView v-slot="{ Component }">
        <Transition name="mobile-page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <nav v-if="showBottomNav" class="mobile-bottom-nav" aria-label="移动端主导航">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="mobile-nav-item"
        :class="{ active: route.path === item.to || (item.to === '/m/notes' && route.path.startsWith('/m/note/')) }"
      >
        <svg v-if="item.icon === 'notes'" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14.5" />
          <path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20" />
          <path d="M8 7h8" />
          <path d="M8 11h8" />
          <path d="M8 15h5" />
        </svg>
        <svg v-else-if="item.icon === 'write'" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        <svg v-else-if="item.icon === 'trash'" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
        <svg v-else width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.4 1.08V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8.6 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.08-.4H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .4-1.08V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15.4 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.36.2.64.5.8.86.16.36.24.75.2 1.14a1.65 1.65 0 0 0 .6 1h.09a2 2 0 1 1 0 4H21a1.65 1.65 0 0 0-1.6 1Z" />
        </svg>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.mobile-shell {
  min-height: 100dvh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--color-bg-primary), var(--color-bg-secondary) 22%) 0%, var(--color-bg-primary) 42%),
    var(--color-bg-primary);
  color: var(--color-text-primary);
}

.mobile-shell-header {
  height: calc(54px + env(safe-area-inset-top, 0px));
  padding: env(safe-area-inset-top, 0px) 14px 0;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-divider);
  background: var(--color-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  position: relative;
  z-index: var(--z-sticky);
}

.mobile-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.mobile-brand-mark {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--color-accent-muted);
  color: var(--color-accent-text);
  font-weight: 800;
  font-size: 1rem;
  flex-shrink: 0;
}

.mobile-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-header-action {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-button);
  background: var(--color-bg-secondary);
  flex-shrink: 0;
}

.mobile-shell-main {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px));
}

.mobile-shell.without-nav .mobile-shell-main {
  padding-bottom: 0;
}

.mobile-bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: calc(66px + env(safe-area-inset-bottom, 0px));
  padding: 6px 10px env(safe-area-inset-bottom, 0px);
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  border-top: 1px solid var(--color-divider);
  background: color-mix(in srgb, var(--color-bg-secondary), transparent 4%);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  z-index: var(--z-sticky);
}

.mobile-nav-item {
  min-width: 0;
  height: 54px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border-radius: 8px;
  color: var(--color-text-tertiary);
  font-size: 0.7rem;
  font-weight: 600;
  text-decoration: none;
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

.mobile-nav-item.active {
  color: var(--color-accent-text);
  background: var(--color-accent-muted);
}

.mobile-nav-item span {
  line-height: 1;
}

.mobile-page-enter-active,
.mobile-page-leave-active {
  transition: opacity 0.12s var(--ease-out);
}

.mobile-page-enter-from,
.mobile-page-leave-to {
  opacity: 0;
}
</style>
