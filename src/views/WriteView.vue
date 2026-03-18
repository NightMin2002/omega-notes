<script setup lang="ts">
import { ref } from 'vue'
import { useNotesStore } from '../stores/notes'
import { useRouter } from 'vue-router'
import MilkdownEditor from '../components/MilkdownEditor.vue'

const notesStore = useNotesStore()
const router = useRouter()

const title = ref('')
const content = ref('')
const category = ref('')
const tags = ref('')
const isSaving = ref(false)

async function handleSubmit() {
  if (!content.value.trim()) return

  isSaving.value = true
  await new Promise(resolve => setTimeout(resolve, 200))

  const note = notesStore.addNote({
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
    <h2 class="page-title">新建笔记</h2>

    <form class="write-form" @submit.prevent="handleSubmit" novalidate>
      <input
        v-model="title"
        type="text"
        class="write-title"
        placeholder="笔记标题（可选）"
      >

      <MilkdownEditor v-model="content" />

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
  max-width: 720px;
  margin: 0 auto;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: var(--space-6);
}

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
}
</style>
