import test from 'node:test'
import assert from 'node:assert/strict'
import { eggPower, eggGroupKey, groupEggs, groupChances, groupMinutes } from './eggQueue.js'
import { SHOP_EGG_POWER, breedMinutes } from './breeding.js'

const egg = (id, egg_type, bred_power = null) => ({ id, egg_type, bred_power })

test('Shop-Zucht-Ei ohne bred_power gilt als SHOP_EGG_POWER', () => {
  assert.equal(eggPower(egg('a', 'breeding')), SHOP_EGG_POWER)
  assert.equal(eggPower(egg('a', 'breeding', 12)), 12)
  assert.equal(eggPower(egg('a', 'breeding', '4.5')), 4.5)
  assert.equal(eggPower(egg('a', 'safari')), null)
})

test('Zuchtkraft wird auf 0..12 geklemmt', () => {
  assert.equal(eggPower(egg('a', 'breeding', 99)), 12)
  assert.equal(eggPower(egg('a', 'breeding', -3)), 0)
})

test('Gruppenschlüssel trennt Zucht-Eier nach Boost', () => {
  assert.equal(eggGroupKey(egg('a', 'safari')), 'safari')
  assert.equal(eggGroupKey(egg('a', 'breeding', 12)), 'breeding|12')
  assert.equal(eggGroupKey(egg('a', 'breeding')), `breeding|${SHOP_EGG_POWER}`)
})

test('Shop-Ei und gezüchtete Eier landen in getrennten Gruppen', () => {
  const groups = groupEggs([
    egg('z1', 'breeding', 12),
    egg('s1', 'safari'),
    egg('z2', 'breeding', 12),
    egg('shop', 'breeding'),
    egg('z3', 'breeding', 6.5)
  ])
  assert.deepEqual(groups.map(g => g.key), ['breeding|12', 'breeding|6.5', 'breeding|3', 'safari'])
  assert.deepEqual(groups[0].list.map(e => e.id), ['z1', 'z2'], 'älteste zuerst bleibt erhalten')
  assert.deepEqual(groups[2].list.map(e => e.id), ['shop'])
})

test('Gruppen ohne Boost behalten die Reihenfolge ihres ersten Eis', () => {
  const groups = groupEggs([egg('a', 'safari'), egg('b', 'basic'), egg('c', 'safari')])
  assert.deepEqual(groups.map(g => g.key), ['safari', 'basic'])
  assert.equal(groups[0].list.length, 2)
})

test('Chancen pro Gruppe: Kraft 12 vs. Shop-Kraft 3', () => {
  const [top, shop] = groupEggs([egg('a', 'breeding', 12), egg('b', 'breeding')])
  const pct = (g) => Object.fromEntries(groupChances(g).map(c => [c.species, c.percent]))
  assert.deepEqual(pct(top), { gorilla: 58, leopard: 26, brachiosaurus: 10, hedgehog: 6 })
  assert.deepEqual(pct(shop), { hedgehog: 67, leopard: 28, gorilla: 5 })
  assert.equal(groupChances(top)[0].species, 'gorilla', 'höchste Chance zuerst')
  assert.equal(groupChances({ power: null }), null)
})

test('Brutzeit folgt der Zuchtkraft, sonst der Sorte', () => {
  const [top, shop] = groupEggs([egg('a', 'breeding', 12), egg('b', 'breeding')])
  assert.equal(groupMinutes(top, 75), 210)
  assert.equal(groupMinutes(shop, 75), breedMinutes(SHOP_EGG_POWER))
  assert.equal(groupMinutes({ power: null }, 60), 60)
})
