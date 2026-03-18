<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotesStore } from '../stores/notes'
import MilkdownEditor from '../components/MilkdownEditor.vue'
import MarkdownRenderer from '../components/MarkdownRenderer.vue'

const route = useRoute()
const router = useRouter()
const notesStore = useNotesStore()

const isEditing = ref(false)
const editTitle = ref('')
const editContent = ref('')
const editCategory = ref('')
const editTags = ref('')

type EditorMode = 'wysiwyg' | 'split'
const editorMode = ref<EditorMode>('wysiwyg')

const note = computed(() => {
  const id = route.params.id as string
  return notesStore.getNoteById(id)
})

function startEdit() {
  if (!note.value) return
  editTitle.value = note.value.title
  editContent.value = note.value.content
  editCategory.value = note.value.category
  editTags.value = note.value.tags.join(' ')
  editorMode.value = 'wysiwyg'
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
}

function saveEdit() {
  if (!note.value || !editContent.value.trim()) return
  notesStore.updateNote(note.value.id, {
    title: editTitle.value.trim(),
    content: editContent.value.trim(),
    category: editCategory.value.trim() || '未分类',
    tags: editTags.value.trim() ? editTags.value.trim().split(/\s+/) : [],
  })
  isEditing.value = false
}

function handleDelete() {
  if (!note.value) return
  notesStore.deleteNote(note.value.id)
  router.push('/notes')
}

function togglePin() {
  if (!note.value) return
  notesStore.togglePin(note.value.id)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN')
}

function handlePaste(e: ClipboardEvent) {
  if (!e.clipboardData) return

  let hasImage = false
  if (e.clipboardData.items) {
    for (let i = 0; i < e.clipboardData.items.length; i++) {
      if (e.clipboardData.items[i]!.type.startsWith('image/')) {
        hasImage = true
        break
      }
    }
  }
  if (!hasImage) {
    const html = e.clipboardData.getData('text/html')
    if (html && /<img[^>]+src=["']file:\/\/\//i.test(html)) {
      hasImage = true
    }
  }

  if (!hasImage) return

  e.preventDefault()

  const cd = e.clipboardData
  ;(async () => {
    try {
      const { processClipboardImages } = await import('../utils/images')
      const results = await processClipboardImages(cd)
      for (const md of results) {
        editContent.value += `\n${md}\n`
      }
    } catch (err) {
      console.error('图片粘贴失败:', err)
    }
  })()
}

/** 通过文件选择对话框插入图片 */
function insertImageFromFile() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.multiple = true
  input.onchange = () => {
    if (!input.files) return
    for (let i = 0; i < input.files.length; i++) {
      const file = input.files[i]!
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        editContent.value += `\n![${file.name}](${dataUrl})\n`
      }
      reader.readAsDataURL(file)
    }
  }
  input.click()
}
</script>

<template>
  <div class="detail-page">
    <template v-if="note">
      <!-- 顶部操作栏 -->
      <div class="detail-toolbar">
        <button class="toolbar-btn" @click="router.push('/notes')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>返回</span>
        </button>

        <div class="toolbar-actions">
          <!-- 编辑时：模式切换 -->
          <template v-if="isEditing">
            <div class="mode-switcher">
              <button
                class="mode-btn"
                :class="{ active: editorMode === 'wysiwyg' }"
                @click="editorMode = 'wysiwyg'"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span>编辑</span>
              </button>
              <button
                class="mode-btn"
                :class="{ active: editorMode === 'split' }"
                @click="editorMode = 'split'"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" />
                </svg>
                <span>分屏</span>
              </button>
            </div>
          </template>

          <button class="toolbar-btn" :class="{ active: note.isPinned }" @click="togglePin">
            <svg width="16" height="16" viewBox="0 0 24 24" :fill="note.isPinned ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{{ note.isPinned ? '取消置顶' : '置顶' }}</span>
          </button>
          <button v-if="!isEditing" class="toolbar-btn" @click="startEdit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span>编辑</span>
          </button>
          <button class="toolbar-btn danger" @click="handleDelete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span>删除</span>
          </button>
        </div>
      </div>

      <!-- 编辑模式 -->
      <template v-if="isEditing">
        <form class="edit-form" @submit.prevent="saveEdit" novalidate>
          <input v-model="editTitle" type="text" class="edit-title" placeholder="笔记标题">

          <!-- WYSIWYG 模式 -->
          <template v-if="editorMode === 'wysiwyg'">
            <div class="editor-toolbar">
              <button type="button" class="pane-action" @click="insertImageFromFile">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                </svg>
                <span>插入图片</span>
              </button>
            </div>
            <MilkdownEditor v-model="editContent" />
          </template>

          <!-- 分屏模式 -->
          <div v-else class="split-editor">
            <div class="split-pane source-pane">
              <div class="pane-header">
                <span class="pane-label">Markdown 源码</span>
                <button type="button" class="pane-action" @click="insertImageFromFile">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span>插入图片</span>
                </button>
              </div>
              <textarea
                v-model="editContent"
                class="source-textarea"
                placeholder="在此输入或粘贴 Markdown 内容…&#10;&#10;截图可直接 Ctrl+V 粘贴"
                spellcheck="false"
                @paste="handlePaste"
              />
            </div>
            <div class="split-divider" />
            <div class="split-pane preview-pane">
              <div class="pane-label">实时预览</div>
              <div class="preview-scroll">
                <MarkdownRenderer
                  v-if="editContent.trim()"
                  :content="editContent"
                />
                <p v-else class="preview-empty">预览区域</p>
              </div>
            </div>
          </div>

          <div class="edit-meta-row">
            <input v-model="editCategory" type="text" class="edit-input" placeholder="分类">
            <input v-model="editTags" type="text" class="edit-input" placeholder="标签（空格分隔）">
          </div>
          <div class="edit-actions">
            <button type="button" class="btn-cancel" @click="cancelEdit">取消</button>
            <button type="submit" class="btn-save" :disabled="!editContent.trim()">保存</button>
          </div>
        </form>
      </template>

      <!-- 阅读模式 -->
      <template v-else>
        <article class="note-article">
          <h1 class="note-title">{{ note.title || '未命名笔记' }}</h1>

          <div class="note-meta">
            <span class="meta-category">{{ note.category }}</span>
            <span class="meta-date">创建于 {{ formatDate(note.createdAt) }}</span>
            <span v-if="note.createdAt !== note.updatedAt" class="meta-date">
              · 更新于 {{ formatDate(note.updatedAt) }}
            </span>
          </div>

          <div v-if="note.tags.length > 0" class="note-tags">
            <span v-for="tag in note.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>

          <MarkdownRenderer :content="note.content" />
        </article>
      </template>
    </template>

    <!-- 404 -->
    <div v-else class="not-found">
      <p>笔记不存在</p>
      <RouterLink to="/notes" class="back-link">返回知识库</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.detail-page {
  max-width: 960px;
  margin: 0 auto;
}

.detail-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
  gap: var(--space-3);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .toolbar-btn:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
  .toolbar-btn.danger:hover {
    background: var(--color-danger-muted);
    color: var(--color-danger);
  }
}

.toolbar-btn.active { color: var(--color-accent); }

/* ─── 模式切换 ─── */
.mode-switcher {
  display: flex;
  gap: var(--space-1);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--space-1);
  margin-right: var(--space-2);
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
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
/* ─── 编辑器工具条 ─── */
.editor-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
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

/* ─── 阅读模式 ─── */
.note-article { padding-bottom: var(--space-12); }

.note-title {
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.3;
  margin-bottom: var(--space-4);
}

.note-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
}

.meta-category {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-accent);
  padding: var(--space-1) var(--space-2);
  background: var(--color-accent-muted);
  border-radius: var(--radius-full);
}

.meta-date {
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
}

.note-tags {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-bottom: var(--space-6);
}

.tag {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  padding: var(--space-1) var(--space-2);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
}

/* ─── 编辑表单 ─── */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.edit-title {
  font-size: 1.2rem;
  font-weight: 600;
  padding: var(--space-3) var(--space-4);
}

.edit-meta-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.edit-input { padding: var(--space-2) var(--space-3); }

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-divider);
}

.btn-save,
.btn-cancel {
  padding: var(--space-2) var(--space-6);
  border-radius: var(--radius-md);
  font-weight: 500;
  transition: background-color var(--duration-fast) var(--ease-out),
              opacity var(--duration-fast) var(--ease-out);
}

.btn-save {
  background: var(--color-accent);
  color: var(--color-text-inverse);
}

.btn-save:disabled { opacity: 0.5; }

@media (hover: hover) {
  .btn-save:hover:not(:disabled) { background: var(--color-accent-hover); }
  .btn-cancel:hover { background: var(--color-bg-hover); }
}

.btn-cancel {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-16) 0;
  color: var(--color-text-tertiary);
}

.back-link { color: var(--color-accent); }

@media (max-width: 640px) {
  .edit-meta-row { grid-template-columns: 1fr; }
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
