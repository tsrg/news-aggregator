import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'Login', component: () => import('../views/Login.vue'), meta: { public: true } },
    { path: '/', redirect: '/news' },
    { path: '/news', name: 'NewsList', component: () => import('../views/news/NewsList.vue') },
    { path: '/news/new', name: 'NewsNew', component: () => import('../views/news/NewsEdit.vue') },
    { path: '/news/:id', name: 'NewsEdit', component: () => import('../views/news/NewsEdit.vue'), props: true },
    { path: '/sources', name: 'Sources', component: () => import('../views/Sources.vue'), meta: { admin: true } },
    { path: '/sections', name: 'Sections', component: () => import('../views/Sections.vue'), meta: { admin: true } },
    { path: '/menus', name: 'Menus', component: () => import('../views/Menus.vue'), meta: { admin: true } },
    { path: '/menus/new', name: 'MenuNew', component: () => import('../views/MenuEdit.vue'), meta: { admin: true } },
    { path: '/menus/:id', name: 'MenuEdit', component: () => import('../views/MenuEdit.vue'), props: true, meta: { admin: true } },
    { path: '/pages', name: 'Pages', component: () => import('../views/Pages.vue'), meta: { admin: true } },
    { path: '/pages/new', name: 'PageNew', component: () => import('../views/PageEdit.vue'), meta: { admin: true } },
    { path: '/pages/:id', name: 'PageEdit', component: () => import('../views/PageEdit.vue'), props: true, meta: { admin: true } },
  ],
});

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();
  if (to.meta.public) {
    if (auth.token && auth.user && to.name === 'Login') return next('/');
    return next();
  }
  if (!auth.token || !auth.user) return next('/login');
  if (to.meta.admin && auth.user.role !== 'ADMIN') return next('/news');
  next();
});

export default router;
