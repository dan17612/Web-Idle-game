<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../supabase'
import { SPECIES, formatCoins } from '../animals'

const game = useGameStore()
const auth = useAuthStore()
const error = ref('')
const success = ref('')
const busyKey = ref('')
const busyRestock = ref(false)

const available = ref([])
const rotatesAt = ref(null)
const now = ref(Date.now())
let timer

async function loadShop() {
  const { data, error: e } = await supabase.rpc('get_shop')
  if (e) { error.value = e.message; return }
  available.value = data?.available || []
  rotatesAt.value = data?.rotates_at ? new Date(data.rotates_at).getTime() : null
}

onMounted(async () => {
  await loadShop()
  timer = setInterval(() => {
    now.value = Date.now()
    if (rotatesAt.value && now.value >= rotatesAt.value) loadShop()
  }, 1000)
})
onUnmounted(() => clearInterval(timer))

const countdown = computed(() => {
  if (!rotatesAt.value) return '—'
  const s = Math.max(0, Math.floor((rotatesAt.value - now.value) / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`
})

const speciesList = computed(() => {
  return Object.entries(SPECIES).map(([key, info]) => ({
    key,
    info,
    inStock: available.value.includes(key)
  }))
})

async function buy(key) {
  error.value = ''; success.value = ''
  busyKey.value = key
  try {
    await game.buyAnimal(key)
    success.value = SPECIES[key].name + ' gekauft!'
  } catch (e) {
    error.value = e.message
    if (/rotation/i.test(e.message)) await loadShop()
  } finally {
    busyKey.value = ''
    setTimeout(() => success.value = '', 2000)
  }
}

async function adminRestock(random = true) {
  error.value = ''; success.value = ''
  busyRestock.value = true
  try {
    const { error: e } = await supabase.rpc('admin_restock', {
      p_species: null,
      p_count: 5
    })
    if (e) throw e
    success.value = 'Shop wurde neu befüllt!'
    await loadShop()
  } catch (e) {
    error.value = e.message
  } finally {
    busyRestock.value = false
    setTimeout(() => success.value = '', 2000)
  }
}
</script>

<template>
  <h1 class="title">🛒 Shop</h1>

  <div class="card row between" style="margin-bottom:10px">
    <div>
      <div class="subtitle" style="margin:0">Nächste Rotation in</div>
      <div style="font-weight:800;font-size:18px;color:var(--accent)">{{ countdown }}</div>
    </div>
    <div style="text-align:right">
      <div class="subtitle" style="margin:0">Verfügbar</div>
      <div style="font-weight:800">{{ available.length }} / {{ Object.keys(SPECIES).length }}</div>
    </div>
  </div>

  <div v-if="auth.profile?.is_admin" class="card" style="background:linear-gradient(135deg,#3a1d5c,#1d2a5c)">
    <div class="row between" style="align-items:center">
      <div>
        <div style="font-weight:800">🛠️ Admin</div>
        <div class="subtitle" style="margin:2px 0 0">Shop manuell neu befüllen</div>
      </div>
      <button class="btn" :disabled="busyRestock" @click="adminRestock()">
        {{ busyRestock ? '...' : 'Restock' }}
      </button>
    </div>
  </div>

  <p class="subtitle">Tiere erzeugen passiv Münzen. Die Auswahl wechselt alle 4 Stunden.</p>

  <div v-if="error" class="error">{{ error }}</div>
  <div v-if="success" class="success">{{ success }}</div>

  <div class="grid">
    <div
      v-for="s in speciesList"
      :key="s.key"
      class="animal-card"
      :class="{ 'out-of-stock': !s.inStock }"
    >
      <div class="animal-emoji">{{ s.info.emoji }}</div>
      <div class="animal-name">{{ s.info.name }}</div>
      <div class="animal-meta">+{{ formatCoins(s.info.rate) }} / Sek</div>
      <div class="animal-cost">🪙 {{ formatCoins(s.info.cost) }}</div>
      <button
        v-if="s.inStock"
        class="btn full"
        style="margin-top:8px"
        :disabled="busyKey===s.key || game.displayCoins < s.info.cost"
        @click="buy(s.key)"
      >
        {{ busyKey===s.key ? '...' : 'Kaufen' }}
      </button>
      <div v-else class="stock-badge">Ausverkauft</div>
    </div>
  </div>
</template>

<style scoped>
.out-of-stock { opacity: 0.45; filter: grayscale(0.6); }
.stock-badge {
  margin-top: 8px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(239, 71, 111, 0.15);
  color: var(--danger);
  font-weight: 700;
  font-size: 12px;
  text-align: center;
}
</style>
