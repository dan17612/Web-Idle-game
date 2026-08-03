<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { locale } from '../i18n'
import { supabase } from '../supabase'
import { formatCoins, speciesInfo } from '../animals'
import { useGameStore } from '../stores/game'
import { useAuthStore } from '../stores/auth'
import { useAppToast } from '../composables/useAppToast'
import { useReturnRefresh } from '../composables/useReturnRefresh'
import {
  FOUNTAIN_REWARD, EMOTES, HONK_EMOTE,
  outfitVisual, carVisual, farmVisual,
} from '../world'
import { WorldEngine } from '../worldEngine'
import VirtualJoystick from '../components/VirtualJoystick.vue'

const router = useRouter()
const game = useGameStore()
const auth = useAuthStore()
const appToast = useAppToast()

const TUT_KEY = 'world_tutorial_v1'

const I18N = {
  de: {
    title: '🌍 Zoo-Welt', loading: 'Lade Zoo-Welt...', retry: 'Erneut versuchen',
    back: 'Zurück', online: 'online',
    zoneShop: '🛍️ Shop öffnen', zoneGate: '🦁 Zu meinem Zoo',
    zoneFountain: '🪙 Münze werfen (+{coins})', zoneFountainDone: '⏳ Morgen wieder',
    farmOf: 'Farm von {name}', yourFarm: '⭐ Deine Farm', farmSkin: '🎨 Farm gestalten',
    shopTitle: '🛍️ Welt-Shop', tabOutfits: 'Outfits', tabCars: 'Autos', tabFarms: 'Farmen',
    owned: 'Gekauft', equipped: 'Angelegt', equippedCar: 'Ausgewählt', equippedFarm: 'Aktiv',
    buy: 'Kaufen', equip: 'Anlegen', equipCar: 'Auswählen', equipFarm: 'Anwenden',
    leashTitle: '🐾 Tier an die Leine', leashNone: 'Keine Leine', leashEmpty: 'Rüste zuerst Tiere aus (Inventar), dann kannst du eins an die Leine nehmen.',
    fountainGot: '+{coins} 🪙 und +{tickets} 🎟️ aus dem Brunnen!',
    needCar: 'Kauf dir zuerst ein Auto im Shop!',
    carOn: 'Brumm! 🚗', carOff: 'Abgestiegen.',
    tutTitle: 'Willkommen in der Zoo-Welt!',
    tutStep1: 'Lauf mit dem Joystick unten links durch die Welt — auch andere Spieler sind live unterwegs.',
    tutStep2: 'Am Platz findest du den Shop (Outfits, Autos, Farm-Skins) und den Brunnen mit einer Gratis-Münze pro Tag.',
    tutStep3: 'Außerhalb liegen die Farmen aller Spieler: In jeder laufen die ausgerüsteten Tiere des Besitzers herum.',
    tutStep4: 'Nimm ein Tier an die Leine 🐾, wirf Emotes 😀 oder fahr mit dem Auto 🚗 herum. Viel Spaß!',
    tutGot: 'Los geht\'s!',
    connLost: 'Verbindung zur Welt verloren — versuche erneut...',
  },
  en: {
    title: '🌍 Zoo World', loading: 'Loading zoo world...', retry: 'Try again',
    back: 'Back', online: 'online',
    zoneShop: '🛍️ Open shop', zoneGate: '🦁 To my zoo',
    zoneFountain: '🪙 Toss a coin (+{coins})', zoneFountainDone: '⏳ Come back tomorrow',
    farmOf: 'Farm of {name}', yourFarm: '⭐ Your farm', farmSkin: '🎨 Style farm',
    shopTitle: '🛍️ World shop', tabOutfits: 'Outfits', tabCars: 'Cars', tabFarms: 'Farms',
    owned: 'Owned', equipped: 'Equipped', equippedCar: 'Selected', equippedFarm: 'Active',
    buy: 'Buy', equip: 'Wear', equipCar: 'Select', equipFarm: 'Apply',
    leashTitle: '🐾 Leash a pet', leashNone: 'No leash', leashEmpty: 'Equip animals first (inventory), then you can leash one.',
    fountainGot: '+{coins} 🪙 and +{tickets} 🎟️ from the fountain!',
    needCar: 'Buy a car in the shop first!',
    carOn: 'Vroom! 🚗', carOff: 'Got out.',
    tutTitle: 'Welcome to the Zoo World!',
    tutStep1: 'Walk around with the joystick in the bottom left — other players are live too.',
    tutStep2: 'On the plaza you\'ll find the shop (outfits, cars, farm skins) and the fountain with one free coin per day.',
    tutStep3: 'Outside lie the farms of all players: each one shows the owner\'s equipped animals.',
    tutStep4: 'Leash a pet 🐾, throw emotes 😀 or drive around 🚗. Have fun!',
    tutGot: 'Let\'s go!',
    connLost: 'Lost connection to the world — retrying...',
  },
  ru: {
    title: '🌍 Зоо-Мир', loading: 'Загрузка зоо-мира...', retry: 'Повторить',
    back: 'Назад', online: 'онлайн',
    zoneShop: '🛍️ Открыть магазин', zoneGate: '🦁 В мой зоопарк',
    zoneFountain: '🪙 Бросить монету (+{coins})', zoneFountainDone: '⏳ Возвращайся завтра',
    farmOf: 'Ферма {name}', yourFarm: '⭐ Твоя ферма', farmSkin: '🎨 Оформить ферму',
    shopTitle: '🛍️ Магазин мира', tabOutfits: 'Наряды', tabCars: 'Машины', tabFarms: 'Фермы',
    owned: 'Куплено', equipped: 'Надето', equippedCar: 'Выбрано', equippedFarm: 'Активно',
    buy: 'Купить', equip: 'Надеть', equipCar: 'Выбрать', equipFarm: 'Применить',
    leashTitle: '🐾 Питомец на поводке', leashNone: 'Без поводка', leashEmpty: 'Сначала экипируй животных (инвентарь), потом возьми одно на поводок.',
    fountainGot: '+{coins} 🪙 и +{tickets} 🎟️ из фонтана!',
    needCar: 'Сначала купи машину в магазине!',
    carOn: 'Врум! 🚗', carOff: 'Вышел из машины.',
    tutTitle: 'Добро пожаловать в Зоо-Мир!',
    tutStep1: 'Ходи по миру с помощью джойстика слева внизу — другие игроки тоже здесь вживую.',
    tutStep2: 'На площади есть магазин (наряды, машины, скины ферм) и фонтан с бесплатной монетой раз в день.',
    tutStep3: 'Вокруг лежат фермы всех игроков: в каждой гуляют экипированные животные владельца.',
    tutStep4: 'Возьми питомца на поводок 🐾, кидай эмоции 😀 или катайся на машине 🚗. Удачи!',
    tutGot: 'Поехали!',
    connLost: 'Потеряна связь с миром — переподключение...',
  },
}

function tx(key, vars = {}) {
  const dict = I18N[locale.value] || I18N.en
  let value = dict[key]
  if (value == null) value = I18N.en[key]
  return String(value ?? key).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

const loading = ref(true)
const error = ref('')
const showTutorial = ref(false)
const zone = ref(null)
const onlineCount = ref(1)
const shopOpen = ref(false)
const shopTab = ref('outfit')
const leashOpen = ref(false)
const emoteOpen = ref(false)
const busyKey = ref('')
const driving = ref(false)

const ownState = ref(null) // { x, z, plot, outfit, car, farm_skin, leash_species, owned:[], fountain_available }
const catalog = ref([])
const players = ref([])

const canvasRef = ref(null)
const wrapRef = ref(null)

let engine = null
let channel = null
let posTimer = 0
let saveTimer = 0
let lastSaved = { x: 0, z: 0 }
let wasMoving = false
let keys = { up: false, down: false, left: false, right: false }
let lastAppearances = new Map()
let reconnectTimer = 0

const uid = computed(() => auth.user?.id || '')
const username = computed(() => auth.profile?.username || '???')
const avatar = computed(() => auth.profile?.avatar_emoji || '🙂')

const itemById = computed(() => {
  const map = {}
  for (const it of catalog.value) map[it.id] = it
  return map
})
const shopItems = computed(() =>
  catalog.value.filter(i => i.kind === shopTab.value)
)
const ownedSet = computed(() => {
  const set = new Set(ownState.value?.owned || [])
  for (const it of catalog.value) if (Number(it.cost) <= 0) set.add(it.id)
  return set
})
const equippedId = computed(() => {
  const s = ownState.value
  if (!s) return null
  return { outfit: s.outfit, car: s.car, farm_skin: s.farm_skin }[shopTab.value]
})
const leashSpecies = computed(() => {
  const seen = new Set()
  const out = []
  for (const a of game.animals) {
    if (!a.equipped || seen.has(a.species)) continue
    seen.add(a.species)
    const info = speciesInfo(a.species)
    out.push({ species: a.species, emoji: info.emoji || '🐾', name: info.name || a.species })
  }
  return out
})

const metaOf = (id) => itemById.value[id]?.meta || null
const leashEmojiFor = (species) => {
  if (!species) return null
  return speciesInfo(species).emoji || '🐾'
}

function appearancePayload() {
  const s = ownState.value
  const pos = engine?.getSelfPos()
  return {
    u: uid.value, n: username.value, a: avatar.value,
    o: s.outfit, c: s.car, d: driving.value,
    l: leashEmojiFor(s.leash_species),
    x: pos?.x ?? s.x, z: pos?.z ?? s.z,
  }
}

function farmList() {
  return players.value
    .filter(p => p.plot != null)
    .map(p => ({
      plot: p.plot,
      user_id: p.user_id,
      username: p.username,
      own: p.user_id === uid.value,
      visual: farmVisual(metaOf(p.user_id === uid.value ? ownState.value.farm_skin : p.farm_skin)),
      animals: (p.animals || []).map(a => a.emoji || leashEmojiFor(a.species) || '🐾'),
    }))
}

function remoteDataFor(p) {
  return {
    username: p.username, avatar: p.avatar || '🙂',
    outfit: outfitVisual(metaOf(p.outfit)),
    car: p.car ? carVisual(metaOf(p.car)) : null,
    driving: !!p.driving,
    leash: p.leash ?? leashEmojiFor(p.leash_species),
    x: Number(p.x) || 0, z: Number(p.z) || 0,
  }
}

// ── Setup ────────────────────────────────────────────────────────────────
async function enterWorld() {
  loading.value = true
  error.value = ''
  try {
    const [enterRes, itemsRes, playersRes] = await Promise.all([
      supabase.rpc('world_enter'),
      supabase.from('world_items').select('*').eq('enabled', true).order('sort'),
      supabase.rpc('world_players'),
    ])
    if (enterRes.error) throw enterRes.error
    if (itemsRes.error) throw itemsRes.error
    if (playersRes.error) throw playersRes.error
    ownState.value = enterRes.data
    catalog.value = itemsRes.data || []
    players.value = playersRes.data?.players || []
    game.serverOffset = new Date(enterRes.data.server_now).getTime() - Date.now()

    await nextTick()
    engine = new WorldEngine(canvasRef.value, {
      onZone: (z) => { zone.value = z },
    })
    await engine.init()
    if (!engine || engine.disposed) return
    engine.setSelf({
      userId: uid.value,
      username: username.value,
      avatar: avatar.value,
      outfit: outfitVisual(metaOf(ownState.value.outfit)),
      x: Number(ownState.value.x) || 0,
      z: Number(ownState.value.z) || 10,
    })
    engine.setFarms(farmList())
    if (ownState.value.leash_species) {
      engine.setLeash(leashEmojiFor(ownState.value.leash_species))
    }
    for (const p of players.value) {
      if (p.user_id === uid.value) continue
      engine.upsertRemote(p.user_id, remoteDataFor(p))
    }
    lastSaved = { x: Number(ownState.value.x) || 0, z: Number(ownState.value.z) || 0 }
    sizeCanvas()
    engine.start()
    subscribeChannel()
    startLoops()
    loading.value = false
  } catch (e) {
    loading.value = false
    error.value = e?.message || 'Fehler'
    cleanup()
  }
}

function subscribeChannel() {
  removeChannel()
  channel = supabase.channel('world:lobby', {
    config: { presence: { key: uid.value }, broadcast: { self: false } },
  })
  channel.on('presence', { event: 'sync' }, () => {
    if (!engine) return
    const state = channel.presenceState()
    onlineCount.value = Math.max(1, Object.keys(state).length)
    for (const [key, metas] of Object.entries(state)) {
      if (key === uid.value || !metas?.length) continue
      const p = metas[metas.length - 1]
      const sig = JSON.stringify([p.n, p.a, p.o, p.c, p.l])
      if (lastAppearances.get(key) === sig) continue
      lastAppearances.set(key, sig)
      const existing = engine.remotes.get(key)?.interp
      engine.upsertRemote(key, remoteDataFor({
        ...p, x: existing?.x ?? p.x, z: existing?.z ?? p.z, driving: p.d,
      }))
    }
  })
  channel.on('broadcast', { event: 'pos' }, ({ payload: p }) => {
    if (!engine || !p || p.u === uid.value) return
    if (!engine.remotes.has(p.u)) {
      const known = players.value.find(pl => pl.user_id === p.u)
      if (known) engine.upsertRemote(p.u, remoteDataFor({ ...known, x: p.x, z: p.z }))
      else return
    }
    engine.moveRemote(p.u, { x: p.x, z: p.z, vx: p.vx, vz: p.vz, driving: !!p.d })
  })
  channel.on('broadcast', { event: 'emote' }, ({ payload: p }) => {
    if (p?.u && p.u !== uid.value) engine?.setEmote(p.u, String(p.k || '👋').slice(0, 4))
  })
  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track(appearancePayload())
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      clearTimeout(reconnectTimer)
      reconnectTimer = setTimeout(() => { if (engine) subscribeChannel() }, 3000)
    }
  })
}

function removeChannel() {
  if (channel) {
    supabase.removeChannel(channel)
    channel = null
  }
}

async function retrack() {
  try { await channel?.track(appearancePayload()) } catch {}
}

function startLoops() {
  posTimer = setInterval(() => {
    if (!engine || !channel) return
    const p = engine.getSelfPos()
    if (!p) return
    if (p.moving || wasMoving) {
      channel.send({
        type: 'broadcast', event: 'pos',
        payload: {
          u: uid.value,
          x: Math.round(p.x * 100) / 100, z: Math.round(p.z * 100) / 100,
          vx: Math.round(p.vx * 100) / 100, vz: Math.round(p.vz * 100) / 100,
          d: p.driving,
        },
      })
    }
    wasMoving = p.moving
  }, 140)
  saveTimer = setInterval(() => { savePos() }, 4000)
}

function savePos() {
  const p = engine?.getSelfPos()
  if (!p) return
  if (Math.hypot(p.x - lastSaved.x, p.z - lastSaved.z) < 0.5) return
  lastSaved = { x: p.x, z: p.z }
  supabase.rpc('world_save_pos', { p_x: p.x, p_z: p.z }).then(null, () => {})
}

async function reloadPlayers() {
  try {
    const { data, error: err } = await supabase.rpc('world_players')
    if (err) throw err
    players.value = data?.players || []
    engine?.setFarms(farmList())
    retrack()
  } catch {}
}

// ── Eingabe ──────────────────────────────────────────────────────────────
let joyVec = { x: 0, y: 0 }

function onJoystick(v) {
  joyVec = v
  applyInput()
}

function applyInput() {
  let x = joyVec.x
  let y = joyVec.y
  if (x === 0 && y === 0) {
    x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
    y = (keys.up ? 1 : 0) - (keys.down ? 1 : 0)
  }
  engine?.setInput(x, y)
}

function onKey(e, down) {
  const map = {
    w: 'up', ArrowUp: 'up', s: 'down', ArrowDown: 'down',
    a: 'left', ArrowLeft: 'left', d: 'right', ArrowRight: 'right',
  }
  const k = map[e.key]
  if (!k) return
  keys[k] = down
  applyInput()
}
const onKeyDown = (e) => onKey(e, true)
const onKeyUp = (e) => onKey(e, false)

// ── Aktionen ─────────────────────────────────────────────────────────────
const zoneLabel = computed(() => {
  const z = zone.value
  if (!z) return null
  if (z.kind === 'shop') return { key: 'shop', label: tx('zoneShop') }
  if (z.kind === 'gate') return { key: 'gate', label: tx('zoneGate') }
  if (z.kind === 'fountain') {
    return ownState.value?.fountain_available
      ? { key: 'fountain', label: tx('zoneFountain', { coins: formatCoins(FOUNTAIN_REWARD.coins) }) }
      : { key: 'fountain-done', label: tx('zoneFountainDone'), disabled: true }
  }
  if (z.kind === 'farm' && z.own) return { key: 'farm-own', label: tx('farmSkin') }
  return null
})

async function zoneAction() {
  const z = zone.value
  if (!z) return
  if (z.kind === 'shop') { shopOpen.value = true; return }
  if (z.kind === 'gate') { router.push('/'); return }
  if (z.kind === 'farm' && z.own) { shopTab.value = 'farm_skin'; shopOpen.value = true; return }
  if (z.kind === 'fountain' && ownState.value?.fountain_available) await claimFountain()
}

async function claimFountain() {
  if (busyKey.value) return
  busyKey.value = 'fountain'
  try {
    await game.persist()
    const { data, error: err } = await supabase.rpc('world_fountain_claim')
    if (err) throw err
    game.coins = Number(data.coins)
    game.tickets = Number(data.tickets)
    game.serverOffset = new Date(data.server_now).getTime() - Date.now()
    ownState.value.fountain_available = false
    engine?.fountainBurst()
    appToast.ok(tx('fountainGot', {
      coins: formatCoins(Number(data.coins_added)),
      tickets: String(data.tickets_added),
    }))
  } catch (e) {
    appToast.err(e?.message || 'Fehler')
  } finally {
    busyKey.value = ''
  }
}

async function buyItem(item) {
  if (busyKey.value) return
  busyKey.value = 'buy-' + item.id
  try {
    await game.persist()
    const { data, error: err } = await supabase.rpc('world_buy_item', { p_item_id: item.id })
    if (err) throw err
    game.coins = Number(data.coins)
    game.serverOffset = new Date(data.server_now).getTime() - Date.now()
    ownState.value.owned = [...(ownState.value.owned || []), item.id]
    await equipItem(item, true)
  } catch (e) {
    appToast.err(e?.message || 'Fehler')
  } finally {
    busyKey.value = ''
  }
}

async function equipItem(item, silent = false) {
  if (!silent && busyKey.value) return
  if (!silent) busyKey.value = 'eq-' + item.id
  try {
    const { error: err } = await supabase.rpc('world_equip', {
      p_kind: item.kind, p_item_id: item.id,
    })
    if (err) throw err
    if (item.kind === 'outfit') {
      ownState.value.outfit = item.id
      engine?.setOutfit(outfitVisual(item.meta), avatar.value, username.value)
      if (driving.value) engine?.setDriving(true, carVisual(metaOf(ownState.value.car)))
      if (ownState.value.leash_species) engine?.setLeash(leashEmojiFor(ownState.value.leash_species))
    } else if (item.kind === 'car') {
      ownState.value.car = item.id
      if (driving.value) engine?.setDriving(true, carVisual(item.meta))
    } else if (item.kind === 'farm_skin') {
      ownState.value.farm_skin = item.id
      engine?.setFarms(farmList())
    }
    retrack()
  } catch (e) {
    appToast.err(e?.message || 'Fehler')
  } finally {
    if (!silent) busyKey.value = ''
  }
}

function toggleDrive() {
  if (!ownState.value?.car) {
    shopTab.value = 'car'
    shopOpen.value = true
    appToast.info?.(tx('needCar'))
    return
  }
  driving.value = !driving.value
  engine?.setDriving(driving.value, carVisual(metaOf(ownState.value.car)))
  retrack()
}

async function setLeash(species) {
  leashOpen.value = false
  if (busyKey.value) return
  busyKey.value = 'leash'
  try {
    const { error: err } = await supabase.rpc('world_set_leash', { p_species: species })
    if (err) throw err
    ownState.value.leash_species = species
    engine?.setLeash(leashEmojiFor(species))
    retrack()
  } catch (e) {
    appToast.err(e?.message || 'Fehler')
  } finally {
    busyKey.value = ''
  }
}

function sendEmote(emoji) {
  emoteOpen.value = false
  engine?.setEmote('me', emoji)
  channel?.send({ type: 'broadcast', event: 'emote', payload: { u: uid.value, k: emoji } })
}

function sizeCanvas() {
  const wrap = wrapRef.value
  if (!engine || !wrap) return
  engine.resize(wrap.clientWidth, wrap.clientHeight)
}

function dismissTutorial() {
  showTutorial.value = false
  try { localStorage.setItem(TUT_KEY, '1') } catch {}
}

function cleanup() {
  clearInterval(posTimer)
  clearInterval(saveTimer)
  clearTimeout(reconnectTimer)
  posTimer = 0
  saveTimer = 0
  removeChannel()
  if (engine) {
    const p = engine.getSelfPos()
    if (p) supabase.rpc('world_save_pos', { p_x: p.x, p_z: p.z }).then(null, () => {})
    engine.dispose()
    engine = null
  }
  lastAppearances.clear()
}

useReturnRefresh(() => { if (engine) reloadPlayers() })

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('resize', sizeCanvas)
  let seen = false
  try { seen = localStorage.getItem(TUT_KEY) === '1' } catch { seen = false }
  if (!seen) showTutorial.value = true
  enterWorld()
})

onUnmounted(() => {
  cleanup()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('resize', sizeCanvas)
})
</script>

<template>
  <Teleport to="body">
    <div class="wd-overlay">
      <div class="wd-hud-top">
        <Button class="btn small btn-ghost" @click="router.push('/')">
          <i class="pi pi-arrow-left"></i>
        </Button>
        <div class="wd-title">{{ tx('title') }}</div>
        <div class="wd-chip">👥 {{ onlineCount }} {{ tx('online') }}</div>
        <div class="wd-chip">🪙 {{ formatCoins(game.displayCoins) }}</div>
      </div>

      <div ref="wrapRef" class="wd-canvas-wrap">
        <canvas ref="canvasRef"></canvas>

        <div v-if="loading" class="wd-loading">
          <i class="pi pi-spin pi-spinner"></i><span>{{ tx('loading') }}</span>
        </div>
        <div v-else-if="error" class="wd-loading wd-error">
          <span>{{ error }}</span>
          <Button class="btn small" @click="enterWorld">{{ tx('retry') }}</Button>
          <Button class="btn small secondary" @click="router.push('/')">{{ tx('back') }}</Button>
        </div>

        <template v-if="!loading && !error">
          <div v-if="zone?.kind === 'farm'" class="wd-plaque">
            <template v-if="zone.own">{{ tx('yourFarm') }}</template>
            <template v-else>🏡 {{ tx('farmOf', { name: zone.username }) }}</template>
          </div>

          <Button
            v-if="zoneLabel"
            class="btn wd-zone-btn"
            :disabled="zoneLabel.disabled || busyKey === 'fountain'"
            @click="zoneAction"
          >{{ zoneLabel.label }}</Button>

          <div class="wd-joy">
            <VirtualJoystick @move="onJoystick" />
          </div>

          <div class="wd-actions">
            <button class="wd-fab" :class="{ on: driving }" @click="toggleDrive">🚗</button>
            <button class="wd-fab" :class="{ on: !!ownState?.leash_species }" @click="leashOpen = !leashOpen; emoteOpen = false">🐾</button>
            <button class="wd-fab" @click="emoteOpen = !emoteOpen; leashOpen = false">😀</button>
            <button v-if="driving" class="wd-fab honk" @click="sendEmote(HONK_EMOTE)">📢</button>
          </div>

          <div v-if="emoteOpen" class="wd-pop wd-emotes">
            <button v-for="e in EMOTES" :key="e" class="wd-emote" @click="sendEmote(e)">{{ e }}</button>
          </div>

          <div v-if="leashOpen" class="wd-pop wd-leash">
            <div class="wd-pop-title">{{ tx('leashTitle') }}</div>
            <div v-if="!leashSpecies.length" class="wd-leash-empty">{{ tx('leashEmpty') }}</div>
            <div v-else class="wd-leash-grid">
              <button
                class="wd-leash-item"
                :class="{ on: !ownState?.leash_species }"
                @click="setLeash(null)"
              >🚫<span>{{ tx('leashNone') }}</span></button>
              <button
                v-for="s in leashSpecies"
                :key="s.species"
                class="wd-leash-item"
                :class="{ on: ownState?.leash_species === s.species }"
                @click="setLeash(s.species)"
              >{{ s.emoji }}<span>{{ s.name }}</span></button>
            </div>
          </div>
        </template>
      </div>

      <div v-if="shopOpen" class="wd-sheet-backdrop" @click.self="shopOpen = false">
        <div class="wd-sheet">
          <div class="wd-sheet-head">
            <h3>{{ tx('shopTitle') }}</h3>
            <div class="wd-chip">🪙 {{ formatCoins(game.displayCoins) }}</div>
            <button class="wd-close" @click="shopOpen = false"><i class="pi pi-times"></i></button>
          </div>
          <div class="wd-tabs">
            <button :class="{ active: shopTab === 'outfit' }" @click="shopTab = 'outfit'">{{ tx('tabOutfits') }}</button>
            <button :class="{ active: shopTab === 'car' }" @click="shopTab = 'car'">{{ tx('tabCars') }}</button>
            <button :class="{ active: shopTab === 'farm_skin' }" @click="shopTab = 'farm_skin'">{{ tx('tabFarms') }}</button>
          </div>
          <div class="wd-items">
            <div
              v-for="item in shopItems"
              :key="item.id"
              class="wd-item card"
              :class="{ eq: equippedId === item.id }"
            >
              <div class="wd-item-emoji">{{ item.emoji }}</div>
              <div class="wd-item-name">{{ item.name }}</div>
              <div v-if="item.kind === 'car'" class="wd-item-sub">⚡ ×{{ (item.meta?.speed || 2).toFixed(1) }}</div>
              <template v-if="equippedId === item.id">
                <div class="wd-item-state">
                  {{ item.kind === 'outfit' ? tx('equipped') : item.kind === 'car' ? tx('equippedCar') : tx('equippedFarm') }}
                </div>
              </template>
              <template v-else-if="ownedSet.has(item.id)">
                <Button
                  class="btn small secondary full"
                  :disabled="busyKey !== ''"
                  @click="equipItem(item)"
                >{{ item.kind === 'outfit' ? tx('equip') : item.kind === 'car' ? tx('equipCar') : tx('equipFarm') }}</Button>
              </template>
              <template v-else>
                <Button
                  class="btn small full"
                  :disabled="busyKey !== '' || game.displayCoins < Number(item.cost)"
                  @click="buyItem(item)"
                >🪙 {{ formatCoins(item.cost) }}</Button>
              </template>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showTutorial" class="wd-tut-backdrop" @click.self="dismissTutorial">
        <div class="wd-tut card">
          <h3>{{ tx('tutTitle') }}</h3>
          <div class="wd-tut-demo">🕹️ 🚶 🏡</div>
          <ol>
            <li>{{ tx('tutStep1') }}</li>
            <li>{{ tx('tutStep2') }}</li>
            <li>{{ tx('tutStep3') }}</li>
            <li>{{ tx('tutStep4') }}</li>
          </ol>
          <Button class="btn full" @click="dismissTutorial">{{ tx('tutGot') }}</Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.wd-overlay { position:fixed; inset:0; z-index:1100; display:flex; flex-direction:column;
  background:#bfe7fa; touch-action:none; overscroll-behavior:none;
  user-select:none; -webkit-user-select:none; -webkit-tap-highlight-color:transparent; }
.wd-hud-top { display:flex; align-items:center; gap:8px;
  padding:calc(8px + var(--safe-top)) 12px 8px; background:rgba(255,255,255,0.92);
  border-bottom:2px solid var(--border); }
.btn-ghost { background:var(--card-2); color:var(--muted);
  display:inline-flex; align-items:center; gap:5px; flex-shrink:0; }
.wd-title { flex:1; min-width:0; font-weight:900; font-size:16px; color:var(--heading);
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.wd-chip { background:var(--card-2); border:2px solid var(--border); border-radius:999px;
  padding:4px 10px; font-size:12px; font-weight:900; color:var(--heading); white-space:nowrap; }

.wd-canvas-wrap { position:relative; flex:1; min-height:0; }
.wd-canvas-wrap canvas { position:absolute; inset:0; display:block; width:100%; height:100%; }

.wd-loading { position:absolute; inset:0; display:flex; flex-direction:column;
  align-items:center; justify-content:center; gap:12px; color:var(--heading);
  font-weight:800; background:rgba(253,244,221,0.75); }
.wd-error { color:var(--danger); }

.wd-plaque { position:absolute; top:12px; left:50%; transform:translateX(-50%);
  background:rgba(255,255,255,0.94); border:2px solid var(--border); border-radius:999px;
  padding:7px 16px; font-weight:900; font-size:13px; color:var(--heading);
  box-shadow:0 6px 16px rgba(60,40,10,0.18); pointer-events:none; white-space:nowrap; }

.wd-zone-btn { position:absolute; left:50%; transform:translateX(-50%);
  bottom:calc(170px + var(--safe-bot)); font-weight:900; white-space:nowrap;
  box-shadow:0 4px 0 var(--accent-deep), 0 10px 26px rgba(60,40,10,0.3); }

.wd-joy { position:absolute; left:16px; bottom:calc(18px + var(--safe-bot)); }

.wd-actions { position:absolute; right:14px; bottom:calc(18px + var(--safe-bot));
  display:flex; flex-direction:column; gap:10px; align-items:center; }
.wd-fab { width:52px; height:52px; border-radius:50%; border:3px solid #fff;
  background:rgba(255,255,255,0.55); font-size:24px; cursor:pointer;
  box-shadow:0 5px 14px rgba(60,40,10,0.25); backdrop-filter:blur(2px);
  display:flex; align-items:center; justify-content:center; padding:0; }
.wd-fab.on { background:linear-gradient(180deg,var(--accent-soft),var(--accent));
  box-shadow:0 4px 0 var(--accent-deep); }
.wd-fab.honk { background:linear-gradient(180deg,#ffd0dc,#ef8aa6); }
.wd-fab:active { transform:scale(0.92); }

.wd-pop { position:absolute; right:76px; bottom:calc(30px + var(--safe-bot));
  background:rgba(255,255,255,0.96); border:2px solid var(--border);
  border-radius:18px; padding:12px; box-shadow:0 12px 30px rgba(60,40,10,0.25);
  max-width:min(320px, calc(100% - 96px)); }
.wd-pop-title { font-weight:900; font-size:13px; color:var(--heading); margin-bottom:8px; }
.wd-emotes { display:flex; gap:6px; }
.wd-emote { font-size:26px; background:var(--card-2); border:2px solid var(--border);
  border-radius:12px; width:44px; height:44px; cursor:pointer; padding:0; }
.wd-emote:active { transform:scale(0.9); }
.wd-leash-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:6px;
  max-height:200px; overflow-y:auto; }
.wd-leash-item { display:flex; flex-direction:column; align-items:center; gap:2px;
  background:var(--card-2); border:2px solid var(--border); border-radius:12px;
  padding:8px 4px; font-size:22px; cursor:pointer; }
.wd-leash-item span { font-size:10px; font-weight:800; color:var(--muted);
  max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.wd-leash-item.on { border-color:var(--accent); background:#fff7e0; }
.wd-leash-empty { font-size:12px; color:var(--muted); font-weight:700; max-width:230px; }

.wd-sheet-backdrop { position:absolute; inset:0; background:rgba(40,25,5,0.45);
  display:flex; align-items:flex-end; justify-content:center; z-index:8;
  backdrop-filter:blur(3px); }
.wd-sheet { width:100%; max-width:560px; max-height:72%; background:var(--bg);
  border-radius:22px 22px 0 0; display:flex; flex-direction:column;
  padding:14px 14px calc(14px + var(--safe-bot)); gap:10px;
  animation:wdSheetIn 0.25s ease-out; }
@keyframes wdSheetIn { from { transform:translateY(40%); } to { transform:translateY(0); } }
.wd-sheet-head { display:flex; align-items:center; gap:10px; }
.wd-sheet-head h3 { margin:0; flex:1; font-size:18px; font-weight:900; color:var(--heading); }
.wd-close { background:var(--card-2); border:2px solid var(--border); border-radius:50%;
  width:34px; height:34px; cursor:pointer; color:var(--muted);
  display:flex; align-items:center; justify-content:center; }
.wd-tabs { display:flex; gap:6px; }
.wd-tabs button { flex:1; background:var(--card-2); border:2px solid var(--border);
  border-radius:12px; padding:8px 4px; font-weight:900; font-size:13px;
  color:var(--muted); cursor:pointer; }
.wd-tabs button.active { background:linear-gradient(180deg,var(--accent-soft),var(--accent));
  color:var(--accent-ink); border-color:var(--accent-deep); }
.wd-items { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr));
  gap:8px; overflow-y:auto; padding-bottom:4px; }
.wd-item { display:flex; flex-direction:column; align-items:center; gap:4px;
  padding:12px 8px; text-align:center; }
.wd-item.eq { border-color:var(--accent); box-shadow:0 0 0 3px
  color-mix(in srgb, var(--accent) 25%, transparent), var(--shadow-card); }
.wd-item-emoji { font-size:34px; line-height:1.1; }
.wd-item-name { font-weight:900; font-size:13px; color:var(--heading); }
.wd-item-sub { font-size:11px; color:var(--muted); font-weight:800; }
.wd-item-state { font-size:12px; font-weight:900; color:var(--accent-deep); padding:6px 0; }
.full { width:100%; }

.wd-tut-backdrop { position:fixed; inset:0; background:rgba(60,40,10,0.5); display:flex;
  align-items:center; justify-content:center; z-index:1400; padding:16px;
  backdrop-filter:blur(5px); }
.wd-tut { max-width:380px; width:100%; padding:22px; display:flex;
  flex-direction:column; gap:12px; }
.wd-tut h3 { margin:0; font-size:20px; font-weight:900; color:var(--heading); text-align:center; }
.wd-tut-demo { text-align:center; font-size:34px; }
.wd-tut ol { text-align:left; margin:0; padding-left:20px; display:flex;
  flex-direction:column; gap:8px; color:var(--text); font-size:13px; font-weight:600; }
</style>
