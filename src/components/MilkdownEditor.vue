<script setup lang="ts">
/**
 * MilkdownEditor — 外壳组件
 * MilkdownProvider 在这里提供 inject，内层 Core 组件消费它
 */
import { ref } from 'vue'
import { MilkdownProvider } from '@milkdown/vue'
import MilkdownEditorCore from './MilkdownEditorCore.vue'
import '@milkdown/theme-nord/style.css'

const props = withDefaults(defineProps<{
  modelValue?: string
  readonly?: boolean
}>(), {
  modelValue: '',
  readonly: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const coreRef = ref<InstanceType<typeof MilkdownEditorCore> | null>(null)

defineExpose({
  wrapSelection: (prefix: string, suffix: string, placeholder?: string) => {
    coreRef.value?.wrapSelection(prefix, suffix, placeholder)
  },
  insertAtCursor: (text: string) => {
    coreRef.value?.insertAtCursor(text)
  },
})
</script>

<template>
  <MilkdownProvider>
    <div
      class="milkdown-wrapper"
      :class="{ readonly }"
    >
      <MilkdownEditorCore
        ref="coreRef"
        :model-value="modelValue"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </div>
  </MilkdownProvider>
</template>

<style scoped>
.milkdown-wrapper {
  min-height: 200px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: border-color var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
}

.milkdown-wrapper:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-muted);
}

.milkdown-wrapper.readonly {
  border-color: transparent;
  background: transparent;
}

.milkdown-wrapper.readonly:focus-within {
  box-shadow: none;
  border-color: transparent;
}
</style>

<style>
/* ─── Milkdown 全局样式覆盖 ─── */
.milkdown .editor,
.milkdown .ProseMirror {
  padding: var(--space-4) !important;
  min-height: 200px;
  font-family: var(--font-sans) !important;
  color: var(--color-text-primary) !important;
  line-height: 1.8 !important;
  outline: none !important;
}

.milkdown .ProseMirror p {
  margin-bottom: var(--space-3) !important;
}

.milkdown .ProseMirror h1,
.milkdown .ProseMirror h2,
.milkdown .ProseMirror h3,
.milkdown .ProseMirror h4 {
  color: var(--color-text-primary) !important;
  font-weight: 700 !important;
  letter-spacing: -0.02em !important;
  margin-top: var(--space-6) !important;
  margin-bottom: var(--space-3) !important;
}

.milkdown .ProseMirror h1 { font-size: 1.75rem !important; }
.milkdown .ProseMirror h2 { font-size: 1.4rem !important; }
.milkdown .ProseMirror h3 { font-size: 1.15rem !important; }

.milkdown .ProseMirror code {
  font-family: var(--font-mono) !important;
  background: var(--color-bg-tertiary) !important;
  color: var(--color-accent-text) !important;
  padding: 0.15em 0.4em !important;
  border-radius: var(--radius-sm) !important;
  font-size: 0.88em !important;
}

.milkdown .ProseMirror pre {
  background: var(--color-bg-tertiary) !important;
  border: 1px solid var(--color-border) !important;
  border-radius: var(--radius-md) !important;
  padding: var(--space-4) !important;
  overflow-x: auto !important;
  margin: var(--space-4) 0 !important;
}

.milkdown .ProseMirror pre code {
  background: transparent !important;
  padding: 0 !important;
  color: var(--color-text-primary) !important;
}

.milkdown .ProseMirror blockquote {
  border-left: 3px solid var(--color-accent) !important;
  padding-left: var(--space-4) !important;
  color: var(--color-text-secondary) !important;
  margin: var(--space-4) 0 !important;
  font-style: italic !important;
}

.milkdown .ProseMirror a {
  color: var(--color-accent-text) !important;
  text-decoration: underline !important;
  text-underline-offset: 2px !important;
}

.milkdown .ProseMirror ul,
.milkdown .ProseMirror ol {
  padding-left: var(--space-6) !important;
  margin: var(--space-3) 0 !important;
}

.milkdown .ProseMirror ul { list-style: disc !important; }
.milkdown .ProseMirror ol { list-style: decimal !important; }

.milkdown .ProseMirror li {
  margin-bottom: var(--space-1) !important;
}

.milkdown .ProseMirror hr {
  border: none !important;
  border-top: 1px solid var(--color-divider) !important;
  margin: var(--space-6) 0 !important;
}

.milkdown .ProseMirror table {
  width: 100% !important;
  border-collapse: collapse !important;
  margin: var(--space-4) 0 !important;
}

.milkdown .ProseMirror th,
.milkdown .ProseMirror td {
  border: 1px solid var(--color-border) !important;
  padding: var(--space-2) var(--space-3) !important;
  text-align: left !important;
}

.milkdown .ProseMirror th {
  background: var(--color-bg-tertiary) !important;
  font-weight: 600 !important;
}

/* ─── 占位符 ─── */
.milkdown .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  color: var(--color-text-tertiary) !important;
  pointer-events: none;
  float: left;
  height: 0;
}
</style>
