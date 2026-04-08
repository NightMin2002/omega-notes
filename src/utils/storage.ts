/**
 * Ω Notes V2 — 存储适配层
 *
 * Tauri 环境下使用 AppData 目录存储 .md 文件（YAML frontmatter + 正文）
 * 浏览器环境下降级为 localStorage
 */
import type { Note } from '@/types'

// ─── 环境检测 ───
export function isTauri(): boolean {
  return '__TAURI__' in window || '__TAURI_INTERNALS__' in window
}

// ─── YAML frontmatter 序列化 ───

function escapeYaml(str: string): string {
  if (/[:#\[\]{}&*!|>'"%@`\n]/.test(str) || str.trim() !== str) {
    return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
  }
  return str
}

function noteToMarkdown(note: Note): string {
  const lines: string[] = ['---']
  lines.push(`id: ${escapeYaml(note.id)}`)
  lines.push(`title: ${escapeYaml(note.title)}`)
  lines.push(`category: ${escapeYaml(note.category)}`)
  lines.push(`tags: [${note.tags.map(t => escapeYaml(t)).join(', ')}]`)
  lines.push(`pinned: ${note.isPinned}`)
  lines.push(`favorite: ${note.isFavorite}`)
  lines.push(`createdAt: ${note.createdAt}`)
  lines.push(`updatedAt: ${note.updatedAt}`)
  if (note.isDeleted) {
    lines.push(`deleted: true`)
    lines.push(`deletedAt: ${note.deletedAt || ''}`)
  }
  if (note.parentId) {
    lines.push(`parentId: ${escapeYaml(note.parentId)}`)
  }
  lines.push('---')
  lines.push('')
  lines.push(note.content)
  return lines.join('\n')
}

export function parseFrontmatter(raw: string): { meta: Record<string, string>; content: string } {
  const meta: Record<string, string> = {}
  if (!raw.startsWith('---')) {
    return { meta, content: raw }
  }
  const endIdx = raw.indexOf('\n---', 3)
  if (endIdx === -1) {
    return { meta, content: raw }
  }
  const frontmatter = raw.slice(4, endIdx)
  const content = raw.slice(endIdx + 4).replace(/^\n/, '')

  for (const line of frontmatter.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    let val = line.slice(colonIdx + 1).trim()
    // 去除引号
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    meta[key] = val
  }

  return { meta, content }
}

export function parseTags(raw: string): string[] {
  const trimmed = raw.replace(/^\[/, '').replace(/\]$/, '').trim()
  if (!trimmed) return []
  return trimmed.split(',').map(t => {
    let s = t.trim()
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1)
    }
    return s
  }).filter(Boolean)
}

function markdownToNote(filename: string, raw: string): Note {
  const { meta, content } = parseFrontmatter(raw)
  const note: Note = {
    id: meta['id'] || filename.replace(/\.md$/, ''),
    title: meta['title'] || '无标题',
    content,
    category: meta['category'] || '未分类',
    tags: parseTags(meta['tags'] || ''),
    isPinned: meta['pinned'] === 'true',
    isFavorite: meta['favorite'] === 'true',
    createdAt: meta['createdAt'] || new Date().toISOString(),
    updatedAt: meta['updatedAt'] || new Date().toISOString(),
  }
  if (meta['deleted'] === 'true') {
    note.isDeleted = true
    note.deletedAt = meta['deletedAt'] || ''
  }
  if (meta['parentId']) {
    note.parentId = meta['parentId']
  }
  return note
}

// ─── Tauri 文件系统操作 ───

const NOTES_DIR = 'notes'

async function ensureNotesDir(): Promise<void> {
  const { exists, mkdir, BaseDirectory } = await import('@tauri-apps/plugin-fs')
  const dirExists = await exists(NOTES_DIR, { baseDir: BaseDirectory.AppData })
  if (!dirExists) {
    await mkdir(NOTES_DIR, { baseDir: BaseDirectory.AppData, recursive: true })
  }
}

function noteFilename(note: Note): string {
  return `${note.id}.md`
}

// ─── 公共 API ───

export async function loadAllNotes(): Promise<Note[]> {
  if (!isTauri()) {
    try {
      const raw = localStorage.getItem('omega-notes')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  const { readDir, readTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs')
  await ensureNotesDir()

  const entries = await readDir(NOTES_DIR, { baseDir: BaseDirectory.AppData })
  const notes: Note[] = []

  for (const entry of entries) {
    if (!entry.name?.endsWith('.md')) continue
    try {
      const raw = await readTextFile(`${NOTES_DIR}/${entry.name}`, {
        baseDir: BaseDirectory.AppData,
      })
      notes.push(markdownToNote(entry.name, raw))
    } catch (e) {
      console.error(`读取笔记失败: ${entry.name}`, e)
    }
  }

  return notes
}

export async function saveNote(note: Note): Promise<void> {
  if (!isTauri()) {
    // localStorage 模式：保存全部
    const raw = localStorage.getItem('omega-notes')
    const all: Note[] = raw ? JSON.parse(raw) : []
    const idx = all.findIndex(n => n.id === note.id)
    if (idx >= 0) {
      all[idx] = note
    } else {
      all.unshift(note)
    }
    localStorage.setItem('omega-notes', JSON.stringify(all))
    return
  }

  const { writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs')
  await ensureNotesDir()
  await writeTextFile(`${NOTES_DIR}/${noteFilename(note)}`, noteToMarkdown(note), {
    baseDir: BaseDirectory.AppData,
  })
}

export async function deleteNoteFile(noteId: string): Promise<void> {
  if (!isTauri()) {
    const raw = localStorage.getItem('omega-notes')
    const all: Note[] = raw ? JSON.parse(raw) : []
    localStorage.setItem('omega-notes', JSON.stringify(all.filter(n => n.id !== noteId)))
    return
  }

  const { remove, BaseDirectory } = await import('@tauri-apps/plugin-fs')
  try {
    await remove(`${NOTES_DIR}/${noteId}.md`, { baseDir: BaseDirectory.AppData })
  } catch (e) {
    console.error(`删除笔记文件失败: ${noteId}`, e)
  }
}

/**
 * 将 localStorage 中的旧数据迁移到文件系统
 * 仅在 Tauri 环境中首次启动时执行
 */
export async function migrateFromLocalStorage(): Promise<Note[]> {
  if (!isTauri()) return []

  const raw = localStorage.getItem('omega-notes')
  if (!raw) return []

  try {
    const oldNotes: Note[] = JSON.parse(raw)
    if (oldNotes.length === 0) return []

    for (const note of oldNotes) {
      await saveNote(note)
    }

    // 迁移完成后清除 localStorage 中的旧数据
    localStorage.removeItem('omega-notes')
    console.log(`已迁移 ${oldNotes.length} 条笔记到文件系统`)
    return oldNotes
  } catch {
    return []
  }
}
