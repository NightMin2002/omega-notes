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
  overflow-y: auto;
  overflow-x: hidden;
  transition: border-color var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
}

.milkdown-wrapper::-webkit-scrollbar { width: 6px; }
.milkdown-wrapper::-webkit-scrollbar-track { background: transparent; }
.milkdown-wrapper::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
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

/* 去掉 nord 主题自带的内部边框，统一由外层 .milkdown-wrapper 管理 */
.milkdown,
.milkdown-theme-nord {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
}

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

/* 排除包含 task 项的列表，避免 disc 覆盖 checkbox */
.milkdown .ProseMirror ul:not(:has(> li[data-item-type="task"])) { list-style: disc !important; }
.milkdown .ProseMirror ol { list-style: decimal !important; }

.milkdown .ProseMirror li {
  margin-bottom: var(--space-1) !important;
}

/* ─── 任务列表 (Milkdown GFM) ─── */
.milkdown .ProseMirror li[data-item-type="task"] {
  list-style: none !important;
  position: relative;
  padding-left: var(--space-6) !important;
}

/* 用伪元素画 checkbox 方框 */
.milkdown .ProseMirror li[data-item-type="task"]::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.35em;
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-border-strong, var(--color-text-tertiary));
  border-radius: 4px;
  background: transparent;
  transition: background-color 200ms ease-out,
              border-color 200ms ease-out;
  box-sizing: border-box;
}

/* 选中状态：填充主题色 */
.milkdown .ProseMirror li[data-item-type="task"][data-checked="true"]::before {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

/* 对勾标记 */
.milkdown .ProseMirror li[data-item-type="task"][data-checked="true"]::after {
  content: '';
  position: absolute;
  left: 5px;
  top: calc(0.35em + 2px);
  width: 6px;
  height: 10px;
  border: solid #fff;
  border-width: 0 2.5px 2.5px 0;
  transform: rotate(45deg);
}

/* 已完成任务的文字变淡 + 删除线 */
.milkdown .ProseMirror li[data-item-type="task"][data-checked="true"] {
  color: var(--color-text-tertiary) !important;
  text-decoration: line-through;
}

/* Hover 效果 */
@media (hover: hover) {
  .milkdown .ProseMirror li[data-item-type="task"][data-checked="false"]:hover::before {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px var(--color-accent-muted);
  }
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

/* ─── 羊皮纸主题覆盖 — 实际 class 是 .milkdown-theme-nord ─── */
.theme-parchment .milkdown-theme-nord {
  color: oklch(0.28 0.03 50) !important;
}

.theme-parchment .milkdown-theme-nord th {
  background: oklch(0.88 0.035 70) !important;
  color: oklch(0.3 0.04 50) !important;
  border-color: oklch(0.78 0.04 65) !important;
}

.theme-parchment .milkdown-theme-nord td {
  border-color: oklch(0.82 0.035 70) !important;
  color: oklch(0.28 0.03 50) !important;
  background: transparent !important;
}

/* 覆盖 nord 的 :nth-child(odd) 交替背景 */
.theme-parchment .milkdown-theme-nord.prose :where(td, th):nth-child(odd) {
  background-color: oklch(0.91 0.025 75) !important;
}

.theme-parchment .milkdown-theme-nord tr:nth-child(even) td {
  background: oklch(0.93 0.02 78) !important;
}

.theme-parchment .milkdown-theme-nord pre {
  background: oklch(0.96 0.015 75) !important;
  border-color: oklch(0.82 0.035 70) !important;
}

.theme-parchment .milkdown-theme-nord pre code {
  color: oklch(0.3 0.02 50) !important;
  background: transparent !important;
}

.theme-parchment .milkdown-theme-nord code {
  background: oklch(0.9 0.025 70) !important;
  color: oklch(0.38 0.1 30) !important;
}

.theme-parchment .milkdown-theme-nord blockquote {
  border-left-color: oklch(0.6 0.08 50) !important;
  color: oklch(0.35 0.04 50) !important;
}

.theme-parchment .milkdown-theme-nord a {
  color: oklch(0.4 0.12 30) !important;
}

.theme-parchment .milkdown-theme-nord hr {
  border-top-color: oklch(0.78 0.04 65) !important;
}

.theme-parchment .milkdown-theme-nord h1,
.theme-parchment .milkdown-theme-nord h2,
.theme-parchment .milkdown-theme-nord h3,
.theme-parchment .milkdown-theme-nord h4 {
  color: oklch(0.3 0.06 40) !important;
}

/* 暗色 + 羊皮纸 */
[data-theme='dark'] .theme-parchment .milkdown-theme-nord {
  color: oklch(0.78 0.02 60) !important;
}

[data-theme='dark'] .theme-parchment .milkdown-theme-nord th {
  background: oklch(0.28 0.025 55) !important;
  color: oklch(0.78 0.04 60) !important;
  border-color: oklch(0.35 0.03 50) !important;
}

[data-theme='dark'] .theme-parchment .milkdown-theme-nord td {
  border-color: oklch(0.32 0.025 55) !important;
  color: oklch(0.75 0.02 60) !important;
}

[data-theme='dark'] .theme-parchment .milkdown-theme-nord.prose :where(td, th):nth-child(odd) {
  background-color: oklch(0.24 0.018 55) !important;
}

[data-theme='dark'] .theme-parchment .milkdown-theme-nord pre {
  background: oklch(0.19 0.015 55) !important;
  border-color: oklch(0.32 0.025 50) !important;
}

[data-theme='dark'] .theme-parchment .milkdown-theme-nord code {
  background: oklch(0.25 0.02 55) !important;
  color: oklch(0.72 0.08 40) !important;
}

[data-theme='dark'] .theme-parchment .milkdown-theme-nord h1,
[data-theme='dark'] .theme-parchment .milkdown-theme-nord h2,
[data-theme='dark'] .theme-parchment .milkdown-theme-nord h3,
[data-theme='dark'] .theme-parchment .milkdown-theme-nord h4 {
  color: oklch(0.82 0.05 50) !important;
}

/* ─── 终端主题覆盖 — 绿色 hacker 风格 ─── */
.theme-terminal .milkdown-theme-nord {
  font-family: var(--font-mono) !important;
  font-size: 0.85rem !important;
  color: oklch(0.78 0.06 145) !important;
}

.theme-terminal .milkdown-theme-nord h1,
.theme-terminal .milkdown-theme-nord h2,
.theme-terminal .milkdown-theme-nord h3,
.theme-terminal .milkdown-theme-nord h4 {
  color: oklch(0.85 0.18 145) !important;
  border-bottom: 1px dashed oklch(0.3 0.04 145) !important;
}

.theme-terminal .milkdown-theme-nord th {
  background: oklch(0.2 0.02 160) !important;
  color: oklch(0.85 0.15 145) !important;
  border-color: oklch(0.3 0.04 145) !important;
}

.theme-terminal .milkdown-theme-nord td {
  border-color: oklch(0.25 0.03 145) !important;
  color: oklch(0.75 0.05 145) !important;
  background: transparent !important;
}

.theme-terminal .milkdown-theme-nord.prose :where(td, th):nth-child(odd) {
  background-color: oklch(0.17 0.01 160) !important;
}

.theme-terminal .milkdown-theme-nord tr:nth-child(even) td {
  background: oklch(0.15 0.008 160) !important;
}

.theme-terminal .milkdown-theme-nord pre {
  background: oklch(0.12 0.005 160) !important;
  border-color: oklch(0.25 0.04 145) !important;
}

.theme-terminal .milkdown-theme-nord pre code {
  color: oklch(0.78 0.06 145) !important;
  background: transparent !important;
}

.theme-terminal .milkdown-theme-nord code {
  color: oklch(0.8 0.14 80) !important;
  background: oklch(0.18 0.005 160) !important;
}

.theme-terminal .milkdown-theme-nord blockquote {
  border-left-color: oklch(0.5 0.12 145) !important;
  color: oklch(0.6 0.06 145) !important;
}

.theme-terminal .milkdown-theme-nord a {
  color: oklch(0.7 0.15 200) !important;
}

.theme-terminal .milkdown-theme-nord hr {
  border-top-color: oklch(0.25 0.04 145) !important;
}

/* ─── 精读 (Aurora) 主题覆盖 — 使用 CSS 变量 ─── */
.theme-aurora .milkdown-theme-nord th {
  background: var(--color-bg-tertiary) !important;
  color: var(--color-text-primary) !important;
  border-color: var(--color-border) !important;
}

.theme-aurora .milkdown-theme-nord td {
  border-color: var(--color-border) !important;
  color: var(--color-text-primary) !important;
}

.theme-aurora .milkdown-theme-nord.prose :where(td, th):nth-child(odd) {
  background-color: var(--color-bg-secondary) !important;
}

.theme-aurora .milkdown-theme-nord pre {
  background: var(--color-bg-tertiary) !important;
  border-color: var(--color-border) !important;
}

.theme-aurora .milkdown-theme-nord code {
  background: var(--color-bg-tertiary) !important;
  color: var(--color-accent-text) !important;
}

/* ─── 笔墨 (Ink) 主题覆盖 — 使用 CSS 变量 ─── */
.theme-ink .milkdown-theme-nord th {
  background: var(--color-bg-tertiary) !important;
  color: var(--color-text-primary) !important;
  border-color: var(--color-border) !important;
}

.theme-ink .milkdown-theme-nord td {
  border-color: var(--color-border) !important;
  color: var(--color-text-primary) !important;
}

.theme-ink .milkdown-theme-nord.prose :where(td, th):nth-child(odd) {
  background-color: var(--color-bg-secondary) !important;
}

.theme-ink .milkdown-theme-nord pre {
  background: var(--color-bg-tertiary) !important;
  border-color: var(--color-border) !important;
}

.theme-ink .milkdown-theme-nord code {
  background: var(--color-bg-tertiary) !important;
  color: var(--color-accent-text) !important;
}
</style>
