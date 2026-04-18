<script setup>
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/game'
import { useAuthStore } from '../stores/auth'
import { speciesInfo, formatCoins } from '../animals'

const game = useGameStore()
const auth = useAuthStore()

const equipped = computed(() =>
  game.animals.filter(a => a.equipped).map(a => ({ ...a, info: speciesInfo(a.species) }))
)

const slotCells = computed(() => {
  const cells = []
  for (let i = 0; i < game.equipSlots; i++) cells.push(equipped.value[i] || null)
  return cells
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
      <p class="subtitle" style="margin:0">Tippe für einen Bonus in Höhe einer Sekunden-Produktion.</p>
    </div>

    <div class="card">
      <div class="row between">
        <h2 class="title" style="margin:0;font-size:18px">
          🎯 Ausgerüstet
          <span class="badge" style="margin-left:6px">{{ game.equippedCount }} / {{ game.equipSlots }}</span>
        </h2>
        <router-link to="/inventory" class="badge">Inventar →</router-link>
      </div>
      <div class="slot-grid">
        <div
          v-for="(cell, i) in slotCells"
          :key="i"
          class="slot-cell"
          :class="{ empty: !cell }"
        >
          <template v-if="cell">
            <div class="animal-emoji">{{ cell.info.emoji }}</div>
            <div class="animal-name">{{ cell.info.name }}</div>
            <div class="animal-meta">+{{ formatCoins(cell.info.rate) }}/s</div>
          </template>
          <template v-else>
            <div style="font-size:36px;opacity:0.4">＋</div>
            <div class="animal-meta">Freier Slot</div>
          </template>
        </div>
      </div>
      <router-link to="/inventory" class="btn secondary full" style="margin-top:10px;text-align:center">
        Tiere verwalten
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.slot-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px; margin-top: 10px;
}
.slot-cell {
  background: var(--card-2); border: 1px solid var(--border);
  border-radius: 12px; padding: 10px 6px; text-align: center; min-height: 110px;
  display: flex; flex-direction: column; justify-content: center; align-items: center;
}
.slot-cell.empty { border-style: dashed; color: var(--muted); }
.slot-cell .animal-emoji { font-size: 34px; line-height: 1; }
.slot-cell .animal-name { font-weight: 700; margin-top: 4px; font-size: 13px; }
.slot-cell .animal-meta { color: var(--muted); font-size: 11px; margin-top: 2px; }
</style>
