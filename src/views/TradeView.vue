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
const error = ref('')
const success = ref('')
const busy = ref(false)

const form = reactive({
  animalId: '',
  price: 1000,
  toUsername: ''
})

const myAnimals = computed(() => game.animals.map(a => ({ ...a, info: speciesInfo(a.species) })))

async function loadOffers() {
  const { data: browse } = await supabase
    .from('trade_offers_with_names')
    .select('*')
    .eq('status', 'open')
    .neq('seller_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(50)
  offers.value = browse || []

  const { data: mine } = await supabase
    .from('trade_offers_with_names')
    .select('*')
    .eq('seller_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(50)
  myOffers.value = mine || []
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

  <div v-if="tab==='browse'" class="card">
    <div v-if="!offers.length" class="subtitle">Aktuell keine Angebote. Sei der Erste!</div>
    <div v-for="o in offers" :key="o.id" class="list-item">
      <div class="left">{{ speciesInfo(o.species).emoji }}</div>
      <div class="body">
        <div class="title-sm">{{ speciesInfo(o.species).name }}</div>
        <div class="sub">von {{ o.seller_username }} · 🪙 {{ formatCoins(o.price) }}</div>
      </div>
      <button class="btn" :disabled="busy || game.displayCoins < o.price" @click="buyOffer(o.id)">Kaufen</button>
    </div>
  </div>

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
