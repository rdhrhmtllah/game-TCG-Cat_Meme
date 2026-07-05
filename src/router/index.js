import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth.js';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { guest: true },
  },
  {
    path: '/',
    name: 'Landing',
    component: () => import('@/views/Landing.vue'),
    // guest: true → visitor yang sudah login otomatis diarahkan ke /app
    meta: { guest: true },
  },
  {
    path: '/app',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/binder',
    name: 'Binder',
    component: () => import('@/views/Binder.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/gacha',
    name: 'GachaShop',
    component: () => import('@/views/GachaShop.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/market',
    name: 'Marketplace',
    component: () => import('@/views/Marketplace.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/activities',
    name: 'Activities',
    component: () => import('@/views/ActivityHub.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/leaderboard',
    name: 'Leaderboard',
    component: () => import('@/views/Leaderboard.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/AdminPanel.vue'),
    // Admin auth is handled internally (shared secret cookie), not via user JWT guard
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.token) {
    next({ name: 'Login', query: { redirect: to.fullPath } });
  } else if (to.meta.guest && authStore.token) {
    next({ name: 'Dashboard' });
  } else {
    next();
  }
});

export default router;
