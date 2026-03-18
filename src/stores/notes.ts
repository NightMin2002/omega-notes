/**
 * Ω Notes V2 — 笔记 Store
 * 管理笔记的 CRUD 和分类，使用 localStorage 暂存（后续可替换为文件系统）
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

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

const STORAGE_KEY = 'omega-notes'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function loadFromStorage(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveToStorage(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>(loadFromStorage())
  const currentCategory = ref<string>('all')
  const searchQuery = ref<string>('')

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
  function persist() {
    saveToStorage(notes.value)
  }

  function addNote(data: Partial<Note>): Note {
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
    persist()
    return note
  }

  function updateNote(id: string, updates: Partial<Note>) {
    const idx = notes.value.findIndex(n => n.id === id)
    if (idx === -1) return
    notes.value[idx] = {
      ...notes.value[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    persist()
  }

  function deleteNote(id: string) {
    notes.value = notes.value.filter(n => n.id !== id)
    persist()
  }

  function togglePin(id: string) {
    const note = notes.value.find(n => n.id === id)
    if (note) {
      note.isPinned = !note.isPinned
      persist()
    }
  }

  function getNoteById(id: string): Note | undefined {
    return notes.value.find(n => n.id === id)
  }

  return {
    notes,
    currentCategory,
    searchQuery,
    categories,
    filteredNotes,
    totalCount,
    pinnedCount,
    addNote,
    updateNote,
    deleteNote,
    togglePin,
    getNoteById,
  }
})
