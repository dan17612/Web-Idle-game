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
const busyAdmin = ref('')
const adminOpen = ref(false)

const available = ref([])
const forced = ref([])
const rotatesAt = ref(0)
const serverOffset = ref(0) // Differenz server - client in ms
const now = ref(Date.now())
const enabledMap = ref({}) // { species: boolean }
const weightMap = ref({})  // { species: number }
const weightDraft = ref({}) // lokale Edits
let timer

async function loadShop() {
  const { data, error: e } = await supabase.rpc('get_shop')
  if (e) { error.value = e.message; return }
  available.value = data?.available || []
  forced.value = data?.forced || []
  rotatesAt.value = data?.rotates_at ? new Date(data.rotates_at).getTime() : 0
  if (data?.server_now) {
    serverOffset.value = new Date(data.server_now).getTime() - Date.now()
  }
}

async function loadAdminData() {
  if (!auth.profile?.is_admin) return
  const { data } = await supabase.from('species_costs').select('species, enabled, weight')
  const em = {}, wm = {}, wd = {}
  for (const r of data || []) { em[r.species] = r.enabled; wm[r.species] = r.weight; wd[r.species] = r.weight }
  enabledMap.value = em
  weightMap.value = wm
  weightDraft.value = wd
}

async function saveWeight(species) {
  const val = parseInt(weightDraft.value[species], 10)
  if (!(val > 0)) { error.value = 'Gewicht muss > 0 sein'; return }
  if (val === weightMap.value[species]) return
  await callAdmin('admin_set_species_weight', { p_species: species, p_weight: val }, 'w-' + species)
}

onMounted(async () => {
  await Promise.all([loadShop(), loadAdminData()])
  timer = setInterval(() => {
    now.value = Date.now()
    // Reload 1 s nach Rotations-Deadline (Server-Zeit)
    if (rotatesAt.value && serverNow() >= rotatesAt.value + 500) loadShop()
  }, 500)
})
onUnmounted(() => clearInterval(timer))

function serverNow() { return now.value + serverOffset.value }

const countdown = computed(() => {
  if (!rotatesAt.value) return '—'
  const s = Math.max(0, Math.floor((rotatesAt.value - serverNow()) / 1000))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
})

const speciesList = computed(() => {
  return Object.entries(SPECIES).map(([key, info]) => ({
    key,
    info,
    inStock: available.value.includes(key),
    isForced: forced.value.includes(key),
    enabled: enabledMap.value[key] !== false
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

async function callAdmin(rpc, args, key) {
  error.value = ''; success.value = ''
  busyAdmin.value = key
  try {
    const { error: e } = await supabase.rpc(rpc, args)
    if (e) throw e
    await Promise.all([loadShop(), loadAdminData()])
  } catch (e) { error.value = e.message }
  finally { busyAdmin.value = '' }
}
</script>

<template>
  <h1 class="title">🛒 Shop</h1>

  <div class="card row between" style="margin-bottom:10px">
    <div>
      <div class="subtitle" style="margin:0">Nächste Rotation in</div>
      <div style="font-weight:800;font-size:22px;color:var(--accent);font-variant-numeric:tabular-nums">
        {{ countdown }}
      </div>
    </div>
    <div style="text-align:right">
      <div class="subtitle" style="margin:0">Im Angebot</div>
      <div style="font-weight:800">{{ available.length }} / {{ Object.keys(SPECIES).length }}</div>
    </div>
  </div>

  <div v-if="auth.profile?.is_admin" class="card" style="background:linear-gradient(135deg,#3a1d5c,#1d2a5c)">
    <div class="row between" @click="adminOpen = !adminOpen" style="cursor:pointer">
      <div>
        <div style="font-weight:800">🛠️ Admin-Panel</div>
        <div class="subtitle" style="margin:2px 0 0">Tiere aktivieren, erzwingen, Rotation auslösen</div>
      </div>
      <div>{{ adminOpen ? '▲' : '▼' }}</div>
    </div>

    <div v-if="adminOpen" style="margin-top:12px">
      <button
        class="btn full"
        style="margin-bottom:12px"
        :disabled="busyAdmin==='rotate'"
        @click="callAdmin('admin_force_rotation', {}, 'rotate')"
      >
        🎲 Sofort neu würfeln
      </button>

      <div
        v-for="s in speciesList"
        :key="'adm-'+s.key"
        class="admin-row"
      >
        <div class="admin-left">
          <span style="font-size:22px">{{ s.info.emoji }}</span>
          <div>
            <div style="font-weight:700">{{ s.info.name }}</div>
            <div class="subtitle" style="margin:0">
              <span v-if="s.isForced" class="badge" style="background:rgba(255,209,102,0.15);color:var(--accent)">erzwungen</span>
              <span v-else-if="s.inStock" class="badge">im Shop</span>
              <span v-else style="color:var(--muted)">—</span>
            </div>
          </div>
        </div>
        <div class="admin-actions">
          <label class="weight" :title="'Höheres Gewicht = öfter im Shop. Default 1-100.'">
            <span>⚖️</span>
            <input
              type="number"
              min="1"
              max="9999"
              v-model.number="weightDraft[s.key]"
              :disabled="busyAdmin===('w-'+s.key)"
              @blur="saveWeight(s.key)"
              @keydown.enter.prevent="saveWeight(s.key); $event.target.blur()"
            />
          </label>
          <label class="toggle">
            <input
              type="checkbox"
              :checked="s.enabled"
              :disabled="busyAdmin===('en-'+s.key)"
              @change="callAdmin('admin_set_species_enabled', { p_species: s.key, p_enabled: !s.enabled }, 'en-'+s.key)"
            />
            <span>{{ s.enabled ? 'aktiv' : 'aus' }}</span>
          </label>
          <button
            v-if="!s.isForced"
            class="btn secondary small"
            :disabled="busyAdmin===('f-'+s.key)"
            @click="callAdmin('admin_force_add', { p_species: s.key }, 'f-'+s.key)"
          >Restock</button>
          <button
            v-else
            class="btn danger small"
            :disabled="busyAdmin===('u-'+s.key)"
            @click="callAdmin('admin_force_remove', { p_species: s.key }, 'u-'+s.key)"
          >Stop</button>
        </div>
      </div>
    </div>
  </div>

  <p class="subtitle">Angebot rotiert alle 5 Minuten im festen Takt (:00, :05, :10, …).</p>

  <div v-if="error" class="error">{{ error }}</div>
  <div v-if="success" class="success">{{ success }}</div>

  <div class="grid">
    <div
      v-for="s in speciesList"
      :key="s.key"
      class="animal-card"
      :class="{ 'out-of-stock': !s.inStock, 'is-forced': s.isForced }"
    >
      <div v-if="s.isForced" class="ribbon">⭐ Restock</div>
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
.is-forced { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent) inset; }
.ribbon {
  position: absolute; top: 6px; right: 6px;
  background: var(--accent); color: #1b1300;
  font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 999px;
}
.stock-badge {
  margin-top: 8px; padding: 10px; border-radius: 10px;
  background: rgba(239, 71, 111, 0.15); color: var(--danger);
  font-weight: 700; font-size: 12px; text-align: center;
}
.admin-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06);
  gap: 8px;
}
.admin-row:last-child { border-bottom: none; }
.admin-left { display: flex; gap: 10px; align-items: center; min-width: 0; }
.admin-actions { display: flex; gap: 6px; align-items: center; }
.btn.small { padding: 6px 10px; font-size: 12px; }
.toggle {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--muted);
}
.toggle input { width: 18px; height: 18px; accent-color: var(--accent); }
.weight {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 12px; color: var(--muted);
}
.weight input {
  width: 58px; padding: 4px 6px; font-size: 12px;
  border-radius: 8px; text-align: right;
}
</style>
