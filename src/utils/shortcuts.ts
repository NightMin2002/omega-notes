/**
 * Ω Notes V2 — 全局快捷键
 *
 * Tauri 环境下注册系统级全局快捷键
 * 浏览器环境下静默跳过
 */
import { isTauri } from '@/utils/storage'
import type { Router } from 'vue-router'
import { useShortcutsStore } from '@/stores/shortcuts'

function formatTauriShortcut(keys: string[]): string {
  return keys.map(k => {
    if (k === 'ctrl') return 'CommandOrControl'
    if (k === 'shift') return 'Shift'
    if (k === 'alt') return 'Alt'
    if (k === 'meta') return 'Super'
    return k.charAt(0).toUpperCase() + k.slice(1)
  }).join('+')
}

export async function registerGlobalShortcuts(router: Router): Promise<void> {
  if (!isTauri()) return

  try {
    const { register, unregisterAll } = await import('@tauri-apps/plugin-global-shortcut')
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const store = useShortcutsStore()

    /* 先清除所有已注册的快捷键（防止 HMR 热更新导致重复注册） */
    await unregisterAll()

    const newNoteShortcut = store.getShortcut('global-new-note')
    if (newNoteShortcut && newNoteShortcut.enabled && newNoteShortcut.currentKeys.length > 0) {
      await register(formatTauriShortcut(newNoteShortcut.currentKeys), async (event) => {
        if (event.state === 'Pressed') {
          const win = getCurrentWindow()
          await win.show()
          await win.setFocus()
          router.push('/write')
        }
      })
    }

    const showWindowShortcut = store.getShortcut('global-show-window')
    if (showWindowShortcut && showWindowShortcut.enabled && showWindowShortcut.currentKeys.length > 0) {
      await register(formatTauriShortcut(showWindowShortcut.currentKeys), async (event) => {
        if (event.state === 'Pressed') {
          const win = getCurrentWindow()
          await win.show()
          await win.setFocus()
        }
      })
    }

    console.log('全局快捷键动态注册完毕')
  } catch (e) {
    console.warn('全局快捷键注册失败:', e)
  }
}

