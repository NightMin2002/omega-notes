<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useNotesStore } from '../stores/notes'
import SidebarFolderTree from './SidebarFolderTree.vue'
import SidebarFooter from './SidebarFooter.vue'

defineProps<{
  collapsed: boolean
}>()

const emit = defineEmits<{
  collapse: []
}>()

const route = useRoute()
const notesStore = useNotesStore()

const inboxCount = computed(() =>
  notesStore.notes.filter(n => n.category === '收件箱').length
)

const favoriteCount = computed(() => notesStore.favoriteCount)
const recentCount = computed(() => notesStore.recentNotes.length)

function collapseIfMobile() {
  if (window.innerWidth <= 768) {
    emit('collapse')
  }
}
</script>

<template>
    <aside class="sidebar" :class="{ collapsed }">
      <nav class="sidebar-nav">
        <!-- 主导航 -->
        <div class="nav-section-label">导航</div>

        <RouterLink
          to="/"
          class="nav-item"
          :class="{ active: route.path === '/' }"
          @click="collapseIfMobile"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span class="nav-label">主页</span>
        </RouterLink>

        <RouterLink
          to="/notes"
          class="nav-item"
          :class="{ active: route.path === '/notes' }"
          @click="collapseIfMobile"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span class="nav-label">知识库</span>
        </RouterLink>

        <RouterLink
          to="/write"
          class="nav-item"
          :class="{ active: route.path === '/write' }"
          @click="collapseIfMobile"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span class="nav-label">新建笔记</span>
        </RouterLink>

        <!-- 收藏与收集 -->
        <div class="nav-divider" />
        <div class="nav-section-label">收藏与收集</div>

        <RouterLink
          to="/notes?view=favorites"
          class="nav-item"
          :class="{ active: route.fullPath.includes('view=favorites') }"
          @click="collapseIfMobile"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span class="nav-label">收藏夹</span>
          <span v-if="favoriteCount > 0" class="nav-badge fav">{{ favoriteCount }}</span>
        </RouterLink>

        <RouterLink
          to="/notes?view=recent"
          class="nav-item"
          :class="{ active: route.fullPath.includes('view=recent') }"
          @click="collapseIfMobile"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span class="nav-label">最近打开</span>
          <span v-if="recentCount > 0" class="nav-badge subtle">{{ recentCount }}</span>
        </RouterLink>

        <RouterLink
          to="/notes?category=收件箱"
          class="nav-item"
          :class="{ active: route.fullPath.includes('category=收件箱') }"
          @click="collapseIfMobile"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
          </svg>
          <span class="nav-label">收件箱</span>
          <span v-if="inboxCount > 0" class="nav-badge">{{ inboxCount }}</span>
        </RouterLink>

        <RouterLink
          to="/trash"
          class="nav-item"
          :class="{ active: route.path === '/trash' }"
          @click="collapseIfMobile"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          <span class="nav-label">回收站</span>
          <span v-if="notesStore.trashCount > 0" class="nav-badge subtle">{{ notesStore.trashCount }}</span>
        </RouterLink>

        <!-- 日常管理 -->
        <div class="nav-divider" />
        <div class="nav-section-label">效率工具</div>

        <RouterLink
          to="/tasks"
          class="nav-item"
          :class="{ active: route.path === '/tasks' }"
          @click="collapseIfMobile"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          <span class="nav-label">日常管理</span>
        </RouterLink>

        <!-- 文件夹树 -->
        <SidebarFolderTree @collapse-if-mobile="collapseIfMobile" />
      </nav>

      <!-- 底部 -->
      <SidebarFooter @collapse-if-mobile="collapseIfMobile" />
    </aside>

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
  min-width: 0;
  height: 100%;
  background: var(--color-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-right: 1px solid var(--color-glass-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  z-index: var(--z-overlay);
  overflow: hidden;
  transition: width var(--duration-slow) var(--ease-out),
              border-color var(--duration-slow) var(--ease-out);
}

.sidebar.collapsed {
  width: 0;
  border-right-color: transparent;
}

.sidebar-nav {
  flex: 1;
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  overflow-y: auto;
}

/* ─── 分区标签 ─── */
.nav-section-label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-tertiary);
  padding: var(--space-2) var(--space-3) var(--space-1);
}

.nav-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-divider) 20%, var(--color-divider) 80%, transparent);
  margin: var(--space-2) var(--space-3);
}

/* ─── 导航项 ─── */
.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  position: relative;
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              translate var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .nav-item:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
    translate: 2px 0;
  }
}

.nav-item.active {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

/* 活跃指示条 */
.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 16px;
  border-radius: 0 var(--radius-full) var(--radius-full) 0;
  background: var(--color-accent);
}

.nav-label {
  white-space: nowrap;
  flex: 1;
}

/* ─── 收件箱数字 ─── */
.nav-badge {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.nav-badge.fav {
  background: var(--color-warning, #e6a817);
}

.nav-badge.subtle {
  background: var(--color-text-tertiary);
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
