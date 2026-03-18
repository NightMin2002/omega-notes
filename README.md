# Ω Notes V2

> **Local-First 现代笔记系统** — 你的知识，在指尖流转。

## 🎯 项目定位

Ω Notes V2 是上一代 Ω Notes 的全面重写。目标是从一个"只能在浏览器里跑的 IndexedDB 笔记本"，进化为一个 **真正可用的本地桌面笔记应用**。

### 与 V1 的区别

| 维度 | V1 (旧版) | V2 (本版) |
|---|---|---|
| 视图层 | 原生 JS 手写 DOM (`ui.js` 1200+ 行) | **Vue 3** `<script setup>` |
| 构建 | 无构建，`<script>` 标签手动引入 | **Vite 7** 模块化构建 |
| 状态管理 | `state.js` + 散落在 controllers 中 | **Pinia** 集中管理 |
| 路由 | 自定义 `showPage()` 无 URL 映射 | **Vue Router** Hash 模式 |
| 类型安全 | 无 | **TypeScript** |
| 数据持久化 | IndexedDB（清缓存即丢失） | **本地 .md 文件**（Tauri 环境）/ localStorage（浏览器降级） |
| 数学公式 | 无 | **KaTeX** 行内/块级公式渲染 |
| 运行形态 | 必须打开浏览器 | **Tauri 2 桌面应用**（系统托盘 + 全局快捷键） |

### 为什么重写而非迁移？

V1 的 CSS 设计系统和架构思路值得肯定，但 1200 行的 `ui.js` 手写 DOM 操作已经到达维护极限。与其在旧架构上缝补丁，不如用现代工具链重新出发。

## 🏗️ 技术栈

| 层 | 技术 | 版本 |
|---|---|---|
| 框架 | Vue 3 (Composition API) | ^3.5 |
| 构建 | Vite | ^7.3 |
| 路由 | Vue Router | ^5.0 |
| 状态 | Pinia | ^3.0 |
| 语言 | TypeScript | ~5.9 |
| 桌面壳 | Tauri 2 | ^2.10 |
| 编辑器 | Milkdown (ProseMirror) | ^7.19 |
| 数学公式 | KaTeX + @milkdown/plugin-math | ^0.16 / ^4.16 |
| 渲染 | markdown-it + highlight.js + markdown-it-texmath | ^14.1 / ^11.11 |

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（仅前端）
npm run dev

# 启动 Tauri 桌面应用（前端 + Rust 后端）
npm run tauri dev

# 构建生产版本（桌面安装包）
npm run tauri build
```

构建后会在 `src-tauri/target/release/bundle/` 下生成：
- **NSIS 安装包**：`Omega Notes_2.0.0_x64-setup.exe`
- **MSI 安装包**：`Omega Notes_2.0.0_x64_en-US.msi`

## 📂 项目结构

请参阅 [STRUCTURE.md](./STRUCTURE.md) 查看完整的目录结构说明和各模块职责。

## 🗺️ 路线图

### Phase 1 ✅ 骨架搭建
- [x] Vue 3 + Vite + TypeScript 项目初始化
- [x] Design Token 体系（暗色/亮色双主题）
- [x] 全局样式重置（消灭浏览器默认）
- [x] Header + Sidebar 布局组件
- [x] 路由配置（主页 / 知识库 / 新建 / 详情）
- [x] 笔记 Store（CRUD + 分类 + 搜索 + 排序）
- [x] 主题 Store（暗色/亮色切换 + 持久化）
- [x] 页面切换过渡动画

### Phase 2 ✅ 编辑器升级
- [x] 接入 Markdown 编辑器引擎（Milkdown v7）
- [x] Markdown 阅读渲染（markdown-it）
- [x] 代码高亮（highlight.js）
- [x] 数学公式支持（KaTeX）— 编辑器 + 阅读模式双端渲染

### Phase 3 ✅ 桌面化
- [x] 安装 Rust + Tauri 2
- [x] 本地文件系统读写（AppData/notes/*.md，YAML frontmatter 元数据）
- [x] 浏览器环境 localStorage 自动降级
- [x] 旧 localStorage 数据自动迁移到文件系统
- [x] 全局快捷键（Ctrl+Shift+N 新建 / Ctrl+Shift+O 呼出窗口）
- [x] 系统托盘常驻（显示窗口 / 退出菜单）

### Phase 4 — 功能恢复
- [ ] 分类树组件（递归 `<TreeNode />`）
- [ ] 学习计划模块
- [ ] AI 对话解析器
- [ ] 数据导入/导出

## 🔑 全局快捷键

| 快捷键 | 功能 |
|---|---|
| `Ctrl + Shift + N` | 新建笔记（呼出窗口并跳转到新建页） |
| `Ctrl + Shift + O` | 显示/聚焦窗口 |

## 📝 笔记存储格式

Tauri 桌面环境下，每条笔记以独立 `.md` 文件存储在系统 AppData 目录：

```
AppData/
  notes/
    abc123.md
    def456.md
```

每个文件使用 YAML frontmatter 保存元数据：

```markdown
---
id: abc123
title: 我的笔记标题
category: 学习笔记
tags: [Vue, TypeScript]
pinned: false
createdAt: 2026-03-18T12:00:00.000Z
updatedAt: 2026-03-18T12:30:00.000Z
---

这里是笔记的 Markdown 正文内容...
```

## 🤖 AI 开发指南

1. **组件优先**：新 UI 功能写成 `.vue` 单文件组件，放入 `src/components/` 或 `src/views/`。
2. **状态集中**：业务数据通过 Pinia Store 管理（`src/stores/`），禁止在组件中直接操作 localStorage。
3. **Token 约束**：样式使用 `var(--color-*)` / `var(--space-*)` 等 CSS 变量，禁止硬编码颜色和魔法数字。
4. **动手前先读**：修改前阅读本 README 和 [STRUCTURE.md](./STRUCTURE.md)，理解已有设计再动手。

---

*Created by Code Agent Ω — 2026.03.18*
