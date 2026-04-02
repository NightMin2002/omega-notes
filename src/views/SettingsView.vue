<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useThemeStore } from '../stores/theme'
import { useSettingsStore } from '../stores/settings'
import { useNotesStore } from '../stores/notes'
import { useTasksStore } from '../stores/tasks'
import { isTauri } from '../utils/storage'
import InputDialog from '../components/InputDialog.vue'
import type { EditorMode, FontFamily } from '../types'

const themeStore = useThemeStore()
const settingsStore = useSettingsStore()
const notesStore = useNotesStore()
const tasksStore = useTasksStore()

const isTauriEnv = isTauri()
const storagePath = ref('')
const autoStartEnabled = ref(false)
const autoStartLoading = ref(false)

/* 加载实际存储路径 + 自启状态 */
onMounted(async () => {
  if (isTauriEnv) {
    try {
      const { appDataDir, join } = await import('@tauri-apps/api/path')
      const dir = await appDataDir()
      storagePath.value = await join(dir, 'notes')
    } catch { /* 浏览器环境忽略 */ }

    try {
      const { isEnabled } = await import('@tauri-apps/plugin-autostart')
      autoStartEnabled.value = await isEnabled()
    } catch { /* 浏览器环境忽略 */ }
  }
})

/** 切换开机自启 */
async function toggleAutoStart() {
  if (!isTauriEnv || autoStartLoading.value) return
  autoStartLoading.value = true
  try {
    const { enable, disable, isEnabled } = await import('@tauri-apps/plugin-autostart')
    if (autoStartEnabled.value) {
      await disable()
    } else {
      await enable()
    }
    autoStartEnabled.value = await isEnabled()
  } catch (e) {
    console.warn('自启设置失败:', e)
  } finally {
    autoStartLoading.value = false
  }
}

/** 打开存储目录（调用系统文件管理器） */
async function openStorageFolder() {
  if (!isTauriEnv || !storagePath.value) return
  try {
    const { openPath } = await import('@tauri-apps/plugin-opener')
    await openPath(storagePath.value)
  } catch (e) {
    console.warn('无法打开文件夹，请手动导航至:', storagePath.value, e)
  }
}

const storageLocation = computed(() =>
  isTauriEnv ? 'AppData (本地文件系统)' : 'localStorage (浏览器)'
)

const editorModeOptions: { value: EditorMode; label: string; desc: string }[] = [
  { value: 'wysiwyg', label: '所见即所得', desc: 'Milkdown 富文本编辑' },
  { value: 'split', label: '分屏模式', desc: 'Markdown 源码 + 实时预览' },
]

const fontOptions: { value: FontFamily; label: string; sample: string }[] = [
  { value: 'system', label: '系统默认', sample: 'Segoe UI / SF Pro' },
  { value: 'inter', label: 'Inter', sample: 'The quick brown fox' },
  { value: 'noto-sans-sc', label: 'Noto Sans SC', sample: '思源黑体 中文优化' },
]

const cleanDaysOptions = [
  { value: 0, label: '不自动清理' },
  { value: 7, label: '7 天' },
  { value: 14, label: '14 天' },
  { value: 30, label: '30 天' },
  { value: 90, label: '90 天' },
]

/* ─── 自定义下拉 ─── */
const dropdownOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const selectedCleanLabel = computed(() =>
  cleanDaysOptions.find(o => o.value === settingsStore.trashAutoCleanDays)?.label || '30 天'
)

function selectCleanDays(val: number) {
  settingsStore.setTrashAutoCleanDays(val)
  dropdownOpen.value = false
}

function handleClickOutside(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    dropdownOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside, true))
onUnmounted(() => document.removeEventListener('click', handleClickOutside, true))

/* ─── 恢复出厂设置 ─── */
const showResetDialog = ref(false)

async function handleFactoryResetConfirm(val: string) {
  if (val === '确认重置') {
    // 1. Delete all notes
    const allIds = notesStore.notes.map(n => n.id)
    for (const id of allIds) {
      await notesStore.permanentlyDelete(id)
    }

    // 2. Clear tasks
    tasksStore.tasks = []
    tasksStore.records = []
    
    // 3. Clear localStorage
    localStorage.clear()

    // 4. Reload window
    window.location.reload()
  } else {
    showResetDialog.value = false
  }
}
</script>

<template>
  <div class="settings-page">
    <h2 class="page-title">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
      设置
    </h2>

    <!-- ═══ 外观 ═══ -->
    <section class="settings-section">
      <h3 class="section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
        外观
      </h3>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">主题</span>
          <span class="setting-desc">切换深色 / 浅色外观</span>
        </div>
        <div class="theme-switcher">
          <button
            class="theme-option"
            :class="{ active: themeStore.theme === 'dark' }"
            @click="themeStore.theme === 'light' && themeStore.toggle()"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            深色
          </button>
          <button
            class="theme-option"
            :class="{ active: themeStore.theme === 'light' }"
            @click="themeStore.theme === 'dark' && themeStore.toggle()"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
            浅色
          </button>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">字体</span>
          <span class="setting-desc">选择界面的显示字体</span>
        </div>
        <div class="font-options">
          <button
            v-for="opt in fontOptions"
            :key="opt.value"
            class="font-option"
            :class="{ active: settingsStore.fontFamily === opt.value }"
            @click="settingsStore.setFontFamily(opt.value)"
          >
            <span class="font-name">{{ opt.label }}</span>
            <span class="font-sample">{{ opt.sample }}</span>
          </button>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">内容缩放</span>
          <span class="setting-desc">调整笔记内容区域的字体大小（{{ settingsStore.contentZoom }}%）</span>
        </div>
        <div class="zoom-controls">
          <button
            type="button"
            class="zoom-btn"
            :disabled="settingsStore.contentZoom <= 80"
            @click="settingsStore.setContentZoom(settingsStore.contentZoom - 5)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <div class="zoom-track">
            <div class="zoom-fill" :style="{ width: ((settingsStore.contentZoom - 80) / 70 * 100) + '%' }" />
          </div>
          <button
            type="button"
            class="zoom-btn"
            :disabled="settingsStore.contentZoom >= 150"
            @click="settingsStore.setContentZoom(settingsStore.contentZoom + 5)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            type="button"
            class="zoom-reset"
            :disabled="settingsStore.contentZoom === 100"
            @click="settingsStore.setContentZoom(100)"
          >重置</button>
        </div>
      </div>
    </section>

    <!-- ═══ 编辑器 ═══ -->
    <section class="settings-section">
      <h3 class="section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        编辑器
      </h3>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">默认编辑模式</span>
          <span class="setting-desc">新建笔记时的默认编辑方式</span>
        </div>
        <div class="mode-options">
          <button
            v-for="opt in editorModeOptions"
            :key="opt.value"
            class="mode-option"
            :class="{ active: settingsStore.defaultEditorMode === opt.value }"
            @click="settingsStore.setDefaultEditorMode(opt.value)"
          >
            <svg v-if="opt.value === 'wysiwyg'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" />
            </svg>
            <span class="mode-label">{{ opt.label }}</span>
            <span class="mode-desc">{{ opt.desc }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- ═══ 数据 ═══ -->
    <section class="settings-section">
      <h3 class="section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
        数据
      </h3>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">存储位置</span>
          <span class="setting-desc">{{ storageLocation }}</span>
          <span v-if="storagePath" class="storage-path">{{ storagePath }}</span>
        </div>
        <div class="storage-actions">
          <span class="setting-tag">{{ isTauriEnv ? '桌面模式' : '浏览器模式' }}</span>
          <button
            v-if="isTauriEnv && storagePath"
            class="open-folder-btn"
            @click="openStorageFolder"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            打开文件夹
          </button>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">笔记统计</span>
        </div>
        <div class="stats-row">
          <div class="stat-chip">
            <span class="stat-value">{{ notesStore.totalCount }}</span>
            <span class="stat-label">笔记</span>
          </div>
          <div class="stat-chip">
            <span class="stat-value">{{ notesStore.categories.length }}</span>
            <span class="stat-label">分类</span>
          </div>
          <div class="stat-chip">
            <span class="stat-value">{{ notesStore.favoriteCount }}</span>
            <span class="stat-label">收藏</span>
          </div>
          <div class="stat-chip">
            <span class="stat-value">{{ notesStore.trashCount }}</span>
            <span class="stat-label">回收站</span>
          </div>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">回收站自动清理</span>
          <span class="setting-desc">超过设定天数的已删除笔记将被永久清除</span>
        </div>
        <div ref="dropdownRef" class="custom-dropdown">
          <button class="dropdown-trigger" @click="dropdownOpen = !dropdownOpen">
            <span>{{ selectedCleanLabel }}</span>
            <svg
              class="dropdown-chevron"
              :class="{ open: dropdownOpen }"
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <Transition name="dropdown-pop">
            <div v-if="dropdownOpen" class="dropdown-menu">
              <button
                v-for="opt in cleanDaysOptions"
                :key="opt.value"
                class="dropdown-item"
                :class="{ active: settingsStore.trashAutoCleanDays === opt.value }"
                @click="selectCleanDays(opt.value)"
              >
                <svg
                  v-if="settingsStore.trashAutoCleanDays === opt.value"
                  class="check-icon"
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span :class="{ 'has-check': settingsStore.trashAutoCleanDays === opt.value }">{{ opt.label }}</span>
              </button>
            </div>
          </Transition>
        </div>
      </div>

      <div class="setting-item danger-zone">
        <div class="setting-info">
          <span class="setting-label text-danger">恢复出厂设置</span>
          <span class="setting-desc">彻底清除所有笔记、任务、偏好设置和缓存数据。此操作不可逆！</span>
        </div>
        <button
          class="danger-btn"
          @click="showResetDialog = true"
        >
          清空所有数据
        </button>
      </div>
    </section>

    <!-- ═══ 系统（仅桌面） ═══ -->
    <section v-if="isTauriEnv" class="settings-section">
      <h3 class="section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
        </svg>
        系统
      </h3>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">开机自启动</span>
          <span class="setting-desc">系统启动时自动运行 Ω Notes（最小化到托盘）</span>
        </div>
        <button
          class="toggle-switch"
          :class="{ active: autoStartEnabled, loading: autoStartLoading }"
          :disabled="autoStartLoading"
          role="switch"
          :aria-checked="autoStartEnabled"
          aria-label="开机自启动"
          @click="toggleAutoStart"
        >
          <span class="toggle-thumb" />
        </button>
      </div>
    </section>

    <!-- ═══ 关于 ═══ -->
    <section class="settings-section">
      <h3 class="section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        关于
      </h3>

      <div class="about-grid">
        <div class="about-item">
          <span class="about-label">应用名称</span>
          <span class="about-value">Ω Notes</span>
        </div>
        <div class="about-item">
          <span class="about-label">版本</span>
          <span class="about-value">2.0.0</span>
        </div>
        <div class="about-item">
          <span class="about-label">框架</span>
          <span class="about-value">Vue 3 + Vite 7 + TypeScript</span>
        </div>
        <div class="about-item">
          <span class="about-label">桌面壳</span>
          <span class="about-value">Tauri 2</span>
        </div>
        <div class="about-item">
          <span class="about-label">编辑器</span>
          <span class="about-value">Milkdown v7 (ProseMirror)</span>
        </div>
        <div class="about-item">
          <span class="about-label">数学</span>
          <span class="about-value">KaTeX</span>
        </div>
      </div>
    </section>

    <!-- 弹窗 -->
    <InputDialog
      :open="showResetDialog"
      title="高危操作确认"
      description="如确定清除，请输入「确认重置」"
      placeholder="确认重置"
      requiredMatch="确认重置"
      confirmText="彻底清除"
      cancelText="取消"
      confirmType="danger"
      @confirm="handleFactoryResetConfirm"
      @cancel="showResetDialog = false"
    />
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 720px;
  margin: 0 auto;
}

.page-title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: var(--space-8);
}

/* ═══ 设置分区 ═══ */
.settings-section {
  margin-bottom: var(--space-8);
  background: var(--color-surface);
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-xl);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-tertiary);
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-divider);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
}

/* ═══ 设置项 ═══ */
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-divider);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.setting-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.setting-desc {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

.setting-tag {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--color-accent-text);
  background: var(--color-accent-muted);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  white-space: nowrap;
}

/* ═══ 主题切换 ═══ */
.theme-switcher {
  display: flex;
  gap: var(--space-1);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: 3px;
}

.theme-option {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text-tertiary);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

.theme-option.active {
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-sm);
}

.theme-option:active {
  transform: scale(0.98);
}

/* ═══ 字体选择 ═══ */
.font-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.font-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  text-align: left;
  transition: border-color var(--duration-fast) var(--ease-out),
              background-color var(--duration-fast) var(--ease-out);
}

.font-option.active {
  border-color: var(--color-accent);
  background: var(--color-accent-muted);
}

@media (hover: hover) {
  .font-option:not(.active):hover {
    border-color: var(--color-border-strong);
    background: var(--color-bg-hover);
  }
}

.font-option:active {
  transform: scale(0.98);
}

.font-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.font-sample {
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
}

/* ═══ 编辑模式 ═══ */
.mode-options {
  display: flex;
  gap: var(--space-2);
}

.mode-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  min-width: 110px;
  transition: border-color var(--duration-fast) var(--ease-out),
              background-color var(--duration-fast) var(--ease-out);
}

.mode-option.active {
  border-color: var(--color-accent);
  background: var(--color-accent-muted);
}

@media (hover: hover) {
  .mode-option:not(.active):hover {
    border-color: var(--color-border-strong);
    background: var(--color-bg-hover);
  }
}

.mode-option:active {
  transform: scale(0.98);
}

.mode-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.mode-desc {
  font-size: 0.65rem;
  color: var(--color-text-tertiary);
  text-align: center;
}

/* ═══ 统计 ═══ */
.stats-row {
  display: flex;
  gap: var(--space-3);
}

.stat-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  min-width: 56px;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.stat-label {
  font-size: 0.6rem;
  font-weight: 500;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ═══ 自定义下拉 ═══ */
.custom-dropdown {
  position: relative;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--color-text-primary);
  cursor: pointer;
  min-width: 120px;
  justify-content: space-between;
  transition: border-color var(--duration-fast) var(--ease-out),
              background-color var(--duration-fast) var(--ease-out);
}

.dropdown-trigger:focus-visible {
  border-color: var(--color-accent);
  outline: none;
  box-shadow: 0 0 0 2px var(--color-accent-muted);
}

@media (hover: hover) {
  .dropdown-trigger:hover {
    border-color: var(--color-border-strong);
    background: var(--color-bg-hover);
  }
}

.dropdown-trigger:active {
  transform: scale(0.98);
}

.dropdown-chevron {
  color: var(--color-text-tertiary);
  transition: transform var(--duration-fast) var(--ease-out);
  flex-shrink: 0;
}

.dropdown-chevron.open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + var(--space-1));
  right: 0;
  min-width: 100%;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.25));
  z-index: var(--z-dropdown);
  padding: var(--space-1);
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-align: left;
  white-space: nowrap;
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

.dropdown-item.active {
  color: var(--color-accent);
  font-weight: 600;
}

@media (hover: hover) {
  .dropdown-item:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
}

.dropdown-item:active {
  transform: scale(0.98);
}

.check-icon {
  color: var(--color-accent);
  flex-shrink: 0;
}

.dropdown-item span:not(.has-check) {
  padding-left: calc(14px + var(--space-2));
}

.dropdown-item span.has-check {
  padding-left: 0;
}

/* 下拉动画 */
.dropdown-pop-enter-active,
.dropdown-pop-leave-active {
  transition: opacity var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
  transform-origin: top right;
}

.dropdown-pop-enter-from,
.dropdown-pop-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}

/* ═══ 存储位置 ═══ */
.storage-path {
  font-size: 0.68rem;
  font-family: var(--font-mono);
  color: var(--color-text-tertiary);
  word-break: break-all;
  margin-top: 2px;
  opacity: 0.8;
}

/* ═══ 危险区域 ═══ */
.danger-zone {
  border-top: 1px dashed var(--color-danger);
  background: rgba(239, 68, 68, 0.05); /* danger color faded */
}

.text-danger {
  color: var(--color-danger) !important;
}

.danger-btn {
  padding: var(--space-2) var(--space-4);
  background: transparent;
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .danger-btn:hover {
    background: var(--color-danger);
    color: var(--color-text-inverse);
  }
}

.danger-btn:active {
  transform: scale(0.97);
}

.storage-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.open-folder-btn {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-accent);
  background: var(--color-accent-muted);
  white-space: nowrap;
  transition: background-color var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .open-folder-btn:hover {
    background: var(--color-accent);
    color: var(--color-text-inverse);
  }
}

.open-folder-btn:active {
  transform: scale(0.98);
}

/* ═══ 关于 ═══ */
.about-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}

.about-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-3) var(--space-6);
  border-bottom: 1px solid var(--color-divider);
}

.about-item:nth-child(odd) {
  border-right: 1px solid var(--color-divider);
}

.about-item:nth-last-child(-n+2) {
  border-bottom: none;
}

.about-label {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
}

.about-value {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

/* ═══ 响应式 ═══ */
@media (max-width: 640px) {
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .theme-switcher,
  .mode-options,
  .stats-row,
  .font-options {
    width: 100%;
  }

  .mode-option {
    flex: 1;
    min-width: 0;
  }

  .stat-chip {
    flex: 1;
  }
}

/* ═══ Toggle 开关 ═══ */
.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: var(--radius-full);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color var(--duration-normal) var(--ease-out),
              border-color var(--duration-normal) var(--ease-out);
}

.toggle-switch.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.toggle-switch.loading {
  opacity: 0.6;
  cursor: wait;
}

.toggle-switch:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-accent-muted);
}

.toggle-switch:active:not(.loading) {
  transform: scale(0.98);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: var(--radius-full);
  background: var(--color-text-inverse, #fff);
  box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,.15));
  transition: transform var(--duration-normal) var(--ease-out);
}

.toggle-switch.active .toggle-thumb {
  transform: translateX(20px);

  .storage-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .about-grid {
    grid-template-columns: 1fr;
  }

  .about-item:nth-child(odd) {
    border-right: none;
  }

  .about-item:not(:last-child) {
    border-bottom: 1px solid var(--color-divider);
  }
}

/* ═══ 缩放控制 ═══ */
.zoom-controls {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.zoom-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

.zoom-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.zoom-btn:not(:disabled):active {
  transform: scale(0.92);
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

@media (hover: hover) {
  .zoom-btn:not(:disabled):hover {
    border-color: var(--color-border-strong);
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
}

.zoom-btn:focus-visible {
  border-color: var(--color-accent);
  outline: none;
  box-shadow: 0 0 0 2px var(--color-accent-muted);
}

.zoom-track {
  width: 80px;
  height: 4px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.zoom-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: var(--radius-full);
  transition: width var(--duration-fast) var(--ease-out);
}

.zoom-reset {
  font-size: 0.7rem;
  font-weight: 500;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  color: var(--color-text-tertiary);
  background: transparent;
  border: 1px solid var(--color-border);
  transition: color var(--duration-fast) var(--ease-out),
              background-color var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

.zoom-reset:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.zoom-reset:not(:disabled):active {
  transform: scale(0.96);
}

@media (hover: hover) {
  .zoom-reset:not(:disabled):hover {
    color: var(--color-accent);
    border-color: var(--color-accent);
    background: var(--color-accent-muted);
  }
}

</style>
