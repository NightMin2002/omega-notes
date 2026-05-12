<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTasksStore } from '../../stores/tasks'

const store = useTasksStore()
const quickTitle = ref('')

/* ── 分类色谱（oklch 色相映射，保证可读性与区分度） ── */
const categoryHues: Record<string, number> = {}
const huePool = [220, 160, 30, 300, 80, 120, 0, 260, 50, 190]
let hueIndex = 0

function getCategoryHue(cat: string): number {
  if (!(cat in categoryHues)) {
    categoryHues[cat] = huePool[hueIndex % huePool.length] ?? 220
    hueIndex++
  }
  return categoryHues[cat] ?? 220
}

function catStyle(cat: string) {
  const h = getCategoryHue(cat)
  return {
    '--cat-hue': h,
    borderLeftColor: `oklch(0.68 0.14 ${h})`,
  }
}

function catBadgeStyle(cat: string) {
  const h = getCategoryHue(cat)
  return {
    color: `oklch(0.68 0.14 ${h})`,
    background: `oklch(0.68 0.14 ${h} / 0.12)`,
    borderColor: `oklch(0.68 0.14 ${h} / 0.25)`,
  }
}

/* ── 按分类分组 ── */
const groupedTasks = computed(() => {
  const groups: { name: string; tasks: typeof store.enabledTasks }[] = []
  const map = new Map<string, typeof store.enabledTasks>()
  for (const t of store.enabledTasks) {
    const cat = t.category || '未分类'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(t)
  }
  // 有名分类在前，"未分类"沉底
  for (const [name, tasks] of map) {
    if (name !== '未分类') groups.push({ name, tasks })
  }
  if (map.has('未分类')) {
    groups.push({ name: '未分类', tasks: map.get('未分类')! })
  }
  return groups
})

const hasMultipleGroups = computed(() => {
  return groupedTasks.value.length > 1 || (groupedTasks.value.length === 1 && groupedTasks.value[0]?.name !== '未分类')
})

const progressPercent = computed(() => {
  if (store.totalCount === 0) return 0
  return Math.round((store.completedCount / store.totalCount) * 100)
})

function quickAdd() {
  if (!quickTitle.value.trim()) return
  store.addTask(quickTitle.value.trim())
  quickTitle.value = ''
}

function groupCompletedCount(tasks: typeof store.enabledTasks): number {
  return tasks.filter(t => store.isCompleted(t.id)).length
}

function groupHasUndone(tasks: typeof store.enabledTasks): boolean {
  return tasks.some(t => !store.isCompleted(t.id) && !store.isSkipped(t.id))
}
</script>

<template>
  <div class="hub-tasks">
    <!-- 进度头 -->
    <div class="hub-stats">
      <div class="stats-text">
        <span class="stats-done">{{ store.completedCount }}</span>
        <span class="stats-sep">/</span>
        <span class="stats-total">{{ store.totalCount }}</span>
        <span v-if="store.totalCount > 0" class="stats-pct">({{ progressPercent }}%)</span>
      </div>
      <div v-if="progressPercent === 100 && store.totalCount > 0" class="stats-badge complete">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        全部完成
      </div>
    </div>
    <div class="hub-progress">
      <div
        class="hub-progress-fill"
        :class="{ complete: progressPercent === 100 && store.totalCount > 0 }"
        :style="{ width: progressPercent + '%' }"
      />
    </div>

    <!-- 任务列表 -->
    <div class="hub-body">
      <div v-if="store.enabledTasks.length === 0" class="hub-empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3;margin-bottom:6px">
          <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        暂无任务，放松一下吧
      </div>

      <template v-for="group in groupedTasks" :key="group.name">
        <!-- 分组标题 -->
        <div v-if="hasMultipleGroups" class="group-header" :style="catStyle(group.name)">
          <span class="group-dot" :style="{ background: `oklch(0.68 0.14 ${getCategoryHue(group.name)})` }" />
          <span class="group-name">{{ group.name }}</span>
          <span class="group-counter">{{ groupCompletedCount(group.tasks) }}/{{ group.tasks.length }}</span>
          <button
            v-if="groupHasUndone(group.tasks)"
            class="group-complete-btn"
            @click.stop="store.completeAllInCategory(group.name)"
            title="一键完成"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </button>
        </div>

        <!-- 任务条目 -->
        <TransitionGroup name="list-anim" tag="div" class="group-tasks">
          <div
            v-for="task in group.tasks"
            :key="task.id"
            class="hub-task"
            :class="{
              done: store.isCompleted(task.id),
              skipped: store.isSkipped(task.id),
              'has-stripe': hasMultipleGroups
            }"
            :style="hasMultipleGroups ? { borderLeftColor: `oklch(0.68 0.14 ${getCategoryHue(group.name)})` } : {}"
          >
            <div class="hub-check" @click.stop="store.toggleComplete(task.id)">
              <span class="check-dot" :class="{ checked: store.isCompleted(task.id) }">
                <svg v-if="store.isCompleted(task.id)" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </div>

            <span class="hub-task-name">{{ task.title }}</span>

            <!-- 分类 badge（仅单组时显示，多组已有分组标题） -->
            <span v-if="task.category && !hasMultipleGroups" class="hub-cat" :style="catBadgeStyle(task.category)">
              {{ task.category }}
            </span>

            <!-- 提醒时间 -->
            <span v-if="task.reminderTime" class="hub-time">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              {{ task.reminderTime }}
            </span>

            <!-- 跳过按钮 -->
            <button
              class="hub-skip-btn"
              :class="{ active: store.isSkipped(task.id) }"
              @click.stop="store.toggleSkip(task.id)"
              :title="store.isSkipped(task.id) ? '取消跳过' : '今天不做'"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </button>
          </div>
        </TransitionGroup>
      </template>
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

/* ── 进度统计头 ── */
.hub-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3) var(--space-1);
}
.stats-text {
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
  display: flex;
  align-items: baseline;
  gap: 1px;
}
.stats-done {
  color: var(--color-accent);
  font-weight: 600;
  font-size: 0.82rem;
}
.stats-sep { opacity: 0.4; }
.stats-total { opacity: 0.6; }
.stats-pct {
  margin-left: 3px;
  opacity: 0.45;
  font-size: 0.65rem;
}
.stats-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.6rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: var(--radius-full);
}
.stats-badge.complete {
  color: var(--color-success);
  background: oklch(0.75 0.15 145 / 0.12);
}

/* ── 进度条 ── */
.hub-progress {
  height: 3px;
  background: var(--color-bg-tertiary);
  margin-bottom: 4px;
  border-radius: 2px;
  overflow: hidden;
}
.hub-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), oklch(0.72 0.17 200));
  transition: width 400ms cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 2px;
}
.hub-progress-fill.complete {
  background: linear-gradient(90deg, var(--color-success), oklch(0.78 0.15 145));
}

/* ── 列表主体 ── */
.hub-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-1) var(--space-2);
}

.hub-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--color-text-tertiary);
  padding: var(--space-8) var(--space-4);
  font-size: 0.78rem;
}

/* ── 分组标题 ── */
.group-header {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px var(--space-2);
  margin-top: 6px;
  margin-bottom: 2px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-tertiary);
}
.group-header:first-child { margin-top: 2px; }

.group-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.group-name {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  flex: 1;
}

.group-counter {
  font-size: 0.6rem;
  font-family: var(--font-mono);
  color: var(--color-text-tertiary);
  opacity: 0.7;
}

.group-complete-btn {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  color: var(--color-text-tertiary);
  transition: all 150ms var(--ease-out);
  flex-shrink: 0;
}
.group-complete-btn:hover {
  color: var(--color-success);
  background: oklch(0.75 0.15 145 / 0.12);
}

.group-tasks { position: relative; }

/* ── 任务条目 ── */
.hub-task {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px var(--space-2);
  border-radius: var(--radius-sm);
  transition: background-color 150ms var(--ease-out);
  min-height: 26px;
}
.hub-task.has-stripe {
  border-left: 2px solid transparent;
  padding-left: calc(var(--space-2) - 2px);
}
.hub-task:hover { background: var(--color-bg-hover); }

/* 完成态 */
.hub-task.done {
  opacity: 0.55;
}
.hub-task.done .hub-task-name {
  text-decoration: line-through;
  color: var(--color-text-tertiary);
}
/* 跳过态 */
.hub-task.skipped {
  opacity: 0.45;
}
.hub-task.skipped .hub-task-name {
  text-decoration: line-through;
  color: var(--color-danger);
}

/* ── 勾选框 ── */
.hub-check { cursor: pointer; flex-shrink: 0; }
.check-dot {
  width: 15px;
  height: 15px;
  border: 1.5px solid var(--color-border-strong);
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
  transform: scale(0.92);
  box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.15);
}
.check-dot.checked svg {
  animation: checkmark-pop-mini 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}
@keyframes checkmark-pop-mini {
  0% { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

/* ── 任务名 ── */
.hub-task-name {
  flex: 1;
  font-size: 0.78rem;
  line-height: 1.3;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── 分类 badge ── */
.hub-cat {
  font-size: 0.58rem;
  font-weight: 500;
  padding: 0 5px;
  border-radius: var(--radius-sm);
  border: 1px solid;
  flex-shrink: 0;
  line-height: 1.5;
}

/* ── 提醒时间 ── */
.hub-time {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 0.58rem;
  font-family: var(--font-mono);
  color: var(--color-text-tertiary);
  background: var(--color-bg-tertiary);
  padding: 0 4px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  opacity: 0.8;
}

/* ── 跳过按钮 ── */
.hub-skip-btn {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  color: var(--color-text-tertiary);
  opacity: 0;
  transition: all 150ms var(--ease-out);
  flex-shrink: 0;
}
.hub-task:hover .hub-skip-btn { opacity: 0.6; }
.hub-skip-btn:hover { opacity: 1 !important; color: var(--color-danger); background: oklch(0.65 0.2 25 / 0.1); }
.hub-skip-btn.active { opacity: 1 !important; color: var(--color-danger); }

/* ── 底部快速添加 ── */
.hub-footer {
  padding: var(--space-2);
  border-top: 1px solid var(--color-divider);
}

.hub-input {
  width: 100%;
  padding: 4px var(--space-2);
  font-size: 0.75rem;
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
.hub-input::placeholder {
  color: var(--color-text-tertiary);
  opacity: 0.6;
}

/* ── 列表排序动画 ── */
.list-anim-move,
.list-anim-enter-active,
.list-anim-leave-active {
  transition: all 350ms cubic-bezier(0.4, 0, 0.2, 1);
}
.list-anim-enter-from,
.list-anim-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}
.list-anim-leave-active {
  position: absolute;
}
</style>
