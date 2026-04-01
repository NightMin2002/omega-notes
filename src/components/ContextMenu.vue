<script setup lang="ts">
/**
 * ContextMenu — 通用右键上下文菜单
 *
 * 用法：
 * <ContextMenu v-model:show="showMenu" :position="menuPos" :items="menuItems" @select="onSelect" />
 */
import { ref, watch, onUnmounted } from 'vue'

export interface ContextMenuItem {
  id: string
  label: string
  icon?: string
  danger?: boolean
  disabled?: boolean
  divider?: boolean
}

const props = defineProps<{
  show: boolean
  position: { x: number; y: number }
  items: ContextMenuItem[]
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  select: [id: string]
}>()

const menuRef = ref<HTMLDivElement | null>(null)

function close() {
  emit('update:show', false)
}

function handleSelect(item: ContextMenuItem) {
  if (item.disabled || item.divider) return
  emit('select', item.id)
  close()
}

function handleClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    close()
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

watch(() => props.show, (val) => {
  if (val) {
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true)
      document.addEventListener('keydown', handleKeydown, true)
    }, 0)
  } else {
    document.removeEventListener('click', handleClickOutside, true)
    document.removeEventListener('keydown', handleKeydown, true)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true)
  document.removeEventListener('keydown', handleKeydown, true)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="ctx-menu">
      <div
        v-if="show"
        ref="menuRef"
        class="context-menu"
        :style="{ left: position.x + 'px', top: position.y + 'px' }"
      >
        <template v-for="item in items" :key="item.id">
          <div v-if="item.divider" class="ctx-divider" />
          <button
            v-else
            class="ctx-item"
            :class="{ danger: item.danger, disabled: item.disabled }"
            :disabled="item.disabled"
            @click="handleSelect(item)"
          >
            <span class="ctx-label">{{ item.label }}</span>
          </button>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.context-menu {
  position: fixed;
  z-index: var(--z-modal, 1000);
  min-width: 160px;
  padding: var(--space-1);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.ctx-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-align: left;
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}

@media (hover: hover) {
  .ctx-item:hover:not(:disabled) {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }
  .ctx-item.danger:hover:not(:disabled) {
    background: var(--color-danger-muted);
    color: var(--color-danger);
  }
}

.ctx-item:active:not(:disabled) {
  transform: scale(0.97);
}

.ctx-item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-accent-muted);
}

.ctx-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ctx-item.danger {
  color: var(--color-danger);
}

.ctx-divider {
  height: 1px;
  margin: var(--space-1) var(--space-2);
  background: var(--color-divider);
}

.ctx-label {
  flex: 1;
}

/* Transition */
.ctx-menu-enter-active {
  transition: opacity 120ms var(--ease-out), transform 120ms var(--ease-out);
}
.ctx-menu-leave-active {
  transition: opacity 80ms var(--ease-out), transform 80ms var(--ease-out);
}
.ctx-menu-enter-from {
  opacity: 0;
  transform: scale(0.92);
}
.ctx-menu-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
