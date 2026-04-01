/**
 * Ω Notes V2 — 笔记 Store
 * 管理笔记的 CRUD、分类、收藏、最近打开
 * Tauri 环境：文件系统持久化（AppData/notes/*.md）
 * 浏览器环境：localStorage 降级
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loadAllNotes, saveNote, deleteNoteFile, migrateFromLocalStorage } from '@/utils/storage'
import type { Note, FolderNode } from '@/types'

// re-export 保持向后兼容（已有 import { Note } from '@/stores/notes' 的文件无需改动）
export type { Note, FolderNode }

const RECENT_KEY = 'omega-recent-notes'
const RECENT_MAX = 20
const CUSTOM_CATEGORIES_KEY = 'omega-custom-categories'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function addCategoryPathAndParents(target: Set<string>, category: string) {
  const parts = category
    .split('/')
    .map(part => part.trim())
    .filter(Boolean)

  for (let i = 1; i <= parts.length; i++) {
    target.add(parts.slice(0, i).join('/'))
  }
}

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const currentCategory = ref<string>('all')
  const searchQuery = ref<string>('')
  const isLoading = ref(true)
  const recentIds = ref<string[]>([])

  /** 用户手动创建的分类（笔记保存前就可见） */
  const customCategories = ref<string[]>(
    (() => {
      try {
        const raw = localStorage.getItem(CUSTOM_CATEGORIES_KEY)
        return raw ? JSON.parse(raw) : []
      } catch { return [] }
    })()
  )

  /** ID → Note 映射表（O(1) 查找） */
  const noteMap = computed(() => {
    const map = new Map<string, Note>()
    for (const n of notes.value) map.set(n.id, n)
    return map
  })

  // ─── 初始化：从存储加载 ───
  async function init() {
    isLoading.value = true
    try {
      // 加载最近打开列表
      try {
        const raw = localStorage.getItem(RECENT_KEY)
        recentIds.value = raw ? JSON.parse(raw) : []
      } catch {
        recentIds.value = []
      }

      // 先尝试迁移旧 localStorage 数据
      await migrateFromLocalStorage()
      // 然后从存储加载
      notes.value = await loadAllNotes()

      // 回收站自动清理
      await autoCleanTrash()
    } catch (e) {
      console.error('加载笔记失败', e)
      notes.value = []
    } finally {
      isLoading.value = false
    }
  }

  /** 根据设置自动清理过期的已删除笔记 */
  async function autoCleanTrash() {
    try {
      const raw = localStorage.getItem('omega-settings')
      const days = raw ? (JSON.parse(raw).trashAutoCleanDays ?? 30) : 30
      if (days <= 0) return // 0 = 不自动清理

      const cutoff = Date.now() - days * 86400000
      const expired = notes.value.filter(n =>
        n.isDeleted && n.deletedAt && new Date(n.deletedAt).getTime() < cutoff
      )

      if (expired.length === 0) return

      for (const note of expired) {
        await deleteNoteFile(note.id)
      }
      notes.value = notes.value.filter(n =>
        !(n.isDeleted && n.deletedAt && new Date(n.deletedAt).getTime() < cutoff)
      )
      console.log(`回收站自动清理：删除 ${expired.length} 条过期笔记`)
    } catch (e) {
      console.warn('回收站自动清理失败', e)
    }
  }

  // ─── 计算属性 ───

  /** 未删除的活跃笔记 */
  const activeNotes = computed<Note[]>(() =>
    notes.value.filter(n => !n.isDeleted)
  )

  const categories = computed<string[]>(() => {
    const set = new Set<string>()
    /* 先加入笔记中已使用的分类 */
    for (const note of activeNotes.value) {
      if (note.category && note.category !== '回收站') set.add(note.category)
    }
    /* 再加入用户手动创建的分类 */
    for (const cat of customCategories.value) {
      set.add(cat)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
  })

  /** 添加自定义分类（立即持久化） */
  function addCustomCategory(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    if (!customCategories.value.includes(trimmed)) {
      customCategories.value.push(trimmed)
      localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(customCategories.value))
    }
  }

  /** 删除分类：将该分类（及其子分类）下的笔记移到「未分类」，然后移除自定义分类 */
  async function deleteCategory(categoryPath: string) {
    // 将该分类及子分类下的笔记移到「未分类」
    for (const note of notes.value) {
      if (note.category === categoryPath || note.category.startsWith(categoryPath + '/')) {
        note.category = '未分类'
        note.updatedAt = new Date().toISOString()
        await saveNote(note)
      }
    }
    // 从 customCategories 中移除该分类及其子分类
    customCategories.value = customCategories.value.filter(
      c => c !== categoryPath && !c.startsWith(categoryPath + '/')
    )
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(customCategories.value))
  }

  /** 从分类路径构建文件夹树 */
  const categoryTree = computed<FolderNode[]>(() => {
    /* 统计每个精确路径的直接笔记数 */
    const countMap = new Map<string, number>()
    for (const note of activeNotes.value) {
      const cat = note.category || '未分类'
      countMap.set(cat, (countMap.get(cat) || 0) + 1)
    }

    /* 收集所有路径（含中间路径 + 手动创建但暂未保存笔记的分类） */
    const allPaths = new Set<string>()
    for (const cat of countMap.keys()) {
      addCategoryPathAndParents(allPaths, cat)
    }
    for (const cat of customCategories.value) {
      addCategoryPathAndParents(allPaths, cat)
    }

    /* 构建树 */
    function buildChildren(parentPath: string): FolderNode[] {
      const children: FolderNode[] = []
      for (const path of allPaths) {
        const parts = path.split('/')
        const parentParts = parentPath ? parentPath.split('/') : []

        /* 只要直接子级 */
        if (parts.length !== parentParts.length + 1) continue
        if (parentPath && !path.startsWith(parentPath + '/')) continue
        if (!parentPath && parts.length !== 1) continue

        const directCount = countMap.get(path) || 0
        const node: FolderNode = {
          name: parts[parts.length - 1]!,
          fullPath: path,
          count: directCount,
          totalCount: 0,
          children: buildChildren(path),
        }
        /* 总数 = 直接 + 所有子级总数 */
        node.totalCount = directCount + node.children.reduce((s, c) => s + c.totalCount, 0)
        children.push(node)
      }
      return children.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
    }

    return buildChildren('')
  })

  const filteredNotes = computed<Note[]>(() => {
    let result = activeNotes.value

    // 按分类过滤
    if (currentCategory.value !== 'all') {
      result = result.filter(n =>
        n.category === currentCategory.value ||
        n.category.startsWith(currentCategory.value + '/')
      )
    }

    // 按搜索过滤
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q))
      )
    }

    // 排序：置顶 > sortOrder > 时间倒序（用新数组以触发 computed 响应性）
    return [...result].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      const sa = a.sortOrder ?? Infinity
      const sb = b.sortOrder ?? Infinity
      if (sa !== sb) return sa - sb
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  })

  const totalCount = computed(() => activeNotes.value.length)
  const pinnedCount = computed(() => activeNotes.value.filter(n => n.isPinned).length)
  const favoriteCount = computed(() => activeNotes.value.filter(n => n.isFavorite).length)

  /** 回收站笔记（按删除时间倒序） */
  const trashNotes = computed<Note[]>(() =>
    notes.value
      .filter(n => n.isDeleted)
      .sort((a, b) => new Date(b.deletedAt || 0).getTime() - new Date(a.deletedAt || 0).getTime())
  )

  const trashCount = computed(() => trashNotes.value.length)

  /** 全部标签（按使用频率降序） */
  const allTags = computed<{ name: string; count: number }[]>(() => {
    const map = new Map<string, number>()
    for (const note of activeNotes.value) {
      for (const tag of note.tags) {
        map.set(tag, (map.get(tag) || 0) + 1)
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  })

  const favoriteNotes = computed<Note[]>(() =>
    activeNotes.value
      .filter(n => n.isFavorite)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  )

  const recentNotes = computed<Note[]>(() => {
    const result: Note[] = []
    for (const id of recentIds.value) {
      const note = noteMap.value.get(id)
      if (note) result.push(note)
    }
    return result
  })

  // ─── Actions ───
  async function addNote(data: Partial<Note>): Promise<Note> {
    const now = new Date().toISOString()
    const note: Note = {
      id: generateId(),
      title: data.title || '',
      content: data.content || '',
      category: data.category || '未分类',
      tags: data.tags || [],
      createdAt: now,
      updatedAt: now,
      isPinned: false,
      isFavorite: false,
    }
    notes.value.unshift(note)
    await saveNote(note)
    return note
  }

  async function updateNote(id: string, updates: Partial<Note>) {
    const idx = noteMap.value.has(id) ? notes.value.indexOf(noteMap.value.get(id)!) : -1
    if (idx === -1) return
    const existing = notes.value[idx]!
    const updated: Note = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    }
    notes.value[idx] = updated
    await saveNote(updated)
  }

  /** 软删除笔记（移入回收站） */
  async function deleteNote(id: string) {
    const note = noteMap.value.get(id)
    if (!note) return
    note.isDeleted = true
    note.deletedAt = new Date().toISOString()
    await saveNote(note)
    // 同时从最近打开中移除
    recentIds.value = recentIds.value.filter(rid => rid !== id)
    localStorage.setItem(RECENT_KEY, JSON.stringify(recentIds.value))
  }

  /** 从回收站恢复笔记 */
  async function restoreNote(id: string) {
    const note = noteMap.value.get(id)
    if (!note) return
    note.isDeleted = false
    note.deletedAt = undefined
    await saveNote(note)
  }

  /** 永久删除笔记（物理删除文件） */
  async function permanentlyDelete(id: string) {
    notes.value = notes.value.filter(n => n.id !== id)
    await deleteNoteFile(id)
  }

  /** 清空回收站 */
  async function emptyTrash() {
    const trashIds = notes.value.filter(n => n.isDeleted).map(n => n.id)
    notes.value = notes.value.filter(n => !n.isDeleted)
    for (const id of trashIds) {
      await deleteNoteFile(id)
    }
  }

  async function togglePin(id: string) {
    const note = noteMap.value.get(id)
    if (note) {
      note.isPinned = !note.isPinned
      await saveNote(note)
    }
  }

  async function toggleFavorite(id: string) {
    const note = noteMap.value.get(id)
    if (note) {
      note.isFavorite = !note.isFavorite
      await saveNote(note)
    }
  }

  /** 记录一条笔记被打开 */
  function recordOpen(id: string) {
    recentIds.value = [id, ...recentIds.value.filter(rid => rid !== id)].slice(0, RECENT_MAX)
    localStorage.setItem(RECENT_KEY, JSON.stringify(recentIds.value))
  }

  function getNoteById(id: string): Note | undefined {
    return noteMap.value.get(id)
  }

  /** 按标题查找笔记（精确匹配，不区分大小写） */
  function findNoteByTitle(title: string): Note | undefined {
    const t = title.toLowerCase()
    return notes.value.find(n => n.title.toLowerCase() === t)
  }

  /** 获取引用指定笔记的所有反向链接（兼容 Milkdown 转义括号） */
  function getBacklinks(noteId: string): Note[] {
    const note = noteMap.value.get(noteId)
    if (!note || !note.title) return []
    const title = note.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    /* 匹配 [[title]] 或 \[\[title\]\] */
    const re = new RegExp(`\\\\?\\[\\\\?\\[${title}\\\\?\\]\\\\?\\]`)
    return notes.value.filter(n =>
      n.id !== noteId && re.test(n.content)
    )
  }

  /** 批量导入笔记（ID 重复则跳过；标题重复则添加后缀） */
  async function importBatch(items: Partial<Note>[]): Promise<number> {
    const existingIds = new Set(notes.value.map(n => n.id))
    /* 构建标题索引（包含回收站内笔记） */
    const existingTitles = new Set(
      notes.value.map(n => n.title.toLowerCase())
    )
    let imported = 0

    for (const item of items) {
      const id = item.id || generateId()
      if (existingIds.has(id)) continue

      let title = item.title || ''
      /* 如果标题已存在（含回收站），给标题加后缀 */
      if (title && existingTitles.has(title.toLowerCase())) {
        title = `${title} (导入副本)`
      }

      const now = new Date().toISOString()
      const note: Note = {
        id,
        title,
        content: item.content || '',
        category: item.category || '未分类',
        tags: item.tags || [],
        createdAt: item.createdAt || now,
        updatedAt: item.updatedAt || now,
        isPinned: item.isPinned || false,
        isFavorite: item.isFavorite || false,
      }
      notes.value.unshift(note)
      await saveNote(note)
      existingIds.add(id)
      existingTitles.add(note.title.toLowerCase())
      imported++
    }

    return imported
  }

  /**
   * 拖拽排序：按传入的 ID 顺序重新分配 sortOrder 并持久化
   * @param orderedIds 排好序的笔记 ID 数组
   */
  async function reorderNotes(orderedIds: string[]) {
    for (let i = 0; i < orderedIds.length; i++) {
      const note = noteMap.value.get(orderedIds[i]!)
      if (note) {
        note.sortOrder = i
        await saveNote(note)
      }
    }
    /* 触发响应性更新：替换数组引用确保 computed 重新求值 */
    notes.value = [...notes.value]
  }

  /**
   * 拖拽改分类：将笔记移入新分类
   */
  async function moveNoteToCategory(noteId: string, newCategory: string) {
    const note = noteMap.value.get(noteId)
    if (!note || note.category === newCategory) return
    note.category = newCategory
    note.updatedAt = new Date().toISOString()
    await saveNote(note)
  }

  return {
    notes,
    activeNotes,
    currentCategory,
    searchQuery,
    isLoading,
    categories,
    categoryTree,
    filteredNotes,
    totalCount,
    pinnedCount,
    favoriteCount,
    trashNotes,
    trashCount,
    allTags,
    favoriteNotes,
    recentNotes,
    recentIds,
    init,
    addNote,
    updateNote,
    deleteNote,
    restoreNote,
    permanentlyDelete,
    emptyTrash,
    togglePin,
    toggleFavorite,
    recordOpen,
    getNoteById,
    findNoteByTitle,
    getBacklinks,
    importBatch,
    reorderNotes,
    moveNoteToCategory,
    addCustomCategory,
    deleteCategory,
  }
})
