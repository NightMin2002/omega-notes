/**
 * Ω Notes V2 — 主题 Store
 * 管理暗色/亮色主题切换，持久化至 localStorage
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const THEME_KEY = 'omega-theme'

export type Theme = 'dark' | 'light'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>(getInitialTheme())

  function getInitialTheme(): Theme {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null
    if (saved === 'dark' || saved === 'light') return saved
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light'
    return 'dark'
  }

  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  // 响应式同步到 DOM
  watch(theme, (val) => {
    document.documentElement.dataset.theme = val
    localStorage.setItem(THEME_KEY, val)
  }, { immediate: true })

  return { theme, toggle }
})
