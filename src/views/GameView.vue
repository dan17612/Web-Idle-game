<script setup>
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/game'
import { useAuthStore } from '../stores/auth'
import { speciesInfo, formatCoins } from '../animals'

const game = useGameStore()
const auth = useAuthStore()

const grouped = computed(() => {
  const map = {}
  for (const a of game.animals) {
    const k = a.species
    if (!map[k]) map[k] = { species: k, count: 0, info: speciesInfo(k) }
    map[k].count++
  }
  return Object.values(map).sort((a, b) => a.info.cost - b.info.cost)
})

const floats = ref([])
let floatId = 0

function tap(e) {
  const earn = Math.max(1, Math.floor(game.ratePerSec))
  game.tickCoins += earn
  const rect = e.currentTarget.getBoundingClientRect()
  const x = (e.clientX ?? e.touches?.[0]?.clientX ?? rect.left + rect.width / 2) - rect.left
  const y = (e.clientY ?? e.touches?.[0]?.clientY ?? rect.top + rect.height / 2) - rect.top
  const id = ++floatId
  floats.value.push({ id, x, y, v: '+' + formatCoins(earn) })
  setTimeout(() => { floats.value = floats.value.filter(f => f.id !== id) }, 900)
}

async function logout() {
  await game.persist()
  await auth.signOut()
  location.hash = '#/login'
}
</script>

<template>
  <div>
    <div class="row between" style="margin-bottom:8px">
      <div>
        <div style="font-size:12px;color:var(--muted)">Willkommen</div>
        <div style="font-weight:800">{{ auth.profile?.username || 'Spieler' }}</div>
      </div>
      <button class="btn secondary" @click="logout">Logout</button>
    </div>

    <div class="card" style="text-align:center;position:relative;overflow:hidden">
      <div class="subtitle">Einkommen</div>
      <div style="font-size:20px;font-weight:800;color:var(--accent-2)">
        +{{ formatCoins(game.ratePerSec) }} / Sek
      </div>
      <div class="tap-zone" @pointerdown="tap">🐾</div>
      <span v-for="f in floats" :key="f.id" class="float" :style="{ left: f.x+'px', top: f.y+'px' }">{{ f.v }}</span>
      <p class="subtitle" style="margin:0">Tippe das Pfoten-Symbol für Bonus-Münzen.</p>
    </div>

    <div class="card">
      <div class="row between">
        <h2 class="title" style="margin:0;font-size:18px">Deine Tiere</h2>
        <router-link to="/shop" class="badge">Shop öffnen →</router-link>
      </div>
      <div v-if="!grouped.length" class="subtitle" style="margin-top:10px">Noch keine Tiere. Geh ins Shop und kauf dein erstes Küken!</div>
      <div v-else class="grid" style="margin-top:10px">
        <div v-for="g in grouped" :key="g.species" class="animal-card">
          <div class="animal-emoji">{{ g.info.emoji }}</div>
          <div class="animal-name">{{ g.info.name }}</div>
          <div class="animal-meta">x{{ g.count }} · +{{ formatCoins(g.info.rate * g.count) }}/s</div>
        </div>
      </div>
    </div>
  </div>
</template>
