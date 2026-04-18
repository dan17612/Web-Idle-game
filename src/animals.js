export const SPECIES = {
  chick:    { name: 'Küken',    emoji: '🐤', cost: 50,       rate: 0.5 },
  chicken:  { name: 'Huhn',     emoji: '🐔', cost: 250,      rate: 2 },
  rabbit:   { name: 'Hase',     emoji: '🐰', cost: 1200,     rate: 8 },
  pig:      { name: 'Schwein',  emoji: '🐷', cost: 6000,     rate: 35 },
  sheep:    { name: 'Schaf',    emoji: '🐑', cost: 30000,    rate: 160 },
  cow:      { name: 'Kuh',      emoji: '🐮', cost: 150000,   rate: 800 },
  horse:    { name: 'Pferd',    emoji: '🐴', cost: 750000,   rate: 3800 },
  panda:    { name: 'Panda',    emoji: '🐼', cost: 4000000,  rate: 18000 },
  tiger:    { name: 'Tiger',    emoji: '🐯', cost: 20000000, rate: 85000 },
  dragon:   { name: 'Drache',   emoji: '🐲', cost: 100000000,rate: 420000 }
}

export function speciesInfo(key) {
  return SPECIES[key] || { name: key, emoji: '❓', cost: 0, rate: 0 }
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

// Parst Eingaben wie "10m", "1.5B", "100k", "1,5M", "2500" → ganze Zahl.
// Liefert null bei ungültiger Eingabe, 0 bei leerem String.
export function parseCoinInput(input) {
  if (input == null) return null
  let s = String(input).trim().toLowerCase().replace(/\s|_/g, '')
  if (!s) return 0
  s = s.replace(',', '.')
  // Tausender-Punkte nur akzeptieren, wenn keine Dezimalstelle gemeint ist:
  // "1.000" ohne Suffix → 1000; "1.5m" → 1.5 * 1e6.
  const m = s.match(/^(\d+(?:\.\d+)?)([kmbt]?)$/)
  if (!m) {
    // Versuch mit Tausenderpunkten: "1.000.000"
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
