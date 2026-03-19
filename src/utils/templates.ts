/**
 * 笔记模板定义
 * 每个模板包含名称、图标、描述和预填充内容
 */
import type { NoteTemplate } from '@/types'
export type { NoteTemplate }

const today = () => new Date().toLocaleDateString('zh-CN')

export const templates: NoteTemplate[] = [
  {
    id: 'blank',
    name: '空白笔记',
    icon: 'file',
    description: '从零开始',
    title: '',
    content: '',
    category: '',
  },
  {
    id: 'meeting',
    name: '会议记录',
    icon: 'users',
    description: '记录会议要点和待办',
    title: `会议记录 — ${today()}`,
    content: `## 基本信息

- **日期**：${today()}
- **参与者**：
- **主题**：

## 议题

### 1.

### 2.

## 决议

-

## 待办事项

- [ ]
- [ ]

## 备注

`,
    category: '会议',
  },
  {
    id: 'reading',
    name: '读书笔记',
    icon: 'book',
    description: '记录阅读心得',
    title: '',
    content: `## 书籍信息

- **书名**：
- **作者**：
- **阅读日期**：${today()}
- **评分**：⭐⭐⭐⭐⭐

## 核心观点

1.
2.
3.

## 精彩摘录

>

## 个人感想

`,
    category: '读书',
  },
  {
    id: 'diary',
    name: '日记',
    icon: 'calendar',
    description: '记录今天的一天',
    title: `${today()} 日记`,
    content: `## ${today()}

### 今天做了什么

-

### 学到了什么

-

### 明天计划

- [ ]
- [ ]

### 心情 / 感想

`,
    category: '日记',
  },
  {
    id: 'study',
    name: '学习笔记',
    icon: 'lightbulb',
    description: '整理学习内容',
    title: '',
    content: `## 主题



## 关键概念

| 概念 | 说明 |
|------|------|
|  |  |

## 详细笔记



## 代码示例

\`\`\`

\`\`\`

## 待复习

- [ ]
- [ ]

## 参考资料

-
`,
    category: '学习',
  },
  {
    id: 'todo',
    name: '待办清单',
    icon: 'check',
    description: '任务和待办事项',
    title: `待办清单 — ${today()}`,
    content: `## 紧急重要

- [ ]

## 重要不紧急

- [ ]

## 紧急不重要

- [ ]

## 不紧急不重要

- [ ]

---

**完成情况**：0 / 0
`,
    category: '待办',
  },
]
