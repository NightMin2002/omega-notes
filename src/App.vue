<script setup lang="ts">
import AppSidebar from './components/AppSidebar.vue'
import AppHeader from './components/AppHeader.vue'
import QuickNote from './components/QuickNote.vue'
import AppToast from './components/AppToast.vue'
import SearchDialog from './components/SearchDialog.vue'
import { useTasksStore } from './stores/tasks'
import { ref, onMounted, onUnmounted, provide } from 'vue'
import { toastKey } from './utils/inject-keys'

const sidebarCollapsed = ref(false)
const showQuickNote = ref(false)
const showSearch = ref(false)
const toastRef = ref<InstanceType<typeof AppToast>>()

function showToast(title: string, body: string, type: 'info' | 'success' | 'warning' = 'info', duration = 5000) {
  toastRef.value?.push(title, body, type, duration)
}

provide(toastKey, showToast)

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function handleGlobalKeydown(e: KeyboardEvent) {
  /* Ctrl+K → 搜索 */
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    showSearch.value = !showSearch.value
    showQuickNote.value = false
  }
  /* Ctrl+Q → 快速笔记 */
  if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
    e.preventDefault()
    showQuickNote.value = !showQuickNote.value
    showSearch.value = false
  }
}


onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
  // 注册应用内 Toast 到 tasks store
  const tasksStore = useTasksStore()
  tasksStore.registerToast(showToast)
})
onUnmounted(() => window.removeEventListener('keydown', handleGlobalKeydown))
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

  <!-- 全局弹窗 -->
  <QuickNote :open="showQuickNote" @close="showQuickNote = false" />
  <SearchDialog :open="showSearch" @close="showSearch = false" />
  <AppToast ref="toastRef" />
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
  padding: var(--space-6);
  transition: margin-left var(--duration-slow) var(--ease-out);
}

/* ─── 页面切换过渡（桌面风：快速、微缩放，避免网页感） ─── */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.15s var(--ease-out),
              transform 0.15s var(--ease-out);
}

.page-fade-enter-from {
  opacity: 0;
  transform: scale(0.99) translateY(4px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: scale(0.99) translateY(-2px);
}

@media (prefers-reduced-motion: reduce) {
  .page-fade-enter-active,
  .page-fade-leave-active {
    transition: none;
  }
}

/* ─── 响应式 ─── */
@media (max-width: 768px) {
  .app-main {
    padding: var(--space-4);
  }
}
</style>
