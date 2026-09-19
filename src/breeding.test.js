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
  assert.equal(breedWeights(0)[2], 0, 'Gorilla bei Zuchtkraft 0')
  assert.equal(breedWeights(4)[3], 0, 'Brachiosaurus unter Zuchtkraft 5')
})

test('starke Eltern verschieben das Gewicht nach oben', () => {
  const schwach = breedWeights(1)
  const stark = breedWeights(12)
  assert.ok(stark[2] > schwach[2], 'Stufe 3 steigt nicht')
  assert.ok(stark[3] > schwach[3], 'Stufe 4 steigt nicht')
  assert.ok(stark[0] < schwach[0], 'Stufe 1 fällt nicht')
})

test('der Brachiosaurus bleibt auch bei perfekten Eltern selten', () => {
  assert.equal(breedWeights(12)[3], 10)
  assert.ok(breedWeights(12)[3] <= 15, 'stärkstes Tier zu häufig')
})

// Der Kern der Nachbesserung: vorher lagen Zuchtkraft 0 und 2 im selben
// Bereich, kosteten aber 50 Mio. gegen 450 Mio. Jeder Punkt muss zahlen.
test('jeder Punkt Zuchtkraft verbessert die Chancen', () => {
  for (let p = 0; p < 12; p++) {
    const hier = breedWeights(p)
    const naechst = breedWeights(p + 1)
    assert.ok(naechst[0] < hier[0], `Stufe 1 fällt nicht von ${p} auf ${p + 1}`)
    const obenHier = hier[2] + hier[3]
    const obenNaechst = naechst[2] + naechst[3]
    assert.ok(obenNaechst > obenHier, `obere Stufen steigen nicht von ${p} auf ${p + 1}`)
  }
})

test('das stärkste Tier steigt monoton und nie sprunghaft', () => {
  let vorher = -1
  for (let p = 0; p <= 12; p++) {
    const top = breedWeights(p)[3]
    assert.ok(top >= vorher, `Stufe 4 fällt bei ${p}`)
    vorher = top
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

test('breedChances gibt je Stufe genau das Stufengewicht aus', () => {
  const c = breedChances(12)
  assert.equal(c.length, 4)
  const summe = c.reduce((a, x) => a + x.percent, 0)
  assert.ok(Math.abs(summe - 100) < 1e-9, `Summe ${summe}`)

  const w = breedWeights(12)
  BREED_TIERS.forEach((arten, i) => {
    const treffer = c.find(x => x.species === arten[0])
    assert.equal(treffer.percent, w[i], `${arten[0]} weicht ab`)
  })
})

test('die vier Exklusiven stehen genau einmal in der Tabelle', () => {
  const alle = BREED_TIERS.flat()
  assert.equal(alle.length, 4)
  assert.equal(new Set(alle).size, 4)
  for (const s of ['hedgehog', 'leopard', 'gorilla', 'brachiosaurus']) {
    assert.ok(alle.includes(s), `${s} fehlt`)
  }
})

// Diese vier dürfen aus keiner anderen Quelle kommen, sonst ist das
// Versprechen der Zucht wieder hinfällig.
test('keine Zucht-Art taucht in einem Craft-Rezept oder Merge-Pool auf', async () => {
  const { readFileSync, readdirSync } = await import('node:fs')
  const path = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const dir = path.join(root, 'supabase', 'migrations')
  const quellen = readdirSync(dir)
    .map(f => readFileSync(path.join(dir, f), 'utf8'))
    .join('\n')
  const merge = readFileSync(
    path.join(root, 'supabase', 'functions', 'merge-game', 'index.ts'), 'utf8')

  for (const art of BREED_TIERS.flat()) {
    assert.doesNotMatch(quellen, new RegExp(`output_species[^\\n]*'${art}'`),
      `${art} hat ein Craft-Rezept`)
    assert.doesNotMatch(quellen, new RegExp(`"species":"${art}"`),
      `${art} ist Craft-Zutat oder Belohnung`)
    assert.doesNotMatch(merge, new RegExp(`'${art}'`), `${art} steckt im Merge-Spiel`)
  }
})
