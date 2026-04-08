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
  /** 父笔记 ID（子笔记专属，大笔记无此字段）。仅支持单层嵌套 */
  parentId?: string
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
  /** 待办事项列表（v2.7+） */
  todos?: TodoItem[]
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
  /** 用户自定义笔记模板 */
  customTemplates: CustomTemplate[]
}

/** 用户自定义笔记模板 */
export interface CustomTemplate {
  id: string
  name: string
  description: string
  /** 模板默认标题 */
  title: string
  /** 模板默认分类 */
  category: string
  /** 模板内容（Markdown 原文） */
  content: string
  /** 创建时间 */
  createdAt: string
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
  /** UTC 终止时间戳（毫秒），用于在后台被节流时纠正计时 / 跨窗口同步准确时间 */
  targetEndTime?: number
}

/* ═══════════════════════════════════
   待办事项系统类型
   ═══════════════════════════════════ */

/** 待办优先级 */
export type TodoPriority = 'low' | 'medium' | 'high'

/** 待办状态 */
export type TodoStatus = 'pending' | 'completed'

/** 待办事项实体 */
export interface TodoItem {
  id: string
  title: string
  /** 详细描述（可选） */
  description?: string
  /** 截止日期，格式 "YYYY-MM-DD" */
  dueDate?: string
  /** 优先级 */
  priority: TodoPriority
  /** 状态 */
  status: TodoStatus
  /** 标签 */
  tags: string[]
  /** 创建时间 */
  createdAt: string
  /** 完成时间 */
  completedAt?: string
  /** 排序权重 */
  sortOrder: number
}

/* ═══════════════════════════════════
   快捷键系统类型
   ═══════════════════════════════════ */

/** 快捷键定义 */
export interface ShortcutDefinition {
  id: string
  name: string
  /** 描述说明 */
  description?: string
  /** 默认绑定的按键组合（如 ['Control', 'k']） */
  defaultKeys: string[]
  /** 当前绑定的按键组合 */
  currentKeys: string[]
  /** 是否启用 */
  enabled: boolean
  /** 
   * 是否为全局（Tauri 系统级别）快捷键
   * 若为 true，将在系统层级注册，否则只在浏览器焦点下触发
   */
  isGlobal?: boolean
}
