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
