<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'
import { SPECIES } from '../animals'

const emit = defineEmits(['close'])

const tab = ref('broadcast')
const busy = ref('')
const error = ref('')
const info = ref('')

const broadcastMsg = ref('')
const restockQty = ref({})
const weightDraft = ref({})
const speciesRows = ref([])

const giftForm = ref({ username: '', coins: 0, species: '', tier: 'normal', qty: 1, note: '' })
const TIERS = ['normal', 'gold', 'diamond', 'epic', 'rainbow']

async function sendGift() {
  const f = giftForm.value
  if (!f.username.trim()) return flash('Username angeben', true)
  if ((!f.coins || f.coins < 1) && !f.species) return flash('Münzen oder Spezies angeben', true)
  busy.value = 'gift'
  try {
    const { error: e } = await supabase.rpc('admin_queue_gift', {
      p_username: f.username.trim(),
      p_coins: Math.max(0, Math.floor(Number(f.coins) || 0)),
      p_species: f.species || null,
      p_tier: f.tier || 'normal',
      p_qty: Math.max(1, Math.min(50, Math.floor(Number(f.qty) || 1))),
      p_note: f.note?.trim() || null
    })
    if (e) throw e
    flash(`Geschenk für ${f.username} eingereiht`)
    giftForm.value = { username: '', coins: 0, species: '', tier: 'normal', qty: 1, note: '' }
  } catch (e) { flash(e.message, true) } finally { busy.value = '' }
}

function flash(msg, isError = false) {
  if (isError) { error.value = msg; info.value = '' }
  else { info.value = msg; error.value = '' }
  setTimeout(() => { isError ? (error.value = '') : (info.value = '') }, 3000)
}

async function loadSpecies() {
  const { data } = await supabase.from('species_costs').select('species, enabled, weight').order('species')
  speciesRows.value = data || []
  for (const r of data || []) weightDraft.value[r.species] = r.weight
}

onMounted(loadSpecies)

async function sendBroadcast() {
  const msg = broadcastMsg.value.trim()
  if (!msg) return flash('Nachricht eingeben', true)
  busy.value = 'bc'
  try {
    const { error: e } = await supabase.rpc('admin_broadcast', { p_message: msg })
    if (e) throw e
    flash('Nachricht an alle gesendet')
    broadcastMsg.value = ''
  } catch (e) { flash(e.message, true) } finally { busy.value = '' }
}

async function callAdmin(rpc, args, key) {
  busy.value = key
  try {
    const { error: e } = await supabase.rpc(rpc, args)
    if (e) throw e
    await loadSpecies()
    flash('OK')
  } catch (e) { flash(e.message, true) } finally { busy.value = '' }
}

function restock(species) {
  const qty = Math.max(1, parseInt(restockQty.value[species] || 1, 10))
  return callAdmin('admin_force_add', { p_species: species, p_qty: qty }, 'r-' + species)
}
function stop(species) { return callAdmin('admin_force_remove', { p_species: species }, 's-' + species) }
function toggleEnabled(r) { return callAdmin('admin_set_species_enabled', { p_species: r.species, p_enabled: !r.enabled }, 'e-' + r.species) }
function saveWeight(species) {
  const v = parseInt(weightDraft.value[species], 10)
  if (!(v > 0)) return flash('Gewicht > 0', true)
  return callAdmin('admin_set_species_weight', { p_species: species, p_weight: v }, 'w-' + species)
}
function rotate() { return callAdmin('admin_force_rotation', {}, 'rotate') }
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-card">
      <div class="row between" style="margin-bottom:12px">
        <h2>🛠️ Admin</h2>
        <button class="btn secondary small" @click="emit('close')">✕</button>
      </div>

      <div class="tabs">
        <button :class="{ active: tab==='broadcast' }" @click="tab='broadcast'">📢 Broadcast</button>
        <button :class="{ active: tab==='shop' }" @click="tab='shop'">🛒 Shop</button>
        <button :class="{ active: tab==='gift' }" @click="tab='gift'">🎁 Gift</button>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="info" class="success">{{ info }}</p>

      <template v-if="tab === 'broadcast'">
        <p class="subtitle">Erscheint kurz mittig bei allen Spielern.</p>
        <textarea v-model="broadcastMsg" rows="3" maxlength="280" placeholder="Nachricht..." style="width:100%;padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--card-2);color:inherit" />
        <button class="btn full" style="margin-top:10px" :disabled="busy==='bc'" @click="sendBroadcast">
          {{ busy==='bc' ? '...' : 'An alle senden' }}
        </button>
      </template>

      <template v-if="tab === 'gift'">
        <p class="subtitle">Geschenk wird beim nächsten Login des Empfängers automatisch eingelöst.</p>
        <label class="subtitle">Empfänger (Username)</label>
        <input v-model="giftForm.username" placeholder="username" style="width:100%;margin-bottom:8px" />
        <label class="subtitle">Münzen (optional)</label>
        <input type="number" min="0" v-model.number="giftForm.coins" placeholder="0" style="width:100%;margin-bottom:8px" />
        <label class="subtitle">Spezies (optional)</label>
        <select v-model="giftForm.species" style="width:100%;padding:8px;border-radius:8px;background:var(--card-2);color:inherit;border:1px solid var(--border);margin-bottom:8px">
          <option value="">— keine —</option>
          <option v-for="r in speciesRows" :key="r.species" :value="r.species">{{ SPECIES[r.species]?.emoji }} {{ SPECIES[r.species]?.name || r.species }}</option>
        </select>
        <div class="row" style="gap:8px;margin-bottom:8px">
          <div style="flex:1">
            <label class="subtitle">Tier</label>
            <select v-model="giftForm.tier" style="width:100%;padding:8px;border-radius:8px;background:var(--card-2);color:inherit;border:1px solid var(--border)">
              <option v-for="t in TIERS" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div style="width:90px">
            <label class="subtitle">Anzahl</label>
            <input type="number" min="1" max="50" v-model.number="giftForm.qty" style="width:100%" />
          </div>
        </div>
        <label class="subtitle">Notiz (optional)</label>
        <input v-model="giftForm.note" maxlength="140" placeholder="z.B. Willkommen!" style="width:100%;margin-bottom:10px" />
        <button class="btn full" :disabled="busy==='gift'" @click="sendGift">
          {{ busy==='gift' ? '...' : '🎁 Geschenk einreihen' }}
        </button>
      </template>

      <template v-if="tab === 'shop'">
        <button class="btn full" :disabled="busy==='rotate'" @click="rotate" style="margin-bottom:10px">
          🎲 Sofort neu würfeln
        </button>
        <div v-for="r in speciesRows" :key="r.species" class="admin-row">
          <div class="admin-left">
            <span style="font-size:22px">{{ SPECIES[r.species]?.emoji }}</span>
            <div>
              <div style="font-weight:700">{{ SPECIES[r.species]?.name || r.species }}</div>
              <div class="subtitle" style="margin:0">Weight {{ r.weight }} · {{ r.enabled ? 'aktiv' : 'aus' }}</div>
            </div>
          </div>
          <div class="admin-actions">
            <label class="weight"><span>⚖️</span>
              <input type="number" min="1" max="9999" v-model.number="weightDraft[r.species]"
                @blur="saveWeight(r.species)" @keydown.enter.prevent="saveWeight(r.species); $event.target.blur()" />
            </label>
            <label class="toggle">
              <input type="checkbox" :checked="r.enabled" @change="toggleEnabled(r)" />
            </label>
            <label class="weight"><span>＋</span>
              <input type="number" min="1" max="99" v-model.number="restockQty[r.species]" placeholder="1" />
            </label>
            <button class="btn secondary small" :disabled="busy==='r-'+r.species" @click="restock(r.species)">Restock</button>
            <button class="btn danger small" :disabled="busy==='s-'+r.species" @click="stop(r.species)">Stop</button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.admin-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); gap: 8px; flex-wrap: wrap; }
.admin-row:last-child { border-bottom: none; }
.admin-left { display: flex; gap: 10px; align-items: center; min-width: 0; }
.admin-actions { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
.btn.small { padding: 6px 10px; font-size: 12px; }
.toggle input { width: 20px; height: 20px; accent-color: var(--accent); }
.weight { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--muted); }
.weight input { width: 54px; padding: 4px 6px; font-size: 16px; border-radius: 8px; text-align: right; }
</style>
