# Ω Notes V2 — 项目结构文档

> **致 AI 助手与开发者**：这是项目的结构索引。在新增文件或修改模块时，请同步更新本文档。

## 目录总览

```
omega-v2/
├── index.html                  # 应用入口 HTML（仅挂载 #app）
├── package.json                # 依赖与脚本
├── vite.config.ts              # Vite 构建配置
├── tsconfig.json               # TypeScript 配置入口
├── tsconfig.app.json           # 应用层 TS 配置
├── tsconfig.node.json          # Node 层 TS 配置
├── env.d.ts                    # 环境类型声明
├── README.md                   # 项目说明
├── STRUCTURE.md                # 本文件 — 结构索引
│
├── public/                     # 静态资源（不经过 Vite 处理）
│   └── favicon.ico
│
└── src/                        # 源代码根目录
    ├── main.ts                 # 应用入口：挂载 Vue + Pinia + Router
    ├── App.vue                 # 根组件：Header + Sidebar + RouterView
    │
    ├── assets/                 # 项目资产
    │   └── styles/             # 全局样式
    │       ├── variables.css   # Design Token 体系
    │       └── reset.css       # 浏览器默认样式重置
    │
    ├── components/             # 全局/共享组件
    │   ├── AppHeader.vue       # 顶部导航栏
    │   └── AppSidebar.vue      # 侧边栏导航
    │
    ├── views/                  # 路由页面组件
    │   ├── HomeView.vue        # 主页（统计 + 快捷入口 + 最近更新）
    │   ├── NotesView.vue       # 知识库（搜索 + 分类筛选 + 卡片网格）
    │   ├── WriteView.vue       # 新建笔记（表单）
    │   └── NoteDetailView.vue  # 笔记详情（阅读/编辑双模式）
    │
    ├── stores/                 # Pinia 状态仓库
    │   ├── theme.ts            # 主题管理（暗色/亮色 + 持久化）
    │   └── notes.ts            # 笔记数据（CRUD + 分类 + 搜索 + 排序）
    │
    └── router/                 # 路由配置
        └── index.ts            # 路由表 + 页面标题同步
```

## 模块职责说明

### 样式层 (`src/assets/styles/`)

| 文件 | 职责 | 修改频率 |
|---|---|---|
| `variables.css` | 定义所有 Design Token：颜色、间距、圆角、阴影、动效参数、层叠上下文。暗色主题为默认，亮色主题通过 `[data-theme='light']` 覆盖 | 低 — 仅在调整全局视觉时修改 |
| `reset.css` | 消灭浏览器默认样式。包含 `box-sizing`、滚动条定制、焦点样式、表单元素重置、`::selection`、`prefers-reduced-motion` 降级 | 极低 — 几乎不需要改 |

**加载顺序**：`main.ts` 中先 `import variables.css` 再 `import reset.css`，确保 Token 在重置规则可用。

### 组件层 (`src/components/`)

| 组件 | 职责 | Props / Events |
|---|---|---|
| `AppHeader.vue` | 毛玻璃顶栏。包含：侧边栏切换按钮、应用标题（可点击回主页）、主题切换按钮（太阳/月亮图标带旋转过渡） | Props: `sidebarCollapsed` / Emits: `toggleSidebar` |
| `AppSidebar.vue` | 左侧导航。路由链接高亮、移动端浮层 + 遮罩层、滑入/滑出动画 | Props: `collapsed` / Emits: `collapse` |

### 页面层 (`src/views/`)

| 页面 | 路由 | 依赖的 Store | 功能 |
|---|---|---|---|
| `HomeView.vue` | `/` | `notes` | 统计卡片（总笔记/分类/已置顶）、快捷入口、最近更新列表 |
| `NotesView.vue` | `/notes` | `notes` | 搜索框、分类药丸筛选、笔记卡片网格、空状态引导 |
| `WriteView.vue` | `/write` | `notes` | 笔记创建表单（标题/内容/分类/标签）、保存后跳转详情 |
| `NoteDetailView.vue` | `/note/:id` | `notes` | 阅读模式 ↔ 编辑模式切换、置顶/删除操作、404 兜底 |

### 状态层 (`src/stores/`)

| Store | 状态 | Actions | 持久化 |
|---|---|---|---|
| `theme.ts` | `theme: 'dark' \| 'light'` | `toggle()` | localStorage `omega-theme` |
| `notes.ts` | `notes[]`, `currentCategory`, `searchQuery` | `addNote`, `updateNote`, `deleteNote`, `togglePin`, `getNoteById` | localStorage `omega-notes` |

**计算属性**：
- `categories` — 从所有笔记中自动提取、去重、按中文排序
- `filteredNotes` — 按当前分类 + 搜索词过滤，置顶优先 + 时间倒序
- `totalCount` / `pinnedCount` — 统计数据

### 路由层 (`src/router/`)

| 路径 | 名称 | 组件 | 说明 |
|---|---|---|---|
| `/` | `home` | `HomeView` | 主页 |
| `/notes` | `notes` | `NotesView` | 知识库 |
| `/write` | `write` | `WriteView` | 新建笔记 |
| `/note/:id` | `note-detail` | `NoteDetailView` | 笔记详情 |

路由使用 **Hash 模式** (`createWebHashHistory`)，为后续 Tauri 桌面化做准备（文件协议不支持 History 模式）。

## 数据流向

```
用户操作
  ↓
Vue 组件 (views/)
  ↓ 调用
Pinia Store (stores/)
  ↓ 读写
localStorage (暂存)
  ↓ 未来替换为
本地文件系统 (.md 文件)
```

## 命名约定

| 类型 | 约定 | 示例 |
|---|---|---|
| 组件文件 | PascalCase | `AppHeader.vue` |
| 页面文件 | PascalCase + `View` 后缀 | `HomeView.vue` |
| Store 文件 | kebab-case / camelCase | `notes.ts` |
| CSS Token | `--color-*` / `--space-*` / `--radius-*` / `--z-*` | `var(--color-accent)` |
| 路由路径 | kebab-case | `/note/:id` |

## 新增文件检查清单

当你要新增一个文件时，对照此表确认放置位置：

| 你要做什么 | 放在哪里 |
|---|---|
| 新增全局/共享 UI 组件 | `src/components/` |
| 新增路由页面 | `src/views/` + 在 `router/index.ts` 注册 |
| 新增数据/状态管理 | `src/stores/` |
| 新增全局 CSS | `src/assets/styles/` + 在 `main.ts` 引入 |
| 新增页面级样式 | 对应 `.vue` 文件的 `<style scoped>` |
| 新增工具函数 | `src/utils/`（待创建） |
| 新增类型定义 | `src/types/`（待创建） |

---

> **维护提醒**：每次新增或删除文件后，请同步更新本文档的"目录总览"和对应的"模块职责说明"表格。
