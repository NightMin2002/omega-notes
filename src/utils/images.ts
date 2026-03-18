/**
 * 图片处理工具
 * - Tauri 环境：保存到 AppData/images/ 目录
 * - 浏览器环境：转 base64 Data URL
 */
import { isTauri } from './storage'

let tauriFs: typeof import('@tauri-apps/plugin-fs') | null = null
let tauriPath: typeof import('@tauri-apps/api/path') | null = null

async function ensureTauriModules() {
  if (!tauriFs) {
    tauriFs = await import('@tauri-apps/plugin-fs')
  }
  if (!tauriPath) {
    tauriPath = await import('@tauri-apps/api/path')
  }
}

function generateImageId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 将 File 对象保存并返回 Markdown 图片语法
 */
export async function saveImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'png'
  const id = generateImageId()
  const filename = `${id}.${ext}`

  if (isTauri()) {
    return await saveImageTauri(file, filename)
  }
  return await saveImageBrowser(file, filename)
}

async function saveImageTauri(file: File, filename: string): Promise<string> {
  await ensureTauriModules()
  const appData = await tauriPath!.appDataDir()
  const imagesDir = `${appData}/images`

  /* 确保 images 目录存在 */
  try {
    await tauriFs!.mkdir(imagesDir, { recursive: true })
  } catch {
    /* 已存在 */
  }

  const buffer = await file.arrayBuffer()
  const filePath = `${imagesDir}/${filename}`
  await tauriFs!.writeFile(filePath, new Uint8Array(buffer))

  /* 返回 Tauri asset 协议 URL */
  return `![${file.name}](${filePath})`
}

async function saveImageBrowser(file: File, _filename: string): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      resolve(`![${file.name}](${dataUrl})`)
    }
    reader.readAsDataURL(file)
  })
}

/**
 * 从粘贴/拖放事件中提取图片文件
 */
export function getImageFiles(dataTransfer: DataTransfer): File[] {
  const files: File[] = []
  for (let i = 0; i < dataTransfer.files.length; i++) {
    const file = dataTransfer.files[i]!
    if (file.type.startsWith('image/')) {
      files.push(file)
    }
  }
  return files
}
