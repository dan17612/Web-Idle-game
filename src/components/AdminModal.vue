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
const userSearch = ref('')
const users = ref([])

const giftForm = ref({ username: '', coins: 0, species: '', tier: 'normal', qty: 1, note: '' })
const TIERS = ['normal', 'gold', 'diamond', 'epic', 'rainbow']

function flash(msg, isError = false) {
  if (isError) {
    error.value = msg
    info.value = ''
  } else {
    info.value = msg
    error.value = ''
  }
  setTimeout(() => {
    if (isError) error.value = ''
    else info.value = ''
  }, 3000)
}

async function loadSpecies() {
  const { data } = await supabase.from('species_costs').select('species, enabled, weight').order('species')
  speciesRows.value = data || []
  for (const r of data || []) weightDraft.value[r.species] = r.weight
}

async function loadUsers() {
  busy.value = 'users'
  try {
    const { data, error: e } = await supabase.rpc('admin_list_users', {
      p_search: userSearch.value.trim() || null,
      p_limit: 100,
      p_offset: 0
    })
    if (e) throw e
    users.value = data || []
  } catch (e) {
    flash(e.message, true)
  } finally {
    if (busy.value === 'users') busy.value = ''
  }
}

onMounted(async () => {
  await loadSpecies()
  await loadUsers()
})

async function sendBroadcast() {
  const msg = broadcastMsg.value.trim()
  if (!msg) return flash('Nachricht eingeben', true)
  busy.value = 'bc'
  try {
    const { error: e } = await supabase.rpc('admin_broadcast', { p_message: msg })
    if (e) throw e
    flash('Nachricht an alle gesendet')
    broadcastMsg.value = ''
  } catch (e) {
    flash(e.message, true)
  } finally {
    busy.value = ''
  }
}

async function sendGift() {
  const f = giftForm.value
  if (!f.username.trim()) return flash('Username oder @all angeben', true)
  if ((!f.coins || f.coins < 1) && !f.species) return flash('Muenzen oder Spezies angeben', true)
  busy.value = 'gift'
  try {
    const { data, error: e } = await supabase.rpc('admin_queue_gift_bulk', {
      p_usernames: f.username.trim(),
      p_coins: Math.max(0, Math.floor(Number(f.coins) || 0)),
      p_species: f.species || null,
      p_tier: f.tier || 'normal',
      p_qty: Math.max(1, Math.min(50, Math.floor(Number(f.qty) || 1))),
      p_note: f.note?.trim() || null
    })
    if (e) throw e
    const sent = Number(data?.sent ?? 0)
    const missed = Array.isArray(data?.missed) ? data.missed : []
    let msg = data?.all ? `An alle ${sent} Spieler gesendet` : `${sent} Geschenk(e) eingereiht`
    if (missed.length) msg += ` · nicht gefunden: ${missed.join(', ')}`
    flash(msg, missed.length > 0 && sent === 0)
    if (sent > 0) giftForm.value = { username: '', coins: 0, species: '', tier: 'normal', qty: 1, note: '' }
  } catch (e) {
    flash(e.message, true)
  } finally {
    busy.value = ''
  }
}

async function callAdmin(rpc, args, key) {
  busy.value = key
  try {
    const { error: e } = await supabase.rpc(rpc, args)
    if (e) throw e
    await loadSpecies()
    flash('OK')
  } catch (e) {
    flash(e.message, true)
  } finally {
    busy.value = ''
  }
}

function restock(species) {
  const qty = Math.max(1, parseInt(restockQty.value[species] || 1, 10))
  return callAdmin('admin_force_add', { p_species: species, p_qty: qty }, 'r-' + species)
}

function stop(species) {
  return callAdmin('admin_force_remove', { p_species: species }, 's-' + species)
}

function toggleEnabled(r) {
  return callAdmin('admin_set_species_enabled', { p_species: r.species, p_enabled: !r.enabled }, 'e-' + r.species)
}

function saveWeight(species) {
  const v = parseInt(weightDraft.value[species], 10)
  if (!(v > 0)) return flash('Gewicht > 0', true)
  return callAdmin('admin_set_species_weight', { p_species: species, p_weight: v }, 'w-' + species)
}

function rotate() {
  return callAdmin('admin_force_rotation', {}, 'rotate')
}

async function setBan(u, banned) {
  if (u.is_admin) return flash('Andere Admins werden hier nicht gebannt.', true)
  busy.value = banned ? `ban-${u.id}` : `unban-${u.id}`
  try {
    const { error: e } = await supabase.rpc('admin_set_user_ban', {
      p_user_id: u.id,
      p_banned: banned,
      p_reason: null
    })
    if (e) throw e
    await loadUsers()
    flash(banned ? 'User wurde gebannt.' : 'User wurde entbannt.')
  } catch (e) {
    flash(e.message, true)
  } finally {
    busy.value = ''
  }
}

async function deleteUser(u) {
  if (u.is_admin) return flash('Andere Admins werden hier nicht geloescht.', true)
  if (!confirm(`Account von ${u.username} wirklich endgueltig loeschen?`)) return
  busy.value = `del-${u.id}`
  try {
    const { error: e } = await supabase.rpc('admin_delete_user', { p_user_id: u.id })
    if (e) throw e
    await loadUsers()
    flash('Account geloescht.')
  } catch (e) {
    flash(e.message, true)
  } finally {
    busy.value = ''
  }
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-card">
      <div class="row between" style="margin-bottom:12px">
        <h2>Admin</h2>
        <button class="btn secondary small" @click="emit('close')">X</button>
      </div>

      <div class="tabs">
        <button :class="{ active: tab==='broadcast' }" @click="tab='broadcast'">Broadcast</button>
        <button :class="{ active: tab==='shop' }" @click="tab='shop'">Shop</button>
        <button :class="{ active: tab==='gift' }" @click="tab='gift'">Gift</button>
        <button :class="{ active: tab==='users' }" @click="tab='users'">Users</button>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="info" class="success">{{ info }}</p>

      <template v-if="tab === 'broadcast'">
        <p class="subtitle">Erscheint kurz mittig bei allen Spielern.</p>
        <textarea
          v-model="broadcastMsg"
          rows="3"
          maxlength="280"
          placeholder="Nachricht..."
          style="width:100%;padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--card-2);color:inherit"
        />
        <button class="btn full" style="margin-top:10px" :disabled="busy==='bc'" @click="sendBroadcast">
          {{ busy==='bc' ? '...' : 'An alle senden' }}
        </button>
      </template>

      <template v-if="tab === 'gift'">
        <p class="subtitle">Geschenk wird beim naechsten Login des Empfaengers automatisch eingeloest.</p>
        <label class="subtitle">Empfaenger - mehrere mit Komma oder <code>@all</code></label>
        <input v-model="giftForm.username" placeholder="alice, bob, charlie oder @all" style="width:100%;margin-bottom:8px" />
        <label class="subtitle">Muenzen (optional)</label>
        <input type="number" min="0" v-model.number="giftForm.coins" placeholder="0" style="width:100%;margin-bottom:8px" />
        <label class="subtitle">Spezies (optional)</label>
        <select v-model="giftForm.species" style="width:100%;padding:8px;border-radius:8px;background:var(--card-2);color:inherit;border:1px solid var(--border);margin-bottom:8px">
          <option value="">- keine -</option>
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
        <input v-model="giftForm.note" maxlength="140" placeholder="z.B. Willkommen" style="width:100%;margin-bottom:10px" />
        <button class="btn full" :disabled="busy==='gift'" @click="sendGift">
          {{ busy==='gift' ? '...' : 'Geschenk einreihen' }}
        </button>
      </template>

      <template v-if="tab === 'shop'">
        <button class="btn full" :disabled="busy==='rotate'" @click="rotate" style="margin-bottom:10px">
          Sofort neu wuerfeln
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
            <label class="weight"><span>W</span>
              <input
                type="number"
                min="1"
                max="9999"
                v-model.number="weightDraft[r.species]"
                @blur="saveWeight(r.species)"
                @keydown.enter.prevent="saveWeight(r.species); $event.target.blur()"
              />
            </label>
            <label class="toggle">
              <input type="checkbox" :checked="r.enabled" @change="toggleEnabled(r)" />
            </label>
            <label class="weight"><span>+</span>
              <input type="number" min="1" max="99" v-model.number="restockQty[r.species]" placeholder="1" />
            </label>
            <button class="btn secondary small" :disabled="busy==='r-'+r.species" @click="restock(r.species)">Restock</button>
            <button class="btn danger small" :disabled="busy==='s-'+r.species" @click="stop(r.species)">Stop</button>
          </div>
        </div>
      </template>

      <template v-if="tab === 'users'">
        <p class="subtitle">Accounts verwalten: suchen, bannen/entbannen, loeschen.</p>
        <div class="row" style="gap:8px;margin-bottom:10px">
          <input
            v-model="userSearch"
            placeholder="Suche nach Username oder E-Mail"
            style="flex:1"
            @keydown.enter.prevent="loadUsers"
          />
          <button class="btn secondary small" :disabled="busy==='users'" @click="loadUsers">
            {{ busy==='users' ? '...' : 'Suchen' }}
          </button>
        </div>
        <div v-for="u in users" :key="u.id" class="admin-row">
          <div class="admin-left">
            <div>
              <div style="font-weight:700;display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                <span>{{ u.username }}</span>
                <span v-if="u.is_admin" class="pill">ADMIN</span>
                <span v-if="u.is_banned" class="pill banned">BANNED</span>
              </div>
              <div class="subtitle" style="margin:0">{{ u.email || 'keine E-Mail' }}</div>
              <div class="subtitle" style="margin:0">Coins: {{ u.coins }}</div>
            </div>
          </div>
          <div class="admin-actions">
            <button
              v-if="!u.is_banned"
              class="btn danger small"
              :disabled="busy===`ban-${u.id}` || u.is_admin"
              @click="setBan(u, true)"
            >
              {{ busy===`ban-${u.id}` ? '...' : 'Bannen' }}
            </button>
            <button
              v-else
              class="btn secondary small"
              :disabled="busy===`unban-${u.id}` || u.is_admin"
              @click="setBan(u, false)"
            >
              {{ busy===`unban-${u.id}` ? '...' : 'Entbannen' }}
            </button>
            <button
              class="btn danger small"
              :disabled="busy===`del-${u.id}` || u.is_admin"
              @click="deleteUser(u)"
            >
              {{ busy===`del-${u.id}` ? '...' : 'Loeschen' }}
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.admin-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  gap: 8px;
  flex-wrap: wrap;
}
.admin-row:last-child { border-bottom: none; }
.admin-left { display: flex; gap: 10px; align-items: center; min-width: 0; }
.admin-actions { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
.btn.small { padding: 6px 10px; font-size: 12px; }
.toggle input { width: 20px; height: 20px; accent-color: var(--accent); }
.weight { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--muted); }
.weight input { width: 54px; padding: 4px 6px; font-size: 16px; border-radius: 8px; text-align: right; }
.pill {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.08);
}
.pill.banned {
  border-color: #ff6b6b;
  color: #ff8a8a;
}
</style>
