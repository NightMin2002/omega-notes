import { useShortcutsStore } from '@/stores/shortcuts'

export function useAppShortcuts() {
  const store = useShortcutsStore()

  /**
   * 检查当前的键盘事件是否匹配指定的快捷键 ID
   * @param e 键盘事件
   * @param id 快捷键定义记录的 ID
   * @returns 是否匹配
   */
  function matchShortcut(e: KeyboardEvent, id: string): boolean {
    const s = store.getShortcut(id)
    if (!s || !s.enabled || !s.currentKeys || s.currentKeys.length === 0) return false

    // 平台统一：Mac 上 command 被认为是 metaKey，Windows 下是 ctrlKey
    const isCtrl = e.ctrlKey || e.metaKey
    const isShift = e.shiftKey
    const isAlt = e.altKey
    const key = e.key.toLowerCase()

    // 检查修饰键是否严格一致
    const needsCtrl = s.currentKeys.includes('ctrl')
    const needsShift = s.currentKeys.includes('shift')
    const needsAlt = s.currentKeys.includes('alt')
    
    if (needsCtrl !== isCtrl) return false
    if (needsShift !== isShift) return false
    if (needsAlt !== isAlt) return false

    // 找出目标普通键（排除修饰键）
    const targetKey = s.currentKeys.find(k => !['ctrl', 'shift', 'alt', 'meta'].includes(k))
    
    // 如果没有普通键（纯修饰键绑定，通常不建议），暂不当做匹配
    if (!targetKey) return false

    // 如果按下的是修饰键本身（例如用户刚刚按下 Ctrl，还没按字母），此时 e.key 是 'control'，过滤掉
    if (['control', 'shift', 'alt', 'meta'].includes(key)) return false

    if (key === targetKey) {
      return true
    }
    
    return false
  }

  /**
   * 辅助工具：将从 KeyboardEvent 中获取的键转换为存储格式数组
   */
  function parseEventToKeys(e: KeyboardEvent): string[] {
    const keys: string[] = []
    if (e.ctrlKey || e.metaKey) keys.push('ctrl')
    if (e.shiftKey) keys.push('shift')
    if (e.altKey) keys.push('alt')

    const key = e.key.toLowerCase()
    if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
      keys.push(key)
    }

    return keys
  }

  /**
   * 辅助工具：格式化 keys 数组为可读字符串（用于 UI 展示）
   */
  function formatKeysForDisplay(keys: string[]): string {
    return keys.map(k => {
      if (k === 'ctrl') return 'Ctrl'
      if (k === 'shift') return 'Shift'
      if (k === 'alt') return 'Alt'
      if (k === 'meta') return 'Super'
      if (k === ' ') return 'Space'
      return k.charAt(0).toUpperCase() + k.slice(1)
    }).join(' + ')
  }

  return { 
    matchShortcut,
    parseEventToKeys,
    formatKeysForDisplay
  }
}
