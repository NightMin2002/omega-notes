<script setup lang="ts">
import AppSidebar from './components/AppSidebar.vue'
import AppHeader from './components/AppHeader.vue'
import QuickNote from './components/QuickNote.vue'
import SearchDialog from './components/SearchDialog.vue'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

/** popout 窗口（悬挂/悬浮球）不渲染主布局 */
const isPopout = computed(() => !!route.meta.popout)

const sidebarCollapsed = ref(false)
const showQuickNote = ref(false)
const showSearch = ref(false)

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if (isPopout.value) return
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


onMounted(() => window.addEventListener('keydown', handleGlobalKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleGlobalKeydown))
</script>

<template>
  <!-- 悬挂窗口：纯净渲染，无侧边栏/顶栏 -->
  <RouterView v-if="isPopout" />

  <!-- 主窗口：完整布局 -->
  <template v-else>
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
  </template>
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

/* ─── 页面切换过渡（纯 opacity，避免 transform 干扰拖拽定位） ─── */
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

/* ─── 响应式 ─── */
@media (max-width: 768px) {
  .app-main {
    --app-main-padding: var(--space-4);
  }
}
</style>
