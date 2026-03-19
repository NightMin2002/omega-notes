/**
 * Ω Notes V2 — 核心类型定义
 * 所有跨模块共享的类型集中在此管理
 */

/** 笔记实体 */
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
  /** 软删除标记 */
  isDeleted?: boolean
  /** 删除时间（ISO 字符串） */
  deletedAt?: string
  /** 自定义排序权重（越小越靠前） */
  sortOrder?: number
}

/** 文件夹树节点（侧边栏层级导航） */
export interface FolderNode {
  /** 当前层级名（如 "项目A"） */
  name: string
  /** 完整路径（如 "工作/项目A"） */
  fullPath: string
  /** 该路径下的直接笔记数 */
  count: number
  /** 包含所有子文件夹的总笔记数 */
  totalCount: number
  children: FolderNode[]
}

/** 笔记模板 */
export interface NoteTemplate {
  id: string
  name: string
  icon: string
  description: string
  title: string
  content: string
  category: string
}

/** 标签统计 */
export interface TagCount {
  name: string
  count: number
}

/** 数据导出载荷 */
export interface ExportPayload {
  version: number
  exportedAt: string
  noteCount: number
  notes: Note[]
}

/** 编辑器模式 */
export type EditorMode = 'wysiwyg' | 'split'

/** 字体主题 */
export type FontFamily = 'system' | 'inter' | 'noto-sans-sc'

/** 应用设置 */
export interface AppSettings {
  /** 默认编辑器模式 */
  defaultEditorMode: EditorMode
  /** 字体主题 */
  fontFamily: FontFamily
  /** 回收站自动清理天数（0 = 不自动清理） */
  trashAutoCleanDays: number
}
