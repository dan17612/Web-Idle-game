<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase'
import { useGameStore } from '../stores/game'
import { speciesInfo, tierInfo, formatCoins, isUpgrading } from '../animals'
import { locale, currentLocaleTag } from '../i18n'
import { useAppToast } from '../composables/useAppToast'
import { useReturnRefresh } from '../composables/useReturnRefresh'
import CoinInput from '../components/CoinInput.vue'
import {
  MARKET, marketKey, tickerSymbol, portfolio, percentChange, formatPct,
  priceSuggestions, groupAsks, chartPoints, linePath, areaPath, timeScale, nearestPoint
} from '../market'

const route = useRoute()
const router = useRouter()
const game = useGameStore()
const appToast = useAppToast()

const I18N = {
  de: {
    title: 'Zoo-Börse',
    sub: 'Live-Kurse aller Tiere – je seltener und schwerer zu bekommen, desto wertvoller.',
    live: 'LIVE',
    tradeLink: '🔄 Tausch & Senden',
    portfolio: 'Dein Zoo-Portfolio',
    portfolioHint: '{n} Tiere zum Marktwert',
    cap: 'Marktkap.',
    volume: 'Volumen 7T',
    traders: 'Spieler',
    search: 'Tier suchen …',
    filters: { all: 'Alle', gainers: '🚀 Gewinner', losers: '📉 Verlierer', rare: '💎 Selten', offers: '🏷️ Angebote', mine: '⭐ Meine' },
    sort: { value: 'Wert', change: '24h %', rarity: 'Seltenheit', supply: 'Umlauf' },
    supply: 'Umlauf {n}',
    limited: 'LIMITED',
    you: 'Du: {n}',
    empty: 'Keine Märkte gefunden.',
    loading: 'Kurse werden geladen …',
    tapeTitle: '⚡ Live-Trades',
    tapeEmpty: 'Noch keine Trades – biete als Erster ein Tier an!',
    mineTitle: '🏷️ Deine offenen Angebote',
    detail: {
      marketValue: 'Marktwert',
      lastTrade: 'Letzter Trade',
      noTrade: 'noch keiner',
      range: { '24h': '24H', '7d': '7T', '30d': '30T' },
      supply: 'Im Umlauf',
      holders: 'Besitzer',
      cap: 'Marktkap.',
      volume: 'Volumen 7T',
      trades: 'Trades 7T',
      bestAsk: 'Bester Preis',
      none: '—',
      you: 'Du besitzt'
    },
    formula: {
      title: '🧮 Wie entsteht der Wert?',
      base: 'Basiswert',
      baseHint: 'Höchster Wert aus Shop-Preis, Einkommen × {f} und Crafting-Zutaten',
      tier: 'Stufe',
      tierHint: '{n} normale Tiere stecken in dieser Stufe',
      tierOne: 'Normale Stufe – ein einzelnes Tier',
      scarcity: 'Seltenheit',
      scarcityHint: '{h} von {p} Spielern besitzen es',
      ease: 'Beschaffbarkeit',
      easeHint: 'Truhe, Ei, Zucht oder Crafting. Ist ein Tier leicht zu bekommen, zählt die Seltenheit kaum.',
      easeLimited: 'Keine Quelle mehr – Limited Edition!',
      bonus: 'Seltenheits-Bonus',
      model: 'Modellwert',
      market: 'Marktsignal',
      marketHint: '{n} Trades in 7 Tagen ziehen den Kurs Richtung echter Preis',
      noMarket: 'Noch keine Trades – Kurs = Modellwert'
    },
    book: {
      title: '📒 Orderbuch',
      price: 'Preis',
      qty: 'Menge',
      total: 'Kumuliert',
      empty: 'Noch keine Angebote. Sei der Erste!',
      mine: 'Du',
      vsValue: '{pct} zum Marktwert'
    },
    tape: { title: '🧾 Letzte Trades', empty: 'Noch keine Trades.' },
    buyTab: '🟢 Kaufen',
    sellTab: '🔴 Verkaufen',
    buy: {
      available: '{n} Angebote von anderen Spielern',
      qty: 'Menge',
      avg: 'Ø Preis',
      total: 'Gesamt',
      vsValue: 'vs. Marktwert',
      btn: 'Kaufen · {qty}× für {total}',
      none: 'Gerade keine Angebote von anderen Spielern. Schau später wieder rein!',
      notEnough: 'Nicht genug Münzen',
      balance: 'Guthaben'
    },
    sell: {
      have: 'Verkaufbar: {n}',
      noneHint: 'Kein freies Exemplar. Ausgerüstete, upgradende oder brütende Tiere zuerst freigeben.',
      price: 'Stückpreis',
      total: 'Du erhältst',
      btn: 'Anbieten · {qty}× à {price}',
      hint: 'Das Tier bleibt bei dir, bis jemand kauft. Du kannst jederzeit zurückziehen.',
      chips: { m10: '−10 %', mkt: 'Marktwert', p10: '+10 %', p25: '+25 %' }
    },
    my: {
      title: 'Deine Angebote',
      cancel: 'Zurückziehen',
      cancelAll: 'Alle zurückziehen',
      invalid: 'ungültig',
      empty: 'Du hast keine offenen Angebote.'
    },
    confirm: {
      title: 'Kauf bestätigen',
      text: 'Du kaufst {qty}× {name} für insgesamt {total} 🪙.',
      cheap: '🔥 {pct} unter Marktwert',
      pricey: '⚠️ {pct} über Marktwert',
      fair: '👌 Fairer Preis',
      ok: 'Jetzt kaufen',
      cancel: 'Abbrechen'
    },
    toast: {
      bought: '{qty}× {name} gekauft!',
      listed: '{qty}× {name} zum Verkauf angeboten',
      cancelled: 'Angebot zurückgezogen'
    },
    err: {
      coins: 'Nicht genug Münzen',
      gone: 'Das Angebot ist nicht mehr verfügbar',
      own: 'Eigene Angebote kannst du nicht kaufen',
      animals: 'Tier nicht verfügbar (ausgerüstet, im Upgrade oder in der Zucht)',
      limit: 'Maximal 60 offene Angebote',
      price: 'Ungültiger Preis',
      listed: 'Tier ist bereits angeboten'
    }
  },
  en: {
    title: 'Zoo Exchange',
    sub: 'Live prices for every animal – the rarer and harder to get, the more it is worth.',
    live: 'LIVE',
    tradeLink: '🔄 Trade & Send',
    portfolio: 'Your zoo portfolio',
    portfolioHint: '{n} animals at market value',
    cap: 'Market cap',
    volume: 'Volume 7D',
    traders: 'Players',
    search: 'Search animal …',
    filters: { all: 'All', gainers: '🚀 Gainers', losers: '📉 Losers', rare: '💎 Rare', offers: '🏷️ Offers', mine: '⭐ Mine' },
    sort: { value: 'Value', change: '24h %', rarity: 'Rarity', supply: 'Supply' },
    supply: 'Supply {n}',
    limited: 'LIMITED',
    you: 'You: {n}',
    empty: 'No markets found.',
    loading: 'Loading prices …',
    tapeTitle: '⚡ Live trades',
    tapeEmpty: 'No trades yet – be the first to list an animal!',
    mineTitle: '🏷️ Your open offers',
    detail: {
      marketValue: 'Market value',
      lastTrade: 'Last trade',
      noTrade: 'none yet',
      range: { '24h': '24H', '7d': '7D', '30d': '30D' },
      supply: 'Supply',
      holders: 'Holders',
      cap: 'Market cap',
      volume: 'Volume 7D',
      trades: 'Trades 7D',
      bestAsk: 'Best price',
      none: '—',
      you: 'You own'
    },
    formula: {
      title: '🧮 How is the value made?',
      base: 'Base value',
      baseHint: 'Highest of shop price, income × {f} and crafting ingredients',
      tier: 'Tier',
      tierHint: '{n} normal animals go into this tier',
      tierOne: 'Normal tier – a single animal',
      scarcity: 'Rarity',
      scarcityHint: '{h} of {p} players own it',
      ease: 'Obtainability',
      easeHint: 'Chest, egg, breeding or crafting. If it is easy to get, rarity barely counts.',
      easeLimited: 'No source left – limited edition!',
      bonus: 'Rarity bonus',
      model: 'Model value',
      market: 'Market signal',
      marketHint: '{n} trades in 7 days pull the price toward the real price',
      noMarket: 'No trades yet – price = model value'
    },
    book: {
      title: '📒 Order book',
      price: 'Price',
      qty: 'Qty',
      total: 'Cumulative',
      empty: 'No offers yet. Be the first!',
      mine: 'You',
      vsValue: '{pct} vs. market value'
    },
    tape: { title: '🧾 Recent trades', empty: 'No trades yet.' },
    buyTab: '🟢 Buy',
    sellTab: '🔴 Sell',
    buy: {
      available: '{n} offers from other players',
      qty: 'Quantity',
      avg: 'Avg. price',
      total: 'Total',
      vsValue: 'vs. market value',
      btn: 'Buy · {qty}× for {total}',
      none: 'No offers from other players right now. Check back later!',
      notEnough: 'Not enough coins',
      balance: 'Balance'
    },
    sell: {
      have: 'Sellable: {n}',
      noneHint: 'No free copy. Unequip, finish upgrades or breeding first.',
      price: 'Unit price',
      total: 'You receive',
      btn: 'List · {qty}× at {price}',
      hint: 'The animal stays with you until someone buys it. Cancel anytime.',
      chips: { m10: '−10%', mkt: 'Market', p10: '+10%', p25: '+25%' }
    },
    my: {
      title: 'Your offers',
      cancel: 'Cancel',
      cancelAll: 'Cancel all',
      invalid: 'invalid',
      empty: 'You have no open offers.'
    },
    confirm: {
      title: 'Confirm purchase',
      text: 'You buy {qty}× {name} for {total} 🪙 in total.',
      cheap: '🔥 {pct} below market value',
      pricey: '⚠️ {pct} above market value',
      fair: '👌 Fair price',
      ok: 'Buy now',
      cancel: 'Cancel'
    },
    toast: {
      bought: 'Bought {qty}× {name}!',
      listed: 'Listed {qty}× {name} for sale',
      cancelled: 'Offer cancelled'
    },
    err: {
      coins: 'Not enough coins',
      gone: 'This offer is no longer available',
      own: 'You cannot buy your own offers',
      animals: 'Animal not available (equipped, upgrading or breeding)',
      limit: 'At most 60 open offers',
      price: 'Invalid price',
      listed: 'Animal is already listed'
    }
  },
  ru: {
    title: 'Зоо-биржа',
    sub: 'Живые курсы всех животных – чем реже и труднее добыть, тем дороже.',
    live: 'LIVE',
    tradeLink: '🔄 Обмен и отправка',
    portfolio: 'Твой зоо-портфель',
    portfolioHint: '{n} животных по рыночной цене',
    cap: 'Капитализация',
    volume: 'Объём 7д',
    traders: 'Игроки',
    search: 'Найти животное …',
    filters: { all: 'Все', gainers: '🚀 Рост', losers: '📉 Падение', rare: '💎 Редкие', offers: '🏷️ Предложения', mine: '⭐ Мои' },
    sort: { value: 'Цена', change: '24ч %', rarity: 'Редкость', supply: 'Оборот' },
    supply: 'Оборот {n}',
    limited: 'LIMITED',
    you: 'У тебя: {n}',
    empty: 'Рынки не найдены.',
    loading: 'Загрузка курсов …',
    tapeTitle: '⚡ Живые сделки',
    tapeEmpty: 'Сделок пока нет – выстави животное первым!',
    mineTitle: '🏷️ Твои открытые предложения',
    detail: {
      marketValue: 'Рыночная цена',
      lastTrade: 'Последняя сделка',
      noTrade: 'пока нет',
      range: { '24h': '24Ч', '7d': '7Д', '30d': '30Д' },
      supply: 'В обороте',
      holders: 'Владельцы',
      cap: 'Капитализация',
      volume: 'Объём 7д',
      trades: 'Сделки 7д',
      bestAsk: 'Лучшая цена',
      none: '—',
      you: 'У тебя'
    },
    formula: {
      title: '🧮 Как считается цена?',
      base: 'Базовая цена',
      baseHint: 'Максимум из цены магазина, дохода × {f} и ингредиентов крафта',
      tier: 'Уровень',
      tierHint: 'В этом уровне {n} обычных животных',
      tierOne: 'Обычный уровень – одно животное',
      scarcity: 'Редкость',
      scarcityHint: 'Есть у {h} из {p} игроков',
      ease: 'Доступность',
      easeHint: 'Сундук, яйцо, разведение или крафт. Если получить легко, редкость почти не влияет.',
      easeLimited: 'Источников больше нет – лимитированная серия!',
      bonus: 'Бонус редкости',
      model: 'Модельная цена',
      market: 'Сигнал рынка',
      marketHint: '{n} сделок за 7 дней тянут курс к реальной цене',
      noMarket: 'Сделок пока нет – курс = модельная цена'
    },
    book: {
      title: '📒 Стакан',
      price: 'Цена',
      qty: 'Кол-во',
      total: 'Накоплено',
      empty: 'Предложений пока нет. Будь первым!',
      mine: 'Ты',
      vsValue: '{pct} к рыночной цене'
    },
    tape: { title: '🧾 Последние сделки', empty: 'Сделок пока нет.' },
    buyTab: '🟢 Купить',
    sellTab: '🔴 Продать',
    buy: {
      available: '{n} предложений от других игроков',
      qty: 'Количество',
      avg: 'Ср. цена',
      total: 'Итого',
      vsValue: 'к рыночной цене',
      btn: 'Купить · {qty}× за {total}',
      none: 'Сейчас нет предложений от других игроков. Загляни позже!',
      notEnough: 'Недостаточно монет',
      balance: 'Баланс'
    },
    sell: {
      have: 'Можно продать: {n}',
      noneHint: 'Нет свободного экземпляра. Сними с экипировки или дождись улучшения/разведения.',
      price: 'Цена за штуку',
      total: 'Ты получишь',
      btn: 'Выставить · {qty}× по {price}',
      hint: 'Животное остаётся у тебя, пока его не купят. Отозвать можно в любой момент.',
      chips: { m10: '−10%', mkt: 'Рынок', p10: '+10%', p25: '+25%' }
    },
    my: {
      title: 'Твои предложения',
      cancel: 'Отозвать',
      cancelAll: 'Отозвать все',
      invalid: 'недействительно',
      empty: 'У тебя нет открытых предложений.'
    },
    confirm: {
      title: 'Подтвердить покупку',
      text: 'Ты покупаешь {qty}× {name} всего за {total} 🪙.',
      cheap: '🔥 {pct} ниже рыночной цены',
      pricey: '⚠️ {pct} выше рыночной цены',
      fair: '👌 Честная цена',
      ok: 'Купить',
      cancel: 'Отмена'
    },
    toast: {
      bought: 'Куплено: {qty}× {name}!',
      listed: 'Выставлено на продажу: {qty}× {name}',
      cancelled: 'Предложение отозвано'
    },
    err: {
      coins: 'Недостаточно монет',
      gone: 'Предложение больше недоступно',
      own: 'Нельзя купить своё предложение',
      animals: 'Животное недоступно (экипировано, улучшается или разводится)',
      limit: 'Максимум 60 открытых предложений',
      price: 'Неверная цена',
      listed: 'Животное уже выставлено'
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
  return String(value ?? key).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

function friendlyError(e) {
  const msg = String(e?.message || e || '')
  if (/insufficient coins/i.test(msg)) return tx('err.coins')
  if (/no longer available/i.test(msg)) return tx('err.gone')
  if (/your own listing/i.test(msg)) return tx('err.own')
  if (/not available/i.test(msg)) return tx('err.animals')
  if (/too many open listings/i.test(msg)) return tx('err.limit')
  if (/invalid price/i.test(msg)) return tx('err.price')
  if (/already listed/i.test(msg)) return tx('err.listed')
  return msg
}

const nowMs = () => Date.now() + Number(game.serverOffset || 0)
function applyServerNow(data) {
  if (data?.server_now) game.serverOffset = new Date(data.server_now).getTime() - Date.now()
}

// ── Übersicht ────────────────────────────────────────────────────────────
const overview = ref(null)
const loadError = ref('')
const busyKey = ref('')
const flash = reactive({})
let lastValues = new Map()

async function loadOverview() {
  const { data, error } = await supabase.rpc('market_overview')
  if (error) { loadError.value = friendlyError(error); return }
  loadError.value = ''
  applyServerNow(data)
  const next = new Map()
  for (const m of data?.markets || []) {
    const key = marketKey(m.species, m.tier)
    const v = Number(m.value)
    next.set(key, v)
    const prev = lastValues.get(key)
    if (prev != null && prev !== v) {
      flash[key] = v > prev ? 'up' : 'down'
      setTimeout(() => { delete flash[key] }, 1400)
    }
  }
  lastValues = next
  overview.value = data
}

const markets = computed(() => (overview.value?.markets || []).map((m) => {
  const info = speciesInfo(m.species)
  const td = tierInfo(m.tier)
  const value = Number(m.value) || 0
  const prev = m.prev_24h != null ? Number(m.prev_24h) : value
  const spark = (m.spark || []).map(Number)
  const pts = chartPoints(spark, 76, 30, 3)
  return {
    ...m,
    key: marketKey(m.species, m.tier),
    info,
    td,
    value,
    prev,
    change: percentChange(value, prev),
    symbol: tickerSymbol(m.species),
    sparkLine: linePath(pts),
    sparkArea: areaPath(pts, 30),
    limited: Number(m.ease) === 0,
    cap: value * (Number(m.supply) || 0)
  }
}))
const marketByKey = computed(() => new Map(markets.value.map((m) => [m.key, m])))

const listedIds = computed(() => new Set((overview.value?.mine || []).map((l) => l.animal_id)))
function isBreeding(a) {
  return !!a?.breeding_until && new Date(a.breeding_until).getTime() > nowMs()
}
const holdings = computed(() => {
  const all = new Map()
  const free = new Map()
  for (const a of game.animals) {
    const key = marketKey(a.species, a.tier)
    all.set(key, (all.get(key) || 0) + 1)
    if (!a.equipped && !isUpgrading(a) && !isBreeding(a) && !listedIds.value.has(a.id)) {
      if (!free.has(key)) free.set(key, [])
      free.get(key).push(a)
    }
  }
  return { all, free }
})

const pf = computed(() => {
  const p = portfolio(game.animals, overview.value?.markets || [])
  const pts = chartPoints(p.spark, 320, 64, 4)
  return { ...p, line: linePath(pts), area: areaPath(pts, 64) }
})
const totalCap = computed(() => markets.value.reduce((s, m) => s + m.cap, 0))
const totalVolume = computed(() => markets.value.reduce((s, m) => s + Number(m.volume_7d || 0), 0))

const tickerItems = computed(() => {
  const list = markets.value.slice()
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change) || b.value - a.value)
    .slice(0, 14)
  return list.length ? [...list, ...list] : []
})

// Filter & Sortierung
const FILTERS = ['all', 'gainers', 'losers', 'rare', 'offers', 'mine']
const SORTS = ['value', 'change', 'rarity', 'supply']
const filter = ref('all')
const sortBy = ref('value')
const search = ref('')

const visibleMarkets = computed(() => {
  const q = search.value.trim().toLowerCase()
  let list = markets.value.filter((m) => {
    if (q && !m.info.name.toLowerCase().includes(q) && !m.species.includes(q) && !m.symbol.toLowerCase().includes(q)) return false
    if (filter.value === 'gainers') return m.change > 0
    if (filter.value === 'losers') return m.change < 0
    if (filter.value === 'rare') return m.supply > 0 && (m.limited || Number(m.scarcity) >= 0.75)
    if (filter.value === 'offers') return m.asks > 0
    if (filter.value === 'mine') return (holdings.value.all.get(m.key) || 0) > 0
    return true
  })
  const by = sortBy.value
  list = list.slice().sort((a, b) => {
    if (by === 'change') return b.change - a.change
    if (by === 'rarity') return Number(b.scarcity) * (1 - Number(b.ease)) - Number(a.scarcity) * (1 - Number(a.ease))
    if (by === 'supply') return b.supply - a.supply
    return b.value - a.value
  })
  return list
})

const tape = computed(() => (overview.value?.tape || []).map((f) => ({
  ...f,
  info: speciesInfo(f.species),
  td: tierInfo(f.tier),
  mkt: marketByKey.value.get(marketKey(f.species, f.tier))
})))

const myListings = computed(() => (overview.value?.mine || []).map((l) => ({
  ...l,
  key: marketKey(l.species, l.tier),
  info: speciesInfo(l.species),
  td: tierInfo(l.tier),
  mkt: marketByKey.value.get(marketKey(l.species, l.tier))
})))

// ── Detail ───────────────────────────────────────────────────────────────
const selectedKey = computed(() => String(route.query.m || ''))
const selected = computed(() => marketByKey.value.get(selectedKey.value) || null)
const book = ref(null)
const range = ref('7d')
const side = ref('buy')
let openedHere = false

function openMarket(m) {
  if (!m) return
  openedHere = true
  side.value = 'buy'
  buyQty.value = 1
  sellQty.value = 1
  sellPrice.value = null
  book.value = null
  router.push({ query: { ...route.query, m: m.key } })
}
function closeMarket() {
  if (openedHere) { openedHere = false; router.back(); return }
  const q = { ...route.query }
  delete q.m
  router.replace({ query: q })
}

async function loadBook() {
  const key = selectedKey.value
  if (!key) return
  const [species, tier] = key.split('|')
  const { data, error } = await supabase.rpc('market_book', { p_species: species, p_tier: tier, p_range: range.value })
  if (key !== selectedKey.value) return
  if (error) { appToast.err(friendlyError(error)); return }
  applyServerNow(data)
  book.value = data
}

watch(selectedKey, (key) => {
  book.value = null
  hover.value = null
  confirmOpen.value = false
  if (key) loadBook()
})
watch(range, () => loadBook())

const detail = computed(() => {
  const m = selected.value
  if (!m) return null
  const bm = book.value?.market || {}
  const value = Number(bm.value ?? m.value) || 0
  const prev = bm.prev_24h != null ? Number(bm.prev_24h) : m.prev
  return {
    ...m,
    value,
    prev,
    change: percentChange(value, prev),
    model: Number(bm.model ?? m.model) || 0,
    base: Number(bm.base ?? m.base) || 0,
    scarcity: Number(bm.scarcity ?? m.scarcity) || 0,
    ease: Number(bm.ease ?? m.ease) || 0,
    fills: Number(bm.fills_7d ?? m.fills_7d) || 0,
    volume: Number(bm.volume_7d ?? m.volume_7d) || 0,
    lastPrice: bm.last_price ?? m.last_price,
    players: Number(bm.players ?? overview.value?.players) || 1
  }
})

const formula = computed(() => {
  const d = detail.value
  if (!d) return null
  const bonus = 1 + MARKET.SCARCITY_WEIGHT * d.scarcity * (1 - Math.min(1, d.ease))
  return {
    bonus,
    marketShift: d.model > 0 ? percentChange(d.value, d.model) : 0
  }
})

// Chart
const CH_W = 340
const CH_H = 190
const CH_PAD = 10
const hover = ref(null)
const chart = computed(() => {
  const hist = book.value?.history || []
  const fills = (book.value?.fills || []).map((f) => ({ t: new Date(f.t).getTime(), v: Number(f.price) }))
  const s = timeScale(hist, CH_W, CH_H, CH_PAD, fills.map((f) => f.v))
  const pts = s.points
  const up = (detail.value?.change || 0) >= 0
  const last = pts[pts.length - 1]
  const dots = fills
    .filter((f) => pts.length && f.t >= s.t0 && f.t <= s.t1 + 60_000)
    .map((f) => ({ x: +s.x(f.t).toFixed(2), y: +s.y(f.v).toFixed(2), v: f.v }))
  return {
    pts,
    line: linePath(pts),
    area: areaPath(pts, CH_H),
    up,
    last,
    dots,
    hi: s.max,
    lo: s.min,
    t0: s.t0,
    t1: s.t1,
    grid: [0.25, 0.5, 0.75].map((f) => CH_PAD + (CH_H - CH_PAD * 2) * f)
  }
})

function onChartMove(e) {
  const svg = e.currentTarget
  const rect = svg.getBoundingClientRect()
  if (!rect.width) return
  const px = ((e.clientX - rect.left) / rect.width) * CH_W
  hover.value = nearestPoint(chart.value.pts, px)
}
function onChartLeave() { hover.value = null }

function fmtTime(ms, withDate = false) {
  if (!ms) return ''
  const d = new Date(ms)
  const opts = withDate
    ? { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }
    : { hour: '2-digit', minute: '2-digit' }
  return d.toLocaleString(currentLocaleTag(), opts)
}
function fmtAgo(t) {
  const s = Math.max(0, Math.floor((nowMs() - new Date(t).getTime()) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

// Orderbuch
const asks = computed(() => (book.value?.asks || []).map((a) => ({ ...a, price: Number(a.price) })))
const levels = computed(() => groupAsks(asks.value).slice(0, 10))
const foreignAsks = computed(() => asks.value.filter((a) => !a.mine))
const bookFills = computed(() => {
  const list = (book.value?.fills || []).map((f) => ({ ...f, price: Number(f.price) }))
  return list.map((f, i) => {
    const older = list[i + 1]
    return { ...f, dir: !older ? 'flat' : f.price > older.price ? 'up' : f.price < older.price ? 'down' : 'flat' }
  })
})

// Kaufen
const buyQty = ref(1)
const buyMax = computed(() => Math.min(25, foreignAsks.value.length))
const buyPlan = computed(() => {
  const qty = Math.max(0, Math.min(buyQty.value, buyMax.value))
  const picked = foreignAsks.value.slice(0, qty)
  const total = picked.reduce((s, a) => s + a.price, 0)
  const avg = picked.length ? total / picked.length : 0
  const vs = detail.value?.value ? percentChange(avg, detail.value.value) : 0
  return { qty: picked.length, ids: picked.map((a) => a.id), total, avg, vs }
})
const canAfford = computed(() => buyPlan.value.total <= game.displayCoins)
function takeLevel(lvl) {
  if (!lvl.ids.length) return
  side.value = 'buy'
  const upTo = foreignAsks.value.filter((a) => a.price <= lvl.price).length
  buyQty.value = Math.max(1, Math.min(25, upTo))
}
function stepBuy(d) {
  buyQty.value = Math.max(1, Math.min(buyMax.value || 1, buyQty.value + d))
}

const confirmOpen = ref(false)
function askConfirm() {
  if (!buyPlan.value.qty) return
  if (!canAfford.value) { appToast.err(tx('buy.notEnough')); return }
  confirmOpen.value = true
}
async function doBuy() {
  const plan = buyPlan.value
  const d = detail.value
  if (!plan.qty || !d || busyKey.value) return
  busyKey.value = 'buy'
  try {
    await game.persist()
    const { data, error } = await supabase.rpc('market_buy', { p_listing_ids: plan.ids })
    if (error) throw error
    game.coins = Number(data.coins)
    applyServerNow(data)
    confirmOpen.value = false
    appToast.ok(tx('toast.bought', { qty: data.bought, name: `${d.info.emoji} ${d.info.name}${d.td.badge ? ' ' + d.td.badge : ''}` }))
    buyQty.value = 1
    await Promise.all([loadOverview(), loadBook(), game.load().catch(() => {})])
  } catch (e) {
    appToast.err(friendlyError(e))
    confirmOpen.value = false
    loadBook()
  } finally {
    busyKey.value = ''
  }
}

// Verkaufen
const sellQty = ref(1)
const sellPrice = ref(null)
const sellable = computed(() => holdings.value.free.get(selectedKey.value) || [])
const sellMax = computed(() => Math.min(25, sellable.value.length))
const suggestions = computed(() => priceSuggestions(detail.value?.value || 0))
const sellVs = computed(() => {
  const p = Number(sellPrice.value) || 0
  return p && detail.value?.value ? percentChange(p, detail.value.value) : 0
})
watch(() => detail.value?.key, () => {
  if (detail.value && sellPrice.value == null) sellPrice.value = detail.value.value
})
watch(side, (s) => {
  if (s === 'sell' && !sellPrice.value && detail.value) sellPrice.value = detail.value.value
})
function stepSell(d) {
  sellQty.value = Math.max(1, Math.min(sellMax.value || 1, sellQty.value + d))
}
async function doSell() {
  const d = detail.value
  const price = Math.floor(Number(sellPrice.value) || 0)
  if (!d || busyKey.value) return
  if (price < 1) { appToast.err(tx('err.price')); return }
  const ids = sellable.value.slice(0, Math.min(sellQty.value, sellMax.value)).map((a) => a.id)
  if (!ids.length) return
  busyKey.value = 'sell'
  try {
    const { data, error } = await supabase.rpc('market_list', { p_animal_ids: ids, p_price: price })
    if (error) throw error
    applyServerNow(data)
    appToast.ok(tx('toast.listed', { qty: data.listed, name: `${d.info.emoji} ${d.info.name}${d.td.badge ? ' ' + d.td.badge : ''}` }))
    sellQty.value = 1
    await Promise.all([loadOverview(), loadBook()])
  } catch (e) {
    appToast.err(friendlyError(e))
  } finally {
    busyKey.value = ''
  }
}

const myHere = computed(() => myListings.value.filter((l) => l.key === selectedKey.value))

async function cancelListings(ids) {
  if (!ids.length || busyKey.value) return
  busyKey.value = 'cancel:' + ids[0]
  try {
    const { data, error } = await supabase.rpc('market_cancel', { p_listing_ids: ids })
    if (error) throw error
    applyServerNow(data)
    appToast.info(tx('toast.cancelled'))
    await Promise.all([loadOverview(), selectedKey.value ? loadBook() : null])
  } catch (e) {
    appToast.err(friendlyError(e))
  } finally {
    busyKey.value = ''
  }
}

// ── Laden & Live-Polling ─────────────────────────────────────────────────
async function refreshAll() {
  await Promise.all([loadOverview(), selectedKey.value ? loadBook() : null])
}
useReturnRefresh(refreshAll)

let pollTimer = null
onMounted(async () => {
  game.load().catch(() => {})
  await loadOverview()
  if (selectedKey.value) loadBook()
  pollTimer = setInterval(() => {
    if (document.visibilityState !== 'visible' || busyKey.value) return
    refreshAll().catch(() => {})
  }, 20_000)
})
onUnmounted(() => { clearInterval(pollTimer) })

// Anzeige-Helfer
const pctClass = (n) => (n > 0.005 ? 'up' : n < -0.005 ? 'down' : 'flat')
const pctPill = (n, digits = 2) => formatPct(Math.abs(n) < 0.005 ? 0 : n, digits)
const tierStyle = (td) => (td?.badge ? { '--tier-color': td.color } : null)
const pct100 = (x) => `${Math.round((Number(x) || 0) * 100)}%`
</script>

<template>
  <div class="mk">
    <div class="mk-head">
      <h1 class="title">📈 {{ tx('title') }}</h1>
      <span class="mk-live"><i></i>{{ tx('live') }}</span>
    </div>
    <p class="subtitle">{{ tx('sub') }}</p>

    <!-- Ticker-Laufband -->
    <div v-if="tickerItems.length" class="mk-ticker" aria-hidden="true">
      <div class="mk-ticker-track">
        <button
          v-for="(m, i) in tickerItems"
          :key="m.key + i"
          type="button"
          class="mk-tick"
          @click="openMarket(m)"
        >
          <span class="mk-tick-sym">{{ m.info.emoji }} {{ m.symbol }}<small v-if="m.td.badge">{{ m.td.badge }}</small></span>
          <span class="mk-tick-val">{{ formatCoins(m.value) }}</span>
          <span class="mk-tick-pct" :class="pctClass(m.change)">{{ m.change >= 0 ? '▲' : '▼' }} {{ pctPill(m.change, 1) }}</span>
        </button>
      </div>
    </div>

    <!-- Portfolio -->
    <section class="mk-panel mk-hero">
      <div class="mk-hero-top">
        <div>
          <div class="mk-label">{{ tx('portfolio') }}</div>
          <div class="mk-hero-value">🪙 {{ formatCoins(pf.value) }}</div>
          <div class="mk-hero-sub">
            <span class="mk-pill" :class="pctClass(pf.change)">{{ pctPill(pf.change) }} · 24h</span>
            <span class="mk-dim">{{ tx('portfolioHint', { n: game.animals.length }) }}</span>
          </div>
        </div>
        <router-link to="/trade" class="mk-trade-link">{{ tx('tradeLink') }}</router-link>
      </div>
      <svg v-if="pf.line" class="mk-hero-spark" viewBox="0 0 320 64" preserveAspectRatio="none">
        <defs>
          <linearGradient id="mkHeroGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" :stop-color="pf.change >= 0 ? 'var(--mk-up)' : 'var(--mk-down)'" stop-opacity="0.45" />
            <stop offset="100%" :stop-color="pf.change >= 0 ? 'var(--mk-up)' : 'var(--mk-down)'" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path :d="pf.area" fill="url(#mkHeroGrad)" />
        <path :d="pf.line" fill="none" :stroke="pf.change >= 0 ? 'var(--mk-up)' : 'var(--mk-down)'" stroke-width="2.2" vector-effect="non-scaling-stroke" />
      </svg>
      <div class="mk-hero-stats">
        <div><span>{{ tx('cap') }}</span><b>{{ formatCoins(totalCap) }}</b></div>
        <div><span>{{ tx('volume') }}</span><b>{{ formatCoins(totalVolume) }}</b></div>
        <div><span>{{ tx('traders') }}</span><b>{{ overview?.players || '–' }}</b></div>
      </div>
    </section>

    <!-- Live-Trades -->
    <section class="card mk-tape">
      <div class="mk-sec-title">{{ tx('tapeTitle') }}</div>
      <div v-if="!tape.length" class="mk-dim small">{{ tx('tapeEmpty') }}</div>
      <div v-else class="mk-tape-row">
        <button v-for="(f, i) in tape" :key="i" type="button" class="mk-tape-item" @click="openMarket(f.mkt)">
          <span>{{ f.info.emoji }}{{ f.td.badge }}</span>
          <b>{{ formatCoins(f.price) }}</b>
          <small>{{ fmtAgo(f.t) }}</small>
        </button>
      </div>
    </section>

    <!-- Filter -->
    <div class="mk-filters">
      <button
        v-for="f in FILTERS"
        :key="f"
        type="button"
        class="mk-chip"
        :class="{ active: filter === f }"
        @click="filter = f"
      >{{ tx('filters.' + f) }}</button>
    </div>
    <div class="mk-tools">
      <input v-model="search" class="mk-search" type="search" :placeholder="tx('search')" />
      <select v-model="sortBy" class="mk-sort">
        <option v-for="s in SORTS" :key="s" :value="s">{{ tx('sort.' + s) }}</option>
      </select>
    </div>

    <!-- Marktliste -->
    <section class="card mk-list">
      <div v-if="!overview && !loadError" class="mk-dim mk-pad">{{ tx('loading') }}</div>
      <div v-else-if="loadError" class="error mk-pad">{{ loadError }}</div>
      <div v-else-if="!visibleMarkets.length" class="mk-dim mk-pad">{{ tx('empty') }}</div>
      <button
        v-for="m in visibleMarkets"
        :key="m.key"
        type="button"
        class="mk-row"
        :class="flash[m.key] ? 'flash-' + flash[m.key] : ''"
        @click="openMarket(m)"
      >
        <span class="mk-coin" :class="{ tiered: !!m.td.badge }" :style="tierStyle(m.td)">
          {{ m.info.emoji }}<i v-if="m.td.badge">{{ m.td.badge }}</i>
        </span>
        <span class="mk-name">
          <b>{{ m.info.name }}</b>
          <small>
            {{ m.symbol }}<em v-if="m.limited" class="mk-tag">{{ tx('limited') }}</em>
          </small>
          <small class="mk-dim">
            {{ tx('supply', { n: m.supply }) }}
            <template v-if="m.asks"> · 🏷️ {{ m.asks }}</template>
            <template v-if="holdings.all.get(m.key)"> · {{ tx('you', { n: holdings.all.get(m.key) }) }}</template>
          </small>
        </span>
        <svg class="mk-spark" viewBox="0 0 76 30" preserveAspectRatio="none">
          <path :d="m.sparkArea" :class="['area', pctClass(m.change)]" />
          <path :d="m.sparkLine" :class="['line', pctClass(m.change)]" vector-effect="non-scaling-stroke" />
        </svg>
        <span class="mk-price">
          <b>{{ formatCoins(m.value) }}</b>
          <span class="mk-pill" :class="pctClass(m.change)">{{ pctPill(m.change) }}</span>
        </span>
      </button>
    </section>

    <!-- Eigene Angebote -->
    <section v-if="myListings.length" class="card mk-mine">
      <div class="mk-sec-title">{{ tx('mineTitle') }}</div>
      <div v-for="l in myListings" :key="l.id" class="mk-mine-row" :class="{ invalid: !l.valid }">
        <button type="button" class="mk-mine-main" @click="openMarket(l.mkt)">
          <span>{{ l.info.emoji }}{{ l.td.badge }}</span>
          <b>{{ l.info.name }}</b>
          <span class="mk-mono">🪙 {{ formatCoins(l.price) }}</span>
          <span v-if="l.mkt" class="mk-pill" :class="pctClass(percentChange(l.price, l.mkt.value))">{{ pctPill(percentChange(l.price, l.mkt.value), 0) }}</span>
          <em v-if="!l.valid" class="mk-tag danger">{{ tx('my.invalid') }}</em>
        </button>
        <Button class="btn secondary mk-small" :disabled="!!busyKey" @click="cancelListings([l.id])">✕</Button>
      </div>
    </section>

    <!-- Detail-Overlay -->
    <Teleport to="body">
      <div v-if="selectedKey" class="mk-sheet" @click.self="closeMarket">
        <div class="mk-sheet-inner">
          <div class="mk-sheet-head">
            <button type="button" class="mk-back" @click="closeMarket">←</button>
            <template v-if="detail">
              <span class="mk-coin lg" :class="{ tiered: !!detail.td.badge }" :style="tierStyle(detail.td)">
                {{ detail.info.emoji }}<i v-if="detail.td.badge">{{ detail.td.badge }}</i>
              </span>
              <div class="mk-sheet-title">
                <b>{{ detail.info.name }}<span v-if="detail.td.badge"> {{ detail.td.badge }}</span></b>
                <small>{{ detail.symbol }} · {{ detail.tier.toUpperCase() }}<em v-if="detail.limited" class="mk-tag">{{ tx('limited') }}</em></small>
              </div>
            </template>
          </div>

          <div v-if="!detail" class="mk-dim mk-pad">{{ tx('loading') }}</div>
          <template v-else>
            <!-- Kurs + Chart -->
            <section class="mk-panel mk-chart-panel">
              <div class="mk-label">{{ tx('detail.marketValue') }}</div>
              <div class="mk-big" :class="flash[detail.key] ? 'flash-' + flash[detail.key] : ''">
                🪙 {{ formatCoins(hover ? hover.v : detail.value) }}
              </div>
              <div class="mk-hero-sub">
                <span class="mk-pill" :class="pctClass(detail.change)">{{ detail.change >= 0 ? '▲' : '▼' }} {{ pctPill(detail.change) }} · 24h</span>
                <span class="mk-dim">
                  <template v-if="hover">{{ fmtTime(hover.t, true) }}</template>
                  <template v-else>{{ tx('detail.lastTrade') }}: {{ detail.lastPrice != null ? formatCoins(detail.lastPrice) : tx('detail.noTrade') }}</template>
                </span>
              </div>

              <div class="mk-chart-wrap">
                <svg
                  class="mk-chart"
                  :viewBox="`0 0 ${CH_W} ${CH_H}`"
                  preserveAspectRatio="none"
                  @pointermove="onChartMove"
                  @pointerdown="onChartMove"
                  @pointerleave="onChartLeave"
                >
                  <defs>
                    <linearGradient id="mkChartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" :stop-color="chart.up ? 'var(--mk-up)' : 'var(--mk-down)'" stop-opacity="0.5" />
                      <stop offset="100%" :stop-color="chart.up ? 'var(--mk-up)' : 'var(--mk-down)'" stop-opacity="0" />
                    </linearGradient>
                  </defs>
                  <line v-for="g in chart.grid" :key="g" :x1="0" :x2="CH_W" :y1="g" :y2="g" class="mk-grid" />
                  <path v-if="chart.area" :d="chart.area" fill="url(#mkChartGrad)" />
                  <path v-if="chart.line" :d="chart.line" fill="none" :stroke="chart.up ? 'var(--mk-up)' : 'var(--mk-down)'" stroke-width="2.4" vector-effect="non-scaling-stroke" stroke-linejoin="round" />
                  <line v-if="chart.last" :x1="0" :x2="CH_W" :y1="chart.last.y" :y2="chart.last.y" class="mk-lastline" />
                  <circle v-for="(d, i) in chart.dots" :key="'d' + i" :cx="d.x" :cy="d.y" r="3.4" class="mk-fill-dot" />
                  <template v-if="hover">
                    <line :x1="hover.x" :x2="hover.x" y1="0" :y2="CH_H" class="mk-cross" />
                    <circle :cx="hover.x" :cy="hover.y" r="4.5" class="mk-hover-dot" :class="chart.up ? 'up' : 'down'" />
                  </template>
                  <circle v-else-if="chart.last" :cx="chart.last.x" :cy="chart.last.y" r="4" class="mk-pulse" :class="chart.up ? 'up' : 'down'" />
                </svg>
                <div v-if="!book" class="mk-chart-loading">{{ tx('loading') }}</div>
                <div v-else class="mk-axis">
                  <span>{{ fmtTime(chart.t0, true) }}</span>
                  <span>↑ {{ formatCoins(Math.max(0, chart.hi)) }} · ↓ {{ formatCoins(Math.max(0, chart.lo)) }}</span>
                  <span>{{ fmtTime(chart.t1) }}</span>
                </div>
              </div>

              <div class="mk-ranges">
                <button
                  v-for="r in ['24h', '7d', '30d']"
                  :key="r"
                  type="button"
                  class="mk-range"
                  :class="{ active: range === r }"
                  @click="range = r"
                >{{ tx('detail.range.' + r) }}</button>
              </div>
            </section>

            <!-- Kennzahlen -->
            <section class="mk-stats">
              <div><span>{{ tx('detail.supply') }}</span><b>{{ detail.supply }}</b></div>
              <div><span>{{ tx('detail.holders') }}</span><b>{{ detail.holders }} / {{ detail.players }}</b></div>
              <div><span>{{ tx('detail.cap') }}</span><b>{{ formatCoins(detail.value * detail.supply) }}</b></div>
              <div><span>{{ tx('detail.volume') }}</span><b>{{ formatCoins(detail.volume) }}</b></div>
              <div><span>{{ tx('detail.trades') }}</span><b>{{ detail.fills }}</b></div>
              <div><span>{{ tx('detail.you') }}</span><b>{{ holdings.all.get(detail.key) || 0 }}</b></div>
            </section>

            <!-- Handel -->
            <section class="card mk-trade">
              <div class="mk-sides">
                <button type="button" class="mk-side buy" :class="{ active: side === 'buy' }" @click="side = 'buy'">{{ tx('buyTab') }}</button>
                <button type="button" class="mk-side sell" :class="{ active: side === 'sell' }" @click="side = 'sell'">{{ tx('sellTab') }}</button>
              </div>

              <template v-if="side === 'buy'">
                <div v-if="!foreignAsks.length" class="mk-dim small">{{ tx('buy.none') }}</div>
                <template v-else>
                  <div class="mk-dim small">{{ tx('buy.available', { n: foreignAsks.length }) }}</div>
                  <div class="mk-form-row">
                    <span>{{ tx('buy.qty') }}</span>
                    <div class="mk-stepper">
                      <button type="button" @click="stepBuy(-1)">−</button>
                      <b>{{ buyPlan.qty }}</b>
                      <button type="button" @click="stepBuy(1)">＋</button>
                    </div>
                  </div>
                  <div class="mk-form-row"><span>{{ tx('buy.avg') }}</span><b class="mk-mono">🪙 {{ formatCoins(buyPlan.avg) }}</b></div>
                  <div class="mk-form-row">
                    <span>{{ tx('buy.vsValue') }}</span>
                    <span class="mk-pill" :class="pctClass(-buyPlan.vs)">{{ pctPill(buyPlan.vs, 1) }}</span>
                  </div>
                  <div class="mk-form-row total"><span>{{ tx('buy.total') }}</span><b class="mk-mono">🪙 {{ formatCoins(buyPlan.total) }}</b></div>
                  <div class="mk-form-row"><span>{{ tx('buy.balance') }}</span><span class="mk-mono" :class="{ bad: !canAfford }">🪙 {{ formatCoins(game.displayCoins) }}</span></div>
                  <Button class="btn full mk-buy-btn" :disabled="!!busyKey || !buyPlan.qty || !canAfford" @click="askConfirm">
                    {{ canAfford ? tx('buy.btn', { qty: buyPlan.qty, total: formatCoins(buyPlan.total) }) : tx('buy.notEnough') }}
                  </Button>
                </template>
              </template>

              <template v-else>
                <div class="mk-dim small">{{ tx('sell.have', { n: sellable.length }) }}</div>
                <div v-if="!sellable.length" class="mk-hint">{{ tx('sell.noneHint') }}</div>
                <template v-else>
                  <div class="mk-form-row">
                    <span>{{ tx('buy.qty') }}</span>
                    <div class="mk-stepper">
                      <button type="button" @click="stepSell(-1)">−</button>
                      <b>{{ Math.min(sellQty, sellMax) }}</b>
                      <button type="button" @click="stepSell(1)">＋</button>
                    </div>
                  </div>
                  <div class="mk-label dark">{{ tx('sell.price') }}</div>
                  <CoinInput v-model="sellPrice" :placeholder="formatCoins(detail.value)" />
                  <div class="mk-chips">
                    <button
                      v-for="s in suggestions"
                      :key="s.key"
                      type="button"
                      class="mk-chip sm"
                      :class="{ active: Number(sellPrice) === s.price }"
                      @click="sellPrice = s.price"
                    >{{ tx('sell.chips.' + s.key) }}</button>
                  </div>
                  <div class="mk-form-row">
                    <span>{{ tx('buy.vsValue') }}</span>
                    <span class="mk-pill" :class="pctClass(sellVs)">{{ pctPill(sellVs, 1) }}</span>
                  </div>
                  <div class="mk-form-row total">
                    <span>{{ tx('sell.total') }}</span>
                    <b class="mk-mono">🪙 {{ formatCoins((Number(sellPrice) || 0) * Math.min(sellQty, sellMax)) }}</b>
                  </div>
                  <Button class="btn danger full" :disabled="!!busyKey || !(Number(sellPrice) >= 1)" @click="doSell">
                    {{ tx('sell.btn', { qty: Math.min(sellQty, sellMax), price: formatCoins(sellPrice || 0) }) }}
                  </Button>
                  <div class="mk-hint">{{ tx('sell.hint') }}</div>
                </template>
              </template>

              <div v-if="myHere.length" class="mk-myhere">
                <div class="mk-form-row">
                  <b>{{ tx('my.title') }} ({{ myHere.length }})</b>
                  <button type="button" class="mk-link" :disabled="!!busyKey" @click="cancelListings(myHere.map(l => l.id))">{{ tx('my.cancelAll') }}</button>
                </div>
                <div v-for="l in myHere" :key="l.id" class="mk-form-row">
                  <span class="mk-mono">🪙 {{ formatCoins(l.price) }} <em v-if="!l.valid" class="mk-tag danger">{{ tx('my.invalid') }}</em></span>
                  <button type="button" class="mk-link" :disabled="!!busyKey" @click="cancelListings([l.id])">{{ tx('my.cancel') }}</button>
                </div>
              </div>
            </section>

            <!-- Orderbuch -->
            <section class="mk-panel mk-book">
              <div class="mk-sec-title light">{{ tx('book.title') }}</div>
              <div v-if="!levels.length" class="mk-dim small">{{ tx('book.empty') }}</div>
              <template v-else>
                <div class="mk-book-head">
                  <span>{{ tx('book.price') }}</span><span>{{ tx('book.qty') }}</span><span>{{ tx('book.total') }}</span>
                </div>
                <button
                  v-for="lvl in levels.slice().reverse()"
                  :key="lvl.price"
                  type="button"
                  class="mk-book-row"
                  :class="{ own: !lvl.ids.length }"
                  :style="{ '--depth': (lvl.depth * 100).toFixed(1) + '%' }"
                  @click="takeLevel(lvl)"
                >
                  <span class="ask">{{ formatCoins(lvl.price) }}</span>
                  <span>{{ lvl.qty }}<small v-if="lvl.ownIds.length"> ({{ tx('book.mine') }} {{ lvl.ownIds.length }})</small></span>
                  <span>{{ lvl.cum }}</span>
                </button>
                <div class="mk-book-mid">
                  <b>{{ formatCoins(detail.value) }}</b>
                  <span class="mk-dim">{{ tx('book.vsValue', { pct: pctPill(percentChange(levels[0].price, detail.value), 1) }) }}</span>
                </div>
              </template>
            </section>

            <!-- Trades -->
            <section class="card mk-fills">
              <div class="mk-sec-title">{{ tx('tape.title') }}</div>
              <div v-if="!bookFills.length" class="mk-dim small">{{ tx('tape.empty') }}</div>
              <div v-for="(f, i) in bookFills.slice(0, 15)" :key="i" class="mk-form-row">
                <span class="mk-dim">{{ fmtTime(new Date(f.t).getTime(), true) }}</span>
                <b class="mk-mono" :class="f.dir">{{ f.dir === 'down' ? '▼' : f.dir === 'up' ? '▲' : '•' }} {{ formatCoins(f.price) }}</b>
              </div>
            </section>

            <!-- Formel -->
            <section class="card mk-formula">
              <div class="mk-sec-title">{{ tx('formula.title') }}</div>
              <div class="mk-f-row">
                <div><b>{{ tx('formula.base') }}</b><small>{{ tx('formula.baseHint', { f: MARKET.UTIL_FACTOR }) }}</small></div>
                <span class="mk-mono">{{ formatCoins(detail.base) }}</span>
              </div>
              <div class="mk-f-row">
                <div><b>{{ tx('formula.tier') }} {{ detail.td.badge }}</b><small>{{ detail.qty > 1 ? tx('formula.tierHint', { n: detail.qty }) : tx('formula.tierOne') }}</small></div>
                <span class="mk-mono">× {{ detail.qty }}</span>
              </div>
              <div class="mk-f-row">
                <div>
                  <b>{{ tx('formula.scarcity') }}</b>
                  <small>{{ tx('formula.scarcityHint', { h: detail.holders, p: detail.players }) }}</small>
                  <div class="mk-bar"><i :style="{ width: pct100(detail.scarcity) }" class="purple"></i></div>
                </div>
                <span class="mk-mono">{{ pct100(detail.scarcity) }}</span>
              </div>
              <div class="mk-f-row">
                <div>
                  <b>{{ tx('formula.ease') }}</b>
                  <small>{{ detail.limited ? tx('formula.easeLimited') : tx('formula.easeHint') }}</small>
                  <div class="mk-bar"><i :style="{ width: pct100(detail.ease) }" class="green"></i></div>
                </div>
                <span class="mk-mono">{{ pct100(detail.ease) }}</span>
              </div>
              <div class="mk-f-row">
                <div><b>{{ tx('formula.bonus') }}</b><small>1 + {{ MARKET.SCARCITY_WEIGHT }} × {{ pct100(detail.scarcity) }} × (1 − {{ pct100(detail.ease) }})</small></div>
                <span class="mk-mono">× {{ formula.bonus.toFixed(2) }}</span>
              </div>
              <div class="mk-f-row sum">
                <div><b>{{ tx('formula.model') }}</b></div>
                <span class="mk-mono">{{ formatCoins(detail.model) }}</span>
              </div>
              <div class="mk-f-row">
                <div>
                  <b>{{ tx('formula.market') }}</b>
                  <small>{{ detail.fills ? tx('formula.marketHint', { n: detail.fills }) : tx('formula.noMarket') }}</small>
                </div>
                <span class="mk-pill" :class="pctClass(formula.marketShift)">{{ pctPill(formula.marketShift, 1) }}</span>
              </div>
              <div class="mk-f-row sum total">
                <div><b>= {{ tx('detail.marketValue') }}</b></div>
                <span class="mk-mono">🪙 {{ formatCoins(detail.value) }}</span>
              </div>
            </section>
          </template>
        </div>

        <!-- Kauf-Bestätigung -->
        <div v-if="confirmOpen && detail" class="mk-modal" @click.self="confirmOpen = false">
          <div class="mk-modal-card">
            <div class="mk-modal-emoji">{{ detail.info.emoji }}{{ detail.td.badge }}</div>
            <h3>{{ tx('confirm.title') }}</h3>
            <p>{{ tx('confirm.text', { qty: buyPlan.qty, name: detail.info.name, total: formatCoins(buyPlan.total) }) }}</p>
            <p class="mk-verdict" :class="buyPlan.vs < -2 ? 'up' : buyPlan.vs > 2 ? 'down' : 'flat'">
              <template v-if="buyPlan.vs < -2">{{ tx('confirm.cheap', { pct: Math.abs(buyPlan.vs).toFixed(1) + '%' }) }}</template>
              <template v-else-if="buyPlan.vs > 2">{{ tx('confirm.pricey', { pct: buyPlan.vs.toFixed(1) + '%' }) }}</template>
              <template v-else>{{ tx('confirm.fair') }}</template>
            </p>
            <div class="mk-modal-actions">
              <Button class="btn secondary" :disabled="busyKey === 'buy'" @click="confirmOpen = false">{{ tx('confirm.cancel') }}</Button>
              <Button class="btn" :disabled="busyKey === 'buy'" @click="doBuy">{{ busyKey === 'buy' ? '…' : tx('confirm.ok') }}</Button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.mk {
  --mk-up: var(--accent-2);
  --mk-down: var(--danger);
  --mk-panel-a: #3a2a1a;
  --mk-panel-b: #1f160d;
  --mk-panel-line: rgba(255, 228, 180, 0.12);
  --mk-panel-text: #fff3da;
  --mk-panel-muted: #c9b089;
  padding-bottom: calc(24px + var(--safe-bot));
}
.mk-sheet {
  --mk-up: var(--accent-2);
  --mk-down: var(--danger);
  --mk-panel-a: #3a2a1a;
  --mk-panel-b: #1f160d;
  --mk-panel-line: rgba(255, 228, 180, 0.12);
  --mk-panel-text: #fff3da;
  --mk-panel-muted: #c9b089;
}

.mk-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
.mk-head .title { margin-bottom: 4px; }
.mk-live {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 900; letter-spacing: 0.12em;
  color: var(--mk-down); background: color-mix(in srgb, var(--mk-down) 12%, var(--card));
  border: 2px solid color-mix(in srgb, var(--mk-down) 35%, transparent);
  border-radius: 999px; padding: 3px 10px;
}
.mk-live i {
  width: 8px; height: 8px; border-radius: 50%; background: var(--mk-down);
  animation: mk-blink 1.2s ease-in-out infinite;
}
@keyframes mk-blink { 50% { opacity: 0.25; transform: scale(0.8); } }

.mk-dim { color: var(--muted); }
.small { font-size: 13px; }
.mk-pad { padding: var(--space-4); text-align: center; }
.mk-mono { font-variant-numeric: tabular-nums; font-weight: 800; }
.mk-sec-title { font-weight: 900; color: var(--heading); margin-bottom: var(--space-2); }
.mk-sec-title.light { color: var(--mk-panel-text); }
.mk-label { font-size: 12px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--mk-panel-muted); }
.mk-label.dark { color: var(--muted); margin-top: var(--space-2); }
.mk-tag {
  font-style: normal; font-size: 10px; font-weight: 900; letter-spacing: 0.08em;
  margin-left: 6px; padding: 1px 6px; border-radius: 6px;
  background: color-mix(in srgb, var(--purple) 16%, transparent); color: var(--purple-deep);
}
.mk-tag.danger { background: color-mix(in srgb, var(--danger) 14%, transparent); color: var(--danger); }

/* Prozent-Pillen */
.mk-pill {
  display: inline-block; font-size: 12px; font-weight: 900; font-variant-numeric: tabular-nums;
  padding: 2px 8px; border-radius: 8px; white-space: nowrap;
}
.mk-pill.up { background: color-mix(in srgb, var(--mk-up) 18%, transparent); color: color-mix(in srgb, var(--mk-up) 80%, #000); }
.mk-pill.down { background: color-mix(in srgb, var(--mk-down) 16%, transparent); color: var(--mk-down); }
.mk-pill.flat { background: var(--surface-deep); color: var(--muted); }
.up { color: var(--mk-up); }
.down { color: var(--mk-down); }

/* Ticker */
.mk-ticker {
  overflow: hidden; margin: 0 -2px var(--space-3);
  border-radius: 14px; background: linear-gradient(180deg, var(--mk-panel-a), var(--mk-panel-b));
  border: 2px solid var(--mk-panel-b);
  mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
}
.mk-ticker-track { display: flex; width: max-content; animation: mk-marquee 48s linear infinite; }
.mk-ticker:hover .mk-ticker-track { animation-play-state: paused; }
@keyframes mk-marquee { to { transform: translateX(-50%); } }
.mk-tick {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px;
  background: none; border: 0; border-radius: 0; cursor: pointer;
  color: var(--mk-panel-text); font-size: 13px; white-space: nowrap;
  border-right: 1px solid var(--mk-panel-line);
}
.mk-tick-sym { font-weight: 900; letter-spacing: 0.04em; }
.mk-tick-sym small { margin-left: 2px; }
.mk-tick-val { font-variant-numeric: tabular-nums; color: var(--mk-panel-muted); font-weight: 700; }
.mk-tick-pct { font-weight: 900; font-variant-numeric: tabular-nums; }
.mk-tick-pct.flat { color: var(--mk-panel-muted); }

/* Dunkles Terminal-Panel */
.mk-panel {
  position: relative; overflow: hidden;
  background:
    radial-gradient(circle at 110% -10%, color-mix(in srgb, var(--accent) 28%, transparent) 0%, transparent 45%),
    linear-gradient(160deg, var(--mk-panel-a), var(--mk-panel-b));
  color: var(--mk-panel-text);
  border-radius: var(--radius);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
  box-shadow: 0 4px 0 #120c06, 0 14px 30px rgba(40, 25, 5, 0.25);
}
.mk-panel .mk-dim { color: var(--mk-panel-muted); }
.mk-panel .mk-pill.flat { background: rgba(255, 255, 255, 0.08); color: var(--mk-panel-muted); }
.mk-panel .mk-pill.up { color: var(--mk-up); }
.mk-hero-top { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-2); }
.mk-hero-value {
  font-size: 32px; font-weight: 900; line-height: 1.1; margin: 4px 0 6px;
  font-variant-numeric: tabular-nums; text-shadow: 0 2px 0 rgba(0, 0, 0, 0.35);
}
.mk-hero-sub { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 13px; }
.mk-trade-link {
  font-size: 12px; font-weight: 800; white-space: nowrap;
  color: var(--accent-soft); border: 1.5px solid var(--mk-panel-line);
  border-radius: 999px; padding: 5px 10px;
}
.mk-hero-spark { width: 100%; height: 64px; display: block; margin: var(--space-3) 0 var(--space-2); }
.mk-hero-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); }
.mk-hero-stats div {
  background: rgba(255, 255, 255, 0.05); border: 1px solid var(--mk-panel-line);
  border-radius: 12px; padding: 8px 10px; display: flex; flex-direction: column; min-width: 0;
}
.mk-hero-stats span { font-size: 11px; color: var(--mk-panel-muted); font-weight: 700; }
.mk-hero-stats b { font-variant-numeric: tabular-nums; font-size: 15px; overflow: hidden; text-overflow: ellipsis; }

/* Live-Trades */
.mk-tape { padding: var(--space-3) var(--space-4); margin-bottom: var(--space-3); }
.mk-tape-row { display: flex; gap: var(--space-2); overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
.mk-tape-row::-webkit-scrollbar { display: none; }
.mk-tape-item {
  flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 1px;
  padding: 6px 10px; border-radius: 12px; cursor: pointer;
  background: color-mix(in srgb, var(--mk-up) 10%, var(--card)); border: 2px solid color-mix(in srgb, var(--mk-up) 25%, transparent);
  font-size: 13px;
}
.mk-tape-item b { font-variant-numeric: tabular-nums; color: color-mix(in srgb, var(--mk-up) 75%, #000); }
.mk-tape-item small { color: var(--muted); font-size: 11px; }

/* Filter */
.mk-filters { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; margin-bottom: var(--space-2); padding-bottom: 2px; }
.mk-filters::-webkit-scrollbar { display: none; }
.mk-chip {
  flex: 0 0 auto; font-size: 13px; font-weight: 800; padding: 6px 12px; border-radius: 999px; cursor: pointer;
  background: var(--card); border: 2px solid var(--border); color: var(--text);
}
.mk-chip.active { background: var(--accent); border-color: var(--accent-deep); color: var(--accent-ink); box-shadow: 0 2px 0 var(--accent-deep); }
.mk-chip.sm { font-size: 12px; padding: 5px 10px; }
.mk-tools { display: flex; gap: var(--space-2); margin-bottom: var(--space-3); }
.mk-search { flex: 1; min-width: 0; padding: 10px 12px; }
.mk-sort { padding: 10px 8px; font-weight: 800; }

/* Marktliste */
.mk-list { padding: 4px; margin-bottom: var(--space-3); }
.mk-row {
  width: 100%; display: grid; grid-template-columns: 46px minmax(0, 1fr) 76px auto; align-items: center; gap: 10px;
  background: none; border: 0; border-radius: 16px; padding: 10px; cursor: pointer; text-align: left;
  border-bottom: 1px solid var(--border); transition: background 0.2s;
}
.mk-row:last-child { border-bottom: 0; }
.mk-row:hover { background: var(--card-2); }
.mk-row.flash-up { animation: mk-flash-up 1.4s ease-out; }
.mk-row.flash-down { animation: mk-flash-down 1.4s ease-out; }
@keyframes mk-flash-up { from { background: color-mix(in srgb, var(--mk-up) 28%, transparent); } }
@keyframes mk-flash-down { from { background: color-mix(in srgb, var(--mk-down) 24%, transparent); } }
.mk-coin {
  position: relative; width: 46px; height: 46px; border-radius: 50%;
  display: grid; place-items: center; font-size: 25px;
  background: radial-gradient(circle at 35% 30%, #fff, var(--card-2) 70%);
  border: 2.5px solid var(--border); box-shadow: 0 2px 0 var(--border);
}
.mk-coin.tiered { border-color: var(--tier-color); box-shadow: 0 0 0 2px color-mix(in srgb, var(--tier-color) 30%, transparent), 0 2px 0 var(--tier-color); }
.mk-coin i { position: absolute; right: -4px; bottom: -4px; font-style: normal; font-size: 14px; }
.mk-coin.lg { width: 52px; height: 52px; font-size: 29px; flex: 0 0 auto; }
.mk-name { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
.mk-name b { color: var(--heading); font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mk-name small { font-size: 11px; font-weight: 800; letter-spacing: 0.04em; color: var(--accent-deep); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mk-name small.mk-dim { color: var(--muted); font-weight: 700; letter-spacing: 0; }
.mk-spark { width: 76px; height: 30px; }
.mk-spark .line { fill: none; stroke-width: 1.8; stroke-linejoin: round; }
.mk-spark .line.up { stroke: var(--mk-up); }
.mk-spark .line.down { stroke: var(--mk-down); }
.mk-spark .line.flat { stroke: var(--muted); }
.mk-spark .area { stroke: none; opacity: 0.16; }
.mk-spark .area.up { fill: var(--mk-up); }
.mk-spark .area.down { fill: var(--mk-down); }
.mk-spark .area.flat { fill: var(--muted); }
.mk-price { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
.mk-price b { font-variant-numeric: tabular-nums; font-size: 15px; color: var(--heading); }

/* Eigene Angebote */
.mk-mine { padding: var(--space-3) var(--space-4); }
.mk-mine-row { display: flex; align-items: center; gap: var(--space-2); padding: 6px 0; border-bottom: 1px solid var(--border); }
.mk-mine-row:last-child { border-bottom: 0; }
.mk-mine-row.invalid { opacity: 0.65; }
.mk-mine-main {
  flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  background: none; border: 0; padding: 4px 0; cursor: pointer; text-align: left;
}
.mk-small { padding: 6px 12px !important; min-height: 0 !important; }

/* Detail-Overlay */
.mk-sheet {
  position: fixed; inset: 0; z-index: 200; overflow-y: auto; overscroll-behavior: contain;
  background: color-mix(in srgb, var(--bg) 92%, #000);
  padding: calc(8px + var(--safe-top)) 12px calc(24px + var(--safe-bot));
  animation: mk-sheet-in 0.22s ease-out;
}
@keyframes mk-sheet-in { from { transform: translateY(24px); opacity: 0; } }
.mk-sheet-inner { max-width: 560px; margin: 0 auto; }
.mk-sheet-head {
  position: sticky; top: calc(-8px - var(--safe-top)); z-index: 2;
  display: flex; align-items: center; gap: var(--space-3);
  padding: 8px 0 12px; background: color-mix(in srgb, var(--bg) 92%, #000);
}
.mk-back {
  width: 40px; height: 40px; border-radius: 50%; padding: 0; font-size: 20px; font-weight: 900; cursor: pointer;
  background: var(--card); border: 2px solid var(--border); box-shadow: 0 2px 0 var(--border);
}
.mk-sheet-title { display: flex; flex-direction: column; min-width: 0; }
.mk-sheet-title b { font-size: 19px; color: var(--heading); }
.mk-sheet-title small { font-size: 12px; font-weight: 800; letter-spacing: 0.05em; color: var(--accent-deep); }

.mk-big { font-size: 34px; font-weight: 900; font-variant-numeric: tabular-nums; line-height: 1.1; margin: 4px 0 6px; border-radius: 10px; }
.mk-big.flash-up { animation: mk-text-up 1.4s ease-out; }
.mk-big.flash-down { animation: mk-text-down 1.4s ease-out; }
@keyframes mk-text-up { from { color: var(--mk-up); text-shadow: 0 0 18px var(--mk-up); } }
@keyframes mk-text-down { from { color: var(--mk-down); text-shadow: 0 0 18px var(--mk-down); } }

.mk-chart-wrap { position: relative; margin: var(--space-3) -6px 0; }
.mk-chart { width: 100%; height: 200px; display: block; touch-action: pan-y; cursor: crosshair; }
.mk-grid { stroke: var(--mk-panel-line); stroke-dasharray: 3 5; vector-effect: non-scaling-stroke; }
.mk-lastline { stroke: var(--mk-panel-muted); stroke-dasharray: 2 4; opacity: 0.55; vector-effect: non-scaling-stroke; }
.mk-cross { stroke: var(--mk-panel-text); opacity: 0.45; vector-effect: non-scaling-stroke; }
.mk-fill-dot { fill: var(--accent-soft); stroke: var(--mk-panel-b); stroke-width: 1.5; vector-effect: non-scaling-stroke; }
.mk-hover-dot, .mk-pulse { stroke: var(--mk-panel-text); stroke-width: 2; vector-effect: non-scaling-stroke; }
.mk-hover-dot.up, .mk-pulse.up { fill: var(--mk-up); }
.mk-hover-dot.down, .mk-pulse.down { fill: var(--mk-down); }
.mk-pulse { animation: mk-pulse 1.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
@keyframes mk-pulse { 50% { transform: scale(1.6); opacity: 0.55; } }
.mk-chart-loading { position: absolute; inset: 0; display: grid; place-items: center; color: var(--mk-panel-muted); font-weight: 800; }
.mk-axis { display: flex; justify-content: space-between; gap: 6px; font-size: 11px; color: var(--mk-panel-muted); padding: 4px 6px 0; font-variant-numeric: tabular-nums; }
.mk-ranges { display: flex; gap: 6px; margin-top: var(--space-3); }
.mk-range {
  flex: 1; padding: 7px 0; border-radius: 10px; cursor: pointer; font-weight: 900; font-size: 13px;
  background: rgba(255, 255, 255, 0.06); border: 1px solid var(--mk-panel-line); color: var(--mk-panel-muted);
}
.mk-range.active { background: var(--accent); border-color: var(--accent-deep); color: var(--accent-ink); }

.mk-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); margin-bottom: var(--space-3); }
.mk-stats div {
  background: var(--card); border: 2px solid var(--border); border-radius: 14px;
  padding: 8px 10px; display: flex; flex-direction: column; min-width: 0;
}
.mk-stats span { font-size: 11px; font-weight: 800; color: var(--muted); }
.mk-stats b { font-size: 15px; color: var(--heading); font-variant-numeric: tabular-nums; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Handelsformular */
.mk-trade { padding: var(--space-4); margin-bottom: var(--space-3); display: flex; flex-direction: column; gap: var(--space-2); }
.mk-sides { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 4px; background: var(--surface-deep); border-radius: 14px; }
.mk-side { padding: 10px 0; border-radius: 11px; border: 0; background: none; font-weight: 900; cursor: pointer; color: var(--muted); }
.mk-side.buy.active { background: var(--mk-up); color: #fff; box-shadow: 0 3px 0 color-mix(in srgb, var(--mk-up) 70%, #000); }
.mk-side.sell.active { background: var(--mk-down); color: #fff; box-shadow: 0 3px 0 color-mix(in srgb, var(--mk-down) 70%, #000); }
.mk-form-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); font-size: 14px; }
.mk-form-row.total { border-top: 2px dashed var(--border); padding-top: var(--space-2); font-size: 16px; }
.mk-form-row .bad { color: var(--danger); }
.mk-stepper { display: flex; align-items: center; gap: 4px; }
.mk-stepper button {
  width: 36px; height: 36px; padding: 0; border-radius: 10px; font-size: 18px; font-weight: 900; cursor: pointer;
  background: var(--card-2); border: 2px solid var(--border);
}
.mk-stepper b { min-width: 34px; text-align: center; font-variant-numeric: tabular-nums; font-size: 17px; }
.mk-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.mk-hint { font-size: 12px; color: var(--muted); }
.p-button.mk-buy-btn { background: linear-gradient(180deg, color-mix(in srgb, var(--mk-up) 85%, #fff), var(--mk-up)) !important; color: #fff !important; box-shadow: 0 4px 0 color-mix(in srgb, var(--mk-up) 65%, #000) !important; }
.mk-myhere { border-top: 2px dashed var(--border); padding-top: var(--space-2); display: flex; flex-direction: column; gap: 4px; }
.mk-link { background: none; border: 0; padding: 4px 0; color: var(--danger); font-weight: 800; cursor: pointer; font-size: 13px; }

/* Orderbuch */
.mk-book { padding: var(--space-3) var(--space-4); }
.mk-book-head, .mk-book-row { display: grid; grid-template-columns: 1.2fr 1fr 0.8fr; gap: 6px; font-variant-numeric: tabular-nums; }
.mk-book-head { font-size: 11px; font-weight: 800; color: var(--mk-panel-muted); padding: 0 8px 4px; }
.mk-book-head span:not(:first-child), .mk-book-row span:not(:first-child) { text-align: right; }
.mk-book-row {
  position: relative; width: 100%; padding: 6px 8px; border: 0; border-radius: 6px; cursor: pointer;
  color: var(--mk-panel-text); font-size: 14px; text-align: left;
  background: linear-gradient(270deg, color-mix(in srgb, var(--mk-down) 26%, transparent) var(--depth), transparent var(--depth));
}
.mk-book-row:hover { outline: 1px solid var(--mk-panel-line); }
.mk-book-row.own { cursor: default; opacity: 0.7; }
.mk-book-row .ask { color: var(--mk-down); font-weight: 900; }
.mk-book-row small { color: var(--mk-panel-muted); font-size: 11px; }
.mk-book-mid {
  display: flex; align-items: baseline; justify-content: space-between; gap: 6px;
  margin-top: 6px; padding: 8px; border-top: 1px solid var(--mk-panel-line); font-size: 13px;
}
.mk-book-mid b { font-size: 17px; color: var(--mk-up); font-variant-numeric: tabular-nums; }

.mk-fills { padding: var(--space-3) var(--space-4); margin-bottom: var(--space-3); }
.mk-fills .mk-form-row { padding: 3px 0; font-size: 13px; }
.mk-fills .flat { color: var(--text); }

/* Formel */
.mk-formula { padding: var(--space-3) var(--space-4); margin-bottom: var(--space-3); }
.mk-f-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: 8px 0; border-bottom: 1px solid var(--border); }
.mk-f-row > div { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.mk-f-row b { color: var(--heading); font-size: 14px; }
.mk-f-row small { color: var(--muted); font-size: 12px; line-height: 1.3; }
.mk-f-row.sum { border-bottom-style: dashed; }
.mk-f-row.total { border-bottom: 0; font-size: 17px; }
.mk-f-row.total .mk-mono { color: var(--accent-deep); font-size: 18px; }
.mk-bar { height: 6px; border-radius: 99px; background: var(--surface-deep); margin-top: 5px; overflow: hidden; }
.mk-bar i { display: block; height: 100%; border-radius: 99px; }
.mk-bar i.purple { background: linear-gradient(90deg, var(--purple), var(--purple-deep)); }
.mk-bar i.green { background: linear-gradient(90deg, var(--grass), var(--accent-2)); }

/* Bestätigung */
.mk-modal {
  position: fixed; inset: 0; z-index: 210; display: grid; place-items: center; padding: 16px;
  background: rgba(30, 20, 8, 0.55); backdrop-filter: blur(3px);
}
.mk-modal-card {
  width: 100%; max-width: 380px; background: var(--card); border-radius: var(--radius);
  padding: var(--space-5) var(--space-4) var(--space-4); text-align: center;
  box-shadow: 0 6px 0 var(--border), 0 20px 40px rgba(0, 0, 0, 0.25);
  animation: mk-pop 0.18s ease-out;
}
@keyframes mk-pop { from { transform: scale(0.92); opacity: 0; } }
.mk-modal-emoji { font-size: 46px; }
.mk-modal-card h3 { margin: 6px 0; color: var(--heading); }
.mk-modal-card p { margin: 6px 0; }
.mk-verdict { font-weight: 900; }
.mk-verdict.flat { color: var(--muted); }
.mk-modal-actions { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); margin-top: var(--space-3); }

@media (max-width: 380px) {
  .mk-row { grid-template-columns: 40px minmax(0, 1fr) auto; }
  .mk-spark { display: none; }
  .mk-coin { width: 40px; height: 40px; font-size: 22px; }
  .mk-hero-value { font-size: 27px; }
  .mk-big { font-size: 29px; }
}
@media (prefers-reduced-motion: reduce) {
  .mk-ticker-track, .mk-live i, .mk-pulse { animation: none; }
}
</style>
