import test from 'node:test'
import assert from 'node:assert/strict'
import { EVENT_KEYS, eventInfo, remainingMs } from './eventSchedule.js'

const NOW = Date.parse('2026-09-19T12:00:00Z')
const past = '2026-08-30T23:59:59Z'
const future = '2026-12-24T18:00:00Z'

test('ohne Eintrag gilt ein Ereignis als aktiv', () => {
  assert.deepEqual(eventInfo({}, 'drift_game', NOW),
    { active: true, ended: false, endsAt: 0, showCountdown: false })
  assert.equal(eventInfo(null, 'drift_game', NOW).active, true)
  assert.equal(eventInfo(undefined, 'drift_game', NOW).active, true)
})

test('vergangenes ends_at beendet das Ereignis', () => {
  const info = eventInfo({ memory_game: { ends_at: past, enabled: true } }, 'memory_game', NOW)
  assert.equal(info.active, false)
  assert.equal(info.ended, true)
  assert.equal(info.endsAt, Date.parse(past))
})

test('zukünftiges ends_at lässt es laufen und liefert den Countdown', () => {
  const info = eventInfo({ wordle_game: { ends_at: future, enabled: true } }, 'wordle_game', NOW)
  assert.equal(info.active, true)
  assert.equal(info.showCountdown, true)
  assert.equal(remainingMs({ wordle_game: { ends_at: future } }, 'wordle_game', NOW),
    Date.parse(future) - NOW)
})

test('enabled=false schlägt jedes Datum', () => {
  const info = eventInfo({ x: { ends_at: future, enabled: false } }, 'x', NOW)
  assert.equal(info.active, false)
})

test('starts_at in der Zukunft hält das Ereignis zu', () => {
  const info = eventInfo({ x: { starts_at: future, ends_at: null, enabled: true } }, 'x', NOW)
  assert.equal(info.active, false)
})

test('ends_at ohne Countdown liefert endsAt 0, bleibt aber beendet', () => {
  const info = eventInfo({ x: { ends_at: past, show_countdown: false } }, 'x', NOW)
  assert.equal(info.endsAt, 0)
  assert.equal(info.showCountdown, false)
  assert.equal(info.active, false)
})

test('ends_at genau jetzt zählt als beendet', () => {
  const exact = new Date(NOW).toISOString()
  assert.equal(eventInfo({ x: { ends_at: exact } }, 'x', NOW).active, false)
})

test('laufendes Ereignis ohne Enddatum hat keinen Countdown', () => {
  const info = eventInfo({ world_lobby: { ends_at: null, enabled: true } }, 'world_lobby', NOW)
  assert.equal(info.active, true)
  assert.equal(info.showCountdown, false)
  assert.equal(remainingMs({ world_lobby: { ends_at: null } }, 'world_lobby', NOW), 0)
})

test('EVENT_KEYS deckt alle Ereignisse der Startseite ab', () => {
  assert.deepEqual(Object.values(EVENT_KEYS).sort(), [
    'blockfall_game', 'boss_endless', 'boss_path', 'breeding_game', 'drift_game',
    'memory_game', 'merge_game', 'parkour_game', 'wordle_game', 'world_lobby'
  ])
})
