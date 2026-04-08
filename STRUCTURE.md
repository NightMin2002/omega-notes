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
├── RELEASE.md                  # 发布流程手册（版本发布检查清单 & 步骤）
├── RELEASE_NOTES.md            # 版本发布日志
├── 生成发版日志.bat             # 一键提取commit消息脚本
│
├── scripts/                    # 工具脚本
│   └── bump-version.js         # 版本号三处同步脚本（package.json / tauri.conf.json / Cargo.toml）
│   └── update-changelog.js     # 提交信息生成脚本
│
├── .github/workflows/          # CI/CD 工作流
│   └── release.yml             # 自动构建发布（tag push 触发 → 编译签名 → GitHub Releases）
│
├── public/                     # 原生静态资源（用于存放不经过 Vite 处理、原样复制的文件；目前暂空）
│
├── src/                        # 前端源代码
│   ├── main.ts                 # 应用入口：挂载 Vue + Pinia + Router；检测 ?popout_route= 跳转悬挂窗口路由；启动自动更新检查（5s 延迟 + 4h 定时）
│   ├── App.vue                 # 根组件：Header + Sidebar + RouterView；route.meta.popout 时纯净渲染；定义 --app-main-padding CSS 变量供子页面负 margin 抵消
│   │
│   ├── assets/                 # 项目资产
│   │   └── styles/             # 全局样式
│   │       ├── variables.css   # Design Token 体系
│   │       ├── reset.css       # 浏览器默认样式重置
│   │       ├── reading-themes.css # 笔记阅读主题（极光/笔墨/终端/羊皮纸/源码）
│   │       └── editor-themes.css  # 笔记编辑模式主题适配 + WYSIWYG 穿透样式
│   │
│   ├── components/             # 全局/共享组件
│   │   ├── AppHeader.vue       # 顶部导航栏（含搜索/快速笔记入口）
│   │   ├── AppSidebar.vue      # 侧边栏导航（组装层：路由链接 + 子组件编排）
│   │   ├── SidebarFolderTree.vue # 侧边栏文件夹树（递归展平 + 展开/折叠 + 右键菜单 + 新建子分类）
│   │   ├── SidebarFooter.vue   # 侧边栏底部（设置入口 + 桌面微件 + 导入/导出 + 版本号）
│   │   ├── ShortcutManagerDialog.vue # 自定义快捷键管理中心（分组卡片界面、支持即时按键录入测试、状态持久化控制）
│   │   ├── SidebarShortcutPanel.vue # 快捷键配置唤起入口（全新向导按钮）
│   │   ├── MilkdownEditor.vue  # Markdown 编辑器外壳（提供 Provider）
│   │   ├── MilkdownEditorCore.vue # 编辑器核心（Milkdown 插件注册）
│   │   ├── MarkdownRenderer.vue # Markdown → HTML 渲染（阅读模式）+ Mermaid 图表 + 图片/图表灯箱放大
│   │   ├── ImageLightbox.vue  # 全屏灯箱组件（图片/Mermaid SVG 放大查看，缩放/平移/键盘操控）
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
│   │   ├── CalendarWidget.vue  # 自定义月历组件（7×6 网格、待办标点、月导航、无第三方依赖）
│   │   ├── DraftToast.vue      # 草稿恢复提示 Toast（3秒自动消失）
│   │   ├── DatePicker.vue      # 自定义日期选择器（Teleport 弹出日历面板，替代原生 input[type=date]）
│   │   ├── TemplateEditorDialog.vue # 自定义笔记模板编辑弹窗（新建/编辑，含名称/描述/分类/内容字段）
│   │   ├── NoteListPanel.vue  # 知识库浏览器 Master 面板（搜索 + 分类树折叠 + 笔记列表，emit select 不跳路由）
│   │   ├── NoteReaderPanel.vue # 知识库浏览器 Detail 面板（嵌入式阅读/编辑器，编辑模式含主题切换，复用 MarkdownRenderer + MilkdownEditor）
│   │   ├── NoteOutline.vue    # 笔记目录大纲侧边栏（字数统计 + 阅读进度 + 标题 TOC 导航）
│   │   ├── SubNotePanel.vue   # 子笔记侧边面板（可折叠抽屉，子笔记列表 + 新建 + 删除，NoteDetailView 左侧）
│   │   ├── ThemeSwitcher.vue  # 阅读主题切换器（v-model 绑定，支持紧凑模式，三方共用）
│   │   ├── shared/             # 跨视图共享独立业务模块
│   │   │   └── CountdownModule.vue # 全能型悬浮倒计时控制台（主面板与 Hub 悬浮窗高度统一互通）
│   │   └── popout/             # 桌面悬浮窗子组件（非路由，由 views/popout/ 引用）
│   │       ├── HubExpandedBody.vue# 悬浮窗展开面板内容（任务/待办/番茄钟/人生/控制台 Tabs）
│   │       ├── HubTasks.vue      # 悬挂任务列表子模块
│   │       ├── HubTodos.vue      # 悬挂待办事项子模块（今日/本周/本月分组 + 备注摘要 + 快速添加）
│   │       ├── HubTimer.vue      # 悬挂番茄钟子模块
│   │       ├── HubLife.vue       # 悬挂人生进度条子模块
│   │       └── HubSettings.vue   # 悬挂控制台聚合面板
│   │
│   ├── views/                  # 路由页面组件
│   │   ├── HomeView.vue        # 主页指挥中心（问候 + 任务进度环 + 统计 + 快捷入口 + 最近更新）
│   │   ├── NotesView.vue       # 知识库（搜索 + 分类筛选 + 网格/列表视图切换 + 卡片网格 + FLIP 拖拽动画）
│   │   ├── ExplorerView.vue    # 知识库浏览器（主从布局：左侧 NoteListPanel + 右侧 NoteReaderPanel + 拖拽分隔条）
│   │   ├── WriteView.vue       # 新建笔记（模板选择器 + 自定义模板 + 待办跳转入口 + 编辑器 + 图片/链接 + 草稿自动保存）
│   │   ├── NoteDetailView.vue  # 笔记详情（Grid 三栏居中布局：工具栏固定 + 内容区独立滚动 + 右侧目录大纲 + 分屏 + 阅读 5 主题 + 字体缩放 + 悬挂）
│   │   ├── TrashView.vue       # 回收站（恢复/永久删除/清空）
│   │   ├── SettingsView.vue    # 设置页（外观/编辑器/数据/关于/字体缩放）
│   │   ├── TasksView.vue       # 日常管理（每日任务 + 卡片/列表视图 + 3种主题 + 一键完成 + 倒计时 + 健康提醒）
│   │   ├── TodosView.vue       # 待办事项（日历+列表双栏、Modal新建弹窗、列表独立滚动、日历日期继承、自定义DatePicker、筛选tabs带图标、逾期高亮）
│   │   └── popout/             # 桌面悬挂窗口路由页面（always-on-top 独立窗口）
│   │       ├── PopoutProgress.vue# 悬浮窗底部时间条窗口：拖拽/吸附/方向判断/面板调度
│   │       ├── PopoutProgressPanel.vue# 悬浮窗独立展开面板窗口：承载 Tabs 内容区
│   │       └── PopoutNote.vue    # 悬挂笔记阅读桌面窗口
│   │
│   ├── stores/                 # Pinia 状态仓库
│   │   ├── theme.ts            # 主题管理（暗色/亮色 + 持久化）
│   │   ├── notes.ts            # 笔记数据（async CRUD + 分类 + 搜索 + 排序 + 回收站）
│   │   ├── settings.ts         # 应用设置（编辑器模式/字体/回收站清理 + localStorage）
│   │   ├── tasks.ts            # 日常任务（任务 CRUD + 跳过标记 + 一键完成分类 + 倒计时 + 健康提醒 + 配置持久化 + 导入/导出）
│   │   ├── todos.ts            # 待办事项（CRUD + 优先级排序 + 日历映射 + 已完成自动清理 + 跨窗口同步）
│   │   └── updater.ts          # 应用更新（版本检查 + 下载安装 + 进度追踪 + 忽略版本 + 错误处理）
│   │
│   ├── composables/            # Vue Composable 函数
│   │   ├── useEditorActions.ts # 编辑器共用操作（图片/链接/工具栏/粘贴）
│   │   ├── useReadingTheme.ts  # 阅读主题状态管理（localStorage + BroadcastChannel 跨窗口同步）
│   │   └── useDraft.ts         # 草稿自动保存（防抖 localStorage + 恢复检测）
│   │
│   ├── utils/                  # 工具函数
│   │   ├── markdown.ts         # stripMarkdown / truncateText
│   │   ├── storage.ts          # 存储适配层（Tauri fs / localStorage 降级）
│   │   ├── shortcuts.ts        # 全局快捷键注册（Tauri 环境）
│   │   ├── templates.ts        # 笔记模板定义（5 种预设，待办清单已改为跳转入口）
│   │   ├── images.ts           # 图片粘贴处理（base64 转换）
│   │   ├── dataio.ts           # 数据导入/导出（JSON + .md 支持）
│   │   ├── scheduler.ts        # 后台调度器（任务提醒 + 健康提醒巡检）
│   │   └── tooltip.ts          # 全局 JS Tooltip 引擎（解决 CSS overflow 截断问题）
│   │
│   ├── types/                  # 共享类型定义
│   │   └── index.ts            # Note（含 parentId 子笔记引用） / DailyTask / HealthReminder / CountdownState / CustomTemplate 等
│   │
│   └── router/                 # 路由配置
│       └── index.ts            # 路由表 + 页面标题同步；含 3 条 meta.popout 路由（/popout/*）
│
└── src-tauri/                  # Tauri 后端（Rust）
    ├── Cargo.toml              # Rust 依赖配置
    ├── tauri.conf.json         # Tauri 应用配置
    ├── build.rs                # Rust 构建脚本
    ├── src/
    │   ├── main.rs             # 桌面应用入口
    │   └── lib.rs              # 弹出窗命令：时间条/展开面板/笔记窗口创建、几何更新、隐藏与关闭；系统托盘
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
| `reading-themes.css` | 笔记阅读模式 5 套视觉主题：**极光 (Aurora)**、**笔墨 (Ink)**、**终端 (Terminal)**、**羊皮纸 (Parchment)**、**源码 (Source)**。从 `NoteDetailView.vue` 提取，以 `.theme-xxx` 前缀隔离，含深/浅色模式双端适配 | 低 — 仅在调整阅读主题视觉时修改 |
| `editor-themes.css` | 笔记编辑模式各主题适配：`.edit-form.theme-xxx` 表单样式 + Milkdown/ProseMirror WYSIWYG 穿透样式。从 `NoteDetailView.vue` 提取 | 低 — 仅在调整编辑器主题时修改 |

**加载顺序**：`main.ts` 中依次 `import variables.css` → `reset.css` → `reading-themes.css` → `editor-themes.css`，确保 Token 在后续样式中可用。

### 组件层 (`src/components/`)

| 组件 | 职责 | Props / Events |
|---|---|---|
| `AppHeader.vue` | 毛玻璃顶栏。侧边栏切换、主题切换、搜索入口（Ctrl+K）、快速笔记入口（Ctrl+Q） | Props: `sidebarCollapsed` / Emits: `toggleSidebar`, `openSearch`, `openQuickNote` |
| `AppSidebar.vue` | 侧边栏组装层。支持“首页/知识库”双标签切换。路由链接分类编排（主页、新建笔记、任务 vs 笔记库、收藏夹、最近打开、收件箱），编排 `SidebarFolderTree` + `SidebarFooter` 子组件 | Props: `collapsed` / Emits: `collapse` |
| `SidebarFolderTree.vue` | 📁 文件夹树。递归展平分类树 + 无限嵌套展开/折叠 + 右键菜单（新建笔记/子分类/删除） | Emits: `collapseIfMobile` |
| `SidebarFooter.vue` | 侧边栏底部。设置入口 + 桌面微件按钮 + 导入/导出 + 版本号 + 快捷键面板 | Emits: `collapseIfMobile` |
| `ShortcutManagerDialog.vue` | 全局自定义快捷键管理器。涵盖系统与应用内全系列捕捉设定，带有高级按键录制盒与卡片分组。 | Props: `open` / Emits: `close` |
| `SidebarShortcutPanel.vue` | 呼出 `ShortcutManagerDialog` 的底部静态按钮 | *无外部接口* |
| `MilkdownEditor.vue` | 编辑器外壳。提供 `MilkdownProvider` inject 上下文 | Props: `modelValue`, `readonly` / Emits: `update:modelValue` |
| `MilkdownEditorCore.vue` | 编辑器核心。注册 commonmark/GFM/history/indent/clipboard/**math**/smartPaste 插件，监听 `markdownUpdated`。**智能粘贴**：DOM 层拦截粘贴事件，图片自动转 base64 image 节点，Markdown 文本自动解析为富文本 | Props: `modelValue` / Emits: `update:modelValue` |
| `MarkdownRenderer.vue` | 只读渲染。markdown-it + highlight.js + **texmath (KaTeX)** + **task-lists** + **Mermaid.js 图表**。支持 `[[title]]` 双向链接语法（渲染为可点击链接 + 跳转导航）。Mermaid 代码块自动渲染为 SVG，支持流程图/序列图/甘特图等。**内嵌 ImageLightbox 灯箱**：点击图片或 Mermaid 图表全屏放大查看 | Props: `content` |
| `ImageLightbox.vue` | 全屏灯箱放大查看组件。支持图片和 SVG（Mermaid 图表）两种内容模式，提供缩放（滚轮/按钮 ±/0 重置）、拖拽平移、键盘快捷键（Esc 关闭），Teleport 到 body 层 | Props: `open`, `src`, `svgContent`, `alt` / Emits: `close` |
| `QuickNote.vue` | 快速笔记弹窗。`<dialog>` 模态框，Markdown 输入 + Ctrl+Enter 保存到收件箱 | Props: `visible` / Emits: `close` |
| `SearchDialog.vue` | 全局搜索弹窗。全文搜索 + 关键词高亮 + 键盘导航（↑↓ Enter） | Props: `visible` / Emits: `close` |
| `EditorToolbar.vue` | Markdown 格式化工具栏（14 按钮），分屏/WYSIWYG 通用 | Emits: `insert`, `wrap` |
| `WikiLinkPicker.vue` | `[[Wiki 链接]]` 选择器下拉面板。从 WriteView/NoteDetailView 提取的共享组件 | Props: `show`, `search`, `candidates` / Emits: `toggle`, `update:search`, `select` |
| `SplitEditor.vue` | 分屏 Markdown 编辑器（源码 + 工具栏 + 实时预览）。flex:1 填充父容器高度，每个 pane 独立 overflow-y 滚动，pane-header sticky | v-model: `content`, `textareaRef` / Props: `showLinkPicker`, `linkSearch`, `linkCandidates` / Emits: 多个 |
| `BacklinksPanel.vue` | 反向链接面板。展示引用当前笔记的其他笔记列表 | Props: `backlinks` |
| `TimePicker.vue` | 自定义时间选择器。支持鼠标滚轮减加时间，Teleport 定位防止被 `overflow: hidden` 裁剪 | v-model: `modelValue` / Props: `minuteStep` |
| `CategoryPicker.vue` | 分类选择器下拉组件。支持搜索、新建分类、子分类辅助高亮。Teleport 动态定位 | v-model: `modelValue` |
| `ContextMenu.vue` | 通用右键上下文菜单。点击外部或按下 Escape 自动关闭，层级高过 modal | Props: `show`, `position`, `items` / Emits: `update:show`, `select` |
| `ConfirmDialog.vue` | 替代原生 `confirm()` 的通用操作确认模态框，支持 `danger` 与 `accent` 主题 | Props: `open`, `title`, `message`, `confirmType` 等 / Emits: `confirm`, `cancel` |
| `InputDialog.vue` | 替代原生 `prompt()` 的通用文本输入模态框。支持 `requiredMatch` 强制输入指定字符作二次确认等安全控制 | Props: `open`, `title`, `allowEmpty`, `requiredMatch`, `description` 等 / Emits: `confirm`, `cancel` |
| `CategoryDialog.vue` | 对于 `CategoryPicker.vue` 的弹窗级别封装，通常用于在阅读模式下触发笔记“移动分类”操作 | Props: `open`, `title`, `initialCategory` / Emits: `confirm`, `cancel` |
| `CalendarWidget.vue` | 自定义月历组件，纯 CSS Grid 实现，无第三方依赖。支持待办日期圆点标记（按优先级显示颜色）、今天/选中高亮、月切换导航 | Props: `selectedDate`, `dotMap` / Emits: `select` |
| `DraftToast.vue` | 用于通知“已恢复草稿”等非阻塞信息的底部优雅提示条，内置 3 秒自动消失机制 | Props: `show`, `message` / Emits: `close` |
| `DatePicker.vue` | 自定义日期选择器，替代原生 `input[type=date]`。Teleport 弹出日历面板，支持待办圆点、清除日期、今天快捷键 | v-model: `modelValue` / Props: `placeholder`, `dotMap` |
| `NoteListPanel.vue` | 知识库浏览器 Master 面板。搜索筛选 + 分类/全部/收藏三 Tab + 分类树递归折叠 + 笔记条目列表（选中高亮） | Props: `selectedId` / Emits: `select` |
| `NoteReaderPanel.vue` | 知识库浏览器 Detail 面板。嵌入式阅读/编辑器，切换笔记时自动退出编辑。编辑模式含主题切换（ThemeSwitcher）+ 编辑表单样式与 NoteDetailView 统一。复用 MarkdownRenderer、MilkdownEditor、SplitEditor、BacklinksPanel | Props: `noteId` / Emits: `navigate`, `deleted` |
| `NoteOutline.vue` | 笔记目录大纲侧边栏。字数/段落/章节统计、阅读进度条、从 Markdown 标题解析 TOC 导航（滚动跟踪高亮 + 点击跳转）。无标题时显示统计信息 + 提示 | Props: `content`, `scrollContainer` |
| `SubNotePanel.vue` | 子笔记可折叠侧边面板。折叠态显示图标+子笔记数量角标，展开态显示子笔记列表（选中高亮）、新建输入框、删除确认。仅父笔记视图显示，子笔记视图自动隐藏 | Props: `parentId`, `activeChildId`, `isChildNote` / Emits: `select`, `back`, `created` |
| `ThemeSwitcher.vue` | 阅读主题切换器（v-model 绑定，支持深浅色与预设组合，三方共用） | v-model: `modelValue`, Props: `compact` |
| `shared/CountdownModule.vue` | 现代化并轨番茄钟 / 倒计时核心面板。负责与全局 Tasks 引擎交互，带有高频视图绑定与自适应光影 UI | 依赖: `useTasksStore` |

**编辑器架构说明**：`MilkdownEditor` 和 `MilkdownEditorCore` 必须拆分为两个组件，因为 `useEditor()` 需要在 `MilkdownProvider` 的 inject 上下文内调用。如果合并为一个组件会导致 `Symbol(editorInfoCtxKey) not found` 错误。

### 页面层 (`src/views/`)

| 页面 | 路由 | 依赖的 Store | 功能 |
|---|---|---|---|
| `HomeView.vue` | `/` | `tasks`, `todos` | 效率主页：Mega Hero 看板（动态时间问候/日期/超大任务进度环）与行动卡片 |
| `KnowledgeBaseView.vue`| `/kb-home` | `notes` | 知识库专属底座：呈现全库统计（文章数/类目/收藏）、收件箱未理及最近更新 |
| `NotesView.vue` | `/notes` | `notes` | 搜索框、**网格/列表视图切换（localStorage 持久化）**、分类药丸（支持拖拽放入移动分类）、面包屑（嵌套分类时）、标签云筛选（`?tag=`）、收藏夹/最近视图（`?view=`）、笔记卡片网格（自适应 2-3 列）、列表视图、笔记数量统计、**FLIP 拖拽动画**、**拖拽卡片到分类药丸/侧边栏文件夹移动分类**、**Markdown 卡片预览** |
| `ExplorerView.vue` | `/explorer/:id?` | `notes` | **知识库浏览器（主从布局）**：左侧 NoteListPanel（Master）+ 右侧 NoteReaderPanel（Detail）+ 可拖拽分隔条（宽度持久化）+ URL 同步选中笔记 + 窄屏上下分栏降级 |
| `WriteView.vue` | `/write` | `notes`, `settings` | 模板选择器 → WYSIWYG/分屏编辑 + 图片插入 + `[[title]]` 链接插入 + 标题/分类/标签表单 + **自定义模板管理（新建/编辑/删除/右键菜单）** + **待办事项跳转入口** |
| `NoteDetailView.vue` | `/note/:id` | `notes` | **Flex 内部滚动架构**：detail-toolbar + editor-toolbar 固定不滚动，detail-content 独立滚动（分屏时 flex 填充，pane 独立滚动）；阅读/编辑/分屏切换，收藏/置顶/删除，`[[title]]` 链接，反向链接，**4 种阅读主题 + 编辑器主题适配**，字体缩放，悬挂窗口 |
| `TasksView.vue` | `/tasks` | `tasks` | 每日任务 + **卡片/列表视图切换** + **3种主题（默认/简约/彩色）** + **分类一键完成** + 倒计时 + 健康提醒 + 悬挂任务按钮 |
| `TodosView.vue` | `/todos` | `todos` | 待办事项主页：**Flex 固定高度布局**（页头固定 + 列表独立滚动）；左侧自定义月历 + 筛选 tabs（全部/今天/本周/逾期，带 SVG 图标）+ 统计；右侧待办列表（优先级圆点 + 截止日期 + 逾期红边）；**Teleport Modal 新建弹窗**（不影响页面文档流）；**日历日期继承新建**；**自定义 DatePicker**；已完成折叠区 |
| `PopoutNote.vue` | `/popout/note/:id` | `notes` | 悬挂笔记（popout，always-on-top）：完整 Markdown 阅读 |
| `SettingsView.vue` | `/settings` | `theme`, `settings`, `notes` | 设置：外观（主题/字体）、编辑器（默认模式）、数据（存储位置/统计/回收站清理）、系统（开机自启）、关于 |
| `PopoutProgress.vue` | `/popout/progress` | `tasks` | 底部常驻悬浮时间条：常驻时间、拖拽、边缘吸附、分向展开。通过 `BroadcastChannel('omega-hub-channel')` 与 Panel 通透通信，避免 WebView 渲染迟滞引发重置闪烁 |
| `PopoutProgressPanel.vue` | `/popout/progress-panel` | `tasks` | 悬浮窗独立展开面板窗口：承载 5 个 Tab 视图组件，支持隐藏状态下的物理坐标判定与预热 | |

**悬浮窗子组件** (`src/components/popout/`)：

| 组件 | 依赖的 Store | 功能 |
|---|---|---|
| `HubExpandedBody.vue` | - | 悬浮窗面板包装层：统一管理 5 个 Tab 子部件切换（任务/待办/番茄钟/人生进度/控制台） |
| `HubTasks.vue` | `tasks` | 悬浮窗任务小部件（快速打卡、极简列表） |
| `HubTodos.vue` | `todos` | 悬浮窗待办小部件（今日/本周/本月/全部分组视图 + 备注摘要 + 快速添加，逾期红色标记） |
| `HubTimer.vue` | `tasks` | 悬浮窗番茄钟小部件（环形 SVG 倒计时） |
| `HubLife.vue` | - | 悬浮窗人生进度小部件（自定义极客字库 + 毫秒级心跳逻辑） |
| `HubSettings.vue` | - | 悬浮窗局部偏好控制台小部件 |


### 组合式函数 (`src/composables/`)

| 文件 | 导出 | 用途 |
|---|---|---|
| `useEditorActions.ts` | `useEditorActions` | 提取 WYSIWYG / 源码模式下通用的 Markdown 编辑器控制逻辑（图片插入、Wiki 链接、工具栏快捷插入/包裹、粘贴拦截转存） |
| `useDraft.ts` | `useDraft` | 利用 localStorage 实现高配的草稿自动化引擎：800ms 防抖热挂载保存，按组件销毁周期执行缓冲清洗和强制保存 |
| `useAppShortcuts.ts`| `useAppShortcuts` | 按键事件拦截与解析组合 API，主要提供 `matchShortcut` 供各面板快速应用自定义或读取的快捷键配置 |

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
| `templates.ts` | `getTemplates()` | 工厂函数，返回 5 种笔记模板（空白/会议/读书/日记/学习），调用时动态生成当天日期 |
| | `templates[]` | 向后兼容的静态导出，推荐使用 `getTemplates()` |
| `images.ts` | `clipboardHasImage()` | 同步检测剪贴板是否含图片 |
| | `processClipboardImages()` | 异步处理粘贴图片，返回 base64 Markdown 语法 |
| `dataio.ts` | `exportNotesAsJson(notes, tasks, records)` | 导出全部内容为 JSON（Tauri: save dialog / 浏览器: Blob） |
| | `importNotesFromFiles()` | 弹出文件选择器，解析 .json / .md 文件返回导入数据（复用 `storage.ts` 的 `parseFrontmatter`） |
| `scheduler.ts` | `startScheduler()`, `stopScheduler()` | 15 秒高频防重入调度器：系统静默时段检测、健康提醒池抖动机制，以及基于当天 key 的每日任务闹钟分发 |

### 状态层 (`src/stores/`)

| Store | 状态 | Actions | 持久化 |
|---|---|---|---|
| `theme.ts` | `theme: 'dark' \| 'light'` | `toggle()` | localStorage `omega-theme` |
| `notes.ts` | `notes[]`, `currentCategory`, `searchQuery`, `isLoading`, `recentIds`, `draggingNoteId`（跨组件拖拽状态）, `noteMap`（computed Map 索引） | `init`, `addNote`, `updateNote`, `deleteNote`, `restoreNote`, `permanentlyDelete`, `emptyTrash`, `togglePin`, `toggleFavorite`, `recordOpen`, `importBatch`, `reorderNotes`, `moveNoteToCategory`, `getNoteById`, `findNoteByTitle`, `getBacklinks` | 委托 `storage.ts` + localStorage |
| | 计算属性: `activeNotes`, `filteredNotes`, `categories`, `categoryTree`, `allTags`, `favoriteNotes`, `recentNotes`, `trashNotes`, `totalCount`, `pinnedCount`, `favoriteCount`, `trashCount` | | |
| `settings.ts` | `settings`（单一状态源），computed getters: `defaultEditorMode`, `fontFamily`, `trashAutoCleanDays`, `contentZoom`, `customTemplates` | `setDefaultEditorMode`, `setFontFamily`, `setTrashAutoCleanDays`, `setContentZoom`, `addCustomTemplate`, `updateCustomTemplate`, `removeCustomTemplate`, `init` | localStorage `omega-settings` |
| `shortcuts.ts` | `shortcuts[]`，分类 getters (`globalShortcuts`, `appShortcuts`) | `updateShortcut`, `toggleShortcut`, `resetToDefault`, `resetAll` | localStorage `omega-shortcuts` |
| `tasks.ts` | `config`, `tasks`, `records`, `healthReminder`, `countdown` | `addTask`, `toggleComplete`, `startCountdown`, `notifyCountdownOnce` 等丰富日常管理接口 | 委托 localStorage 支持多窗口同步 |
| `todos.ts` | `todos[]`, `autoCleanDays` | `addTodo`, `updateTodo`, `removeTodo`, `toggleComplete`, `clearCompleted`, `importTodos`, `setAutoCleanDays` | localStorage `omega-todos` |
| | 计算属性: `pendingTodos`, `completedTodos`, `overdueTodos`, `todayTodos`, `upcomingTodos`, `pendingCount`, `overdueCount`, `datePriorityMap` | | |
| `updater.ts` | `hasUpdate`, `updateInfo`, `downloadProgress`, `downloadTotalBytes` | `checkForUpdates`, `downloadAndInstall`, `dismissUpdate` | 由 Tauri 官方 Updater 插件提供后端支撑 |

### 路由层 (`src/router/`)

| 路径 | 名称 | 组件 | 说明 |
|---|---|---|---|
| `/` | `home` | `HomeView` | 效率主页 |
| `/kb-home` | `kb-home` | `KnowledgeBaseView` | 知识库总览 |
| `/notes` | `notes` | `NotesView` | 知识库（网格/列表） |
| `/explorer/:id?` | `explorer` | `ExplorerView` | 知识库浏览器（主从布局） |
| `/write` | `write` | `WriteView` | 新建笔记 |
| `/note/:id` | `note-detail` | `NoteDetailView` | 笔记详情 |
| `/trash` | `trash` | `TrashView` | 回收站 |
| `/todos` | `todos` | `TodosView` | 待办事项 |
| `/settings` | `settings` | `SettingsView` | 设置 |
| `/popout/note/:id` | `popout-note` | `PopoutNote` | 悬挂笔记（`meta.popout: true`） |
| `/popout/progress` | `popout-progress` | `PopoutProgress` | 悬浮时间条主窗口（`meta.popout: true`） |
| `/popout/progress-panel` | `popout-progress-panel` | `PopoutProgressPanel` | 悬浮侧边展开面板（`meta.popout: true`） |

路由使用 **Hash 模式** (`createWebHashHistory`)，Tauri 桌面应用中文件协议不支持 History 模式。

### Tauri 后端 (`src-tauri/`)

| 文件 | 职责 |
|---|---|
| `tauri.conf.json` | 应用配置（窗口大小、标识、构建命令、安全策略） |
| `Cargo.toml` | Rust 依赖声明 |
| `src/main.rs` | Windows 下隐藏控制台窗口，调用 `lib.rs` |
| `src/lib.rs` | Tauri 应用初始化：注册各插件；`async open_popout`（创建/聚焦悬挂窗口，`progress` 为时间条窗口并预热隐藏的展开面板）/ `async show_progress_panel` / `async hide_progress_panel` / `async resize_popout` / `async close_popout` / `async update_popout_geometry`（Windows 下使用单次 `SetWindowPos` 同时移动+缩放并附带 `SWP_NOACTIVATE`，其他平台保留顺序型更新）；系统托盘（右键菜单含悬挂入口 + 左键恢复）；主窗口关闭→最小化到托盘 |
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
