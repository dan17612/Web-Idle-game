import test from 'node:test'
import assert from 'node:assert/strict'
import { rarityInfo, sortByRarity, formatDropChance } from './eggRarity.js'

test('rarityInfo returns label, color and emoji for each tier', () => {
  assert.equal(rarityInfo('common').label.en, 'Common')
  assert.equal(rarityInfo('common').color, '#9ca3af')
  assert.equal(rarityInfo('legendary').emoji, '🟡')
  assert.equal(rarityInfo('legendary').label.de, 'Legendary')
  assert.equal(rarityInfo('unknown').label.en, 'Common')
})

test('sortByRarity orders ascending from common to legendary', () => {
  const input = [
    { rarity: 'epic', species: 'rhino' },
    { rarity: 'common', species: 'elephant' },
    { rarity: 'legendary', species: 'hippo' },
    { rarity: 'rare', species: 'zebra' },
    { rarity: 'uncommon', species: 'giraffe' }
  ]
  const out = sortByRarity(input)
  assert.deepEqual(out.map(x => x.species), ['elephant', 'giraffe', 'zebra', 'rhino', 'hippo'])
})

test('formatDropChance turns weight totals into percent string', () => {
  const drops = [
    { species: 'a', weight: 60 },
    { species: 'b', weight: 40 }
  ]
  assert.equal(formatDropChance(drops[0], drops), '60%')
  assert.equal(formatDropChance(drops[1], drops), '40%')
})

test('formatDropChance handles empty pool', () => {
  assert.equal(formatDropChance({ weight: 5 }, []), '0%')
  assert.equal(formatDropChance({ weight: 0 }, [{ weight: 0 }]), '0%')
})
