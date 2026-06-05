import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { isTauri } from '../utils/storage'

export const MOBILE_ROUTE_PREFIX = '/m'
const MODE_OVERRIDE_KEY = 'omega-app-mode-override'
type AppModeOverride = 'desktop' | 'mobile'

export function isMobileRoutePath(path: string) {
  return path === MOBILE_ROUTE_PREFIX || path.startsWith(`${MOBILE_ROUTE_PREFIX}/`)
}

export function isPopoutRoutePath(path: string) {
  return path.startsWith('/popout/')
}

export function isMobileViewport() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 820px)').matches ||
    window.matchMedia('(pointer: coarse) and (max-width: 1024px)').matches
}

export function shouldAutoUseMobileMode() {
  if (typeof window === 'undefined') return false
  if (isTauri()) return false
  if (getAppModeOverride() === 'desktop') return false
  return isMobileViewport()
}

export function getAppModeOverride(): AppModeOverride | null {
  if (typeof window === 'undefined') return null
  const value = window.sessionStorage.getItem(MODE_OVERRIDE_KEY)
  return value === 'desktop' || value === 'mobile' ? value : null
}

export function setAppModeOverride(mode: AppModeOverride) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(MODE_OVERRIDE_KEY, mode)
}

export function toMobilePath(path: string) {
  if (isMobileRoutePath(path) || isPopoutRoutePath(path)) return path

  if (path === '/' || path === '/notes' || path === '/kb-home' || path.startsWith('/explorer')) {
    return '/m/notes'
  }

  if (path.startsWith('/note/')) {
    return path.replace(/^\/note/, '/m/note')
  }

  if (path === '/write') return '/m/write'
  if (path === '/trash') return '/m/trash'
  if (path === '/settings') return '/m/settings'

  return '/m/notes'
}

export function toDesktopPath(path: string) {
  if (!isMobileRoutePath(path)) return path

  if (path === '/m' || path === '/m/notes') return '/notes'
  if (path.startsWith('/m/note/')) return path.replace(/^\/m\/note/, '/note')
  if (path === '/m/write') return '/write'
  if (path === '/m/trash') return '/trash'
  if (path === '/m/settings') return '/settings'

  return '/notes'
}

export function useAppMode() {
  const route = useRoute()
  const isMobileMode = computed(() => !!route.meta.mobile || isMobileRoutePath(route.path))
  const isPopoutMode = computed(() => !!route.meta.popout)

  return {
    isMobileMode,
    isPopoutMode,
  }
}
