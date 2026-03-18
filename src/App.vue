<script setup lang="ts">
import AppSidebar from './components/AppSidebar.vue'
import AppHeader from './components/AppHeader.vue'
import { ref } from 'vue'

const sidebarCollapsed = ref(false)

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}
</script>

<template>
  <AppHeader :sidebar-collapsed="sidebarCollapsed" @toggle-sidebar="toggleSidebar" />

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

/* ─── 页面切换过渡 ─── */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity var(--duration-normal) var(--ease-out),
              transform var(--duration-normal) var(--ease-out);
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ─── 响应式 ─── */
@media (max-width: 768px) {
  .app-main {
    padding: var(--space-4);
  }
}
</style>
