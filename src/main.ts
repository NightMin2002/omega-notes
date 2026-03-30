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
import { registerGlobalShortcuts } from './utils/shortcuts'
import { startScheduler } from './utils/scheduler'

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
startScheduler()
