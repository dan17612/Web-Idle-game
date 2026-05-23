import test from 'node:test'
import assert from 'node:assert/strict'
import { formatCoins, parseCoinInput } from './coinUtils.js'

// ─── formatCoins ───────────────────────────────────────────────────────────

test('formatCoins: values below 1000 are returned as plain integers', () => {
  assert.equal(formatCoins(0), '0')
  assert.equal(formatCoins(1), '1')
  assert.equal(formatCoins(999), '999')
})

test('formatCoins: K suffix for thousands', () => {
  assert.equal(formatCoins(1000), '1.00K')
  assert.equal(formatCoins(10000), '10.0K')
  assert.equal(formatCoins(100000), '100K')
})

test('formatCoins: M, B, T, Q suffixes', () => {
  assert.equal(formatCoins(1_000_000), '1.00M')
  assert.equal(formatCoins(1_000_000_000), '1.00B')
  assert.equal(formatCoins(1_000_000_000_000), '1.00T')
  assert.equal(formatCoins(1_000_000_000_000_000), '1.00Q')
})

test('formatCoins: handles negative input safely (returns 0)', () => {
  assert.equal(formatCoins(-500), '0')
})

test('formatCoins: handles non-finite input safely', () => {
  assert.equal(formatCoins(Infinity), '0')
  assert.equal(formatCoins(NaN), '0')
  assert.equal(formatCoins(undefined), '0')
  assert.equal(formatCoins(null), '0')
})

test('formatCoins: caps astronomically large numbers', () => {
  assert.equal(formatCoins(1e18), '>999Q')
  assert.equal(formatCoins(1e20), '>999Q')
})

test('formatCoins: floors fractional input', () => {
  assert.equal(formatCoins(1.9), '1')
  assert.equal(formatCoins(999.99), '999')
})

// ─── parseCoinInput ─────────────────────────────────────────────────────────

test('parseCoinInput: plain integers', () => {
  assert.equal(parseCoinInput('0'), 0)
  assert.equal(parseCoinInput('42'), 42)
  assert.equal(parseCoinInput('1000'), 1000)
})

test('parseCoinInput: K/M/B/T/Q suffixes (case-insensitive)', () => {
  assert.equal(parseCoinInput('1K'), 1000)
  assert.equal(parseCoinInput('1k'), 1000)
  assert.equal(parseCoinInput('1M'), 1_000_000)
  assert.equal(parseCoinInput('1B'), 1_000_000_000)
  assert.equal(parseCoinInput('1T'), 1_000_000_000_000)
  assert.equal(parseCoinInput('1Q'), 1_000_000_000_000_000)
})

test('parseCoinInput: German thousand-dot format', () => {
  assert.equal(parseCoinInput('1.000'), 1000)
  assert.equal(parseCoinInput('1.000.000'), 1_000_000)
})

test('parseCoinInput: decimal coefficient', () => {
  assert.equal(parseCoinInput('1.5K'), 1500)
  assert.equal(parseCoinInput('2.5M'), 2_500_000)
})

test('parseCoinInput: invalid input returns null', () => {
  assert.equal(parseCoinInput('abc'), null)
  assert.equal(parseCoinInput(''), 0)
  assert.equal(parseCoinInput(null), null)
})

test('parseCoinInput: caps at 1e18 to prevent overflow', () => {
  assert.equal(parseCoinInput('1000Q'), 1e18)  // 1000Q = 1e18, at the cap
  // anything beyond the cap is also capped
  const result = parseCoinInput('999999Q')
  assert.ok(result <= 1e18, `expected <= 1e18, got ${result}`)
})
