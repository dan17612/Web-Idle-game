// Zucht-Ereignis: zwei Tiere ergeben ein Ei mit vorbestimmtem Ergebnis.
//
// Achtung Reward-Spiegel: Jede Formel hier lebt doppelt, als SQL-Helfer in
// supabase/migrations/20260919_zucht.sql und 20260920_zucht_arten.sql.
// src/breedingSql.test.js vergleicht beide Seiten und liest dabei immer die
// jüngste Definition — bei Balance-Änderungen immer beide anfassen.

export const RARITY_SCORE = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 }
export const TIER_BONUS = { normal: 0, gold: 0.5, diamond: 1, epic: 1.5, rainbow: 2 }

export const MAX_POWER = 12

// Die vier Arten, die es wirklich nur aus der Zucht gibt, nach Stufe.
// Bewusst je eine pro Stufe: die Chancen-Vorschau bleibt lesbar.
export const BREED_TIERS = [
  ['hedgehog'],
  ['leopard'],
  ['gorilla'],
  ['brachiosaurus']
]

// Gewichte je ganzer Zuchtkraft. Jede Zeile summiert auf 100, ist also direkt
// in Prozent lesbar. Feinstufig statt in Bereichen, damit jeder Punkt
// Zuchtkraft die Chancen verbessert — die Kosten steigen schließlich auch
// mit jedem Punkt.
const WEIGHTS = [
  [88, 12,  0,  0],
  [82, 17,  1,  0],
  [75, 22,  3,  0],
  [67, 28,  5,  0],
  [58, 34,  8,  0],
  [49, 39, 11,  1],
  [40, 43, 16,  1],
  [32, 45, 21,  2],
  [25, 45, 27,  3],
  [19, 43, 34,  4],
  [14, 39, 42,  5],
  [10, 33, 50,  7],
  [ 6, 26, 58, 10]
]

export function animalPower(species, tier, rarityOf) {
  const rarity = typeof rarityOf === 'function' ? rarityOf(species) : rarityOf
  const base = RARITY_SCORE[rarity] ?? 0
  const bonus = TIER_BONUS[tier || 'normal'] ?? 0
  return base + bonus
}

export function breedPower(a, b) {
  const p = (Number(a) || 0) + (Number(b) || 0)
  return Math.min(MAX_POWER, Math.max(0, p))
}

export function breedWeights(power) {
  const p = Math.floor(breedPower(power, 0))
  return [...(WEIGHTS[p] || WEIGHTS[WEIGHTS.length - 1])]
}

export function breedCost(power) {
  const p = breedPower(power, 0)
  return Math.floor(50_000_000 * (p + 1) ** 2)
}

export function breedMinutes(power) {
  const p = breedPower(power, 0)
  return Math.round(30 + p * 15)
}

// Chance je Einzelart: das Stufengewicht gleichmäßig auf ihre Arten verteilt.
export function breedChances(power) {
  const weights = breedWeights(power)
  const out = []
  BREED_TIERS.forEach((species, i) => {
    const share = weights[i] / species.length
    for (const key of species) out.push({ species: key, percent: share, tier: i + 1 })
  })
  return out
}
