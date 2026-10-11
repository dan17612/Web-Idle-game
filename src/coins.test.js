import test from 'node:test'
import assert from 'node:assert/strict'

// Da animals.js Vue-reactive + Supabase importiert, testen wir die Pure-Funktionen direkt.
// Wir kopieren die Logik hier, um externe Abhängigkeiten zu vermeiden.

function formatCoins(n) {
  n = Math.floor(Number(n) || 0)
  if (n < 1000) return n.toString()
  const units = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'De']
  let i = 0
  let v = n
  while (v >= 1000 && i < units.length - 1) { v /= 1000; i++ }
  const decimals = v < 10 ? 2 : v < 100 ? 1 : 0
  const factor = 10 ** decimals
  return (Math.floor(v * factor) / factor).toFixed(decimals) + units[i]
}

function parseCoinInput(input) {
  if (input == null) return null
  let s = String(input).trim().toLowerCase().replace(/\s|_/g, '')
  if (!s) return 0
  const altMatch = s.match(/^(\d{1,3}(?:\.\d{3})+)$/)
  if (altMatch) {
    const n = parseInt(altMatch[1].replace(/\./g, ''), 10)
    return isFinite(n) ? n : null
  }
  s = s.replace(',', '.')
  const suffixMap = {
    '': 1, k: 1e3, m: 1e6, b: 1e9, t: 1e12,
    qa: 1e15, qi: 1e18, sx: 1e21, sp: 1e24, oc: 1e27, no: 1e30, de: 1e33,
    q: 1e15
  }
  const m = s.match(/^(\d*\.?\d+)(qa|qi|sx|sp|oc|no|de|[kmbtq]?)$/)
  if (!m) return null
  const mult = suffixMap[m[2]] ?? null
  if (mult == null) return null
  const n = parseFloat(m[1]) * mult
  if (!isFinite(n) || n < 0) return null
  return Math.floor(n)
}

// ---- formatCoins Tests ----

test('formatCoins: kleine Zahlen unverändert', () => {
  assert.equal(formatCoins(0), '0')
  assert.equal(formatCoins(1), '1')
  assert.equal(formatCoins(999), '999')
})

test('formatCoins: floats werden geflooret', () => {
  assert.equal(formatCoins(999.9), '999')
  assert.equal(formatCoins(1500.7), '1.50K')
})

test('formatCoins: Tausend-Bereich', () => {
  assert.equal(formatCoins(1000), '1.00K')
  assert.equal(formatCoins(1500), '1.50K')
  assert.equal(formatCoins(10000), '10.0K')
  assert.equal(formatCoins(100000), '100K')
  assert.equal(formatCoins(999999), '999K')
})

test('formatCoins: Millionen-Bereich', () => {
  assert.equal(formatCoins(1_000_000), '1.00M')
  assert.equal(formatCoins(1_500_000), '1.50M')
})

test('formatCoins: Milliarden-Bereich', () => {
  assert.equal(formatCoins(1_000_000_000), '1.00B')
})

test('formatCoins: Billionen-Bereich', () => {
  assert.equal(formatCoins(1_000_000_000_000), '1.00T')
})

test('formatCoins: Quadrillion-Bereich (Qa)', () => {
  assert.equal(formatCoins(1_000_000_000_000_000), '1.00Qa')
})

test('formatCoins: Quintillion-Bereich (Qi)', () => {
  assert.equal(formatCoins(1_000_000_000_000_000_000), '1.00Qi')
})

// ---- parseCoinInput Tests ----

test('parseCoinInput: null/leer', () => {
  assert.equal(parseCoinInput(null), null)
  assert.equal(parseCoinInput(''), 0)
  assert.equal(parseCoinInput('  '), 0)
})

test('parseCoinInput: einfache Zahlen', () => {
  assert.equal(parseCoinInput('0'), 0)
  assert.equal(parseCoinInput('500'), 500)
  assert.equal(parseCoinInput('1000'), 1000)
})

test('parseCoinInput: K-Suffix', () => {
  assert.equal(parseCoinInput('1k'), 1000)
  assert.equal(parseCoinInput('1.5k'), 1500)
  assert.equal(parseCoinInput('10K'), 10000)
})

test('parseCoinInput: M-Suffix', () => {
  assert.equal(parseCoinInput('1m'), 1_000_000)
  assert.equal(parseCoinInput('2.5m'), 2_500_000)
})

test('parseCoinInput: B-Suffix', () => {
  assert.equal(parseCoinInput('1b'), 1_000_000_000)
})

test('parseCoinInput: Q/Qa-Suffix (Quadrillion)', () => {
  assert.equal(parseCoinInput('1q'), 1_000_000_000_000_000)
  assert.equal(parseCoinInput('1qa'), 1_000_000_000_000_000)
})

test('parseCoinInput: Qi-Suffix (Quintillion)', () => {
  assert.equal(parseCoinInput('1qi'), 1_000_000_000_000_000_000)
})

test('parseCoinInput: führendes-Punkt-Format ".5k" → 500 (Bug-Fix)', () => {
  assert.equal(parseCoinInput('.5k'), 500)
  assert.equal(parseCoinInput('.5'), 0)  // Math.floor(0.5)
  assert.equal(parseCoinInput('.9k'), 900)
})

test('parseCoinInput: deutsches Komma als Dezimaltrenner', () => {
  assert.equal(parseCoinInput('1,5k'), 1500)
  assert.equal(parseCoinInput('2,5m'), 2_500_000)
})

test('parseCoinInput: deutsches Tausender-Punkt-Format', () => {
  assert.equal(parseCoinInput('1.000'), 1000)
  assert.equal(parseCoinInput('1.000.000'), 1_000_000)
})

test('parseCoinInput: ungültige Eingaben geben null zurück', () => {
  assert.equal(parseCoinInput('abc'), null)
  assert.equal(parseCoinInput('1x'), null)
  assert.equal(parseCoinInput('-5'), null)
  assert.equal(parseCoinInput('1.2.3'), null)
})

test('parseCoinInput: Leerzeichen und Unterstriche werden ignoriert', () => {
  assert.equal(parseCoinInput('1 000'), 1000)
  assert.equal(parseCoinInput('1_000'), 1000)
})
