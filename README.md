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
| 运行形态 | 必须打开浏览器 | **Tauri 2 桌面应用**（系统托盘 + 全局快捷键 + 单实例 + 开机自启） |

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
| 渲染 | markdown-it + highlight.js + markdown-it-texmath + markdown-it-task-lists | ^14.1 / ^11.11 |
| 拖拽排序 | vue-draggable-plus (SortableJS) | ^0.6 |

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

详细的环境配置、构建选项与常见问题排查请参阅 [构建与安装指南](./docs/05-构建与安装指南.md)。

## 📂 项目结构

请参阅 [STRUCTURE.md](./STRUCTURE.md) 查看完整的目录结构说明和各模块职责。

## 🗺️ 开发进度

| 阶段 | 主题 | 状态 |
|---|---|---|
| Phase 1 | 骨架搭建 — Vue 3 + Design Token + 路由 + Store | ✅ 完成 |
| Phase 2 | 编辑器升级 — Milkdown + markdown-it + KaTeX | ✅ 完成 |
| Phase 3 | 桌面化 — Tauri 2 + .md 文件存储 + 全局快捷键 + 托盘 | ✅ 完成 |
| Phase 4 | 功能增强 — 快速笔记 + 全局搜索 + 模板 + 图片 + 分屏 | ✅ 完成 |
| Phase 5 | 组织与发现 — 收藏 + 标签云 + 文件夹嵌套 + 双向链接 + 导入导出 | ✅ 完成 |
| Phase 6 | 体验打磨 — 设置面板 + 回收站 + 拖拽排序 + 组件拆分 | ✅ 完成 |
| Phase 7 | 日常管理 — 每日任务 + 倒计时 + 健康提醒 + 系统通知 | ✅ 完成 |
| Phase 8 | 视觉深度重构 — 多主题阅读 + 拖拽排序 + Markdown 卡片预览 + 按钮边框增强 | ✅ 完成 |
| Phase 9+ | 知识管理 / 智能化 / 平台化 | 📋 规划中 |

详细功能规划与优先级排序请参阅 [功能方向规划](./docs/04-功能方向规划.md)。

## 🔑 全局快捷键

| 快捷键 | 功能 |
|---|---|
| `Ctrl + K` | 全局搜索 |
| `Ctrl + Q` | 快速笔记 |
| `Ctrl + Shift + N` | 新建笔记（桌面模式：呼出窗口并跳转新建页） |
| `Ctrl + Shift + O` | 显示/聚焦窗口（桌面模式） |

## 🔗 双向链接

在笔记内容中使用 `[[笔记标题]]` 语法引用其他笔记：

```markdown
今天学了 Vue 3 的组合式 API，详见 [[Vue3 学习笔记]]
```

- **阅读模式**：`[[Vue3 学习笔记]]` 自动渲染为可点击的蓝色链接
- **点击跳转**：直接导航到对应标题的笔记
- **反向链接**：被引用的笔记底部自动显示「反向链接」面板，列出所有引用来源
- **插入链接按钮**：编辑时工具栏的「🔗 插入链接」可搜索并快速插入

## 📁 文件夹嵌套

分类名使用 `/` 分隔符实现无限层级嵌套：

```
工作              ← 一级文件夹
工作/项目A        ← 二级
工作/项目A/文档   ← 三级
```

- **侧边栏**：「文件夹」区域显示可展开/折叠的树形导航
- **知识库页**：进入嵌套分类时顶部显示面包屑导航（`全部 / 工作 / 项目A`）

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
favorite: false
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

*Created by Code Agent Ω — 2026.03.18 | Last updated: 2026.03.29 v2.4.0 交互优化*
