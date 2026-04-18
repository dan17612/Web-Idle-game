import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from './stores/auth'

const routes = [
  { path: '/', name: 'game', component: () => import('./views/GameView.vue'), meta: { auth: true } },
  { path: '/shop', name: 'shop', component: () => import('./views/ShopView.vue'), meta: { auth: true } },
  { path: '/trade', name: 'trade', component: () => import('./views/TradeView.vue'), meta: { auth: true } },
  { path: '/send', name: 'send', component: () => import('./views/SendView.vue'), meta: { auth: true } },
  { path: '/friends', name: 'friends', component: () => import('./views/FriendsView.vue'), meta: { auth: true } },
  { path: '/leaderboard', name: 'leaderboard', component: () => import('./views/LeaderboardView.vue'), meta: { auth: true } },
  { path: '/login', name: 'login', component: () => import('./views/AuthView.vue') }
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
