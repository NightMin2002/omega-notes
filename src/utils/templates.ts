/**
 * 笔记模板定义
 * 每个模板包含名称、图标、描述和预填充内容
 * 使用工厂函数确保每次选择模板时获取当天日期
 */
import type { NoteTemplate } from '@/types'
export type { NoteTemplate }

interface TemplateDef {
  id: string
  name: string
  icon: string
  description: string
  build: (today: string) => { title: string; content: string; category: string }
}

const defs: TemplateDef[] = [
  {
    id: 'blank',
    name: '空白笔记',
    icon: 'file',
    description: '从零开始',
    build: () => ({ title: '', content: '', category: '' }),
  },
  {
    id: 'meeting',
    name: '会议记录',
    icon: 'users',
    description: '记录会议要点和待办',
    build: (today) => ({
      title: `会议记录 — ${today}`,
      category: '会议',
      content: `## 基本信息

- **日期**：${today}
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
    }),
  },
  {
    id: 'reading',
    name: '读书笔记',
    icon: 'book',
    description: '记录阅读心得',
    build: (today) => ({
      title: '',
      category: '读书',
      content: `## 书籍信息

- **书名**：
- **作者**：
- **阅读日期**：${today}
- **评分**：⭐⭐⭐⭐⭐

## 核心观点

1.
2.
3.

## 精彩摘录

>

## 个人感想

`,
    }),
  },
  {
    id: 'diary',
    name: '日记',
    icon: 'calendar',
    description: '记录今天的一天',
    build: (today) => ({
      title: `${today} 日记`,
      category: '日记',
      content: `## ${today}

### 今天做了什么

-

### 学到了什么

-

### 明天计划

- [ ]
- [ ]

### 心情 / 感想

`,
    }),
  },
  {
    id: 'study',
    name: '学习笔记',
    icon: 'lightbulb',
    description: '整理学习内容',
    build: () => ({
      title: '',
      category: '学习',
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
    }),
  },
  {
    id: 'todo',
    name: '待办清单',
    icon: 'check',
    description: '任务和待办事项',
    build: (today) => ({
      title: `待办清单 — ${today}`,
      category: '待办',
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
    }),
  },
]

/** 获取模板列表（调用时动态生成当天日期） */
export function getTemplates(): NoteTemplate[] {
  const today = new Date().toLocaleDateString('zh-CN')
  return defs.map(d => {
    const { title, content, category } = d.build(today)
    return {
      id: d.id,
      name: d.name,
      icon: d.icon,
      description: d.description,
      title,
      content,
      category,
    }
  })
}

/**
 * 向后兼容 — 静态导出
 * @deprecated 推荐使用 getTemplates()
 */
export const templates = getTemplates()
