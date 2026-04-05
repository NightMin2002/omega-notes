/**
 * Ω Notes V2 — 设置 Store
 * 管理应用偏好设置，持久化到 localStorage
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AppSettings, EditorMode, FontFamily, CustomTemplate } from '@/types'

const STORAGE_KEY = 'omega-settings'

const defaults: AppSettings = {
  defaultEditorMode: 'wysiwyg',
  fontFamily: 'system',
  trashAutoCleanDays: 30,
  contentZoom: 100,
  customTemplates: [],
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return { ...defaults, ...JSON.parse(raw) }
    }
  } catch { /* 忽略 */ }
  return { ...defaults }
}

function persist(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

/** 字体映射表 */
const fontMap: Record<FontFamily, string> = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  inter: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  'noto-sans-sc': '"Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>(loadSettings())

  // ─── Computed Getters（单一状态源） ───
  const defaultEditorMode = computed(() => settings.value.defaultEditorMode)
  const fontFamily = computed(() => settings.value.fontFamily)
  const trashAutoCleanDays = computed(() => settings.value.trashAutoCleanDays)
  const contentZoom = computed(() => settings.value.contentZoom)
  const customTemplates = computed(() => settings.value.customTemplates)

  // ─── Actions ───
  function setDefaultEditorMode(mode: EditorMode) {
    settings.value.defaultEditorMode = mode
    persist(settings.value)
  }

  function setFontFamily(family: FontFamily) {
    settings.value.fontFamily = family
    applyFont(family)
    persist(settings.value)
  }

  function setTrashAutoCleanDays(days: number) {
    settings.value.trashAutoCleanDays = days
    persist(settings.value)
  }

  function setContentZoom(zoom: number) {
    settings.value.contentZoom = Math.max(80, Math.min(150, zoom))
    applyZoom(settings.value.contentZoom)
    persist(settings.value)
  }

  function applyZoom(zoom: number) {
    document.documentElement.style.setProperty('--content-zoom', String(zoom / 100))
  }

  function applyFont(family: FontFamily) {
    document.documentElement.style.setProperty('--font-sans', fontMap[family])
  }

  // ─── 自定义模板 CRUD ───
  function addCustomTemplate(tpl: Omit<CustomTemplate, 'id' | 'createdAt'>) {
    const newTpl: CustomTemplate = {
      ...tpl,
      id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    }
    settings.value.customTemplates.push(newTpl)
    persist(settings.value)
    return newTpl
  }

  function updateCustomTemplate(id: string, patch: Partial<Omit<CustomTemplate, 'id' | 'createdAt'>>) {
    const tplList = settings.value.customTemplates
    const idx = tplList.findIndex(t => t.id === id)
    if (idx !== -1) {
      const target = tplList[idx]!
      Object.assign(target, patch)
      persist(settings.value)
    }
  }

  function removeCustomTemplate(id: string) {
    settings.value.customTemplates = settings.value.customTemplates.filter(t => t.id !== id)
    persist(settings.value)
  }

  /** 初始化时应用已保存的字体和缩放 */
  function init() {
    applyFont(settings.value.fontFamily)
    applyZoom(settings.value.contentZoom)
  }

  return {
    settings,
    defaultEditorMode,
    fontFamily,
    trashAutoCleanDays,
    contentZoom,
    customTemplates,
    setDefaultEditorMode,
    setFontFamily,
    setTrashAutoCleanDays,
    setContentZoom,
    addCustomTemplate,
    updateCustomTemplate,
    removeCustomTemplate,
    init,
  }
})
