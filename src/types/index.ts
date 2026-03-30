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
  /** 每日任务模板列表（v2.6+） */
  tasks?: DailyTask[]
  /** 每日完成记录（v2.6+） */
  taskRecords?: DailyRecord[]
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
  /** 内容缩放百分比（80-150，默认 100） */
  contentZoom: number
}

/* ═══════════════════════════════════
   日常管理系统类型
   ═══════════════════════════════════ */

/** 每日任务模板（持久化） */
export interface DailyTask {
  id: string
  title: string
  /** 可选提醒时间，格式 "HH:mm" */
  reminderTime?: string
  /** 任务分类（如 "游戏"、"健康"、"学习"） */
  category?: string
  /** 是否启用 */
  enabled: boolean
  /** 创建时间 */
  createdAt: string
  /** 排序权重（越小越靠前） */
  sortOrder: number
}

/** 当日完成记录 */
export interface DailyRecord {
  /** 日期 key，格式 "YYYY-MM-DD" */
  date: string
  /** 已完成的 taskId 集合 */
  completedIds: string[]
  /** 今日跳过的 taskId 集合（手动标记"今天不做"） */
  skippedIds?: string[]
}

/** 健康提醒配置（持久化） */
export interface HealthReminder {
  /** 是否启用 */
  enabled: boolean
  /** 间隔分钟数 */
  intervalMinutes: number
  /** 提醒消息列表 */
  messages: string[]
  /** 静默时段开始，格式 "HH:mm" */
  quietStart: string
  /** 静默时段结束，格式 "HH:mm" */
  quietEnd: string
}

/** 倒计时状态（运行时，不持久化） */
export interface CountdownState {
  /** 是否正在运行 */
  isRunning: boolean
  /** 是否暂停 */
  isPaused: boolean
  /** 总时长（秒） */
  totalSeconds: number
  /** 剩余秒数 */
  remainingSeconds: number
}
