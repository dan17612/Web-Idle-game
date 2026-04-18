<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/game'
import { useAuthStore } from '../stores/auth'
import { speciesInfo, formatCoins } from '../animals'

const game = useGameStore()
const auth = useAuthStore()
const router = useRouter()

const equipped = computed(() =>
  game.animals.filter(a => a.equipped).map(a => ({ ...a, info: speciesInfo(a.species) }))
)

const slotCells = computed(() => {
  const cells = []
  for (let i = 0; i < game.equipSlots; i++) cells.push(equipped.value[i] || null)
  return cells
})

const favAnimal = computed(() => {
  const f = game.favoriteAnimal
  return f ? { ...f, info: speciesInfo(f.species) } : null
})

const favEmoji = computed(() => favAnimal.value?.info.emoji || '🐾')

const ownedAnimals = computed(() =>
  game.animals.map(a => ({ ...a, info: speciesInfo(a.species) }))
)

const pickerOpen = ref(false)
const floats = ref([])
let floatId = 0
const error = ref('')

const now = ref(Date.now())
let clockTimer
onMounted(() => {
  clockTimer = setInterval(() => { now.value = Date.now() }, 500)
})
onUnmounted(() => clearInterval(clockTimer))

function fmtTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const tapCooldown = computed(() => {
  void now.value
  return Math.max(0, game.tapsNextReset - (Date.now() + game.serverOffset))
})

const boostRemaining = computed(() => {
  void now.value
  return Math.max(0, game.petBoostUntil - (Date.now() + game.serverOffset))
})

const tapLimitReached = computed(() => game.tapsUsed >= game.tapsMax)

async function tap(e) {
  if (tapLimitReached.value) return
  const rect = e.currentTarget.getBoundingClientRect()
  const x = (e.clientX ?? e.touches?.[0]?.clientX ?? rect.left + rect.width / 2) - rect.left
  const y = (e.clientY ?? e.touches?.[0]?.clientY ?? rect.top + rect.height / 2) - rect.top
  const id = ++floatId
  const earnGuess = Math.max(1, Math.floor(game.ratePerSec))
  floats.value.push({ id, x, y, v: '+' + formatCoins(earnGuess) })
  setTimeout(() => { floats.value = floats.value.filter(f => f.id !== id) }, 900)
  try {
    const data = await game.tapEarn()
    const f = floats.value.find(f => f.id === id)
    if (f) f.v = '+' + formatCoins(data.earned)
  } catch (err) {
    error.value = err.message
    setTimeout(() => error.value = '', 2500)
  }
}

async function pickFavorite(animalId) {
  try {
    await game.setFavoriteAnimal(animalId)
    pickerOpen.value = false
  } catch (e) {
    error.value = e.message
    setTimeout(() => error.value = '', 2500)
  }
}
</script>

<template>
  <div>
    <div class="welcome">
      <div>
        <div class="subtitle" style="margin:0">Willkommen zurück</div>
        <div class="username">{{ auth.profile?.username || 'Spieler' }}</div>
      </div>
      <div v-if="game.favoriteBoostActive" class="boost-chip">
        ×{{ game.petBoostMultiplier }} · {{ fmtTime(boostRemaining) }}
      </div>
    </div>

    <div class="card tap-card">
      <div class="row between" style="margin-bottom:4px">
        <div>
          <div class="subtitle" style="margin:0">Einkommen</div>
          <div class="rate">
            +{{ formatCoins(game.ratePerSec) }} <span style="opacity:.6">/s</span>
            <span v-if="game.favoriteBoostActive" class="rate-boost">×{{ game.petBoostMultiplier }}</span>
          </div>
        </div>
        <div style="text-align:right">
          <div class="subtitle" style="margin:0">Taps</div>
          <div class="tap-count">
            <span :class="{ low: game.tapsRemaining <= 3, zero: tapLimitReached }">
              {{ game.tapsRemaining }}
            </span>
            <span style="opacity:.4"> / {{ game.tapsMax }}</span>
          </div>
          <div class="tap-reset">↻ {{ fmtTime(tapCooldown) }}</div>
        </div>
      </div>

      <div class="tap-wrap">
        <div
          class="tap-zone"
          :class="{ disabled: tapLimitReached, boosted: game.favoriteBoostActive, empty: !favAnimal }"
          @pointerdown="tap"
        >
          <span class="tap-emoji">{{ tapLimitReached ? '⏳' : favEmoji }}</span>
          <span v-if="game.favoriteBoostActive" class="tap-sparkle">✨</span>
        </div>
        <span v-for="f in floats" :key="f.id" class="float" :style="{ left: f.x+'px', top: f.y+'px' }">{{ f.v }}</span>
      </div>

      <p v-if="tapLimitReached" class="tap-note locked">
        Limit erreicht. Neue Taps in {{ fmtTime(tapCooldown) }}.
      </p>
      <p v-else-if="favAnimal" class="tap-note">
        <b>{{ favAnimal.info.name }}</b> ist dein Liebling. Tippe für Münzen.
      </p>
      <p v-else class="tap-note">
        Kaufe dein erstes Tier im Shop, um es zu füttern und zu tippen.
      </p>
      <p v-if="error" class="error" style="text-align:center;margin:4px 0 0">{{ error }}</p>
    </div>

    <div class="card pet-card" :class="{ boosted: game.favoriteBoostActive }">
      <div class="pet-emoji">{{ favEmoji }}{{ game.favoriteBoostActive ? '✨' : '' }}</div>
      <div class="pet-body">
        <div class="pet-title">{{ favAnimal ? favAnimal.info.name : 'Kein Liebling gewählt' }}</div>
        <div v-if="game.favoriteBoostActive" class="pet-status boost">
          ×{{ game.petBoostMultiplier }} Boost · {{ fmtTime(boostRemaining) }}
        </div>
        <div v-else class="pet-status">Füttere deinen Liebling für ×-Boost.</div>
      </div>
      <button class="btn" :disabled="!favAnimal" @click="router.push('/shop?tab=food')">🍖 Füttern</button>
    </div>

    <div v-if="ownedAnimals.length > 0" class="card">
      <div class="row between" style="margin-bottom:8px">
        <h2 class="title" style="margin:0;font-size:16px">⭐ Liebling auswählen</h2>
        <button class="btn secondary small" @click="pickerOpen = !pickerOpen">
          {{ pickerOpen ? 'Schließen' : 'Ändern' }}
        </button>
      </div>
      <div v-if="pickerOpen" class="fav-grid">
        <button
          v-for="a in ownedAnimals"
          :key="a.id"
          class="fav-cell"
          :class="{ active: a.id === game.favoriteAnimalId }"
          @click="pickFavorite(a.id)"
        >
          <div class="fav-emoji">{{ a.info.emoji }}</div>
          <div class="fav-name">{{ a.info.name }}</div>
          <div v-if="a.id === game.favoriteAnimalId" class="fav-star">⭐</div>
        </button>
      </div>
    </div>

    <div class="card equip-card">
      <div class="row between" style="margin-bottom:8px">
        <h2 class="title" style="margin:0;font-size:18px">
          🎯 Ausgerüstet
          <span class="badge" style="margin-left:6px">{{ game.equippedCount }} / {{ game.equipSlots }}</span>
        </h2>
        <router-link to="/inventory" class="badge">Inventar →</router-link>
      </div>
      <div class="farm-grid">
        <div
          v-for="(cell, i) in slotCells"
          :key="i"
          class="farm-cell"
          :class="{ empty: !cell, alive: !!cell, boosted: cell && cell.id === game.favoriteAnimalId && game.boostActive, favorite: cell && cell.id === game.favoriteAnimalId }"
        >
          <template v-if="cell">
            <div v-if="cell.id === game.favoriteAnimalId" class="farm-star">⭐</div>
            <div class="farm-emoji">{{ cell.info.emoji }}</div>
            <div class="farm-name">{{ cell.info.name }}</div>
            <div class="farm-rate">+{{ formatCoins(game.rateForAnimal(cell)) }}/s</div>
            <div v-if="cell.id === game.favoriteAnimalId && game.boostActive" class="farm-spark">✨</div>
          </template>
          <template v-else>
            <div class="farm-plus">＋</div>
            <div class="farm-meta">Freier Slot</div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.welcome { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.username { font-weight: 800; font-size: 18px; }
.boost-chip {
  background: linear-gradient(135deg,#06d6a0,#ffd166);
  color: #0b1220; font-weight: 800; font-size: 12px;
  padding: 6px 10px; border-radius: 999px;
  box-shadow: 0 4px 14px rgba(6,214,160,0.35);
}

.tap-card { text-align: center; position: relative; overflow: hidden; }
.rate { font-size: 22px; font-weight: 800; color: var(--accent-2); }
.rate-boost {
  font-size: 12px; background: var(--accent); color: #1b1300;
  padding: 2px 6px; border-radius: 999px; margin-left: 4px; vertical-align: middle;
}
.tap-count { font-size: 22px; font-weight: 800; }
.tap-count .low { color: var(--accent); }
.tap-count .zero { color: var(--danger); }
.tap-reset { font-size: 11px; color: var(--muted); font-variant-numeric: tabular-nums; }
.tap-wrap { position: relative; display: flex; justify-content: center; }
.tap-zone {
  position: relative;
  width: 240px; height: 240px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #3b4a88, #162048 70%);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; user-select: none;
  box-shadow: 0 20px 50px rgba(0,0,0,0.4), inset 0 0 40px rgba(255,255,255,0.05);
  transition: transform 0.08s ease;
}
.tap-zone:active { transform: scale(0.96); }
.tap-zone.disabled { filter: grayscale(0.8); opacity: 0.55; cursor: not-allowed; }
.tap-zone.empty { opacity: 0.6; }
.tap-zone.boosted {
  box-shadow: 0 0 0 3px rgba(6,214,160,0.4), 0 20px 50px rgba(6,214,160,0.25), inset 0 0 40px rgba(255,209,102,0.1);
  animation: pulse 1.6s ease-in-out infinite;
}
.tap-emoji { font-size: 150px; line-height: 1; animation: bob 2.4s ease-in-out infinite; }
.tap-sparkle { position: absolute; top: 20px; right: 30px; font-size: 28px; animation: sparkle 1.8s linear infinite; }
.tap-note { font-size: 12px; color: var(--muted); margin: 8px 0 0; }
.tap-note.locked { color: var(--danger); font-weight: 600; }
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}

.pet-card { display: flex; align-items: center; gap: 12px; }
.pet-card.boosted {
  background: linear-gradient(135deg, rgba(6,214,160,0.12), rgba(255,209,102,0.12));
  border-color: rgba(6,214,160,0.5);
}
.pet-emoji { font-size: 44px; line-height: 1; }
.pet-body { flex: 1; min-width: 0; }
.pet-title { font-weight: 700; }
.pet-status { font-size: 12px; color: var(--muted); margin-top: 2px; }
.pet-status.boost { color: var(--accent-2); font-weight: 700; }

.fav-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 8px;
}
.fav-cell {
  position: relative;
  background: #162048; border: 1px solid var(--border); border-radius: 12px;
  padding: 8px 4px; text-align: center; cursor: pointer;
  color: inherit; font: inherit;
}
.fav-cell.active { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent) inset; }
.fav-emoji { font-size: 32px; line-height: 1; }
.fav-name { font-size: 11px; margin-top: 4px; opacity: 0.8; }
.fav-star { position: absolute; top: 2px; right: 4px; font-size: 12px; }
.btn.small { padding: 6px 10px; font-size: 12px; }

.equip-card { position: relative; }
.farm-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
}
.farm-cell {
  position: relative; overflow: hidden;
  background: linear-gradient(135deg, #2a3866, #162048);
  border: 1px solid var(--border);
  border-radius: 16px; padding: 14px 8px 10px;
  text-align: center; min-height: 130px;
  display: flex; flex-direction: column; justify-content: center; align-items: center;
}
.farm-cell.empty {
  background: repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0 10px, transparent 10px 20px);
  border-style: dashed;
}
.farm-cell.alive::before {
  content: ''; position: absolute; inset: -20% -20% auto -20%; height: 80%;
  background: radial-gradient(ellipse at center, rgba(255,209,102,0.18), transparent 60%);
  pointer-events: none;
}
.farm-cell.favorite { border-color: var(--accent); }
.farm-cell.boosted {
  border-color: var(--accent-2);
  box-shadow: 0 0 0 1px var(--accent-2) inset, 0 6px 20px rgba(6,214,160,0.3);
}
.farm-emoji { font-size: 48px; line-height: 1; animation: bob 2.4s ease-in-out infinite; }
.farm-name { font-weight: 700; margin-top: 6px; font-size: 13px; }
.farm-rate { color: var(--accent); font-size: 12px; font-weight: 700; margin-top: 2px; }
.farm-plus { font-size: 36px; opacity: 0.4; }
.farm-meta { color: var(--muted); font-size: 11px; margin-top: 2px; }
.farm-spark { position: absolute; top: 6px; right: 8px; font-size: 16px; animation: sparkle 1.8s linear infinite; }
.farm-star { position: absolute; top: 6px; left: 8px; font-size: 14px; }
@keyframes bob {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-4px) rotate(2deg); }
}
@keyframes sparkle {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.3); }
}
.float {
  position: absolute; pointer-events: none; font-weight: 800; color: var(--accent);
  animation: floatUp 0.9s ease-out forwards;
}
@keyframes floatUp {
  0% { opacity: 1; transform: translate(-50%, 0); }
  100% { opacity: 0; transform: translate(-50%, -60px); }
}
</style>
