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
| 数据持久化 | IndexedDB（清缓存即丢失） | localStorage → **本地 .md 文件**（规划中） |
| 运行形态 | 必须打开浏览器 | **Tauri 桌面应用**（规划中） |

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
| 桌面壳 | Tauri 2 | 规划中 |
| 编辑器 | Milkdown / Tiptap | 规划中 |

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

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

### Phase 2 — 编辑器升级
- [ ] 接入 Markdown 编辑器引擎（Milkdown / Tiptap）
- [ ] Markdown 实时预览
- [ ] 代码高亮（Shiki / Highlight.js）
- [ ] 数学公式支持（KaTeX）

### Phase 3 — 桌面化
- [ ] 安装 Rust + Tauri 2
- [ ] 本地文件系统读写（.md 文件）
- [ ] 全局快捷键唤起
- [ ] 系统托盘常驻

### Phase 4 — 功能恢复
- [ ] 分类树组件（递归 `<TreeNode />`）
- [ ] 学习计划模块
- [ ] AI 对话解析器
- [ ] 数据导入/导出

## 🤖 AI 开发指南

1. **组件优先**：新 UI 功能写成 `.vue` 单文件组件，放入 `src/components/` 或 `src/views/`。
2. **状态集中**：业务数据通过 Pinia Store 管理（`src/stores/`），禁止在组件中直接操作 localStorage。
3. **Token 约束**：样式使用 `var(--color-*)` / `var(--space-*)` 等 CSS 变量，禁止硬编码颜色和魔法数字。
4. **动手前先读**：修改前阅读本 README 和 [STRUCTURE.md](./STRUCTURE.md)，理解已有设计再动手。

---

*Created by Code Agent Ω — 2026.03.18*
