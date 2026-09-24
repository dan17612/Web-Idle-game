import test from 'node:test'
import assert from 'node:assert/strict'
import {
  groupAnimals, groupEggs, isEmptySide, tradeSides, sideValue, fairness, relativeTime, groupByDay
} from './tradeTickets.js'

const ME = 'me'

test('animals are grouped by species and tier, higher tiers first', () => {
  const g = groupAnimals([
    { species: 'lion', tier: 'normal' },
    { species: 'lion' },
    { species: 'lion', tier: 'gold' },
    { species: 'chick', tier: 'normal', qty: 3 },
    { species: '' }
  ])
  assert.deepEqual(g.map(x => [x.key, x.qty]), [['lion|gold', 1], ['chick|normal', 3], ['lion|normal', 2]])
})

test('eggs are grouped by type', () => {
  const g = groupEggs([{ egg_type: 'safari', emoji: '🥚' }, { egg_type: 'safari' }, { egg_type: 'breeding', qty: 2 }])
  assert.deepEqual(g.map(x => [x.egg_type, x.qty]), [['safari', 2], ['breeding', 2]])
})

test('outgoing direct trade: I give the requester side', () => {
  const s = tradeSides({
    requester_id: ME, addressee_id: 'bob', addressee_username: 'Bob', is_public: false,
    requester_animal_details: [{ species: 'lion', tier: 'normal' }], requester_coins: 5,
    addressee_animal_details: [{ species: 'fox', tier: 'gold' }], addressee_coins: 0
  }, ME)
  assert.equal(s.kind, 'out')
  assert.equal(s.partner, 'Bob')
  assert.equal(s.give.animals[0].species, 'lion')
  assert.equal(s.give.coins, 5)
  assert.equal(s.get.animals[0].tier, 'gold')
})

test('incoming direct trade: I get the requester side', () => {
  const s = tradeSides({
    requester_id: 'bob', requester_username: 'Bob', addressee_id: ME, is_public: false,
    requester_animal_details: [], requester_coins: 100,
    addressee_animal_details: [{ species: 'fox' }], addressee_coins: 0
  }, ME)
  assert.equal(s.kind, 'in')
  assert.equal(s.get.coins, 100)
  assert.equal(s.give.animals[0].species, 'fox')
})

test('public offer from someone else: I give the wanted animals and coins', () => {
  const s = tradeSides({
    requester_id: 'bob', requester_username: 'Bob', addressee_id: null, is_public: true,
    requester_animal_details: [{ species: 'lion' }], requester_coins: 0,
    addressee_animal_details: [], addressee_coins: 50,
    wanted_animals: [{ species: 'fox', tier: 'gold', qty: 2 }],
    wanted_eggs: [{ egg_type: 'safari', qty: 1 }]
  }, ME)
  assert.equal(s.kind, 'public')
  assert.equal(s.give.wanted, true)
  assert.deepEqual(s.give.animals.map(a => [a.key, a.qty]), [['fox|gold', 2]])
  assert.equal(s.give.eggs[0].qty, 1)
  assert.equal(s.give.coins, 50)
  assert.equal(s.get.animals[0].species, 'lion')
})

test('my own public offer and accepted public trades use concrete animals', () => {
  const pending = tradeSides({
    requester_id: ME, is_public: true, requester_animal_details: [{ species: 'lion' }],
    addressee_animal_details: [], addressee_coins: 0, wanted_animals: [{ species: 'fox', qty: 1 }]
  }, ME)
  assert.equal(pending.kind, 'public-mine')
  assert.equal(pending.get.wanted, true)
  const done = tradeSides({
    requester_id: 'bob', addressee_id: ME, is_public: true, status: 'accepted',
    requester_animal_details: [], addressee_animal_details: [{ species: 'owl' }],
    wanted_animals: [{ species: 'fox', qty: 1 }]
  }, ME)
  assert.equal(done.kind, 'in')
  assert.equal(done.give.wanted, false)
  assert.equal(done.give.animals[0].species, 'owl')
})

test('empty sides are detected', () => {
  assert.equal(isEmptySide({ animals: [], eggs: [], coins: 0 }), true)
  assert.equal(isEmptySide({ animals: [], eggs: [], coins: 1 }), false)
})

test('side value sums market prices, eggs and coins; unknown prices mark it partial', () => {
  const s = { animals: [{ species: 'lion', tier: 'normal', qty: 2 }, { species: 'x', tier: 'normal', qty: 1 }], eggs: [{ egg_type: 'safari', qty: 1 }], coins: 10 }
  const price = (sp) => (sp === 'lion' ? 100 : null)
  const egg = (t) => (t === 'safari' ? 1000 : null)
  assert.deepEqual(sideValue(s, price, egg), { value: 1210, partial: true })
  assert.deepEqual(sideValue({ animals: [], eggs: [], coins: 7 }, price), { value: 7, partial: false })
})

test('fairness verdicts from the player perspective', () => {
  assert.equal(fairness(100, 150).verdict, 'great')
  assert.equal(fairness(100, 110).verdict, 'good')
  assert.equal(fairness(100, 100).verdict, 'fair')
  assert.equal(fairness(100, 80).verdict, 'bad')
  assert.equal(fairness(100, 50).verdict, 'awful')
  assert.equal(fairness(0, 0).verdict, 'fair')
  assert.equal(fairness(0, 10).pct, 100)
  assert.equal(fairness(100, 300).share, 0.75)
})

test('relative time uses Intl formatting', () => {
  const now = Date.UTC(2026, 8, 24, 12)
  assert.match(relativeTime(now - 5 * 60_000, now, 'en'), /5 min/)
  assert.match(relativeTime(now - 3 * 3_600_000, now, 'en'), /3 hr/)
  assert.match(relativeTime(now + 2 * 86_400_000, now, 'en'), /2 days|in 2 days/)
})

test('history is grouped by day, newest first', () => {
  const groups = groupByDay([
    { id: 1, t: '2026-09-20T10:00:00' },
    { id: 2, t: '2026-09-24T09:00:00' },
    { id: 3, t: '2026-09-24T18:00:00' }
  ], x => x.t)
  assert.equal(groups.length, 2)
  assert.deepEqual(groups[0].items.map(x => x.id), [3, 2])
  assert.deepEqual(groups[1].items.map(x => x.id), [1])
})
