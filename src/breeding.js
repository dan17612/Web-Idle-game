// Zucht-Ereignis: zwei Tiere ergeben ein Ei mit vorbestimmtem Ergebnis.
//
// Achtung Reward-Spiegel: Jede Formel hier lebt doppelt, als SQL-Helfer in
// supabase/migrations/20260919_zucht.sql. src/breedingSql.test.js vergleicht
// beide Seiten — bei Balance-Änderungen immer beide anfassen.

export const RARITY_SCORE = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 }
export const TIER_BONUS = { normal: 0, gold: 0.5, diamond: 1, epic: 1.5, rainbow: 2 }

export const MAX_POWER = 12

// Die acht Arten, die es aus keiner anderen Quelle gibt, nach Stufe gruppiert.
export const BREED_TIERS = [
  ['flamingo', 'scorpion'],
  ['owl'],
  ['bear', 'unicorn'],
  ['phoenix', 'kraken'],
  ['worldturtle']
]

// Gewichte je Zuchtkraft-Bereich. Jede Zeile summiert auf 100, ist also
// direkt in Prozent lesbar.
const WEIGHTS = [
  { upTo: 2,  w: [82, 16,  2,  0, 0] },
  { upTo: 5,  w: [56, 30, 12,  2, 0] },
  { upTo: 8,  w: [32, 33, 26,  8, 1] },
  { upTo: 10, w: [14, 26, 36, 22, 2] },
  { upTo: 12, w: [ 5, 15, 33, 44, 3] }
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
  for (const row of WEIGHTS) {
    if (p <= row.upTo) return [...row.w]
  }
  return [...WEIGHTS[WEIGHTS.length - 1].w]
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
