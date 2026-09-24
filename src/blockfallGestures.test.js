import test from 'node:test'
import assert from 'node:assert/strict'
import { SwipeTracker } from './blockfallGestures.js'

// Spielt eine Fingerbahn ab: Punkte [x, y, t], erster = start, letzter = end.
function gesture(points, cell = 30) {
  const g = new SwipeTracker(cell)
  const [first, ...rest] = points
  g.start(...first)
  const actions = []
  rest.slice(0, -1).forEach((p) => actions.push(...g.move(...p)))
  actions.push(...g.end(...rest[rest.length - 1]))
  return actions
}

test('kurzes Tippen dreht', () => {
  assert.deepEqual(gesture([[100, 100, 0], [102, 101, 80]]), ['rotate'])
})

test('langes Halten ohne Bewegung dreht nicht', () => {
  assert.deepEqual(gesture([[100, 100, 0], [101, 100, 600]]), [])
})

test('seitlich ziehen schiebt zellenweise und folgt dem Finger zurück', () => {
  const a = gesture([[100, 300, 0], [130, 302, 60], [175, 303, 120], [125, 303, 200], [125, 303, 700]])
  // +75 px bei Schritt 24 → 3× rechts, zurück auf +25 → 2× links
  assert.deepEqual(a, ['right', 'right', 'right', 'left', 'left'])
})

test('seitliches Ziehen löst kein Fallenlassen aus, auch wenn es leicht abwärts geht', () => {
  const a = gesture([[100, 300, 0], [140, 310, 40], [190, 322, 80], [240, 330, 120]])
  assert.ok(!a.includes('drop'))
  assert.ok(!a.includes('soft'))
  assert.equal(a.filter((x) => x === 'right').length, 5)
})

test('langsam runterziehen = eine Zelle pro Schritt', () => {
  const a = gesture([[100, 100, 0], [101, 135, 200], [101, 165, 400], [101, 195, 600], [101, 195, 1200]])
  assert.deepEqual(a, ['soft', 'soft', 'soft'])
})

test('schneller Wisch nach unten = fallen lassen', () => {
  const a = gesture([[100, 100, 0], [101, 140, 30], [102, 200, 60], [102, 230, 80]])
  assert.equal(a[a.length - 1], 'drop')
})

test('schneller Wisch nach oben = halten', () => {
  assert.deepEqual(gesture([[100, 300, 0], [101, 260, 30], [101, 220, 60], [101, 200, 80]]), ['hold'])
})

test('erst seitlich, dann deutlich runter wechselt auf senkrecht', () => {
  const a = gesture([[100, 100, 0], [150, 102, 100], [152, 160, 300], [152, 200, 500], [152, 200, 1100]])
  assert.deepEqual(a.slice(0, 2), ['right', 'right'])
  assert.ok(a.includes('soft'))
})

test('rebase: neuer Stein zählt vom aktuellen Punkt', () => {
  const g = new SwipeTracker(30)
  g.start(100, 100, 0)
  assert.deepEqual(g.move(150, 100, 100), ['right', 'right'])
  g.rebase(150, 100)
  assert.deepEqual(g.move(160, 100, 150), [])
  assert.deepEqual(g.move(175, 100, 200), ['right'])
})
