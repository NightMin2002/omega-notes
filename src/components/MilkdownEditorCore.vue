<script setup lang="ts">
/**
 * MilkdownEditorCore — 编辑器核心（必须在 MilkdownProvider 内部使用）
 *
 * 编辑器自行管理内部文档状态，向外 emit 变更。
 * 不接受外部 modelValue 回写，避免循环更新。
 * 初始值通过 defaultValueCtx 一次性注入。
 */
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/kit/core'
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

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

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
})
</script>

<template>
  <Milkdown />
</template>
