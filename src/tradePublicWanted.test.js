import test from 'node:test'
import assert from 'node:assert/strict'
import { groupMatchesWanted, pickWantedAnimals, wantedCountSatisfied, wantedSelectionExact } from './tradePublicWanted.js'

test('groupMatchesWanted limits public accepted animals to the wanted species and tier', () => {
  const wanted = { wanted_species: 'chicken', wanted_tier: 'normal', wanted_qty: 2 }

  assert.equal(groupMatchesWanted({ species: 'chicken', tier: 'normal' }, wanted), true)
  assert.equal(groupMatchesWanted({ species: 'chicken', tier: 'gold' }, wanted), false)
  assert.equal(groupMatchesWanted({ species: 'chick', tier: 'normal' }, wanted), false)
})

test('wantedCountSatisfied requires the configured public wanted quantity', () => {
  const selectedAnimals = [
    { id: 'a', species: 'chicken', tier: 'normal' },
    { id: 'b', species: 'chicken', tier: 'normal' }
  ]
  const wanted = { wanted_species: 'chicken', wanted_tier: 'normal', wanted_qty: 2 }

  assert.equal(wantedCountSatisfied(selectedAnimals, wanted), true)
  assert.equal(wantedSelectionExact(selectedAnimals, wanted), true)
  assert.equal(wantedCountSatisfied(selectedAnimals.slice(0, 1), wanted), false)
  assert.equal(wantedSelectionExact([...selectedAnimals, { id: 'c', species: 'chicken', tier: 'normal' }], wanted), false)
})

test('wantedCountSatisfied supports multiple wanted animal groups', () => {
  const selectedAnimals = [
    { id: 'a', species: 'chicken', tier: 'normal' },
    { id: 'b', species: 'chicken', tier: 'normal' },
    { id: 'c', species: 'cow', tier: 'gold' }
  ]
  const wanted = {
    wanted_animals: [
      { species: 'chicken', tier: 'normal', qty: 2 },
      { species: 'cow', tier: 'gold', qty: 1 }
    ]
  }

  assert.equal(groupMatchesWanted({ species: 'chicken', tier: 'normal' }, wanted), true)
  assert.equal(groupMatchesWanted({ species: 'cow', tier: 'gold' }, wanted), true)
  assert.equal(groupMatchesWanted({ species: 'cow', tier: 'normal' }, wanted), false)
  assert.equal(wantedCountSatisfied(selectedAnimals, wanted), true)
  assert.equal(wantedSelectionExact(selectedAnimals, wanted), true)
  assert.equal(wantedCountSatisfied(selectedAnimals.slice(0, 2), wanted), false)
  assert.equal(wantedSelectionExact([...selectedAnimals, { id: 'd', species: 'chicken', tier: 'normal' }], wanted), false)
})

test('pickWantedAnimals automatically selects the exact requested animals', () => {
  const available = [
    { id: 'a', species: 'chicken', tier: 'normal' },
    { id: 'b', species: 'cow', tier: 'gold' },
    { id: 'c', species: 'chicken', tier: 'normal' },
    { id: 'd', species: 'chicken', tier: 'gold' }
  ]
  const wanted = {
    wanted_animals: [
      { species: 'chicken', tier: 'normal', qty: 2 },
      { species: 'cow', tier: 'gold', qty: 1 }
    ]
  }

  assert.deepEqual(pickWantedAnimals(available, wanted).map(a => a.id), ['a', 'c', 'b'])
  assert.deepEqual(pickWantedAnimals(available.slice(0, 2), wanted), [])
})
