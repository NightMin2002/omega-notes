<script setup lang="ts">
/**
 * CategoryPicker — 自定义分类选择器
 * 替代原生 <input> + <datalist>，支持搜索、创建、子分类提示
 *
 * Bug #2 fix: 使用 Teleport to="body" + position:fixed 避免被父容器 overflow 裁剪
 */
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useNotesStore } from '../stores/notes'

const model = defineModel<string>({ default: '' })

const notesStore = useNotesStore()
const inputRef = ref<HTMLInputElement | null>(null)
const inputRowRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const wrapperRef = ref<HTMLElement | null>(null)

const isOpen = ref(false)
const searchText = ref(model.value || '')
const highlightIndex = ref(-1)

/* 面板定位坐标 */
const panelStyle = ref({ top: '0px', left: '0px', width: '300px' })

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

/** 查找真正的滚动祖先容器（如 .app-main） */
function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  let parent = el?.parentElement || null
  while (parent) {
    const style = getComputedStyle(parent)
    if (/(auto|scroll)/.test(style.overflowY)) return parent
    parent = parent.parentElement
  }
  return null
}

let _scrollParent: HTMLElement | null = null

/** 计算下拉面板位置（fixed 定位，锚定到输入行的视口坐标） */
function calcPosition() {
  const anchor = inputRowRef.value || wrapperRef.value
  if (!anchor) return
  const rect = anchor.getBoundingClientRect()
  const panelH = panelRef.value?.offsetHeight || 240
  const spaceBelow = window.innerHeight - rect.bottom
  const top = spaceBelow >= panelH + 8
    ? rect.bottom + 4
    : rect.top - panelH - 4
  panelStyle.value = {
    top: `${Math.max(4, top)}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  }
}

/** 滚动/窗口变化时持续更新位置 */
function onScrollOrResize() {
  if (isOpen.value) calcPosition()
}

function bindScrollListeners() {
  _scrollParent = getScrollParent(wrapperRef.value)
  if (_scrollParent) _scrollParent.addEventListener('scroll', onScrollOrResize)
  window.addEventListener('scroll', onScrollOrResize)
  window.addEventListener('resize', onScrollOrResize)
}

function unbindScrollListeners() {
  if (_scrollParent) _scrollParent.removeEventListener('scroll', onScrollOrResize)
  _scrollParent = null
  window.removeEventListener('scroll', onScrollOrResize)
  window.removeEventListener('resize', onScrollOrResize)
}

async function openDropdown() {
  isOpen.value = true
  highlightIndex.value = -1
  searchText.value = ''
  await nextTick()
  calcPosition()
  await nextTick()
  calcPosition()
  /* 滚动到当前选中项 */
  if (model.value && panelRef.value) {
    const selected = panelRef.value.querySelector('.selected')
    if (selected) selected.scrollIntoView({ block: 'nearest' })
  }
  bindScrollListeners()
}

function closeDropdown() {
  isOpen.value = false
  highlightIndex.value = -1
  unbindScrollListeners()
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
    searchText.value = val
    /* 如果是新分类，立即注册到 store 使其在分类列表中可见 */
    if (!allCategories.value.some(c => c.toLowerCase() === val.toLowerCase())) {
      notesStore.addCustomCategory(val)
    }
  }
  closeDropdown()
}

function handleFocus() {
  openDropdown()
}

function handleInput() {
  if (!isOpen.value) {
    isOpen.value = true
    bindScrollListeners()
  }
  highlightIndex.value = -1
  /* 过滤结果变化 → DOM 更新 → 面板高度变化 → 需要重新定位 */
  nextTick(() => {
    calcPosition()
    nextTick(() => calcPosition())
  })
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
    const el = panelRef.value?.querySelector('.highlighted')
    if (el) el.scrollIntoView({ block: 'nearest' })
  })
}

/** 点击外部关闭（兼容 Teleport 后的 panelRef） */
function handleClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (wrapperRef.value?.contains(target)) return
  if (panelRef.value?.contains(target)) return
  if (isOpen.value) confirmInput()
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  unbindScrollListeners()
})

/* Bug #9 fix: immediate: true 确保组件挂载时 searchText 就与 model 同步 */
watch(model, (val) => {
  if (!isOpen.value) searchText.value = val
}, { immediate: true })
</script>

<template>
  <div ref="wrapperRef" class="cat-picker-wrapper">
    <div ref="inputRowRef" class="cat-input-row">
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
      <button type="button" class="cat-toggle" tabindex="-1" @mousedown.prevent="isOpen ? closeDropdown() : openDropdown()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{ rotated: isOpen }">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>

    <!-- 子分类提示 -->
    <p class="cat-hint">💡 使用 <code>/</code> 创建子分类，如 <code>工作/项目A</code></p>

    <!-- 下拉列表 — Teleport 到 body 避免被父容器 overflow 裁剪 -->
    <Teleport to="body">
      <Transition name="cat-dropdown-anim">
        <div
          v-if="isOpen"
          ref="panelRef"
          class="cat-dropdown"
          :style="panelStyle"
        >
          <div v-if="filteredCategories.length === 0 && !isNewCategory" class="cat-empty">
            暂无分类
          </div>

          <button
            type="button"
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
            type="button"
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
    </Teleport>
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
</style>

<!-- 全局样式：Teleport 到 body 的元素不能用 scoped -->
<style>
/* ─── Dropdown (Teleport 到 body) ─── */
.cat-dropdown {
  position: fixed;
  z-index: var(--z-dropdown-top, 10000);
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
.cat-dropdown-anim-enter-active {
  transition: opacity 0.15s var(--ease-out), transform 0.15s var(--ease-out);
}
.cat-dropdown-anim-leave-active {
  transition: opacity 0.1s var(--ease-out), transform 0.1s var(--ease-out);
}
.cat-dropdown-anim-enter-from,
.cat-dropdown-anim-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .cat-dropdown-anim-enter-active,
  .cat-dropdown-anim-leave-active {
    transition: none;
  }
}
</style>
