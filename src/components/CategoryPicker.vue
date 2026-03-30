<script setup lang="ts">
/**
 * CategoryPicker — 自定义分类选择器
 * 替代原生 <input> + <datalist>，支持搜索、创建、子分类提示
 */
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useNotesStore } from '../stores/notes'

const model = defineModel<string>({ default: '' })

const notesStore = useNotesStore()
const inputRef = ref<HTMLInputElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
const wrapperRef = ref<HTMLElement | null>(null)

const isOpen = ref(false)
const searchText = ref('')
const highlightIndex = ref(-1)

/** 所有分类（来自 store） */
const allCategories = computed(() => notesStore.categories)

/** 过滤后的分类列表 */
const filteredCategories = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  if (!q) return allCategories.value
  return allCategories.value.filter(c => c.toLowerCase().includes(q))
})

/** 判断输入是否为新分类 */
const isNewCategory = computed(() => {
  const q = searchText.value.trim()
  if (!q) return false
  return !allCategories.value.some(c => c.toLowerCase() === q.toLowerCase())
})

function openDropdown() {
  isOpen.value = true
  highlightIndex.value = -1
  searchText.value = model.value || ''
}

function closeDropdown() {
  isOpen.value = false
  highlightIndex.value = -1
}

function selectCategory(cat: string) {
  model.value = cat
  searchText.value = cat
  closeDropdown()
}

function confirmInput() {
  const val = searchText.value.trim()
  if (val) {
    model.value = val
  }
  closeDropdown()
}

function handleFocus() {
  openDropdown()
}

function handleInput() {
  if (!isOpen.value) isOpen.value = true
  highlightIndex.value = -1
}

function handleKeydown(e: KeyboardEvent) {
  if (!isOpen.value) {
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault()
      openDropdown()
    }
    return
  }

  const maxIdx = filteredCategories.value.length - 1 + (isNewCategory.value ? 1 : 0)

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      highlightIndex.value = Math.min(highlightIndex.value + 1, maxIdx)
      scrollToHighlighted()
      break
    case 'ArrowUp':
      e.preventDefault()
      highlightIndex.value = Math.max(highlightIndex.value - 1, -1)
      scrollToHighlighted()
      break
    case 'Enter':
      e.preventDefault()
      if (highlightIndex.value >= 0 && highlightIndex.value < filteredCategories.value.length) {
        selectCategory(filteredCategories.value[highlightIndex.value]!)
      } else {
        confirmInput()
      }
      break
    case 'Escape':
      e.preventDefault()
      closeDropdown()
      break
  }
}

function scrollToHighlighted() {
  nextTick(() => {
    const el = listRef.value?.querySelector('.highlighted')
    if (el) el.scrollIntoView({ block: 'nearest' })
  })
}

/** 点击外部关闭 */
function handleClickOutside(e: MouseEvent) {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    if (isOpen.value) confirmInput()
  }
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside))

watch(model, (val) => {
  if (!isOpen.value) searchText.value = val
})
</script>

<template>
  <div ref="wrapperRef" class="cat-picker-wrapper">
    <div class="cat-input-row">
      <svg class="cat-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
      <input
        ref="inputRef"
        v-model="searchText"
        type="text"
        class="cat-input"
        placeholder="选择或输入分类…"
        autocomplete="off"
        spellcheck="false"
        @focus="handleFocus"
        @input="handleInput"
        @keydown="handleKeydown"
      >
      <button class="cat-toggle" tabindex="-1" @mousedown.prevent="isOpen ? closeDropdown() : openDropdown()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{ rotated: isOpen }">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>

    <!-- 子分类提示 -->
    <p class="cat-hint">💡 使用 <code>/</code> 创建子分类，如 <code>工作/项目A</code></p>

    <!-- 下拉列表 -->
    <Transition name="dropdown">
      <div v-if="isOpen" ref="listRef" class="cat-dropdown">
        <div v-if="filteredCategories.length === 0 && !isNewCategory" class="cat-empty">
          暂无分类
        </div>

        <button
          v-for="(cat, i) in filteredCategories"
          :key="cat"
          class="cat-option"
          :class="{
            highlighted: i === highlightIndex,
            selected: cat === model,
          }"
          @mousedown.prevent="selectCategory(cat)"
          @mouseenter="highlightIndex = i"
        >
          <span class="cat-option-name">
            <template v-if="cat.includes('/')">
              <span class="cat-parent">{{ cat.split('/').slice(0, -1).join('/') }}/</span>{{ cat.split('/').pop() }}
            </template>
            <template v-else>{{ cat }}</template>
          </span>
          <svg v-if="cat === model" class="cat-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>

        <!-- 新建分类选项 -->
        <button
          v-if="isNewCategory"
          class="cat-option cat-new"
          :class="{ highlighted: highlightIndex === filteredCategories.length }"
          @mousedown.prevent="confirmInput()"
          @mouseenter="highlightIndex = filteredCategories.length"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>创建「<strong>{{ searchText.trim() }}</strong>」</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.cat-picker-wrapper {
  position: relative;
}

.cat-input-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0 var(--space-3);
  transition: border-color var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
}

.cat-input-row:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-muted);
}

@media (hover: hover) {
  .cat-input-row:hover:not(:focus-within) {
    border-color: var(--color-border-strong);
  }
}

.cat-icon {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.cat-input {
  flex: 1;
  background: transparent;
  border: none;
  padding: var(--space-2) 0;
  font-size: 0.85rem;
  color: var(--color-text-primary);
  outline: none;
  min-width: 0;
}

.cat-input::placeholder {
  color: var(--color-text-tertiary);
}

/* Override global input focus styles */
.cat-input:focus {
  border-color: transparent;
  box-shadow: none;
  background: transparent;
}

.cat-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  transition: color var(--duration-fast) var(--ease-out),
              background-color var(--duration-fast) var(--ease-out);
}

.cat-toggle svg {
  transition: transform var(--duration-fast) var(--ease-out);
}

.cat-toggle svg.rotated {
  transform: rotate(180deg);
}

@media (hover: hover) {
  .cat-toggle:hover {
    color: var(--color-text-primary);
    background: var(--color-bg-hover);
  }
}

.cat-hint {
  margin-top: var(--space-1);
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
  line-height: 1.4;
}

.cat-hint code {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  padding: 0 3px;
  background: var(--color-bg-tertiary);
  border-radius: 3px;
  color: var(--color-accent-text);
}

/* ─── Dropdown ─── */
.cat-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: var(--z-dropdown, 100);
  max-height: 220px;
  overflow-y: auto;
  background: var(--color-bg-elevated, var(--color-bg-primary));
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  padding: var(--space-1);
}

/* Custom scrollbar */
.cat-dropdown::-webkit-scrollbar { width: 4px; }
.cat-dropdown::-webkit-scrollbar-track { background: transparent; }
.cat-dropdown::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: var(--radius-full);
}

.cat-empty {
  padding: var(--space-3);
  text-align: center;
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
}

.cat-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
  text-align: left;
}

.cat-option.highlighted {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.cat-option.selected {
  color: var(--color-accent);
  font-weight: 500;
}

.cat-option-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cat-parent {
  color: var(--color-text-tertiary);
  font-size: 0.8em;
}

.cat-check {
  color: var(--color-accent);
  flex-shrink: 0;
}

.cat-new {
  gap: var(--space-2);
  color: var(--color-accent);
  border-top: 1px solid var(--color-border);
  margin-top: var(--space-1);
  padding-top: var(--space-2);
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
}

.cat-new strong {
  font-weight: 600;
}

/* ─── Transition ─── */
.dropdown-enter-active {
  transition: opacity 0.15s var(--ease-out), transform 0.15s var(--ease-out);
}
.dropdown-leave-active {
  transition: opacity 0.1s var(--ease-out), transform 0.1s var(--ease-out);
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .dropdown-enter-active,
  .dropdown-leave-active {
    transition: none;
  }
}
</style>
