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
      path: '/kb-home',
      name: 'kb-home',
      component: () => import('../views/KnowledgeBaseView.vue'),
      meta: { title: '知识库总览' },
    },
    {
      path: '/notes',
      name: 'notes',
      component: () => import('../views/NotesView.vue'),
      meta: { title: '知识库' },
    },
    {
      path: '/explorer/:id?',
      name: 'explorer',
      component: () => import('../views/ExplorerView.vue'),
      meta: { title: '知识库浏览器' },
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
      path: '/tasks',
      name: 'tasks',
      component: () => import('../views/TasksView.vue'),
      meta: { title: '日常管理' },
    },
    {
      path: '/todos',
      name: 'todos',
      component: () => import('../views/TodosView.vue'),
      meta: { title: '待办事项' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
      meta: { title: '设置' },
    },
    /* ─── 悬挂窗口路由（独立窗口渲染，不含侧边栏） ─── */
    {
      path: '/popout/note/:id',
      name: 'popout-note',
      component: () => import('../views/popout/PopoutNote.vue'),
      meta: { popout: true, title: '笔记' },
    },
    {
      path: '/popout/progress',
      name: 'popout-progress',
      component: () => import('../views/popout/PopoutProgress.vue'),
      meta: { popout: true, title: '桌面微件' },
    },
    {
      path: '/popout/progress-panel',
      name: 'popout-progress-panel',
      component: () => import('../views/popout/PopoutProgressPanel.vue'),
      meta: { popout: true, title: '桌面微件面板' },
    },
  ],
})

// 页面标题同步
router.afterEach((to) => {
  const title = to.meta.title as string
  document.title = title ? `${title} — Ω Notes` : 'Ω Notes'
})

export default router
