<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useThemeStore } from '../stores/theme'
import { useSettingsStore } from '../stores/settings'
import { useNotesStore } from '../stores/notes'
import { useTasksStore } from '../stores/tasks'
import { useUpdaterStore } from '../stores/updater'
import { isTauri } from '../utils/storage'
import InputDialog from '../components/InputDialog.vue'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import type { EditorMode, FontFamily } from '../types'

const themeStore = useThemeStore()
const settingsStore = useSettingsStore()
const notesStore = useNotesStore()
const tasksStore = useTasksStore()
const updaterStore = useUpdaterStore()

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


/* ─── 更新日志轻量 Markdown 渲染 ─── */
const updateMd = new MarkdownIt({ html: false, linkify: true, breaks: true })

const renderedUpdateNotes = computed(() => {
  const raw = updaterStore.updateInfo?.notes
  if (!raw) return ''
  const html = updateMd.render(raw)
  return DOMPurify.sanitize(html, { FORBID_TAGS: ['script', 'style', 'iframe'] })
})

/** 格式化字节数为可读字符串 */
function formatBytes(bytes: number): string {
  if (bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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

    <!-- ═══ 应用更新 ═══ -->
    <section v-if="isTauriEnv" class="settings-section">
      <h3 class="section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
        应用更新
      </h3>

      <!-- 基础检查更新项 (当没有新版本或被忽略时显示) -->
      <div v-if="!updaterStore.hasUpdate" class="setting-item update-check-item">
        <div class="setting-info">
          <span class="setting-label">检查更新</span>
          <span class="setting-desc">
            <template v-if="updaterStore.checking">正在连接更新服务器并校验...</template>
            <template v-else-if="updaterStore.updateInfo && !updaterStore.hasUpdate">已忽略新版本 v{{ updaterStore.updateInfo.version }}</template>
            <template v-else>当前已是最新版本 (v{{ updaterStore.getCurrentVersion() }})</template>
          </span>
        </div>
        <div class="update-check-actions">

          <button
            class="action-btn primary-btn"
            :disabled="updaterStore.checking"
            @click="updaterStore.checkForUpdates(false)"
          >
            <svg v-if="updaterStore.checking" class="spin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M21 12a9 9 0 1 1-2.73-6.44" />
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span>{{ updaterStore.checking ? '检查中...' : '立即检查' }}</span>
          </button>
        </div>
      </div>

      <!-- 发现新版本卡片 -->
      <template v-if="updaterStore.hasUpdate && updaterStore.updateInfo">
        <div class="update-card-container">
          <div class="update-card">
            <!-- 右上角绝对定位的关闭按钮 -->
            <button class="update-close-btn" @click="updaterStore.dismissUpdate()" data-tooltip="关闭提示" data-tooltip-pos="bottom">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <!-- 卡片上部分：图标与标题 -->
            <div class="update-card-top">
              <div class="update-icon-wrapper">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
              <div class="header-titles">
                <div class="title-primary">
                  发现新版本
                  <span class="version-pill">v{{ updaterStore.updateInfo.version }}</span>
                </div>
                <div class="title-secondary">
                  当前版本 v{{ updaterStore.updateInfo.currentVersion }}
                </div>
              </div>
            </div>

            <!-- 卡片中部分：更新日志 -->
            <div class="update-notes-wrapper" v-if="updaterStore.updateInfo.notes">
              <div class="notes-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"/>
                  <line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/>
                  <line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
                详细更新内容
              </div>
              <div class="update-notes-scroller">
                <div class="update-notes-body md-notes" v-html="renderedUpdateNotes" />
              </div>
            </div>

            <!-- 卡片底部：操作与进度条 -->
            <div class="update-card-bottom">
              <div class="footer-left">
                <div v-if="updaterStore.downloading" class="progress-container">
                  <span class="progress-status">
                    正在下载包...
                    <template v-if="updaterStore.downloadTotalBytes > 0">
                      {{ formatBytes(Math.round(updaterStore.downloadTotalBytes * updaterStore.downloadProgress / 100)) }}
                      / {{ formatBytes(updaterStore.downloadTotalBytes) }}
                    </template>
                    ({{ updaterStore.downloadProgress }}%)
                  </span>
                  <div class="progress-bar-bg">
                    <div class="progress-bar-fill" :style="{ width: updaterStore.downloadProgress + '%' }" />
                  </div>
                </div>
              </div>
              <div class="footer-right">
                <button
                  v-if="!updaterStore.downloading"
                  class="action-btn text-btn"
                  @click="updaterStore.dismissUpdate()"
                >
                  稍后提醒
                </button>
                <button
                  class="action-btn install-btn"
                  :disabled="updaterStore.downloading"
                  @click="updaterStore.downloadAndInstall()"
                >
                  <svg v-if="updaterStore.downloading" class="spin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M21 12a9 9 0 1 1-2.73-6.44" />
                  </svg>
                  <span>{{ updaterStore.downloading ? '下载中...' : '下载并安装' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 错误信息 -->
      <div v-if="updaterStore.updateError" class="update-error">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{{ updaterStore.updateError }}</span>
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
          <span class="about-value">{{ updaterStore.getCurrentVersion() }}</span>
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

/* ═══ 应用更新 ═══ */
.update-check-actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-shrink: 0;
}

/* 按钮通用样式 */
.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: 10px 20px;
  border-radius: var(--radius-md);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  appearance: none;
  border: 1px solid transparent;
  transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
  font-family: inherit;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(0.8);
}

.action-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px oklch(from var(--color-accent) l c h / 0.3);
}

.action-btn:not(:disabled):active {
  transform: translateY(1px) scale(0.97);
}

/* 立即检查 / 主按钮 */
.primary-btn {
  background: var(--color-accent);
  color: #ffffff; /* 强制白色，防止在亮/暗色模式下被覆盖 */
  box-shadow: 0 2px 4px oklch(from var(--color-accent) l c h / 0.2),
              inset 0 1px 1px oklch(from var(--color-accent) 0.9 c h / 0.4);
}

@media (hover: hover) {
  .primary-btn:not(:disabled):hover {
    filter: brightness(1.1);
    box-shadow: 0 4px 12px oklch(from var(--color-accent) l c h / 0.3),
                inset 0 1px 1px oklch(from var(--color-accent) 0.9 c h / 0.5);
    transform: translateY(-1px);
  }
}

/* 稍后提醒 / 取消按钮 */
.cancel-btn {
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

@media (hover: hover) {
  .cancel-btn:hover {
    color: var(--color-text-primary);
    background: var(--color-bg-hover);
    border-color: var(--color-border-strong);
  }
}

/* 下载并安装按钮 */
.install-btn {
  background: var(--color-accent);
  color: #ffffff; 
  padding: 10px 24px;
  box-shadow: 0 4px 12px oklch(from var(--color-accent) l c h / 0.25),
              inset 0 1px 2px rgba(255, 255, 255, 0.2);
}

@media (hover: hover) {
  .install-btn:not(:disabled):hover {
    filter: brightness(1.15);
    box-shadow: 0 6px 16px oklch(from var(--color-accent) l c h / 0.35),
                inset 0 1px 2px rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }
}


/* 新版更新卡片外层 */
.update-card-container {
  padding: var(--space-4) 0 0 0;
  background: transparent;
}

.update-card {
  position: relative;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-sm), 0 10px 40px oklch(from var(--color-accent) l c h / 0.05);
  display: flex;
  flex-direction: column;
}

.update-close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  color: var(--color-text-tertiary);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .update-close-btn:hover {
    color: var(--color-text-secondary);
    background: var(--color-bg-hover);
    border-color: var(--color-border);
  }
}

.update-close-btn:active {
  transform: scale(0.95);
}

/* 卡片上部布局 */
.update-card-top {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: 24px 24px 16px 24px;
}

/* 缩小图标区域 */
.update-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, oklch(from var(--color-accent) l c h / 0.1), oklch(from var(--color-accent) l c h / 0.15));
  color: var(--color-accent);
  flex-shrink: 0;
  border: 1px solid oklch(from var(--color-accent) l c h / 0.15);
  box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.05);
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 4px; /* 标题之间的呼吸间隙 */
}

.title-primary {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: 1.15rem; /* 增大主标题字号 */
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: 0.01em;
}

.version-pill {
  background: var(--color-accent);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  letter-spacing: 0;
  box-shadow: inset 0 -1px 1px rgba(0,0,0,0.1);
}

.title-secondary {
  font-size: 0.85rem;
  color: var(--color-text-tertiary);
}

/* 日志框 */
.update-notes-wrapper {
  margin: 0 24px 20px 24px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.notes-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 12px 16px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-bg-elevated);
  border-bottom: 1px solid var(--color-border);
}

.update-notes-scroller {
  max-height: 220px;
  overflow-y: auto;
  padding: 16px 20px 20px 24px;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border-strong) transparent;
}

.update-notes-scroller::-webkit-scrollbar {
  width: 6px;
}
.update-notes-scroller::-webkit-scrollbar-track {
  background: transparent;
}
.update-notes-scroller::-webkit-scrollbar-thumb {
  background-color: var(--color-border-strong);
  border-radius: var(--radius-full);
}
.update-notes-scroller::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-text-tertiary);
}

.update-notes-body {
  font-family: var(--font-sans);
  font-size: 0.88rem;
  line-height: 1.75;
  color: var(--color-text-secondary);
  word-break: break-word;
  margin: 0;
}

/* Markdown 渲染后的内部元素样式 */
.md-notes :deep(h1),
.md-notes :deep(h2),
.md-notes :deep(h3) {
  color: var(--color-text-primary);
  font-weight: 700;
  margin-top: var(--space-4);
  margin-bottom: var(--space-2);
  line-height: 1.3;
}
.md-notes :deep(h1) { font-size: 1.1rem; }
.md-notes :deep(h2) { font-size: 1rem; }
.md-notes :deep(h3) { font-size: 0.92rem; }

.md-notes :deep(p) {
  margin-bottom: var(--space-2);
}

.md-notes :deep(ul),
.md-notes :deep(ol) {
  padding-left: var(--space-5);
  margin: var(--space-2) 0;
}
.md-notes :deep(ul) { list-style: disc; }
.md-notes :deep(ol) { list-style: decimal; }

.md-notes :deep(li) {
  margin-bottom: var(--space-1);
}

.md-notes :deep(code) {
  font-family: var(--font-mono);
  background: var(--color-bg-primary);
  padding: 0.1em 0.35em;
  border-radius: var(--radius-sm);
  font-size: 0.85em;
}

.md-notes :deep(strong) {
  font-weight: 700;
  color: var(--color-text-primary);
}

.md-notes :deep(a) {
  color: var(--color-accent-text);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.md-notes :deep(hr) {
  border: none;
  border-top: 1px solid var(--color-divider);
  margin: var(--space-3) 0;
}

.md-notes :deep(blockquote) {
  border-left: 3px solid var(--color-accent);
  padding-left: var(--space-3);
  margin: var(--space-2) 0;
  color: var(--color-text-tertiary);
  font-style: italic;
}

/* 卡片底部布局 */
.update-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--color-bg-elevated);
  border-top: 1px solid var(--color-divider);
}

.footer-left {
  flex: 1;
  display: flex;
  align-items: center;
}

.progress-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 100%;
  max-width: 200px;
}

.progress-status {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.progress-bar-bg {
  height: 6px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: var(--radius-full);
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.footer-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-left: auto;
}

/* 文字平级按钮 */
.text-btn {
  background: transparent;
  color: var(--color-text-tertiary);
  border: none;
  font-size: 0.85rem;
  padding: 8px 16px;
  transition: color 0.2s;
}

@media (hover: hover) {
  .text-btn:hover {
    color: var(--color-text-primary);
    background: var(--color-bg-hover);
  }
}

.text-btn:active {
  transform: scale(0.96);
}

/* 错误提示 */
.update-error {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-5) var(--space-6);
  margin: var(--space-4) var(--space-4) var(--space-4) var(--space-4);
  font-size: 0.85rem;
  font-weight: 500;
  line-height: 1.6;
  color: var(--color-danger);
  background: oklch(from var(--color-danger) l c h / 0.06);
  border: 1px solid oklch(from var(--color-danger) l c h / 0.2);
  border-radius: var(--radius-md);
}

.update-error svg {
  flex-shrink: 0;
  margin-top: 1px;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 响应式调整 */
@media (max-width: 680px) {
  .header-section {
    flex-direction: column;
    gap: var(--space-4);
  }
  
  .icon-close-btn {
    position: absolute;
    top: var(--space-4);
    right: var(--space-4);
  }
  
  .footer-section {
    flex-direction: column;
    gap: var(--space-4);
    align-items: stretch;
  }
  
  .progress-container {
    max-width: 100%;
  }
  
  .footer-right {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
