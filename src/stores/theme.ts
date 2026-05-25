/**
 * Ω Notes V2 — 主题 Store
 * 管理暗色/亮色主题切换，持久化至 localStorage
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const THEME_KEY = 'omega-theme'

export type Theme = 'dark' | 'light' | 'warm-gray' | 'sepia'

const VALID_THEMES: Theme[] = ['dark', 'light', 'warm-gray', 'sepia']

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>(getInitialTheme())

  function getInitialTheme(): Theme {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null
    if (saved && VALID_THEMES.includes(saved)) return saved
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light'
    return 'dark'
  }

  function toggle() {
    const nextIndex = (VALID_THEMES.indexOf(theme.value) + 1) % VALID_THEMES.length
    theme.value = VALID_THEMES[nextIndex] as Theme
  }

  function setTheme(newTheme: Theme) {
    if (VALID_THEMES.includes(newTheme)) {
      theme.value = newTheme
    }
  }

  // 响应式同步到 DOM
  watch(theme, (val) => {
    document.documentElement.dataset.theme = val
    localStorage.setItem(THEME_KEY, val)
  }, { immediate: true })

  // 跨窗口同步监听（解决多 Webview 间状态不同步的问题）
  window.addEventListener('storage', (e) => {
    if (e.key === THEME_KEY && e.newValue && VALID_THEMES.includes(e.newValue as Theme)) {
      theme.value = e.newValue as Theme
    }
  })

  return { theme, toggle, setTheme }
})

