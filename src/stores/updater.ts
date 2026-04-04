/**
 * Ω Notes — 应用更新状态管理
 *
 * 检测新版本、展示更新日志、下载安装、忽略版本
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { isTauri } from '../utils/storage'

declare const __APP_VERSION__: string

export interface UpdateInfo {
  version: string
  notes: string         // 更新说明（来自 latest.json 的 notes 字段）
  date: string          // 发布日期
  currentVersion: string
}

export const useUpdaterStore = defineStore('updater', () => {
  const hasUpdate = ref(false)
  const updateInfo = ref<UpdateInfo | null>(null)
  const checking = ref(false)
  const downloading = ref(false)
  const downloadProgress = ref(0)
  const updateError = ref('')

  // 用户主动忽略的版本号
  const dismissedVersion = ref(
    localStorage.getItem('omega-dismissed-update') || ''
  )

  /** 检查更新（silent = true 时不弹出错误提示） */
  async function checkForUpdates(silent = true) {
    if (!isTauri() || checking.value) return
    checking.value = true
    updateError.value = ''
    try {
      const { check } = await import('@tauri-apps/plugin-updater')
      const update = await check()
      if (update) {
        updateInfo.value = {
          version: update.version,
          notes: update.body ?? '',
          date: update.date ?? '',
          currentVersion: __APP_VERSION__,
        }
        // 如果用户已忽略此版本则不亮红点
        hasUpdate.value = update.version !== dismissedVersion.value
      } else {
        hasUpdate.value = false
        updateInfo.value = null
      }
    } catch (e: any) {
      if (!silent) {
        updateError.value = e?.message || '检查更新失败，请检查网络连接'
      }
      console.warn('[Omega Updater] 检查更新失败:', e)
    } finally {
      checking.value = false
    }
  }

  /** 下载并安装更新 */
  async function downloadAndInstall() {
    if (!isTauri() || downloading.value) return
    downloading.value = true
    downloadProgress.value = 0
    updateError.value = ''
    try {
      const { check } = await import('@tauri-apps/plugin-updater')
      const { relaunch } = await import('@tauri-apps/plugin-process')
      const update = await check()
      if (update) {
        let totalLength = 0
        let downloaded = 0
        await update.downloadAndInstall((event) => {
          if (event.event === 'Started' && event.data.contentLength) {
            totalLength = event.data.contentLength
          } else if (event.event === 'Progress') {
            downloaded += event.data.chunkLength
            if (totalLength > 0) {
              downloadProgress.value = Math.round((downloaded / totalLength) * 100)
            }
          } else if (event.event === 'Finished') {
            downloadProgress.value = 100
          }
        })
        // 重启应用以完成更新
        await relaunch()
      }
    } catch (e: any) {
      updateError.value = e?.message || '下载更新失败'
      console.error('[Omega Updater] 安装失败:', e)
    } finally {
      downloading.value = false
    }
  }

  /** 忽略此版本（不再提示） */
  function dismissUpdate() {
    if (updateInfo.value) {
      dismissedVersion.value = updateInfo.value.version
      localStorage.setItem('omega-dismissed-update', updateInfo.value.version)
    }
    hasUpdate.value = false
  }

  /** 获取当前运行版本 */
  function getCurrentVersion(): string {
    return __APP_VERSION__
  }

  return {
    hasUpdate,
    updateInfo,
    checking,
    downloading,
    downloadProgress,
    updateError,
    checkForUpdates,
    downloadAndInstall,
    dismissUpdate,
    getCurrentVersion,
  }
})
