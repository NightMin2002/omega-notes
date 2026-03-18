/**
 * Ω Notes V2 — 笔记 Store
 * 管理笔记的 CRUD 和分类
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
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const currentCategory = ref<string>('all')
  const searchQuery = ref<string>('')
  const isLoading = ref(true)

  // ─── 初始化：从存储加载 ───
  async function init() {
    isLoading.value = true
    try {
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
  }

  async function togglePin(id: string) {
    const note = notes.value.find(n => n.id === id)
    if (note) {
      note.isPinned = !note.isPinned
      await saveNote(note)
    }
  }

  function getNoteById(id: string): Note | undefined {
    return notes.value.find(n => n.id === id)
  }

  return {
    notes,
    currentCategory,
    searchQuery,
    isLoading,
    categories,
    filteredNotes,
    totalCount,
    pinnedCount,
    init,
    addNote,
    updateNote,
    deleteNote,
    togglePin,
    getNoteById,
  }
})
