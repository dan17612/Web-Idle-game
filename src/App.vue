<script setup>
import { onMounted, computed } from 'vue'
import { useAuthStore } from './stores/auth'
import { useGameStore } from './stores/game'
import { useRoute } from 'vue-router'
import { formatCoins } from './animals'

const auth = useAuthStore()
const game = useGameStore()
const route = useRoute()

onMounted(async () => {
  if (auth.isAuth) await game.load()

  let last = performance.now()
  setInterval(() => {
    const now = performance.now()
    const dt = (now - last) / 1000
    last = now
    if (auth.isAuth) game.tick(dt)
  }, 250)

  setInterval(() => { if (auth.isAuth) game.persist() }, 15000)
  window.addEventListener('beforeunload', () => { if (auth.isAuth) game.persist() })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && auth.isAuth) game.persist()
  })
})

const showNav = computed(() => auth.isAuth && route.name !== 'login')
</script>

<template>
  <div class="app-shell">
    <header v-if="showNav" class="top-bar">
      <div class="brand">🐾 Zoo Empire</div>
      <div class="balance">
        <span class="coin">🪙</span>
        <span class="amount">{{ formatCoins(game.displayCoins) }}</span>
      </div>
    </header>

    <main class="content" :class="{ 'no-nav': !showNav }">
      <div v-if="auth.loading" class="loader">Lädt…</div>
      <router-view v-else />
    </main>

    <nav v-if="showNav" class="bottom-nav">
      <router-link to="/" class="nav-item">
        <span class="ico">🏡</span><span>Farm</span>
      </router-link>
      <router-link to="/shop" class="nav-item">
        <span class="ico">🛒</span><span>Shop</span>
      </router-link>
      <router-link to="/trade" class="nav-item">
        <span class="ico">🔄</span><span>Trade</span>
      </router-link>
      <router-link to="/send" class="nav-item">
        <span class="ico">💸</span><span>Senden</span>
      </router-link>
      <router-link to="/leaderboard" class="nav-item">
        <span class="ico">🏆</span><span>Rang</span>
      </router-link>
    </nav>
  </div>
</template>
