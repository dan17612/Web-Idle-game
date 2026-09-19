import test from 'node:test'
import assert from 'node:assert/strict'
import {
  animalPower, breedPower, breedWeights, breedCost, breedMinutes,
  breedChances, BREED_TIERS, MAX_POWER
} from './breeding.js'

const rarity = {
  chick: 'common', rabbit: 'uncommon', horse: 'rare',
  panda: 'epic', dragon: 'legendary'
}
const rarityOf = (s) => rarity[s]

test('Zuchtkraft steigt mit Seltenheit', () => {
  assert.equal(animalPower('chick', 'normal', rarityOf), 0)
  assert.equal(animalPower('rabbit', 'normal', rarityOf), 1)
  assert.equal(animalPower('horse', 'normal', rarityOf), 2)
  assert.equal(animalPower('panda', 'normal', rarityOf), 3)
  assert.equal(animalPower('dragon', 'normal', rarityOf), 4)
})

test('Zuchtkraft steigt mit der Stufe', () => {
  assert.equal(animalPower('dragon', 'gold', rarityOf), 4.5)
  assert.equal(animalPower('dragon', 'diamond', rarityOf), 5)
  assert.equal(animalPower('dragon', 'rainbow', rarityOf), 6)
  assert.equal(animalPower('chick', 'rainbow', rarityOf), 2)
})

test('unbekannte Art oder Stufe fällt auf null zurück', () => {
  assert.equal(animalPower('gibtsnicht', 'normal', rarityOf), 0)
  assert.equal(animalPower('dragon', 'gibtsnicht', rarityOf), 4)
  assert.equal(animalPower('dragon', null, rarityOf), 4)
})

test('breedPower addiert und deckelt bei 12', () => {
  assert.equal(breedPower(4, 4), 8)
  assert.equal(breedPower(6, 6), MAX_POWER)
  assert.equal(breedPower(0, 0), 0)
  assert.equal(breedPower(-5, 2), 0)
  assert.equal(breedPower(null, undefined), 0)
})

test('jede Gewichtszeile summiert auf 100', () => {
  for (let p = 0; p <= 12; p += 0.5) {
    const sum = breedWeights(p).reduce((a, b) => a + b, 0)
    assert.equal(sum, 100, `Zuchtkraft ${p} summiert auf ${sum}`)
  }
})

test('schwache Eltern erreichen die oberen Stufen nicht', () => {
  const w = breedWeights(1)
  assert.equal(w[3], 0, 'Phönix/Kraken bei Zuchtkraft 1')
  assert.equal(w[4], 0, 'Weltenschildkröte bei Zuchtkraft 1')
})

test('starke Eltern verschieben das Gewicht nach oben', () => {
  const schwach = breedWeights(1)
  const stark = breedWeights(12)
  assert.ok(stark[3] > schwach[3], 'Stufe 4 steigt nicht')
  assert.ok(stark[4] > schwach[4], 'Stufe 5 steigt nicht')
  assert.ok(stark[0] < schwach[0], 'Stufe 1 fällt nicht')
})

test('die Weltenschildkröte bleibt auch bei perfekten Eltern selten', () => {
  assert.equal(breedWeights(12)[4], 3)
  assert.ok(breedWeights(12)[4] <= 5, 'stärkstes Tier zu häufig')
})

test('Gewichte verschieben sich monoton über die Zuchtkraft', () => {
  let vorherOben = -1
  for (const p of [0, 3, 6, 9, 11]) {
    const oben = breedWeights(p)[3] + breedWeights(p)[4]
    assert.ok(oben > vorherOben, `Zuchtkraft ${p}: obere Stufen fallen`)
    vorherOben = oben
  }
})

test('Kosten und Brutzeit wachsen mit der Zuchtkraft', () => {
  assert.equal(breedCost(0), 50_000_000)
  assert.equal(breedCost(12), 50_000_000 * 169)
  assert.equal(breedMinutes(0), 30)
  assert.equal(breedMinutes(12), 210)
  for (let p = 0; p < 12; p++) {
    assert.ok(breedCost(p + 1) > breedCost(p), `Kosten fallen bei ${p}`)
    assert.ok(breedMinutes(p + 1) > breedMinutes(p), `Zeit fällt bei ${p}`)
  }
})

test('breedChances verteilt das Stufengewicht auf die Arten', () => {
  const c = breedChances(12)
  assert.equal(c.length, 8)
  const summe = c.reduce((a, x) => a + x.percent, 0)
  assert.ok(Math.abs(summe - 100) < 1e-9, `Summe ${summe}`)

  const flamingo = c.find(x => x.species === 'flamingo')
  const scorpion = c.find(x => x.species === 'scorpion')
  assert.equal(flamingo.percent, scorpion.percent, 'Stufe ungleich verteilt')
  assert.equal(flamingo.percent, breedWeights(12)[0] / 2)

  const turtle = c.find(x => x.species === 'worldturtle')
  assert.equal(turtle.percent, breedWeights(12)[4], 'einzige Art der Stufe')
})

test('die acht Exklusiven stehen genau einmal in der Tabelle', () => {
  const alle = BREED_TIERS.flat()
  assert.equal(alle.length, 8)
  assert.equal(new Set(alle).size, 8)
  for (const s of ['flamingo', 'scorpion', 'owl', 'bear',
                   'unicorn', 'phoenix', 'kraken', 'worldturtle']) {
    assert.ok(alle.includes(s), `${s} fehlt`)
  }
})
