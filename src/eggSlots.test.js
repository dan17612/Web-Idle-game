import test from 'node:test'
import assert from 'node:assert/strict'
import {
  EGG_SLOTS, normalizeIncubation, slotRemainingMs, slotReady, slotProgress, freeSlots,
} from './eggSlots.js'

const T0 = Date.parse('2026-09-27T12:00:00Z')
const iso = (ms) => new Date(ms).toISOString()

test('neues Format: Plätze werden aufgefüllt und sortiert', () => {
  const s = normalizeIncubation({
    active: true,
    max_slots: 2,
    slots: [{ slot: 2, egg_type: 'safari', started_at: iso(T0), ready_at: iso(T0 + 3600e3) }],
  })
  assert.equal(s.maxSlots, EGG_SLOTS)
  assert.equal(s.active, true)
  assert.deepEqual(s.slots.map((x) => [x.slot, x.active]), [[1, false], [2, true]])
  assert.equal(freeSlots(s), 1)
})

test('leerer Status: alle Plätze frei', () => {
  const s = normalizeIncubation({ active: false, slots: [], max_slots: 2 })
  assert.equal(s.active, false)
  assert.equal(s.slots.length, 2)
  assert.equal(freeSlots(s), 2)
})

test('altes Format (Server vor Migration) = genau ein Platz', () => {
  const busy = normalizeIncubation({ active: true, egg_type: 'safari', started_at: iso(T0), ready_at: iso(T0 + 60e3) })
  assert.equal(busy.maxSlots, 1)
  assert.deepEqual(busy.slots.map((x) => [x.slot, x.active, x.egg_type]), [[1, true, 'safari']])
  assert.equal(freeSlots(busy), 0)
  const idle = normalizeIncubation({ active: false })
  assert.equal(idle.maxSlots, 1)
  assert.equal(freeSlots(idle), 1)
})

test('kaputte Eingaben landen nicht in der Liste', () => {
  assert.equal(normalizeIncubation(null).slots.length, 1)
  const s = normalizeIncubation({
    max_slots: 9,
    slots: [{ slot: 3, ready_at: iso(T0) }, { slot: 1 }, { slot: 'x', ready_at: iso(T0) }],
  })
  assert.equal(s.maxSlots, EGG_SLOTS, 'Server kann nicht mehr Plätze erzwingen als der Client kennt')
  assert.equal(freeSlots(s), 2)
})

test('Restzeit, Fertig-Status und Fortschritt', () => {
  const slot = { slot: 1, active: true, started_at: iso(T0), ready_at: iso(T0 + 3600e3) }
  assert.equal(slotRemainingMs(slot, T0 + 600e3), 3000e3)
  assert.equal(slotReady(slot, T0 + 600e3), false)
  assert.equal(slotReady(slot, T0 + 3600e3), true)
  assert.equal(slotProgress(slot, T0 + 1800e3), 0.5)
  assert.equal(slotProgress(slot, T0 + 9e9), 1)
  assert.equal(slotProgress({ slot: 1, active: true, ready_at: iso(T0 + 30 * 60e3) }, T0, 60), 0.5)
  assert.equal(slotRemainingMs({ slot: 2, active: false }, T0), 0)
  assert.equal(slotReady({ slot: 2, active: false }, T0), false)
})
