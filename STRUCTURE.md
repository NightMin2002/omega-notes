# Ω Notes V2 — 项目结构文档

> **致 AI 助手与开发者**：这是项目的结构索引。在新增文件或修改模块时，请同步更新本文档。

## 目录总览

```
omega-v2/
├── index.html                  # 应用入口 HTML（仅挂载 #app）
├── package.json                # 依赖与脚本
├── vite.config.ts              # Vite 构建配置（含 Tauri 适配）
├── tsconfig.json               # TypeScript 配置入口
├── tsconfig.app.json           # 应用层 TS 配置
├── tsconfig.node.json          # Node 层 TS 配置
├── env.d.ts                    # 环境类型声明 + 模块 shim
├── README.md                   # 项目说明
├── STRUCTURE.md                # 本文件 — 结构索引
├── SETUP.md                    # 开发环境配置指南（Tauri 依赖说明）
├── CHANGELOG.md                # 版本变更记录
│
├── public/                     # 静态资源（不经过 Vite 处理）
│   └── favicon.ico
│
├── src/                        # 前端源代码
│   ├── main.ts                 # 应用入口：挂载 Vue + Pinia + Router；检测 ?popout_route= 跳转悬挂窗口路由
│   ├── App.vue                 # 根组件：Header + Sidebar + RouterView；route.meta.popout 时纯净渲染；定义 --app-main-padding CSS 变量供子页面负 margin 抵消
│   │
│   ├── assets/                 # 项目资产
│   │   └── styles/             # 全局样式
│   │       ├── variables.css   # Design Token 体系
│   │       └── reset.css       # 浏览器默认样式重置
│   │
│   ├── components/             # 全局/共享组件
│   │   ├── AppHeader.vue       # 顶部导航栏（含搜索/快速笔记入口）
│   │   ├── AppSidebar.vue      # 侧边栏导航（收藏夹/最近/文件夹树/右键菜单/导入导出/快捷键面板/悬挂任务按钮）
│   │   ├── MilkdownEditor.vue  # Markdown 编辑器外壳（提供 Provider）
│   │   ├── MilkdownEditorCore.vue # 编辑器核心（Milkdown 插件注册）
│   │   ├── MarkdownRenderer.vue # Markdown → HTML 渲染（阅读模式）+ Mermaid 图表
│   │   ├── QuickNote.vue       # Ctrl+Q 快速笔记弹窗
│   │   ├── SearchDialog.vue    # Ctrl+K 全局搜索弹窗
│   │   ├── EditorToolbar.vue   # Markdown 格式化工具栏（14 按钮，分屏/WYSIWYG 通用）
│   │   ├── WikiLinkPicker.vue  # [[Wiki 链接]] 选择器下拉面板（WriteView/NoteDetailView 共享）
│   │   ├── SplitEditor.vue     # 分屏 Markdown 编辑器（源码 + 工具栏 + 实时预览，flex 填充父容器高度，pane 独立滚动）
│   │   ├── BacklinksPanel.vue  # 反向链接面板（展示引用当前笔记的其他笔记）
│   │   ├── TimePicker.vue      # 自定义时间选择器（步进器 ▲▼ + 滚轮 + 直接输入 + Teleport 定位）
│   │   ├── CategoryPicker.vue  # 分类选择器（搜索 + 键盘导航 + 子分类提示）
│   │   ├── ContextMenu.vue     # 通用右键上下文菜单（Teleport + fixed，支持菜单项数组）
│   │   ├── ConfirmDialog.vue   # 通用居中确认弹窗（Teleport 到 body）
│   │   ├── InputDialog.vue     # 通用文本输入操作弹窗（带有验证和描述功能，替代原生 prompt）
│   │   ├── CategoryDialog.vue  # 选择分类弹窗（封装 CategoryPicker）
│   │   └── DraftToast.vue      # 草稿恢复提示 Toast（3秒自动消失）
│   │
│   ├── views/                  # 路由页面组件
│   │   ├── HomeView.vue        # 主页指挥中心（问候 + 任务进度环 + 统计 + 快捷入口 + 最近更新）
│   │   ├── NotesView.vue       # 知识库（搜索 + 分类筛选 + 卡片网格 + FLIP 拖拽动画）
│   │   ├── WriteView.vue       # 新建笔记（模板 + 编辑器 + 图片/链接 + 草稿自动保存）
│   │   ├── NoteDetailView.vue  # 笔记详情（Flex 内部滚动架构：工具栏固定 + 内容区独立滚动 + 分屏 flex 填充 + 阅读 4 主题 + 字体缩放 + 悬挂）
│   │   ├── TrashView.vue       # 回收站（恢复/永久删除/清空）
│   │   ├── SettingsView.vue    # 设置页（外观/编辑器/数据/关于/字体缩放）
│   │   ├── TasksView.vue       # 日常管理（每日任务 + 卡片/列表视图 + 3种主题 + 一键完成 + 倒计时 + 健康提醒）
│   │   └── popout/             # 桌面悬挂窗口（always-on-top 独立窗口）
│   │       ├── HubTasks.vue      # 悬挂任务列表子模块
│   │       ├── HubTimer.vue      # 悬挂番茄钟子模块
│   │       ├── HubLife.vue       # 悬挂人生进度条子模块
│   │       ├── HubSettings.vue   # 悬挂设置聚合面板
│   │       ├── PopoutTasks.vue   # (已弃用) 旧版独立悬挂任务窗口
│   │       ├── PopoutTimer.vue   # (已弃用) 旧版独立悬挂计时窗口
│   │       ├── PopoutProgress.vue# 悬挂多功能枢纽 (Hub)：集成 时间、任务、倒计时与人生进度
│   │       └── PopoutNote.vue    # 悬挂笔记阅读桌面窗口
│   │
│   ├── stores/                 # Pinia 状态仓库
│   │   ├── theme.ts            # 主题管理（暗色/亮色 + 持久化）
│   │   ├── notes.ts            # 笔记数据（async CRUD + 分类 + 搜索 + 排序 + 回收站）
│   │   ├── settings.ts         # 应用设置（编辑器模式/字体/回收站清理 + localStorage）
│   │   └── tasks.ts            # 日常任务（任务 CRUD + 跳过标记 + 一键完成分类 + 倒计时 + 健康提醒 + 配置持久化 + 导入/导出）
│   │
│   ├── composables/            # Vue Composable 函数
│   │   ├── useEditorActions.ts # 编辑器共用操作（图片/链接/工具栏/粘贴）
│   │   └── useDraft.ts         # 草稿自动保存（防抖 localStorage + 恢复检测）
│   │
│   ├── utils/                  # 工具函数
│   │   ├── markdown.ts         # stripMarkdown / truncateText
│   │   ├── storage.ts          # 存储适配层（Tauri fs / localStorage 降级）
│   │   ├── shortcuts.ts        # 全局快捷键注册（Tauri 环境）
│   │   ├── templates.ts        # 笔记模板定义（6 种预设）
│   │   ├── images.ts           # 图片粘贴处理（base64 转换）
│   │   ├── dataio.ts           # 数据导入/导出（JSON + .md 支持）
│   │   └── scheduler.ts        # 后台调度器（任务提醒 + 健康提醒巡检）
│   │
│   ├── types/                  # 共享类型定义
│   │   └── index.ts            # Note / DailyTask / HealthReminder / CountdownState 等
│   │
│   └── router/                 # 路由配置
│       └── index.ts            # 路由表 + 页面标题同步；含 4 条 meta.popout 路由（/popout/*）
│
└── src-tauri/                  # Tauri 后端（Rust）
    ├── Cargo.toml              # Rust 依赖配置
    ├── tauri.conf.json         # Tauri 应用配置
    ├── build.rs                # Rust 构建脚本
    ├── src/
    │   ├── main.rs             # 桌面应用入口
    │   └── lib.rs              # async open_popout/resize_popout/close_popout commands；系统托盘
    ├── capabilities/           # Tauri 权限能力配置
    │   ├── default.json        # 默认权限（fs + global-shortcut + dialog + window + 5个窗口标签）
    │   └── desktop.json        # 桌面平台专用权限
└── icons/                  # 应用图标（各尺寸）
```

### 文档目录 (`docs/`)

```
docs/
├── 01-项目是怎么建起来的.md    # 项目搭建过程学习笔记
├── 02-V1和V2的对比与反思.md    # 架构对比分析
├── 03-数据存储机制详解.md      # Tauri fs + YAML frontmatter 存储方案
├── 04-功能方向规划.md          # 功能路线图与优先级
├── 05-构建与安装指南.md        # 构建、打包、安装与常见问题
└── 06-Markdown使用指南.md      # 高阶 MD 标记扩展详解（折叠面板/复选框等）
```

## 模块职责说明

### 样式层 (`src/assets/styles/`)

| 文件 | 职责 | 修改频率 |
|---|---|---|
| `variables.css` | 定义所有 Design Token：颜色、间距、圆角、阴影、动效参数、层叠上下文。暗色主题为默认，亮色主题通过 `[data-theme='light']` 覆盖 | 低 — 仅在调整全局视觉时修改 |
| `reset.css` | 消灭浏览器默认样式。包含 `box-sizing`、滚动条定制、焦点样式、表单元素重置、`::selection`、`prefers-reduced-motion` 降级、**SortableJS 拖拽克隆体全局样式**、**底部定位 tooltip (`data-tooltip-pos`)** | 极低 — 几乎不需要改 |

**加载顺序**：`main.ts` 中先 `import variables.css` 再 `import reset.css`，确保 Token 在重置规则可用。

### 组件层 (`src/components/`)

| 组件 | 职责 | Props / Events |
|---|---|---|
| `AppHeader.vue` | 毛玻璃顶栏。侧边栏切换、主题切换、搜索入口（Ctrl+K）、快速笔记入口（Ctrl+Q） | Props: `sidebarCollapsed` / Emits: `toggleSidebar`, `openSearch`, `openQuickNote` |
| `AppSidebar.vue` | 左侧导航。路由链接高亮、⭐ 收藏夹、🕐 最近打开、收件箱、📁 文件夹树（无限嵌套 + 展开/折叠）、导入/导出、快捷键面板 | Props: `collapsed` / Emits: `collapse` |
| `MilkdownEditor.vue` | 编辑器外壳。提供 `MilkdownProvider` inject 上下文 | Props: `modelValue`, `readonly` / Emits: `update:modelValue` |
| `MilkdownEditorCore.vue` | 编辑器核心。注册 commonmark/GFM/history/indent/clipboard/**math**/smartPaste 插件，监听 `markdownUpdated`。**智能粘贴**：DOM 层拦截粘贴事件，图片自动转 base64 image 节点，Markdown 文本自动解析为富文本 | Props: `modelValue` / Emits: `update:modelValue` |
| `MarkdownRenderer.vue` | 只读渲染。markdown-it + highlight.js + **texmath (KaTeX)** + **task-lists** + **Mermaid.js 图表**。支持 `[[title]]` 双向链接语法（渲染为可点击链接 + 跳转导航）。Mermaid 代码块自动渲染为 SVG，支持流程图/序列图/甘特图等 | Props: `content` |
| `QuickNote.vue` | 快速笔记弹窗。`<dialog>` 模态框，Markdown 输入 + Ctrl+Enter 保存到收件箱 | Props: `visible` / Emits: `close` |
| `SearchDialog.vue` | 全局搜索弹窗。全文搜索 + 关键词高亮 + 键盘导航（↑↓ Enter） | Props: `visible` / Emits: `close` |
| `EditorToolbar.vue` | Markdown 格式化工具栏（14 按钮），分屏/WYSIWYG 通用 | Emits: `insert`, `wrap` |
| `WikiLinkPicker.vue` | `[[Wiki 链接]]` 选择器下拉面板。从 WriteView/NoteDetailView 提取的共享组件 | Props: `show`, `search`, `candidates` / Emits: `toggle`, `update:search`, `select` |
| `SplitEditor.vue` | 分屏 Markdown 编辑器（源码 + 工具栏 + 实时预览）。flex:1 填充父容器高度，每个 pane 独立 overflow-y 滚动，pane-header sticky | v-model: `content`, `textareaRef` / Props: `showLinkPicker`, `linkSearch`, `linkCandidates` / Emits: 多个 |
| `BacklinksPanel.vue` | 反向链接面板。展示引用当前笔记的其他笔记列表 | Props: `backlinks` |

**编辑器架构说明**：`MilkdownEditor` 和 `MilkdownEditorCore` 必须拆分为两个组件，因为 `useEditor()` 需要在 `MilkdownProvider` 的 inject 上下文内调用。如果合并为一个组件会导致 `Symbol(editorInfoCtxKey) not found` 错误。

### 页面层 (`src/views/`)

| 页面 | 路由 | 依赖的 Store | 功能 |
|---|---|---|---|
| `HomeView.vue` | `/` | `notes` | 统计卡片（总笔记/分类/已收藏/已置顶）、快捷入口、最近更新列表 |
| `NotesView.vue` | `/notes` | `notes` | 搜索框、分类药丸、面包屑（嵌套分类时）、标签云筛选（`?tag=`）、收藏夹/最近视图（`?view=`）、笔记卡片网格、**FLIP 拖拽动画（Flexbox + capturePositions/playFlipAnimation）**、**Markdown 卡片预览** |
| `WriteView.vue` | `/write` | `notes` | 模板选择器 → WYSIWYG/分屏编辑 + 图片插入 + `[[title]]` 链接插入 + 标题/分类/标签表单 |
| `NoteDetailView.vue` | `/note/:id` | `notes` | **Flex 内部滚动架构**：detail-toolbar + editor-toolbar 固定不滚动，detail-content 独立滚动（分屏时 flex 填充，pane 独立滚动）；阅读/编辑/分屏切换，收藏/置顶/删除，`[[title]]` 链接，反向链接，**4 种阅读主题 + 编辑器主题适配**，字体缩放，悬挂窗口 |
| `TasksView.vue` | `/tasks` | `tasks` | 每日任务 + **卡片/列表视图切换** + **3种主题（默认/简约/彩色）** + **分类一键完成** + 倒计时 + 健康提醒 + 悬挂任务按钮 |
| `PopoutTasks.vue` | `/popout/tasks` | `tasks` | (旧版) 悬挂任务 |
| `PopoutTimer.vue` | `/popout/timer` | `tasks` | (旧版) 悬挂倒计时 |
| `PopoutNote.vue` | `/popout/note/:id` | `notes` | 悬挂笔记（popout，always-on-top）：完整 Markdown 阅读 |
| `PopoutProgress.vue` | `/popout/progress` | `tasks` | 全能时间枢纽 Hub：常驻时间进度横条，鼠标悬停可展开集成面板（任务、番茄钟、人生进度条及显示设置）；窗口几何基于 Tauri `currentMonitor().workArea` 做 Windows 多屏/DPI/任务栏安全定位，右侧贴边按右缘锚定展开；前端不再通过 `hide/show` 掩盖窗口变化，而是等待布局稳定后调用 Rust 端几何更新，避免触发 Windows 焦点链与任务栏闪动 |
| `TrashView.vue` | `/trash` | `notes` | 回收站：已删除笔记列表、恢复/永久删除、清空回收站确认 dialog |
| `SettingsView.vue` | `/settings` | `theme`, `settings`, `notes` | 设置：外观（主题/字体）、编辑器（默认模式）、数据（存储位置/统计/回收站清理）、系统（开机自启）、关于 |

### 工具层 (`src/utils/`)

| 文件 | 导出 | 用途 |
|---|---|---|
| `markdown.ts` | `stripMarkdown(text)` | 剥离 Markdown 标记，返回纯文本 |
| | `truncateText(text, max)` | 剥离标记 + 截断，用于卡片预览 |
| | `previewHtml(text, max)` | Markdown → 安全 HTML 预览片段（保留换行/粗体/斜体，剥离复杂语法） |
| `storage.ts` | `loadAllNotes()` | 从存储加载全部笔记（Tauri → .md 文件 / 浏览器 → localStorage） |
| | `saveNote(note)` | 保存单条笔记 |
| | `deleteNoteFile(id)` | 删除笔记文件 |
| | `migrateFromLocalStorage()` | 将旧 localStorage 数据迁移到文件系统 |
| | `isTauri()` | 检测当前是否在 Tauri 桌面环境中运行 |
| | `parseFrontmatter(raw)` | 解析 YAML frontmatter → `{ meta, content }`（供 `dataio.ts` 复用） |
| | `parseTags(raw)` | 解析标签字符串（`"[a, b]"` → `['a', 'b']`） |
| `shortcuts.ts` | `registerGlobalShortcuts(router)` | 注册系统级全局快捷键（仅 Tauri），启动时先 `unregisterAll` 防止 HMR 重复注册 |
| `templates.ts` | `getTemplates()` | 工厂函数，返回 6 种笔记模板（空白/会议/读书/日记/学习/待办），调用时动态生成当天日期 |
| | `templates[]` | 向后兼容的静态导出，推荐使用 `getTemplates()` |
| `images.ts` | `clipboardHasImage()` | 同步检测剪贴板是否含图片 |
| | `processClipboardImages()` | 异步处理粘贴图片，返回 base64 Markdown 语法 |
| `dataio.ts` | `exportNotesAsJson(notes)` | 导出全部笔记为 JSON（Tauri: save dialog / 浏览器: Blob） |
| | `importNotesFromFiles()` | 弹出文件选择器，解析 .json / .md 文件返回 Note 数据（复用 `storage.ts` 的 `parseFrontmatter`） |

### 状态层 (`src/stores/`)

| Store | 状态 | Actions | 持久化 |
|---|---|---|---|
| `theme.ts` | `theme: 'dark' \| 'light'` | `toggle()` | localStorage `omega-theme` |
| `notes.ts` | `notes[]`, `currentCategory`, `searchQuery`, `isLoading`, `recentIds`, `noteMap`（computed Map 索引） | `init`, `addNote`, `updateNote`, `deleteNote`, `restoreNote`, `permanentlyDelete`, `emptyTrash`, `togglePin`, `toggleFavorite`, `recordOpen`, `importBatch`, `reorderNotes`, `moveNoteToCategory`, `getNoteById`, `findNoteByTitle`, `getBacklinks` | 委托 `storage.ts` + localStorage |
| | 计算属性: `activeNotes`, `filteredNotes`, `categories`, `categoryTree`, `allTags`, `favoriteNotes`, `recentNotes`, `trashNotes`, `totalCount`, `pinnedCount`, `favoriteCount`, `trashCount` | | |
| `settings.ts` | `settings`（单一状态源），computed getters: `defaultEditorMode`, `fontFamily`, `trashAutoCleanDays`, `zoomLevel` | `setDefaultEditorMode`, `setFontFamily`, `setTrashAutoCleanDays`, `setZoomLevel`, `init` | localStorage `omega-settings` |

### 路由层 (`src/router/`)

| 路径 | 名称 | 组件 | 说明 |
|---|---|---|---|
| `/` | `home` | `HomeView` | 主页 |
| `/notes` | `notes` | `NotesView` | 知识库 |
| `/write` | `write` | `WriteView` | 新建笔记 |
| `/note/:id` | `note-detail` | `NoteDetailView` | 笔记详情 |
| `/trash` | `trash` | `TrashView` | 回收站 |
| `/settings` | `settings` | `SettingsView` | 设置 |
| `/popout/tasks` | `popout-tasks` | `PopoutTasks` | 悬挂任务（`meta.popout: true`） |
| `/popout/timer` | `popout-timer` | `PopoutTimer` | 悬挂计时（`meta.popout: true`） |
| `/popout/note/:id` | `popout-note` | `PopoutNote` | 悬挂笔记（`meta.popout: true`） |

路由使用 **Hash 模式** (`createWebHashHistory`)，Tauri 桌面应用中文件协议不支持 History 模式。

### Tauri 后端 (`src-tauri/`)

| 文件 | 职责 |
|---|---|
| `tauri.conf.json` | 应用配置（窗口大小、标识、构建命令、安全策略） |
| `Cargo.toml` | Rust 依赖声明 |
| `src/main.rs` | Windows 下隐藏控制台窗口，调用 `lib.rs` |
| `src/lib.rs` | Tauri 应用初始化：注册各插件；`async open_popout`（创建/聚焦悬挂窗口，支持 tasks/timer/note 三种，`progress` 默认落在主显示器 `work_area` 右下且以非聚焦方式创建/恢复）/ `async resize_popout` / `async close_popout` / `async update_popout_geometry`（Windows 下使用单次 `SetWindowPos` 同时移动+缩放并附带 `SWP_NOACTIVATE`，其他平台保留顺序型更新）；系统托盘（右键菜单含悬挂入口 + 左键恢复）；主窗口关闭→最小化到托盘 |
| `capabilities/` | 权限能力声明（fs + global-shortcut + dialog + autostart） |

## 数据流向

```
用户操作
  ↓
Vue 组件 (views/)
  ↓ 调用
Pinia Store (stores/notes.ts)    ← async API
  ↓ 委托
storage.ts 存储适配层
  ├── Tauri 环境 → @tauri-apps/plugin-fs → AppData/notes/*.md
  └── 浏览器环境 → localStorage (自动降级)
```

## 命名约定

| 类型 | 约定 | 示例 |
|---|---|---|
| 组件文件 | PascalCase | `AppHeader.vue` |
| 页面文件 | PascalCase + `View` 后缀 | `HomeView.vue` |
| Store 文件 | camelCase | `notes.ts` |
| 工具文件 | camelCase | `markdown.ts` |
| CSS Token | `--color-*` / `--space-*` / `--radius-*` / `--z-*` | `var(--color-accent)` |
| 路由路径 | kebab-case | `/note/:id` |

## 新增文件检查清单

| 你要做什么 | 放在哪里 |
|---|---|
| 新增全局/共享 UI 组件 | `src/components/` |
| 新增路由页面 | `src/views/` + 在 `router/index.ts` 注册；popout 窗口页加 `meta: { popout: true }` |
| 新增悬挂窗口 | `src/views/popout/` + router 注册 + Rust `open_popout` 新增 kind 分支 + capabilities 窗口标签 |
| 新增数据/状态管理 | `src/stores/` |
| 新增全局 CSS | `src/assets/styles/` + 在 `main.ts` 引入 |
| 新增页面级样式 | 对应 `.vue` 文件的 `<style scoped>` |
| 新增工具函数 | `src/utils/` |
| 新增类型定义 | `src/types/` |
| 新增 Rust 命令 | `src-tauri/src/lib.rs` + 在 `capabilities/` 声明权限 |

---

> **维护提醒**：每次新增或删除文件后，请同步更新本文档的"目录总览"和对应的"模块职责说明"表格。
