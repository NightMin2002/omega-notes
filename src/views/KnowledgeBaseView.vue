<script setup lang="ts">
import { computed } from 'vue'
import { useNotesStore } from '../stores/notes'
import { useRouter } from 'vue-router'

const notesStore = useNotesStore()
const router = useRouter()

const stats = computed(() => ({
  total: notesStore.totalCount,
  pinned: notesStore.pinnedCount,
  favorites: notesStore.favoriteCount,
  categories: notesStore.categories.length,
}))

const recentNotes = computed(() =>
  [...notesStore.activeNotes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6)
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

const inboxCount = computed(() =>
  notesStore.activeNotes.filter(n => n.category === '收件箱').length
)
</script>

<template>
  <div class="kb-home-page">
    <!-- Hero / Greeting -->
    <section class="hero-section">
      <div class="hero-text">
        <h1 class="hero-title">知识库总览</h1>
        <p class="hero-subtitle">整理思绪，随时准备下笔。</p>
      </div>
      
      <div class="hero-actions">
        <button class="btn-primary" @click="router.push('/write')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新建笔记
        </button>
      </div>
    </section>

    <!-- Stats Dashboard -->
    <section class="stats-grid">
      <RouterLink to="/notes" class="stat-card">
        <div class="stat-icon-wrapper blue">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-val">{{ stats.total }}</span>
          <span class="stat-label">全部笔记</span>
        </div>
      </RouterLink>

      <div class="stat-card">
        <div class="stat-icon-wrapper purple">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-val">{{ stats.categories }}</span>
          <span class="stat-label">共有分类</span>
        </div>
      </div>

      <RouterLink to="/notes?view=favorites" class="stat-card">
        <div class="stat-icon-wrapper yellow">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-val">{{ stats.favorites }}</span>
          <span class="stat-label">我的收藏</span>
        </div>
      </RouterLink>

      <RouterLink to="/notes?category=收件箱" class="stat-card">
        <div class="stat-icon-wrapper green">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-val">{{ inboxCount }}</span>
          <span class="stat-label">收件箱未理</span>
        </div>
      </RouterLink>
    </section>

    <!-- Recent Updates -->
    <section v-if="recentNotes.length > 0" class="recent-section">
      <div class="section-head">
        <h3 class="section-title">最近更新</h3>
        <RouterLink to="/notes?view=recent" class="section-more">查看全部 →</RouterLink>
      </div>
      <div class="recent-grid">
        <RouterLink
          v-for="note in recentNotes"
          :key="note.id"
          :to="`/note/${note.id}`"
          class="recent-card"
        >
          <span class="rc-title">{{ note.title || '未命名笔记' }}</span>
          <span class="rc-cat">{{ note.category }}</span>
          <span class="rc-time">{{ formatTime(note.updatedAt) }}</span>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.kb-home-page {
  max-width: 960px;
  margin: 0 auto;
  padding: var(--space-4) 0;
}

/* ─── Hero Section ─── */
.hero-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-8);
  padding: var(--space-8);
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, var(--color-surface), transparent);
  border: 1px solid var(--color-glass-border);
  box-shadow: var(--shadow-sm);
  position: relative;
  overflow: hidden;
}

/* Background glow */
.hero-section::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -10%;
  width: 300px;
  height: 300px;
  background: var(--color-accent);
  filter: blur(100px);
  opacity: 0.15;
  border-radius: 50%;
  z-index: 0;
  pointer-events: none;
}

.hero-text {
  position: relative;
  z-index: 1;
}

.hero-title {
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.hero-subtitle {
  color: var(--color-text-tertiary);
  font-size: 1rem;
}

.hero-actions {
  position: relative;
  z-index: 1;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  background: var(--color-accent);
  color: var(--color-text-inverse);
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 1rem;
  transition: transform var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out),
              background var(--duration-fast) var(--ease-out);
  border: none;
  cursor: pointer;
}

@media (hover: hover) {
  .btn-primary:hover {
    transform: translateY(-2px);
    background: var(--color-accent-hover);
    box-shadow: 0 8px 24px var(--color-accent-muted);
  }
}
.btn-primary:active {
  transform: scale(0.97);
}

/* ─── Stats Grid ─── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-6);
  margin-bottom: var(--space-12);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-6) var(--space-8);
  background: var(--color-surface);
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-xl);
  text-decoration: none;
  transition: transform var(--duration-normal) var(--ease-out),
              box-shadow var(--duration-normal) var(--ease-out),
              border-color var(--duration-normal) var(--ease-out);
}

@media (hover: hover) {
  .stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.05);
    border-color: var(--color-border-strong);
  }
}

.stat-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
  box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.1);
}

.stat-icon-wrapper svg {
  width: 24px;
  height: 24px;
}

/* OKLCH colors for icon wrappers */
.stat-icon-wrapper.blue {
  background: oklch(90% 0.05 250);
  color: oklch(50% 0.15 250);
}
.stat-icon-wrapper.purple {
  background: oklch(90% 0.05 300);
  color: oklch(50% 0.15 300);
}
.stat-icon-wrapper.yellow {
  background: oklch(90% 0.05 80);
  color: oklch(50% 0.15 80);
}
.stat-icon-wrapper.green {
  background: oklch(90% 0.05 150);
  color: oklch(50% 0.15 150);
}

[data-theme='dark'] .stat-icon-wrapper.blue {
  background: oklch(30% 0.05 250);
  color: oklch(70% 0.15 250);
}
[data-theme='dark'] .stat-icon-wrapper.purple {
  background: oklch(30% 0.05 300);
  color: oklch(70% 0.15 300);
}
[data-theme='dark'] .stat-icon-wrapper.yellow {
  background: oklch(30% 0.05 80);
  color: oklch(70% 0.15 80);
}
[data-theme='dark'] .stat-icon-wrapper.green {
  background: oklch(30% 0.05 150);
  color: oklch(70% 0.15 150);
}

.stat-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-2);
}

.stat-val {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1;
  letter-spacing: -0.01em;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  font-weight: 500;
  line-height: 1;
}

/* ─── Recent Section ─── */
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.section-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: 0.02em;
}

.section-more {
  font-size: 0.8rem;
  color: var(--color-accent);
  font-weight: 600;
  transition: opacity var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .section-more:hover {
    opacity: 0.75;
  }
}

.recent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-4);
}

.recent-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-lg);
  text-decoration: none;
  transition: transform var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .recent-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
    border-color: var(--color-border-strong);
  }
}
.recent-card:active {
  transform: scale(0.98);
}

.rc-title {
  font-weight: 600;
  color: var(--color-text-primary);
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rc-cat {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-accent-text);
  background: var(--color-accent-muted);
  padding: 2px var(--space-3);
  border-radius: var(--radius-full);
  align-self: flex-start;
}

.rc-time {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  margin-top: auto;
  padding-top: var(--space-2);
}

/* ─── Responsive ─── */
@media (max-width: 768px) {
  .hero-section {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-6);
  }
}
</style>
