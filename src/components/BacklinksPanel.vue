<script setup lang="ts">
/**
 * BacklinksPanel — 反向链接面板
 * 展示引用当前笔记的其他笔记列表
 */
import type { Note } from '../types'

defineProps<{
  backlinks: Pick<Note, 'id' | 'title' | 'category'>[]
}>()
</script>

<template>
  <section v-if="backlinks.length > 0" class="backlinks-panel">
    <h3 class="backlinks-title">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      反向链接
      <span class="backlinks-count">{{ backlinks.length }}</span>
    </h3>
    <ul class="backlinks-list">
      <li v-for="bl in backlinks" :key="bl.id">
        <RouterLink :to="`/note/${bl.id}`" class="backlink-item">
          <span class="backlink-title">{{ bl.title }}</span>
          <span class="backlink-meta">{{ bl.category }}</span>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.backlinks-panel {
  margin-top: var(--space-8);
  padding-top: var(--space-6);
  border-top: 1px solid var(--color-divider);
}

.backlinks-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-4);
}

.backlinks-count {
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
}

.backlinks-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.backlink-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  text-decoration: none;
  transition: background-color var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .backlink-item:hover {
    background: var(--color-bg-hover);
    border-color: var(--color-accent);
  }
}

.backlink-title {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.backlink-meta {
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
}
</style>
