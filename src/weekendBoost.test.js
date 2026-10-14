import test from 'node:test'
import assert from 'node:assert/strict'
import { weekendFactor, isWeekendBoost, WEEKEND_WEAK_SPECIES } from './weekendBoost.js'

test('Küken, Huhn und Hase werden am Wochenende seltener', () => {
  for (const s of WEEKEND_WEAK_SPECIES) assert.equal(weekendFactor(s, 'uncommon'), 0.5, s)
  assert.deepEqual([...WEEKEND_WEAK_SPECIES].sort(), ['chick', 'chicken', 'rabbit'])
})

test('seltene Tiere werden häufiger, der Rest bleibt', () => {
  assert.equal(weekendFactor('horse', 'rare'), 2)
  assert.equal(weekendFactor('tiger', 'epic'), 2)
  assert.equal(weekendFactor('mammoth', 'legendary'), 2)
  assert.equal(weekendFactor('cow', 'uncommon'), 1)
  assert.equal(weekendFactor('sheep', 'common'), 1)
})

test('Wochenende gilt nach Berliner Zeit', () => {
  // Fr 23:30 Berlin (Sommerzeit) = 21:30 UTC
  assert.equal(isWeekendBoost(new Date('2026-10-16T21:30:00Z')), false)
  // Sa 00:30 Berlin = Fr 22:30 UTC
  assert.equal(isWeekendBoost(new Date('2026-10-16T22:30:00Z')), true)
  // So 23:30 Berlin = 21:30 UTC
  assert.equal(isWeekendBoost(new Date('2026-10-18T21:30:00Z')), true)
  // Mo 00:30 Berlin = So 22:30 UTC
  assert.equal(isWeekendBoost(new Date('2026-10-18T22:30:00Z')), false)
  // Winterzeit: Sa 00:30 Berlin = Fr 23:30 UTC
  assert.equal(isWeekendBoost(new Date('2026-11-06T23:30:00Z')), true)
})
