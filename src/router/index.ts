/**
 * Ω Notes V2 — 路由配置
 */
import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: { title: '主页' },
    },
    {
      path: '/notes',
      name: 'notes',
      component: () => import('../views/NotesView.vue'),
      meta: { title: '知识库' },
    },
    {
      path: '/note/:id',
      name: 'note-detail',
      component: () => import('../views/NoteDetailView.vue'),
      meta: { title: '笔记' },
    },
    {
      path: '/write',
      name: 'write',
      component: () => import('../views/WriteView.vue'),
      meta: { title: '新建笔记' },
    },
    {
      path: '/trash',
      name: 'trash',
      component: () => import('../views/TrashView.vue'),
      meta: { title: '回收站' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
      meta: { title: '设置' },
    },
  ],
})

// 页面标题同步
router.afterEach((to) => {
  const title = to.meta.title as string
  document.title = title ? `${title} — Ω Notes` : 'Ω Notes'
})

export default router
