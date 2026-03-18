<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useNotesStore } from '../stores/notes'

defineProps<{
  collapsed: boolean
}>()

const emit = defineEmits<{
  collapse: []
}>()

const route = useRoute()
const notesStore = useNotesStore()
const showShortcuts = ref(false)

const inboxCount = computed(() =>
  notesStore.notes.filter(n => n.category === '收件箱').length
)

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

        <!-- 收件箱 -->
        <div class="nav-divider" />
        <div class="nav-section-label">快速收集</div>

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
      </nav>

      <!-- 底部：快捷键 + 版本 -->
      <div class="sidebar-footer">
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

        <span class="sidebar-version">Ω Notes v2.0.0</span>
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
  background: var(--color-divider);
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
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
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

/* ─── 底部 ─── */
.sidebar-footer {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-divider);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.sidebar-version {
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
}

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
