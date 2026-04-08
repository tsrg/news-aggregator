import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'Login', component: () => import('../views/Login.vue'), meta: { public: true } },
    { path: '/', redirect: '/news' },
    { path: '/users', redirect: '/settings/users' },
    { path: '/users/new', redirect: '/settings/users/new' },
    { path: '/users/:id', redirect: (to) => `/settings/users/${to.params.id}` },
    { path: '/roles', redirect: '/settings/roles' },
    { path: '/roles/new', redirect: '/settings/roles/new' },
    { path: '/roles/:id', redirect: (to) => `/settings/roles/${to.params.id}` },
    { path: '/news', name: 'NewsList', component: () => import('../views/news/NewsList.vue'), meta: { permission: 'news' } },
    { path: '/news/new', name: 'NewsNew', component: () => import('../views/news/NewsEdit.vue'), meta: { permission: 'news' } },
    { path: '/news/:id', name: 'NewsEdit', component: () => import('../views/news/NewsEdit.vue'), props: true, meta: { permission: 'news' } },
    { path: '/sources', name: 'Sources', component: () => import('../views/Sources.vue'), meta: { permission: 'sources' } },
    { path: '/sources/new', name: 'SourceNew', component: () => import('../views/SourceEdit.vue'), meta: { permission: 'sources' } },
    { path: '/sources/:id', name: 'SourceEdit', component: () => import('../views/SourceEdit.vue'), props: true, meta: { permission: 'sources' } },
    { path: '/sections', name: 'Sections', component: () => import('../views/Sections.vue'), meta: { permission: 'sections' } },
    { path: '/sections/new', name: 'SectionNew', component: () => import('../views/SectionEdit.vue'), meta: { permission: 'sections' } },
    { path: '/sections/:id', name: 'SectionEdit', component: () => import('../views/SectionEdit.vue'), props: true, meta: { permission: 'sections' } },
    { path: '/menus', name: 'Menus', component: () => import('../views/Menus.vue'), meta: { permission: 'menus' } },
    { path: '/menus/new', name: 'MenuNew', component: () => import('../views/MenuEdit.vue'), meta: { permission: 'menus' } },
    { path: '/menus/:id', name: 'MenuEdit', component: () => import('../views/MenuEdit.vue'), props: true, meta: { permission: 'menus' } },
    { path: '/pages', name: 'Pages', component: () => import('../views/Pages.vue'), meta: { permission: 'pages' } },
    { path: '/pages/new', name: 'PageNew', component: () => import('../views/PageEdit.vue'), meta: { permission: 'pages' } },
    { path: '/pages/:id', name: 'PageEdit', component: () => import('../views/PageEdit.vue'), props: true, meta: { permission: 'pages' } },
    { path: '/ads', name: 'Ads', component: () => import('../views/Ads.vue'), meta: { permission: 'ads' } },
    {
      path: '/settings',
      component: () => import('../views/SettingsLayout.vue'),
      meta: { permission: 'settings' },
      children: [
        { path: '', redirect: { name: 'SettingsGeneral' } },
        { path: 'general', name: 'SettingsGeneral', component: () => import('../views/SettingsGeneral.vue') },
        { path: 'ai', name: 'SettingsAI', component: () => import('../views/Settings.vue') },
        { path: 'storage', name: 'SettingsStorage', component: () => import('../views/SettingsStorage.vue') },
        { path: 'regions', name: 'SettingsRegions', component: () => import('../views/SettingsRegions.vue') },
        { path: 'users', name: 'Users', component: () => import('../views/Users.vue'), meta: { permission: 'users' } },
        { path: 'users/new', name: 'UserNew', component: () => import('../views/UserEdit.vue'), meta: { permission: 'users' } },
        { path: 'users/:id', name: 'UserEdit', component: () => import('../views/UserEdit.vue'), props: true, meta: { permission: 'users' } },
        { path: 'roles', name: 'Roles', component: () => import('../views/Roles.vue'), meta: { permission: 'roles' } },
        { path: 'roles/new', name: 'RoleNew', component: () => import('../views/RoleEdit.vue'), meta: { permission: 'roles' } },
        { path: 'roles/:id', name: 'RoleEdit', component: () => import('../views/RoleEdit.vue'), props: true, meta: { permission: 'roles' } },
      ],
    },
  ],
});

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore();
  if (!auth.initialized) await auth.fetchMe();
  if (to.meta.public) {
    if (auth.user && to.name === 'Login') return next('/');
    return next();
  }
  if (!auth.user) return next('/login');
  const perm = to.meta.permission as string | undefined;
  if (perm && !auth.hasPermission(perm)) return next('/news');
  next();
});

export default router;
