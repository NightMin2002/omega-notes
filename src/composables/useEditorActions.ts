/**
 * useEditorActions — 编辑器操作 Composable
 * 提取 WriteView / NoteDetailView 共用的编辑器逻辑：
 * - 图片文件选择插入
 * - Wiki 链接选择器
 * - Markdown 工具栏 insert / wrap
 * - 粘贴图片处理
 */
import { ref, computed, type Ref } from 'vue'
import { useNotesStore } from '../stores/notes'

interface UseEditorActionsOptions {
  /** 绑定的内容 ref（v-model 源） */
  content: Ref<string>
  /** 编辑器模式 ref */
  editorMode: Ref<'wysiwyg' | 'split'>
  /** 编辑器重建 key ref（WYSIWYG 模式用） */
  editorKey: Ref<number>
  /** 分屏模式 textarea ref */
  textareaRef: Ref<HTMLTextAreaElement | null>
}

export function useEditorActions(opts: UseEditorActionsOptions) {
  const { content, editorMode, editorKey, textareaRef } = opts
  const notesStore = useNotesStore()

  /* ─── 图片插入 ─── */
  function insertImageFromFile() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = () => {
      if (!input.files) return
      let pending = input.files.length
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i]!
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result as string
          content.value += `\n![${file.name}](${dataUrl})\n`
          pending--
          if (pending === 0) editorKey.value++
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  /* ─── Wiki 链接选择器 ─── */
  const showLinkPicker = ref(false)
  const linkSearch = ref('')

  const linkCandidates = computed(() => {
    const q = linkSearch.value.toLowerCase()
    return notesStore.notes
      .filter(n => q === '' || n.title.toLowerCase().includes(q))
      .slice(0, 10)
  })

  function insertWikiLink(noteTitle: string) {
    content.value += `[[${noteTitle}]]`
    showLinkPicker.value = false
    linkSearch.value = ''
    editorKey.value++
  }

  function toggleLinkPicker() {
    showLinkPicker.value = !showLinkPicker.value
    linkSearch.value = ''
  }

  /* ─── 格式化工具栏开关 ─── */
  const showFormatToolbar = ref(false)

  /* ─── 工具栏操作 ─── */
  function handleToolbarInsert(text: string) {
    if (editorMode.value === 'wysiwyg') {
      if (content.value && !content.value.endsWith('\n')) {
        content.value += '\n'
      }
      content.value += text
      editorKey.value++
      return
    }
    const ta = textareaRef.value
    if (!ta) {
      content.value += text
      return
    }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const before = content.value.slice(0, start)
    const after = content.value.slice(end)
    content.value = before + text + after
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + text.length
      ta.setSelectionRange(pos, pos)
    })
  }

  function handleToolbarWrap(prefix: string, suffix: string) {
    if (editorMode.value === 'wysiwyg') {
      if (content.value && !content.value.endsWith('\n')) {
        content.value += '\n'
      }
      content.value += prefix + '文本' + suffix
      editorKey.value++
      return
    }
    const ta = textareaRef.value
    if (!ta) {
      content.value += prefix + suffix
      return
    }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const before = content.value.slice(0, start)
    const selected = content.value.slice(start, end)
    const after = content.value.slice(end)
    const placeholder = selected || '文本'
    content.value = before + prefix + placeholder + suffix + after
    requestAnimationFrame(() => {
      ta.focus()
      if (selected) {
        ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length)
      } else {
        ta.setSelectionRange(start + prefix.length, start + prefix.length + placeholder.length)
      }
    })
  }

  /* ─── 粘贴图片处理 ─── */
  function handlePaste(e: ClipboardEvent) {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!
      if (!item.type.startsWith('image/')) continue

      e.preventDefault()
      const file = item.getAsFile()
      if (!file) continue

      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const imgMd = `\n![粘贴图片](${dataUrl})\n`

        if (editorMode.value === 'wysiwyg') {
          content.value += imgMd
          editorKey.value++
        } else {
          const ta = textareaRef.value
          if (ta) {
            const start = ta.selectionStart
            const before = content.value.slice(0, start)
            const after = content.value.slice(ta.selectionEnd)
            content.value = before + imgMd + after
          } else {
            content.value += imgMd
          }
        }
      }
      reader.readAsDataURL(file)
      break
    }
  }

  return {
    insertImageFromFile,
    showLinkPicker,
    linkSearch,
    linkCandidates,
    insertWikiLink,
    toggleLinkPicker,
    showFormatToolbar,
    handleToolbarInsert,
    handleToolbarWrap,
    handlePaste,
  }
}
