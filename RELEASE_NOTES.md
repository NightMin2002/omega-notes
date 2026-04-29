## 更新日志 - 2026-04-29

### 修复收件箱计数 Bug 并实现桌面微件位置持久化
修复:
- 收件箱计数将已删除笔记排除在外 (AppSidebar/KnowledgeBaseView)
- 知识库总览「最近更新」不再显示已删除笔记

新增:
- 桌面微件位置状态持久化 (localStorage omega-widget-state)
  - 支持 docked/free 双模式保存与恢复
  - 吸附到边缘后关闭，下次打开自动恢复吸附位置
  - 自由浮动位置同样记忆并恢复
  - 窗口以 hidden 创建，定位完成后再显示，消除启动闪烁
- Rust 层 progress 窗口改为 visible:false 创建，由前端控制显示时机
