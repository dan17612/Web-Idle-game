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
const hiddenTradeIds = ref(new Set())
const publicAccept = ref({})
const isPublicOffer = ref(false)

function fmtExpiry(t) {
  if (!t.expires_at) return ''
  const ms = new Date(t.expires_at).getTime() - Date.now()
  if (ms <= 0) return 'abgelaufen'
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  if (d >= 1) return `${d}d ${h}h`
  const m = Math.floor((ms % 3600000) / 60000)
  return `${h}h ${m}m`
}

async function hidePublicTrade(id) {
  hiddenTradeIds.value = new Set([...hiddenTradeIds.value, id])
  await supabase.rpc('hide_trade', { p_trade_id: id })
}

const visiblePublicTrades = computed(() =>
  publicTrades.value.filter(t => !hiddenTradeIds.value.has(t.id))
)

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

function groupByKey(list) {
  const m = new Map()
  for (const a of list) {
    const key = a.species + '|' + (a.tier || 'normal')
    if (!m.has(key)) m.set(key, { key, species: a.species, tier: a.tier || 'normal', info: a.info || speciesInfo(a.species), td: a.td || tierInfo(a.tier || 'normal'), list: [] })
    m.get(key).list.push(a)
  }
  return [...m.values()].sort((a, b) => (a.td.order || 0) - (b.td.order || 0) || a.info.name.localeCompare(b.info.name))
}

const myGroups = computed(() => groupByKey(myTradableAnimals.value))
const partnerGroups = computed(() => groupByKey(partnerAnimals.value))

function selectedCount(selectedSet, groupList) {
  let n = 0
  for (const a of groupList) if (selectedSet.has(a.id)) n++
  return n
}
function myGroupSelected(group) { return selectedCount(offer.myAnimals, group.list) }
function theirGroupSelected(group) { return selectedCount(offer.theirAnimals, group.list) }

function addFromGroup(selectedSet, groupList) {
  for (const a of groupList) if (!selectedSet.has(a.id)) { selectedSet.add(a.id); return true }
  return false
}
function removeFromGroup(selectedSet, groupList) {
  for (let i = groupList.length - 1; i >= 0; i--) {
    if (selectedSet.has(groupList[i].id)) { selectedSet.delete(groupList[i].id); return true }
  }
  return false
}

function toggleMineGroup(group, remove = false) {
  if (remove) removeFromGroup(offer.myAnimals, group.list)
  else addFromGroup(offer.myAnimals, group.list)
}
function toggleTheirsGroup(group, remove = false) {
  if (remove) removeFromGroup(offer.theirAnimals, group.list)
  else addFromGroup(offer.theirAnimals, group.list)
}

const mySelectedGroups = computed(() => myGroups.value.map(g => ({ ...g, selected: myGroupSelected(g) })).filter(g => g.selected > 0))
const theirSelectedGroups = computed(() => partnerGroups.value.map(g => ({ ...g, selected: theirGroupSelected(g) })).filter(g => g.selected > 0))

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
  try { await supabase.rpc('expire_old_trades') } catch {}
  const { data: hides } = await supabase.from('trade_hides').select('trade_id').eq('user_id', auth.user.id)
  hiddenTradeIds.value = new Set((hides || []).map(h => h.trade_id))
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

function pubGroupSelected(tradeId, group) {
  const set = publicAccept.value[tradeId]
  if (!set) return 0
  let n = 0
  for (const a of group.list) if (set.has(a.id)) n++
  return n
}
function togglePubGroup(tradeId, group, remove = false) {
  const cur = publicAccept.value[tradeId] || new Set()
  if (remove) removeFromGroup(cur, group.list)
  else addFromGroup(cur, group.list)
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
    <Button :class="{ active: tab==='new' }" @click="tab='new'">➕ Neu</Button>
    <Button :class="{ active: tab==='in' }" @click="tab='in'">
      📥 Eingang<span v-if="incoming.length" class="pill">{{ incoming.length }}</span>
    </Button>
    <Button :class="{ active: tab==='out' }" @click="tab='out'">
      📤 Ausgang<span v-if="outgoing.length" class="pill">{{ outgoing.length }}</span>
    </Button>
    <Button :class="{ active: tab==='public' }" @click="tab='public'">
      🌐 Public<span v-if="visiblePublicTrades.length" class="pill" style="background:var(--accent-2);color:#001a15">{{ visiblePublicTrades.length }}</span>
    </Button>
    <Button :class="{ active: tab==='hist' }" @click="tab='hist'">🗂️</Button>
  </div>

  <p v-if="error" class="error">{{ error }}</p>
  <p v-if="success" class="success">{{ success }}</p>

  <!-- NEU -->
  <template v-if="tab === 'new'">
    <div class="tabs small" style="margin-bottom:10px">
      <Button :class="{ active: mode==='trade' }" @click="mode='trade'">🔄 Tausch</Button>
      <Button :class="{ active: mode==='send' }" @click="mode='send'">💸 Senden</Button>
    </div>

    <!-- SENDEN -->
    <div v-if="mode === 'send'" class="card stack">
      <div class="subtitle" style="margin:0">Einseitige Münz-Überweisung, kein Einverständnis nötig.</div>
      <InputText v-model="sendForm.username" placeholder="Empfänger-Username" />
      <CoinInput v-model="sendForm.amount" placeholder="Betrag (z.B. 10M)" />
      <Button class="btn full" :disabled="busy || !sendForm.username || !sendForm.amount" @click="sendGift">
        {{ busy ? '...' : 'Senden' }}
      </Button>
    </div>

    <!-- TAUSCH -->
    <div v-else>
      <div class="card stack">
        <label class="row between" style="margin:0;gap:6px">
          <span class="row" style="gap:6px;align-items:center"><Checkbox v-model="isPublicOffer" binary /> 🌐 Öffentlich posten</span>
          <span class="subtitle" style="margin:0">Jeder kann akzeptieren</span>
        </label>
        <template v-if="!isPublicOffer">
          <label class="subtitle" style="margin:0">Handelspartner</label>
          <InputText v-model="partnerUsername" placeholder="Username" autocomplete="off" />
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
            <div v-for="g in mySelectedGroups" :key="g.key" class="chip-anim" @click="toggleMineGroup(g, true)">
              <span>{{ g.info.emoji }}<sup v-if="g.td.badge" class="tb">{{ g.td.badge }}</sup></span>
              <span class="chip-count">×{{ g.selected }}</span>
            </div>
            <Button class="chip-add" @click="pickerOpen = pickerOpen==='mine'?'':'mine'">＋ Tier</Button>
          </div>
          <CoinInput v-model="offer.myCoins" placeholder="Münzen (optional)" />

          <div v-if="pickerOpen==='mine'" class="picker">
            <div v-if="!myGroups.length" class="subtitle">Keine tauschbaren Tiere. Rüste sie zuerst ab.</div>
            <div v-else class="picker-grid">
              <div v-for="g in myGroups" :key="g.key"
                   class="pick"
                   :class="{ active: myGroupSelected(g) > 0, tiered: g.tier !== 'normal' }"
                   :style="{ '--tb': g.td.color }"
                   @click="toggleMineGroup(g)"
                   @contextmenu.prevent="toggleMineGroup(g, true)">
                <div class="pick-emoji">{{ g.info.emoji }}<sup v-if="g.td.badge" class="tb">{{ g.td.badge }}</sup></div>
                <div class="pick-name">{{ g.info.name }}</div>
                <div class="pick-count">
                  <span v-if="myGroupSelected(g) > 0" class="pick-selected">{{ myGroupSelected(g) }}/</span>{{ g.list.length }}
                </div>
              </div>
            </div>
            <div v-if="myGroups.length" class="subtitle" style="margin-top:6px;font-size:11px">
              Klick = +1 · Rechtsklick/Chip-Klick = −1
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
            <div v-for="g in theirSelectedGroups" :key="g.key" class="chip-anim" @click="toggleTheirsGroup(g, true)">
              <span>{{ g.info.emoji }}<sup v-if="g.td.badge" class="tb">{{ g.td.badge }}</sup></span>
              <span class="chip-count">×{{ g.selected }}</span>
            </div>
            <Button class="chip-add" @click="pickerOpen = pickerOpen==='theirs'?'':'theirs'">＋ Tier</Button>
          </div>
          <CoinInput v-model="offer.theirCoins" placeholder="Münzen (optional)" />

          <div v-if="pickerOpen==='theirs'" class="picker">
            <div v-if="!partnerGroups.length" class="subtitle">Dieser Spieler hat keine tauschbaren Tiere.</div>
            <div v-else class="picker-grid">
              <div v-for="g in partnerGroups" :key="g.key"
                   class="pick"
                   :class="{ active: theirGroupSelected(g) > 0, tiered: g.tier !== 'normal' }"
                   :style="{ '--tb': g.td.color }"
                   @click="toggleTheirsGroup(g)"
                   @contextmenu.prevent="toggleTheirsGroup(g, true)">
                <div class="pick-emoji">{{ g.info.emoji }}<sup v-if="g.td.badge" class="tb">{{ g.td.badge }}</sup></div>
                <div class="pick-name">{{ g.info.name }}</div>
                <div class="pick-count">
                  <span v-if="theirGroupSelected(g) > 0" class="pick-selected">{{ theirGroupSelected(g) }}/</span>{{ g.list.length }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="isPublicOffer || partnerProfile" class="card stack">
        <InputText v-model="offer.note" maxlength="200" placeholder="Notiz (optional)" />
        <Button class="btn full" :disabled="busy" @click="propose">
          {{ busy ? '...' : (isPublicOffer ? 'Öffentlich posten' : 'Trade-Anfrage senden') }}
        </Button>
      </div>
    </div>
  </template>

  <!-- PUBLIC -->
  <template v-if="tab === 'public'">
    <p class="subtitle">Öffentliche Angebote — jeder kann annehmen, der die verlangten Münzen/Tiere hat.</p>
    <div v-if="!visiblePublicTrades.length" class="card subtitle">Keine öffentlichen Trades.</div>
    <div v-for="t in visiblePublicTrades" :key="t.id" class="trade-row card">
      <div class="row between">
        <div style="font-weight:700">Von {{ t.requester_username }}</div>
        <div class="row" style="gap:6px;align-items:center">
          <span v-if="t.expires_at" class="badge" title="Läuft in">⏳ {{ fmtExpiry(t) }}</span>
          <Button
            v-if="t.requester_id !== auth.user.id"
            class="btn secondary small"
            title="Ausblenden"
            @click="hidePublicTrade(t.id)"
          >🙈</Button>
          <span class="subtitle" style="margin:0">{{ new Date(t.created_at).toLocaleString('de-DE') }}</span>
        </div>
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
          <div v-for="g in myGroups" :key="g.key"
               class="pick"
               :class="{ active: pubGroupSelected(t.id, g) > 0, tiered: g.tier !== 'normal' }"
               :style="{ '--tb': g.td.color }"
               @click="togglePubGroup(t.id, g)"
               @contextmenu.prevent="togglePubGroup(t.id, g, true)">
            <div class="pick-emoji">{{ g.info.emoji }}<sup v-if="g.td.badge" class="tb">{{ g.td.badge }}</sup></div>
            <div class="pick-name">{{ g.info.name }}</div>
            <div class="pick-count">
              <span v-if="pubGroupSelected(t.id, g) > 0" class="pick-selected">{{ pubGroupSelected(t.id, g) }}/</span>{{ g.list.length }}
            </div>
          </div>
        </div>
        <Button class="btn full" style="margin-top:8px" :disabled="busy" @click="acceptPublic(t)">
          {{ busy ? '...' : 'Annehmen' }}
        </Button>
      </template>
      <div v-else class="row" style="gap:6px;margin-top:8px">
        <span class="badge">Dein Angebot</span>
        <Button class="btn danger small" :disabled="busy" @click="act(t.id, 'cancel_trade')">Zurückziehen</Button>
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
        <Button class="btn" :disabled="busy" @click="act(t.id, 'accept_trade')">✓ Annehmen</Button>
        <Button class="btn secondary" :disabled="busy" @click="act(t.id, 'decline_trade')">✗ Ablehnen</Button>
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
      <Button class="btn danger" :disabled="busy" @click="act(t.id, 'cancel_trade')" style="margin-top:8px">Zurückziehen</Button>
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
.tabs.small button,
.tabs.small .p-button { padding: 6px 10px; font-size: 13px; }
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
.chip-count { font-size: 13px; font-weight: 700; opacity: 0.9; }
.pick { position: relative; }
.pick-count { font-size: 10px; color: var(--muted); margin-top: 1px; }
.pick-selected { color: var(--accent); font-weight: 800; }
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
