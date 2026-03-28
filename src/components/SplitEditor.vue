<script setup lang="ts">
/**
 * SplitEditor — 分屏 Markdown 编辑器（源码 + 实时预览）
 *
 * 从 WriteView / NoteDetailView 提取的共享组件。
 * 左侧为 Markdown 源码编辑区（含工具栏 + 图片/链接插入），
 * 右侧为 MarkdownRenderer 实时预览。
 */
import MarkdownRenderer from './MarkdownRenderer.vue'
import EditorToolbar from './EditorToolbar.vue'
import WikiLinkPicker from './WikiLinkPicker.vue'
import type { Note } from '../types'

defineProps<{
  /** 图片/链接/格式相关状态 */
  showLinkPicker: boolean
  linkSearch: string
  linkCandidates: Pick<Note, 'id' | 'title' | 'category'>[]
}>()

const content = defineModel<string>('content', { required: true })

const emit = defineEmits<{
  insertImage: []
  toggleLinkPicker: []
  'update:linkSearch': [value: string]
  selectLink: [title: string]
  toolbarInsert: [text: string]
  toolbarWrap: [prefix: string, suffix: string]
  paste: [e: ClipboardEvent]
}>()

const textareaRef = defineModel<HTMLTextAreaElement | null>('textareaRef')
</script>

<template>
  <div class="split-editor">
    <div class="split-pane source-pane">
      <div class="pane-header">
        <span class="pane-label">Markdown 源码</span>
        <div class="pane-actions">
          <button type="button" class="pane-action" @click="emit('insertImage')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
            </svg>
            <span>插入图片</span>
          </button>
          <WikiLinkPicker
            :show="showLinkPicker"
            :search="linkSearch"
            :candidates="linkCandidates"
            @toggle="emit('toggleLinkPicker')"
            @update:search="emit('update:linkSearch', $event)"
            @select="emit('selectLink', $event)"
          />
        </div>
      </div>
      <EditorToolbar
        @insert="emit('toolbarInsert', $event)"
        @wrap="(p, s) => emit('toolbarWrap', p, s)"
      />
      <textarea
        :ref="(el) => { textareaRef = el as HTMLTextAreaElement | null }"
        v-model="content"
        class="source-textarea"
        placeholder="在此输入或粘贴 Markdown 内容…&#10;&#10;截图可直接 Ctrl+V 粘贴&#10;QQ/微信图片请用上方「插入图片」按钮"
        spellcheck="false"
        @paste="emit('paste', $event)"
      />
    </div>
    <div class="split-divider" />
    <div class="split-pane preview-pane">
      <div class="pane-label">实时预览</div>
      <div class="preview-scroll">
        <MarkdownRenderer
          v-if="content.trim()"
          :content="content"
        />
        <p v-else class="preview-empty">预览区域</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.split-editor {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 0;
  min-height: 400px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-bg-secondary);
}

.split-divider {
  width: 1px;
  background: var(--color-border);
}

.split-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
}

.pane-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-tertiary);
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
}

/* 预览侧 pane-label 已通过 pane-header 设置边框，源码侧用独立标签 */
.pane-header .pane-label {
  padding: 0;
  border-bottom: none;
  background: none;
}

.pane-actions {
  display: flex;
  gap: var(--space-2);
}

.pane-action {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--color-text-tertiary);
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .pane-action:hover {
    background: var(--color-bg-hover);
    color: var(--color-accent);
  }
}

.source-textarea {
  flex: 1;
  resize: none;
  padding: var(--space-4);
  font-family: var(--font-mono);
  font-size: 0.88rem;
  line-height: 1.7;
  color: var(--color-text-primary);
  background: transparent;
  border: none;
  outline: none;
  tab-size: 2;
}

.source-textarea:focus {
  background: var(--color-bg-primary);
}

.preview-scroll {
  flex: 1;
  padding: var(--space-4);
  overflow-y: auto;
}

.preview-empty {
  color: var(--color-text-tertiary);
  font-style: italic;
}

@media (max-width: 640px) {
  .split-editor {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto 1fr;
  }
  .split-divider {
    width: auto;
    height: 1px;
  }
}
</style>
