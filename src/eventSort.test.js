import test from 'node:test'
import assert from 'node:assert/strict'
import { sortEvents, isNewEvent, EVENT_SORTS } from './eventSort.js'

const cards = [
  { id: 'boss', released: '2026-04-26', remaining: 45 * 864e5 },
  { id: 'blockfall', released: '2026-09-24', remaining: 60 * 864e5 },
  { id: 'world', released: '2026-08-03', remaining: 0 },
  { id: 'wordle', released: '2026-07-17', remaining: 40 * 864e5 }
]
const ids = (list) => list.map((c) => c.id)

test('Standard: neueste zuerst', () => {
  assert.deepEqual(ids(sortEvents(cards)), ['blockfall', 'world', 'wordle', 'boss'])
})

test('endet bald: kürzester Countdown zuerst, ohne Ende zuletzt', () => {
  assert.deepEqual(ids(sortEvents(cards, 'ending')), ['wordle', 'boss', 'blockfall', 'world'])
})

test('Name: alphabetisch über die übergebene Beschriftung', () => {
  const names = { boss: 'Boss', blockfall: 'BlockFall', world: 'Zoo-Welt', wordle: 'Wordle' }
  assert.deepEqual(ids(sortEvents(cards, 'name', (c) => names[c.id])), ['blockfall', 'boss', 'wordle', 'world'])
})

test('unbekannter Modus fällt auf neueste zurück, Eingabe bleibt unverändert', () => {
  const before = ids(cards)
  assert.deepEqual(ids(sortEvents(cards, 'quatsch')), ids(sortEvents(cards, 'newest')))
  assert.deepEqual(ids(cards), before)
  assert.deepEqual(EVENT_SORTS, ['newest', 'ending', 'name'])
})

test('NEU-Abzeichen nur in den ersten 14 Tagen', () => {
  const now = Date.parse('2026-09-30')
  assert.equal(isNewEvent({ released: '2026-09-24' }, now), true)
  assert.equal(isNewEvent({ released: '2026-09-01' }, now), false)
  assert.equal(isNewEvent({}, now), false)
})
