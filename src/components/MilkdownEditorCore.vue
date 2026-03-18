<script setup lang="ts">
/**
 * MilkdownEditorCore — 编辑器核心（必须在 MilkdownProvider 内部使用）
 *
 * 编辑器自行管理内部文档状态，向外 emit 变更。
 * 不接受外部 modelValue 回写，避免循环更新。
 * 初始值通过 defaultValueCtx 一次性注入。
 */
import { Editor, rootCtx, defaultValueCtx, parserCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { history } from '@milkdown/kit/plugin/history'
import { indent } from '@milkdown/kit/plugin/indent'
import { trailing } from '@milkdown/kit/plugin/trailing'
import { clipboard } from '@milkdown/kit/plugin/clipboard'
import { Milkdown, useEditor } from '@milkdown/vue'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { nord } from '@milkdown/theme-nord'
import { math } from '@milkdown/plugin-math'
import { $prose } from '@milkdown/kit/utils'
import { Plugin, PluginKey } from '@milkdown/prose/state'
import { clipboardHasImage, processClipboardImages } from '../utils/images'

/** 检测 Markdown 语法的正则（标题/列表/引用/加粗/图片/代码围栏） */
const MD_PATTERN = /^#{1,6}\s|^\s*[-*+]\s|^\s*\d+\.\s|^\s*>|\*\*|__|\!\[|```/m

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

/**
 * 智能粘贴拦截插件
 *
 * 使用 handleDOMEvents.paste（DOM 层）而非 handlePaste（ProseMirror 层），
 * 确保在 ProseMirror 解析 HTML 之前完全控制粘贴行为。
 *
 * 场景 1：图片 blob / QQ 微信 file:// → 转 base64 插入 image 节点
 * 场景 2：纯文本含 Markdown 语法 → 用 Milkdown parser 解析为富文本插入
 */
const smartPastePlugin = $prose((ctx) => new Plugin({
  key: new PluginKey('omega-smart-paste'),
  props: {
    handleDOMEvents: {
      paste(view, event) {
        const cd = event.clipboardData
        if (!cd) return false

        /* ── 场景 1：图片 blob / file:// 路径 ── */
        if (clipboardHasImage(cd)) {
          event.preventDefault()
          ;(async () => {
            try {
              const results = await processClipboardImages(cd)
              if (results.length === 0) return

              const imageNodeType = view.state.schema.nodes.image
              if (!imageNodeType) return

              for (const md of results) {
                const m = md.match(/!\[([^\]]*)\]\(([^)]+)\)/)
                if (m) {
                  const node = imageNodeType.create({
                    src: m[2],
                    alt: m[1] || '图片',
                  })
                  view.dispatch(view.state.tr.replaceSelectionWith(node))
                }
              }
            } catch (err) {
              console.error('WYSIWYG 图片粘贴失败:', err)
            }
          })()
          return true
        }

        /* ── 场景 2：纯文本含 Markdown 语法 ── */
        const plainText = cd.getData('text/plain')
        if (plainText && MD_PATTERN.test(plainText)) {
          event.preventDefault()
          try {
            const parser = ctx.get(parserCtx)
            const doc = parser(plainText)
            if (doc && doc.content.size > 0) {
              const { from, to } = view.state.selection
              view.dispatch(view.state.tr.replaceWith(from, to, doc.content))
            }
          } catch (err) {
            console.error('Markdown 文本粘贴解析失败:', err)
          }
          return true
        }

        return false
      },
    },
  },
}))

useEditor((root) => {
  return Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, props.modelValue)
      ctx.get(listenerCtx)
        .markdownUpdated((_ctx, markdown, _prevMarkdown) => {
          emit('update:modelValue', markdown)
        })
    })
    .config(nord)
    .use(commonmark)
    .use(gfm)
    .use(history)
    .use(indent)
    .use(trailing)
    .use(clipboard)
    .use(listener)
    .use(math)
    .use(smartPastePlugin)
})
</script>

<template>
  <Milkdown />
</template>
