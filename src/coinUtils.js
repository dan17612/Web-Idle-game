/**
 * Pure coin formatting / parsing utilities.
 * No external dependencies – safe to import in Node test runners.
 */

/**
 * Format a raw coin number to a human-readable string with K/M/B/T/Q suffix.
 * @param {number} n
 * @returns {string}
 */
export function formatCoins(n) {
  const raw = Number(n)
  if (!isFinite(raw)) return '0'
  n = Math.floor(raw)
  if (n < 0) return '0'
  // Numbers beyond quadrillion range – avoid floating-point precision loss
  if (n >= 1e18) return '>999Q'
  if (n < 1000) return n.toString()
  const units = ['', 'K', 'M', 'B', 'T', 'Q']
  let i = 0
  let v = n
  while (v >= 1000 && i < units.length - 1) { v /= 1000; i++ }
  const decimals = v < 10 ? 2 : v < 100 ? 1 : 0
  const factor = 10 ** decimals
  return (Math.floor(v * factor) / factor).toFixed(decimals) + units[i]
}

/**
 * Parse a user-typed coin string (e.g. "10K", "1.5M", "1.000") to an integer.
 * Returns null for unrecognised input.
 * @param {string|null} input
 * @returns {number|null}
 */
export function parseCoinInput(input) {
  if (input == null) return null
  let s = String(input).trim().toLowerCase().replace(/\s|_/g, '')
  if (!s) return 0
  // German/European thousand-dot format must be checked first: "1.000" or "1.000.000"
  // because the main regex would otherwise parse "1.000" as the decimal value 1.0
  const altMatch = s.match(/^(\d{1,3}(?:\.\d{3})+)$/)
  if (altMatch) {
    const n = parseInt(altMatch[1].replace(/\./g, ''), 10)
    return isFinite(n) ? n : null
  }
  s = s.replace(',', '.')
  const m = s.match(/^(\d+(?:\.\d+)?)([kmbtq]?)$/)
  if (!m) return null
  const mult = { '': 1, k: 1e3, m: 1e6, b: 1e9, t: 1e12, q: 1e15 }[m[2]]
  const n = parseFloat(m[1]) * mult
  if (!isFinite(n) || n < 0) return null
  // Cap at a safe range to prevent silent integer overflow in the server RPCs
  if (n > 1e18) return 1e18
  return Math.floor(n)
}
