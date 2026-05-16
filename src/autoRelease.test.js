import test from 'node:test'
import assert from 'node:assert/strict'
import { groupAnimalsForAutoRelease } from './autoRelease.js'

const NOW = 1_000_000

test('returns empty when threshold is off/empty', () => {
  const animals = [{ id: 'a', species: 'chicken', tier: 'normal' }]
  assert.deepEqual(groupAnimalsForAutoRelease(animals, '', NOW), [])
  assert.deepEqual(groupAnimalsForAutoRelease(animals, null, NOW), [])
})

test('groups only animals strictly below the threshold tier', () => {
  const animals = [
    { id: 'a', species: 'chicken', tier: 'normal' },
    { id: 'b', species: 'chicken', tier: 'normal' },
    { id: 'c', species: 'cow', tier: 'gold' },
    { id: 'd', species: 'cow', tier: 'diamond' }
  ]
  const groups = groupAnimalsForAutoRelease(animals, 'gold', NOW)
  assert.deepEqual(groups, [{ species: 'chicken', tier: 'normal', ids: ['a', 'b'] }])

  const groups2 = groupAnimalsForAutoRelease(animals, 'diamond', NOW)
  assert.deepEqual(
    groups2.sort((x, y) => x.species.localeCompare(y.species)),
    [
      { species: 'chicken', tier: 'normal', ids: ['a', 'b'] },
      { species: 'cow', tier: 'gold', ids: ['c'] }
    ]
  )
})

test('excludes animals that are still upgrading', () => {
  const animals = [
    { id: 'a', species: 'chicken', tier: 'normal' },
    { id: 'b', species: 'chicken', tier: 'normal', upgrade_ready_at: new Date(NOW + 60_000).toISOString() }
  ]
  const groups = groupAnimalsForAutoRelease(animals, 'gold', NOW)
  assert.deepEqual(groups, [{ species: 'chicken', tier: 'normal', ids: ['a'] }])
})

test('treats missing tier as normal and includes finished upgrades', () => {
  const animals = [
    { id: 'a', species: 'chicken' },
    { id: 'b', species: 'chicken', tier: 'normal', upgrade_ready_at: new Date(NOW - 1).toISOString() }
  ]
  const groups = groupAnimalsForAutoRelease(animals, 'gold', NOW)
  assert.deepEqual(groups, [{ species: 'chicken', tier: 'normal', ids: ['a', 'b'] }])
})

test('unknown threshold value yields no groups', () => {
  const animals = [{ id: 'a', species: 'chicken', tier: 'normal' }]
  assert.deepEqual(groupAnimalsForAutoRelease(animals, 'bogus', NOW), [])
})
