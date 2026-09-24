// Trade-Ansicht: normalisiert einen Trade auf die Sicht des Spielers
// ("Du gibst" / "Du bekommst") und bewertet beide Seiten zum Marktwert
// der Zoo-Börse. Reine Logik, getestet in src/tradeTickets.test.js.

import { wantedAnimalItems } from './tradePublicWanted.js'

const TIER_ORDER = { normal: 0, gold: 1, diamond: 2, epic: 3, rainbow: 4 }

export function groupAnimals(list) {
  const map = new Map()
  for (const a of list || []) {
    if (!a?.species) continue
    const tier = a.tier || 'normal'
    const key = `${a.species}|${tier}`
    const qty = Math.max(1, Math.floor(Number(a.qty) || 1))
    if (!map.has(key)) map.set(key, { key, species: a.species, tier, qty: 0 })
    map.get(key).qty += qty
  }
  return [...map.values()].sort((a, b) =>
    (TIER_ORDER[b.tier] ?? 0) - (TIER_ORDER[a.tier] ?? 0) || b.qty - a.qty || a.species.localeCompare(b.species))
}

export function groupEggs(list) {
  const map = new Map()
  for (const e of list || []) {
    if (!e?.egg_type) continue
    const qty = Math.max(1, Math.floor(Number(e.qty) || 1))
    if (!map.has(e.egg_type)) map.set(e.egg_type, { key: e.egg_type, egg_type: e.egg_type, name: e.name || '', emoji: e.emoji || '', qty: 0 })
    map.get(e.egg_type).qty += qty
  }
  return [...map.values()]
}

function side(animals, eggs, coins, wanted = false) {
  return {
    animals: groupAnimals(animals),
    eggs: groupEggs(eggs),
    coins: Math.max(0, Math.floor(Number(coins) || 0)),
    wanted
  }
}

export function isEmptySide(s) {
  return !s || (!s.animals.length && !s.eggs.length && !s.coins)
}

function requesterSide(t) {
  return side(t.requester_animal_details, t.requester_egg_details, t.requester_coins)
}

// Addressee-Seite: bei offenen/abgebrochenen öffentlichen Trades gibt es noch
// keine konkreten Tiere, dann zählen die gewünschten Tiere/Eier.
function addresseeSide(t) {
  const details = t.addressee_animal_details || []
  const eggs = t.addressee_egg_details || []
  if (t.is_public && !details.length && !eggs.length) {
    const wanted = wantedAnimalItems(t)
    const wantedEggs = Array.isArray(t.wanted_eggs) ? t.wanted_eggs : []
    return side(wanted, wantedEggs, t.addressee_coins, wanted.length > 0 || wantedEggs.length > 0)
  }
  return side(details, eggs, t.addressee_coins)
}

export function tradeSides(t, myId) {
  const mine = t.requester_id === myId
  const req = requesterSide(t)
  const add = addresseeSide(t)
  let kind = 'in'
  if (t.is_public && !mine && t.addressee_id !== myId) kind = 'public'
  else if (mine) kind = t.is_public ? 'public-mine' : 'out'
  const partner = mine ? (t.addressee_username || null) : (t.requester_username || null)
  return {
    kind,
    mine,
    partner,
    give: mine ? req : add,
    get: mine ? add : req
  }
}

// priceOf(species, tier) und eggPriceOf(egg_type) liefern Zahl oder null.
export function sideValue(s, priceOf, eggPriceOf = () => null) {
  let value = Number(s?.coins) || 0
  let partial = false
  for (const a of s?.animals || []) {
    const p = priceOf ? priceOf(a.species, a.tier) : null
    if (p == null || !Number.isFinite(Number(p))) partial = true
    else value += Number(p) * a.qty
  }
  for (const e of s?.eggs || []) {
    const p = eggPriceOf(e.egg_type)
    if (p == null || !(Number(p) > 0)) partial = true
    else value += Number(p) * e.qty
  }
  return { value, partial }
}

// Fairness aus Sicht des Spielers: positiv = du bekommst mehr Wert.
export function fairness(giveValue, getValue) {
  const give = Math.max(0, Number(giveValue) || 0)
  const get = Math.max(0, Number(getValue) || 0)
  const total = give + get
  if (!total) return { pct: 0, share: 0.5, verdict: 'fair' }
  const pct = give > 0 ? ((get - give) / give) * 100 : 100
  const share = get / total
  let verdict = 'fair'
  if (pct >= 25) verdict = 'great'
  else if (pct >= 5) verdict = 'good'
  else if (pct <= -40) verdict = 'awful'
  else if (pct <= -5) verdict = 'bad'
  return { pct, share, verdict }
}

export function relativeTime(ms, now, lang = 'de') {
  const diff = Number(ms) - Number(now)
  const abs = Math.abs(diff)
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto', style: 'short' })
  if (abs < 60_000) return rtf.format(Math.round(diff / 1000), 'second')
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), 'minute')
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), 'hour')
  return rtf.format(Math.round(diff / 86_400_000), 'day')
}

// Verlauf nach Kalendertag (lokal) gruppieren, neueste zuerst.
export function groupByDay(items, dateOf) {
  const groups = []
  const byKey = new Map()
  const list = (items || []).slice().sort((a, b) => new Date(dateOf(b)) - new Date(dateOf(a)))
  for (const it of list) {
    const d = new Date(dateOf(it))
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (!byKey.has(key)) {
      const g = { key, date: d, items: [] }
      byKey.set(key, g)
      groups.push(g)
    }
    byKey.get(key).items.push(it)
  }
  return groups
}
