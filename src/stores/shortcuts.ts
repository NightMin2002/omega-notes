import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ShortcutDefinition } from '@/types'

const STORAGE_KEY = 'omega-shortcuts'

// 预设的所有快捷键
const defaultShortcuts: ShortcutDefinition[] = [
  // ─── 全局快捷键（Tauri级别） ───
  {
    id: 'global-new-note',
    name: '全局新建笔记',
    description: '在应用失去焦点时依然可以唤起并新建笔记',
    defaultKeys: ['ctrl', 'shift', 'n'],
    currentKeys: ['ctrl', 'shift', 'n'],
    enabled: true,
    isGlobal: true
  },
  {
    id: 'global-show-window',
    name: '显示/隐藏主窗口',
    description: '全局切换主窗口的可见性',
    defaultKeys: ['ctrl', 'shift', 'o'],
    currentKeys: ['ctrl', 'shift', 'o'],
    enabled: true,
    isGlobal: true
  },

  // ─── 应用内快捷键 ───
  {
    id: 'app-search',
    name: '全局搜索',
    description: '打开或关闭搜索面板',
    defaultKeys: ['ctrl', 'k'],
    currentKeys: ['ctrl', 'k'],
    enabled: true,
    isGlobal: false
  },
  {
    id: 'app-quick-note',
    name: '快速笔记',
    description: '打开或关闭快速笔记弹窗',
    defaultKeys: ['ctrl', 'q'],
    currentKeys: ['ctrl', 'q'],
    enabled: true,
    isGlobal: false
  },
  {
    id: 'app-save-quick',
    name: '保存当前快速笔记',
    description: '保存并关掉快速笔记',
    defaultKeys: ['ctrl', 'enter'],
    currentKeys: ['ctrl', 'enter'],
    enabled: true,
    isGlobal: false
  },
  {
    id: 'app-save-note',
    name: '保存编辑中的笔记',
    description: '在知识库笔记或新建笔记时按此保存',
    defaultKeys: ['ctrl', 's'],
    currentKeys: ['ctrl', 's'],
    enabled: true,
    isGlobal: false
  },
  {
    id: 'app-go-home',
    name: '返回效率主页',
    description: '跳转到应用首页主页',
    defaultKeys: ['alt', 'h'],
    currentKeys: ['alt', 'h'],
    enabled: true,
    isGlobal: false
  },
  {
    id: 'app-go-kb',
    name: '前往知识库',
    description: '跳转到知识库总览页',
    defaultKeys: ['alt', 'k'],
    currentKeys: ['alt', 'k'],
    enabled: true,
    isGlobal: false
  },
  {
    id: 'app-go-todos',
    name: '前往待办事项',
    description: '跳转到待办事项面板',
    defaultKeys: ['alt', 't'],
    currentKeys: ['alt', 't'],
    enabled: true,
    isGlobal: false
  },
  {
    id: 'app-go-settings',
    name: '打开设置',
    description: '跳转到设置页面',
    defaultKeys: ['alt', 's'],
    currentKeys: ['alt', 's'],
    enabled: true,
    isGlobal: false
  }
]

export const useShortcutsStore = defineStore('shortcuts', () => {
  // state
  const shortcuts = ref<ShortcutDefinition[]>([])

  // 初始化加载
  function init() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Partial<ShortcutDefinition>[]
        
        // 合并：防止有新加的快捷键未能出现
        shortcuts.value = defaultShortcuts.map(def => {
          const findSaved = saved.find(s => s.id === def.id)
          if (findSaved) {
            return {
              ...def,
              currentKeys: findSaved.currentKeys || def.defaultKeys,
              enabled: findSaved.enabled ?? def.enabled
            }
          }
          return { ...def }
        })
      } else {
        shortcuts.value = JSON.parse(JSON.stringify(defaultShortcuts))
      }
    } catch {
      shortcuts.value = JSON.parse(JSON.stringify(defaultShortcuts))
    }
  }

  // 持久化
  function persist() {
    // 没必要保存名字和描述，只要id、keys和enabled即可
    const dataToSave = shortcuts.value.map(s => ({
      id: s.id,
      currentKeys: s.currentKeys,
      enabled: s.enabled
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
  }

  // getters
  const globalShortcuts = computed(() => shortcuts.value.filter(s => s.isGlobal))
  const appShortcuts = computed(() => shortcuts.value.filter(s => !s.isGlobal))

  // 根据 ID 获取快捷键是否触发
  function getShortcut(id: string): ShortcutDefinition | undefined {
    return shortcuts.value.find(s => s.id === id)
  }

  // actions
  function updateShortcut(id: string, newKeys: string[]) {
    const s = getShortcut(id)
    if (s) {
      s.currentKeys = [...newKeys]
      persist()
    }
  }

  function toggleShortcut(id: string) {
    const s = getShortcut(id)
    if (s) {
      s.enabled = !s.enabled
      persist()
    }
  }

  function resetToDefault(id: string) {
    const s = getShortcut(id)
    if (s) {
      s.currentKeys = [...s.defaultKeys]
      persist()
    }
  }

  function resetAll() {
    shortcuts.value = JSON.parse(JSON.stringify(defaultShortcuts))
    persist()
  }

  // 组件加载时自动初始化
  init()

  return {
    shortcuts,
    globalShortcuts,
    appShortcuts,
    getShortcut,
    updateShortcut,
    toggleShortcut,
    resetToDefault,
    resetAll
  }
})
