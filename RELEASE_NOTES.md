功能：桌面微件固定+更新UI优化+待办跳转+自定义模板
 - 悬浮窗设置新增「展开面板后固定」开关，启用后鼠标离开不自动收缩
 - 更新日志区域适配 Markdown 渲染（markdown-it 轻量转换）
 - 下载进度显示安装包大小（如 12.5 MB / 25.0 MB）
 - 错误提示区域增大内边距和间距，改善呼吸空间
 - 新建笔记「待办清单」模板改为跳转到待办事项页面的快捷入口
 - 新增自定义笔记模板功能（创建/编辑/删除/右键管理）
 - 新增 TemplateEditorDialog 组件（Teleport 弹窗）
 - settings store 扩展 customTemplates CRUD 和持久化
 - updater store 新增 downloadTotalBytes 状态跟踪
 - types 新增 CustomTemplate 接口和 AppSettings.customTemplates 字段
 - 同步更新 STRUCTURE.md 项目结构文档

修复：面板固定开关+模板弹窗呼吸空间+面板尺寸适配
 - 修复固定展开开关无效：拦截 hub:collapse-request、handleMouseLeave 两处路径
 - PANEL_HEIGHT 从 380 增至 440（前后端同步），容纳全部设置开关
 - HubExpandedBody hub-content 改为 overflow-y: auto 支持内容滚动
 - TemplateEditorDialog 增大内边距、字段间距、textarea 高度
 - Rust lib.rs PROGRESS_PANEL_HEIGHT 同步更新为 440

 修复：面板自动收缩+模板弹窗呼吸空间+面板尺寸适配
 - 实现跨窗口悬停检测：面板窗口通过 BroadcastChannel 发送 hover 状态
 - 新增 evaluateAutoCollapse：当两个窗口都无悬停且未固定时 1.5s 后自动收缩
 - panelPinned=true 时所有收缩路径均被拦截，面板保持固定
 - PANEL_HEIGHT 从 380 增至 440（前端+Rust 后端同步）
 - HubExpandedBody hub-content 改为 overflow-y: auto 支持内容滚动
 - 模板弹窗标题栏、表单区域、底部按钮区域全面增大内边距和间距

 重构：待办事项五项优化 — 自定义日历替换原生日期选择器、日历日期继承新建、新建按钮微光美化、桌面微件分组视图
 - 新增 DatePicker.vue 自定义日期选择器组件（Teleport 弹出日历、清除、今天快捷、待办圆点标记）
 - 替换全部 input[type=date] 为自定义 DatePicker
 - 日历选中日期后新建自动继承该日期作为截止日
 - 新建按钮升级为渐变微光呼吸动效 + 旋转关闭 icon
 - 新建表单增大 padding/gap 呼吸空间、textarea 替代 input 输入备注
 - 筛选 tabs 添加 SVG 图标增强可辨识度
 - 日历选中日期时列表标题增加快速添加按钮
 - 新增今日/本周/本月/全部分组 tabs 切换视图
 - 待办项显示备注摘要（截断至 40 字符）
 - 优化空状态为 SVG 占位 + 友好文案

 优化：待办布局重构 + 全局按钮呼吸空间
 - 新建表单从内联展开改为 Teleport Modal 弹窗，不再推挤页面内容
 - 页面采用 flex 固定高度布局，列表区域独立滚动，解决长列表撑破页面问题
 - 所有操作按钮 padding 增大至 10px 24px
 - 空状态按钮 padding 增大至 10px 28px

 修复待办与笔记视图工具栏样式及溢出裁剪缺陷
 - 修改 Todos 列表页顶部操作按钮，令其 Tooltip 向下弹出以避免顶端裁剪
 - 优化 Notes 详情页顶行按钮布局（不折行且保持包裹性换行），解决文本变长时的被挤压变形
 - 重构核心状态视觉：将「收藏」与「置顶」激活态分别独立为醒目的警告色（黄）与成功色（绿）
 - 修复 Notes 详情页在浅色主题下，「保存」按钮 Hover 时文字色意外退化为黑色的 Bug
 - 对齐 Notes 详情页面顶端的所有视图模式切换及比例缩放项，令 Tooltip 朝安全区（下方）展现