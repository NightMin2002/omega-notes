/**
 * Ω Notes V2 — 数据导入/导出
 *
 * 导出：所有笔记打包为 JSON 文件下载
 *   - Tauri 环境：弹出保存对话框 → 写入文件
 *   - 浏览器环境：Blob URL 触发下载
 * 导入：支持 JSON（本应用格式）和 .md 文件（YAML frontmatter）
 */
import type { Note, ExportPayload } from '@/types'
import { isTauri } from '@/utils/storage'

/** 浏览器环境下载文本文件 */
function browserDownload(filename: string, content: string, mime = 'application/json') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Tauri 环境：弹出保存对话框 + 写入文件 */
async function tauriSave(defaultName: string, content: string) {
  const { save } = await import('@tauri-apps/plugin-dialog')
  const { writeTextFile } = await import('@tauri-apps/plugin-fs')

  const filePath = await save({
    defaultPath: defaultName,
    filters: [{
      name: 'JSON 文件',
      extensions: ['json'],
    }],
  })

  if (filePath) {
    await writeTextFile(filePath, content)
  }
}

/** 导出全部笔记为 JSON */
export async function exportNotesAsJson(notes: Note[]) {
  const payload: ExportPayload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    noteCount: notes.length,
    notes,
  }
  const json = JSON.stringify(payload, null, 2)
  const date = new Date().toISOString().slice(0, 10)
  const filename = `omega-notes-${date}.json`

  if (isTauri()) {
    await tauriSave(filename, json)
  } else {
    browserDownload(filename, json)
  }
}

/** 解析 YAML frontmatter 的 .md 文件 → Note 对象 */
function parseMdFile(filename: string, raw: string): Partial<Note> {
  const result: Partial<Note> = {}

  if (raw.startsWith('---')) {
    const endIdx = raw.indexOf('\n---', 3)
    if (endIdx !== -1) {
      const frontmatter = raw.slice(4, endIdx)
      const content = raw.slice(endIdx + 4).replace(/^\n/, '')
      result.content = content

      for (const line of frontmatter.split('\n')) {
        const colonIdx = line.indexOf(':')
        if (colonIdx === -1) continue
        const key = line.slice(0, colonIdx).trim()
        let val = line.slice(colonIdx + 1).trim()
        /* 去引号 */
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }

        switch (key) {
          case 'id': result.id = val; break
          case 'title': result.title = val; break
          case 'category': result.category = val; break
          case 'pinned': result.isPinned = val === 'true'; break
          case 'favorite': result.isFavorite = val === 'true'; break
          case 'createdAt': result.createdAt = val; break
          case 'updatedAt': result.updatedAt = val; break
          case 'tags': {
            const trimmed = val.replace(/^\[/, '').replace(/]$/, '').trim()
            result.tags = trimmed ? trimmed.split(',').map(t => {
              let s = t.trim()
              if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
                s = s.slice(1, -1)
              }
              return s
            }).filter(Boolean) : []
            break
          }
        }
      }
    } else {
      result.content = raw
    }
  } else {
    result.content = raw
  }

  /* 从文件名推断标题（如果 frontmatter 里没有） */
  if (!result.title) {
    result.title = filename.replace(/\.md$/i, '')
  }

  return result
}

/** 读取文件为文本 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

/**
 * 从用户选择的文件导入笔记
 * @returns 解析出的笔记数据（调用方负责去重和入库）
 */
export async function importNotesFromFiles(): Promise<Partial<Note>[]> {
  /* Tauri 环境：用原生文件对话框 */
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const { readTextFile } = await import('@tauri-apps/plugin-fs')

    const selected = await open({
      multiple: true,
      filters: [{
        name: '笔记文件',
        extensions: ['json', 'md'],
      }],
    })

    if (!selected) return []
    const paths = Array.isArray(selected) ? selected : [selected]

    const results: Partial<Note>[] = []
    for (const filePath of paths) {
      try {
        const text = await readTextFile(filePath)
        if (filePath.endsWith('.json')) {
          const data = JSON.parse(text)
          if (data.notes && Array.isArray(data.notes)) {
            results.push(...data.notes)
          }
        } else if (filePath.endsWith('.md')) {
          const name = filePath.split(/[\\/]/).pop() || 'note.md'
          results.push(parseMdFile(name, text))
        }
      } catch (err) {
        console.error(`导入文件失败: ${filePath}`, err)
      }
    }
    return results
  }

  /* 浏览器环境：用 <input type="file"> */
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.md'
    input.multiple = true
    input.onchange = async () => {
      if (!input.files || input.files.length === 0) {
        resolve([])
        return
      }

      const results: Partial<Note>[] = []

      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i]!
        try {
          const text = await readFileAsText(file)

          if (file.name.endsWith('.json')) {
            const data = JSON.parse(text)
            if (data.notes && Array.isArray(data.notes)) {
              results.push(...data.notes)
            }
          } else if (file.name.endsWith('.md')) {
            results.push(parseMdFile(file.name, text))
          }
        } catch (err) {
          console.error(`导入文件失败: ${file.name}`, err)
        }
      }

      resolve(results)
    }
    input.addEventListener('cancel', () => resolve([]))
    input.click()
  })
}
