# Changelog

本文件记录 Ω Notes V2 的所有版本变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [2.2.0] — 2026-03-29

> Phase 7 — 日常管理系统：每日任务 + 倒计时 + 健康提醒 + 系统通知。

### 新增

- `TasksView.vue` — 日常管理页面（侧边栏入口）
  - **每日任务**：添加/编辑/删除/打勾完成，每日自动重置（可自定义重置时间）
  - **任务分类**：预设 5 分类（游戏/健康/学习/工作/生活），支持自定义增删，分类筛选药丸 + 分组展示
  - **提醒时间**：每个任务可设置独立提醒时间，到时未完成触发系统弹窗通知
  - **倒计时器**：预设 25m/45m/60m 快捷按钮 + 自定义分钟输入，环形进度条 + 完成通知
  - **健康提醒**：可配间隔（30/60/90/120 分钟），随机轮播消息，支持静默时段
  - **进度条**：实时显示任务完成百分比
- `TimePicker.vue` — 自定义时间选择器组件（Teleport + fixed 定位，步进器 ▲▼ 选择小时/分钟）
- `stores/tasks.ts` — 任务 Store（Pinia，任务 CRUD + 倒计时 + 健康提醒 + 配置持久化）
- `utils/scheduler.ts` — 后台调度器（15 秒巡检任务提醒 + 健康提醒 + Tauri 通知权限管理）
- 全局 `data-tooltip` 样式 — `::after` 伪元素实现，hover 显示 + 触屏 focus 降级
- 侧边栏新增「日常管理」导航项（时钟图标）
- 路由新增 `/tasks` 路径

### 变更

- `src/types/index.ts` — 新增 `DailyTask`、`DailyRecord`、`HealthReminder`、`CountdownState`、`TasksConfig` 类型
- `src/router/index.ts` — 注册 `/tasks` 路由
- `src/main.ts` — 启动时初始化调度器 + 注入通知权限
- `src/components/AppSidebar.vue` — 新增「日常管理」侧边栏入口
- `src/assets/styles/reset.css` — 新增全局 `[data-tooltip]` 提示框样式

### UI/UX

- 所有时间选择器替换为自定义 `TimePicker` 组件（消灭原生 `<input type="time">`）
- 分类选择器使用药丸点选按钮组（消灭原生 `<select>`）
- 倒计时分钟输入使用 `[-] input [+]` 混合步进器（消灭原生 `<input type="number">`）
- TimePicker 面板使用 `Teleport to="body"` + `position: fixed` 避免容器裁剪
- 面板水平居中对齐触发按钮，夹紧在视口边界内防溢出

---

## [2.1.1] — 2026-03-28

> 桌面体验增强：单实例防多开、关闭最小化到托盘、开机自启。

### 新增

- `tauri-plugin-single-instance` — 防止应用多开，第二个进程启动时自动聚焦已有窗口
- 关闭按钮最小化到托盘（拦截 `CloseRequested`，隐藏窗口而非退出）
- 托盘图标左键点击恢复窗口 + `tooltip("Ω Notes")`
- 开机自启功能（`tauri-plugin-autostart` + 设置面板 Toggle 开关）
- 设置面板新增「系统」分区（仅桌面环境显示，含开机自启 Toggle）
- `docs/05-构建与安装指南.md` — 构建、打包、安装流程与常见问题文档

### 变更

- `src-tauri/src/lib.rs` — 重构为包含单实例/自启/托盘恢复/关闭最小化完整逻辑
- `src-tauri/Cargo.toml` — 新增 `tauri-plugin-single-instance` + `tauri-plugin-autostart` 依赖
- `src-tauri/capabilities/default.json` — 新增 `autostart:allow-enable/disable/is-enabled` 权限
- `package.json` — 新增 `@tauri-apps/plugin-autostart` 前端依赖

---

## [2.1.0] — 2026-03-28

> 架构重构：消灭代码重复，提升可维护性。净减 616 行代码。

### 新增

- `WikiLinkPicker.vue` — Wiki 链接选择器共享组件
- `SplitEditor.vue` — 分屏编辑器共享组件（源码 + 工具栏 + 实时预览）
- `BacklinksPanel.vue` — 反向链接面板共享组件
- `storage.ts` 导出 `parseFrontmatter()` / `parseTags()` 供外部复用

### 重构

- **WriteView / NoteDetailView**：提取重复模板为 `WikiLinkPicker`、`SplitEditor`、`BacklinksPanel` 共享组件，两个视图分别瘦身 32% / 47%
- **dataio.ts**：移除重复 YAML frontmatter 解析器，复用 `storage.ts` 的 `parseFrontmatter` + `parseTags`
- **settings.ts**：消灭双重状态源（`ref` + `settings.value` 并行维护），改为 `computed` getter 单一状态源
- **notes.ts**：新增 `noteMap` computed Map 索引，9 处 `.find(n => n.id)` O(n) 查找改为 O(1)
- **templates.ts**：模板日期从模块加载时固定值改为 `getTemplates()` 工厂函数动态生成
- **AppSidebar.vue**：`navigateFolder()` 从 `window.location.hash` 改为 `router.push()`
- **handlePaste**：NoteDetailView 中重复的粘贴处理逻辑统一使用 `useEditorActions` composable

---

## [2.0.0] — 2026-03-19

> Ω Notes V2 的首个正式版本。从 V1 全面重写，技术栈迁移至 Vue 3 + Vite + TypeScript + Tauri 2。

### 新增

#### Phase 1 — 骨架搭建
- Vue 3 (Composition API) + Vite 7 + TypeScript 项目初始化
- Design Token 体系（暗色/亮色双主题，CSS 变量驱动）
- 全局样式重置（消灭浏览器默认样式）
- Header + Sidebar 布局组件
- 路由配置（主页 / 知识库 / 新建 / 笔记详情）
- 笔记 Store（Pinia，CRUD + 分类 + 搜索 + 排序）
- 主题 Store（暗色/亮色切换 + localStorage 持久化）
- 页面切换过渡动画

#### Phase 2 — 编辑器升级
- 接入 Milkdown v7 所见即所得 Markdown 编辑器
- markdown-it 阅读模式渲染
- highlight.js 代码高亮
- KaTeX 数学公式支持（编辑器 + 阅读模式双端渲染）

#### Phase 3 — 桌面化
- Tauri 2 桌面应用壳
- 本地 .md 文件存储（`AppData/notes/*.md`，YAML frontmatter 元数据）
- 浏览器环境 localStorage 自动降级
- 旧 localStorage 数据自动迁移到文件系统
- 全局快捷键（Ctrl+Shift+N 新建 / Ctrl+Shift+O 呼出窗口）
- 系统托盘常驻（显示窗口 / 退出菜单）

#### Phase 4 — 功能增强
- 快速笔记（Ctrl+Q 弹窗，自动归类收件箱）
- 全局搜索（Ctrl+K，全文搜索 + 高亮 + 键盘导航）
- 收件箱系统（侧边栏入口 + 数字徽标）
- 笔记模板（6 种预设：空白/会议/读书/日记/学习/待办）
- 图片支持（截图粘贴 + 文件选择器 + QQ/微信图片，base64 嵌入）
- 智能粘贴（Markdown 文本粘贴到 WYSIWYG 自动解析为富文本）
- 分屏编辑（Markdown 源码 + 实时预览）
- Markdown 增强（表格斑马纹、任务列表、删除线）
- 快捷键面板（侧边栏可展开）

#### Phase 5 — 组织与发现
- 收藏夹 + 最近打开（侧边栏入口 + 笔记详情收藏按钮 + 最近打开自动记录）
- 标签云 + 点击筛选（知识库页标签药丸 + URL 参数 `?tag=` 筛选 + 频率计数）
- 文件夹无限嵌套（`/` 分隔符路径 + 侧边栏可展开树形导航 + 面包屑）
- 双向链接（`[[title]]` 语法 + 点击跳转 + 反向链接面板 + 插入链接按钮）
- 数据导入/导出（JSON 格式导出 + 支持 .json/.md 文件导入）

#### Phase 6 — 体验优化与工程治理（进行中）
- 笔记回收站（软删除 → 恢复 / 永久删除 / 清空，`<dialog>` 确认）
- 设置面板（`/settings` 路由，四分区：外观 / 编辑器 / 数据 / 关于）
  - 主题切换（深色 / 浅色，分段按钮）
  - 字体选择（系统默认 / Inter / Noto Sans SC）
  - 默认编辑模式（WYSIWYG / 分屏）
  - 回收站自动清理（可配天数：不清理 / 7 / 14 / 30 / 90 天，自定义下拉替代原生 select）
  - 笔记统计（总数 / 分类 / 收藏 / 回收站）
  - 存储位置（显示实际路径 + 一键打开文件夹）
  - 关于信息（版本 / 技术栈）
- Settings Store（`stores/settings.ts`，localStorage 持久化）
- 新建笔记页 WriteView 使用设置的默认编辑模式
- Markdown 格式化工具栏（`EditorToolbar.vue`，14 按钮）
  - H1-H3 标题、加粗、斜体、删除线、行内代码
  - 引用、无序 / 有序 / 任务列表
  - 分割线、代码块、表格
  - WYSIWYG + 分屏模式均可用（可折叠开关）
- `tauri-plugin-opener` 集成（存储目录一键打开）
- 拖拽排序（Note sortOrder 字段 + HTML5 DnD）
  - 知识库笔记卡片可拖拽重新排序
  - 拖拽笔记卡片到侧边栏文件夹 → 自动改分类
  - 拖拽时半透明 + 目标高亮视觉反馈
- 搜索防抖（知识库搜索框 200ms 延迟，减少高频过滤）

### 工程改进
- 创建 `src/types/` 集中类型定义（Note, NoteTemplate, FolderNode, AppSettings 等）
- 消除 `storage.ts` → `stores/notes.ts` 的循环类型引用
- 统一 `package.json` 与 `tauri.conf.json` 版本号为 `2.0.0`
- README 路线图精简为摘要表格，详细规划移至 `docs/04-功能方向规划.md`
- 创建本 CHANGELOG

---

*Maintained by Code Agent Ω*
