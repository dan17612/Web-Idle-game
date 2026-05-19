import test from 'node:test'
import assert from 'node:assert/strict'
import {
  boardColumns, isMyTurn, turnSecondsLeft, canStartGame, sortedPlayers,
  pickFnError,
} from './memoryOnline.js'

test('boardColumns scales with card count and caps at 12', () => {
  assert.equal(boardColumns(16), 4)
  assert.equal(boardColumns(24), 5)
  assert.equal(boardColumns(36), 6)
  assert.equal(boardColumns(100), 10)
  assert.equal(boardColumns(198), 12)
  assert.equal(boardColumns(0), 4)
})

test('isMyTurn compares turn_player_id with me', () => {
  assert.equal(isMyTurn({ turn_player_id: 'u1', me: 'u1' }), true)
  assert.equal(isMyTurn({ turn_player_id: 'u2', me: 'u1' }), false)
  assert.equal(isMyTurn(null), false)
})

test('turnSecondsLeft clamps to >= 0 using server clock skew', () => {
  const state = {
    turn_expires_at: new Date(Date.now() + 12000).toISOString(),
    server_now: new Date().toISOString(),
  }
  const left = turnSecondsLeft(state, Date.now())
  assert.ok(left >= 10 && left <= 13, `expected ~12, got ${left}`)
  assert.equal(turnSecondsLeft({ turn_expires_at: null }, Date.now()), 0)
})

test('canStartGame needs host + at least 2 players + lobby', () => {
  const base = { status: 'lobby', host_id: 'h', me: 'h',
    players: [{ user_id: 'h' }, { user_id: 'b' }] }
  assert.equal(canStartGame(base), true)
  assert.equal(canStartGame({ ...base, me: 'b' }), false)
  assert.equal(canStartGame({ ...base, players: [{ user_id: 'h' }] }), false)
  assert.equal(canStartGame({ ...base, status: 'playing' }), false)
})

test('sortedPlayers orders by seat ascending', () => {
  const out = sortedPlayers({ players: [{ seat: 3 }, { seat: 1 }, { seat: 2 }] })
  assert.deepEqual(out.map((p) => p.seat), [1, 2, 3])
})

test('pickFnError prefers the parsed response body over the generic error', () => {
  // supabase-js: non-2xx => data null, generic FunctionsHttpError, real msg in body
  assert.equal(
    pickFnError({
      data: null,
      error: { message: 'Edge Function returned a non-2xx status code' },
      body: { error: 'need 2 players' },
    }),
    'need 2 players',
  )
})

test('pickFnError falls back to data.error then error.message then default', () => {
  assert.equal(pickFnError({ data: { error: 'wrong password' }, error: null, body: null }), 'wrong password')
  assert.equal(pickFnError({ data: null, error: { message: 'NetworkError' }, body: null }), 'NetworkError')
  assert.equal(pickFnError({ data: null, error: null, body: null }), 'Fehler')
  assert.equal(pickFnError({ data: null, error: {}, body: {} }), 'Fehler')
})
