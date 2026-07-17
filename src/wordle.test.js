import test from 'node:test'
import assert from 'node:assert/strict'
import {
  WORD_LENGTH,
  MAX_GUESSES,
  KEYBOARD_ROWS,
  normalizeGuess,
  isValidGuess,
  keyStates,
  wordleReward
} from './wordle.js'

test('constants match the classic wordle layout', () => {
  assert.equal(WORD_LENGTH, 5)
  assert.equal(MAX_GUESSES, 6)
})

test('keyboard covers all german letters incl. umlauts plus enter/back', () => {
  const keys = KEYBOARD_ROWS.flat()
  for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ') {
    assert.ok(keys.includes(ch), `missing key ${ch}`)
  }
  assert.ok(keys.includes('ENTER'))
  assert.ok(keys.includes('BACK'))
})

test('normalizeGuess trims and uppercases incl. umlauts', () => {
  assert.equal(normalizeGuess('  tiger '), 'TIGER')
  assert.equal(normalizeGuess('hyäne'), 'HYÄNE')
  assert.equal(normalizeGuess(null), '')
})

test('isValidGuess accepts exactly five german letters', () => {
  assert.ok(isValidGuess('tiger'))
  assert.ok(isValidGuess('HYÄNE'))
  assert.ok(isValidGuess('mütze'))
  assert.ok(!isValidGuess('haus'))
  assert.ok(!isValidGuess('sechs1'))
  assert.ok(!isValidGuess('str aß'))
  assert.ok(isValidGuess('weiß'), 'ß wird zu SS: WEISS ist gültig')
  assert.ok(!isValidGuess('weißt'), 'WEISST hat 6 Buchstaben')
  assert.ok(!isValidGuess(''))
})

test('keyStates keeps the best state per letter (c > p > a)', () => {
  const states = keyStates([
    { g: 'TIGER', r: 'apaaa' },
    { g: 'TAUBE', r: 'caapa' },
    { g: 'ROBBE', r: 'aaaac' }
  ])
  assert.equal(states.T, 'c')
  assert.equal(states.I, 'p')
  assert.equal(states.B, 'p')
  assert.equal(states.E, 'c')
  assert.equal(states.G, 'a')
  assert.equal(states.Q, undefined)
})

test('keyStates never downgrades a letter', () => {
  const states = keyStates([
    { g: 'AAAAA', r: 'caaaa' },
    { g: 'AAAAA', r: 'aaaaa' }
  ])
  assert.equal(states.A, 'c')
})

test('wordleReward pays more for fewer attempts', () => {
  assert.deepEqual(wordleReward(1), { coins: 12000, tickets: 3 })
  assert.deepEqual(wordleReward(2), { coins: 9000, tickets: 2 })
  assert.deepEqual(wordleReward(3), { coins: 7000, tickets: 1 })
  assert.deepEqual(wordleReward(4), { coins: 5000, tickets: 1 })
  assert.deepEqual(wordleReward(5), { coins: 3500, tickets: 0 })
  assert.deepEqual(wordleReward(6), { coins: 2500, tickets: 0 })
})

test('wordleReward streak multiplier caps at x2', () => {
  assert.equal(wordleReward(3, 1).coins, 7000)
  assert.equal(wordleReward(3, 5).coins, 9800)
  assert.equal(wordleReward(3, 11).coins, 14000)
  assert.equal(wordleReward(3, 99).coins, 14000)
})
