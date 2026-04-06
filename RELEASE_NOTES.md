## 更新日志 - 2026-04-06

### 优化：大纲目录邻近高亮+复制按钮移至工具栏+源码主题修复
- NoteOutline 重写为索引匹配+getBoundingClientRect滚动追踪，废弃文本ID匹配
- 实现邻近高亮效果：当前章节全亮，距离1/2的条目渐弱高亮
- 复制正文按钮从正文区域移到顶部工具栏
- NoteReaderPanel添加源码主题支持

### 重构：提取 ThemeSwitcher 组件 + useReadingTheme composable
- 新增 useReadingTheme.ts：统一管理阅读主题状态（localStorage + BroadcastChannel 跨窗口同步）
 - 新增 ThemeSwitcher.vue：v-model 绑定的主题切换器，支持紧凑模式（仅图标）
 - NoteDetailView：替换两处重复的主题按钮组为 ThemeSwitcher 组件（消除 130+ 行重复代码）
 - NoteReaderPanel：集成 ThemeSwitcher（紧凑模式嵌入工具栏）+ NoteOutline 目录大纲
 - 两个视图的阅读主题现在通过 BroadcastChannel 跨窗口实时同步
 - 更新 STRUCTURE.md 反映新组件和 composable

### 新增：笔记阅读模式目录大纲 + Grid 居中布局优化
- 新增 NoteOutline.vue 组件：字数/段落统计、阅读进度条、Markdown 标题 TOC 导航（滚动跟踪 + 点击跳转）

 - 阅读模式改为 CSS Grid 三栏居中布局（1fr | 780px 文章 | 1fr），文章视觉居中不偏移

 - 大纲组件利用右侧 1fr 空间，无标题笔记也显示统计信息

 - 窄屏（≤1100px）自动隐藏大纲

 - 更新 STRUCTURE.md 反映新组件和布局变更

### 重构：提取笔记详情页主题样式为独立 CSS 文件
- 从 NoteDetailView.vue（2491 行）提取阅读主题和编辑器主题样式

 - 新增 reading-themes.css（972 行）：5 套阅读视觉方案（极光/笔墨/终端/羊皮纸/源码）

 - 新增 editor-themes.css（549 行）：编辑模式主题适配 + WYSIWYG 穿透样式

 - NoteDetailView.vue 瘦身至 978 行（减少 61%）

 - main.ts 新增两个 CSS 文件的全局引入

 - 更新 STRUCTURE.md 反映新的样式文件结构

### 知识库体验全面升级：主从布局浏览器 + 卡片UI优化 + 视图切换
- 新增 ExplorerView 主从布局页面（/explorer/:id?），左侧分类树+笔记列表，右侧实时阅读/编辑
 - 新增 NoteListPanel 组件（Master 面板：搜索筛选 + 分类/全部/收藏三Tab + 分类树折叠 + 笔记条目列表）
 - 新增 NoteReaderPanel 组件（Detail 面板：嵌入式阅读/编辑器，切换笔记自动退出编辑，复用核心组件）
 - ExplorerView 支持分隔条拖拽调整宽度（持久化 localStorage）、URL 同步选中笔记、窄屏上下分栏降级
 - NotesView 新增网格/列表视图切换（localStorage 持久化），卡片网格自适应 2-3 列
 - NotesView 卡片 UI 全面升级：增大呼吸空间、标题与预览间分隔线、footer 底部对齐、视觉层次优化
 - NotesView 头部新增笔记数量统计徽章
 - AppSidebar 路由匹配改为显式 isKbRoute() 函数，修复 /explorer/:id 不被识别为知识库标签的问题
 - AppSidebar 双标签切换器增加 ARIA 无障碍属性（role=tablist/tab/tabpanel、aria-selected）
 - 侧边栏知识库标签新增「浏览器」导航入口
 - 路由表新增 /explorer/:id? 路由
 - 更新 STRUCTURE.md 项目结构文档

### UI: 重构首页并建立知识库专属总览
- 将主页拆分为纯粹的效率模块（HomeView）与知识库底座（KnowledgeBaseView）
 - 优化主页 UI 设计，增强问候与任务环的视觉层级和光效悬浮感
 - 加入侧边栏多标签路由记忆模型，使双页导航互不干扰
 - 增加 /kb-home 作为点击知识库 Tab 时的默认门户页面
 - 修正组件内部间距与宽高比例重排，提供高级感舒适排版
 - 更新项目架构说明文档相关路由及页面变更

### UI: 将新建笔记移至知识库标签并清理相关跨标签入口

### UI: 重构侧边栏多标签与移除非必要返回按钮
