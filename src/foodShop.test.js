import test from 'node:test'
import assert from 'node:assert/strict'
import { foodShopList, isFoodNotAvailableError } from './foodShop.js'

const FOODS = [
  { food: 'steak', cost: 85000, rarity: 'uncommon' },
  { food: 'bread', cost: 150, rarity: 'common' },
  { food: 'cookie', cost: 450000000, rarity: 'legendary' },
  { food: 'fish', cost: 9500, rarity: 'uncommon' },
]

test('verfügbare Futter zuerst, jeweils nach Preis sortiert', () => {
  const list = foodShopList(FOODS, ['cookie', 'fish'])
  assert.deepEqual(list.map((f) => [f.food, f.available]), [
    ['fish', true], ['cookie', true], ['bread', false], ['steak', false],
  ])
})

test('ohne Angebotsliste ist nichts verfügbar', () => {
  assert.ok(foodShopList(FOODS, undefined).every((f) => !f.available))
  assert.deepEqual(foodShopList(null, ['bread']), [])
})

test('deaktivierte Futter werden ausgeblendet, fehlende Seltenheit = common', () => {
  const list = foodShopList([{ food: 'x', cost: 1, enabled: false }, { food: 'y', cost: 2 }], ['y'])
  assert.deepEqual(list.map((f) => [f.food, f.rarity]), [['y', 'common']])
})

test('Server-Fehler „food not available" wird erkannt', () => {
  assert.equal(isFoodNotAvailableError(new Error('food not available')), true)
  assert.equal(isFoodNotAvailableError({ message: 'insufficient coins' }), false)
  assert.equal(isFoodNotAvailableError(null), false)
})
