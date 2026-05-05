import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from './stores/auth'

const routes = [
  { path: '/', name: 'game', component: () => import('./views/GameView.vue'), meta: { auth: true } },
  { path: '/shop', name: 'shop', component: () => import('./views/ShopView.vue'), meta: { auth: true } },
  { path: '/tickets', name: 'tickets', component: () => import('./views/TicketsView.vue'), meta: { auth: true } },
  { path: '/inventory', name: 'inventory', component: () => import('./views/InventoryView.vue'), meta: { auth: true } },
  { path: '/trade', name: 'trade', component: () => import('./views/TradeView.vue'), meta: { auth: true } },
  { path: '/send', redirect: '/trade' },
  { path: '/friends', name: 'friends', component: () => import('./views/FriendsView.vue'), meta: { auth: true } },
  { path: '/leaderboard', name: 'leaderboard', component: () => import('./views/LeaderboardView.vue'), meta: { auth: true } },
  { path: '/boss-fight', name: 'bossFight', component: () => import('./views/BossFightView.vue'), meta: { auth: true } },
  { path: '/boss-path', redirect: { name: 'bossFight', query: { mode: 'path' } } },
  { path: '/boss-endless', redirect: { name: 'bossFight', query: { mode: 'endless' } } },
  { path: '/merge', name: 'merge', component: () => import('./views/MergeGameView.vue'), meta: { auth: true } },
  { path: '/profile', name: 'profile', component: () => import('./views/ProfileView.vue'), meta: { auth: true } },
  { path: '/index', name: 'index', component: () => import('./views/IndexView.vue'), meta: { auth: true } },
  { path: '/settings', name: 'settings', component: () => import('./views/SettingsView.vue'), meta: { auth: true } },
  { path: '/privacy', name: 'privacy', component: () => import('./views/PrivacyView.vue') },
  { path: '/login', name: 'login', component: () => import('./views/AuthView.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.auth && !auth.isAuth) return { name: 'login' }
  if (to.name === 'login' && auth.isAuth) return { name: 'game' }
})

export default router
