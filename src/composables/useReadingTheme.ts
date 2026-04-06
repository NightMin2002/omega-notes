import { ref, watch, onUnmounted } from 'vue'

const STORAGE_KEY = 'omega-reading-theme'
const CHANNEL_NAME = 'omega-reading-theme-channel'

export type ReadingTheme = 'aurora' | 'ink' | 'terminal' | 'parchment' | 'source'

export const themeOptions: { value: ReadingTheme; label: string; icon: string }[] = [
  { value: 'aurora',    label: '精读',   icon: 'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41' },
  { value: 'ink',       label: '笔墨',   icon: 'M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.586 7.586M11 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
  { value: 'terminal',  label: '终端',   icon: 'M4 17l6-6-6-6M12 19h8' },
  { value: 'parchment', label: '羊皮纸', icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' },
  { value: 'source',    label: '源码',   icon: 'M16 18l6-6-6-6M8 6l-6 6 6 6' },
]

/**
 * 阅读主题共享状态 — 跨组件 & 跨窗口同步
 */
export function useReadingTheme() {
  const theme = ref<ReadingTheme>(
    (localStorage.getItem(STORAGE_KEY) as ReadingTheme) || 'aurora'
  )

  const channel = new BroadcastChannel(CHANNEL_NAME)

  // 本地变更 → 持久化 + 广播
  watch(theme, (val) => {
    localStorage.setItem(STORAGE_KEY, val)
    channel.postMessage({ theme: val })
  })

  // 接收其他窗口的广播
  function onMessage(e: MessageEvent) {
    if (e.data?.theme && e.data.theme !== theme.value) {
      theme.value = e.data.theme
    }
  }
  channel.addEventListener('message', onMessage)

  onUnmounted(() => {
    channel.removeEventListener('message', onMessage)
    channel.close()
  })

  return { readingTheme: theme }
}
