import './assets/styles/variables.css'
import './assets/styles/reset.css'
import 'katex/dist/katex.min.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useNotesStore } from './stores/notes'
import { useSettingsStore } from './stores/settings'
import { useTasksStore } from './stores/tasks'
import { useUpdaterStore } from './stores/updater'
import { registerGlobalShortcuts } from './utils/shortcuts'
import { startScheduler } from './utils/scheduler'
import { isTauri } from './utils/storage'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')

// ─── 悬挂窗口路由跳转 ───
// Rust open_popout 通过 ?popout_route=/popout/tasks 传递目标路由
const urlParams = new URLSearchParams(window.location.search)
const popoutRoute = urlParams.get('popout_route')
if (popoutRoute) {
  router.replace(popoutRoute)
}

// 挂载后异步初始化
const notesStore = useNotesStore()
notesStore.init()

const settingsStore = useSettingsStore()
settingsStore.init()

const tasksStore = useTasksStore()
tasksStore.init()

registerGlobalShortcuts(router)
if (!popoutRoute) {
  startScheduler()
}

// ─── 自动更新检查 ───
if (isTauri() && !popoutRoute) {
  const updaterStore = useUpdaterStore()
  // 延迟 5 秒首次检查，避免与启动加载竞争
  setTimeout(() => updaterStore.checkForUpdates(true), 5000)
  // 每 4 小时定时巡检
  setInterval(() => updaterStore.checkForUpdates(true), 4 * 60 * 60 * 1000)
}

// ─── 全局禁用浏览器原生右键菜单 ───
document.addEventListener('contextmenu', (e) => {
  // 输入框/文本域保留右键（复制粘贴需要）
  const tag = (e.target as HTMLElement).tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  e.preventDefault()
}, true)

// ─── 全局拦截外部链接 ───
// 防止任何外部 URL 在 WebView 内导航，统一用系统浏览器打开
import { openUrl } from '@tauri-apps/plugin-opener'
document.addEventListener('click', (e) => {
  const anchor = (e.target as HTMLElement).closest('a') as HTMLAnchorElement | null
  if (!anchor) return
  const href = anchor.getAttribute('href') || anchor.href
  if (href && /^https?:\/\//i.test(href)) {
    e.preventDefault()
    e.stopPropagation()
    openUrl(href).catch((err) => {
      console.error('[Omega] openUrl failed:', err, '→ fallback window.open')
      window.open(href, '_blank')
    })
  }
}, true) // capture phase，确保在任何组件之前拦截

