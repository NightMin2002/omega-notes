/**
 * Ω Notes — 应用更新状态管理
 *
 * 检测新版本、展示更新日志、下载安装、忽略版本
 *
 * 更新检查策略：
 *   1. 预检竞速：同时向 GitHub 原始 + ghfast 镜像发起 latest.json 请求
 *   2. 取先到者的数据用于展示版本与更新日志
 *   3. Tauri check() 走配置端点的顺序 fallback（timeout 收紧为 10s）
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { isTauri } from '../utils/storage'

declare const __APP_VERSION__: string

/** latest.json 的端点列表（竞速用） */
const LATEST_JSON_ENDPOINTS = [
  'https://github.com/NightMin2002/omega-notes/releases/latest/download/latest.json',
  'https://ghfast.top/https://github.com/NightMin2002/omega-notes/releases/latest/download/latest.json',
]

export interface UpdateInfo {
  version: string
  notes: string         // 更新说明（来自 latest.json 的 notes 字段）
  date: string          // 发布日期
  currentVersion: string
}

/**
 * 竞速获取 latest.json
 * 同时请求所有端点，返回第一个成功的结果
 */
async function raceLatestJson(): Promise<{ version: string; notes: string; pub_date: string } | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000) // 全局 15s 上限

  try {
    // 手动竞速（避免 Promise.any 需要 ES2021 lib）
    type R = { version: string; notes: string; pub_date: string }

    return await new Promise<R | null>((resolve) => {
      let settled = false
      let failCount = 0
      const total = LATEST_JSON_ENDPOINTS.length

      LATEST_JSON_ENDPOINTS.forEach((url) => {
        fetch(url, { signal: controller.signal, cache: 'no-cache' })
          .then((resp) => {
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
            return resp.json() as Promise<R>
          })
          .then((data) => {
            if (!settled) { settled = true; resolve(data) }
          })
          .catch(() => {
            failCount++
            if (failCount >= total && !settled) { settled = true; resolve(null) }
          })
      })
    })
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * 比较语义化版本号
 * 返回 true 表示 remote 比 local 新
 */
function isNewerVersion(remote: string, local: string): boolean {
  const r = remote.replace(/^v/, '').split('.').map(Number)
  const l = local.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    const rv = r[i] ?? 0
    const lv = l[i] ?? 0
    if (rv > lv) return true
    if (rv < lv) return false
  }
  return false
}

export const useUpdaterStore = defineStore('updater', () => {
  const hasUpdate = ref(false)
  const updateInfo = ref<UpdateInfo | null>(null)
  const checking = ref(false)
  const downloading = ref(false)
  const downloadProgress = ref(0)
  const downloadTotalBytes = ref(0)
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
      // ── Step 1: 竞速预检 ──
      // 同时请求两个端点的 latest.json，取最快返回的结果
      // 这样无论国内还是海外用户，都能在几秒内拿到版本信息
      const latestData = await raceLatestJson()

      if (latestData && isNewerVersion(latestData.version, __APP_VERSION__)) {
        // 预检发现新版本 → 直接用预检数据填充 UI
        updateInfo.value = {
          version: latestData.version,
          notes: latestData.notes ?? '',
          date: latestData.pub_date ?? '',
          currentVersion: __APP_VERSION__,
        }
        hasUpdate.value = latestData.version !== dismissedVersion.value
      } else {
        // 预检未发现更新（或全部失败）→ 回退到 Tauri 原生 check
        // Tauri 会按 tauri.conf.json 的 endpoints 顺序逐个尝试
        const { check } = await import('@tauri-apps/plugin-updater')
        const update = await check({ timeout: 10000 })  // 10 秒超时
        if (update) {
          updateInfo.value = {
            version: update.version,
            notes: update.body ?? '',
            date: update.date ?? '',
            currentVersion: __APP_VERSION__,
          }
          hasUpdate.value = update.version !== dismissedVersion.value
        } else {
          hasUpdate.value = false
          updateInfo.value = null
        }
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
    downloadTotalBytes.value = 0
    updateError.value = ''
    try {
      const { check } = await import('@tauri-apps/plugin-updater')
      const { relaunch } = await import('@tauri-apps/plugin-process')
      const update = await check({ timeout: 15000 })  // 下载前再次 check，15s 超时
      if (update) {
        let totalLength = 0
        let downloaded = 0
        await update.downloadAndInstall((event) => {
          if (event.event === 'Started' && event.data.contentLength) {
            totalLength = event.data.contentLength
            downloadTotalBytes.value = totalLength
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
    updateInfo.value = null
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
    downloadTotalBytes,
    updateError,
    checkForUpdates,
    downloadAndInstall,
    dismissUpdate,
    getCurrentVersion,
  }
})
