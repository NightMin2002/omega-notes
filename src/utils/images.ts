/**
 * 图片处理工具
 * - Tauri 环境：保存到 AppData/images/ 目录
 * - 浏览器环境：转 base64 Data URL
 *
 * 支持三种粘贴来源：
 * 1. 截图工具 / 浏览器复制 → clipboardData.items 内含 image blob
 * 2. 资源管理器复制文件 → clipboardData.files 内含 File 对象
 * 3. QQ / 微信等 → HTML 中含 <img src="file:///..."> 路径
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

async function getImagesDir(): Promise<string> {
  await ensureTauriModules()
  const appData = await tauriPath!.appDataDir()
  const imagesDir = `${appData}/images`
  try {
    await tauriFs!.mkdir(imagesDir, { recursive: true })
  } catch { /* 已存在 */ }
  return imagesDir
}

/**
 * 将 File / Blob 保存并返回 Markdown 图片语法
 */
export async function saveImage(file: File): Promise<string> {
  const ext = file.name?.split('.').pop() || 'png'
  const id = generateImageId()
  const filename = `${id}.${ext}`

  if (isTauri()) {
    return await saveImageTauri(file, filename)
  }
  return await saveImageBrowser(file)
}

async function saveImageTauri(file: File, filename: string): Promise<string> {
  const imagesDir = await getImagesDir()
  const buffer = await file.arrayBuffer()
  const filePath = `${imagesDir}/${filename}`
  await tauriFs!.writeFile(filePath, new Uint8Array(buffer))
  return `![${file.name || '图片'}](${filePath})`
}

async function saveImageBrowser(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      resolve(`![${file.name || '图片'}](${dataUrl})`)
    }
    reader.readAsDataURL(file)
  })
}

/**
 * 从本地文件路径复制图片（QQ/微信等场景）
 * 仅 Tauri 环境可用
 */
async function copyLocalImage(filePath: string): Promise<string> {
  await ensureTauriModules()
  const imagesDir = await getImagesDir()

  const ext = filePath.split('.').pop() || 'png'
  const filename = `${generateImageId()}.${ext}`
  const destPath = `${imagesDir}/${filename}`

  const data = await tauriFs!.readFile(filePath)
  await tauriFs!.writeFile(destPath, data)

  const basename = filePath.split(/[/\\]/).pop() || '图片'
  return `![${basename}](${destPath})`
}

/**
 * 从粘贴事件中提取图片，返回 Markdown 图片语法数组
 */
export async function handleImagePaste(clipboardData: DataTransfer): Promise<string[]> {
  const results: string[] = []

  /* 1. 检查 items（截图 / 浏览器复制图片） */
  if (clipboardData.items) {
    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i]!
      if (item.type.startsWith('image/') && item.kind === 'file') {
        const file = item.getAsFile()
        if (file) {
          const md = await saveImage(file)
          results.push(md)
        }
      }
    }
  }

  /* 2. 检查 files（文件管理器拖放） */
  if (results.length === 0 && clipboardData.files.length > 0) {
    for (let i = 0; i < clipboardData.files.length; i++) {
      const file = clipboardData.files[i]!
      if (file.type.startsWith('image/')) {
        const md = await saveImage(file)
        results.push(md)
      }
    }
  }

  /* 3. 检查 HTML（QQ / 微信复制的 <img src="file:///...">） */
  if (results.length === 0) {
    const html = clipboardData.getData('text/html')
    if (html) {
      const fileUrls = extractFileImageUrls(html)
      for (const url of fileUrls) {
        try {
          if (isTauri()) {
            /* Tauri 可以读本地文件 */
            const md = await copyLocalImage(url)
            results.push(md)
          } else {
            /* 浏览器无法读本地文件，尝试用 fetch（仅对 http 有效） */
            if (url.startsWith('http')) {
              results.push(`![图片](${url})`)
            }
          }
        } catch (err) {
          console.warn('无法读取图片文件:', url, err)
        }
      }
    }
  }

  return results
}

/**
 * 从 HTML 中提取 <img> 标签的 src 路径
 * 处理 file:// 协议，转换为本地路径
 */
function extractFileImageUrls(html: string): string[] {
  const urls: string[] = []
  const imgRe = /<img[^>]+src=["']([^"']+)["']/gi
  let match: RegExpExecArray | null

  while ((match = imgRe.exec(html)) !== null) {
    let src = match[1]!
    /* file:///E:/path/to/img.jpg → E:/path/to/img.jpg */
    if (src.startsWith('file:///')) {
      src = decodeURIComponent(src.slice(8))  // 去掉 file:///
      urls.push(src)
    } else if (src.startsWith('http')) {
      urls.push(src)
    }
  }
  return urls
}
