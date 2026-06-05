<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import AppSidebar from '../components/AppSidebar.vue'
import QuickNote from '../components/QuickNote.vue'
import SearchDialog from '../components/SearchDialog.vue'
import { useAppShortcuts } from '../composables/useAppShortcuts'
import {
  getAppModeOverride,
  isMobileViewport,
  setAppModeOverride,
  toMobilePath,
} from '../composables/useAppMode'

const route = useRoute()
const router = useRouter()
const { matchShortcut } = useAppShortcuts()

const isPopout = computed(() => !!route.meta.popout)

const sidebarCollapsed = ref(false)
const showQuickNote = ref(false)
const showSearch = ref(false)
const showMobileModeButton = ref(false)

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function refreshMobileModeButton() {
  showMobileModeButton.value = isMobileViewport() && getAppModeOverride() === 'desktop'
}

function switchToMobile() {
  setAppModeOverride('mobile')
  router.replace(toMobilePath(route.path))
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if (isPopout.value) return

  if (matchShortcut(e, 'app-search')) {
    e.preventDefault()
    showSearch.value = !showSearch.value
    showQuickNote.value = false
  }

  if (matchShortcut(e, 'app-quick-note')) {
    e.preventDefault()
    showQuickNote.value = !showQuickNote.value
    showSearch.value = false
    return
  }

  if (matchShortcut(e, 'app-go-home')) {
    e.preventDefault()
    router.push('/')
  }
  if (matchShortcut(e, 'app-go-kb')) {
    e.preventDefault()
    router.push('/kb-home')
  }
  if (matchShortcut(e, 'app-go-todos')) {
    e.preventDefault()
    router.push('/todos')
  }
  if (matchShortcut(e, 'app-go-settings')) {
    e.preventDefault()
    router.push('/settings')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('resize', refreshMobileModeButton)
  refreshMobileModeButton()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('resize', refreshMobileModeButton)
})
</script>

<template>
  <AppHeader
    :sidebar-collapsed="sidebarCollapsed"
    @toggle-sidebar="toggleSidebar"
    @open-search="showSearch = true"
    @open-quick-note="showQuickNote = true"
  />

  <div class="app-layout">
    <AppSidebar :collapsed="sidebarCollapsed" @collapse="sidebarCollapsed = true" />

    <main class="app-main" :class="{ expanded: sidebarCollapsed }">
      <RouterView v-slot="{ Component }">
        <Transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
  </div>

  <QuickNote :open="showQuickNote" @close="showQuickNote = false" />
  <SearchDialog :open="showSearch" @close="showSearch = false" />

  <button
    v-if="showMobileModeButton"
    type="button"
    class="mobile-mode-return"
    @click="switchToMobile"
  >
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
    <span>移动端</span>
  </button>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
  height: calc(100vh - var(--header-height));
}

.app-main {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  --app-main-padding: var(--space-6);
  padding: var(--app-main-padding);
  zoom: var(--content-zoom, 1);
  transition: margin-left var(--duration-slow) var(--ease-out);
}

.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.12s var(--ease-out);
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .page-fade-enter-active,
  .page-fade-leave-active {
    transition: none;
  }
}

@media (max-width: 768px) {
  .app-main {
    --app-main-padding: var(--space-4);
  }
}

.mobile-mode-return {
  position: fixed;
  right: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  z-index: var(--z-toast);
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 13px;
  border-radius: 8px;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  box-shadow: 0 12px 28px color-mix(in srgb, var(--color-accent), transparent 62%);
  font-size: 0.84rem;
  font-weight: 800;
}
</style>
