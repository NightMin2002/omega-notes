## 更新日志 - 2026-04-08

### 修复：悬挂笔记窗口圆角背景与源码主题渲染问题
- 添加 html/body 透明背景声明，消除圆角外漏出的方形 body 背景色
 - 为 source 主题添加原始 Markdown 文本显示（pre.source-raw），与 NoteDetailView 行为一致
 - 此前 source 主题下仍然渲染为 HTML，现在正确显示原始 Markdown 源码

### 审查优化：悬浮窗口代码全面合规修复与美化
- 修复 HubLife 模板 ref 绑定 Bug（Vue3 不支持 dot-notation 字符串 ref）
 - PopoutNote 补充 notesStore.init()，防止独立窗口打开时数据未加载
 - PopoutProgressPanel 轮询频率从 100ms 降低到 500ms，减少 IPC 开销
 - PopoutProgress 进度条渐变色从硬编码 HEX 替换为 OKLCH 色彩空间
 - 关闭按钮 hover 颜色改为 CSS 变量引用，消除硬编码 #fff
 - 进度条增加 box-shadow 光晕效果提升视觉品质
 - HubTodos 补全 hub-todo-check/hub-add-btn 的 focus-visible 样式
 - HubTodos hub-quick-input 显式声明 appearance:none + color
 - HubSettings 添加 segment radio 的 focus-visible 反馈
 - HubExpandedBody tab-indicator 阴影改用 CSS 变量 --shadow-sm
 - PopoutNote 空状态改为带 SVG 图标的优雅占位
 - PopoutNote popout-close 补全 :active + :focus-visible 三态
 - 全部 6 个子组件添加 @media (prefers-reduced-motion: reduce) 保护

### feat: 子笔记功能 — 支持在笔记内创建关联子笔记
- Note 类型新增 parentId 字段，支持单层父子关系
- 新增 SubNotePanel 可折叠侧边面板（左侧留白区域），展示子笔记列表/新建/删除
- NoteDetailView 集成子笔记面板、面包屑导航（父笔记 > 子笔记）
- 创建子笔记后自动跳转并进入编辑模式（?edit=1）
- 子笔记隐藏收藏和置顶按钮，保留编辑/悬挂/删除
- 知识库卡片和列表视图右上角显示子笔记数量角标
- 全局搜索结果标注子笔记所属父笔记
- 父笔记删除/恢复/永久删除时级联处理子笔记
- 子笔记从顶级列表中过滤，不污染知识库视图
- storage 层 frontmatter 序列化/反序列化支持 parentId
- 更新 STRUCTURE.md 文档
