// Zoo-Wordle: reine Helfer für Eingabe-Validierung, Tastatur-Status und
// Belohnungs-Vorschau. Die Bewertung selbst läuft server-seitig (wordle_guess).

export const WORD_LENGTH = 5
export const MAX_GUESSES = 6

export const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P', 'Ü'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ö', 'Ä'],
  ['ENTER', 'Y', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK']
]

export function normalizeGuess(input) {
  return String(input ?? '').trim().toUpperCase()
}

export function isValidGuess(input) {
  return /^[A-ZÄÖÜ]{5}$/.test(normalizeGuess(input))
}

const STATE_RANK = { a: 1, p: 2, c: 3 }

export function keyStates(guesses) {
  const out = {}
  for (const entry of guesses || []) {
    const g = String(entry?.g || '')
    const r = String(entry?.r || '')
    for (let i = 0; i < g.length; i++) {
      const letter = g[i]
      const state = r[i]
      if (!STATE_RANK[state]) continue
      if (!out[letter] || STATE_RANK[state] > STATE_RANK[out[letter]]) {
        out[letter] = state
      }
    }
  }
  return out
}

// Spiegelt public._wordle_reward für die Vorschau im Ergebnis-Panel.
export function wordleReward(attempts, streak = 1) {
  const a = Math.max(1, Math.min(MAX_GUESSES, Math.floor(Number(attempts) || 1)))
  const coinsBase = [12000, 9000, 7000, 5000, 3500, 2500][a - 1]
  const tickets = [3, 2, 1, 1, 0, 0][a - 1]
  const s = Math.max(1, Math.floor(Number(streak) || 1))
  const coins = Math.floor(coinsBase * (10 + Math.min(s - 1, 10)) / 10)
  return { coins, tickets }
}
