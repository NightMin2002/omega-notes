/**
 * 图片处理工具 — 统一转 base64 Data URL
 *
 * 不依赖 Tauri asset 协议，所有环境通用。
 *
 * 支持三种粘贴来源：
 * 1. 截图工具 / 浏览器复制 → clipboardData.items 内含 image blob
 * 2. 资源管理器复制文件 → clipboardData.files 内含 File 对象
 * 3. QQ / 微信 → HTML 中含 <img src="file:///..."> 路径（Tauri 可读取）
 */
import { isTauri } from './storage'

/**
 * 将 File / Blob 转 base64 Data URL，返回 Markdown 图片语法
 */
function fileToBase64Markdown(file: File): Promise<string> {
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
 * 从本地文件路径读取并转 base64（仅 Tauri 环境）
 */
async function localFileToBase64Markdown(filePath: string): Promise<string> {
  const tauriFs = await import('@tauri-apps/plugin-fs')
  const data = await tauriFs.readFile(filePath)

  /* 根据扩展名推断 MIME */
  const ext = filePath.split('.').pop()?.toLowerCase() || 'png'
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
  }
  const mime = mimeMap[ext] || 'image/png'

  /* Uint8Array → base64 */
  let binary = ''
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]!)
  }
  const base64 = btoa(binary)
  const dataUrl = `data:${mime};base64,${base64}`

  const basename = filePath.split(/[/\\]/).pop() || '图片'
  return `![${basename}](${dataUrl})`
}

/**
 * 从 HTML 中提取 <img> 标签的 file:// 路径
 */
function extractFileImagePaths(html: string): string[] {
  const paths: string[] = []
  const imgRe = /<img[^>]+src=["']([^"']+)["']/gi
  let match: RegExpExecArray | null

  while ((match = imgRe.exec(html)) !== null) {
    let src = match[1]!
    if (src.startsWith('file:///')) {
      paths.push(decodeURIComponent(src.slice(8)))
    }
  }
  return paths
}

/**
 * 同步检测剪贴板是否含图片
 * 调用方需要在此返回 true 后立即 e.preventDefault()
 */
export function clipboardHasImage(clipboardData: DataTransfer): boolean {
  /* 检查 items */
  if (clipboardData.items) {
    for (let i = 0; i < clipboardData.items.length; i++) {
      if (clipboardData.items[i]!.type.startsWith('image/')) {
        return true
      }
    }
  }

  /* 检查 HTML 中的 file:// 图片（QQ / 微信） */
  const html = clipboardData.getData('text/html')
  if (html && /<img[^>]+src=["']file:\/\/\//i.test(html)) {
    return true
  }

  return false
}

/**
 * 异步处理剪贴板中的图片，返回 Markdown 语法数组
 * 调用前必须先用 clipboardHasImage 同步检测并 preventDefault
 */
export async function processClipboardImages(clipboardData: DataTransfer): Promise<string[]> {
  const results: string[] = []

  /* 1. 检查 items（截图 / 浏览器复制图片） */
  if (clipboardData.items) {
    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i]!
      if (item.type.startsWith('image/') && item.kind === 'file') {
        const file = item.getAsFile()
        if (file) {
          const md = await fileToBase64Markdown(file)
          results.push(md)
        }
      }
    }
  }

  if (results.length > 0) return results

  /* 2. 检查 files */
  if (clipboardData.files.length > 0) {
    for (let i = 0; i < clipboardData.files.length; i++) {
      const file = clipboardData.files[i]!
      if (file.type.startsWith('image/')) {
        const md = await fileToBase64Markdown(file)
        results.push(md)
      }
    }
  }

  if (results.length > 0) return results

  /* 3. 检查 HTML（QQ / 微信 file:// 路径） */
  const html = clipboardData.getData('text/html')
  if (html) {
    const filePaths = extractFileImagePaths(html)
    for (const fp of filePaths) {
      try {
        if (isTauri()) {
          const md = await localFileToBase64Markdown(fp)
          results.push(md)
        }
      } catch (err) {
        console.warn('无法读取图片:', fp, err)
      }
    }
  }

  return results
}
