import './assets/styles/variables.css'
import './assets/styles/reset.css'
import 'katex/dist/katex.min.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useNotesStore } from './stores/notes'
import { useSettingsStore } from './stores/settings'
import { registerGlobalShortcuts } from './utils/shortcuts'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')

// 挂载后异步初始化
const notesStore = useNotesStore()
notesStore.init()

const settingsStore = useSettingsStore()
settingsStore.init()

registerGlobalShortcuts(router)
