## 更新日志 - 2026-04-19

### feat: 浏览器子笔记支持 + 回收站双栏预览 + 导入导出保留子笔记关系
- NoteReaderPanel: 集成 SubNotePanel 子笔记面板与面包屑导航，支持在浏览器内无缝切换父/子笔记
- NoteListPanel: 笔记条目新增子笔记数量角标指示器
- TrashView: 重构为主从双栏布局（左侧卡片列表 + 右侧 Markdown 全文预览），新增永久删除二次确认、字数统计、悬停快捷操作
- notes.ts importBatch: 导入时保留 parentId 子笔记关系
- dataio.ts parseMdFile: 解析 .md frontmatter 中的 parentId 字段
- STRUCTURE.md: 同步更新文档描述
