<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { CustomTemplate } from '@/types'

const props = defineProps<{
  open: boolean
  /** 编辑模式时传入已有模板 */
  editTemplate?: CustomTemplate | null
}>()

const emit = defineEmits<{
  (e: 'confirm', data: { name: string; description: string; title: string; category: string; content: string }): void
  (e: 'cancel'): void
}>()

const name = ref('')
const description = ref('')
const title = ref('')
const category = ref('')
const content = ref('')
const nameRef = ref<HTMLInputElement | null>(null)

watch(() => props.open, (val) => {
  if (val) {
    if (props.editTemplate) {
      name.value = props.editTemplate.name
      description.value = props.editTemplate.description
      title.value = props.editTemplate.title
      category.value = props.editTemplate.category
      content.value = props.editTemplate.content
    } else {
      name.value = ''
      description.value = ''
      title.value = ''
      category.value = ''
      content.value = ''
    }
    nextTick(() => nameRef.value?.focus())
  }
})

function handleConfirm() {
  if (!name.value.trim()) return
  emit('confirm', {
    name: name.value.trim(),
    description: description.value.trim(),
    title: title.value.trim(),
    category: category.value.trim(),
    content: content.value,
  })
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('cancel')
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    handleConfirm()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="open" class="dialog-backdrop" @mousedown.self="$emit('cancel')" @keydown="handleKeydown">
        <div class="dialog-container" role="dialog" aria-modal="true">
          <div class="dialog-header">
            <h3 class="dialog-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              {{ editTemplate ? '编辑模板' : '新建模板' }}
            </h3>
            <button class="dialog-close-btn" @click="$emit('cancel')" aria-label="关闭">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div class="dialog-body">
            <div class="field-row">
              <div class="field">
                <label class="field-label">模板名称 <span class="required">*</span></label>
                <input
                  ref="nameRef"
                  v-model="name"
                  type="text"
                  class="field-input"
                  placeholder="如：周报模板"
                />
              </div>
              <div class="field">
                <label class="field-label">默认分类</label>
                <input
                  v-model="category"
                  type="text"
                  class="field-input"
                  placeholder="可选"
                />
              </div>
            </div>

            <div class="field">
              <label class="field-label">简要描述</label>
              <input
                v-model="description"
                type="text"
                class="field-input"
                placeholder="模板的用途说明"
              />
            </div>

            <div class="field">
              <label class="field-label">默认标题</label>
              <input
                v-model="title"
                type="text"
                class="field-input"
                placeholder="新建笔记时预填的标题（可选）"
              />
            </div>

            <div class="field field-content">
              <label class="field-label">模板内容 <span class="hint">Markdown 格式</span></label>
              <textarea
                v-model="content"
                class="field-textarea"
                placeholder="在此编写模板的 Markdown 内容..."
                rows="10"
              />
            </div>
          </div>

          <div class="dialog-footer">
            <button class="btn btn-cancel" @click="$emit('cancel')">取消</button>
            <button class="btn btn-confirm" :disabled="!name.trim()" @click="handleConfirm">
              {{ editTemplate ? '保存修改' : '创建模板' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 9000);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  padding: var(--space-6);
}

.dialog-container {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow:
    0 24px 48px rgba(0, 0, 0, 0.3),
    0 8px 16px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  width: 100%;
  max-width: 560px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--color-divider);
  flex-shrink: 0;
}

.dialog-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.dialog-title svg {
  color: var(--color-accent);
}

.dialog-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  color: var(--color-text-tertiary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  appearance: none;
}

@media (hover: hover) {
  .dialog-close-btn:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-secondary);
  }
}

.dialog-close-btn:active { transform: scale(0.92); }
.dialog-close-btn:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--color-accent); }

.dialog-body {
  padding: var(--space-5) var(--space-6);
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  scrollbar-width: thin;
  scrollbar-color: var(--color-border-strong) transparent;
}

.dialog-body::-webkit-scrollbar { width: 5px; }
.dialog-body::-webkit-scrollbar-track { background: transparent; }
.dialog-body::-webkit-scrollbar-thumb {
  background-color: var(--color-border-strong);
  border-radius: var(--radius-full);
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.field-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.required {
  color: var(--color-danger, #ef4444);
}

.hint {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--color-text-tertiary);
  font-size: 0.72rem;
}

.field-input {
  padding: var(--space-2) var(--space-3);
  font-size: 0.88rem;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  transition: border-color var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
  appearance: none;
}

.field-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-muted, oklch(from var(--color-accent) l c h / 0.15));
}

.field-content {
  flex: 1;
  min-height: 0;
}

.field-textarea {
  padding: var(--space-3);
  font-size: 0.88rem;
  font-family: var(--font-mono);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  resize: vertical;
  min-height: 160px;
  line-height: 1.6;
  transition: border-color var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
  appearance: none;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border-strong) transparent;
}

.field-textarea::-webkit-scrollbar { width: 5px; }
.field-textarea::-webkit-scrollbar-track { background: transparent; }
.field-textarea::-webkit-scrollbar-thumb {
  background-color: var(--color-border-strong);
  border-radius: var(--radius-full);
}

.field-textarea:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-muted, oklch(from var(--color-accent) l c h / 0.15));
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-divider);
  background: var(--color-bg-tertiary);
  flex-shrink: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  appearance: none;
  border: 1px solid transparent;
  transition: all var(--duration-fast) var(--ease-out);
}

.btn:active { transform: scale(0.97); }
.btn:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--color-accent); }

.btn-cancel {
  background: transparent;
  color: var(--color-text-secondary);
  border-color: var(--color-border);
}

@media (hover: hover) {
  .btn-cancel:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
    border-color: var(--color-border-strong);
  }
}

.btn-confirm {
  background: var(--color-accent);
  color: #fff;
  box-shadow: 0 2px 6px oklch(from var(--color-accent) l c h / 0.25);
}

.btn-confirm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (hover: hover) {
  .btn-confirm:not(:disabled):hover {
    filter: brightness(1.1);
    box-shadow: 0 4px 12px oklch(from var(--color-accent) l c h / 0.35);
    transform: translateY(-1px);
  }
}

/* 弹窗动画 */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.25s ease-out;
}

.dialog-fade-enter-active .dialog-container,
.dialog-fade-leave-active .dialog-container {
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.25s ease-out;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-fade-enter-from .dialog-container {
  transform: scale(0.95) translateY(8px);
  opacity: 0;
}

.dialog-fade-leave-to .dialog-container {
  transform: scale(0.97) translateY(4px);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .dialog-fade-enter-active,
  .dialog-fade-leave-active,
  .dialog-fade-enter-active .dialog-container,
  .dialog-fade-leave-active .dialog-container {
    transition: none;
  }
}

@media (max-width: 640px) {
  .field-row {
    grid-template-columns: 1fr;
  }
}
</style>
