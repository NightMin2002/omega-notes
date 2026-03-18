/**
 * Ω Notes V2 — 全局快捷键
 *
 * Tauri 环境下注册系统级全局快捷键
 * 浏览器环境下静默跳过
 */
import { isTauri } from '@/utils/storage'
import type { Router } from 'vue-router'

export async function registerGlobalShortcuts(router: Router): Promise<void> {
  if (!isTauri()) return

  try {
    const { register } = await import('@tauri-apps/plugin-global-shortcut')
    const { getCurrentWindow } = await import('@tauri-apps/api/window')

    // Ctrl+Shift+N — 新建笔记
    await register('CommandOrControl+Shift+N', async (event) => {
      if (event.state === 'Pressed') {
        const win = getCurrentWindow()
        await win.show()
        await win.setFocus()
        router.push('/write')
      }
    })

    // Ctrl+Shift+O — 显示/聚焦窗口
    await register('CommandOrControl+Shift+O', async (event) => {
      if (event.state === 'Pressed') {
        const win = getCurrentWindow()
        await win.show()
        await win.setFocus()
      }
    })

    console.log('全局快捷键注册完毕')
  } catch (e) {
    console.warn('全局快捷键注册失败:', e)
  }
}
