## 更新日志 - 2026-04-19

### feat(sub-note): SubNotePanel 双模式重构 — 工具栏 dropdown 下拉面板 + 侧边栏兼容
- SubNotePanel 新增 dropdown prop：按钮始终可见，展开时从按钮下方弹出下拉面板
- NoteReaderPanel 子笔记从内容区移至顶部工具栏左侧（dropdown 模式）
- 展开/收起不再导致布局跳动（rt-left min-height: 32px）
- 工具栏 z-index: 20 确保面板不被内容区覆盖
- NoteDetailView 侧边栏模式行为保持不变
- 修复 Vite 开发端口 8080→1420（避开 Hyper-V 保留端口）
- 同步更新 STRUCTURE.md 组件描述
