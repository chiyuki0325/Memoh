import { createRouter, createWebHistory } from 'vue-router'
import { i18nRef } from './i18n'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    name: 'Login',
    path: '/login',
    component: () => import('@/pages/login/index.vue')
  }, {
    name: 'Main',
    component: () => import('@/pages/main-section/index.vue'),
    path: '/main',
    redirect: '/main/chat',
    meta: {
      breadcrumb: i18nRef('breadcrumb.main')

    },
    children: [{
      name: 'chat',
      path: 'chat',
      component: () => import('@/pages/chat/index.vue'),
      meta: {
        breadcrumb: i18nRef('sidebar.chat')
      }
    }, {
      name: 'home',
      path: 'home',
      component: () => import('@/pages/home/index.vue'),
      meta: {
        breadcrumb: i18nRef('home.title')
      }
    }, {
      name: 'models',
      path: 'models',
      component: () => import('@/pages/models/index.vue'),
      meta: {
        breadcrumb: i18nRef('sidebar.models')
      }
    }, {
      name: 'settings',
      path: 'settings',
      component: () => import('@/pages/settings/index.vue'),
      meta: {
        breadcrumb: i18nRef('sidebar.settings')
      }
    }, {
      name: 'mcp',
      path: 'mcp',
      component: () => import('@/pages/mcp/index.vue'),
      meta: {
        breadcrumb: 'MCP'
      }
    }, {
      name: 'platform',
      path: 'platform',
      component: () => import('@/pages/platform/index.vue'),
      meta: {
        breadcrumb: i18nRef('sidebar.platform')
      }
    }]
  }

]


const router = createRouter({
  history: createWebHistory(),
  routes,
})
router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  
  if (to.fullPath !== '/login') {
    return token ? true : { name: 'Login' }
  } else {
    return token ? { path:'Main' } : true
  }
})

export default router