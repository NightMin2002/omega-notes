<script setup lang="ts">
import { ref } from 'vue'

import HubTasks from './HubTasks.vue'
import HubTimer from './HubTimer.vue'
import HubLife from './HubLife.vue'
import HubSettings from './HubSettings.vue'

const activeTab = ref<'tasks' | 'timer' | 'life' | 'settings'>('tasks')
</script>

<template>
  <div class="hub-body-area">
    <div class="hub-tabs">
      <button class="tab-btn" :class="{ active: activeTab === 'tasks' }" @click="activeTab = 'tasks'">任务</button>
      <button class="tab-btn" :class="{ active: activeTab === 'timer' }" @click="activeTab = 'timer'">番茄钟</button>
      <button class="tab-btn" :class="{ active: activeTab === 'life' }" @click="activeTab = 'life'">人生进度</button>
      <button class="tab-btn" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">设置</button>
    </div>

    <div class="hub-content">
      <HubTasks v-if="activeTab === 'tasks'" />
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
  border-top: 1px solid var(--color-border);
  overflow: hidden;
}

.hub-tabs {
  display: flex;
  background: var(--color-bg-tertiary);
  padding: 4px;
  gap: 4px;
}

.tab-btn {
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
  transition: background-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
}

@media (hover: hover) {
  .tab-btn:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
    transform: translateY(-1px);
  }
}

.tab-btn:active {
  transform: scale(0.97);
}

.tab-btn.active {
  background: var(--color-bg-elevated);
  color: var(--color-accent);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tab-btn:focus-visible {
  box-shadow: 0 0 0 2px var(--color-accent, #6366f1);
  outline: none;
}

.hub-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}
</style>
