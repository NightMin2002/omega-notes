/**
 * Ω Notes V2 — 设置 Store
 * 管理应用偏好设置，持久化到 localStorage
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { AppSettings, EditorMode, FontFamily } from '@/types'

const STORAGE_KEY = 'omega-settings'

const defaults: AppSettings = {
  defaultEditorMode: 'wysiwyg',
  fontFamily: 'system',
  trashAutoCleanDays: 30,
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

  // ─── Getters ───
  const defaultEditorMode = ref<EditorMode>(settings.value.defaultEditorMode)
  const fontFamily = ref<FontFamily>(settings.value.fontFamily)
  const trashAutoCleanDays = ref<number>(settings.value.trashAutoCleanDays)

  // ─── Actions ───
  function setDefaultEditorMode(mode: EditorMode) {
    defaultEditorMode.value = mode
    settings.value.defaultEditorMode = mode
    persist(settings.value)
  }

  function setFontFamily(family: FontFamily) {
    fontFamily.value = family
    settings.value.fontFamily = family
    applyFont(family)
    persist(settings.value)
  }

  function setTrashAutoCleanDays(days: number) {
    trashAutoCleanDays.value = days
    settings.value.trashAutoCleanDays = days
    persist(settings.value)
  }

  function applyFont(family: FontFamily) {
    document.documentElement.style.setProperty('--font-sans', fontMap[family])
  }

  /** 初始化时应用已保存的字体 */
  function init() {
    applyFont(fontFamily.value)
  }

  return {
    settings,
    defaultEditorMode,
    fontFamily,
    trashAutoCleanDays,
    setDefaultEditorMode,
    setFontFamily,
    setTrashAutoCleanDays,
    init,
  }
})
