import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

const isTauri = !!process.env.TAURI_ENV_PLATFORM

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins = [vue()]

  // Vue DevTools 仅在纯浏览器开发模式下启用
  // Tauri 环境和生产构建完全排除，避免在 popout 小窗注入浮动按钮
  if (mode === 'development' && !isTauri) {
    const vueDevTools = (await import('vite-plugin-vue-devtools')).default
    plugins.push(vueDevTools() as any)
  }

  return {
    plugins,
    define: {
      '__APP_VERSION__': JSON.stringify(pkg.version),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    // Tauri: clearScreen false 避免 Tauri 误判 dev server 退出
    clearScreen: false,
    server: {
      host: '0.0.0.0',
      port: 8080,
      strictPort: true,
    },
  }
})
