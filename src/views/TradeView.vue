<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../supabase'
import { useAuthStore } from '../stores/auth'
import { useGameStore } from '../stores/game'
import { SPECIES, TIERS, speciesInfo, formatCoins, tierInfo, animalRate, compareAnimalsByRate } from '../animals'
import CoinInput from '../components/CoinInput.vue'
import { locale, currentLocaleTag } from '../i18n'
import { useReturnRefresh } from '../composables/useReturnRefresh'
import { hasWantedAnimals, pickWantedAnimals, wantedAnimalItems } from '../tradePublicWanted'
import { EGG_TYPES, loadEggCatalog } from '../eggs'
import FriendsPanel from '../components/FriendsPanel.vue'
import TradeTicket from '../components/TradeTicket.vue'
import { tradeSides, sideValue, fairness, relativeTime, groupByDay, groupAnimals, groupEggs } from '../tradeTickets'
import { marketKey, baseValue, tierQty } from '../market'
import { useAppToast } from '../composables/useAppToast'

const route = useRoute()

const auth = useAuthStore()
const game = useGameStore()

const I18N = {
  de: {
    title: 'Trade & Senden',
    ui: {
      sub: 'Tausche Tiere, Eier und Münzen mit anderen Spielern – mit Marktwert-Check.',
      tabs: { new: 'Neu', in: 'Eingang', out: 'Ausgang', public: 'Öffentlich', hist: 'Verlauf', friends: 'Freunde' },
      stats: { in: 'Für dich', out: 'Gesendet', public: 'Öffentlich', deals: 'Abschlüsse' },
      marketCta: 'Zur Zoo-Börse',
      give: 'Du gibst',
      get: 'Du bekommst',
      nothing: 'nichts',
      anyone: 'Beliebiger Spieler',
      wanted: 'Gesuchte Tiere – passende nimmst du aus deinem Zoo',
      fairPlus: '+{pct} Wert für dich',
      fairMinus: '−{pct} Wert für dich',
      fairEven: 'Ausgeglichen',
      kind: { in: 'Anfrage an dich', out: 'Deine Anfrage', public: 'Öffentliches Angebot', 'public-mine': 'Dein öffentliches Angebot' },
      status: { pending: 'Offen', public: 'Öffentlich', mine: 'Dein Angebot' },
      histFilter: { all: 'Alle', accepted: 'Angenommen', declined: 'Abgelehnt', cancelled: 'Zurückgezogen', expired: 'Abgelaufen' },
      today: 'Heute',
      yesterday: 'Gestern',
      modeDirect: '👤 Direkt',
      modePublic: '🌐 Öffentlich',
      stepPartner: 'Handelspartner',
      stepGive: 'Du gibst',
      stepGet: 'Du bekommst',
      stepSummary: 'Zusammenfassung',
      valueCheck: 'Wert-Check zum Marktwert',
      noValue: 'Wähle Tiere oder Münzen, um den Wert zu sehen.',
      empty: { in: 'Keine offenen Anfragen', out: 'Keine gesendeten Anfragen', public: 'Keine öffentlichen Angebote', hist: 'Noch kein Verlauf' },
      emptyHint: { in: 'Sobald dir jemand etwas anbietet, landet es hier.', out: 'Starte einen Tausch über „Neu".', public: 'Poste selbst ein Angebot für alle Spieler.', hist: 'Abgeschlossene Trades erscheinen hier.' },
      startTrade: '➕ Neuen Trade starten',
      abort: 'Abbrechen'
    },
    marketLink: '📈 Zoo-Börse: Live-Kurse & Angebote',
    tabs: { new: 'Neu', incoming: 'Eingang', outgoing: 'Ausgang', public: 'Public' },
    mode: { trade: 'Tausch', send: 'Senden' },
    time: { expired: 'abgelaufen' },
    labels: {
      profile: 'Profil',
      addAnimal: '＋ Tier',
      coinsOptional: 'Münzen (optional)',
      noteOptional: 'Notiz (optional)',
      accept: 'Annehmen',
      confirmAccept: 'Trade bestätigen',
      decline: 'Ablehnen',
      cancel: 'Zurückziehen',
      from: 'Von',
      to: 'An',
      expiresIn: 'Läuft in',
      yourOffer: 'Dein Angebot',
      offer: 'Bietet',
      asks: 'Verlangt',
      nothing: 'nichts',
      freeOptionalAnimals: 'frei (optional Tiere)',
      optionalGiveAnimals: 'Optional: Tiere mitgeben',
      wantedAnimals: 'Gewünschte Tiere',
      wantedAnyAnimals: 'Beliebige Tiere optional',
      confirmPublicTitle: 'Trade annehmen?',
      youGet: 'Du bekommst',
      youGive: 'Du gibst',
      tradePartner: 'Handelspartner',
      anyTaker: 'Beliebiger Annehmer',
      statusAccepted: 'Angenommen',
      statusDeclined: 'Abgelehnt',
      statusCancelled: 'Zurückgezogen',
      statusExpired: 'Abgelaufen'
    },
    hints: {
      oneWaySend: 'Einseitige Münz-Überweisung, kein Einverständnis nötig.',
      publicPost: 'Öffentlich posten',
      anyoneCanAccept: 'Jeder kann akzeptieren',
      publicCoinsOnly: 'Wähle Münzen oder gewünschte Tiere als Gegenleistung.',
      searching: 'Suche...',
      tradableAnimals: '{count} tauschbare Tiere',
      noMyTradable: 'Keine tauschbaren Tiere. Rüste sie zuerst ab.',
      noPartnerTradable: 'Dieser Spieler hat keine tauschbaren Tiere.',
      picker: 'Klick = +1 · Rechtsklick/Chip-Klick = -1',
      publicList: 'Öffentliche Angebote - jeder kann annehmen, der die verlangten Münzen/Tiere hat.',
      noPublic: 'Keine öffentlichen Trades.',
      noIncoming: 'Keine offenen Anfragen.',
      noOutgoing: 'Keine gesendeten Anfragen offen.',
      noHistory: 'Noch keine abgeschlossenen Trades.',
      noPendingNote: 'Noch keine offenen Trades.',
      directSendTitle: 'Empfänger-Username',
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
      partnerOrPublic: 'Partner wählen oder öffentlich posten',
      tradeEmpty: 'Trade ist komplett leer',
      notEnoughCoins: 'Nicht genug Münzen',
      publicNoSpecificAnimals: 'Öffentliche Trades können keine konkreten Tier-IDs vom Annehmer verlangen.',
      publicWantedIncomplete: 'Wähle gewünschte Tiere aus.',
      publicWantedNotMet: 'Wähle exakt die gewünschten Tiere für diesen öffentlichen Trade.',
      recipientRequired: 'Empfänger angeben',
      amountMin: 'Betrag muss >= 1 sein',
      recipientNotFound: 'Empfänger nicht gefunden'
    },
    success: {
      publicPosted: 'Öffentlicher Trade veröffentlicht!',
      tradeSent: 'Trade-Anfrage gesendet!',
      coinsSent: '{amount} 🪙 gesendet',
      tradeAccepted: 'Trade angenommen!',
      accepted: 'Angenommen!',
      declined: 'Abgelehnt',
      cancelled: 'Zurückgezogen'
    }
  },
  en: {
    title: 'Trade & Send',
    ui: {
      sub: 'Trade animals, eggs and coins with other players – with a market value check.',
      tabs: { new: 'New', in: 'Inbox', out: 'Sent', public: 'Public', hist: 'History', friends: 'Friends' },
      stats: { in: 'For you', out: 'Sent', public: 'Public', deals: 'Deals' },
      marketCta: 'Open Zoo Exchange',
      give: 'You give',
      get: 'You get',
      nothing: 'nothing',
      anyone: 'Any player',
      wanted: 'Wanted animals – matching ones come from your zoo',
      fairPlus: '+{pct} value for you',
      fairMinus: '−{pct} value for you',
      fairEven: 'Balanced',
      kind: { in: 'Request to you', out: 'Your request', public: 'Public offer', 'public-mine': 'Your public offer' },
      status: { pending: 'Open', public: 'Public', mine: 'Your offer' },
      histFilter: { all: 'All', accepted: 'Accepted', declined: 'Declined', cancelled: 'Cancelled', expired: 'Expired' },
      today: 'Today',
      yesterday: 'Yesterday',
      modeDirect: '👤 Direct',
      modePublic: '🌐 Public',
      stepPartner: 'Trade partner',
      stepGive: 'You give',
      stepGet: 'You get',
      stepSummary: 'Summary',
      valueCheck: 'Value check at market prices',
      noValue: 'Pick animals or coins to see the value.',
      empty: { in: 'No open requests', out: 'No sent requests', public: 'No public offers', hist: 'No history yet' },
      emptyHint: { in: 'When someone makes you an offer, it shows up here.', out: 'Start a trade via “New”.', public: 'Post an offer for all players yourself.', hist: 'Completed trades appear here.' },
      startTrade: '➕ Start a new trade',
      abort: 'Cancel'
    },
    marketLink: '📈 Zoo Exchange: live prices & offers',
    tabs: { new: 'New', incoming: 'Incoming', outgoing: 'Outgoing', public: 'Public' },
    mode: { trade: 'Trade', send: 'Send' },
    time: { expired: 'expired' },
    labels: {
      profile: 'Profile',
      addAnimal: '＋ Animal',
      coinsOptional: 'Coins (optional)',
      noteOptional: 'Note (optional)',
      accept: 'Accept',
      confirmAccept: 'Confirm trade',
      decline: 'Decline',
      cancel: 'Cancel',
      from: 'From',
      to: 'To',
      expiresIn: 'Expires in',
      yourOffer: 'Your offer',
      offer: 'Offers',
      asks: 'Asks',
      nothing: 'nothing',
      freeOptionalAnimals: 'free (optional animals)',
      optionalGiveAnimals: 'Optional: add animals',
      wantedAnimals: 'Wanted animals',
      wantedAnyAnimals: 'Any animals optional',
      confirmPublicTitle: 'Accept trade?',
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
      publicCoinsOnly: 'Choose coins or wanted animals as compensation.',
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
      publicNoSpecificAnimals: 'Public trades cannot require specific animal IDs from the accepter.',
      publicWantedIncomplete: 'Choose wanted animals.',
      publicWantedNotMet: 'Choose exactly the wanted animals for this public trade.',
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
    ui: {
      sub: 'Обменивай животных, яйца и монеты с другими игроками – с проверкой рыночной цены.',
      tabs: { new: 'Новый', in: 'Входящие', out: 'Исходящие', public: 'Публичные', hist: 'История', friends: 'Друзья' },
      stats: { in: 'Для тебя', out: 'Отправлено', public: 'Публичные', deals: 'Сделки' },
      marketCta: 'Открыть Зоо-биржу',
      give: 'Ты отдаёшь',
      get: 'Ты получаешь',
      nothing: 'ничего',
      anyone: 'Любой игрок',
      wanted: 'Нужные животные – подходящие возьмутся из твоего зоопарка',
      fairPlus: '+{pct} ценности для тебя',
      fairMinus: '−{pct} ценности для тебя',
      fairEven: 'Сбалансировано',
      kind: { in: 'Запрос тебе', out: 'Твой запрос', public: 'Публичное предложение', 'public-mine': 'Твоё публичное предложение' },
      status: { pending: 'Открыт', public: 'Публичный', mine: 'Твоё' },
      histFilter: { all: 'Все', accepted: 'Приняты', declined: 'Отклонены', cancelled: 'Отозваны', expired: 'Истекли' },
      today: 'Сегодня',
      yesterday: 'Вчера',
      modeDirect: '👤 Лично',
      modePublic: '🌐 Публично',
      stepPartner: 'Партнёр',
      stepGive: 'Ты отдаёшь',
      stepGet: 'Ты получаешь',
      stepSummary: 'Итог',
      valueCheck: 'Проверка по рыночной цене',
      noValue: 'Выбери животных или монеты, чтобы увидеть ценность.',
      empty: { in: 'Нет открытых запросов', out: 'Нет отправленных запросов', public: 'Нет публичных предложений', hist: 'История пуста' },
      emptyHint: { in: 'Когда тебе что-то предложат, это появится здесь.', out: 'Начни обмен во вкладке «Новый».', public: 'Опубликуй своё предложение для всех.', hist: 'Завершённые обмены появятся здесь.' },
      startTrade: '➕ Начать новый обмен',
      abort: 'Отмена'
    },
    marketLink: '📈 Зоо-биржа: живые курсы и предложения',
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
const isPublicOffer = ref(false)
const confirmPublic = ref(null)
const confirmPublicAnimals = ref([])

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

const visiblePublicTrades = computed(() => publicTrades.value)

// --- Partner + dessen Inventar
const partnerUsername = ref('')
const partnerProfile = ref(null)
const partnerAnimals = ref([])
const partnerSearching = ref(false)
const partnerError = ref('')

// --- Mein Angebot
const offer = reactive({
  myAnimals: new Set(),
  myEggs: new Set(),
  myCoins: null,
  theirAnimals: new Set(),
  theirEggs: new Set(),
  theirCoins: null,
  note: ''
})
const publicWanted = reactive({
  items: {},
  eggs: {}
})
const partnerEggs = ref([])
const mode = ref('trade')   // 'trade' | 'send'
const sendForm = reactive({ username: '', amount: null })
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
const tierOptions = computed(() =>
  Object.entries(TIERS)
    .map(([tier, td]) => ({ tier, ...td }))
    .sort((a, b) => (a.order || 0) - (b.order || 0))
)
const publicWantedGroups = computed(() => {
  const species = Object.values(SPECIES)
    .filter(s => s.enabled !== false)
    .slice()
    .sort((a, b) => (a.cost || 0) - (b.cost || 0))

  return species.flatMap(s => tierOptions.value.map(td => ({
    key: `${s.key}|${td.tier}`,
    species: s.key,
    tier: td.tier,
    info: speciesInfo(s.key),
    td,
    rate: (s.rate || 0) * (td.multiplier || 1)
  })))
})

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

// --- Eier-Picker ---
const myEggs = computed(() => game.playerEggs.map(e => ({
  ...e,
  meta: EGG_TYPES[e.egg_type] || { name: e.egg_type, emoji: '🥚' }
})))

const myEggGroups = computed(() => {
  const m = new Map()
  for (const e of myEggs.value) {
    if (!m.has(e.egg_type)) m.set(e.egg_type, { key: e.egg_type, meta: e.meta, list: [] })
    m.get(e.egg_type).list.push(e)
  }
  return [...m.values()]
})
const theirEggGroups = computed(() => {
  const m = new Map()
  for (const e of partnerEggs.value) {
    const meta = EGG_TYPES[e.egg_type] || { name: e.egg_type, emoji: '🥚' }
    if (!m.has(e.egg_type)) m.set(e.egg_type, { key: e.egg_type, meta, list: [] })
    m.get(e.egg_type).list.push(e)
  }
  return [...m.values()]
})
function myEggSelected(group) { return group.list.filter(e => offer.myEggs.has(e.id)).length }
function theirEggSelected(group) { return group.list.filter(e => offer.theirEggs.has(e.id)).length }
function toggleMyEgg(group, remove = false) {
  if (remove) { for (let i = group.list.length - 1; i >= 0; i--) if (offer.myEggs.has(group.list[i].id)) { offer.myEggs.delete(group.list[i].id); return } }
  else for (const e of group.list) if (!offer.myEggs.has(e.id)) { offer.myEggs.add(e.id); return }
}
function toggleTheirEgg(group, remove = false) {
  if (remove) { for (let i = group.list.length - 1; i >= 0; i--) if (offer.theirEggs.has(group.list[i].id)) { offer.theirEggs.delete(group.list[i].id); return } }
  else for (const e of group.list) if (!offer.theirEggs.has(e.id)) { offer.theirEggs.add(e.id); return }
}
function publicWantedEggQty(eggType) { return Math.max(0, Math.floor(Number(publicWanted.eggs[eggType] || 0))) }
function togglePublicWantedEgg(eggType, remove = false) {
  const cur = publicWantedEggQty(eggType)
  if (remove) { if (cur <= 1) delete publicWanted.eggs[eggType]; else publicWanted.eggs[eggType] = cur - 1 }
  else publicWanted.eggs[eggType] = cur + 1
}
const eggTypesList = computed(() => Object.values(EGG_TYPES).filter(et => et.enabled !== false))

function publicWantedTrade() {
  const wanted_animals = Object.entries(publicWanted.items)
    .map(([key, qty]) => {
      const [species, tier = 'normal'] = key.split('|')
      return { species, tier, qty: Math.max(0, Math.floor(Number(qty) || 0)) }
    })
    .filter(item => item.species && item.qty > 0)

  const first = wanted_animals[0]
  return {
    wanted_animals,
    wanted_species: first?.species || null,
    wanted_tier: first?.tier || 'normal',
    wanted_qty: first?.qty || 0
  }
}

function publicWantedGroupSelected(group) {
  return Math.max(0, Math.floor(Number(publicWanted.items[group.key]) || 0))
}

function togglePublicWantedGroup(group, remove = false) {
  const selected = publicWantedGroupSelected(group)
  if (remove) {
    if (!selected) return
    if (selected <= 1) delete publicWanted.items[group.key]
    else publicWanted.items[group.key] = selected - 1
    return
  }
  publicWanted.items[group.key] = selected + 1
}

const publicWantedSelectedGroups = computed(() =>
  publicWantedGroups.value
    .map(g => ({ ...g, selected: publicWantedGroupSelected(g) }))
    .filter(g => g.selected > 0)
)

function publicGiveAnimals(t) {
  if (confirmPublic.value?.id === t?.id) return confirmPublicAnimals.value
  return pickWantedAnimals(myTradableAnimals.value, t)
}

function publicAcceptDisabled(t) {
  return busy.value || Number(t.addressee_coins) > game.displayCoins || (hasWantedAnimals(t) && publicGiveAnimals(t).length === 0)
}

function publicWantedText(t) {
  if (!hasWantedAnimals(t)) return tx('labels.wantedAnyAnimals')
  return wantedAnimalItems(t).map((item) => {
    const info = speciesInfo(item.species)
    const tier = tierInfo(item.tier)
    return `${item.qty}× ${info.emoji} ${info.name}${tier.badge ? ` ${tier.badge}` : ''}`
  }).join(' + ')
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
    if (!p) { partnerError.value = tx('errors.notFound'); return }
    if (p.id === auth.user.id) { partnerError.value = tx('errors.isSelf'); return }
    partnerProfile.value = p
    const { data: animals } = await supabase.from('animals')
      .select('id, species, equipped, tier').eq('owner_id', p.id).eq('equipped', false)
      .order('acquired_at')
    partnerAnimals.value = (animals || []).slice().sort(compareAnimalsByRate).map(a => ({ ...a, info: speciesInfo(a.species), td: tierInfo(a.tier || 'normal') }))
    const { data: eggs } = await supabase.from('player_eggs')
      .select('id, egg_type').eq('owner_id', p.id)
    partnerEggs.value = eggs || []
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
  offer.myEggs.clear()
  offer.theirEggs.clear()
  offer.myCoins = null
  offer.theirCoins = null
  offer.note = ''
  publicWanted.items = {}
  publicWanted.eggs = {}
  partnerUsername.value = ''
  partnerProfile.value = null
  partnerAnimals.value = []
  partnerEggs.value = []
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
  const wanted = publicWantedTrade()
  if (isPublicOffer.value && ((wanted.wanted_species && wanted.wanted_qty < 1) || (!wanted.wanted_species && wanted.wanted_qty > 0))) {
    error.value = tx('errors.publicWantedIncomplete')
    return
  }
  busy.value = true
  try {
    await game.persist()
    const reqEggs = [...offer.myEggs]
    const addEggs = [...offer.theirEggs]
    const wantedEggs = isPublicOffer.value
      ? Object.entries(publicWanted.eggs)
          .map(([egg_type, qty]) => ({ egg_type, qty: Math.max(0, Math.floor(Number(qty) || 0)) }))
          .filter(x => x.egg_type && x.qty > 0)
      : []
    const { error: e } = await supabase.rpc('propose_trade', {
      p_addressee: isPublicOffer.value ? null : partnerProfile.value.username,
      p_requester_animals: reqAnimals,
      p_requester_coins: reqCoins,
      p_addressee_animals: isPublicOffer.value ? [] : addAnimals,
      p_addressee_coins: addCoins,
      p_note: offer.note || null,
      p_wanted_species: isPublicOffer.value ? wanted.wanted_species : null,
      p_wanted_tier: isPublicOffer.value ? wanted.wanted_tier : null,
      p_wanted_qty: isPublicOffer.value ? wanted.wanted_qty : 0,
      p_wanted_animals: isPublicOffer.value ? wanted.wanted_animals : [],
      p_requester_eggs: reqEggs,
      p_addressee_eggs: isPublicOffer.value ? [] : addEggs,
      p_wanted_eggs: wantedEggs
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
    sendForm.amount = null
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

function openPublicConfirm(t) {
  error.value = ''; success.value = ''
  if (Number(t.addressee_coins) > game.displayCoins) { error.value = tx('errors.notEnoughCoins'); return }
  const animals = publicGiveAnimals(t)
  if (hasWantedAnimals(t) && animals.length === 0) { error.value = tx('errors.publicWantedNotMet'); return }
  confirmPublicAnimals.value = animals
  confirmPublic.value = t
}

function closePublicConfirm() {
  if (busy.value) return
  confirmPublic.value = null
  confirmPublicAnimals.value = []
}

async function acceptPublic(t) {
  error.value = ''; success.value = ''
  const animals = publicGiveAnimals(t)
  const ids = animals.map(a => a.id)
  if (Number(t.addressee_coins) > game.displayCoins) { error.value = tx('errors.notEnoughCoins'); return }
  if (hasWantedAnimals(t) && animals.length === 0) { error.value = tx('errors.publicWantedNotMet'); return }
  busy.value = true
  try {
    await game.persist()
    const { error: e } = await supabase.rpc('accept_public_trade', { p_trade_id: t.id, p_my_animals: ids, p_my_eggs: [] })
    if (e) throw e
    success.value = tx('success.tradeAccepted')
    confirmPublic.value = null
    confirmPublicAnimals.value = []
    await Promise.all([loadTrades(), game.load()])
  } catch (e) { error.value = e.message }
  finally { busy.value = false; setTimeout(() => success.value = '', 2500) }
}

useReturnRefresh(() => Promise.all([loadTrades(), loadPrices()]))

// --- Realtime
let channel
onMounted(async () => {
  await game.load().catch(() => {})
  await loadEggCatalog()
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

// ── Ansicht: Marktwerte, Tickets, Verlauf ─────────────────────────────────
const appToast = useAppToast()
watch(error, (v) => { if (v) { appToast.err(v); error.value = '' } })
watch(success, (v) => { if (v) { appToast.ok(v); success.value = '' } })

const prices = ref(new Map())
async function loadPrices() {
  const { data, error: e } = await supabase.rpc('market_overview')
  if (e || !data) return
  if (data.server_now) game.serverOffset = new Date(data.server_now).getTime() - Date.now()
  const map = new Map()
  for (const m of data.markets || []) map.set(marketKey(m.species, m.tier), Number(m.value) || 0)
  prices.value = map
}
// Fallback ohne Börsenkurs (z. B. Stufe, die noch niemand besitzt): Basiswert der Formel
function priceOf(species, tier) {
  const p = prices.value.get(marketKey(species, tier))
  if (p != null) return p
  const sp = SPECIES[species]
  if (!sp) return null
  return baseValue({ cost: sp.cost, rate: sp.rate }) * tierQty(TIERS[tier || 'normal']?.required_qty)
}
const eggPriceOf = (type) => Number(EGG_TYPES[type]?.price_coins) || null

const nowTick = ref(Date.now())
let nowTimer = null
onMounted(() => {
  loadPrices()
  nowTimer = setInterval(() => {
    if (document.visibilityState === 'visible') nowTick.value = Date.now()
  }, 30_000)
})
onUnmounted(() => clearInterval(nowTimer))

function ago(ts) {
  return relativeTime(new Date(ts).getTime(), nowTick.value + Number(game.serverOffset || 0), locale.value || 'de')
}

const ticketLabels = computed(() => ({
  give: tx('ui.give'),
  get: tx('ui.get'),
  nothing: tx('ui.nothing'),
  anyone: tx('ui.anyone'),
  wanted: tx('ui.wanted'),
  fairPlus: tx('ui.fairPlus', { pct: '{pct}' }),
  fairMinus: tx('ui.fairMinus', { pct: '{pct}' }),
  fairEven: tx('ui.fairEven')
}))

function ticket(t) {
  const sides = tradeSides(t, auth.user?.id)
  const status = t.status === 'pending'
    ? (sides.kind === 'public' ? { text: tx('ui.status.public'), kind: 'public' }
      : sides.kind === 'public-mine' ? { text: tx('ui.status.mine'), kind: 'mine' }
      : { text: tx('ui.status.pending'), kind: 'pending' })
    : { text: statusLabel(t.status), kind: t.status }
  const when = t.status === 'pending' ? t.created_at : (t.closed_at || t.created_at)
  return {
    t,
    sides,
    status,
    partner: sides.partner || '',
    meta: `${tx('ui.kind.' + sides.kind)} · ${ago(when)}`,
    expiry: t.status === 'pending' && t.expires_at ? fmtExpiry(t) : '',
    giveValue: sideValue(sides.give, priceOf, eggPriceOf),
    getValue: sideValue(sides.get, priceOf, eggPriceOf)
  }
}

const incomingTickets = computed(() => { void nowTick.value; return incoming.value.map(ticket) })
const outgoingTickets = computed(() => { void nowTick.value; return outgoing.value.map(ticket) })
const publicTickets = computed(() => { void nowTick.value; return visiblePublicTrades.value.map(ticket) })

const HIST_FILTERS = ['all', 'accepted', 'declined', 'cancelled', 'expired']
const histFilter = ref('all')
const historyGroups = computed(() => {
  void nowTick.value
  const list = history.value.filter(t => histFilter.value === 'all' || t.status === histFilter.value)
  return groupByDay(list, t => t.closed_at || t.created_at).map(g => ({ ...g, items: g.items.map(ticket) }))
})
function dayLabel(date) {
  const d = new Date(date)
  const today = new Date(nowTick.value)
  const y = new Date(today); y.setDate(today.getDate() - 1)
  const same = (a, b) => a.toDateString() === b.toDateString()
  if (same(d, today)) return tx('ui.today')
  if (same(d, y)) return tx('ui.yesterday')
  return d.toLocaleDateString(currentLocaleTag(), { weekday: 'short', day: '2-digit', month: 'long' })
}
const dealCount = computed(() => history.value.filter(t => t.status === 'accepted').length)

// Live-Vorschau im Formular
const draftGive = computed(() => ({
  animals: groupAnimals(mySelectedGroups.value.map(g => ({ species: g.species, tier: g.tier, qty: g.selected }))),
  eggs: groupEggs(myEggGroups.value.filter(g => myEggSelected(g) > 0).map(g => ({ egg_type: g.key, qty: myEggSelected(g) }))),
  coins: Math.max(0, Math.floor(Number(offer.myCoins) || 0))
}))
const draftGet = computed(() => {
  const animals = isPublicOffer.value
    ? publicWantedSelectedGroups.value.map(g => ({ species: g.species, tier: g.tier, qty: g.selected }))
    : theirSelectedGroups.value.map(g => ({ species: g.species, tier: g.tier, qty: g.selected }))
  const eggs = isPublicOffer.value
    ? eggTypesList.value.filter(et => publicWantedEggQty(et.egg_type) > 0).map(et => ({ egg_type: et.egg_type, qty: publicWantedEggQty(et.egg_type) }))
    : theirEggGroups.value.filter(g => theirEggSelected(g) > 0).map(g => ({ egg_type: g.key, qty: theirEggSelected(g) }))
  return { animals: groupAnimals(animals), eggs: groupEggs(eggs), coins: Math.max(0, Math.floor(Number(offer.theirCoins) || 0)) }
})
const draftValues = computed(() => {
  const give = sideValue(draftGive.value, priceOf, eggPriceOf)
  const get = sideValue(draftGet.value, priceOf, eggPriceOf)
  return { give, get, fair: (give.value || get.value) ? fairness(give.value, get.value) : null }
})
const fmtVal = (v) => `${v.partial ? '≥ ' : '≈ '}${formatCoins(v.value)}`

function statusLabel(status) {
  if (status === 'accepted') return tx('labels.statusAccepted')
  if (status === 'declined') return tx('labels.statusDeclined')
  if (status === 'cancelled') return tx('labels.statusCancelled')
  if (status === 'expired') return tx('labels.statusExpired')
  return status
}
</script>

<template>
  <div class="tv">
    <h1 class="title">🔄 {{ tx('title') }}</h1>
    <p class="subtitle">{{ tx('ui.sub') }}</p>

    <!-- Kopf: Kennzahlen + Börse -->
    <section class="tv-hero">
      <div class="tv-stats">
        <button type="button" class="tv-stat" :class="{ hot: incoming.length }" @click="tab = 'in'">
          <b>{{ incoming.length }}</b><span>{{ tx('ui.stats.in') }}</span>
        </button>
        <button type="button" class="tv-stat" @click="tab = 'out'">
          <b>{{ outgoing.length }}</b><span>{{ tx('ui.stats.out') }}</span>
        </button>
        <button type="button" class="tv-stat" @click="tab = 'public'">
          <b>{{ visiblePublicTrades.length }}</b><span>{{ tx('ui.stats.public') }}</span>
        </button>
        <button type="button" class="tv-stat" @click="tab = 'hist'">
          <b>{{ dealCount }}</b><span>{{ tx('ui.stats.deals') }}</span>
        </button>
      </div>
      <router-link to="/market" class="tv-market">
        <span class="tv-market-icon">📈</span>
        <span class="tv-market-text">
          <b>{{ tx('ui.marketCta') }}</b>
          <small>{{ tx('marketLink') }}</small>
        </span>
        <span class="tv-market-arrow">›</span>
      </router-link>
    </section>

    <!-- Tabs -->
    <nav class="tv-tabs">
      <button
        v-for="k in ['new', 'in', 'out', 'public', 'hist', 'friends']"
        :key="k"
        type="button"
        class="tv-tab"
        :class="{ active: tab === k }"
        @click="tab = k"
      >
        <span class="tv-tab-icon">{{ { new: '➕', in: '📥', out: '📤', public: '🌐', hist: '🗂️', friends: '🤝' }[k] }}</span>
        <span class="tv-tab-label">{{ tx('ui.tabs.' + k) }}</span>
        <span v-if="k === 'in' && incoming.length" class="tv-badge hot">{{ incoming.length }}</span>
        <span v-else-if="k === 'out' && outgoing.length" class="tv-badge">{{ outgoing.length }}</span>
        <span v-else-if="k === 'public' && visiblePublicTrades.length" class="tv-badge green">{{ visiblePublicTrades.length }}</span>
      </button>
    </nav>

    <!-- NEU -->
    <template v-if="tab === 'new'">
      <div class="tv-seg">
        <button type="button" :class="{ active: mode === 'trade' }" @click="mode = 'trade'">🔄 {{ tx('mode.trade') }}</button>
        <button type="button" :class="{ active: mode === 'send' }" @click="mode = 'send'">💸 {{ tx('mode.send') }}</button>
      </div>

      <!-- SENDEN -->
      <section v-if="mode === 'send'" class="tv-card">
        <div class="tv-card-head"><span class="tv-step">💸</span><b>{{ tx('mode.send') }}</b></div>
        <p class="tv-muted">{{ tx('hints.oneWaySend') }}</p>
        <div class="tv-stack">
          <InputText v-model="sendForm.username" :placeholder="tx('hints.directSendTitle')" />
          <CoinInput v-model="sendForm.amount" :placeholder="tx('hints.amountPlaceholder')" />
          <Button class="btn full" :disabled="busy || !sendForm.username || !sendForm.amount" @click="sendGift">
            {{ busy ? '…' : tx('actions.send') }}
          </Button>
        </div>
      </section>

      <!-- TAUSCH -->
      <template v-else>
        <!-- 1 Partner -->
        <section class="tv-card">
          <div class="tv-card-head"><span class="tv-step">1</span><b>{{ tx('ui.stepPartner') }}</b></div>
          <div class="tv-seg small">
            <button type="button" :class="{ active: !isPublicOffer }" @click="isPublicOffer = false">{{ tx('ui.modeDirect') }}</button>
            <button type="button" :class="{ active: isPublicOffer }" @click="isPublicOffer = true">{{ tx('ui.modePublic') }}</button>
          </div>
          <template v-if="!isPublicOffer">
            <InputText v-model="partnerUsername" class="tv-full" :placeholder="tx('hints.partnerUsernamePlaceholder')" autocomplete="off" />
            <div v-if="partnerSearching" class="tv-muted tv-mt">{{ tx('hints.searching') }}</div>
            <div v-else-if="partnerError" class="tv-inline-err">{{ partnerError }}</div>
            <div v-else-if="partnerProfile" class="tv-partner">
              <div class="tv-partner-avatar">{{ partnerProfile.avatar_emoji || partnerProfile.username.charAt(0).toUpperCase() }}</div>
              <div class="tv-partner-info">
                <b>{{ partnerProfile.username }}</b>
                <small>🪙 {{ formatCoins(partnerProfile.coins) }} · {{ tx('hints.tradableAnimals', { count: partnerAnimals.length }) }}</small>
              </div>
              <router-link class="tv-chip-link" :to="{ name: 'profile', query: { u: partnerProfile.username } }">{{ tx('labels.profile') }}</router-link>
            </div>
          </template>
          <p v-else class="tv-muted tv-mt">🌐 {{ tx('hints.anyoneCanAccept') }} · {{ tx('hints.publicCoinsOnly') }}</p>
        </section>

        <template v-if="isPublicOffer || partnerProfile">
          <!-- 2 Du gibst -->
          <section class="tv-card side-give">
            <div class="tv-card-head">
              <span class="tv-step">2</span><b>{{ tx('ui.stepGive') }}</b>
              <span v-if="draftValues.give.value" class="tv-val">{{ fmtVal(draftValues.give) }}</span>
            </div>
            <div class="tv-slots">
              <button v-for="g in mySelectedGroups" :key="g.key" type="button" class="tv-sel" :style="g.td.badge ? { '--tier': g.td.color } : null" :class="{ tiered: !!g.td.badge }" @click="toggleMineGroup(g, true)">
                <span class="tv-sel-emoji">{{ g.info.emoji }}<i v-if="g.td.badge">{{ g.td.badge }}</i></span>
                <span class="tv-sel-name">{{ g.info.name }}</span>
                <em>×{{ g.selected }}</em><span class="tv-x">✕</span>
              </button>
              <button v-for="g in myEggGroups.filter(x => myEggSelected(x) > 0)" :key="'eg-' + g.key" type="button" class="tv-sel" @click="toggleMyEgg(g, true)">
                <span class="tv-sel-emoji">{{ g.meta.emoji }}</span>
                <span class="tv-sel-name">{{ g.meta.name }}</span>
                <em>×{{ myEggSelected(g) }}</em><span class="tv-x">✕</span>
              </button>
              <button type="button" class="tv-add" :class="{ open: pickerOpen === 'mine' }" @click="pickerOpen = pickerOpen === 'mine' ? '' : 'mine'">{{ tx('labels.addAnimal') }}</button>
              <button v-if="myEggGroups.length" type="button" class="tv-add" :class="{ open: pickerOpen === 'myEggs' }" @click="pickerOpen = pickerOpen === 'myEggs' ? '' : 'myEggs'">＋ 🥚</button>
            </div>

            <div v-if="pickerOpen === 'mine'" class="tv-picker">
              <div v-if="!myGroups.length" class="tv-muted">{{ tx('hints.noMyTradable') }}</div>
              <div v-else class="tv-picker-grid">
                <button v-for="g in myGroups" :key="g.key" type="button" class="tv-pick"
                        :class="{ active: myGroupSelected(g) > 0, tiered: g.tier !== 'normal' }"
                        :style="{ '--tier': g.td.color }"
                        @click="toggleMineGroup(g)" @contextmenu.prevent="toggleMineGroup(g, true)">
                  <span class="tv-pick-emoji">{{ g.info.emoji }}<i v-if="g.td.badge">{{ g.td.badge }}</i></span>
                  <span class="tv-pick-name">{{ g.info.name }}</span>
                  <span class="tv-pick-count"><b v-if="myGroupSelected(g) > 0">{{ myGroupSelected(g) }}/</b>{{ g.list.length }}</span>
                </button>
              </div>
              <div v-if="myGroups.length" class="tv-picker-hint">{{ tx('hints.picker') }}</div>
            </div>
            <div v-if="pickerOpen === 'myEggs'" class="tv-picker">
              <div class="tv-picker-grid">
                <button v-for="g in myEggGroups" :key="'pme-' + g.key" type="button" class="tv-pick"
                        :class="{ active: myEggSelected(g) > 0 }"
                        @click="toggleMyEgg(g)" @contextmenu.prevent="toggleMyEgg(g, true)">
                  <span class="tv-pick-emoji">{{ g.meta.emoji }}</span>
                  <span class="tv-pick-name">{{ g.meta.name }}</span>
                  <span class="tv-pick-count"><b v-if="myEggSelected(g) > 0">{{ myEggSelected(g) }}/</b>{{ g.list.length }}</span>
                </button>
              </div>
            </div>
            <CoinInput v-model="offer.myCoins" :placeholder="'🪙 ' + tx('labels.coinsOptional')" />
          </section>

          <div class="tv-swap" aria-hidden="true">⇅</div>

          <!-- 3 Du bekommst -->
          <section class="tv-card side-get">
            <div class="tv-card-head">
              <span class="tv-step">3</span><b>{{ tx('ui.stepGet') }}</b>
              <span class="tv-card-sub">{{ isPublicOffer ? tx('labels.anyTaker') : partnerProfile.username }}</span>
              <span v-if="draftValues.get.value" class="tv-val">{{ fmtVal(draftValues.get) }}</span>
            </div>
            <div class="tv-slots">
              <template v-if="!isPublicOffer">
                <button v-for="g in theirSelectedGroups" :key="g.key" type="button" class="tv-sel" :style="g.td.badge ? { '--tier': g.td.color } : null" :class="{ tiered: !!g.td.badge }" @click="toggleTheirsGroup(g, true)">
                  <span class="tv-sel-emoji">{{ g.info.emoji }}<i v-if="g.td.badge">{{ g.td.badge }}</i></span>
                  <span class="tv-sel-name">{{ g.info.name }}</span>
                  <em>×{{ g.selected }}</em><span class="tv-x">✕</span>
                </button>
                <button v-for="g in theirEggGroups.filter(x => theirEggSelected(x) > 0)" :key="'teg-' + g.key" type="button" class="tv-sel" @click="toggleTheirEgg(g, true)">
                  <span class="tv-sel-emoji">{{ g.meta.emoji }}</span>
                  <span class="tv-sel-name">{{ g.meta.name }}</span>
                  <em>×{{ theirEggSelected(g) }}</em><span class="tv-x">✕</span>
                </button>
                <button type="button" class="tv-add" :class="{ open: pickerOpen === 'theirs' }" @click="pickerOpen = pickerOpen === 'theirs' ? '' : 'theirs'">{{ tx('labels.addAnimal') }}</button>
                <button v-if="theirEggGroups.length" type="button" class="tv-add" :class="{ open: pickerOpen === 'theirEggs' }" @click="pickerOpen = pickerOpen === 'theirEggs' ? '' : 'theirEggs'">＋ 🥚</button>
              </template>
              <template v-else>
                <button v-for="g in publicWantedSelectedGroups" :key="g.key" type="button" class="tv-sel" :style="g.td.badge ? { '--tier': g.td.color } : null" :class="{ tiered: !!g.td.badge }" @click="togglePublicWantedGroup(g, true)">
                  <span class="tv-sel-emoji">{{ g.info.emoji }}<i v-if="g.td.badge">{{ g.td.badge }}</i></span>
                  <span class="tv-sel-name">{{ g.info.name }}</span>
                  <em>×{{ g.selected }}</em><span class="tv-x">✕</span>
                </button>
                <button v-for="et in eggTypesList.filter(et => publicWantedEggQty(et.egg_type) > 0)" :key="'pweg-' + et.egg_type" type="button" class="tv-sel" @click="togglePublicWantedEgg(et.egg_type, true)">
                  <span class="tv-sel-emoji">{{ et.emoji }}</span>
                  <span class="tv-sel-name">{{ et.name }}</span>
                  <em>×{{ publicWantedEggQty(et.egg_type) }}</em><span class="tv-x">✕</span>
                </button>
                <button type="button" class="tv-add" :class="{ open: pickerOpen === 'publicWanted' }" @click="pickerOpen = pickerOpen === 'publicWanted' ? '' : 'publicWanted'">{{ tx('labels.addAnimal') }}</button>
                <button v-if="eggTypesList.length" type="button" class="tv-add" :class="{ open: pickerOpen === 'publicWantedEggs' }" @click="pickerOpen = pickerOpen === 'publicWantedEggs' ? '' : 'publicWantedEggs'">＋ 🥚</button>
              </template>
            </div>

            <div v-if="pickerOpen === 'theirs'" class="tv-picker">
              <div v-if="!partnerGroups.length" class="tv-muted">{{ tx('hints.noPartnerTradable') }}</div>
              <div v-else class="tv-picker-grid">
                <button v-for="g in partnerGroups" :key="g.key" type="button" class="tv-pick"
                        :class="{ active: theirGroupSelected(g) > 0, tiered: g.tier !== 'normal' }"
                        :style="{ '--tier': g.td.color }"
                        @click="toggleTheirsGroup(g)" @contextmenu.prevent="toggleTheirsGroup(g, true)">
                  <span class="tv-pick-emoji">{{ g.info.emoji }}<i v-if="g.td.badge">{{ g.td.badge }}</i></span>
                  <span class="tv-pick-name">{{ g.info.name }}</span>
                  <span class="tv-pick-count"><b v-if="theirGroupSelected(g) > 0">{{ theirGroupSelected(g) }}/</b>{{ g.list.length }}</span>
                </button>
              </div>
            </div>
            <div v-if="pickerOpen === 'theirEggs'" class="tv-picker">
              <div class="tv-picker-grid">
                <button v-for="g in theirEggGroups" :key="'pte-' + g.key" type="button" class="tv-pick"
                        :class="{ active: theirEggSelected(g) > 0 }"
                        @click="toggleTheirEgg(g)" @contextmenu.prevent="toggleTheirEgg(g, true)">
                  <span class="tv-pick-emoji">{{ g.meta.emoji }}</span>
                  <span class="tv-pick-name">{{ g.meta.name }}</span>
                  <span class="tv-pick-count"><b v-if="theirEggSelected(g) > 0">{{ theirEggSelected(g) }}/</b>{{ g.list.length }}</span>
                </button>
              </div>
            </div>
            <div v-if="pickerOpen === 'publicWanted'" class="tv-picker">
              <div class="tv-picker-grid">
                <button v-for="g in publicWantedGroups" :key="g.key" type="button" class="tv-pick"
                        :class="{ active: publicWantedGroupSelected(g) > 0, tiered: g.tier !== 'normal' }"
                        :style="{ '--tier': g.td.color }"
                        @click="togglePublicWantedGroup(g)" @contextmenu.prevent="togglePublicWantedGroup(g, true)">
                  <span class="tv-pick-emoji">{{ g.info.emoji }}<i v-if="g.td.badge">{{ g.td.badge }}</i></span>
                  <span class="tv-pick-name">{{ g.info.name }}</span>
                  <span class="tv-pick-count"><b v-if="publicWantedGroupSelected(g) > 0">{{ publicWantedGroupSelected(g) }}</b><template v-else>＋</template></span>
                </button>
              </div>
              <div class="tv-picker-hint">{{ tx('hints.picker') }}</div>
            </div>
            <div v-if="pickerOpen === 'publicWantedEggs'" class="tv-picker">
              <div class="tv-picker-grid">
                <button v-for="et in eggTypesList" :key="'pwe-' + et.egg_type" type="button" class="tv-pick"
                        :class="{ active: publicWantedEggQty(et.egg_type) > 0 }"
                        @click="togglePublicWantedEgg(et.egg_type)" @contextmenu.prevent="togglePublicWantedEgg(et.egg_type, true)">
                  <span class="tv-pick-emoji">{{ et.emoji }}</span>
                  <span class="tv-pick-name">{{ et.name }}</span>
                  <span class="tv-pick-count"><b v-if="publicWantedEggQty(et.egg_type) > 0">{{ publicWantedEggQty(et.egg_type) }}</b><template v-else>＋</template></span>
                </button>
              </div>
            </div>
            <CoinInput v-model="offer.theirCoins" :placeholder="'🪙 ' + tx('labels.coinsOptional')" />
          </section>

          <!-- 4 Zusammenfassung -->
          <section class="tv-card tv-summary">
            <div class="tv-card-head"><span class="tv-step">4</span><b>{{ tx('ui.stepSummary') }}</b></div>
            <div class="tv-check">
              <div class="tv-check-title">{{ tx('ui.valueCheck') }}</div>
              <template v-if="draftValues.fair">
                <div class="tv-check-row">
                  <span class="give">{{ tx('ui.give') }} <b>{{ fmtVal(draftValues.give) }}</b></span>
                  <span class="get">{{ tx('ui.get') }} <b>{{ fmtVal(draftValues.get) }}</b></span>
                </div>
                <div class="tv-meter">
                  <i class="g" :style="{ width: ((1 - draftValues.fair.share) * 100).toFixed(1) + '%' }"></i>
                  <i class="r" :style="{ width: (draftValues.fair.share * 100).toFixed(1) + '%' }"></i>
                </div>
                <div class="tv-verdict" :class="draftValues.fair.verdict">
                  <template v-if="draftValues.fair.verdict === 'great' || draftValues.fair.verdict === 'good'">{{ tx('ui.fairPlus', { pct: Math.abs(draftValues.fair.pct).toFixed(0) + '%' }) }}</template>
                  <template v-else-if="draftValues.fair.verdict === 'fair'">{{ tx('ui.fairEven') }}</template>
                  <template v-else>{{ tx('ui.fairMinus', { pct: Math.abs(draftValues.fair.pct).toFixed(0) + '%' }) }}</template>
                </div>
              </template>
              <div v-else class="tv-muted">{{ tx('ui.noValue') }}</div>
            </div>
            <InputText v-model="offer.note" class="tv-full" maxlength="200" :placeholder="'💬 ' + tx('labels.noteOptional')" />
            <Button class="btn full tv-mt" :disabled="busy" @click="propose">
              {{ busy ? '…' : (isPublicOffer ? '🌐 ' + tx('actions.publishPublic') : '📤 ' + tx('actions.sendTrade')) }}
            </Button>
          </section>
        </template>
      </template>
    </template>

    <!-- ÖFFENTLICH -->
    <template v-if="tab === 'public'">
      <p class="tv-muted tv-lead">{{ tx('hints.publicList') }}</p>
      <div v-if="!publicTickets.length" class="tv-empty">
        <div class="tv-empty-icon">🌐</div>
        <b>{{ tx('ui.empty.public') }}</b>
        <span>{{ tx('ui.emptyHint.public') }}</span>
        <Button class="btn secondary" @click="tab = 'new'; mode = 'trade'; isPublicOffer = true">{{ tx('ui.startTrade') }}</Button>
      </div>
      <TradeTicket
        v-for="k in publicTickets"
        :key="k.t.id"
        :sides="k.sides"
        :partner="k.partner"
        :meta="k.meta"
        :status="k.status"
        :expiry="k.expiry"
        :note="k.t.note || ''"
        :give-value="k.giveValue"
        :get-value="k.getValue"
        :labels="ticketLabels"
      >
        <Button v-if="k.t.requester_id !== auth.user.id" class="btn" :disabled="publicAcceptDisabled(k.t)" @click="openPublicConfirm(k.t)">
          ✓ {{ tx('labels.accept') }}
        </Button>
        <Button v-else class="btn danger" :disabled="busy" @click="act(k.t.id, 'cancel_trade')">↩ {{ tx('labels.cancel') }}</Button>
      </TradeTicket>
    </template>

    <!-- EINGANG -->
    <template v-if="tab === 'in'">
      <div v-if="!incomingTickets.length" class="tv-empty">
        <div class="tv-empty-icon">📥</div>
        <b>{{ tx('ui.empty.in') }}</b>
        <span>{{ tx('ui.emptyHint.in') }}</span>
      </div>
      <TradeTicket
        v-for="k in incomingTickets"
        :key="k.t.id"
        :sides="k.sides"
        :partner="k.partner"
        :meta="k.meta"
        :status="k.status"
        :expiry="k.expiry"
        :note="k.t.note || ''"
        :give-value="k.giveValue"
        :get-value="k.getValue"
        :labels="ticketLabels"
      >
        <Button class="btn secondary" :disabled="busy" @click="act(k.t.id, 'decline_trade')">✕ {{ tx('labels.decline') }}</Button>
        <Button class="btn" :disabled="busy" @click="act(k.t.id, 'accept_trade')">✓ {{ tx('labels.accept') }}</Button>
      </TradeTicket>
    </template>

    <!-- AUSGANG -->
    <template v-if="tab === 'out'">
      <div v-if="!outgoingTickets.length" class="tv-empty">
        <div class="tv-empty-icon">📤</div>
        <b>{{ tx('ui.empty.out') }}</b>
        <span>{{ tx('ui.emptyHint.out') }}</span>
        <Button class="btn secondary" @click="tab = 'new'">{{ tx('ui.startTrade') }}</Button>
      </div>
      <TradeTicket
        v-for="k in outgoingTickets"
        :key="k.t.id"
        :sides="k.sides"
        :partner="k.partner"
        :meta="k.meta"
        :status="k.status"
        :expiry="k.expiry"
        :note="k.t.note || ''"
        :give-value="k.giveValue"
        :get-value="k.getValue"
        :labels="ticketLabels"
      >
        <Button class="btn danger" :disabled="busy" @click="act(k.t.id, 'cancel_trade')">↩ {{ tx('labels.cancel') }}</Button>
      </TradeTicket>
    </template>

    <!-- VERLAUF -->
    <template v-if="tab === 'hist'">
      <div class="tv-filters">
        <button
          v-for="f in HIST_FILTERS"
          :key="f"
          type="button"
          class="tv-filter"
          :class="[{ active: histFilter === f }, 'f-' + f]"
          @click="histFilter = f"
        >{{ tx('ui.histFilter.' + f) }}</button>
      </div>
      <div v-if="!historyGroups.length" class="tv-empty">
        <div class="tv-empty-icon">🗂️</div>
        <b>{{ tx('ui.empty.hist') }}</b>
        <span>{{ tx('ui.emptyHint.hist') }}</span>
      </div>
      <section v-for="g in historyGroups" :key="g.key" class="tv-day">
        <div class="tv-day-head"><span>{{ dayLabel(g.date) }}</span><i></i><small>{{ g.items.length }}</small></div>
        <TradeTicket
          v-for="k in g.items"
          :key="k.t.id"
          compact
          :sides="k.sides"
          :partner="k.partner"
          :meta="k.meta"
          :status="k.status"
          :give-value="k.giveValue"
          :get-value="k.getValue"
          :labels="ticketLabels"
        />
      </section>
    </template>

    <template v-if="tab === 'friends'">
      <FriendsPanel :hide-title="true" />
    </template>

    <!-- Bestätigung öffentlicher Trade -->
    <Teleport to="body">
      <div v-if="confirmPublic" class="tv-modal" @click.self="closePublicConfirm">
        <div class="tv-modal-card">
          <div class="tv-modal-head">
            <h3>{{ tx('labels.confirmPublicTitle') }}</h3>
            <button type="button" class="tv-close" :disabled="busy" @click="closePublicConfirm">✕</button>
          </div>
          <TradeTicket
            :sides="ticket(confirmPublic).sides"
            :partner="ticket(confirmPublic).partner"
            :meta="ticket(confirmPublic).meta"
            :give-value="ticket(confirmPublic).giveValue"
            :get-value="ticket(confirmPublic).getValue"
            :labels="ticketLabels"
          >
            <Button class="btn secondary" :disabled="busy" @click="closePublicConfirm">{{ tx('ui.abort') }}</Button>
            <Button class="btn" :disabled="busy" @click="acceptPublic(confirmPublic)">{{ busy ? '…' : tx('labels.confirmAccept') }}</Button>
          </TradeTicket>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.tv { padding-bottom: calc(16px + var(--safe-bot)); }
.tv .subtitle { margin-top: -6px; }
.tv-muted { color: var(--muted); font-size: 13px; font-weight: 600; margin: 0; }
.tv-lead { margin-bottom: var(--space-3); }
.tv-mt { margin-top: var(--space-2); }
.tv-full { width: 100%; }
.tv-stack { display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-3); }
.tv-inline-err { color: var(--danger); font-weight: 800; font-size: 13px; margin-top: var(--space-2); }

/* Kopf */
.tv-hero {
  border-radius: var(--radius); padding: var(--space-3); margin-bottom: var(--space-3);
  background:
    radial-gradient(circle at 110% -20%, color-mix(in srgb, var(--accent) 30%, transparent) 0%, transparent 50%),
    linear-gradient(160deg, #3a2a1a, #1f160d);
  box-shadow: 0 4px 0 #120c06, 0 14px 30px rgba(40, 25, 5, 0.22);
}
.tv-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.tv-stat {
  display: flex; flex-direction: column; align-items: center; gap: 1px; cursor: pointer;
  padding: 10px 4px; border-radius: 14px;
  background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 228, 180, 0.12); color: #fff3da;
}
.tv-stat b { font-size: 22px; font-variant-numeric: tabular-nums; line-height: 1.1; }
.tv-stat span { font-size: 11px; font-weight: 800; color: #c9b089; white-space: nowrap; }
.tv-stat.hot { background: color-mix(in srgb, var(--danger) 26%, transparent); border-color: color-mix(in srgb, var(--danger) 55%, transparent); }
.tv-stat.hot b { color: #fff; }
.tv-market {
  display: flex; align-items: center; gap: 10px; margin-top: var(--space-2);
  padding: 10px 12px; border-radius: 14px; color: #fff3da;
  background: linear-gradient(90deg, color-mix(in srgb, var(--accent-2) 30%, transparent), rgba(255, 255, 255, 0.04));
  border: 1px solid color-mix(in srgb, var(--accent-2) 45%, transparent);
}
.tv-market-icon { font-size: 22px; }
.tv-market-text { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.2; }
.tv-market-text b { font-size: 14px; }
.tv-market-text small { font-size: 11px; color: #c9b089; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tv-market-arrow { font-size: 22px; font-weight: 900; color: var(--accent-2); }

/* Tabs */
.tv-tabs {
  display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 4px;
  padding: 4px; margin-bottom: var(--space-3);
  background: var(--card); border: 2px solid var(--border); border-radius: 18px; box-shadow: var(--shadow-card);
}
.tv-tab {
  position: relative; display: flex; flex-direction: column; align-items: center; gap: 1px;
  padding: 7px 2px 6px; border: 0; border-radius: 13px; background: none; cursor: pointer; min-width: 0;
}
.tv-tab-icon { font-size: 18px; line-height: 1.1; }
.tv-tab-label { font-size: 11px; font-weight: 800; color: var(--muted); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tv-tab.active { background: linear-gradient(180deg, var(--accent-soft), var(--accent)); box-shadow: 0 3px 0 var(--accent-deep); }
.tv-tab.active .tv-tab-label { color: var(--accent-ink); }
.tv-badge {
  position: absolute; top: 2px; right: 4px; min-width: 18px; height: 18px; padding: 0 5px;
  display: grid; place-items: center; border-radius: 999px;
  font-size: 10px; font-weight: 900; background: var(--muted); color: #fff; border: 2px solid var(--card);
}
.tv-badge.hot { background: var(--danger); }
.tv-badge.green { background: var(--accent-2); }

/* Segment-Schalter */
.tv-seg { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; margin-bottom: var(--space-3); background: var(--surface-deep); border-radius: 14px; }
.tv-seg.small { margin: 0 0 var(--space-3); }
.tv-seg button { padding: 9px 0; border: 0; border-radius: 11px; background: none; font-weight: 900; color: var(--muted); cursor: pointer; }
.tv-seg button.active { background: var(--card); color: var(--heading); box-shadow: 0 2px 0 var(--border), 0 4px 10px rgba(120, 80, 20, 0.1); }

/* Formular-Karten */
.tv-card {
  background: var(--card); border: 2px solid var(--border); border-radius: var(--radius);
  box-shadow: var(--shadow-card); padding: var(--space-4); margin-bottom: var(--space-3);
  display: flex; flex-direction: column; gap: var(--space-2);
}
.tv-card-head { display: flex; align-items: center; gap: 10px; }
.tv-card-head b { color: var(--heading); font-size: 16px; }
.tv-card-sub { color: var(--muted); font-size: 12px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tv-step {
  width: 28px; height: 28px; border-radius: 50%; flex: 0 0 auto; display: grid; place-items: center;
  font-weight: 900; font-size: 14px; color: var(--accent-ink);
  background: linear-gradient(160deg, var(--accent-soft), var(--accent)); box-shadow: 0 2px 0 var(--accent-deep);
}
.tv-val { margin-left: auto; font-weight: 900; font-size: 13px; font-variant-numeric: tabular-nums; color: var(--heading); white-space: nowrap; }
.side-give { border-color: color-mix(in srgb, var(--danger) 30%, var(--border)); }
.side-give .tv-step { background: var(--danger); color: #fff; box-shadow: 0 2px 0 color-mix(in srgb, var(--danger) 65%, #000); }
.side-get { border-color: color-mix(in srgb, var(--accent-2) 35%, var(--border)); }
.side-get .tv-step { background: var(--accent-2); color: #fff; box-shadow: 0 2px 0 color-mix(in srgb, var(--accent-2) 65%, #000); }
.tv-swap {
  width: 34px; height: 34px; margin: -22px auto -8px; position: relative; z-index: 1;
  display: grid; place-items: center; border-radius: 50%; font-weight: 900; color: var(--accent-deep);
  background: var(--card); border: 2px solid var(--border); box-shadow: 0 2px 0 var(--border);
}

.tv-partner { display: flex; align-items: center; gap: 10px; padding: 10px; margin-top: var(--space-2); border-radius: 16px; background: var(--card-2); border: 2px solid var(--border); }
.tv-partner-avatar { width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; font-size: 22px; background: var(--card); border: 2px solid var(--accent-soft); flex: 0 0 auto; }
.tv-partner-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.tv-partner-info b { color: var(--heading); }
.tv-partner-info small { color: var(--muted); font-size: 12px; font-weight: 700; }
.tv-chip-link { font-size: 12px; font-weight: 900; padding: 6px 12px; border-radius: 999px; background: var(--card); border: 2px solid var(--border); color: var(--accent-deep); }

.tv-slots { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px; min-height: 54px; border-radius: 14px; background: var(--card-2); border: 2px dashed var(--border); }
.tv-sel {
  display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px 4px 5px; cursor: pointer;
  background: var(--card); border: 2px solid var(--border); border-radius: 12px;
}
.tv-sel.tiered { border-color: var(--tier); }
.tv-sel-emoji { position: relative; font-size: 22px; line-height: 1; }
.tv-sel-emoji i, .tv-pick-emoji i { position: absolute; right: -6px; bottom: -4px; font-size: 11px; font-style: normal; }
.tv-sel-name { font-size: 12px; font-weight: 800; max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tv-sel em { font-style: normal; font-weight: 900; font-size: 12px; color: var(--accent-deep); }
.tv-x { font-size: 10px; color: var(--muted); margin-left: 2px; }
.tv-add { padding: 6px 12px; border-radius: 12px; cursor: pointer; font-size: 13px; font-weight: 800; color: var(--accent-deep); background: none; border: 2px dashed var(--accent-soft); }
.tv-add.open { background: var(--accent); border-style: solid; border-color: var(--accent-deep); color: var(--accent-ink); }

.tv-picker { padding: 8px; border-radius: 14px; background: var(--surface-deep); max-height: 260px; overflow: auto; }
.tv-picker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 6px; }
.tv-pick {
  display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px 6px; cursor: pointer;
  background: var(--card); border: 2px solid var(--border); border-radius: 12px; min-width: 0;
}
.tv-pick.tiered { border-color: color-mix(in srgb, var(--tier) 60%, var(--border)); }
.tv-pick.active { border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent); background: color-mix(in srgb, var(--accent) 8%, var(--card)); }
.tv-pick-emoji { position: relative; font-size: 24px; line-height: 1; }
.tv-pick-name { font-size: 10px; font-weight: 800; color: var(--text); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tv-pick-count { font-size: 10px; color: var(--muted); font-weight: 800; }
.tv-pick-count b { color: var(--accent-deep); }
.tv-picker-hint { font-size: 11px; color: var(--muted); margin-top: 6px; }

.tv-check { padding: 12px; border-radius: 16px; background: var(--card-2); border: 2px solid var(--border); display: flex; flex-direction: column; gap: 8px; }
.tv-check-title { font-size: 11px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.tv-check-row { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; font-weight: 800; }
.tv-check-row .give { color: var(--danger); }
.tv-check-row .get { color: color-mix(in srgb, var(--accent-2) 80%, #000); text-align: right; }
.tv-check-row b { display: block; font-size: 15px; color: var(--heading); font-variant-numeric: tabular-nums; }
.tv-meter { display: flex; height: 10px; border-radius: 99px; overflow: hidden; background: var(--surface-deep); }
.tv-meter .g { background: var(--danger); }
.tv-meter .r { background: var(--accent-2); }
.tv-verdict { font-weight: 900; font-size: 14px; text-align: center; }
.tv-verdict.great, .tv-verdict.good { color: color-mix(in srgb, var(--accent-2) 80%, #000); }
.tv-verdict.bad, .tv-verdict.awful { color: var(--danger); }
.tv-verdict.fair { color: var(--muted); }

/* Leere Zustände */
.tv-empty {
  display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center;
  padding: var(--space-6) var(--space-4); border-radius: var(--radius);
  background: var(--card); border: 2px dashed var(--border); color: var(--muted); font-size: 13px; font-weight: 700;
}
.tv-empty b { color: var(--heading); font-size: 16px; }
.tv-empty-icon { font-size: 40px; opacity: 0.85; }
.tv-empty .p-button { margin-top: var(--space-2); }

/* Verlauf */
.tv-filters { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; margin-bottom: var(--space-3); padding-bottom: 2px; }
.tv-filters::-webkit-scrollbar { display: none; }
.tv-filter { flex: 0 0 auto; padding: 6px 12px; border-radius: 999px; cursor: pointer; font-size: 13px; font-weight: 800; background: var(--card); border: 2px solid var(--border); color: var(--text); }
.tv-filter.active { background: var(--heading); border-color: var(--heading); color: var(--card); }
.tv-filter.active.f-accepted { background: var(--accent-2); border-color: var(--accent-2); color: #fff; }
.tv-filter.active.f-declined, .tv-filter.active.f-cancelled { background: var(--danger); border-color: var(--danger); color: #fff; }
.tv-day { margin-bottom: var(--space-3); }
.tv-day-head { display: flex; align-items: center; gap: 8px; margin: 0 4px var(--space-2); font-size: 12px; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.tv-day-head i { flex: 1; height: 2px; background: var(--border); border-radius: 2px; }
.tv-day-head small { font-size: 11px; padding: 1px 7px; border-radius: 999px; background: var(--surface-deep); }

/* Bestätigung */
.tv-modal {
  position: fixed; inset: 0; z-index: 210; display: grid; place-items: center; padding: 16px;
  background: rgba(30, 20, 8, 0.55); backdrop-filter: blur(3px);
}
.tv-modal-card { width: 100%; max-width: 480px; max-height: calc(100% - 32px); overflow-y: auto; animation: tv-pop 0.18s ease-out; }
@keyframes tv-pop { from { transform: scale(0.94); opacity: 0; } }
.tv-modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; color: #fff; }
.tv-modal-head h3 { margin: 0; font-size: 18px; text-shadow: 0 2px 6px rgba(0, 0, 0, 0.4); }
.tv-close { width: 34px; height: 34px; padding: 0; border-radius: 50%; cursor: pointer; font-weight: 900; background: var(--card); border: 2px solid var(--border); }

@media (max-width: 380px) {
  .tv-tab-label { font-size: 10px; }
  .tv-stat b { font-size: 19px; }
}
</style>
