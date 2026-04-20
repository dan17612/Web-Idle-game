<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../supabase'
import { useAuthStore } from '../stores/auth'
import { useGameStore } from '../stores/game'
import { speciesInfo, formatCoins, tierInfo } from '../animals'
import CoinInput from '../components/CoinInput.vue'

const route = useRoute()

const auth = useAuthStore()
const game = useGameStore()

const tab = ref('new')
const error = ref('')
const success = ref('')
const busy = ref(false)

const incoming = ref([])
const outgoing = ref([])
const history = ref([])
const publicTrades = ref([])
const publicAccept = ref({})
const isPublicOffer = ref(false)

// --- Partner + dessen Inventar
const partnerUsername = ref('')
const partnerProfile = ref(null)
const partnerAnimals = ref([])
const partnerSearching = ref(false)
const partnerError = ref('')

// --- Mein Angebot
const offer = reactive({
  myAnimals: new Set(),
  myCoins: 0,
  theirAnimals: new Set(),
  theirCoins: 0,
  note: ''
})
const mode = ref('trade')   // 'trade' | 'send'
const sendForm = reactive({ username: '', amount: 0 })
const pickerOpen = ref('') // 'mine' | 'theirs' | ''

const myTradableAnimals = computed(() =>
  game.animals.filter(a => !a.equipped).map(a => ({ ...a, info: speciesInfo(a.species), td: tierInfo(a.tier || 'normal') }))
)

function toggleMine(id) {
  if (offer.myAnimals.has(id)) offer.myAnimals.delete(id); else offer.myAnimals.add(id)
}
function toggleTheirs(id) {
  if (offer.theirAnimals.has(id)) offer.theirAnimals.delete(id); else offer.theirAnimals.add(id)
}

async function lookupPartner() {
  partnerError.value = ''
  partnerProfile.value = null
  partnerAnimals.value = []
  offer.theirAnimals.clear()
  const name = partnerUsername.value.trim()
  if (!name) return
  partnerSearching.value = true
  try {
    const escaped = name.replace(/[\\_%]/g, '\\$&')
    const { data: p } = await supabase.from('profiles')
      .select('id, username, coins, avatar_emoji').ilike('username', escaped).maybeSingle()
    if (!p) { partnerError.value = 'Nicht gefunden'; return }
    if (p.id === auth.user.id) { partnerError.value = 'Das bist du selbst'; return }
    partnerProfile.value = p
    const { data: animals } = await supabase.from('animals')
      .select('id, species, equipped, tier').eq('owner_id', p.id).eq('equipped', false)
      .order('acquired_at')
    partnerAnimals.value = (animals || []).map(a => ({ ...a, info: speciesInfo(a.species), td: tierInfo(a.tier || 'normal') }))
  } finally {
    partnerSearching.value = false
  }
}

let partnerTimer
watch(partnerUsername, () => {
  clearTimeout(partnerTimer)
  partnerTimer = setTimeout(lookupPartner, 400)
})

function resetForm() {
  offer.myAnimals.clear()
  offer.theirAnimals.clear()
  offer.myCoins = 0
  offer.theirCoins = 0
  offer.note = ''
  partnerUsername.value = ''
  partnerProfile.value = null
  partnerAnimals.value = []
}

async function propose() {
  error.value = ''; success.value = ''
  if (!isPublicOffer.value && !partnerProfile.value) { error.value = 'Partner wählen oder öffentlich posten'; return }
  const reqAnimals = [...offer.myAnimals]
  const addAnimals = [...offer.theirAnimals]
  const reqCoins = Math.max(0, Math.floor(Number(offer.myCoins) || 0))
  const addCoins = Math.max(0, Math.floor(Number(offer.theirCoins) || 0))
  // Mindestens eine Seite muss etwas geben — Münzen dürfen 0 sein.
  if (reqAnimals.length + reqCoins === 0 && addAnimals.length + addCoins === 0) {
    error.value = 'Trade ist komplett leer'; return
  }
  if (reqCoins > game.displayCoins) { error.value = 'Nicht genug Münzen'; return }

  if (isPublicOffer.value && addAnimals.length > 0) {
    error.value = 'Öffentliche Trades können keine konkreten Tiere vom Annehmer verlangen (nur Münzen).'
    return
  }
  busy.value = true
  try {
    await game.persist()
    const { error: e } = await supabase.rpc('propose_trade', {
      p_addressee: isPublicOffer.value ? null : partnerProfile.value.username,
      p_requester_animals: reqAnimals,
      p_requester_coins: reqCoins,
      p_addressee_animals: isPublicOffer.value ? [] : addAnimals,
      p_addressee_coins: addCoins,
      p_note: offer.note || null
    })
    if (e) throw e
    success.value = isPublicOffer.value ? 'Öffentlicher Trade veröffentlicht!' : 'Trade-Anfrage gesendet!'
    resetForm()
    tab.value = isPublicOffer.value ? 'public' : 'out'
    isPublicOffer.value = false
    await loadTrades()
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

async function sendGift() {
  error.value = ''; success.value = ''
  if (!sendForm.username.trim()) { error.value = 'Empfänger angeben'; return }
  if (!sendForm.amount || sendForm.amount < 1) { error.value = 'Betrag muss ≥ 1 sein'; return }
  busy.value = true
  try {
    const name = sendForm.username.trim()
    const escaped = name.replace(/[\\_%]/g, '\\$&')
    const { data: rcpt } = await supabase.from('profiles')
      .select('username').ilike('username', escaped).maybeSingle()
    if (!rcpt) throw new Error('Empfänger nicht gefunden')
    await game.sendCoins(rcpt.username, sendForm.amount)
    success.value = `${formatCoins(sendForm.amount)} 🪙 gesendet`
    sendForm.username = ''
    sendForm.amount = 0
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

async function act(id, action) {
  error.value = ''; success.value = ''
  busy.value = true
  try {
    await game.persist()
    const { error: e } = await supabase.rpc(action, { p_trade_id: id })
    if (e) throw e
    success.value = action === 'accept_trade' ? 'Angenommen!'
      : action === 'decline_trade' ? 'Abgelehnt'
      : 'Zurückgezogen'
    await Promise.all([loadTrades(), game.load()])
  } catch (e) { error.value = e.message }
  finally { busy.value = false; setTimeout(() => success.value = '', 2500) }
}

async function loadTrades() {
  const [{ data: inc }, { data: out }, { data: hist }, { data: pub }] = await Promise.all([
    supabase.from('trades_view').select('*')
      .eq('addressee_id', auth.user.id).eq('status','pending')
      .order('created_at', { ascending: false }),
    supabase.from('trades_view').select('*')
      .eq('requester_id', auth.user.id).eq('status','pending')
      .order('created_at', { ascending: false }),
    supabase.from('trades_view').select('*')
      .or(`requester_id.eq.${auth.user.id},addressee_id.eq.${auth.user.id}`)
      .neq('status','pending')
      .order('closed_at', { ascending: false, nullsFirst: false })
      .limit(30),
    supabase.from('trades_view').select('*')
      .eq('is_public', true).eq('status','pending')
      .order('created_at', { ascending: false }).limit(50)
  ])
  incoming.value = inc || []
  outgoing.value = out || []
  history.value = hist || []
  publicTrades.value = pub || []
}

function togglePubAnimal(tradeId, animalId) {
  const cur = publicAccept.value[tradeId] || new Set()
  if (cur.has(animalId)) cur.delete(animalId); else cur.add(animalId)
  publicAccept.value = { ...publicAccept.value, [tradeId]: cur }
}

async function acceptPublic(t) {
  error.value = ''; success.value = ''
  const ids = [...(publicAccept.value[t.id] || [])]
  if (Number(t.addressee_coins) > game.displayCoins) { error.value = 'Nicht genug Münzen'; return }
  busy.value = true
  try {
    await game.persist()
    const { error: e } = await supabase.rpc('accept_public_trade', { p_trade_id: t.id, p_my_animals: ids })
    if (e) throw e
    success.value = 'Trade angenommen!'
    publicAccept.value = { ...publicAccept.value, [t.id]: new Set() }
    await Promise.all([loadTrades(), game.load()])
  } catch (e) { error.value = e.message }
  finally { busy.value = false; setTimeout(() => success.value = '', 2500) }
}

// --- Realtime
let channel
onMounted(async () => {
  await game.load()
  await loadTrades()
  // Prefill from ?partner= or ?send= query (from Freunde-Ansicht)
  const p = route.query.partner
  const s = route.query.send
  if (p) {
    tab.value = 'new'
    mode.value = 'trade'
    partnerUsername.value = String(p)
    lookupPartner()
  } else if (s) {
    tab.value = 'new'
    mode.value = 'send'
    sendForm.username = String(s)
  }
  channel = supabase.channel('trades-' + auth.user.id)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'trades',
      filter: `requester_id=eq.${auth.user.id}`
    }, async () => { await loadTrades() })
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'trades',
      filter: `addressee_id=eq.${auth.user.id}`
    }, async () => { await loadTrades() })
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'trades'
    }, async (payload) => {
      if (payload.new?.is_public || payload.old?.is_public) await loadTrades()
    })
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'profiles',
      filter: `id=eq.${auth.user.id}`
    }, (payload) => {
      if (payload.new?.coins != null) game.coins = Number(payload.new.coins)
    })
    .subscribe()
})
onUnmounted(() => { if (channel) supabase.removeChannel(channel) })

function summarize(t) {
  const reqChips = (t.requester_animal_details || []).map(a => speciesInfo(a.species).emoji).join('')
  const addChips = (t.addressee_animal_details || []).map(a => speciesInfo(a.species).emoji).join('')
  return { reqChips, addChips }
}
function tierBadge(a) {
  return tierInfo(a?.tier || 'normal').badge || ''
}
function tierColor(a) {
  return tierInfo(a?.tier || 'normal').color || ''
}
</script>

<template>
  <h1 class="title">🔄 Trade &amp; Senden</h1>

  <div class="tabs">
    <button :class="{ active: tab==='new' }" @click="tab='new'">➕ Neu</button>
    <button :class="{ active: tab==='in' }" @click="tab='in'">
      📥 Eingang<span v-if="incoming.length" class="pill">{{ incoming.length }}</span>
    </button>
    <button :class="{ active: tab==='out' }" @click="tab='out'">
      📤 Ausgang<span v-if="outgoing.length" class="pill">{{ outgoing.length }}</span>
    </button>
    <button :class="{ active: tab==='public' }" @click="tab='public'">
      🌐 Public<span v-if="publicTrades.length" class="pill" style="background:var(--accent-2);color:#001a15">{{ publicTrades.length }}</span>
    </button>
    <button :class="{ active: tab==='hist' }" @click="tab='hist'">🗂️</button>
  </div>

  <p v-if="error" class="error">{{ error }}</p>
  <p v-if="success" class="success">{{ success }}</p>

  <!-- NEU -->
  <template v-if="tab === 'new'">
    <div class="tabs small" style="margin-bottom:10px">
      <button :class="{ active: mode==='trade' }" @click="mode='trade'">🔄 Tausch</button>
      <button :class="{ active: mode==='send' }" @click="mode='send'">💸 Senden</button>
    </div>

    <!-- SENDEN -->
    <div v-if="mode === 'send'" class="card stack">
      <div class="subtitle" style="margin:0">Einseitige Münz-Überweisung, kein Einverständnis nötig.</div>
      <input v-model="sendForm.username" placeholder="Empfänger-Username" />
      <CoinInput v-model="sendForm.amount" placeholder="Betrag (z.B. 10M)" />
      <button class="btn full" :disabled="busy || !sendForm.username || !sendForm.amount" @click="sendGift">
        {{ busy ? '...' : 'Senden' }}
      </button>
    </div>

    <!-- TAUSCH -->
    <div v-else>
      <div class="card stack">
        <label class="row between" style="margin:0;gap:6px">
          <span><input type="checkbox" v-model="isPublicOffer" /> 🌐 Öffentlich posten</span>
          <span class="subtitle" style="margin:0">Jeder kann akzeptieren</span>
        </label>
        <template v-if="!isPublicOffer">
          <label class="subtitle" style="margin:0">Handelspartner</label>
          <input v-model="partnerUsername" placeholder="Username" autocomplete="off" />
        </template>
        <div v-else class="subtitle" style="margin:0">Nenne nur Münzen als Gegenleistung (keine konkreten Tier-IDs).</div>
        <div v-if="!isPublicOffer && partnerSearching" class="subtitle">Suche…</div>
        <div v-else-if="!isPublicOffer && partnerError" class="error">{{ partnerError }}</div>
        <div v-else-if="!isPublicOffer && partnerProfile" class="partner-card">
          <div class="partner-avatar">{{ partnerProfile.avatar_emoji || '👤' }}</div>
          <div style="flex:1">
            <div style="font-weight:700">{{ partnerProfile.username }}</div>
            <div class="subtitle" style="margin:0">🪙 {{ formatCoins(partnerProfile.coins) }} · {{ partnerAnimals.length }} tauschbare Tiere</div>
          </div>
          <router-link
            class="btn secondary small"
            :to="{ name: 'profile', query: { u: partnerProfile.username } }"
          >Profil</router-link>
        </div>
      </div>

      <div v-if="isPublicOffer || partnerProfile" class="trade-box">
        <!-- Ich gebe -->
        <div class="side">
          <div class="side-title">
            <span class="who">{{ auth.profile?.username }}</span>
            <span class="arrow">→</span>
          </div>
          <div class="slots">
            <div v-for="id in offer.myAnimals" :key="id" class="chip-anim"
                 @click="toggleMine(id)">
              <span>{{ speciesInfo(myTradableAnimals.find(a=>a.id===id)?.species).emoji }}<sup v-if="tierBadge(myTradableAnimals.find(a=>a.id===id))" class="tb">{{ tierBadge(myTradableAnimals.find(a=>a.id===id)) }}</sup></span>
              <span class="x">×</span>
            </div>
            <button class="chip-add" @click="pickerOpen = pickerOpen==='mine'?'':'mine'">＋ Tier</button>
          </div>
          <CoinInput v-model="offer.myCoins" placeholder="Münzen (optional)" />

          <div v-if="pickerOpen==='mine'" class="picker">
            <div v-if="!myTradableAnimals.length" class="subtitle">Keine tauschbaren Tiere. Rüste sie zuerst ab.</div>
            <div v-else class="picker-grid">
              <div v-for="a in myTradableAnimals" :key="a.id" class="pick" :class="{ active: offer.myAnimals.has(a.id), tiered: a.tier && a.tier !== 'normal' }" :style="{ '--tb': a.td.color }" @click="toggleMine(a.id)">
                <div class="pick-emoji">{{ a.info.emoji }}<sup v-if="a.td.badge" class="tb">{{ a.td.badge }}</sup></div>
                <div class="pick-name">{{ a.info.name }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="vs">⇅</div>

        <!-- Ich will -->
        <div class="side">
          <div class="side-title">
            <span class="arrow">←</span>
            <span class="who">{{ isPublicOffer ? 'Beliebiger Annehmer' : partnerProfile.username }}</span>
          </div>
          <div v-if="!isPublicOffer" class="slots">
            <div v-for="id in offer.theirAnimals" :key="id" class="chip-anim"
                 @click="toggleTheirs(id)">
              <span>{{ speciesInfo(partnerAnimals.find(a=>a.id===id)?.species).emoji }}<sup v-if="tierBadge(partnerAnimals.find(a=>a.id===id))" class="tb">{{ tierBadge(partnerAnimals.find(a=>a.id===id)) }}</sup></span>
              <span class="x">×</span>
            </div>
            <button class="chip-add" @click="pickerOpen = pickerOpen==='theirs'?'':'theirs'">＋ Tier</button>
          </div>
          <CoinInput v-model="offer.theirCoins" placeholder="Münzen (optional)" />

          <div v-if="pickerOpen==='theirs'" class="picker">
            <div v-if="!partnerAnimals.length" class="subtitle">Dieser Spieler hat keine tauschbaren Tiere.</div>
            <div v-else class="picker-grid">
              <div v-for="a in partnerAnimals" :key="a.id" class="pick" :class="{ active: offer.theirAnimals.has(a.id), tiered: a.tier && a.tier !== 'normal' }" :style="{ '--tb': a.td.color }" @click="toggleTheirs(a.id)">
                <div class="pick-emoji">{{ a.info.emoji }}<sup v-if="a.td.badge" class="tb">{{ a.td.badge }}</sup></div>
                <div class="pick-name">{{ a.info.name }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="isPublicOffer || partnerProfile" class="card stack">
        <input v-model="offer.note" maxlength="200" placeholder="Notiz (optional)" />
        <button class="btn full" :disabled="busy" @click="propose">
          {{ busy ? '...' : (isPublicOffer ? 'Öffentlich posten' : 'Trade-Anfrage senden') }}
        </button>
      </div>
    </div>
  </template>

  <!-- PUBLIC -->
  <template v-if="tab === 'public'">
    <p class="subtitle">Öffentliche Angebote — jeder kann annehmen, der die verlangten Münzen/Tiere hat.</p>
    <div v-if="!publicTrades.length" class="card subtitle">Keine öffentlichen Trades.</div>
    <div v-for="t in publicTrades" :key="t.id" class="trade-row card">
      <div class="row between">
        <div style="font-weight:700">Von {{ t.requester_username }}</div>
        <span class="subtitle" style="margin:0">{{ new Date(t.created_at).toLocaleString('de-DE') }}</span>
      </div>
      <div class="row sides-mini">
        <div class="side-mini">
          <div class="mini-label">Bietet</div>
          <div class="mini-row">
            <span v-for="a in t.requester_animal_details" :key="a.id" class="e" :style="{ '--tb': tierColor(a) }" :class="{ tiered: (a.tier && a.tier !== 'normal') }">{{ speciesInfo(a.species).emoji }}<sup v-if="tierBadge(a)" class="tb">{{ tierBadge(a) }}</sup></span>
            <span v-if="Number(t.requester_coins) > 0" class="coins">🪙 {{ formatCoins(t.requester_coins) }}</span>
            <span v-if="!t.requester_animal_details.length && Number(t.requester_coins) === 0" class="subtitle">nichts</span>
          </div>
        </div>
        <div class="arrow-mini">⇄</div>
        <div class="side-mini">
          <div class="mini-label">Verlangt</div>
          <div class="mini-row">
            <span v-if="Number(t.addressee_coins) > 0" class="coins">🪙 {{ formatCoins(t.addressee_coins) }}</span>
            <span v-else class="subtitle">frei (optional Tiere)</span>
          </div>
        </div>
      </div>
      <div v-if="t.note" class="subtitle" style="margin:4px 0 0">„{{ t.note }}"</div>
      <template v-if="t.requester_id !== auth.user.id">
        <div class="subtitle" style="margin:6px 0 4px">Optional: Tiere mitgeben</div>
        <div class="picker-grid">
          <div v-for="a in myTradableAnimals" :key="a.id"
               class="pick"
               :class="{ active: (publicAccept[t.id] || new Set()).has(a.id), tiered: a.tier && a.tier !== 'normal' }"
               :style="{ '--tb': a.td.color }"
               @click="togglePubAnimal(t.id, a.id)">
            <div class="pick-emoji">{{ a.info.emoji }}<sup v-if="a.td.badge" class="tb">{{ a.td.badge }}</sup></div>
            <div class="pick-name">{{ a.info.name }}</div>
          </div>
        </div>
        <button class="btn full" style="margin-top:8px" :disabled="busy" @click="acceptPublic(t)">
          {{ busy ? '...' : 'Annehmen' }}
        </button>
      </template>
      <div v-else class="row" style="gap:6px;margin-top:8px">
        <span class="badge">Dein Angebot</span>
        <button class="btn danger small" :disabled="busy" @click="act(t.id, 'cancel_trade')">Zurückziehen</button>
      </div>
    </div>
  </template>

  <!-- EINGANG -->
  <template v-if="tab === 'in'">
    <div v-if="!incoming.length" class="card subtitle">Keine offenen Anfragen.</div>
    <div v-for="t in incoming" :key="t.id" class="trade-row card">
      <div class="row between">
        <div style="font-weight:700">Von {{ t.requester_username }}</div>
        <span class="subtitle" style="margin:0">{{ new Date(t.created_at).toLocaleString('de-DE') }}</span>
      </div>
      <div class="row sides-mini">
        <div class="side-mini">
          <div class="mini-label">Du bekommst</div>
          <div class="mini-row">
            <span v-for="a in t.requester_animal_details" :key="a.id" class="e" :style="{ '--tb': tierColor(a) }" :class="{ tiered: (a.tier && a.tier !== 'normal') }">{{ speciesInfo(a.species).emoji }}<sup v-if="tierBadge(a)" class="tb">{{ tierBadge(a) }}</sup></span>
            <span v-if="Number(t.requester_coins) > 0" class="coins">🪙 {{ formatCoins(t.requester_coins) }}</span>
            <span v-if="!t.requester_animal_details.length && Number(t.requester_coins) === 0" class="subtitle">nichts</span>
          </div>
        </div>
        <div class="arrow-mini">⇄</div>
        <div class="side-mini">
          <div class="mini-label">Du gibst</div>
          <div class="mini-row">
            <span v-for="a in t.addressee_animal_details" :key="a.id" class="e" :style="{ '--tb': tierColor(a) }" :class="{ tiered: (a.tier && a.tier !== 'normal') }">{{ speciesInfo(a.species).emoji }}<sup v-if="tierBadge(a)" class="tb">{{ tierBadge(a) }}</sup></span>
            <span v-if="Number(t.addressee_coins) > 0" class="coins">🪙 {{ formatCoins(t.addressee_coins) }}</span>
            <span v-if="!t.addressee_animal_details.length && Number(t.addressee_coins) === 0" class="subtitle">nichts</span>
          </div>
        </div>
      </div>
      <div v-if="t.note" class="subtitle" style="margin:4px 0 0">„{{ t.note }}"</div>
      <div class="row" style="gap:6px;margin-top:8px">
        <button class="btn" :disabled="busy" @click="act(t.id, 'accept_trade')">✓ Annehmen</button>
        <button class="btn secondary" :disabled="busy" @click="act(t.id, 'decline_trade')">✗ Ablehnen</button>
      </div>
    </div>
  </template>

  <!-- AUSGANG -->
  <template v-if="tab === 'out'">
    <div v-if="!outgoing.length" class="card subtitle">Keine gesendeten Anfragen offen.</div>
    <div v-for="t in outgoing" :key="t.id" class="trade-row card">
      <div class="row between">
        <div style="font-weight:700">An {{ t.addressee_username }}</div>
        <span class="subtitle" style="margin:0">{{ new Date(t.created_at).toLocaleString('de-DE') }}</span>
      </div>
      <div class="row sides-mini">
        <div class="side-mini">
          <div class="mini-label">Du gibst</div>
          <div class="mini-row">
            <span v-for="a in t.requester_animal_details" :key="a.id" class="e" :style="{ '--tb': tierColor(a) }" :class="{ tiered: (a.tier && a.tier !== 'normal') }">{{ speciesInfo(a.species).emoji }}<sup v-if="tierBadge(a)" class="tb">{{ tierBadge(a) }}</sup></span>
            <span v-if="Number(t.requester_coins) > 0" class="coins">🪙 {{ formatCoins(t.requester_coins) }}</span>
          </div>
        </div>
        <div class="arrow-mini">⇄</div>
        <div class="side-mini">
          <div class="mini-label">Du bekommst</div>
          <div class="mini-row">
            <span v-for="a in t.addressee_animal_details" :key="a.id" class="e" :style="{ '--tb': tierColor(a) }" :class="{ tiered: (a.tier && a.tier !== 'normal') }">{{ speciesInfo(a.species).emoji }}<sup v-if="tierBadge(a)" class="tb">{{ tierBadge(a) }}</sup></span>
            <span v-if="Number(t.addressee_coins) > 0" class="coins">🪙 {{ formatCoins(t.addressee_coins) }}</span>
          </div>
        </div>
      </div>
      <button class="btn danger" :disabled="busy" @click="act(t.id, 'cancel_trade')" style="margin-top:8px">Zurückziehen</button>
    </div>
  </template>

  <!-- HISTORIE -->
  <template v-if="tab === 'hist'">
    <div v-if="!history.length" class="card subtitle">Noch keine abgeschlossenen Trades.</div>
    <div v-for="t in history" :key="t.id" class="trade-row card" :class="'status-' + t.status">
      <div class="row between">
        <div style="font-weight:700">
          <template v-if="t.requester_id === auth.user.id">An {{ t.addressee_username }}</template>
          <template v-else>Von {{ t.requester_username }}</template>
          · <span class="badge">{{ t.status }}</span>
        </div>
        <span class="subtitle" style="margin:0">{{ new Date(t.closed_at || t.created_at).toLocaleString('de-DE') }}</span>
      </div>
      <div class="row sides-mini">
        <div class="side-mini">
          <div class="mini-row">
            <span v-for="a in t.requester_animal_details" :key="a.id" class="e" :style="{ '--tb': tierColor(a) }" :class="{ tiered: (a.tier && a.tier !== 'normal') }">{{ speciesInfo(a.species).emoji }}<sup v-if="tierBadge(a)" class="tb">{{ tierBadge(a) }}</sup></span>
            <span v-if="Number(t.requester_coins) > 0" class="coins">🪙 {{ formatCoins(t.requester_coins) }}</span>
          </div>
        </div>
        <div class="arrow-mini">⇄</div>
        <div class="side-mini">
          <div class="mini-row">
            <span v-for="a in t.addressee_animal_details" :key="a.id" class="e" :style="{ '--tb': tierColor(a) }" :class="{ tiered: (a.tier && a.tier !== 'normal') }">{{ speciesInfo(a.species).emoji }}<sup v-if="tierBadge(a)" class="tb">{{ tierBadge(a) }}</sup></span>
            <span v-if="Number(t.addressee_coins) > 0" class="coins">🪙 {{ formatCoins(t.addressee_coins) }}</span>
          </div>
        </div>
      </div>
    </div>
  </template>
</template>

<style scoped>
.tabs.small button { padding: 6px 10px; font-size: 13px; }
.pill { display:inline-block; margin-left:6px; padding:1px 6px; border-radius:999px; background:var(--danger); color:#fff; font-size:10px; font-weight:800; }
.partner-card { display:flex; gap:10px; align-items:center; padding:8px; background:var(--card-2); border-radius:10px; }
.partner-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: #162048; border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; flex-shrink: 0;
}

/* Trade-Box */
.trade-box {
  display: grid; grid-template-columns: 1fr auto 1fr;
  gap: 6px; align-items: stretch;
  margin-bottom: 12px;
}
.side {
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 10px; min-width: 0;
  display: flex; flex-direction: column; gap: 8px;
}
.side-title { display:flex; align-items:center; gap:6px; font-weight:700; font-size:13px; }
.side-title .who { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.side-title .arrow { color:var(--accent); font-size:18px; }
.vs {
  display:flex; align-items:center; justify-content:center;
  font-size: 22px; color: var(--accent); font-weight: 800;
}
.slots {
  display:flex; flex-wrap:wrap; gap:6px; min-height:52px;
  background: var(--card-2); border-radius: 10px; padding: 8px;
}
.chip-anim {
  display:inline-flex; align-items:center; gap:4px;
  background: rgba(255,209,102,0.1); border:1px solid var(--accent);
  color: var(--accent); padding: 6px 8px; border-radius: 10px;
  font-size: 20px; cursor: pointer;
}
.chip-anim .x { font-size: 12px; opacity: 0.6; }
.chip-add {
  background: transparent; border: 1px dashed var(--border);
  color: var(--muted); padding: 6px 10px; border-radius: 10px;
  font-size: 12px; cursor: pointer;
}
.picker {
  margin-top: 4px; background: var(--card-2); border-radius: 10px; padding: 8px;
  max-height: 220px; overflow: auto;
}
.picker-grid {
  display:grid; grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)); gap:6px;
}
.pick {
  background: var(--card); border: 1px solid var(--border); border-radius: 10px;
  padding: 6px 4px; text-align: center; cursor: pointer;
}
.pick.active { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent) inset; }
.pick-emoji { font-size: 22px; line-height: 1; }
.pick-name { font-size: 10px; color: var(--muted); margin-top: 2px; }

/* Mini-Zeilen (Eingang/Ausgang/History) */
.sides-mini { display:flex; align-items:center; gap:6px; margin-top:6px; }
.side-mini { flex:1; min-width:0; background: var(--card-2); border-radius: 10px; padding: 6px 8px; }
.mini-label { font-size:10px; color: var(--muted); }
.mini-row { display:flex; flex-wrap:wrap; gap:4px; align-items:center; font-size: 20px; }
.mini-row .coins { font-size: 13px; color: var(--accent); font-weight: 700; }
.arrow-mini { font-size: 16px; color: var(--accent); font-weight: 800; }
.tb {
  font-size: 0.55em; vertical-align: super; line-height: 1;
  margin-left: -2px;
}
.pick.tiered { border-color: var(--tb, var(--accent)); box-shadow: 0 0 0 1px var(--tb, transparent) inset; }
.e.tiered { filter: drop-shadow(0 0 2px var(--tb, transparent)); }
.status-accepted .badge { background: rgba(6,214,160,0.15); color: var(--accent-2); }
.status-declined .badge, .status-cancelled .badge { background: rgba(239,71,111,0.15); color: var(--danger); }
</style>
