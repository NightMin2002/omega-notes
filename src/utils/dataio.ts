import type { Note, ExportPayload, DailyTask, DailyRecord } from '@/types'
import { isTauri, parseFrontmatter, parseTags } from '@/utils/storage'

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

/** 导出全部笔记为 JSON（可选包含任务数据） */
export async function exportNotesAsJson(
  notes: Note[],
  tasks?: DailyTask[],
  taskRecords?: DailyRecord[],
) {
  const payload: ExportPayload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    noteCount: notes.length,
    notes,
  }
  if (tasks && tasks.length > 0) payload.tasks = tasks
  if (taskRecords && taskRecords.length > 0) payload.taskRecords = taskRecords

  const json = JSON.stringify(payload, null, 2)
  const date = new Date().toISOString().slice(0, 10)
  const filename = `omega-notes-${date}.json`

  if (isTauri()) {
    await tauriSave(filename, json)
  } else {
    browserDownload(filename, json)
  }
}

/**
 * 解析 YAML frontmatter 的 .md 文件 → Partial<Note>
 * 复用 storage.ts 的 parseFrontmatter / parseTags
 */
function parseMdFile(filename: string, raw: string): Partial<Note> {
  const { meta, content } = parseFrontmatter(raw)

  const result: Partial<Note> = { content }

  if (meta['id']) result.id = meta['id']
  if (meta['title']) result.title = meta['title']
  if (meta['category']) result.category = meta['category']
  if (meta['pinned']) result.isPinned = meta['pinned'] === 'true'
  if (meta['favorite']) result.isFavorite = meta['favorite'] === 'true'
  if (meta['createdAt']) result.createdAt = meta['createdAt']
  if (meta['updatedAt']) result.updatedAt = meta['updatedAt']
  if (meta['tags']) result.tags = parseTags(meta['tags'])

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
 * 导入结果（包含笔记 + 可选的任务数据）
 */
export interface ImportResult {
  notes: Partial<Note>[]
  tasks: DailyTask[]
  taskRecords: DailyRecord[]
}

/**
 * 从用户选择的文件导入笔记（及可选的任务数据）
 * @returns 解析出的数据（调用方负责去重和入库）
 */
export async function importNotesFromFiles(): Promise<ImportResult> {
  const result: ImportResult = { notes: [], tasks: [], taskRecords: [] }

  function processJson(data: any) {
    if (data.notes && Array.isArray(data.notes)) {
      result.notes.push(...data.notes)
    }
    if (data.tasks && Array.isArray(data.tasks)) {
      result.tasks.push(...data.tasks)
    }
    if (data.taskRecords && Array.isArray(data.taskRecords)) {
      result.taskRecords.push(...data.taskRecords)
    }
  }

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

    if (!selected) return result
    const paths = Array.isArray(selected) ? selected : [selected]

    for (const filePath of paths) {
      try {
        const text = await readTextFile(filePath)
        if (filePath.endsWith('.json')) {
          processJson(JSON.parse(text))
        } else if (filePath.endsWith('.md')) {
          const name = filePath.split(/[\\/]/).pop() || 'note.md'
          result.notes.push(parseMdFile(name, text))
        }
      } catch (err) {
        console.error(`导入文件失败: ${filePath}`, err)
      }
    }
    return result
  }

  /* 浏览器环境：用 <input type="file"> */
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.md'
    input.multiple = true
    input.onchange = async () => {
      if (!input.files || input.files.length === 0) {
        resolve(result)
        return
      }

      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i]!
        try {
          const text = await readFileAsText(file)

          if (file.name.endsWith('.json')) {
            processJson(JSON.parse(text))
          } else if (file.name.endsWith('.md')) {
            result.notes.push(parseMdFile(file.name, text))
          }
        } catch (err) {
          console.error(`导入文件失败: ${file.name}`, err)
        }
      }

      resolve(result)
    }
    input.addEventListener('cancel', () => resolve(result))
    input.click()
  })
}
