<script setup lang="ts">
/**
 * SubNotePanel — 子笔记侧边面板
 * 在 NoteDetailView 阅读模式左侧显示，可折叠为一个小图标
 * 展开后显示子笔记列表 + 新建按钮
 */
import { ref, computed, watch } from 'vue'
import { useNotesStore } from '../stores/notes'
import ConfirmDialog from './ConfirmDialog.vue'

const props = defineProps<{
  /** 父笔记 ID */
  parentId: string
  /** 当前正在查看的子笔记 ID（如果有的话） */
  activeChildId?: string | null
  /** 是否是子笔记（子笔记不允许再新建子笔记） */
  isChildNote?: boolean
}>()

const emit = defineEmits<{
  /** 选中子笔记 */
  select: [noteId: string]
  /** 返回父笔记 */
  back: []
  /** 子笔记被创建 */
  created: [noteId: string]
}>()

const notesStore = useNotesStore()
const expanded = ref(false)

const childNotes = computed(() => notesStore.getChildNotes(props.parentId))
const childCount = computed(() => childNotes.value.length)

/* 如果是子笔记视角则不显示此面板 */
const shouldShow = computed(() => !props.isChildNote)

/* 新建子笔记 */
const isCreating = ref(false)
const newTitle = ref('')
const titleInputRef = ref<HTMLInputElement | null>(null)

function startCreate() {
  isCreating.value = true
  newTitle.value = ''
  setTimeout(() => titleInputRef.value?.focus(), 50)
}

function cancelCreate() {
  isCreating.value = false
  newTitle.value = ''
}

async function confirmCreate() {
  const title = newTitle.value.trim()
  if (!title) return

  const parentNote = notesStore.getNoteById(props.parentId)
  const note = await notesStore.addNote({
    title,
    parentId: props.parentId,
    category: parentNote?.category || '未分类',
    content: '',
    tags: [],
  })
  isCreating.value = false
  newTitle.value = ''
  emit('created', note.id)
  // 自动展开面板
  expanded.value = true
}

function handleTitleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    confirmCreate()
  } else if (e.key === 'Escape') {
    cancelCreate()
  }
}

/* 删除子笔记 */
const showDeleteConfirm = ref(false)
const deleteTargetId = ref('')
const deleteTargetTitle = ref('')

function requestDelete(noteId: string, title: string) {
  deleteTargetId.value = noteId
  deleteTargetTitle.value = title || '未命名笔记'
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  showDeleteConfirm.value = false
  if (!deleteTargetId.value) return
  // 如果正在查看该子笔记，返回父笔记
  if (props.activeChildId === deleteTargetId.value) {
    emit('back')
  }
  await notesStore.deleteNote(deleteTargetId.value)
  deleteTargetId.value = ''
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}

/* 有子笔记时自动半展开提示 */
watch(childCount, (c) => {
  if (c > 0 && !expanded.value) {
    // 保持折叠但不自动打开 — 用户自己决定
  }
}, { immediate: true })
</script>

<template>
  <aside v-if="shouldShow" class="sub-note-panel" :class="{ expanded }">
    <!-- 折叠态：仅显示图标 + 数量 -->
    <button
      v-if="!expanded"
      class="panel-toggle"
      :class="{ 'has-children': childCount > 0 }"
      @click="expanded = true"
      data-tooltip="子笔记"
      data-tooltip-pos="right"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
      <span v-if="childCount > 0" class="toggle-badge">{{ childCount }}</span>
    </button>

    <!-- 展开态 -->
    <template v-else>
      <div class="panel-header">
        <div class="panel-title-row">
          <span class="panel-title">子笔记</span>
          <span class="panel-count" v-if="childCount > 0">{{ childCount }}</span>
        </div>
        <button class="panel-collapse-btn" @click="expanded = false">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      <!-- 子笔记列表 -->
      <div class="panel-list" v-if="childNotes.length > 0">
        <div
          v-for="child in childNotes"
          :key="child.id"
          class="sub-note-item"
          :class="{ active: activeChildId === child.id }"
          @click="emit('select', child.id)"
        >
          <div class="item-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div class="item-content">
            <span class="item-title">{{ child.title || '未命名' }}</span>
            <span class="item-date">{{ formatDate(child.updatedAt) }}</span>
          </div>
          <button
            class="item-delete"
            @click.stop="requestDelete(child.id, child.title)"
            data-tooltip="删除"
            data-tooltip-pos="left"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="panel-empty">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span>暂无子笔记<br>点击下方新建</span>
      </div>

      <!-- 新建区域 -->
      <div class="panel-footer">
        <template v-if="isCreating">
          <div class="create-form">
            <input
              ref="titleInputRef"
              v-model="newTitle"
              type="text"
              class="create-input"
              placeholder="输入子笔记标题…"
              @keydown="handleTitleKeydown"
            >
            <div class="create-hint">创建后自动跳转编辑内容</div>
            <div class="create-actions">
              <button class="create-btn create-btn--confirm" :disabled="!newTitle.trim()" @click="confirmCreate">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
              <button class="create-btn create-btn--cancel" @click="cancelCreate">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </template>
        <button v-else class="add-btn" @click="startCreate">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>新建子笔记</span>
        </button>
      </div>
    </template>

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      :open="showDeleteConfirm"
      title="确认删除子笔记"
      :message="`将把 <strong>${deleteTargetTitle}</strong> 移入回收站。`"
      confirm-text="删除"
      confirm-type="danger"
      @confirm="confirmDelete"
      @cancel="showDeleteConfirm = false"
    />
  </aside>
</template>

<style scoped>
.sub-note-panel {
  position: sticky;
  top: var(--space-6);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  max-height: calc(100vh - 200px);
  transition: width var(--duration-normal, 200ms) var(--ease-out);
}

/* 折叠态 */
.sub-note-panel:not(.expanded) {
  width: 36px;
  align-items: center;
}

/* 展开态 */
.sub-note-panel.expanded {
  width: 200px;
  gap: var(--space-2);
}

/* ─── 折叠按钮 ─── */
.panel-toggle {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
}

.panel-toggle.has-children {
  color: var(--color-accent);
  border-color: var(--color-accent-muted);
  background: var(--color-accent-muted);
}

@media (hover: hover) {
  .panel-toggle:hover {
    color: var(--color-accent);
    background: var(--color-bg-hover);
    border-color: var(--color-accent);
  }
}

.toggle-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  font-weight: 700;
  color: #fff;
  background: var(--color-accent);
  border-radius: var(--radius-full);
  line-height: 1;
}

/* ─── 展开头部 ─── */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-1);
}

.panel-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.panel-title {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.panel-count {
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--color-accent);
  background: var(--color-accent-muted);
  padding: 1px 5px;
  border-radius: var(--radius-full);
  line-height: 1.2;
}

.panel-collapse-btn {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--color-text-tertiary);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .panel-collapse-btn:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
}

/* ─── 子笔记列表 ─── */
.panel-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}

.sub-note-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .sub-note-item:hover {
    background: var(--color-bg-hover);
  }
  .sub-note-item:hover .item-delete {
    opacity: 1;
  }
}

.sub-note-item.active {
  background: var(--color-accent-muted);
}

.sub-note-item.active .item-icon {
  color: var(--color-accent);
}

.sub-note-item.active .item-title {
  color: var(--color-accent);
  font-weight: 600;
}

.item-icon {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.item-title {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.item-date {
  font-size: 0.6rem;
  color: var(--color-text-tertiary);
  opacity: 0.7;
}

.item-delete {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--color-text-tertiary);
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              background-color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .item-delete:hover {
    color: var(--color-danger);
    background: var(--color-danger-muted);
  }
}

/* ─── 空状态 ─── */
.panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-6) var(--space-2);
  text-align: center;
  color: var(--color-text-tertiary);
  opacity: 0.5;
}

.panel-empty span {
  font-size: 0.65rem;
}

/* ─── 底部新建 ─── */
.panel-footer {
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-divider);
  margin-top: auto;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--color-text-tertiary);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .add-btn:hover {
    background: var(--color-accent-muted);
    color: var(--color-accent);
  }
}

/* ─── 新建表单 ─── */
.create-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.create-input {
  width: 100%;
  padding: var(--space-2);
  font-size: 0.75rem;
  color: var(--color-text-primary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  box-shadow: 0 0 0 3px var(--color-accent-muted);
  transition: border-color var(--duration-fast) var(--ease-out);
}

.create-input::placeholder {
  color: var(--color-text-tertiary);
}

.create-hint {
  font-size: 0.6rem;
  color: var(--color-text-tertiary);
  opacity: 0.7;
  text-align: center;
}

.create-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-1);
}

.create-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

.create-btn--confirm {
  color: var(--color-success);
}

.create-btn--confirm:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

@media (hover: hover) {
  .create-btn--confirm:not(:disabled):hover {
    background: var(--color-success-muted, rgba(34, 197, 94, 0.1));
  }
}

.create-btn--cancel {
  color: var(--color-text-tertiary);
}

@media (hover: hover) {
  .create-btn--cancel:hover {
    background: var(--color-bg-hover);
    color: var(--color-danger);
  }
}

/* ─── 响应式 ─── */
@media (max-width: 1100px) {
  .sub-note-panel { display: none; }
}
</style>
