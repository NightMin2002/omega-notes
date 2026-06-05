/**
 * Ω Notes V2 — 路由配置
 */
import { createRouter, createWebHashHistory } from 'vue-router'
import {
  isMobileRoutePath,
  shouldAutoUseMobileMode,
  toMobilePath,
} from '../composables/useAppMode'

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
    /* ─── 移动端模式路由（独立页面结构，复用数据层） ─── */
    {
      path: '/m',
      redirect: '/m/notes',
    },
    {
      path: '/m/notes',
      name: 'mobile-notes',
      component: () => import('../mobile/views/MobileNotesView.vue'),
      meta: { mobile: true, title: '笔记' },
    },
    {
      path: '/m/note/:id',
      name: 'mobile-note-detail',
      component: () => import('../mobile/views/MobileNoteDetailView.vue'),
      meta: { mobile: true, mobilePageHeader: true, title: '笔记' },
    },
    {
      path: '/m/write/:id?',
      name: 'mobile-write',
      component: () => import('../mobile/views/MobileWriteView.vue'),
      meta: { mobile: true, mobilePageHeader: true, mobileHideNav: true, title: '编辑笔记' },
    },
    {
      path: '/m/trash',
      name: 'mobile-trash',
      component: () => import('../mobile/views/MobileTrashView.vue'),
      meta: { mobile: true, title: '回收站' },
    },
    {
      path: '/m/settings',
      name: 'mobile-settings',
      component: () => import('../mobile/views/MobileSettingsView.vue'),
      meta: { mobile: true, title: '设置' },
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

router.beforeEach((to) => {
  if (to.meta.popout || isMobileRoutePath(to.path)) return true
  if (!shouldAutoUseMobileMode()) return true

  return {
    path: toMobilePath(to.path),
    query: to.query,
    hash: to.hash,
    replace: true,
  }
})

// 页面标题同步
router.afterEach((to) => {
  const title = to.meta.title as string
  document.title = title ? `${title} — Ω Notes` : 'Ω Notes'
})

export default router
