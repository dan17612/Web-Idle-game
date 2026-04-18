<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { supabase } from '../supabase'
import { useAuthStore } from '../stores/auth'
import { useGameStore } from '../stores/game'
import { speciesInfo, formatCoins, SPECIES } from '../animals'

const auth = useAuthStore()
const game = useGameStore()

const tab = ref('browse')
const offers = ref([])
const myOffers = ref([])
const friendIds = ref(new Set())
const error = ref('')
const success = ref('')
const busy = ref(false)

const form = reactive({
  animalId: '',
  price: 1000,
  toUsername: ''
})

const filters = reactive({
  species: '',        // '' = alle
  minPrice: null,
  maxPrice: null,
  onlyFriends: false,
  affordable: false,
  sort: 'new'         // new | price_asc | price_desc
})

const myAnimals = computed(() => game.animals.map(a => ({ ...a, info: speciesInfo(a.species) })))

async function loadOffers() {
  const [{ data: browse }, { data: mine }, { data: fr }] = await Promise.all([
    supabase.from('trade_offers_with_names').select('*')
      .eq('status', 'open').neq('seller_id', auth.user.id)
      .order('created_at', { ascending: false }).limit(200),
    supabase.from('trade_offers_with_names').select('*')
      .eq('seller_id', auth.user.id)
      .order('created_at', { ascending: false }).limit(50),
    supabase.from('friends_view').select('friend_id, status').eq('status', 'accepted')
  ])
  offers.value = browse || []
  myOffers.value = mine || []
  friendIds.value = new Set((fr || []).map(f => f.friend_id))
}

const filteredOffers = computed(() => {
  let list = offers.value.slice()

  if (filters.species) list = list.filter(o => o.species === filters.species)
  if (filters.minPrice != null && filters.minPrice !== '') {
    const min = Number(filters.minPrice)
    if (!isNaN(min)) list = list.filter(o => Number(o.price) >= min)
  }
  if (filters.maxPrice != null && filters.maxPrice !== '') {
    const max = Number(filters.maxPrice)
    if (!isNaN(max)) list = list.filter(o => Number(o.price) <= max)
  }
  if (filters.onlyFriends) list = list.filter(o => friendIds.value.has(o.seller_id))
  if (filters.affordable) list = list.filter(o => Number(o.price) <= game.displayCoins)

  if (filters.sort === 'price_asc')  list.sort((a, b) => Number(a.price) - Number(b.price))
  else if (filters.sort === 'price_desc') list.sort((a, b) => Number(b.price) - Number(a.price))
  else list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return list
})

function resetFilters() {
  filters.species = ''
  filters.minPrice = null
  filters.maxPrice = null
  filters.onlyFriends = false
  filters.affordable = false
  filters.sort = 'new'
}

onMounted(async () => {
  await game.load()
  await loadOffers()
})

async function createOffer() {
  error.value = ''; success.value = ''
  busy.value = true
  try {
    if (!form.animalId) throw new Error('Wähle ein Tier')
    const { error: e } = await supabase.rpc('create_trade_offer', {
      p_animal_id: form.animalId,
      p_price: Math.floor(form.price),
      p_to_username: form.toUsername?.trim() || null
    })
    if (e) throw e
    success.value = 'Angebot erstellt!'
    form.animalId = ''
    await game.load()
    await loadOffers()
  } catch (e) { error.value = e.message } finally { busy.value = false }
}

async function buyOffer(id) {
  error.value = ''; success.value = ''
  busy.value = true
  try {
    await game.persist()
    const { error: e } = await supabase.rpc('accept_trade_offer', { p_offer_id: id })
    if (e) throw e
    success.value = 'Gekauft!'
    await game.load()
    await loadOffers()
  } catch (e) { error.value = e.message } finally { busy.value = false }
}

async function cancelOffer(id) {
  error.value = ''; success.value = ''
  busy.value = true
  try {
    const { error: e } = await supabase.rpc('cancel_trade_offer', { p_offer_id: id })
    if (e) throw e
    success.value = 'Angebot zurückgezogen.'
    await game.load()
    await loadOffers()
  } catch (e) { error.value = e.message } finally { busy.value = false }
}
</script>

<template>
  <h1 class="title">🔄 Marktplatz</h1>

  <div class="tabs">
    <button :class="{ active: tab==='browse' }" @click="tab='browse'">Angebote</button>
    <button :class="{ active: tab==='create' }" @click="tab='create'">Verkaufen</button>
    <button :class="{ active: tab==='mine' }" @click="tab='mine'">Meine</button>
  </div>

  <p v-if="error" class="error">{{ error }}</p>
  <p v-if="success" class="success">{{ success }}</p>

  <template v-if="tab==='browse'">
    <div class="card filters">
      <div class="filter-row">
        <label class="filter">
          <span class="lbl">Tier</span>
          <select v-model="filters.species">
            <option value="">Alle</option>
            <option v-for="(info, key) in SPECIES" :key="key" :value="key">
              {{ info.emoji }} {{ info.name }}
            </option>
          </select>
        </label>
        <label class="filter">
          <span class="lbl">Sortieren</span>
          <select v-model="filters.sort">
            <option value="new">Neueste zuerst</option>
            <option value="price_asc">Preis aufsteigend</option>
            <option value="price_desc">Preis absteigend</option>
          </select>
        </label>
      </div>
      <div class="filter-row">
        <label class="filter">
          <span class="lbl">Preis von</span>
          <input type="number" min="0" v-model.number="filters.minPrice" placeholder="0" />
        </label>
        <label class="filter">
          <span class="lbl">bis</span>
          <input type="number" min="0" v-model.number="filters.maxPrice" placeholder="∞" />
        </label>
      </div>
      <div class="filter-chips">
        <label class="chip" :class="{ active: filters.onlyFriends }">
          <input type="checkbox" v-model="filters.onlyFriends" hidden />
          🤝 Nur Freunde
        </label>
        <label class="chip" :class="{ active: filters.affordable }">
          <input type="checkbox" v-model="filters.affordable" hidden />
          💰 Bezahlbar
        </label>
        <button class="chip reset" @click="resetFilters">↺ Zurücksetzen</button>
      </div>
    </div>

    <div class="card">
      <div v-if="!offers.length" class="subtitle">Aktuell keine Angebote. Sei der Erste!</div>
      <div v-else-if="!filteredOffers.length" class="subtitle">
        Keine Angebote passen zu den Filtern.
      </div>
      <div v-else>
        <div class="subtitle" style="margin-bottom:6px">
          {{ filteredOffers.length }} Angebot{{ filteredOffers.length === 1 ? '' : 'e' }}
        </div>
        <div v-for="o in filteredOffers" :key="o.id" class="list-item">
          <div class="left">{{ speciesInfo(o.species).emoji }}</div>
          <div class="body">
            <div class="title-sm">
              {{ speciesInfo(o.species).name }}
              <span v-if="friendIds.has(o.seller_id)" class="badge" style="margin-left:4px">🤝 Freund</span>
            </div>
            <div class="sub">von {{ o.seller_username }} · 🪙 {{ formatCoins(o.price) }}</div>
          </div>
          <button class="btn" :disabled="busy || game.displayCoins < o.price" @click="buyOffer(o.id)">Kaufen</button>
        </div>
      </div>
    </div>
  </template>

  <div v-if="tab==='create'" class="card stack">
    <div v-if="!myAnimals.length" class="subtitle">Du hast noch keine Tiere zum Verkaufen.</div>
    <template v-else>
      <label class="subtitle">Tier</label>
      <select v-model="form.animalId">
        <option value="">— wählen —</option>
        <option v-for="a in myAnimals" :key="a.id" :value="a.id">
          {{ a.info.emoji }} {{ a.info.name }}
        </option>
      </select>
      <label class="subtitle">Preis (🪙)</label>
      <input v-model.number="form.price" type="number" min="1" />
      <label class="subtitle">Nur an Spieler (optional)</label>
      <input v-model="form.toUsername" placeholder="Username oder leer = offen" />
      <button class="btn full" :disabled="busy" @click="createOffer">Anbieten</button>
    </template>
  </div>

  <div v-if="tab==='mine'" class="card">
    <div v-if="!myOffers.length" class="subtitle">Keine eigenen Angebote.</div>
    <div v-for="o in myOffers" :key="o.id" class="list-item">
      <div class="left">{{ speciesInfo(o.species).emoji }}</div>
      <div class="body">
        <div class="title-sm">{{ speciesInfo(o.species).name }} · 🪙 {{ formatCoins(o.price) }}</div>
        <div class="sub">
          Status: <span class="badge">{{ o.status }}</span>
          <template v-if="o.to_username"> · nur an {{ o.to_username }}</template>
        </div>
      </div>
      <button v-if="o.status==='open'" class="btn danger" :disabled="busy" @click="cancelOffer(o.id)">×</button>
    </div>
  </div>
</template>

<style scoped>
.filters { padding: 10px 12px; }
.filter-row {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
  margin-bottom: 8px;
}
.filter { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.filter .lbl { font-size: 11px; color: var(--muted); }
.filter select, .filter input { padding: 8px 10px; font-size: 14px; }
.filter-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.chip {
  padding: 6px 12px; border-radius: 999px; font-size: 12px;
  background: var(--card-2); border: 1px solid var(--border);
  color: var(--muted); cursor: pointer;
}
.chip.active { background: rgba(255,209,102,0.15); border-color: var(--accent); color: var(--accent); }
.chip.reset { color: var(--muted); }
</style>
