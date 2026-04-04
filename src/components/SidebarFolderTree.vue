<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotesStore } from '../stores/notes'
import ContextMenu from './ContextMenu.vue'
import type { ContextMenuItem } from './ContextMenu.vue'
import InputDialog from './InputDialog.vue'

const emit = defineEmits<{
  collapseIfMobile: []
}>()

const route = useRoute()
const router = useRouter()
const notesStore = useNotesStore()

/* 文件夹展开状态 */
const expandedFolders = ref(new Set<string>())
const showFolders = ref(true)

function toggleFolder(path: string) {
  const s = expandedFolders.value
  if (s.has(path)) {
    s.delete(path)
  } else {
    s.add(path)
  }
}

interface FlatFolder {
  name: string
  fullPath: string
  depth: number
  count: number
  totalCount: number
  hasChildren: boolean
  expanded: boolean
}

/** 将树展平为带缩进的数组（仅展开节点的子级可见） */
const flatFolders = computed<FlatFolder[]>(() => {
  const result: FlatFolder[] = []
  function walk(nodes: any[], depth: number) {
    for (const node of nodes) {
      const expanded = expandedFolders.value.has(node.fullPath)
      result.push({
        name: node.name,
        fullPath: node.fullPath,
        depth,
        count: node.count,
        totalCount: node.totalCount,
        hasChildren: node.children.length > 0,
        expanded,
      })
      if (expanded && node.children.length > 0) {
        walk(node.children, depth + 1)
      }
    }
  }
  walk(notesStore.categoryTree, 0)
  return result
})

function navigateFolder(path: string) {
  emit('collapseIfMobile')
  router.push({ path: '/notes', query: { category: path } })
}

/* ─── 右键菜单 ─── */
const showContextMenu = ref(false)
const contextMenuPos = ref({ x: 0, y: 0 })
const contextMenuTarget = ref('')

const contextMenuItems = computed<ContextMenuItem[]>(() => {
  const target = contextMenuTarget.value
  if (!target) return []
  return [
    { id: 'new-note', label: '新建笔记到此分类' },
    { id: 'new-sub', label: '新建子分类' },
    { id: 'divider-1', label: '', divider: true },
    { id: 'delete', label: '删除分类', danger: true },
  ]
})

function handleFolderContextMenu(e: MouseEvent, folderPath: string) {
  contextMenuTarget.value = folderPath
  contextMenuPos.value = { x: e.clientX, y: e.clientY }
  showContextMenu.value = true
}

const showInputDialog = ref(false)
const inputDialogTitle = ref('')

async function handleContextMenuSelect(id: string) {
  const target = contextMenuTarget.value
  if (!target) return

  if (id === 'new-note') {
    const note = await notesStore.addNote({
      title: '',
      content: '',
      category: target,
    })
    router.push(`/note/${note.id}?edit=1`)
  } else if (id === 'new-sub') {
    inputDialogTitle.value = `在 "${target.split('/').pop()}" 下新建子分类`
    showInputDialog.value = true
  } else if (id === 'delete') {
    await notesStore.deleteCategory(target)
    // 如果当前正在查看该分类，跳回全部笔记
    if (route.query.category === target) {
      router.push('/notes')
    }
  }
}

function handleInputConfirm(val: string) {
  const target = contextMenuTarget.value
  showInputDialog.value = false
  if (target && val) {
    notesStore.addCustomCategory(`${target}/${val}`)
  }
}
</script>

<template>
  <template v-if="flatFolders.length > 0">
    <div class="nav-divider" />
    <button class="nav-section-label folder-toggle" @click="showFolders = !showFolders">
      文件夹
      <svg
        class="chevron-sm"
        :class="{ expanded: showFolders }"
        width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <template v-if="showFolders">
      <button
        v-for="f in flatFolders"
        :key="f.fullPath"
        class="folder-item"
        :class="{ active: route.query.category === f.fullPath }"
        :style="{ paddingLeft: `calc(var(--space-3) + ${f.depth * 16}px)` }"
        @click="navigateFolder(f.fullPath)"
        @contextmenu.prevent="handleFolderContextMenu($event, f.fullPath)"
      >
        <button
          v-if="f.hasChildren"
          class="folder-chevron"
          @click.stop="toggleFolder(f.fullPath)"
        >
          <svg
            :class="{ expanded: f.expanded }"
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
          >
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </button>
        <svg v-else class="folder-icon-spacer" width="12" height="12" />
        <svg class="folder-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <span class="folder-name">{{ f.name }}</span>
        <span class="folder-count">{{ f.totalCount }}</span>
      </button>
    </template>

    <ContextMenu
      v-model:show="showContextMenu"
      :position="contextMenuPos"
      :items="contextMenuItems"
      @select="handleContextMenuSelect"
    />

    <InputDialog
      :open="showInputDialog"
      :title="inputDialogTitle"
      placeholder="输入子分类名称..."
      @confirm="handleInputConfirm"
      @cancel="showInputDialog = false"
    />
  </template>
</template>

<style scoped>
/* ─── 分区标签 & 分割线（与父组件保持一致） ─── */
.nav-section-label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-tertiary);
  padding: var(--space-2) var(--space-3) var(--space-1);
}

.nav-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-divider) 20%, var(--color-divider) 80%, transparent);
  margin: var(--space-2) var(--space-3);
}

/* ─── 文件夹树 ─── */
.folder-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  cursor: pointer;
  transition: color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .folder-toggle:hover { color: var(--color-text-secondary); }
}

.chevron-sm {
  margin-left: auto;
  transition: transform var(--duration-fast) var(--ease-out);
}

.chevron-sm.expanded { transform: rotate(180deg); }

.folder-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
  text-align: left;
  min-height: 28px;
}

@media (hover: hover) {
  .folder-item:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
}

.folder-item.active {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

.folder-item.folder-drop-target {
  background: var(--color-accent-muted);
  color: var(--color-accent);
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}

.folder-chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  padding: 0;
  flex-shrink: 0;
  color: var(--color-text-tertiary);
  transition: color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .folder-chevron:hover { color: var(--color-text-primary); }
}

.folder-chevron svg {
  transition: transform var(--duration-fast) var(--ease-out);
}

.folder-chevron svg.expanded {
  transform: rotate(90deg);
}

.folder-icon-spacer {
  flex-shrink: 0;
  width: 14px;
}

.folder-icon {
  flex-shrink: 0;
  opacity: 0.6;
}

.folder-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.folder-count {
  font-size: 0.65rem;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}
</style>
