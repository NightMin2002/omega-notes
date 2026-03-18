<script setup lang="ts">
import { useRoute } from 'vue-router'

defineProps<{
  collapsed: boolean
}>()

const emit = defineEmits<{
  collapse: []
}>()

const route = useRoute()

const navItems = [
  { path: '/', name: '主页', icon: 'home' },
  { path: '/notes', name: '知识库', icon: 'book' },
  { path: '/write', name: '新建笔记', icon: 'edit' },
]

function collapseIfMobile() {
  if (window.innerWidth <= 768) {
    emit('collapse')
  }
}
</script>

<template>
  <Transition name="sidebar-slide">
    <aside v-show="!collapsed" class="sidebar">
      <nav class="sidebar-nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: route.path === item.path }"
          @click="collapseIfMobile"
        >
          <!-- Home -->
          <svg v-if="item.icon === 'home'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <!-- Book -->
          <svg v-else-if="item.icon === 'book'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <!-- Edit -->
          <svg v-else-if="item.icon === 'edit'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>

          <span class="nav-label">{{ item.name }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <span class="sidebar-version">v2.0.0</span>
      </div>
    </aside>
  </Transition>

  <!-- 移动端遮罩 -->
  <Transition name="overlay-fade">
    <div
      v-if="!collapsed"
      class="sidebar-overlay"
      @click="emit('collapse')"
    />
  </Transition>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  height: 100%;
  background: var(--color-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-right: 1px solid var(--color-glass-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  z-index: var(--z-overlay);
}

.sidebar-nav {
  flex: 1;
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .nav-item:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
}

.nav-item.active {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

.nav-label {
  white-space: nowrap;
}

.sidebar-footer {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-divider);
}

.sidebar-version {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

/* ─── 侧边栏过渡 ─── */
.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
  transition: transform var(--duration-slow) var(--ease-out),
              opacity var(--duration-slow) var(--ease-out);
}

.sidebar-slide-enter-from,
.sidebar-slide-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

/* ─── 移动端遮罩 ─── */
.sidebar-overlay {
  display: none;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: var(--header-height);
    left: 0;
    height: calc(100vh - var(--header-height));
    z-index: var(--z-overlay);
  }

  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    top: var(--header-height);
    background: rgba(0, 0, 0, 0.5);
    z-index: calc(var(--z-overlay) - 1);
  }

  .overlay-fade-enter-active,
  .overlay-fade-leave-active {
    transition: opacity var(--duration-normal) var(--ease-out);
  }

  .overlay-fade-enter-from,
  .overlay-fade-leave-to {
    opacity: 0;
  }
}
</style>
