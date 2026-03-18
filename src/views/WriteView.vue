<script setup lang="ts">
import { ref } from 'vue'
import { useNotesStore } from '../stores/notes'
import { useRouter } from 'vue-router'
import MilkdownEditor from '../components/MilkdownEditor.vue'
import MarkdownRenderer from '../components/MarkdownRenderer.vue'

const notesStore = useNotesStore()
const router = useRouter()

const title = ref('')
const content = ref('')
const category = ref('')
const tags = ref('')
const isSaving = ref(false)

type EditorMode = 'wysiwyg' | 'split'
const editorMode = ref<EditorMode>('wysiwyg')

async function handleSubmit() {
  if (!content.value.trim()) return

  isSaving.value = true
  await new Promise(resolve => setTimeout(resolve, 200))

  const note = await notesStore.addNote({
    title: title.value.trim(),
    content: content.value.trim(),
    category: category.value.trim() || '未分类',
    tags: tags.value.trim() ? tags.value.trim().split(/\s+/) : [],
  })

  isSaving.value = false
  router.push(`/note/${note.id}`)
}
</script>

<template>
  <div class="write-page">
    <div class="page-header">
      <h2 class="page-title">新建笔记</h2>
      <div class="mode-switcher">
        <button
          class="mode-btn"
          :class="{ active: editorMode === 'wysiwyg' }"
          @click="editorMode = 'wysiwyg'"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <span>编辑</span>
        </button>
        <button
          class="mode-btn"
          :class="{ active: editorMode === 'split' }"
          @click="editorMode = 'split'"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" />
          </svg>
          <span>分屏</span>
        </button>
      </div>
    </div>

    <form class="write-form" @submit.prevent="handleSubmit" novalidate>
      <input
        v-model="title"
        type="text"
        class="write-title"
        placeholder="笔记标题（可选）"
      >

      <!-- WYSIWYG 模式 -->
      <MilkdownEditor
        v-if="editorMode === 'wysiwyg'"
        v-model="content"
      />

      <!-- 分屏模式：左源码 + 右预览 -->
      <div v-else class="split-editor">
        <div class="split-pane source-pane">
          <div class="pane-label">Markdown 源码</div>
          <textarea
            v-model="content"
            class="source-textarea"
            placeholder="在此输入或粘贴 Markdown 内容…"
            spellcheck="false"
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

      <div class="write-meta">
        <div class="meta-field">
          <label class="meta-label">分类</label>
          <input
            v-model="category"
            type="text"
            class="meta-input"
            placeholder="输入分类"
            list="category-list"
          >
          <datalist id="category-list">
            <option v-for="cat in notesStore.categories" :key="cat" :value="cat" />
          </datalist>
        </div>

        <div class="meta-field">
          <label class="meta-label">标签</label>
          <input
            v-model="tags"
            type="text"
            class="meta-input"
            placeholder="空格分隔"
          >
        </div>
      </div>

      <div class="write-actions">
        <button type="button" class="btn-secondary" @click="router.back()">取消</button>
        <button
          type="submit"
          class="btn-primary"
          :class="{ 'is-loading': isSaving }"
          :disabled="!content.trim() || isSaving"
        >
          <span v-if="!isSaving">保存笔记</span>
          <span v-else class="spinner" />
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.write-page {
  max-width: 960px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

/* ─── 模式切换 ─── */
.mode-switcher {
  display: flex;
  gap: var(--space-1);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--space-1);
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text-tertiary);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

.mode-btn.active {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  box-shadow: 0 1px 3px var(--color-shadow);
}

@media (hover: hover) {
  .mode-btn:not(.active):hover {
    color: var(--color-text-secondary);
  }
}

/* ─── 表单 ─── */
.write-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.write-title {
  font-size: 1.2rem;
  font-weight: 600;
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

/* ─── 分屏编辑器 ─── */
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

/* ─── 元信息 ─── */
.write-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.meta-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.meta-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.meta-input {
  padding: var(--space-2) var(--space-3);
  font-size: 0.9rem;
}

/* ─── 按钮 ─── */
.write-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-divider);
}

.btn-primary,
.btn-secondary {
  padding: var(--space-2) var(--space-6);
  border-radius: var(--radius-md);
  font-weight: 500;
  font-size: 0.9rem;
  transition: background-color var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out),
              opacity var(--duration-fast) var(--ease-out);
}

.btn-primary {
  background: var(--color-accent);
  color: var(--color-text-inverse);
}

.btn-primary:disabled { opacity: 0.5; }
.btn-primary.is-loading { pointer-events: none; }

@media (hover: hover) {
  .btn-primary:hover:not(:disabled) { background: var(--color-accent-hover); }
  .btn-secondary:hover { background: var(--color-bg-hover); }
}

.btn-secondary {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: currentColor;
  border-radius: var(--radius-full);
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 640px) {
  .write-meta { grid-template-columns: 1fr; }
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
