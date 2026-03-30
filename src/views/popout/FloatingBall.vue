<script setup lang="ts">
/**
 * FloatingBall — 桌面悬浮球
 * 收起时为 Ω 圆形图标，点击展开快捷面板
 * 透明无边框窗口，始终置顶
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useTasksStore } from '../../stores/tasks'
import { useNotesStore } from '../../stores/notes'

const tasksStore = useTasksStore()
const notesStore = useNotesStore()
const expanded = ref(false)

/* 快速笔记 */
const quickText = ref('')

function toggle() {
  expanded.value = !expanded.value
  // 动态调整窗口大小
  if (expanded.value) {
    invoke('resize_popout', { label: 'floating-ball', w: 280, h: 420 })
  } else {
    invoke('resize_popout', { label: 'floating-ball', w: 64, h: 64 })
  }
}

function saveQuickNote() {
  if (!quickText.value.trim()) return
  notesStore.addNote({
    title: quickText.value.trim().slice(0, 30),
    content: quickText.value.trim(),
    category: '收件箱',
    tags: [],
  })
  quickText.value = ''
}

async function openPopout(kind: string) {
  await invoke('open_popout', { kind })
}

async function showMainWindow() {
  try {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    const main = await WebviewWindow.getByLabel('main')
    if (main) {
      await main.show()
      await main.unminimize()
      await main.setFocus()
    }
  } catch { /* ignore */ }
}

const taskProgress = computed(() => {
  if (tasksStore.totalCount === 0) return 0
  return Math.round((tasksStore.completedCount / tasksStore.totalCount) * 100)
})

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/* 关闭面板：点击外部 */
function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (expanded.value && !target.closest('.float-panel')) {
    toggle()
  }
}
onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<template>
  <div class="float-root" :class="{ expanded }">
    <!-- 收起状态：圆形图标 -->
    <button v-if="!expanded" class="float-orb" @click.stop="toggle">
      <span class="orb-text">Ω</span>
    </button>

    <!-- 展开面板 -->
    <div v-else class="float-panel">
      <header class="panel-header" data-tauri-drag-region>
        <span class="panel-brand" data-tauri-drag-region>Ω Notes</span>
        <button class="panel-close" @click.stop="toggle">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>

      <!-- 快速笔记 -->
      <section class="panel-section">
        <div class="section-label">📝 快速笔记</div>
        <div class="quick-note-row">
          <textarea
            v-model="quickText"
            class="quick-textarea"
            placeholder="快速记录想法..."
            rows="2"
            @keydown.ctrl.enter="saveQuickNote"
          />
          <button class="mini-btn accent" :disabled="!quickText.trim()" @click="saveQuickNote">保存</button>
        </div>
      </section>

      <!-- 任务概览 -->
      <section class="panel-section">
        <div class="section-label">✅ 今日任务 <span class="section-badge">{{ tasksStore.completedCount }}/{{ tasksStore.totalCount }}</span></div>
        <div class="mini-progress">
          <div class="mini-progress-fill" :class="{ complete: taskProgress === 100 }" :style="{ width: taskProgress + '%' }" />
        </div>
      </section>

      <!-- 计时器 -->
      <section class="panel-section" v-if="tasksStore.countdown.isRunning">
        <div class="section-label">⏱ 倒计时</div>
        <div class="timer-mini">
          <span class="timer-mini-digits" :class="{ done: tasksStore.countdownFinished }">
            {{ formatTime(tasksStore.countdown.remainingSeconds) }}
          </span>
          <button class="mini-btn ghost" @click="tasksStore.pauseCountdown()">
            {{ tasksStore.countdown.isPaused ? '继续' : '暂停' }}
          </button>
        </div>
      </section>

      <!-- 快捷操作 -->
      <section class="panel-actions">
        <button class="action-btn" @click="openPopout('tasks')">
          📋 悬挂任务
        </button>
        <button class="action-btn" @click="openPopout('timer')">
          ⏱ 悬挂计时
        </button>
        <button class="action-btn" @click="showMainWindow">
          🖥 打开主窗口
        </button>
      </section>
    </div>
  </div>
</template>

<style scoped>
.float-root {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
}

/* ─── 圆形悬浮球 ─── */
.float-orb {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, oklch(0.55 0.2 270), oklch(0.45 0.18 300));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4),
              0 2px 8px rgba(0, 0, 0, 0.2);
  transition: transform 200ms var(--ease-out), box-shadow 200ms var(--ease-out);
}

.float-orb:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 28px rgba(99, 102, 241, 0.5),
              0 3px 12px rgba(0, 0, 0, 0.25);
}

.float-orb:active {
  transform: scale(0.95);
}

.orb-text {
  font-size: 1.4rem;
  font-weight: 800;
  font-family: var(--font-sans);
  pointer-events: none;
}

/* ─── 展开面板 ─── */
.float-panel {
  width: 280px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2),
              0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: panelIn 200ms var(--ease-out);
}

@keyframes panelIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-divider);
  cursor: move;
  -webkit-app-region: drag;
}

.panel-brand {
  font-size: 0.85rem;
  font-weight: 700;
  background: linear-gradient(135deg, oklch(0.7 0.2 270), oklch(0.6 0.18 300));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.panel-close {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--color-text-tertiary);
  -webkit-app-region: no-drag;
  transition: background-color 150ms var(--ease-out), color 150ms var(--ease-out);
}

@media (hover: hover) {
  .panel-close:hover {
    background: var(--color-danger-muted, rgba(239, 68, 68, 0.1));
    color: var(--color-danger);
  }
}

/* ─── 面板分区 ─── */
.panel-section {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-divider);
}

.section-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}

.section-badge {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--color-text-tertiary);
}

.quick-note-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.quick-textarea {
  width: 100%;
  padding: var(--space-1) var(--space-2);
  font-size: 0.75rem;
  font-family: var(--font-sans);
  line-height: 1.5;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  resize: none;
  outline: none;
  transition: border-color 150ms var(--ease-out);
}

.quick-textarea:focus {
  border-color: var(--color-accent);
}

.quick-textarea::placeholder {
  color: var(--color-text-tertiary);
}

.mini-btn {
  align-self: flex-end;
  font-size: 0.68rem;
  font-weight: 500;
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  transition: background-color 150ms var(--ease-out), opacity 150ms var(--ease-out);
}

.mini-btn.accent {
  background: var(--color-accent);
  color: var(--color-text-inverse);
}

.mini-btn.ghost {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.mini-btn:disabled { opacity: 0.4; }

@media (hover: hover) {
  .mini-btn.accent:hover:not(:disabled) { background: var(--color-accent-hover); }
  .mini-btn.ghost:hover { background: var(--color-bg-hover); }
}

.mini-progress {
  height: 3px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
}

.mini-progress-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: var(--radius-full);
  transition: width 300ms var(--ease-out);
}

.mini-progress-fill.complete { background: var(--color-success); }

.timer-mini {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.timer-mini-digits {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  font-weight: 700;
}

.timer-mini-digits.done { color: var(--color-success); }

/* ─── 快捷操作 ─── */
.panel-actions {
  padding: var(--space-2) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  font-size: 0.72rem;
  font-weight: 500;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  transition: background-color 150ms var(--ease-out), color 150ms var(--ease-out);
}

@media (hover: hover) {
  .action-btn:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
}

.action-btn:active { transform: scale(0.97); }
</style>
