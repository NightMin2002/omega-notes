<script setup lang="ts">
/**
 * WikiLinkPicker — [[Wiki 链接]] 选择器下拉面板
 *
 * 从 WriteView / NoteDetailView 提取的共享组件。
 * 接收 composable 暴露的响应式状态作为 props。
 */
import type { Note } from '../types'

defineProps<{
  show: boolean
  search: string
  candidates: Pick<Note, 'id' | 'title' | 'category'>[]
}>()

const emit = defineEmits<{
  'update:search': [value: string]
  select: [title: string]
  toggle: []
}>()
</script>

<template>
  <div class="link-picker-wrapper">
    <button type="button" class="pane-action" @click="emit('toggle')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      <span>插入链接</span>
    </button>
    <div v-if="show" class="link-picker-dropdown">
      <input
        :value="search"
        type="text"
        class="link-search-input"
        placeholder="搜索笔记标题…"
        autofocus
        @input="emit('update:search', ($event.target as HTMLInputElement).value)"
      >
      <ul v-if="candidates.length > 0" class="link-candidates">
        <li v-for="c in candidates" :key="c.id">
          <button type="button" class="link-candidate" @click="emit('select', c.title)">
            <span class="lc-title">{{ c.title }}</span>
            <span class="lc-category">{{ c.category }}</span>
          </button>
        </li>
      </ul>
      <p v-else class="link-empty">无匹配笔记</p>
    </div>
  </div>
</template>

<style scoped>
.link-picker-wrapper {
  position: relative;
}

.pane-action {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--color-text-tertiary);
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .pane-action:hover {
    background: var(--color-bg-hover);
    color: var(--color-accent);
  }
}

.link-picker-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: var(--space-2);
  width: 280px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg, 0 8px 24px rgba(0,0,0,0.25));
  z-index: var(--z-overlay);
  padding: var(--space-2);
}

.link-search-input {
  width: 100%;
  appearance: none;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  font-size: 0.82rem;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
  transition: border-color var(--duration-fast) var(--ease-out);
}

.link-search-input:focus {
  border-color: var(--color-accent);
  outline: none;
  box-shadow: 0 0 0 2px var(--color-accent-muted);
}

.link-candidates {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 200px;
  overflow-y: auto;
}

.link-candidate {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  text-align: left;
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  transition: background-color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .link-candidate:hover {
    background: var(--color-bg-hover);
  }
}

.link-candidate:active { transform: scale(0.98); }

.lc-title {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--color-text-primary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lc-category {
  font-size: 0.68rem;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  margin-left: var(--space-2);
}

.link-empty {
  font-size: 0.78rem;
  color: var(--color-text-tertiary);
  text-align: center;
  padding: var(--space-3);
}
</style>
