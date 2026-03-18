/**
 * Ω Notes V2 — 笔记 Store
 * 管理笔记的 CRUD、分类、收藏、最近打开
 * Tauri 环境：文件系统持久化（AppData/notes/*.md）
 * 浏览器环境：localStorage 降级
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loadAllNotes, saveNote, deleteNoteFile, migrateFromLocalStorage } from '@/utils/storage'

export interface Note {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  createdAt: string
  updatedAt: string
  isPinned: boolean
  isFavorite: boolean
}

const RECENT_KEY = 'omega-recent-notes'
const RECENT_MAX = 20

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const currentCategory = ref<string>('all')
  const searchQuery = ref<string>('')
  const isLoading = ref(true)
  const recentIds = ref<string[]>([])

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
    } catch (e) {
      console.error('加载笔记失败', e)
      notes.value = []
    } finally {
      isLoading.value = false
    }
  }

  // ─── 计算属性 ───
  const categories = computed<string[]>(() => {
    const set = new Set<string>()
    for (const note of notes.value) {
      if (note.category) set.add(note.category)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
  })

  /** 文件夹树节点 */
  interface FolderNode {
    name: string       // 当前层级名（如 "项目A"）
    fullPath: string   // 完整路径（如 "工作/项目A"）
    count: number      // 该路径下的直接笔记数
    totalCount: number // 包含所有子文件夹的总笔记数
    children: FolderNode[]
  }

  /** 从分类路径构建文件夹树 */
  const categoryTree = computed<FolderNode[]>(() => {
    /* 统计每个精确路径的直接笔记数 */
    const countMap = new Map<string, number>()
    for (const note of notes.value) {
      const cat = note.category || '未分类'
      countMap.set(cat, (countMap.get(cat) || 0) + 1)
    }

    /* 收集所有路径（含中间路径） */
    const allPaths = new Set<string>()
    for (const cat of countMap.keys()) {
      const parts = cat.split('/')
      for (let i = 1; i <= parts.length; i++) {
        allPaths.add(parts.slice(0, i).join('/'))
      }
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
    let result = notes.value

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

    // 排序：置顶 > 时间倒序
    return result.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  })

  const totalCount = computed(() => notes.value.length)
  const pinnedCount = computed(() => notes.value.filter(n => n.isPinned).length)
  const favoriteCount = computed(() => notes.value.filter(n => n.isFavorite).length)

  /** 全部标签（按使用频率降序） */
  const allTags = computed<{ name: string; count: number }[]>(() => {
    const map = new Map<string, number>()
    for (const note of notes.value) {
      for (const tag of note.tags) {
        map.set(tag, (map.get(tag) || 0) + 1)
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  })

  const favoriteNotes = computed<Note[]>(() =>
    notes.value
      .filter(n => n.isFavorite)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  )

  const recentNotes = computed<Note[]>(() => {
    const result: Note[] = []
    for (const id of recentIds.value) {
      const note = notes.value.find(n => n.id === id)
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
    const idx = notes.value.findIndex(n => n.id === id)
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

  async function deleteNote(id: string) {
    notes.value = notes.value.filter(n => n.id !== id)
    await deleteNoteFile(id)
    // 同时从最近打开中移除
    recentIds.value = recentIds.value.filter(rid => rid !== id)
    localStorage.setItem(RECENT_KEY, JSON.stringify(recentIds.value))
  }

  async function togglePin(id: string) {
    const note = notes.value.find(n => n.id === id)
    if (note) {
      note.isPinned = !note.isPinned
      await saveNote(note)
    }
  }

  async function toggleFavorite(id: string) {
    const note = notes.value.find(n => n.id === id)
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
    return notes.value.find(n => n.id === id)
  }

  /** 按标题查找笔记（精确匹配，不区分大小写） */
  function findNoteByTitle(title: string): Note | undefined {
    const t = title.toLowerCase()
    return notes.value.find(n => n.title.toLowerCase() === t)
  }

  /** 获取引用指定笔记的所有反向链接（兼容 Milkdown 转义括号） */
  function getBacklinks(noteId: string): Note[] {
    const note = notes.value.find(n => n.id === noteId)
    if (!note || !note.title) return []
    const title = note.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    /* 匹配 [[title]] 或 \[\[title\]\] */
    const re = new RegExp(`\\\\?\\[\\\\?\\[${title}\\\\?\\]\\\\?\\]`)
    return notes.value.filter(n =>
      n.id !== noteId && re.test(n.content)
    )
  }

  /** 批量导入笔记（跳过已存在的 ID） */
  async function importBatch(items: Partial<Note>[]): Promise<number> {
    const existingIds = new Set(notes.value.map(n => n.id))
    let imported = 0

    for (const item of items) {
      const id = item.id || generateId()
      if (existingIds.has(id)) continue

      const now = new Date().toISOString()
      const note: Note = {
        id,
        title: item.title || '',
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
      imported++
    }

    return imported
  }

  return {
    notes,
    currentCategory,
    searchQuery,
    isLoading,
    categories,
    categoryTree,
    filteredNotes,
    totalCount,
    pinnedCount,
    favoriteCount,
    allTags,
    favoriteNotes,
    recentNotes,
    recentIds,
    init,
    addNote,
    updateNote,
    deleteNote,
    togglePin,
    toggleFavorite,
    recordOpen,
    getNoteById,
    findNoteByTitle,
    getBacklinks,
    importBatch,
  }
})
