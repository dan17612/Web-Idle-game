import { reactive } from 'vue'
import { supabase } from './supabase'

// DB-driven species cache (gefüllt beim App-Start)
export const SPECIES = reactive({})

// Tier-Definitionen aus der DB (wird geladen)
export const TIERS = reactive({
  normal:  { multiplier: 1.0,  required_qty: 0,  upgrade_minutes: 0,  order: 0, badge: '', color: '#aaa' },
  gold:    { multiplier: 1.25, required_qty: 3,  upgrade_minutes: 5,  order: 1, badge: '🥇', color: '#ffd166' },
  diamond: { multiplier: 1.5,  required_qty: 6,  upgrade_minutes: 8,  order: 2, badge: '💎', color: '#63f2ff' },
  epic:    { multiplier: 1.75, required_qty: 9,  upgrade_minutes: 12, order: 3, badge: '🟣', color: '#a855f7' },
  rainbow: { multiplier: 2.0,  required_qty: 12, upgrade_minutes: 15, order: 4, badge: '🌈', color: '#ff6bd6' }
})

export async function loadCatalog() {
  const [{ data: sp }, { data: tiers }] = await Promise.all([
    supabase.from('species_costs').select('species, name, emoji, cost, rate, enabled, shop_visible').order('cost'),
    supabase.from('tier_defs').select('*')
  ])
  for (const k of Object.keys(SPECIES)) delete SPECIES[k]
  for (const r of sp || []) {
    SPECIES[r.species] = {
      key: r.species,
      name: r.name || r.species,
      emoji: r.emoji || '❓',
      cost: Number(r.cost || 0),
      rate: Number(r.rate || 0),
      enabled: r.enabled !== false,
      shop_visible: r.shop_visible !== false
    }
  }
  for (const t of tiers || []) {
    const prev = TIERS[t.tier] || {}
    TIERS[t.tier] = {
      ...prev,
      multiplier: Number(t.multiplier),
      required_qty: Number(t.required_qty),
      upgrade_minutes: Number(t.upgrade_minutes),
      order: Number(t.order)
    }
  }
}

export function speciesInfo(key) {
  return SPECIES[key] || { key, name: key, emoji: '❓', cost: 0, rate: 0 }
}

export function tierInfo(tier) {
  return TIERS[tier || 'normal'] || TIERS.normal
}

export function animalRate(a) {
  const info = speciesInfo(a.species)
  const t = tierInfo(a.tier || 'normal')
  return info.rate * (t.multiplier || 1)
}

export function isUpgrading(a) {
  if (!a.upgrade_ready_at) return false
  return new Date(a.upgrade_ready_at).getTime() > Date.now()
}

export function formatCoins(n) {
  n = Math.floor(Number(n) || 0)
  if (n < 1000) return n.toString()
  const units = ['', 'K', 'M', 'B', 'T']
  let i = 0
  let v = n
  while (v >= 1000 && i < units.length - 1) { v /= 1000; i++ }
  return v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0) + units[i]
}

export function parseCoinInput(input) {
  if (input == null) return null
  let s = String(input).trim().toLowerCase().replace(/\s|_/g, '')
  if (!s) return 0
  s = s.replace(',', '.')
  const m = s.match(/^(\d+(?:\.\d+)?)([kmbt]?)$/)
  if (!m) {
    const alt = s.match(/^(\d{1,3}(?:\.\d{3})+)$/)
    if (!alt) return null
    const n = parseInt(alt[1].replace(/\./g, ''), 10)
    return isFinite(n) ? n : null
  }
  const mult = { '': 1, k: 1e3, m: 1e6, b: 1e9, t: 1e12 }[m[2]]
  const n = parseFloat(m[1]) * mult
  if (!isFinite(n) || n < 0) return null
  return Math.floor(n)
}
