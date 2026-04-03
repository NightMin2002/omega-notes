<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotesStore } from '../stores/notes'
import { useTasksStore } from '../stores/tasks'
import { exportNotesAsJson, importNotesFromFiles } from '../utils/dataio'
import ContextMenu from './ContextMenu.vue'
import type { ContextMenuItem } from './ContextMenu.vue'
import InputDialog from './InputDialog.vue'

defineProps<{
  collapsed: boolean
}>()

const emit = defineEmits<{
  collapse: []
}>()

const route = useRoute()
const router = useRouter()
const notesStore = useNotesStore()
const tasksStore = useTasksStore()
const showShortcuts = ref(false)

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

async function handleExport() {
  await exportNotesAsJson(notesStore.notes, tasksStore.tasks, tasksStore.records)
}

async function handleImport() {
  const data = await importNotesFromFiles()
  if (data.notes.length === 0 && data.tasks.length === 0) return

  const parts: string[] = []
  if (data.notes.length > 0) {
    const count = await notesStore.importBatch(data.notes)
    if (count > 0) parts.push(`${count} 条笔记`)
  }
  if (data.tasks.length > 0) {
    const count = tasksStore.importTasks(data.tasks, data.taskRecords)
    if (count > 0) parts.push(`${count} 条任务`)
  }

  if (parts.length > 0) {
    importMessage.value = `已导入 ${parts.join('、')}`
    setTimeout(() => { importMessage.value = '' }, 3000)
  }
}

const importMessage = ref('')

/* 文件夹展开状态 */
const expandedFolders = ref(new Set<string>())
const showFolders = ref(true)

function toggleFolder(path: string) {
  const s = expandedFolders.value
  if (s.has(path)) {
    s.delete(path)
  } else {
    s.add(path)
  }
}

interface FlatFolder {
  name: string
  fullPath: string
  depth: number
  count: number
  totalCount: number
  hasChildren: boolean
  expanded: boolean
}

/** 将树展平为带缩进的数组（仅展开节点的子级可见） */
const flatFolders = computed<FlatFolder[]>(() => {
  const result: FlatFolder[] = []
  function walk(nodes: any[], depth: number) {
    for (const node of nodes) {
      const expanded = expandedFolders.value.has(node.fullPath)
      result.push({
        name: node.name,
        fullPath: node.fullPath,
        depth,
        count: node.count,
        totalCount: node.totalCount,
        hasChildren: node.children.length > 0,
        expanded,
      })
      if (expanded && node.children.length > 0) {
        walk(node.children, depth + 1)
      }
    }
  }
  walk(notesStore.categoryTree, 0)
  return result
})

function navigateFolder(path: string) {
  collapseIfMobile()
  router.push({ path: '/notes', query: { category: path } })
}

/* ─── 悬挂窗口 ─── */
async function openPopout(kind: string) {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('open_popout', { kind })
  } catch {
    // 浏览器环境不支持
  }
}

/* ─── 右键菜单 ─── */
const showContextMenu = ref(false)
const contextMenuPos = ref({ x: 0, y: 0 })
const contextMenuTarget = ref('')

const contextMenuItems = computed<ContextMenuItem[]>(() => {
  const target = contextMenuTarget.value
  if (!target) return []
  return [
    { id: 'new-note', label: '新建笔记到此分类' },
    { id: 'new-sub', label: '新建子分类' },
    { id: 'divider-1', label: '', divider: true },
    { id: 'delete', label: '删除分类', danger: true },
  ]
})

function handleFolderContextMenu(e: MouseEvent, folderPath: string) {
  contextMenuTarget.value = folderPath
  contextMenuPos.value = { x: e.clientX, y: e.clientY }
  showContextMenu.value = true
}

const showInputDialog = ref(false)
const inputDialogTitle = ref('')

async function handleContextMenuSelect(id: string) {
  const target = contextMenuTarget.value
  if (!target) return

  if (id === 'new-note') {
    const note = await notesStore.addNote({
      title: '',
      content: '',
      category: target,
    })
    router.push(`/note/${note.id}?edit=1`)
  } else if (id === 'new-sub') {
    inputDialogTitle.value = `在 "${target.split('/').pop()}" 下新建子分类`
    showInputDialog.value = true
  } else if (id === 'delete') {
    await notesStore.deleteCategory(target)
    // 如果当前正在查看该分类，跳回全部笔记
    if (route.query.category === target) {
      router.push('/notes')
    }
  }
}

function handleInputConfirm(val: string) {
  const target = contextMenuTarget.value
  showInputDialog.value = false
  if (target && val) {
    notesStore.addCustomCategory(`${target}/${val}`)
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
        <template v-if="flatFolders.length > 0">
          <div class="nav-divider" />
          <button class="nav-section-label folder-toggle" @click="showFolders = !showFolders">
            文件夹
            <svg
              class="chevron-sm"
              :class="{ expanded: showFolders }"
              width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <template v-if="showFolders">
            <button
              v-for="f in flatFolders"
              :key="f.fullPath"
              class="folder-item"
              :class="{ active: route.query.category === f.fullPath }"
              :style="{ paddingLeft: `calc(var(--space-3) + ${f.depth * 16}px)` }"
              @click="navigateFolder(f.fullPath)"
              @contextmenu.prevent="handleFolderContextMenu($event, f.fullPath)"
            >
              <button
                v-if="f.hasChildren"
                class="folder-chevron"
                @click.stop="toggleFolder(f.fullPath)"
              >
                <svg
                  :class="{ expanded: f.expanded }"
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                >
                  <polyline points="9 6 15 12 9 18" />
                </svg>
              </button>
              <svg v-else class="folder-icon-spacer" width="12" height="12" />
              <svg class="folder-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span class="folder-name">{{ f.name }}</span>
              <span class="folder-count">{{ f.totalCount }}</span>
            </button>
          </template>

          <ContextMenu
            v-model:show="showContextMenu"
            :position="contextMenuPos"
            :items="contextMenuItems"
            @select="handleContextMenuSelect"
          />

          <InputDialog
            :open="showInputDialog"
            :title="inputDialogTitle"
            placeholder="输入子分类名称..."
            @confirm="handleInputConfirm"
            @cancel="showInputDialog = false"
          />
        </template>
      </nav>

      <!-- 底部 -->
      <div class="sidebar-footer">
        <RouterLink
          to="/settings"
          class="nav-item settings-link"
          :class="{ active: route.path === '/settings' }"
          @click="collapseIfMobile"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span class="nav-label">设置</span>
        </RouterLink>

        <!-- 桌面微件 -->
        <div class="io-row popout-row">
          <button class="io-btn popout-btn" @click="openPopout('progress')" data-tooltip="开启桌面微件（倒计时与任务屏）">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>桌面微件</span>
          </button>
        </div>

        <!-- 导入/导出 -->
        <div class="io-row">
          <button class="io-btn" @click="handleExport">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>导出</span>
          </button>
          <button class="io-btn" @click="handleImport">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>导入</span>
          </button>
        </div>
        <Transition name="shortcuts-slide">
          <div v-if="importMessage" class="import-msg">{{ importMessage }}</div>
        </Transition>
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

/* ─── 文件夹树 ─── */
.folder-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  cursor: pointer;
  transition: color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .folder-toggle:hover { color: var(--color-text-secondary); }
}

.chevron-sm {
  margin-left: auto;
  transition: transform var(--duration-fast) var(--ease-out);
}

.chevron-sm.expanded { transform: rotate(180deg); }

.folder-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
  text-align: left;
  min-height: 28px;
}

@media (hover: hover) {
  .folder-item:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
}

.folder-item.active {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

.folder-item.folder-drop-target {
  background: var(--color-accent-muted);
  color: var(--color-accent);
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}

.folder-chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  padding: 0;
  flex-shrink: 0;
  color: var(--color-text-tertiary);
  transition: color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .folder-chevron:hover { color: var(--color-text-primary); }
}

.folder-chevron svg {
  transition: transform var(--duration-fast) var(--ease-out);
}

.folder-chevron svg.expanded {
  transform: rotate(90deg);
}

.folder-icon-spacer {
  flex-shrink: 0;
  width: 14px;
}

.folder-icon {
  flex-shrink: 0;
  opacity: 0.6;
}

.folder-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.folder-count {
  font-size: 0.65rem;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
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

/* ─── 底部 ─── */
.sidebar-footer {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-divider);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.settings-link {
  font-size: 0.82rem;
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-1);
}

.sidebar-version {
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
}

/* ─── 导入/导出 ─── */
.io-row {
  display: flex;
  gap: var(--space-2);
}

.io-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--color-text-tertiary);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-1) var(--space-2);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .io-btn:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-secondary);
  }
}

.io-btn:active {
  transform: scale(0.98);
}

.import-msg {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--color-success, #48bb78);
  padding: var(--space-1) 0;
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
