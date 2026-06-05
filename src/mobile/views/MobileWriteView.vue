<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDraft } from '../../composables/useDraft'
import { useNotesStore } from '../../stores/notes'

const route = useRoute()
const router = useRouter()
const notesStore = useNotesStore()

const {
  draftTitle,
  draftContent,
  draftCategory,
  draftTags,
  clearDraft,
} = useDraft('mobile-write-new')

const title = ref('')
const content = ref('')
const category = ref('')
const tags = ref('')
const isSaving = ref(false)
const loadedKey = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const showCancelConfirm = ref(false)

const noteId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' && id ? id : ''
})

const isEditing = computed(() => !!noteId.value)
const note = computed(() => noteId.value ? notesStore.getNoteById(noteId.value) : undefined)

const pageTitle = computed(() => isEditing.value ? '编辑笔记' : '新建笔记')
const canSave = computed(() => !!content.value.trim() && !isSaving.value)
const isDirty = computed(() => {
  if (!isEditing.value) {
    return !!(title.value.trim() || content.value.trim() || category.value.trim() || tags.value.trim())
  }
  if (!note.value) return false
  return title.value !== note.value.title ||
    content.value !== note.value.content ||
    category.value !== note.value.category ||
    tags.value !== note.value.tags.join(' ')
})

watch([noteId, note], () => {
  if (isEditing.value) {
    if (!note.value || loadedKey.value === noteId.value) return
    title.value = note.value.title
    content.value = note.value.content
    category.value = note.value.category
    tags.value = note.value.tags.join(' ')
    loadedKey.value = noteId.value
    return
  }

  if (loadedKey.value === 'new') return
  title.value = draftTitle.value
  content.value = draftContent.value
  category.value = draftCategory.value || (route.query.category as string | undefined) || ''
  tags.value = draftTags.value
  loadedKey.value = 'new'
}, { immediate: true })

watch([title, content, category, tags], () => {
  if (isEditing.value) return
  draftTitle.value = title.value
  draftContent.value = content.value
  draftCategory.value = category.value
  draftTags.value = tags.value
})

function goBack() {
  if (isDirty.value) {
    showCancelConfirm.value = true
    return
  }
  leaveEditor()
}

function leaveEditor() {
  showCancelConfirm.value = false
  if (isEditing.value && noteId.value) {
    router.replace(`/m/note/${noteId.value}`)
  } else {
    router.replace('/m/notes')
  }
}

async function saveNote() {
  if (!canSave.value) return
  isSaving.value = true

  try {
    const payload = {
      title: title.value.trim(),
      content: content.value.trim(),
      category: category.value.trim() || '未分类',
      tags: tags.value.trim() ? tags.value.trim().split(/\s+/) : [],
    }

    if (isEditing.value && note.value) {
      await notesStore.updateNote(note.value.id, payload)
      await router.replace(`/m/note/${note.value.id}`)
      return
    }

    const created = await notesStore.addNote(payload)
    clearDraft()
    await router.replace(`/m/note/${created.id}`)
  } finally {
    isSaving.value = false
  }
}

function selectCategory(value: string) {
  category.value = value
}

function insertMarkdown(before: string, after = '', placeholder = '') {
  const textarea = textareaRef.value
  if (!textarea) {
    content.value += `${before}${placeholder}${after}`
    return
  }

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = content.value.slice(start, end) || placeholder
  const next = `${content.value.slice(0, start)}${before}${selected}${after}${content.value.slice(end)}`
  content.value = next

  nextTick(() => {
    const cursorStart = start + before.length
    const cursorEnd = cursorStart + selected.length
    textarea.focus()
    textarea.setSelectionRange(cursorStart, cursorEnd)
  })
}

function insertChecklist() {
  const textarea = textareaRef.value
  const prefix = content.value && !content.value.endsWith('\n') ? '\n- [ ] ' : '- [ ] '
  if (!textarea) {
    content.value += `${prefix}待办事项`
    return
  }
  const start = textarea.selectionStart
  const next = `${content.value.slice(0, start)}${prefix}待办事项${content.value.slice(textarea.selectionEnd)}`
  content.value = next
  nextTick(() => {
    const pos = start + prefix.length
    textarea.focus()
    textarea.setSelectionRange(pos, pos + 4)
  })
}
</script>

<template>
  <section class="mobile-write-page">
    <header class="mobile-write-header">
      <button type="button" class="header-btn" @click="goBack" aria-label="返回">
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
      </button>

      <div class="header-title">
        <span>{{ pageTitle }}</span>
        <strong>{{ title || '未命名笔记' }}</strong>
      </div>

      <button type="button" class="save-btn" :disabled="!canSave" @click="saveNote">
        <span v-if="!isSaving">保存</span>
        <span v-else class="save-spinner" />
      </button>
    </header>

    <main class="mobile-write-scroll">
      <div v-if="isEditing && !note && !notesStore.isLoading" class="write-missing">
        <p>笔记不存在或已被删除</p>
        <button type="button" @click="router.replace('/m/notes')">返回列表</button>
      </div>

      <form v-else class="mobile-write-form" @submit.prevent="saveNote">
        <input
          v-model="title"
          class="title-input"
          type="text"
          placeholder="笔记标题"
          autocomplete="off"
        >

        <div class="field-block">
          <label>分类</label>
          <input
            v-model="category"
            class="meta-input"
            type="text"
            placeholder="未分类"
            autocomplete="off"
          >
          <div v-if="notesStore.categories.length" class="category-picks">
            <button
              v-for="item in notesStore.categories"
              :key="item"
              type="button"
              :class="{ active: category === item }"
              @click="selectCategory(item)"
            >
              {{ item }}
            </button>
          </div>
        </div>

        <div class="field-block">
          <label>标签</label>
          <input
            v-model="tags"
            class="meta-input"
            type="text"
            placeholder="空格分隔，例如 工作 想法"
            autocomplete="off"
          >
        </div>

        <div class="markdown-tools" aria-label="Markdown 工具栏">
          <button type="button" @click="insertMarkdown('## ', '', '小标题')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 4v16" />
              <path d="M18 4v16" />
              <path d="M6 12h12" />
            </svg>
            <span>标题</span>
          </button>
          <button type="button" @click="insertMarkdown('**', '**', '加粗文字')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 5h6a4 4 0 0 1 0 8H7z" />
              <path d="M7 13h7a4 4 0 0 1 0 8H7z" />
            </svg>
            <span>加粗</span>
          </button>
          <button type="button" @click="insertChecklist">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span>清单</span>
          </button>
          <button type="button" @click="insertMarkdown('> ', '', '引用内容')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2H5c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2 1 0 1 0 1 1 0 1-1 2-3 2" />
              <path d="M14 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2h-3c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2 1 0 1 0 1 1 0 1-1 2-3 2" />
            </svg>
            <span>引用</span>
          </button>
        </div>

        <textarea
          ref="textareaRef"
          v-model="content"
          class="content-input"
          placeholder="写下正文，支持 Markdown"
          spellcheck="false"
        />
      </form>
    </main>

    <Teleport to="body">
      <div v-if="showCancelConfirm" class="mobile-confirm-mask" @click.self="showCancelConfirm = false">
        <div class="mobile-confirm-sheet">
          <h2>放弃当前修改</h2>
          <p>还没有保存，离开后这次编辑不会写入笔记。</p>
          <div class="confirm-actions">
            <button type="button" @click="showCancelConfirm = false">继续编辑</button>
            <button type="button" class="danger" @click="leaveEditor">放弃</button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.mobile-write-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-bg-primary);
}

.mobile-write-header {
  height: calc(56px + env(safe-area-inset-top, 0px));
  padding: env(safe-area-inset-top, 0px) 12px 0;
  flex-shrink: 0;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  border-bottom: 1px solid var(--color-divider);
  background: var(--color-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: var(--z-sticky);
}

.header-btn {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.header-title {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-title span {
  color: var(--color-text-tertiary);
  font-size: 0.68rem;
  font-weight: 800;
}

.header-title strong {
  min-width: 0;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.94rem;
}

.save-btn {
  min-width: 62px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  font-weight: 800;
}

.save-btn:disabled {
  opacity: 0.48;
}

.save-spinner {
  width: 17px;
  height: 17px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: currentColor;
  animation: spin 0.65s linear infinite;
}

.mobile-write-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.mobile-write-form {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
}

.title-input {
  width: 100%;
  min-height: 52px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: 1.08rem;
  font-weight: 800;
}

.title-input::placeholder,
.meta-input::placeholder,
.content-input::placeholder {
  color: var(--color-text-tertiary);
}

.field-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-block label {
  color: var(--color-text-tertiary);
  font-size: 0.72rem;
  font-weight: 800;
}

.meta-input {
  width: 100%;
  min-height: 44px;
  padding: 0 13px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: 0.9rem;
}

.category-picks {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.category-picks::-webkit-scrollbar {
  display: none;
}

.category-picks button {
  height: 31px;
  flex-shrink: 0;
  max-width: 180px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  font-size: 0.76rem;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-picks button.active {
  color: var(--color-accent-text);
  border-color: var(--color-accent);
  background: var(--color-accent-muted);
}

.markdown-tools {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.markdown-tools button {
  min-width: 0;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  font-size: 0.76rem;
  font-weight: 800;
}

.markdown-tools button span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.content-input {
  flex: 1;
  min-height: 360px;
  width: 100%;
  resize: none;
  padding: 14px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: 0.92rem;
  line-height: 1.65;
}

.write-missing {
  min-height: 70%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  color: var(--color-text-tertiary);
}

.write-missing p {
  margin: 0;
}

.write-missing button {
  height: 40px;
  padding: 0 14px;
  border-radius: 8px;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  font-weight: 800;
}

.mobile-confirm-mask {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.55);
}

.mobile-confirm-sheet {
  width: min(420px, 100%);
  padding: 18px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  box-shadow: var(--shadow-lg);
}

.mobile-confirm-sheet h2 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 1.05rem;
}

.mobile-confirm-sheet p {
  margin: 8px 0 16px;
  color: var(--color-text-secondary);
  font-size: 0.88rem;
  line-height: 1.55;
}

.confirm-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.confirm-actions button {
  height: 42px;
  border-radius: 8px;
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  font-weight: 800;
}

.confirm-actions button.danger {
  color: var(--color-text-inverse);
  background: var(--color-danger);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
