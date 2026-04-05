<script setup lang="ts">
/**
 * ExplorerView — 知识库浏览器（主从布局）
 * 左侧 Master：分类树 + 笔记列表
 * 右侧 Detail：笔记内容阅读/编辑
 */
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NoteListPanel from '../components/NoteListPanel.vue'
import NoteReaderPanel from '../components/NoteReaderPanel.vue'

const route = useRoute()
const router = useRouter()

/* ─── 选中的笔记 ID ─── */
const selectedNoteId = ref<string | null>(
  (route.params.id as string) || null
)

/* URL 中的 id 参数发生变化时同步 */
watch(() => route.params.id, (id) => {
  if (typeof id === 'string') selectedNoteId.value = id
})

function handleNoteSelect(id: string) {
  selectedNoteId.value = id
  // 静默更新 URL（不触发路由导航）
  router.replace({ params: { id } })
}

function handleNoteDeleted() {
  selectedNoteId.value = null
  router.replace({ params: { id: '' } })
}

/* ─── 分隔条可拖拽调整 Master 面板宽度 ─── */
const MASTER_MIN = 260
const MASTER_MAX = 480
const MASTER_DEFAULT = 340
const masterWidth = ref(
  parseInt(localStorage.getItem('omega-explorer-master-width') || '') || MASTER_DEFAULT
)

let isResizing = false

function startResize(e: MouseEvent) {
  e.preventDefault()
  isResizing = true
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'

  const startX = e.clientX
  const startWidth = masterWidth.value

  function onMove(ev: MouseEvent) {
    if (!isResizing) return
    const delta = ev.clientX - startX
    masterWidth.value = Math.max(MASTER_MIN, Math.min(MASTER_MAX, startWidth + delta))
  }

  function onUp() {
    isResizing = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    localStorage.setItem('omega-explorer-master-width', String(masterWidth.value))
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }

  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

/* ─── 键盘快捷键（Esc 取消选中） ─── */
function handleKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && selectedNoteId.value) {
    selectedNoteId.value = null
    router.replace({ params: { id: '' } })
  }
}

onMounted(() => window.addEventListener('keydown', handleKey))
onUnmounted(() => window.removeEventListener('keydown', handleKey))
</script>

<template>
  <div class="explorer-page">
    <!-- Master 面板 -->
    <aside class="master-panel" :style="{ width: masterWidth + 'px' }">
      <NoteListPanel
        :selected-id="selectedNoteId"
        @select="handleNoteSelect"
      />
    </aside>

    <!-- 拖拽分隔条 -->
    <div class="panel-divider" @mousedown="startResize">
      <div class="divider-handle" />
    </div>

    <!-- Detail 面板 -->
    <main class="detail-panel">
      <NoteReaderPanel
        v-if="selectedNoteId"
        :note-id="selectedNoteId"
        @navigate="handleNoteSelect"
        @deleted="handleNoteDeleted"
      />

      <!-- 空白占位 -->
      <div v-else class="detail-empty">
        <div class="empty-visual">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            <line x1="9" y1="10" x2="15" y2="10" />
            <line x1="9" y1="14" x2="13" y2="14" />
          </svg>
          <p class="empty-title">从左侧选择一篇笔记</p>
          <p class="empty-subtitle">点击笔记即可在这里阅读，无需跳转页面</p>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.explorer-page {
  display: flex;
  /* 负 margin 抵消父级 .app-main 的 padding */
  margin: calc(-1 * var(--app-main-padding));
  height: calc(100% + 2 * var(--app-main-padding));
  overflow: hidden;
}

/* ─── Master 面板 ─── */
.master-panel {
  flex-shrink: 0;
  height: 100%;
  overflow: hidden;
  background: var(--color-surface);
  border-right: 1px solid var(--color-divider);
  display: flex;
  flex-direction: column;
}

/* ─── 拖拽分隔条 ─── */
.panel-divider {
  width: 6px;
  flex-shrink: 0;
  cursor: col-resize;
  position: relative;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .panel-divider:hover {
    background: var(--color-accent-muted);
  }
  .panel-divider:hover .divider-handle {
    opacity: 1;
    background: var(--color-accent);
  }
}

.panel-divider:active {
  background: var(--color-accent-muted);
}

.panel-divider:active .divider-handle {
  opacity: 1;
  background: var(--color-accent);
}

.divider-handle {
  width: 3px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--color-border);
  opacity: 0.5;
  transition: opacity var(--duration-fast) var(--ease-out),
              background-color var(--duration-fast) var(--ease-out);
}

/* ─── Detail 面板 ─── */
.detail-panel {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ─── 空白占位 ─── */
.detail-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  color: var(--color-text-tertiary);
  text-align: center;
  padding: var(--space-8);
}

.empty-visual svg {
  opacity: 0.3;
}

.empty-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.empty-subtitle {
  font-size: 0.85rem;
  max-width: 280px;
  line-height: 1.5;
}

/* ─── 响应式：窄屏隐藏 Master 面板 ─── */
@media (max-width: 768px) {
  .explorer-page {
    flex-direction: column;
  }

  .master-panel {
    width: 100% !important;
    height: 45%;
    border-right: none;
    border-bottom: 1px solid var(--color-divider);
  }

  .panel-divider {
    display: none;
  }

  .detail-panel {
    height: 55%;
  }
}
</style>
