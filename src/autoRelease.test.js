import test from 'node:test'
import assert from 'node:assert/strict'
import { groupAnimalsForAutoRelease } from './autoRelease.js'

const NOW = 1_000_000

test('returns empty when map is empty/nullish', () => {
  const animals = [{ id: 'a', species: 'chicken', tier: 'normal' }]
  assert.deepEqual(groupAnimalsForAutoRelease(animals, {}, NOW), [])
  assert.deepEqual(groupAnimalsForAutoRelease(animals, null, NOW), [])
})

test('releases only configured species up to the inclusive max tier', () => {
  const animals = [
    { id: 'a', species: 'chicken', tier: 'normal' },
    { id: 'b', species: 'chicken', tier: 'gold' },
    { id: 'c', species: 'chicken', tier: 'diamond' },
    { id: 'd', species: 'cow', tier: 'normal' }
  ]
  const groups = groupAnimalsForAutoRelease(animals, { chicken: 'gold' }, NOW)
  assert.deepEqual(
    groups.sort((x, y) => x.tier.localeCompare(y.tier)),
    [
      { species: 'chicken', tier: 'gold', ids: ['b'] },
      { species: 'chicken', tier: 'normal', ids: ['a'] }
    ]
  )
})

test('handles multiple configured species independently', () => {
  const animals = [
    { id: 'a', species: 'chicken', tier: 'normal' },
    { id: 'b', species: 'chicken', tier: 'gold' },
    { id: 'c', species: 'cow', tier: 'normal' },
    { id: 'd', species: 'cow', tier: 'gold' }
  ]
  const groups = groupAnimalsForAutoRelease(animals, { chicken: 'normal', cow: 'gold' }, NOW)
  const byKey = Object.fromEntries(groups.map(g => [`${g.species}|${g.tier}`, g.ids]))
  assert.deepEqual(byKey, {
    'chicken|normal': ['a'],
    'cow|normal': ['c'],
    'cow|gold': ['d']
  })
})

test('excludes animals that are still upgrading', () => {
  const animals = [
    { id: 'a', species: 'chicken', tier: 'normal' },
    { id: 'b', species: 'chicken', tier: 'normal', upgrade_ready_at: new Date(NOW + 60_000).toISOString() }
  ]
  const groups = groupAnimalsForAutoRelease(animals, { chicken: 'gold' }, NOW)
  assert.deepEqual(groups, [{ species: 'chicken', tier: 'normal', ids: ['a'] }])
})

test('treats missing tier as normal and includes finished upgrades', () => {
  const animals = [
    { id: 'a', species: 'chicken' },
    { id: 'b', species: 'chicken', tier: 'normal', upgrade_ready_at: new Date(NOW - 1).toISOString() }
  ]
  const groups = groupAnimalsForAutoRelease(animals, { chicken: 'normal' }, NOW)
  assert.deepEqual(groups, [{ species: 'chicken', tier: 'normal', ids: ['a', 'b'] }])
})

test('ignores species with an invalid configured tier', () => {
  const animals = [{ id: 'a', species: 'chicken', tier: 'normal' }]
  assert.deepEqual(groupAnimalsForAutoRelease(animals, { chicken: 'bogus' }, NOW), [])
})

test('species not present in map are never released', () => {
  const animals = [
    { id: 'a', species: 'chicken', tier: 'normal' },
    { id: 'b', species: 'cow', tier: 'normal' }
  ]
  const groups = groupAnimalsForAutoRelease(animals, { chicken: 'rainbow' }, NOW)
  assert.deepEqual(groups, [{ species: 'chicken', tier: 'normal', ids: ['a'] }])
})

test('never releases equipped animals', () => {
  const animals = [
    { id: 'a', species: 'chicken', tier: 'normal', equipped: true },
    { id: 'b', species: 'chicken', tier: 'normal' },
    { id: 'c', species: 'chicken', tier: 'gold', equipped: true }
  ]
  // only 'b' (non-equipped, tier <= gold) should be included
  const groups = groupAnimalsForAutoRelease(animals, { chicken: 'rainbow' }, NOW)
  assert.deepEqual(groups, [{ species: 'chicken', tier: 'normal', ids: ['b'] }])
})

test('never releases the favorite animal', () => {
  const animals = [
    { id: 'a', species: 'chicken', tier: 'normal' },
    { id: 'b', species: 'chicken', tier: 'normal' },
    { id: 'c', species: 'cow', tier: 'normal' }
  ]
  // 'a' is the favorite → must be excluded; 'b' and 'c' are fair game
  const groups = groupAnimalsForAutoRelease(animals, { chicken: 'rainbow', cow: 'rainbow' }, NOW, 'a')
  const byKey = Object.fromEntries(groups.map(g => [`${g.species}|${g.tier}`, g.ids]))
  assert.deepEqual(byKey, {
    'chicken|normal': ['b'],
    'cow|normal': ['c']
  })
})

test('excludes both equipped and favorite when both are present', () => {
  const animals = [
    { id: 'fav',  species: 'chicken', tier: 'normal' },               // favorite
    { id: 'eq',   species: 'chicken', tier: 'normal', equipped: true }, // equipped
    { id: 'free', species: 'chicken', tier: 'normal' }                 // eligible
  ]
  const groups = groupAnimalsForAutoRelease(animals, { chicken: 'rainbow' }, NOW, 'fav')
  assert.deepEqual(groups, [{ species: 'chicken', tier: 'normal', ids: ['free'] }])
})
