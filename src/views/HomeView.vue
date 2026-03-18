<script setup lang="ts">
import { computed } from 'vue'
import { useNotesStore } from '../stores/notes'

const notesStore = useNotesStore()

const stats = computed(() => ({
  total: notesStore.totalCount,
  pinned: notesStore.pinnedCount,
  categories: notesStore.categories.length,
}))

const recentNotes = computed(() =>
  [...notesStore.notes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)
)

function formatTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  return `${days} 天前`
}
</script>

<template>
  <div class="home-page">
    <section class="hero">
      <h2 class="hero-title">欢迎回来</h2>
      <p class="hero-subtitle">你的知识，在指尖流转</p>
    </section>

    <!-- 统计卡片 -->
    <section class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-label">总笔记</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.categories }}</div>
        <div class="stat-label">分类</div>
      </div>
      <div class="stat-card accent">
        <div class="stat-value">{{ stats.pinned }}</div>
        <div class="stat-label">已置顶</div>
      </div>
    </section>

    <!-- 快速操作 -->
    <section class="quick-actions">
      <RouterLink to="/write" class="action-card primary">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span>新建笔记</span>
      </RouterLink>
      <RouterLink to="/notes" class="action-card">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <span>浏览知识库</span>
      </RouterLink>
    </section>

    <!-- 最近笔记 -->
    <section v-if="recentNotes.length > 0" class="recent-section">
      <h3 class="section-title">最近更新</h3>
      <div class="recent-list">
        <RouterLink
          v-for="note in recentNotes"
          :key="note.id"
          :to="`/note/${note.id}`"
          class="recent-item"
        >
          <div class="recent-item-info">
            <span class="recent-item-title">{{ note.title || '未命名笔记' }}</span>
            <span class="recent-item-category">{{ note.category }}</span>
          </div>
          <span class="recent-item-time">{{ formatTime(note.updatedAt) }}</span>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  max-width: 800px;
  margin: 0 auto;
}

/* ─── Hero ─── */
.hero {
  margin-bottom: var(--space-8);
}

.hero-title {
  font-size: clamp(1.5rem, 4vw, 2.25rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.hero-subtitle {
  color: var(--color-text-secondary);
  font-size: clamp(0.9rem, 2vw, 1.1rem);
}

/* ─── 统计 ─── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-8);
}

.stat-card {
  background: var(--color-surface);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6) var(--space-4);
  text-align: center;
  transition: transform var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1;
  margin-bottom: var(--space-2);
}

.stat-card.accent .stat-value {
  color: var(--color-accent);
}

.stat-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

/* ─── 快速操作 ─── */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-8);
}

.action-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-lg);
  color: var(--color-text-primary);
  font-weight: 500;
  transition: background-color var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
}

.action-card.primary {
  background: var(--color-accent-muted);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

@media (hover: hover) {
  .action-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
    background: var(--color-surface-hover);
  }

  .action-card.primary:hover {
    box-shadow: var(--shadow-glow);
  }
}

/* ─── 最近更新 ─── */
.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.8rem;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  transition: background-color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .recent-item:hover {
    background: var(--color-bg-hover);
  }
}

.recent-item-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.recent-item-title {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-item-category {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  padding: var(--space-1) var(--space-2);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  white-space: nowrap;
}

.recent-item-time {
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .quick-actions {
    grid-template-columns: 1fr;
  }
}
</style>
