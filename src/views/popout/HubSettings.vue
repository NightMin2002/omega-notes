<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

const emit = defineEmits<{
  (e: 'update', config: any): void
}>()

const config = ref({
  showDay: true,
  showYear: true,
  showWeek: true,
  useDetailedText: true,
  detailedTextType: 'elapsed',
})

onMounted(() => {
  const saved = localStorage.getItem('hub-config')
  if (saved) {
    try {
      config.value = { ...config.value, ...JSON.parse(saved) }
    } catch {}
  }
  emit('update', config.value)
})

watch(config, (val) => {
  localStorage.setItem('hub-config', JSON.stringify(val))
  emit('update', val)
}, { deep: true })
</script>

<template>
  <div class="hub-settings">
    <div class="settings-title">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
      悬浮窗设置
    </div>
    
    <div class="setting-list">
      <label class="setting-item">
        <span class="setting-label">显示今日进度条</span>
        <input type="checkbox" v-model="config.showDay" class="toggle-checkbox" />
      </label>
      <label class="setting-item">
        <span class="setting-label">显示年度进度条</span>
        <input type="checkbox" v-model="config.showYear" class="toggle-checkbox" />
      </label>
      <label class="setting-item">
        <span class="setting-label">详细文本增强展示 (如已过/剩余详细时间)</span>
        <input type="checkbox" v-model="config.useDetailedText" class="toggle-checkbox" />
      </label>
      <div v-if="config.useDetailedText" class="setting-item">
        <span class="setting-label">详细文本计算模式</span>
        <div class="segmented-control">
          <label class="segment">
            <input type="radio" v-model="config.detailedTextType" value="elapsed" class="sr-only" />
            <span class="segment-label">已度过</span>
          </label>
          <label class="segment">
            <input type="radio" v-model="config.detailedTextType" value="remaining" class="sr-only" />
            <span class="segment-label">剩余</span>
          </label>
        </div>
      </div>
      <label class="setting-item">
        <span class="setting-label">显示年份/第几周 (如: W14)</span>
        <input type="checkbox" v-model="config.showWeek" class="toggle-checkbox" />
      </label>
    </div>
  </div>
</template>

<style scoped>
.hub-settings {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.settings-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: var(--space-4);
  color: var(--color-text-primary);
}

.setting-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--color-bg-tertiary);
  transition: background-color 150ms ease;
}
.setting-item:hover {
  background: var(--color-bg-hover);
}

.setting-label {
  font-size: 0.82rem;
  color: var(--color-text-secondary);
}

/* Custom Toggle */
.toggle-checkbox {
  appearance: none;
  width: 36px;
  height: 20px;
  background: var(--color-bg-tertiary);
  border-radius: 10px;
  position: relative;
  cursor: pointer;
  outline: none;
  box-shadow: inset 0 0 0 1px var(--color-border);
  transition: all 0.2s ease;
}
.toggle-checkbox::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: var(--color-text-secondary);
  border-radius: 50%;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.toggle-checkbox:checked {
  background: var(--color-accent);
  box-shadow: inset 0 0 0 1px var(--color-accent);
}
.toggle-checkbox:checked::after {
  left: calc(100% - 18px);
  background: #fff;
}

/* Custom Segmented Control */
.sr-only { position: absolute; width: 0; height: 0; opacity: 0; }
.segmented-control {
  display: flex;
  background: var(--color-bg-primary);
  padding: 2px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}
.segment {
  cursor: pointer;
}
.segment-label {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 14px;
  font-size: 0.72rem;
  border-radius: calc(var(--radius-sm) - 2px);
  color: var(--color-text-secondary);
  transition: all 0.2s;
}
.segment input:checked + .segment-label {
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  font-weight: 600;
}
</style>
