<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTasksStore } from '../../stores/tasks'

const store = useTasksStore()
const quickTitle = ref('')

const progressPercent = computed(() => {
  if (store.totalCount === 0) return 0
  return Math.round((store.completedCount / store.totalCount) * 100)
})

function quickAdd() {
  if (!quickTitle.value.trim()) return
  store.addTask(quickTitle.value.trim())
  quickTitle.value = ''
}
</script>

<template>
  <div class="hub-tasks">
    <!-- 进度条 -->
    <div class="hub-progress">
      <div class="hub-progress-fill" :class="{ complete: progressPercent === 100 }" :style="{ width: progressPercent + '%' }" />
    </div>

    <!-- 任务列表 -->
    <div class="hub-body">
      <div v-if="store.enabledTasks.length === 0" class="hub-empty">
        暂无任务，放松一下吧
      </div>
      <div
        v-for="task in store.enabledTasks"
        :key="task.id"
        class="hub-task"
        :class="{ done: store.isCompleted(task.id), skipped: store.isSkipped(task.id) }"
      >
        <div class="hub-check" @click.stop="store.toggleComplete(task.id)">
          <span class="check-dot" :class="{ checked: store.isCompleted(task.id) }">
            <svg v-if="store.isCompleted(task.id)" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        </div>
        <span class="hub-task-name">{{ task.title }}</span>
        <span v-if="task.category" class="hub-cat">{{ task.category }}</span>
      </div>
    </div>

    <!-- 快速添加 -->
    <div class="hub-footer">
      <input
        v-model="quickTitle"
        class="hub-input"
        placeholder="+ 回车快速添加任务"
        @keydown.enter="quickAdd"
      />
    </div>
  </div>
</template>

<style scoped>
.hub-tasks {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.hub-progress {
  height: 3px;
  background: var(--color-bg-tertiary);
  margin-bottom: 8px;
}

.hub-progress-fill {
  height: 100%;
  background: var(--color-accent);
  transition: width 300ms var(--ease-out);
}
.hub-progress-fill.complete {
  background: var(--color-success);
}

.hub-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2);
}

.hub-empty {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: var(--space-8);
  font-size: 0.82rem;
}

.hub-task {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  transition: background-color 150ms var(--ease-out);
}
.hub-task:hover { background: var(--color-bg-hover); }

.hub-task.done .hub-task-name {
  text-decoration: line-through;
  color: var(--color-text-tertiary);
}
.hub-task.skipped .hub-task-name {
  text-decoration: line-through;
  color: var(--color-danger);
  opacity: 0.6;
}

.sr-only { position: absolute; width: 0; height: 0; opacity: 0; }
.hub-check { cursor: pointer; flex-shrink: 0; }
.check-dot {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border-strong);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms var(--ease-out);
}
.check-dot.checked {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-text-inverse);
}

.hub-task-name {
  flex: 1;
  font-size: 0.82rem;
}

.hub-cat {
  font-size: 0.6rem;
  color: var(--color-warning);
  background: var(--color-warning-muted, oklch(0.85 0.1 85 / 0.15));
  padding: 0 var(--space-1);
  border-radius: var(--radius-sm);
}

.hub-footer {
  padding: var(--space-2);
  border-top: 1px solid var(--color-divider);
}

.hub-input {
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
.hub-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-muted);
}
</style>
