/**
 * Markdown 工具函数
 */

/**
 * 将 Markdown 内容剥离标记，返回纯文本摘要
 */
export function stripMarkdown(text: string): string {
  let t = text
  // 移除代码块
  t = t.replace(/```[\s\S]*?```/g, ' ')
  // 移除标题标记
  t = t.replace(/^#{1,6}\s+/gm, '')
  // 移除粗体/斜体
  t = t.replace(/\*{1,3}(.*?)\*{1,3}/g, '$1')
  t = t.replace(/_{1,3}(.*?)_{1,3}/g, '$1')
  // 移除删除线
  t = t.replace(/~~(.*?)~~/g, '$1')
  // 移除行内代码
  t = t.replace(/`([^`]+)`/g, '$1')
  // 移除链接但保留文字
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  // 移除图片
  t = t.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
  // 移除引用标记
  t = t.replace(/^>\s?/gm, '')
  // 移除列表标记
  t = t.replace(/^[-*+]\s+/gm, '')
  t = t.replace(/^\d+\.\s+/gm, '')
  // 移除水平线
  t = t.replace(/^[-*_]{3,}\s*$/gm, '')
  // 移除反斜杠转义
  t = t.replace(/\\([*_`~#\[\]()\\>+\-.!|])/g, '$1')
  // 合并多余空白，段落间用 · 分隔以保留层次感
  t = t.replace(/\n{2,}/g, ' \u00b7 ')
  t = t.replace(/\n/g, ' ')
  return t.trim()
}

/**
 * 截断文本
 */
export function truncateText(text: string, max = 120): string {
  const plain = stripMarkdown(text)
  if (plain.length <= max) return plain
  return plain.slice(0, max) + '…'
}
