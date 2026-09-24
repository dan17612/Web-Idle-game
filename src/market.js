// Zoo-Börse: Marktwert-Formel und Chart-Helfer.
//
// Achtung Spiegel: Die Formel lebt doppelt, als SQL in
// supabase/migrations/20260924_tier_boerse.sql (_market_model/_market_values)
// und hier. Der Server rechnet autoritativ; der Client nutzt diese Datei für
// die Formel-Aufschlüsselung in der Detailansicht. src/marketSql.test.js
// prüft, dass die Konstanten auf beiden Seiten übereinstimmen.

export const MARKET = {
  UTIL_FACTOR: 200,        // Nutzwert = rate × 200
  SCARCITY_WEIGHT: 3,      // model = base × (1 + 3 × K × (1 − E))
  EGG_EASE: 0.8,
  BREED_EASE: 0.6,
  BREED_REF_POWER: 6,
  CRAFT_EASE: 0.5,
  LEAVING_EASE: 0.5,
  TIER_EASE_STEP: 0.1,
  FILL_WEIGHT_STEP: 0.1,
  FILL_WEIGHT_MAX: 0.5,
  FILL_CLAMP: 4,
  FILL_WINDOW_DAYS: 7
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// 10 % ⇒ 1 · 1 % ⇒ 0,67 · 0,1 % ⇒ 0,33 · ≤ 0,01 % ⇒ 0
export function easeFromChance(p) {
  const n = Number(p)
  if (!Number.isFinite(n) || n <= 0) return 0
  return clamp((Math.log10(n) + 4) / 3, 0, 1)
}

export function tierQty(requiredQty) {
  return Math.max(1, Math.floor(Number(requiredQty) || 0))
}

export function baseValue({ cost = 0, rate = 0, craftInput = 0 } = {}) {
  return Math.max(1, Number(cost) || 0, (Number(rate) || 0) * MARKET.UTIL_FACTOR, Number(craftInput) || 0)
}

export function scarcity(holders, players) {
  const p = Math.max(1, Number(players) || 0)
  const h = Math.max(0, Number(holders) || 0)
  return 1 - Math.sqrt(Math.min(1, h / p))
}

export function speciesEase({ chestChance = 0, eggChance = 0, breedChance = 0, craftEase = 0, leaving = false } = {}) {
  const e = Math.max(
    easeFromChance(chestChance),
    MARKET.EGG_EASE * easeFromChance(eggChance),
    MARKET.BREED_EASE * easeFromChance(breedChance),
    Number(craftEase) || 0
  )
  return leaving ? e * MARKET.LEAVING_EASE : e
}

export function tierEase(ease, order) {
  return (Number(ease) || 0) * Math.max(0, 1 - MARKET.TIER_EASE_STEP * (Number(order) || 0))
}

export function scarcityMultiplier(k, ease) {
  return 1 + MARKET.SCARCITY_WEIGHT * clamp(Number(k) || 0, 0, 1) * (1 - clamp(Number(ease) || 0, 0, 1))
}

export function modelValue({ base, qty = 1, k = 0, ease = 1 }) {
  return (Number(base) || 0) * tierQty(qty) * scarcityMultiplier(k, ease)
}

export function median(values) {
  const list = (values || []).map(Number).filter(Number.isFinite).sort((a, b) => a - b)
  if (!list.length) return null
  const mid = Math.floor(list.length / 2)
  return list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2
}

export function fillWeight(count) {
  return Math.min(MARKET.FILL_WEIGHT_MAX, MARKET.FILL_WEIGHT_STEP * Math.max(0, Number(count) || 0))
}

// Echte Trades ziehen den Modellwert Richtung Marktpreis — geklemmt, damit
// Wash-Trades zwischen Zweit-Accounts den Kurs nicht beliebig verbiegen.
export function blendWithFills(model, fillPrices) {
  const m = median(fillPrices)
  const base = Math.max(1, Number(model) || 0)
  if (m == null || m <= 0) return Math.round(base)
  const clamped = clamp(m, base / MARKET.FILL_CLAMP, base * MARKET.FILL_CLAMP)
  const w = fillWeight(fillPrices.length)
  return Math.round(Math.exp((1 - w) * Math.log(base) + w * Math.log(clamped)))
}

export function percentChange(now, prev) {
  const a = Number(now)
  const b = Number(prev)
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) return 0
  return ((a - b) / b) * 100
}

export function formatPct(pct, digits = 2) {
  const n = Number(pct) || 0
  const sign = n > 0 ? '+' : n < 0 ? '−' : '±'
  return `${sign}${Math.abs(n).toFixed(digits)}%`
}

export function marketKey(species, tier) {
  return `${species}|${tier || 'normal'}`
}

// Ticker-Symbol wie an der Börse: LION, TREX, WORL …
export function tickerSymbol(species) {
  return String(species || '').replace(/[^a-z]/gi, '').slice(0, 4).toUpperCase() || '???'
}

// Portfolio: Summe aller eigenen Tiere zum Marktwert, dazu die Sparkline
// als punktweise Summe (alle Märkte liefern dasselbe 6-h-Raster).
export function portfolio(animals, markets) {
  const byKey = new Map()
  for (const m of markets || []) byKey.set(marketKey(m.species, m.tier), m)
  const counts = new Map()
  for (const a of animals || []) {
    const key = marketKey(a.species, a.tier)
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  let value = 0
  let prev = 0
  let spark = null
  for (const [key, count] of counts) {
    const m = byKey.get(key)
    if (!m) continue
    value += count * Number(m.value || 0)
    prev += count * Number(m.prev_24h || m.value || 0)
    const s = Array.isArray(m.spark) ? m.spark : []
    if (s.length) {
      if (!spark) spark = new Array(s.length).fill(0)
      for (let i = 0; i < spark.length; i++) spark[i] += count * Number(s[i] ?? s[s.length - 1] ?? 0)
    }
  }
  return { value, prev, change: percentChange(value, prev), spark: spark || [] }
}

// Preis-Chips im Verkaufsformular.
export function priceSuggestions(value) {
  const v = Math.max(1, Math.round(Number(value) || 0))
  return [
    { key: 'm10', pct: -10, price: Math.max(1, Math.round(v * 0.9)) },
    { key: 'mkt', pct: 0, price: v },
    { key: 'p10', pct: 10, price: Math.round(v * 1.1) },
    { key: 'p25', pct: 25, price: Math.round(v * 1.25) }
  ]
}

// Orderbuch: einzelne Angebote nach Preis gruppieren, günstigstes zuerst.
export function groupAsks(asks) {
  const levels = new Map()
  for (const a of asks || []) {
    const price = Number(a.price)
    if (!levels.has(price)) levels.set(price, { price, qty: 0, ids: [], ownIds: [], sellers: new Set() })
    const lvl = levels.get(price)
    lvl.qty++
    if (a.mine) lvl.ownIds.push(a.id)
    else lvl.ids.push(a.id)
    if (a.seller) lvl.sellers.add(a.seller)
  }
  const list = [...levels.values()].sort((a, b) => a.price - b.price)
  const maxQty = Math.max(1, ...list.map(l => l.qty))
  let cum = 0
  return list.map(l => {
    cum += l.qty
    return { ...l, sellers: [...l.sellers], cum, depth: l.qty / maxQty }
  })
}

// SVG-Pfad für Sparklines und den großen Chart.
export function chartPoints(values, width, height, pad = 2) {
  const list = (values || []).map(Number).filter(Number.isFinite)
  if (!list.length) return []
  const min = Math.min(...list)
  const max = Math.max(...list)
  const span = max - min || Math.max(1, Math.abs(max) * 0.02)
  const lo = max === min ? min - span / 2 : min
  const w = Math.max(1, width - pad * 2)
  const h = Math.max(1, height - pad * 2)
  const step = list.length > 1 ? w / (list.length - 1) : 0
  return list.map((v, i) => ({
    x: +(pad + (list.length > 1 ? i * step : w / 2)).toFixed(2),
    y: +(pad + h - ((v - lo) / span) * h).toFixed(2),
    v
  }))
}

// Großer Chart: x nach Zeit statt nach Index (Snapshots sind unregelmäßig:
// 6-h-Backfill, danach stündlich). `extra` fließt nur in die y-Skala ein,
// damit Trade-Punkte sichtbar im Chart liegen.
export function timeScale(series, width, height, pad = 2, extra = []) {
  const pts = (series || [])
    .map(p => ({ t: new Date(p.t).getTime(), v: Number(p.v) }))
    .filter(p => Number.isFinite(p.t) && Number.isFinite(p.v))
    .sort((a, b) => a.t - b.t)
  if (!pts.length) return { points: [], x: () => pad, y: () => height / 2, min: 0, max: 0, t0: 0, t1: 0 }
  const vals = [...pts.map(p => p.v), ...(extra || []).map(Number).filter(Number.isFinite)]
  let min = Math.min(...vals)
  let max = Math.max(...vals)
  if (max === min) {
    const d = Math.max(1, Math.abs(max) * 0.02)
    min -= d
    max += d
  } else {
    const d = (max - min) * 0.08
    min -= d
    max += d
  }
  const t0 = pts[0].t
  const t1 = pts[pts.length - 1].t
  const tspan = Math.max(1, t1 - t0)
  const w = Math.max(1, width - pad * 2)
  const h = Math.max(1, height - pad * 2)
  const x = (t) => pad + (pts.length > 1 ? ((t - t0) / tspan) * w : w / 2)
  const y = (v) => pad + h - ((v - min) / (max - min)) * h
  return {
    points: pts.map(p => ({ ...p, x: +x(p.t).toFixed(2), y: +y(p.v).toFixed(2) })),
    x, y, min, max, t0, t1
  }
}

// Nächster Punkt zur x-Position (Fadenkreuz).
export function nearestPoint(points, px) {
  let best = null
  for (const p of points || []) {
    if (!best || Math.abs(p.x - px) < Math.abs(best.x - px)) best = p
  }
  return best
}

export function linePath(points) {
  if (!points.length) return ''
  if (points.length === 1) return `M${points[0].x - 1},${points[0].y}L${points[0].x + 1},${points[0].y}`
  return points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join('')
}

export function areaPath(points, height) {
  if (!points.length) return ''
  const first = points[0]
  const last = points[points.length - 1]
  return `${linePath(points)}L${last.x},${height}L${first.x},${height}Z`
}
