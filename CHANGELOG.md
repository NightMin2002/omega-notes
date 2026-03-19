# Changelog

本文件记录 Ω Notes V2 的所有版本变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

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
