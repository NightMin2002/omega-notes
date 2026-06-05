<script setup lang="ts">
import { useRouter } from 'vue-router'
import { setAppModeOverride } from '../../composables/useAppMode'
import { useSettingsStore } from '../../stores/settings'
import { useThemeStore, type Theme } from '../../stores/theme'
import type { EditorMode, FontFamily } from '../../types'

const router = useRouter()
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()

const themeOptions: { value: Theme; label: string; description: string }[] = [
  { value: 'dark', label: '暗色', description: '低亮度界面' },
  { value: 'light', label: '亮色', description: '日间阅读' },
  { value: 'warm-gray', label: '暖墨灰', description: '中性护眼' },
  { value: 'sepia', label: '羊皮纸', description: '暖色阅读' },
]

const fontOptions: { value: FontFamily; label: string }[] = [
  { value: 'system', label: '系统字体' },
  { value: 'inter', label: 'Inter' },
  { value: 'noto-sans-sc', label: 'Noto Sans SC' },
]

const editorOptions: { value: EditorMode; label: string }[] = [
  { value: 'wysiwyg', label: '所见即所得' },
  { value: 'split', label: '分屏编辑' },
]

const cleanOptions = [
  { value: 0, label: '不自动清理' },
  { value: 7, label: '7 天' },
  { value: 30, label: '30 天' },
  { value: 90, label: '90 天' },
]

function switchToDesktop() {
  setAppModeOverride('desktop')
  router.replace('/settings')
}
</script>

<template>
  <section class="mobile-settings-page">
    <div class="settings-scroll">
      <section class="settings-section">
        <h2>主题</h2>
        <div class="option-grid">
          <button
            v-for="item in themeOptions"
            :key="item.value"
            type="button"
            class="theme-option"
            :class="{ active: themeStore.theme === item.value }"
            @click="themeStore.setTheme(item.value)"
          >
            <span>{{ item.label }}</span>
            <small>{{ item.description }}</small>
          </button>
        </div>
      </section>

      <section class="settings-section">
        <h2>字体</h2>
        <div class="option-list">
          <button
            v-for="item in fontOptions"
            :key="item.value"
            type="button"
            :class="{ active: settingsStore.fontFamily === item.value }"
            @click="settingsStore.setFontFamily(item.value)"
          >
            <span>{{ item.label }}</span>
            <svg v-if="settingsStore.fontFamily === item.value" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </button>
        </div>
      </section>

      <section class="settings-section">
        <h2>编辑器偏好</h2>
        <div class="option-list">
          <button
            v-for="item in editorOptions"
            :key="item.value"
            type="button"
            :class="{ active: settingsStore.defaultEditorMode === item.value }"
            @click="settingsStore.setDefaultEditorMode(item.value)"
          >
            <span>{{ item.label }}</span>
            <svg v-if="settingsStore.defaultEditorMode === item.value" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </button>
        </div>
      </section>

      <section class="settings-section">
        <h2>回收站清理</h2>
        <div class="clean-options">
          <button
            v-for="item in cleanOptions"
            :key="item.value"
            type="button"
            :class="{ active: settingsStore.trashAutoCleanDays === item.value }"
            @click="settingsStore.setTrashAutoCleanDays(item.value)"
          >
            {{ item.label }}
          </button>
        </div>
      </section>

      <section class="settings-section">
        <h2>模式</h2>
        <button type="button" class="desktop-switch" @click="switchToDesktop">
          <span>
            <strong>桌面模式</strong>
            <small>返回完整桌面端界面</small>
          </span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="13" rx="2" />
            <path d="M8 21h8" />
            <path d="M12 17v4" />
          </svg>
        </button>
      </section>
    </div>
  </section>
</template>

<style scoped>
.mobile-settings-page {
  height: 100%;
  overflow: hidden;
}

.settings-scroll {
  height: 100%;
  overflow-y: auto;
  padding: 14px 14px 96px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.settings-section {
  padding: 15px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.settings-section h2 {
  margin: 0 0 12px;
  color: var(--color-text-primary);
  font-size: 0.95rem;
  line-height: 1.35;
}

.option-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.theme-option {
  min-width: 0;
  min-height: 72px;
  padding: 11px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 5px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
  text-align: left;
}

.theme-option span {
  color: var(--color-text-primary);
  font-size: 0.86rem;
  font-weight: 800;
}

.theme-option small {
  color: var(--color-text-tertiary);
  font-size: 0.72rem;
}

.theme-option.active {
  border-color: var(--color-accent);
  background: var(--color-accent-muted);
}

.option-list {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.option-list button {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 12px;
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  font-weight: 750;
  text-align: left;
}

.option-list button + button {
  border-top: 1px solid var(--color-divider);
}

.option-list button.active {
  color: var(--color-accent-text);
}

.clean-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.clean-options button {
  min-height: 40px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  font-size: 0.82rem;
  font-weight: 800;
}

.clean-options button.active {
  color: var(--color-accent-text);
  border-color: var(--color-accent);
  background: var(--color-accent-muted);
}

.desktop-switch {
  width: 100%;
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 13px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  background: var(--color-bg-tertiary);
  text-align: left;
}

.desktop-switch span {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.desktop-switch strong {
  font-size: 0.9rem;
}

.desktop-switch small {
  color: var(--color-text-tertiary);
  font-size: 0.74rem;
}
</style>
