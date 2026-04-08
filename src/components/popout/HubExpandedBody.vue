<script setup lang="ts">
import { ref, computed } from 'vue'

import HubTasks from './HubTasks.vue'
import HubTodos from './HubTodos.vue'
import HubTimer from './HubTimer.vue'
import HubLife from './HubLife.vue'
import HubSettings from './HubSettings.vue'
import { useTodosStore } from '../../stores/todos'

const props = defineProps<{
  direction?: 'up' | 'down'
}>()

const activeTab = ref<'tasks' | 'todos' | 'timer' | 'life' | 'settings'>('tasks')
const todosStore = useTodosStore()

const tabs = ['tasks', 'todos', 'timer', 'life', 'settings']
const activeIndex = computed(() => tabs.indexOf(activeTab.value))
const indicatorStyle = computed(() => ({
  transform: `translateX(${activeIndex.value * 100}%)`,
}))
</script>

<template>
  <div class="hub-body-area" :class="{ 'is-flipped': direction === 'up' }">
    <div class="hub-tabs">
      <div class="tab-indicator" :style="indicatorStyle"></div>
      <button class="tab-btn" :class="{ active: activeTab === 'tasks' }" @click="activeTab = 'tasks'">任务</button>
      <button class="tab-btn" :class="{ active: activeTab === 'todos' }" @click="activeTab = 'todos'">
        待办
        <span v-if="todosStore.pendingCount > 0" class="tab-badge">{{ todosStore.pendingCount > 99 ? '99+' : todosStore.pendingCount }}</span>
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'timer' }" @click="activeTab = 'timer'">番茄钟</button>
      <button class="tab-btn" :class="{ active: activeTab === 'life' }" @click="activeTab = 'life'">人生进度</button>
      <button class="tab-btn" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">控制台</button>
    </div>

    <div class="hub-content">
      <HubTasks v-if="activeTab === 'tasks'" />
      <HubTodos v-else-if="activeTab === 'todos'" />
      <HubTimer v-else-if="activeTab === 'timer'" />
      <HubLife v-else-if="activeTab === 'life'" />
      <HubSettings v-else />
    </div>
  </div>
</template>

<style scoped>
.hub-body-area {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-primary);
  /* Removed border-top for a seamless, unified window design */
  overflow: hidden;
}

.hub-body-area.is-flipped {
  flex-direction: column-reverse;
}

.hub-tabs {
  position: relative;
  display: flex;
  background: var(--color-bg-tertiary);
  padding: 4px;
}

.tab-indicator {
  position: absolute;
  top: 4px;
  left: 4px;
  height: calc(100% - 8px);
  width: calc((100% - 8px) / 5);
  background: var(--color-bg-elevated);
  border-radius: 6px;
  box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.1));
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  z-index: 1;
}

.tab-btn {
  position: relative;
  z-index: 2;
  flex: 1;
  padding: 4px 0;
  font-size: 0.75rem;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-weight: 500;
  cursor: pointer;
  appearance: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: color 0.15s ease, transform 0.15s ease;
}

@media (hover: hover) {
  .tab-btn:hover {
    color: var(--color-text-primary);
    transform: translateY(-1px);
  }
}

.tab-btn:active {
  transform: scale(0.97);
}

.tab-btn.active {
  color: var(--color-accent);
  font-weight: 600;
}

.tab-btn:focus-visible {
  outline: none;
  border-radius: 6px;
  box-shadow: 0 0 0 2px var(--color-accent, #6366f1);
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  font-size: 0.55rem;
  font-weight: 700;
  background: var(--color-danger, #ef4444);
  color: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

.hub-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border-strong, rgba(255, 255, 255, 0.12)) transparent;
}

.hub-content::-webkit-scrollbar { width: 4px; }
.hub-content::-webkit-scrollbar-track { background: transparent; }
.hub-content::-webkit-scrollbar-thumb {
  background-color: var(--color-border-strong, rgba(255, 255, 255, 0.12));
  border-radius: var(--radius-full);
}

@media (prefers-reduced-motion: reduce) {
  .tab-indicator {
    transition: none;
  }
  .tab-btn {
    transition: none;
  }
}
</style>
