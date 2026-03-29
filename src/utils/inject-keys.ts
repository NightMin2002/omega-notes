import type { InjectionKey } from 'vue'

/** 应用内 Toast 通知注入 Key */
export const toastKey: InjectionKey<
  (title: string, body: string, type?: 'info' | 'success' | 'warning', duration?: number) => void
> = Symbol('toast')
