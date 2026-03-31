<script setup lang="ts">
/**
 * PopoutTasks — 悬挂任务窗口
 * 精简的每日任务列表，始终置顶
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTasksStore } from '../../stores/tasks'

const store = useTasksStore()

/* 跨窗口同步：使用 store 内置的 syncFromStorage（包含 storage event 监听）
   加一个轮询作为补充（storage event 不在同一窗口触发） */
let syncTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  syncTimer = setInterval(() => store.syncFromStorage(), 2000)
})
onUnmounted(() => { if (syncTimer) clearInterval(syncTimer) })

const progressPercent = computed(() => {
  if (store.totalCount === 0) return 0
  return Math.round((store.completedCount / store.totalCount) * 100)
})

/* 快速添加 */
const quickTitle = ref('')
function quickAdd() {
  if (!quickTitle.value.trim()) return
  store.addTask(quickTitle.value.trim())
  quickTitle.value = ''
}

/* 关闭窗口 */
async function closeWindow() {
  try {
    const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    const win = getCurrentWebviewWindow()
    await win.destroy()
  } catch { /* ignore */ }
}
</script>

<template>
  <div class="popout-shell">
    <!-- 标题栏（拖拽区域） -->
    <header class="popout-header" data-tauri-drag-region>
      <span class="popout-title" data-tauri-drag-region>📋 每日任务</span>
      <div class="popout-header-right">
        <span class="popout-badge">{{ store.completedCount }}/{{ store.totalCount }}</span>
        <button class="popout-close" @click="closeWindow">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </header>

    <!-- 进度条 -->
    <div class="popout-progress">
      <div class="popout-progress-fill" :class="{ complete: progressPercent === 100 }" :style="{ width: progressPercent + '%' }" />
    </div>

    <!-- 任务列表 -->
    <div class="popout-body">
      <div v-if="store.enabledTasks.length === 0" class="popout-empty">
        暂无任务
      </div>
      <div
        v-for="task in store.enabledTasks"
        :key="task.id"
        class="popout-task"
        :class="{ done: store.isCompleted(task.id), skipped: store.isSkipped(task.id) }"
      >
        <label class="popout-check">
          <input
            type="checkbox"
            class="sr-only"
            :checked="store.isCompleted(task.id)"
            @change="store.toggleComplete(task.id)"
          />
          <span class="check-dot" :class="{ checked: store.isCompleted(task.id) }">
            <svg v-if="store.isCompleted(task.id)" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        </label>
        <span class="popout-task-name">{{ task.title }}</span>
        <span v-if="task.category" class="popout-cat">{{ task.category }}</span>
      </div>
    </div>

    <!-- 快速添加 -->
    <div class="popout-footer">
      <input
        v-model="quickTitle"
        class="popout-input"
        placeholder="+ 快速添加任务"
        @keydown.enter="quickAdd"
      />
    </div>
  </div>
</template>

<style scoped>
/* ─── 悬挂窗口通用壳 ─── */
.popout-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  overflow: hidden;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-glass-border);
}

.popout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-divider);
  cursor: move;
  user-select: none;
  -webkit-app-region: drag;
}

.popout-title {
  font-size: 0.82rem;
  font-weight: 600;
}

.popout-badge {
  font-size: 0.72rem;
  font-family: var(--font-mono);
  color: var(--color-text-tertiary);
  background: var(--color-bg-tertiary);
  padding: 1px var(--space-2);
  border-radius: var(--radius-full);
}

.popout-header-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  -webkit-app-region: no-drag;
}

.popout-close {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--color-text-tertiary);
  transition: background-color 150ms var(--ease-out), color 150ms var(--ease-out);
}

@media (hover: hover) {
  .popout-close:hover {
    background: var(--color-danger-muted, rgba(239, 68, 68, 0.15));
    color: var(--color-danger);
  }
}

.popout-progress {
  height: 3px;
  background: var(--color-bg-tertiary);
}

.popout-progress-fill {
  height: 100%;
  background: var(--color-accent);
  transition: width 300ms var(--ease-out);
}

.popout-progress-fill.complete {
  background: var(--color-success);
}

.popout-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2);
}

.popout-empty {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: var(--space-8);
  font-size: 0.82rem;
}

.popout-task {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  transition: background-color 150ms var(--ease-out);
}

@media (hover: hover) {
  .popout-task:hover { background: var(--color-bg-hover); }
}

.popout-task.done .popout-task-name {
  text-decoration: line-through;
  color: var(--color-text-tertiary);
}

.popout-task.skipped .popout-task-name {
  text-decoration: line-through;
  color: var(--color-danger);
  opacity: 0.6;
}

.sr-only { position: absolute; width: 0; height: 0; opacity: 0; }

.popout-check {
  cursor: pointer;
  flex-shrink: 0;
}

.check-dot {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border-strong);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 150ms var(--ease-out), border-color 150ms var(--ease-out);
}

.check-dot.checked {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-text-inverse);
}

.popout-task-name {
  flex: 1;
  font-size: 0.82rem;
  transition: color 150ms var(--ease-out);
}

.popout-cat {
  font-size: 0.6rem;
  color: var(--color-warning);
  background: var(--color-warning-muted, oklch(0.85 0.1 85 / 0.15));
  padding: 0 var(--space-1);
  border-radius: var(--radius-sm);
}

.popout-footer {
  padding: var(--space-2);
  border-top: 1px solid var(--color-divider);
}

.popout-input {
  width: 100%;
  padding: var(--space-1) var(--space-2);
  font-size: 0.78rem;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  outline: none;
  transition: border-color 150ms var(--ease-out), box-shadow 150ms var(--ease-out);
}

.popout-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-muted);
}

.popout-input::placeholder {
  color: var(--color-text-tertiary);
}

@media (prefers-reduced-motion: reduce) {
  .popout-progress-fill,
  .popout-task,
  .check-dot { transition: none; }
}
</style>
