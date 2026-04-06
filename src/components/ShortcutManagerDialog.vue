<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useShortcutsStore } from '@/stores/shortcuts'
import { useAppShortcuts } from '@/composables/useAppShortcuts'
import { registerGlobalShortcuts } from '@/utils/shortcuts'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const store = useShortcutsStore()
const { parseEventToKeys, formatKeysForDisplay } = useAppShortcuts()
const router = useRouter()

const recordingId = ref<string | null>(null)

// 基础固定只读快捷键（作为用户指引）
const fixedShortcuts = [
  { name: '关闭弹窗 / 取消聚焦', keys: ['ESC'] },
  { name: '列表或菜单导航', keys: ['↑', '↓', 'Enter'] },
  { name: '文本加粗 (编辑模式)', keys: ['Ctrl', 'B'] },
  { name: '文本斜体 (编辑模式)', keys: ['Ctrl', 'I'] }
]

function startRecord(id: string) {
  recordingId.value = id
}

function cancelRecord() {
  recordingId.value = null
}

async function handleRecord(e: KeyboardEvent, id: string) {
  if (e.key === 'Escape') {
    cancelRecord()
    return
  }
  
  // 忽略仅按下修饰键
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
    return
  }

  const keys = parseEventToKeys(e)
  if (keys.length > 0) {
    store.updateShortcut(id, keys)
    await syncGlobals(id)
    cancelRecord()
  }
}

async function syncGlobals(id?: string) {
  if (!id || store.getShortcut(id)?.isGlobal) {
    await registerGlobalShortcuts(router)
  }
}

async function handleToggle(id: string) {
  store.toggleShortcut(id)
  await syncGlobals(id)
}

async function handleReset(id: string) {
  store.resetToDefault(id)
  await syncGlobals(id)
}

async function handleResetAll() {
  store.resetAll()
  await syncGlobals()
}

// 阻止默认事件继续冒泡
function handleDialogKeydown(e: KeyboardEvent) {
  if (recordingId.value) {
    // 正在录制时阻止触发默认（例如避免触发搜索等）
    e.stopPropagation()
    e.preventDefault()
    return
  }
  if (e.key === 'Escape') {
    emit('close')
  }
}
</script>

<template>
  <dialog
    :open="open"
    class="shortcut-dialog-backdrop"
    @click.self="emit('close')"
    @keydown="handleDialogKeydown"
  >
    <div class="shortcut-dialog">
      <!-- 头部 -->
      <div class="dialog-header">
        <h3 class="dialog-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M6 8h.001" /><path d="M10 8h.001" /><path d="M14 8h.001" /><path d="M18 8h.001" />
            <path d="M6 12h.001" /><path d="M18 12h.001" />
            <path d="M8 16h8" />
          </svg>
          自定义快捷键
        </h3>
        <button class="dialog-close" @click="emit('close')" title="关闭">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <!-- 内容区 -->
      <div class="dialog-content">
        <!-- 全局快捷键 -->
        <section class="shortcut-section" v-if="store.globalShortcuts.length > 0">
          <h4 class="section-title">系统级快捷键 (后台可唤起)</h4>
          <div class="shortcut-list">
            <div
              v-for="item in store.globalShortcuts"
              :key="item.id"
              class="shortcut-item"
              :class="{ disabled: !item.enabled }"
            >
              <div class="item-info">
                <span class="item-name">{{ item.name }}</span>
                <span class="item-desc">{{ item.description }}</span>
              </div>
              <div class="item-actions">
                <div
                  class="key-recorder"
                  :class="{ recording: recordingId === item.id }"
                  tabindex="0"
                  @click="startRecord(item.id)"
                  @blur="cancelRecord"
                  @keydown.prevent.stop="handleRecord($event, item.id)"
                  :title="recordingId === item.id ? '请按下组合键...' : '点击修改快捷键'"
                >
                  {{ recordingId === item.id ? '请按键...' : formatKeysForDisplay(item.currentKeys) }}
                </div>
                <!-- 恢复默认 -->
                <button
                  class="action-btn icon-btn"
                  @click="handleReset(item.id)"
                  title="恢复默认"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </button>
                <!-- 开关 -->
                <button
                  class="switch-btn"
                  :class="{ active: item.enabled }"
                  @click="handleToggle(item.id)"
                  title="启用/禁用"
                >
                  <span class="switch-thumb"></span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- 应用内快捷键 -->
        <section class="shortcut-section">
          <h4 class="section-title">应用内快捷键</h4>
          <div class="shortcut-list">
            <div
              v-for="item in store.appShortcuts"
              :key="item.id"
              class="shortcut-item"
              :class="{ disabled: !item.enabled }"
            >
              <div class="item-info">
                <span class="item-name">{{ item.name }}</span>
                <span class="item-desc">{{ item.description }}</span>
              </div>
              <div class="item-actions">
                <div
                  class="key-recorder"
                  :class="{ recording: recordingId === item.id }"
                  tabindex="0"
                  @click="startRecord(item.id)"
                  @blur="cancelRecord"
                  @keydown.prevent.stop="handleRecord($event, item.id)"
                  :title="recordingId === item.id ? '请按下组合键...' : '点击修改快捷键'"
                >
                  {{ recordingId === item.id ? '请按键...' : formatKeysForDisplay(item.currentKeys) }}
                </div>
                <!-- 恢复默认 -->
                <button
                  class="action-btn icon-btn"
                  @click="handleReset(item.id)"
                  title="恢复默认"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </button>
                <!-- 开关 -->
                <button
                  class="switch-btn"
                  :class="{ active: item.enabled }"
                  @click="handleToggle(item.id)"
                >
                  <span class="switch-thumb"></span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- 固定指引快捷键 (不可修改) -->
        <section class="shortcut-section fixed-section">
          <h4 class="section-title">默认通用快捷键 (全系统固定规则)</h4>
          <div class="shortcut-list">
            <div
              v-for="(item, idx) in fixedShortcuts"
              :key="'fixed-' + idx"
              class="shortcut-item fixed-item"
            >
              <div class="item-info">
                <span class="item-name">{{ item.name }}</span>
              </div>
              <div class="item-actions">
                <div class="fixed-keys">
                  <kbd v-for="k in item.keys" :key="k" class="fixed-kbd">{{ k }}</kbd>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- 底部 -->
      <div class="dialog-footer">
        <button class="reset-all-btn" @click="handleResetAll">
          一键恢复所有默认
        </button>
        <button class="confirm-btn" @click="emit('close')">
          完成
        </button>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
/* ─── 弹窗基础容器 ─── */
.shortcut-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  border: none;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
}

.shortcut-dialog-backdrop:not([open]) {
  display: none;
}

.shortcut-dialog {
  width: 640px;
  max-width: 90vw;
  max-height: 85vh;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  animation: dialog-in var(--duration-normal) var(--ease-out);
}

@keyframes dialog-in {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
}

/* ─── 头部 ─── */
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  border-bottom: 1px solid var(--color-border);
}

.dialog-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.dialog-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  color: var(--color-text-tertiary);
  background: transparent;
  border: none;
  cursor: pointer;
  appearance: none;
  margin-right: -8px;
  transition: all var(--duration-fast) var(--ease-out);
}

.dialog-close:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

/* ─── 内容区 ─── */
.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 32px 32px 32px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  /* 自定义滚动条 */
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}
.dialog-content::-webkit-scrollbar { width: 6px; }
.dialog-content::-webkit-scrollbar-track { background: transparent; }
.dialog-content::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: var(--radius-full);
}

.section-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: var(--space-4);
}

.shortcut-section:first-child .section-title {
  margin-top: 0;
}

.shortcut-list {
  display: flex;
  flex-direction: column;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: transparent;
  border-bottom: 1px solid var(--color-border);
  transition: background-color var(--duration-fast) var(--ease-out);
}

.shortcut-item:last-child {
  border-bottom: none;
}

@media (hover: hover) {
  .shortcut-item:not(.fixed-item):hover {
    background: var(--color-bg-secondary);
  }
}

.shortcut-item.disabled {
  opacity: 0.5;
}
.shortcut-item.disabled:hover {
  opacity: 0.7;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.item-desc {
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
}

/* ─── 交互区 ─── */
.item-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.key-recorder {
  min-width: 120px;
  text-align: center;
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  user-select: none;
  transition: all var(--duration-fast) var(--ease-out);
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
}

.key-recorder:hover {
  border-color: var(--color-accent);
  color: var(--color-text-primary);
  background: var(--color-bg-secondary);
}

.key-recorder.recording {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: var(--color-bg-primary);
  box-shadow: inset 0 0 0 1px var(--color-accent), 0 0 0 4px color-mix(in oklch, var(--color-accent) 15%, transparent);
  animation: pulse-recording 1.5s infinite;
}

@keyframes pulse-recording {
  0% { box-shadow: inset 0 0 0 1px var(--color-accent), 0 0 0 2px color-mix(in oklch, var(--color-accent) 30%, transparent); }
  50% { box-shadow: inset 0 0 0 1px var(--color-accent), 0 0 0 6px color-mix(in oklch, var(--color-accent) 5%, transparent); }
  100% { box-shadow: inset 0 0 0 1px var(--color-accent), 0 0 0 2px color-mix(in oklch, var(--color-accent) 30%, transparent); }
}

/* 带有背景的灰阶块，专门用于不可修改的设置 */
.fixed-section .shortcut-list {
  background: color-mix(in oklch, var(--color-bg-secondary) 50%, transparent);
}
.fixed-item {
  background: transparent;
}
.fixed-item .item-name {
  color: var(--color-text-primary);
  font-weight: 500;
}
.fixed-keys {
  display: flex;
  align-items: center;
  gap: 6px;
}
.fixed-kbd {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  background: var(--color-bg-primary);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  color: var(--color-text-tertiary);
  background: transparent;
  border: none;
  cursor: pointer;
  appearance: none;
  transition: all var(--duration-fast) var(--ease-out);
}

.icon-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-hover);
}

/* ─── 苹果风格 Switch 开关 ─── */
.switch-btn {
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 20px;
  background: var(--color-border-hover);
  border: none;
  cursor: pointer;
  appearance: none;
  transition: background var(--duration-fast) var(--ease-out);
}

.switch-btn.active {
  background: var(--color-accent);
}

.switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  transition: transform var(--duration-fast) var(--ease-out);
}

.switch-btn.active .switch-thumb {
  transform: translateX(18px);
}

/* ─── 底部 ─── */
.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

.reset-all-btn {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-danger);
  background: transparent;
  border: none;
  padding: 8px 12px;
  margin-left: -12px; /* 视觉对齐左边缘 */
  border-radius: var(--radius-md);
  cursor: pointer;
  appearance: none;
  transition: background var(--duration-fast) var(--ease-out);
}

.reset-all-btn:hover {
  background: color-mix(in oklch, var(--color-danger) 15%, transparent);
}

.confirm-btn {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border: 1px solid var(--color-accent);
  padding: 8px 24px;
  border-radius: var(--radius-md);
  cursor: pointer;
  appearance: none;
  transition: all var(--duration-fast) var(--ease-out);
}

.confirm-btn:hover {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px color-mix(in oklch, var(--color-accent) 20%, transparent);
}
.confirm-btn:active {
  transform: scale(0.97);
}
</style>
