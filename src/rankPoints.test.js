import test from 'node:test'
import assert from 'node:assert/strict'
import { rankPoints, totalPoints, DISCIPLINES } from './rankPoints.js'

test('die Spitzenplätze zahlen die festgelegten Punkte', () => {
  assert.equal(rankPoints(1), 100)
  assert.equal(rankPoints(2), 80)
  assert.equal(rankPoints(3), 65)
})

test('Platz 4 bis 10 fallen in Sechserschritten', () => {
  assert.deepEqual([4, 5, 6, 7, 8, 9, 10].map(rankPoints), [60, 54, 48, 42, 36, 30, 24])
})

test('Platz 11 bis 25 fallen in Einerschritten von 20 auf 6', () => {
  assert.equal(rankPoints(11), 20)
  assert.equal(rankPoints(25), 6)
  assert.deepEqual([11, 12, 13].map(rankPoints), [20, 19, 18])
})

test('Platz 26 bis 50 bringen pauschal 5, 51 bis 100 pauschal 2', () => {
  assert.equal(rankPoints(26), 5)
  assert.equal(rankPoints(50), 5)
  assert.equal(rankPoints(51), 2)
  assert.equal(rankPoints(100), 2)
})

test('jenseits von Platz 100 und bei ungültiger Eingabe gibt es null', () => {
  assert.equal(rankPoints(101), 0)
  assert.equal(rankPoints(0), 0)
  assert.equal(rankPoints(-3), 0)
  assert.equal(rankPoints(null), 0)
  assert.equal(rankPoints(undefined), 0)
  assert.equal(rankPoints('abc'), 0)
})

test('die Punkte fallen über alle Plätze monoton und werden nie negativ', () => {
  for (let r = 1; r < 120; r++) {
    const hier = rankPoints(r)
    const danach = rankPoints(r + 1)
    assert.ok(hier >= danach, `Platz ${r} (${hier}) liegt unter Platz ${r + 1} (${danach})`)
    assert.ok(hier >= 0, `Platz ${r} ergibt negative Punkte`)
  }
})

test('es gibt keinen Sprung nach oben an den Stufengrenzen', () => {
  for (const grenze of [3, 10, 25, 50, 100]) {
    assert.ok(rankPoints(grenze) > rankPoints(grenze + 1),
      `an Platz ${grenze} fällt es nicht`)
  }
})

test('totalPoints summiert die Aufschlüsselung und verträgt Müll', () => {
  assert.equal(totalPoints([{ points: 100 }, { points: 20 }, { points: 5 }]), 125)
  assert.equal(totalPoints([]), 0)
  assert.equal(totalPoints(null), 0)
  assert.equal(totalPoints([{ points: 'x' }, {}, null]), 0)
})

test('DISCIPLINES listet die neun Wertungen ohne Dopplung', () => {
  assert.equal(DISCIPLINES.length, 9)
  assert.equal(new Set(DISCIPLINES).size, 9)
  for (const key of ['rate', 'coins', 'drift', 'parkour', 'wordle']) {
    assert.ok(DISCIPLINES.includes(key), `${key} fehlt`)
  }
})
