<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../supabase'
import { useAuthStore } from '../stores/auth'
import { useGameStore } from '../stores/game'
import { speciesInfo, formatCoins, tierInfo, animalRate, compareAnimalsByRate } from '../animals'
import CoinInput from '../components/CoinInput.vue'
import { locale, currentLocaleTag } from '../i18n'
import { useReturnRefresh } from '../composables/useReturnRefresh'

const route = useRoute()

const auth = useAuthStore()
const game = useGameStore()

const I18N = {
  de: {
    title: 'Trade & Senden',
    tabs: { new: 'Neu', incoming: 'Eingang', outgoing: 'Ausgang', public: 'Public' },
    mode: { trade: 'Tausch', send: 'Senden' },
    time: { expired: 'abgelaufen' },
    labels: {
      profile: 'Profil',
      addAnimal: '＋ Tier',
      coinsOptional: 'Muenzen (optional)',
      noteOptional: 'Notiz (optional)',
      accept: 'Annehmen',
      decline: 'Ablehnen',
      cancel: 'Zurueckziehen',
      from: 'Von',
      to: 'An',
      expiresIn: 'Laeuft in',
      hide: 'Ausblenden',
      yourOffer: 'Dein Angebot',
      offer: 'Bietet',
      asks: 'Verlangt',
      nothing: 'nichts',
      freeOptionalAnimals: 'frei (optional Tiere)',
      optionalGiveAnimals: 'Optional: Tiere mitgeben',
      youGet: 'Du bekommst',
      youGive: 'Du gibst',
      tradePartner: 'Handelspartner',
      anyTaker: 'Beliebiger Annehmer',
      statusAccepted: 'Angenommen',
      statusDeclined: 'Abgelehnt',
      statusCancelled: 'Zurueckgezogen',
      statusExpired: 'Abgelaufen'
    },
    hints: {
      oneWaySend: 'Einseitige Muenz-Ueberweisung, kein Einverstaendnis noetig.',
      publicPost: 'Öffentlich posten',
      anyoneCanAccept: 'Jeder kann akzeptieren',
      publicCoinsOnly: 'Nenne nur Muenzen als Gegenleistung (keine konkreten Tier-IDs).',
      searching: 'Suche...',
      tradableAnimals: '{count} tauschbare Tiere',
      noMyTradable: 'Keine tauschbaren Tiere. Rueste sie zuerst ab.',
      noPartnerTradable: 'Dieser Spieler hat keine tauschbaren Tiere.',
      picker: 'Klick = +1 · Rechtsklick/Chip-Klick = -1',
      publicList: 'Öffentliche Angebote - jeder kann annehmen, der die verlangten Muenzen/Tiere hat.',
      noPublic: 'Keine öffentlichen Trades.',
      noIncoming: 'Keine offenen Anfragen.',
      noOutgoing: 'Keine gesendeten Anfragen offen.',
      noHistory: 'Noch keine abgeschlossenen Trades.',
      noPendingNote: 'Noch keine offenen Trades.',
      directSendTitle: 'Empfaenger-Username',
      partnerUsernamePlaceholder: 'Username',
      amountPlaceholder: 'Betrag (z. B. 10M)'
    },
    actions: {
      send: 'Senden',
      publishPublic: 'Öffentlich posten',
      sendTrade: 'Trade-Anfrage senden'
    },
    errors: {
      notFound: 'Nicht gefunden',
      isSelf: 'Das bist du selbst',
      partnerOrPublic: 'Partner waehlen oder öffentlich posten',
      tradeEmpty: 'Trade ist komplett leer',
      notEnoughCoins: 'Nicht genug Muenzen',
      publicNoSpecificAnimals: 'Öffentliche Trades koennen keine konkreten Tiere vom Annehmer verlangen (nur Muenzen).',
      recipientRequired: 'Empfaenger angeben',
      amountMin: 'Betrag muss >= 1 sein',
      recipientNotFound: 'Empfaenger nicht gefunden'
    },
    success: {
      publicPosted: 'Öffentlicher Trade veröffentlicht!',
      tradeSent: 'Trade-Anfrage gesendet!',
      coinsSent: '{amount} 🪙 gesendet',
      tradeAccepted: 'Trade angenommen!',
      accepted: 'Angenommen!',
      declined: 'Abgelehnt',
      cancelled: 'Zurueckgezogen'
    }
  },
  en: {
    title: 'Trade & Send',
    tabs: { new: 'New', incoming: 'Incoming', outgoing: 'Outgoing', public: 'Public' },
    mode: { trade: 'Trade', send: 'Send' },
    time: { expired: 'expired' },
    labels: {
      profile: 'Profile',
      addAnimal: '＋ Animal',
      coinsOptional: 'Coins (optional)',
      noteOptional: 'Note (optional)',
      accept: 'Accept',
      decline: 'Decline',
      cancel: 'Cancel',
      from: 'From',
      to: 'To',
      expiresIn: 'Expires in',
      hide: 'Hide',
      yourOffer: 'Your offer',
      offer: 'Offers',
      asks: 'Asks',
      nothing: 'nothing',
      freeOptionalAnimals: 'free (optional animals)',
      optionalGiveAnimals: 'Optional: add animals',
      youGet: 'You get',
      youGive: 'You give',
      tradePartner: 'Trade partner',
      anyTaker: 'Any taker',
      statusAccepted: 'Accepted',
      statusDeclined: 'Declined',
      statusCancelled: 'Cancelled',
      statusExpired: 'Expired'
    },
    hints: {
      oneWaySend: 'One-way coin transfer, no consent required.',
      publicPost: 'Post publicly',
      anyoneCanAccept: 'Anyone can accept',
      publicCoinsOnly: 'Only request coins as compensation (no specific animal IDs).',
      searching: 'Searching...',
      tradableAnimals: '{count} tradable animals',
      noMyTradable: 'No tradable animals. Unequip them first.',
      noPartnerTradable: 'This player has no tradable animals.',
      picker: 'Click = +1 · Right-click/chip click = -1',
      publicList: 'Public offers - anyone can accept if they have the required coins/animals.',
      noPublic: 'No public trades.',
      noIncoming: 'No open requests.',
      noOutgoing: 'No sent requests pending.',
      noHistory: 'No completed trades yet.',
      noPendingNote: 'No open trades yet.',
      directSendTitle: 'Recipient username',
      partnerUsernamePlaceholder: 'Username',
      amountPlaceholder: 'Amount (e.g. 10M)'
    },
    actions: {
      send: 'Send',
      publishPublic: 'Post publicly',
      sendTrade: 'Send trade request'
    },
    errors: {
      notFound: 'Not found',
      isSelf: 'That is you',
      partnerOrPublic: 'Choose a partner or post publicly',
      tradeEmpty: 'Trade is completely empty',
      notEnoughCoins: 'Not enough coins',
      publicNoSpecificAnimals: 'Public trades cannot require specific animals from the accepter (coins only).',
      recipientRequired: 'Enter recipient',
      amountMin: 'Amount must be >= 1',
      recipientNotFound: 'Recipient not found'
    },
    success: {
      publicPosted: 'Public trade published!',
      tradeSent: 'Trade request sent!',
      coinsSent: '{amount} 🪙 sent',
      tradeAccepted: 'Trade accepted!',
      accepted: 'Accepted!',
      declined: 'Declined',
      cancelled: 'Cancelled'
    }
  },
  ru: {
    title: 'Обмен и Отправка',
    tabs: { new: 'Новый', incoming: 'Входящие', outgoing: 'Исходящие', public: 'Публично' },
    mode: { trade: 'Обмен', send: 'Отправка' },
    time: { expired: 'истек' },
    labels: {
      profile: 'Профиль',
      addAnimal: '＋ Животное',
      coinsOptional: 'Монеты (опц.)',
      noteOptional: 'Заметка (опц.)',
      accept: 'Принять',
      decline: 'Отклонить',
      cancel: 'Отозвать',
      from: 'От',
      to: 'Кому',
      expiresIn: 'Истекает через',
      hide: 'Скрыть',
      yourOffer: 'Ваше предложение',
      offer: 'Предлагает',
      asks: 'Просит',
      nothing: 'ничего',
      freeOptionalAnimals: 'свободно (животные опц.)',
      optionalGiveAnimals: 'Опционально: добавить животных',
      youGet: 'Вы получаете',
      youGive: 'Вы отдаете',
      tradePartner: 'Партнер по обмену',
      anyTaker: 'Любой принимающий',
      statusAccepted: 'Принят',
      statusDeclined: 'Отклонен',
      statusCancelled: 'Отозван',
      statusExpired: 'Истек'
    },
    hints: {
      oneWaySend: 'Односторонний перевод монет, согласие не требуется.',
      publicPost: 'Опубликовать публично',
      anyoneCanAccept: 'Любой может принять',
      publicCoinsOnly: 'Запрашивайте только монеты (без конкретных ID животных).',
      searching: 'Поиск...',
      tradableAnimals: 'обмениваемых животных: {count}',
      noMyTradable: 'Нет обмениваемых животных. Сначала снимите их.',
      noPartnerTradable: 'У этого игрока нет обмениваемых животных.',
      picker: 'Клик = +1 · Правый клик/клик по фишке = -1',
      publicList: 'Публичные предложения - любой может принять при наличии нужных монет/животных.',
      noPublic: 'Нет публичных обменов.',
      noIncoming: 'Нет открытых запросов.',
      noOutgoing: 'Нет отправленных открытых запросов.',
      noHistory: 'Пока нет завершенных обменов.',
      noPendingNote: 'Пока нет открытых обменов.',
      directSendTitle: 'Username получателя',
      partnerUsernamePlaceholder: 'Username',
      amountPlaceholder: 'Сумма (например 10M)'
    },
    actions: {
      send: 'Отправить',
      publishPublic: 'Опубликовать',
      sendTrade: 'Отправить запрос обмена'
    },
    errors: {
      notFound: 'Не найдено',
      isSelf: 'Это вы сами',
      partnerOrPublic: 'Выберите партнера или опубликуйте публично',
      tradeEmpty: 'Обмен полностью пустой',
      notEnoughCoins: 'Недостаточно монет',
      publicNoSpecificAnimals: 'Публичный обмен не может требовать конкретных животных от принимающего (только монеты).',
      recipientRequired: 'Укажите получателя',
      amountMin: 'Сумма должна быть >= 1',
      recipientNotFound: 'Получатель не найден'
    },
    success: {
      publicPosted: 'Публичный обмен опубликован!',
      tradeSent: 'Запрос обмена отправлен!',
      coinsSent: '{amount} 🪙 отправлено',
      tradeAccepted: 'Обмен принят!',
      accepted: 'Принято!',
      declined: 'Отклонено',
      cancelled: 'Отозвано'
    }
  }
}

function tx(key, vars = {}) {
  const lang = I18N[locale.value] ? locale.value : 'en'
  let value = I18N[lang]
  for (const part of key.split('.')) value = value?.[part]
  if (value == null) {
    value = I18N.en
    for (const part of key.split('.')) value = value?.[part]
  }
  const text = String(value ?? key)
  return text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

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
  if (ms <= 0) return tx('time.expired')
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
  game.animals.filter(a => !a.equipped).slice().sort(compareAnimalsByRate).map(a => ({ ...a, info: speciesInfo(a.species), td: tierInfo(a.tier || 'normal') }))
)

function groupByKey(list) {
  const m = new Map()
  for (const a of list) {
    const key = a.species + '|' + (a.tier || 'normal')
    if (!m.has(key)) m.set(key, { key, species: a.species, tier: a.tier || 'normal', info: a.info || speciesInfo(a.species), td: a.td || tierInfo(a.tier || 'normal'), rate: animalRate(a), list: [] })
    m.get(key).list.push(a)
  }
  return [...m.values()].sort((a, b) => (b.rate || 0) - (a.rate || 0) || (b.td.order || 0) - (a.td.order || 0) || a.info.name.localeCompare(b.info.name))
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
    if (!p) { partnerError.value = tx('errors.notFound'); return }
    if (p.id === auth.user.id) { partnerError.value = tx('errors.isSelf'); return }
    partnerProfile.value = p
    const { data: animals } = await supabase.from('animals')
      .select('id, species, equipped, tier').eq('owner_id', p.id).eq('equipped', false)
      .order('acquired_at')
    partnerAnimals.value = (animals || []).slice().sort(compareAnimalsByRate).map(a => ({ ...a, info: speciesInfo(a.species), td: tierInfo(a.tier || 'normal') }))
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
  if (!isPublicOffer.value && !partnerProfile.value) { error.value = tx('errors.partnerOrPublic'); return }
  const reqAnimals = [...offer.myAnimals]
  const addAnimals = [...offer.theirAnimals]
  const reqCoins = Math.max(0, Math.floor(Number(offer.myCoins) || 0))
  const addCoins = Math.max(0, Math.floor(Number(offer.theirCoins) || 0))
  // Mindestens eine Seite muss etwas geben — Münzen dürfen 0 sein.
  if (reqAnimals.length + reqCoins === 0 && addAnimals.length + addCoins === 0) {
    error.value = tx('errors.tradeEmpty'); return
  }
  if (reqCoins > game.displayCoins) { error.value = tx('errors.notEnoughCoins'); return }

  if (isPublicOffer.value && addAnimals.length > 0) {
    error.value = tx('errors.publicNoSpecificAnimals')
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
    success.value = isPublicOffer.value ? tx('success.publicPosted') : tx('success.tradeSent')
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
  if (!sendForm.username.trim()) { error.value = tx('errors.recipientRequired'); return }
  if (!sendForm.amount || sendForm.amount < 1) { error.value = tx('errors.amountMin'); return }
  busy.value = true
  try {
    const name = sendForm.username.trim()
    const escaped = name.replace(/[\\_%]/g, '\\$&')
    const { data: rcpt } = await supabase.from('profiles')
      .select('username').ilike('username', escaped).maybeSingle()
    if (!rcpt) throw new Error(tx('errors.recipientNotFound'))
    await game.sendCoins(rcpt.username, sendForm.amount)
    success.value = tx('success.coinsSent', { amount: formatCoins(sendForm.amount) })
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
    success.value = action === 'accept_trade' ? tx('success.accepted')
      : action === 'decline_trade' ? tx('success.declined')
      : tx('success.cancelled')
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
  if (Number(t.addressee_coins) > game.displayCoins) { error.value = tx('errors.notEnoughCoins'); return }
  busy.value = true
  try {
    await game.persist()
    const { error: e } = await supabase.rpc('accept_public_trade', { p_trade_id: t.id, p_my_animals: ids })
    if (e) throw e
    success.value = tx('success.tradeAccepted')
    publicAccept.value = { ...publicAccept.value, [t.id]: new Set() }
    await Promise.all([loadTrades(), game.load()])
  } catch (e) { error.value = e.message }
  finally { busy.value = false; setTimeout(() => success.value = '', 2500) }
}

useReturnRefresh(loadTrades)

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

function statusLabel(status) {
  if (status === 'accepted') return tx('labels.statusAccepted')
  if (status === 'declined') return tx('labels.statusDeclined')
  if (status === 'cancelled') return tx('labels.statusCancelled')
  if (status === 'expired') return tx('labels.statusExpired')
  return status
}
</script>

<template>
  <h1 class="title">🔄 {{ tx('title') }}</h1>

  <div class="tabs">
    <Button :class="{ active: tab==='new' }" @click="tab='new'">➕ {{ tx('tabs.new') }}</Button>
    <Button :class="{ active: tab==='in' }" @click="tab='in'">
      📥 {{ tx('tabs.incoming') }}<span v-if="incoming.length" class="pill">{{ incoming.length }}</span>
    </Button>
    <Button :class="{ active: tab==='out' }" @click="tab='out'">
      📤 {{ tx('tabs.outgoing') }}<span v-if="outgoing.length" class="pill">{{ outgoing.length }}</span>
    </Button>
    <Button :class="{ active: tab==='public' }" @click="tab='public'">
      🌐 {{ tx('tabs.public') }}<span v-if="visiblePublicTrades.length" class="pill" style="background:var(--accent-2);color:#001a15">{{ visiblePublicTrades.length }}</span>
    </Button>
    <Button :class="{ active: tab==='hist' }" @click="tab='hist'">🗂️</Button>
  </div>

  <p v-if="error" class="error">{{ error }}</p>
  <p v-if="success" class="success">{{ success }}</p>

  <!-- NEU -->
  <template v-if="tab === 'new'">
    <div class="tabs small" style="margin-bottom:10px">
      <Button :class="{ active: mode==='trade' }" @click="mode='trade'">🔄 {{ tx('mode.trade') }}</Button>
      <Button :class="{ active: mode==='send' }" @click="mode='send'">💸 {{ tx('mode.send') }}</Button>
    </div>

    <!-- SENDEN -->
    <div v-if="mode === 'send'" class="card stack">
      <div class="subtitle" style="margin:0">{{ tx('hints.oneWaySend') }}</div>
      <InputText v-model="sendForm.username" :placeholder="tx('hints.directSendTitle')" />
      <CoinInput v-model="sendForm.amount" :placeholder="tx('hints.amountPlaceholder')" />
      <Button class="btn full" :disabled="busy || !sendForm.username || !sendForm.amount" @click="sendGift">
        {{ busy ? '...' : tx('actions.send') }}
      </Button>
    </div>

    <!-- TAUSCH -->
    <div v-else>
      <div class="card stack">
        <label class="row between" style="margin:0;gap:6px">
          <span class="row" style="gap:6px;align-items:center"><Checkbox v-model="isPublicOffer" binary /> 🌐 {{ tx('hints.publicPost') }}</span>
          <span class="subtitle" style="margin:0">{{ tx('hints.anyoneCanAccept') }}</span>
        </label>
        <template v-if="!isPublicOffer">
          <label class="subtitle" style="margin:0">{{ tx('labels.tradePartner') }}</label>
          <InputText v-model="partnerUsername" :placeholder="tx('hints.partnerUsernamePlaceholder')" autocomplete="off" />
        </template>
        <div v-else class="subtitle" style="margin:0">{{ tx('hints.publicCoinsOnly') }}</div>
        <div v-if="!isPublicOffer && partnerSearching" class="subtitle">{{ tx('hints.searching') }}</div>
        <div v-else-if="!isPublicOffer && partnerError" class="error">{{ partnerError }}</div>
        <div v-else-if="!isPublicOffer && partnerProfile" class="partner-card">
          <div class="partner-avatar">{{ partnerProfile.avatar_emoji || '👤' }}</div>
          <div style="flex:1">
            <div style="font-weight:700">{{ partnerProfile.username }}</div>
            <div class="subtitle" style="margin:0">🪙 {{ formatCoins(partnerProfile.coins) }} · {{ tx('hints.tradableAnimals', { count: partnerAnimals.length }) }}</div>
          </div>
          <router-link
            class="btn secondary small"
            :to="{ name: 'profile', query: { u: partnerProfile.username } }"
          >{{ tx('labels.profile') }}</router-link>
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
            <Button class="chip-add" @click="pickerOpen = pickerOpen==='mine'?'':'mine'">{{ tx('labels.addAnimal') }}</Button>
          </div>
          <CoinInput v-model="offer.myCoins" :placeholder="tx('labels.coinsOptional')" />

          <div v-if="pickerOpen==='mine'" class="picker">
            <div v-if="!myGroups.length" class="subtitle">{{ tx('hints.noMyTradable') }}</div>
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
              {{ tx('hints.picker') }}
            </div>
          </div>
        </div>

        <div class="vs">⇅</div>

        <!-- Ich will -->
        <div class="side">
          <div class="side-title">
            <span class="arrow">←</span>
            <span class="who">{{ isPublicOffer ? tx('labels.anyTaker') : partnerProfile.username }}</span>
          </div>
          <div v-if="!isPublicOffer" class="slots">
            <div v-for="g in theirSelectedGroups" :key="g.key" class="chip-anim" @click="toggleTheirsGroup(g, true)">
              <span>{{ g.info.emoji }}<sup v-if="g.td.badge" class="tb">{{ g.td.badge }}</sup></span>
              <span class="chip-count">×{{ g.selected }}</span>
            </div>
            <Button class="chip-add" @click="pickerOpen = pickerOpen==='theirs'?'':'theirs'">{{ tx('labels.addAnimal') }}</Button>
          </div>
          <CoinInput v-model="offer.theirCoins" :placeholder="tx('labels.coinsOptional')" />

          <div v-if="pickerOpen==='theirs'" class="picker">
            <div v-if="!partnerGroups.length" class="subtitle">{{ tx('hints.noPartnerTradable') }}</div>
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
        <InputText v-model="offer.note" maxlength="200" :placeholder="tx('labels.noteOptional')" />
        <Button class="btn full" :disabled="busy" @click="propose">
          {{ busy ? '...' : (isPublicOffer ? tx('actions.publishPublic') : tx('actions.sendTrade')) }}
        </Button>
      </div>
    </div>
  </template>

  <!-- PUBLIC -->
  <template v-if="tab === 'public'">
    <p class="subtitle">{{ tx('hints.publicList') }}</p>
    <div v-if="!visiblePublicTrades.length" class="card subtitle">{{ tx('hints.noPublic') }}</div>
    <div v-for="t in visiblePublicTrades" :key="t.id" class="trade-row card">
      <div class="row between">
        <div style="font-weight:700">{{ tx('labels.from') }} {{ t.requester_username }}</div>
        <div class="row" style="gap:6px;align-items:center">
          <span v-if="t.expires_at" class="badge" :title="tx('labels.expiresIn')">⏳ {{ fmtExpiry(t) }}</span>
          <Button
            v-if="t.requester_id !== auth.user.id"
            class="btn secondary small"
            :title="tx('labels.hide')"
            @click="hidePublicTrade(t.id)"
          >🙈</Button>
          <span class="subtitle" style="margin:0">{{ new Date(t.created_at).toLocaleString(currentLocaleTag()) }}</span>
        </div>
      </div>
      <div class="row sides-mini">
        <div class="side-mini">
          <div class="mini-label">{{ tx('labels.offer') }}</div>
          <div class="mini-row">
            <span v-for="a in t.requester_animal_details" :key="a.id" class="e" :style="{ '--tb': tierColor(a) }" :class="{ tiered: (a.tier && a.tier !== 'normal') }">{{ speciesInfo(a.species).emoji }}<sup v-if="tierBadge(a)" class="tb">{{ tierBadge(a) }}</sup></span>
            <span v-if="Number(t.requester_coins) > 0" class="coins">🪙 {{ formatCoins(t.requester_coins) }}</span>
            <span v-if="!t.requester_animal_details.length && Number(t.requester_coins) === 0" class="subtitle">{{ tx('labels.nothing') }}</span>
          </div>
        </div>
        <div class="arrow-mini">⇄</div>
        <div class="side-mini">
          <div class="mini-label">{{ tx('labels.asks') }}</div>
          <div class="mini-row">
            <span v-if="Number(t.addressee_coins) > 0" class="coins">🪙 {{ formatCoins(t.addressee_coins) }}</span>
            <span v-else class="subtitle">{{ tx('labels.freeOptionalAnimals') }}</span>
          </div>
        </div>
      </div>
      <div v-if="t.note" class="subtitle" style="margin:4px 0 0">„{{ t.note }}"</div>
      <template v-if="t.requester_id !== auth.user.id">
        <div class="subtitle" style="margin:6px 0 4px">{{ tx('labels.optionalGiveAnimals') }}</div>
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
          {{ busy ? '...' : tx('labels.accept') }}
        </Button>
      </template>
      <div v-else class="row" style="gap:6px;margin-top:8px">
        <span class="badge">{{ tx('labels.yourOffer') }}</span>
        <Button class="btn danger small" :disabled="busy" @click="act(t.id, 'cancel_trade')">{{ tx('labels.cancel') }}</Button>
      </div>
    </div>
  </template>

  <!-- EINGANG -->
  <template v-if="tab === 'in'">
    <div v-if="!incoming.length" class="card subtitle">{{ tx('hints.noIncoming') }}</div>
    <div v-for="t in incoming" :key="t.id" class="trade-row card">
      <div class="row between">
        <div style="font-weight:700">{{ tx('labels.from') }} {{ t.requester_username }}</div>
        <span class="subtitle" style="margin:0">{{ new Date(t.created_at).toLocaleString(currentLocaleTag()) }}</span>
      </div>
      <div class="row sides-mini">
        <div class="side-mini">
          <div class="mini-label">{{ tx('labels.youGet') }}</div>
          <div class="mini-row">
            <span v-for="a in t.requester_animal_details" :key="a.id" class="e" :style="{ '--tb': tierColor(a) }" :class="{ tiered: (a.tier && a.tier !== 'normal') }">{{ speciesInfo(a.species).emoji }}<sup v-if="tierBadge(a)" class="tb">{{ tierBadge(a) }}</sup></span>
            <span v-if="Number(t.requester_coins) > 0" class="coins">🪙 {{ formatCoins(t.requester_coins) }}</span>
            <span v-if="!t.requester_animal_details.length && Number(t.requester_coins) === 0" class="subtitle">{{ tx('labels.nothing') }}</span>
          </div>
        </div>
        <div class="arrow-mini">⇄</div>
        <div class="side-mini">
          <div class="mini-label">{{ tx('labels.youGive') }}</div>
          <div class="mini-row">
            <span v-for="a in t.addressee_animal_details" :key="a.id" class="e" :style="{ '--tb': tierColor(a) }" :class="{ tiered: (a.tier && a.tier !== 'normal') }">{{ speciesInfo(a.species).emoji }}<sup v-if="tierBadge(a)" class="tb">{{ tierBadge(a) }}</sup></span>
            <span v-if="Number(t.addressee_coins) > 0" class="coins">🪙 {{ formatCoins(t.addressee_coins) }}</span>
            <span v-if="!t.addressee_animal_details.length && Number(t.addressee_coins) === 0" class="subtitle">{{ tx('labels.nothing') }}</span>
          </div>
        </div>
      </div>
      <div v-if="t.note" class="subtitle" style="margin:4px 0 0">„{{ t.note }}"</div>
      <div class="row" style="gap:6px;margin-top:8px">
        <Button class="btn" :disabled="busy" @click="act(t.id, 'accept_trade')">✓ {{ tx('labels.accept') }}</Button>
        <Button class="btn secondary" :disabled="busy" @click="act(t.id, 'decline_trade')">✗ {{ tx('labels.decline') }}</Button>
      </div>
    </div>
  </template>

  <!-- AUSGANG -->
  <template v-if="tab === 'out'">
    <div v-if="!outgoing.length" class="card subtitle">{{ tx('hints.noOutgoing') }}</div>
    <div v-for="t in outgoing" :key="t.id" class="trade-row card">
      <div class="row between">
        <div style="font-weight:700">{{ tx('labels.to') }} {{ t.addressee_username }}</div>
        <span class="subtitle" style="margin:0">{{ new Date(t.created_at).toLocaleString(currentLocaleTag()) }}</span>
      </div>
      <div class="row sides-mini">
        <div class="side-mini">
          <div class="mini-label">{{ tx('labels.youGive') }}</div>
          <div class="mini-row">
            <span v-for="a in t.requester_animal_details" :key="a.id" class="e" :style="{ '--tb': tierColor(a) }" :class="{ tiered: (a.tier && a.tier !== 'normal') }">{{ speciesInfo(a.species).emoji }}<sup v-if="tierBadge(a)" class="tb">{{ tierBadge(a) }}</sup></span>
            <span v-if="Number(t.requester_coins) > 0" class="coins">🪙 {{ formatCoins(t.requester_coins) }}</span>
          </div>
        </div>
        <div class="arrow-mini">⇄</div>
        <div class="side-mini">
          <div class="mini-label">{{ tx('labels.youGet') }}</div>
          <div class="mini-row">
            <span v-for="a in t.addressee_animal_details" :key="a.id" class="e" :style="{ '--tb': tierColor(a) }" :class="{ tiered: (a.tier && a.tier !== 'normal') }">{{ speciesInfo(a.species).emoji }}<sup v-if="tierBadge(a)" class="tb">{{ tierBadge(a) }}</sup></span>
            <span v-if="Number(t.addressee_coins) > 0" class="coins">🪙 {{ formatCoins(t.addressee_coins) }}</span>
          </div>
        </div>
      </div>
      <Button class="btn danger" :disabled="busy" @click="act(t.id, 'cancel_trade')" style="margin-top:8px">{{ tx('labels.cancel') }}</Button>
    </div>
  </template>

  <!-- HISTORIE -->
  <template v-if="tab === 'hist'">
    <div v-if="!history.length" class="card subtitle">{{ tx('hints.noHistory') }}</div>
    <div v-for="t in history" :key="t.id" class="trade-row card" :class="'status-' + t.status">
      <div class="row between">
        <div style="font-weight:700">
          <template v-if="t.requester_id === auth.user.id">{{ tx('labels.to') }} {{ t.addressee_username }}</template>
          <template v-else>{{ tx('labels.from') }} {{ t.requester_username }}</template>
          · <span class="badge">{{ statusLabel(t.status) }}</span>
        </div>
        <span class="subtitle" style="margin:0">{{ new Date(t.closed_at || t.created_at).toLocaleString(currentLocaleTag()) }}</span>
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
