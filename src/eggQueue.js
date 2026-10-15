// Eier-Maschine: Eier nach Sorte und Zucht-Boost gruppieren — reine Logik.
//
// Shop-Zucht-Eier und gezüchtete Eier teilen sich egg_type 'breeding'. Damit
// sie nicht in einem Stapel landen, zählt bei Zucht-Eiern die Zuchtkraft mit
// (player_eggs.bred_power, Shop-Eier: null ⇒ SHOP_EGG_POWER).
// Spec: docs/superpowers/specs/2026-10-15-zucht-ei-boost-warteschlange-design.md

import { SHOP_EGG_POWER, breedPower, breedChances, breedMinutes } from './breeding.js'

export const BREEDING_EGG = 'breeding'

export function eggPower(egg) {
  if (egg?.egg_type !== BREEDING_EGG) return null
  const raw = egg.bred_power
  if (raw == null || raw === '' || !Number.isFinite(Number(raw))) return SHOP_EGG_POWER
  return breedPower(Number(raw), 0)
}

export function eggGroupKey(egg) {
  const power = eggPower(egg)
  return power == null ? egg.egg_type : `${egg.egg_type}|${power}`
}

// Gruppen in Warteschlangen-Reihenfolge: Zucht-Eier mit dem höchsten Boost
// zuerst, danach die übrigen Sorten in der Reihenfolge ihres ersten Eis.
// Innerhalb einer Gruppe bleibt die Eingangsreihenfolge (älteste zuerst).
export function groupEggs(eggs) {
  const map = new Map()
  for (const egg of eggs || []) {
    const key = eggGroupKey(egg)
    let g = map.get(key)
    if (!g) {
      g = { key, egg_type: egg.egg_type, power: eggPower(egg), list: [] }
      map.set(key, g)
    }
    g.list.push(egg)
  }
  const groups = [...map.values()]
  const boosted = groups.filter(g => g.power != null).sort((a, b) => b.power - a.power)
  const rest = groups.filter(g => g.power == null)
  return [...boosted, ...rest]
}

// Chancen einer Zucht-Gruppe, höchste zuerst; andere Eier: null.
export function groupChances(group) {
  if (group?.power == null) return null
  return breedChances(group.power)
    .filter(c => c.percent > 0)
    .sort((a, b) => b.percent - a.percent)
}

// Echte Brutzeit: Zucht-Eier nach Zuchtkraft, sonst die der Sorte.
export function groupMinutes(group, fallbackMinutes) {
  if (group?.power == null) return fallbackMinutes
  return breedMinutes(group.power)
}
