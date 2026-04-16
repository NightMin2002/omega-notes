<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useNotesStore } from '../stores/notes'
import { useTasksStore } from '../stores/tasks'
import { useTodosStore } from '../stores/todos'
import { useUpdaterStore } from '../stores/updater'
import { exportNotesAsJson, importNotesFromFiles } from '../utils/dataio'
import SidebarShortcutPanel from './SidebarShortcutPanel.vue'

const emit = defineEmits<{
  collapseIfMobile: []
}>()

const route = useRoute()
const notesStore = useNotesStore()
const tasksStore = useTasksStore()
const todosStore = useTodosStore()
const updaterStore = useUpdaterStore()

const importMessage = ref('')

async function handleExport() {
  await exportNotesAsJson(notesStore.notes, tasksStore.tasks, tasksStore.records, todosStore.todos)
}

async function handleImport() {
  const data = await importNotesFromFiles()
  if (data.notes.length === 0 && data.tasks.length === 0 && data.todos.length === 0) return

  const parts: string[] = []
  if (data.notes.length > 0) {
    const count = await notesStore.importBatch(data.notes)
    if (count > 0) parts.push(`${count} 条笔记`)
  }
  if (data.tasks.length > 0) {
    const count = tasksStore.importTasks(data.tasks, data.taskRecords)
    if (count > 0) parts.push(`${count} 条任务`)
  }
  if (data.todos.length > 0) {
    const count = todosStore.importTodos(data.todos)
    if (count > 0) parts.push(`${count} 条待办`)
  }

  if (parts.length > 0) {
    importMessage.value = `已导入 ${parts.join('、')}`
    setTimeout(() => { importMessage.value = '' }, 3000)
  }
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

function collapseIfMobile() {
  emit('collapseIfMobile')
}
</script>

<template>
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
      <span v-if="updaterStore.hasUpdate" class="update-dot" aria-label="有新版本可用"></span>
    </RouterLink>

    <!-- 桌面微件 -->
    <div class="io-row popout-row">
      <button class="io-btn popout-btn" @click="openPopout('progress')" data-tooltip="开启桌面微件（倒计时与任务屏）">
        <span class="popout-pulse" aria-hidden="true"></span>
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

    <SidebarShortcutPanel />

    <span class="sidebar-version">Ω Notes v{{ updaterStore.getCurrentVersion() }}</span>
  </div>
</template>

<style scoped>
/* ─── 导航项（设置链接） ─── */
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

/* ─── 更新红点 ─── */
.update-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: oklch(0.65 0.25 25);
  flex-shrink: 0;
  margin-left: auto;
  box-shadow: 0 0 6px 1px oklch(0.65 0.25 25 / 0.5);
  animation: update-pulse 2s ease-in-out infinite;
}

@keyframes update-pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 6px 1px oklch(0.65 0.25 25 / 0.5); }
  50% { opacity: 0.6; box-shadow: 0 0 10px 3px oklch(0.65 0.25 25 / 0.3); }
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

/* ─── 桌面微件按钮特殊样式 ─── */
.popout-btn {
  position: relative;
  background: linear-gradient(135deg, var(--color-accent-muted), var(--color-bg-tertiary));
  border-color: var(--color-accent-muted);
  color: var(--color-accent-text);
  overflow: hidden;
}

@media (hover: hover) {
  .popout-btn:hover {
    background: linear-gradient(135deg, var(--color-accent-muted), var(--color-bg-hover));
    color: var(--color-accent);
    border-color: var(--color-accent);
    box-shadow: 0 0 12px var(--color-accent-muted);
  }
}

.popout-pulse {
  position: absolute;
  top: 50%;
  left: 8px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-accent);
  transform: translateY(-50%);
  animation: popout-blink 2.5s ease-in-out infinite;
}

@keyframes popout-blink {
  0%, 100% { opacity: 0.5; box-shadow: 0 0 0 0 var(--color-accent-muted); }
  50% { opacity: 1; box-shadow: 0 0 6px 2px var(--color-accent-muted); }
}

.import-msg {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--color-success, #48bb78);
  padding: var(--space-1) 0;
}

/* ─── 导入消息动画 ─── */
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
</style>
