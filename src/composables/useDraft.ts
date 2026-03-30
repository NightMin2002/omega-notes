/**
 * useDraft — 草稿自动保存 composable
 * 使用 localStorage 持久化编辑中的内容，防止意外丢失
 */
import { ref, watch, onUnmounted, computed } from 'vue'

const DRAFT_PREFIX = 'omega-draft-'

export interface DraftData {
  title: string
  content: string
  category: string
  tags: string
  savedAt: string
}

/**
 * 创建一个草稿管理器
 * @param key 草稿唯一标识（如 'write-new', 'edit-{noteId}', 'quick-note'）
 */
export function useDraft(key: string) {
  const storageKey = DRAFT_PREFIX + key

  /* ─── 从 localStorage 读取已有草稿 ─── */
  function loadDraft(): DraftData | null {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) return JSON.parse(raw)
    } catch { /* ignore */ }
    return null
  }

  const existing = loadDraft()

  const draftTitle = ref(existing?.title ?? '')
  const draftContent = ref(existing?.content ?? '')
  const draftCategory = ref(existing?.category ?? '')
  const draftTags = ref(existing?.tags ?? '')

  /** 是否存在有内容的草稿 */
  const hasDraft = computed(() => {
    return !!(draftContent.value.trim() || draftTitle.value.trim())
  })

  /** 草稿是否从 localStorage 恢复而来 */
  const wasRestored = ref(!!existing && !!(existing.content.trim() || existing.title.trim()))

  /* ─── 防抖保存 ─── */
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  function saveDraft() {
    const data: DraftData = {
      title: draftTitle.value,
      content: draftContent.value,
      category: draftCategory.value,
      tags: draftTags.value,
      savedAt: new Date().toISOString(),
    }
    // 只有有实际内容时才保存
    if (data.content.trim() || data.title.trim()) {
      localStorage.setItem(storageKey, JSON.stringify(data))
    }
  }

  function debouncedSave() {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(saveDraft, 800)
  }

  // 监听所有字段变化，自动保存
  watch([draftTitle, draftContent, draftCategory, draftTags], () => {
    debouncedSave()
  })

  /** 清除草稿（保存成功后调用） */
  function clearDraft() {
    if (saveTimer) clearTimeout(saveTimer)
    localStorage.removeItem(storageKey)
    draftTitle.value = ''
    draftContent.value = ''
    draftCategory.value = ''
    draftTags.value = ''
    wasRestored.value = false
  }

  /** 手动触发立即保存 */
  function flushDraft() {
    if (saveTimer) clearTimeout(saveTimer)
    saveDraft()
  }

  onUnmounted(() => {
    if (saveTimer) clearTimeout(saveTimer)
    // 卸载时如果有内容，立即保存
    if (hasDraft.value) saveDraft()
  })

  return {
    draftTitle,
    draftContent,
    draftCategory,
    draftTags,
    hasDraft,
    wasRestored,
    clearDraft,
    flushDraft,
  }
}
