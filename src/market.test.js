import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MARKET, easeFromChance, tierQty, baseValue, scarcity, speciesEase, tierEase,
  scarcityMultiplier, modelValue, median, blendWithFills, percentChange, formatPct,
  tickerSymbol, portfolio, priceSuggestions, groupAsks, chartPoints, linePath, areaPath,
  timeScale, nearestPoint
} from './market.js'

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`)

test('easeFromChance maps drop chances logarithmically onto 0..1', () => {
  near(easeFromChance(0.1), 1)
  near(easeFromChance(0.5), 1)
  near(easeFromChance(0.01), 2 / 3)
  near(easeFromChance(0.001), 1 / 3)
  near(easeFromChance(0.0001), 0)
  assert.equal(easeFromChance(0), 0)
  assert.equal(easeFromChance(null), 0)
  assert.equal(easeFromChance(-1), 0)
})

test('tier quantity uses the normal animals consumed by the upgrade', () => {
  assert.equal(tierQty(0), 1)
  assert.equal(tierQty(3), 3)
  assert.equal(tierQty(12), 12)
  assert.equal(tierQty(undefined), 1)
})

test('base value takes the highest of cost, utility and craft input', () => {
  assert.equal(baseValue({ cost: 50, rate: 1 }), 200)
  assert.equal(baseValue({ cost: 40_000_000, rate: 170_000 }), 40_000_000)
  // Safari-Ei-Tiere haben cost = 1 → Nutzwert greift
  assert.equal(baseValue({ cost: 1, rate: 1_500_000 }), 300_000_000)
  assert.equal(baseValue({ cost: 200_000_000, rate: 500_000, craftInput: 450_000_000 }), 450_000_000)
  assert.equal(baseValue({}), 1)
})

test('scarcity is 1 when nobody owns it and 0 when everybody does', () => {
  assert.equal(scarcity(0, 40), 1)
  assert.equal(scarcity(40, 40), 0)
  near(scarcity(10, 40), 0.5)
  assert.equal(scarcity(5, 0), 0) // players mindestens 1, Anteil gekappt
})

test('species ease picks the easiest source and halves for leaving species', () => {
  near(speciesEase({ chestChance: 0.27 }), 1)
  near(speciesEase({ eggChance: 0.01 }), MARKET.EGG_EASE * (2 / 3))
  near(speciesEase({ breedChance: 0.01, eggChance: 0.001 }), MARKET.BREED_EASE * (2 / 3))
  near(speciesEase({ craftEase: 0.3 }), 0.3)
  near(speciesEase({ chestChance: 0.1, leaving: true }), 0.5)
  assert.equal(speciesEase({}), 0)
})

test('tier ease shrinks with every tier step', () => {
  near(tierEase(1, 0), 1)
  near(tierEase(1, 4), 0.6)
  assert.equal(tierEase(0.5, 20), 0)
})

test('easy-to-get animals stay near base value even if nobody owns them', () => {
  near(scarcityMultiplier(1, 1), 1)
  near(scarcityMultiplier(1, 0), 1 + MARKET.SCARCITY_WEIGHT)
  near(scarcityMultiplier(0, 0), 1)
  // Ausgelaufen und kaum Besitzer → bis zu 4×
  assert.equal(modelValue({ base: 100, qty: 0, k: 1, ease: 0 }), 400)
  // Häufig in der Truhe → bleibt beim Basiswert
  assert.equal(modelValue({ base: 100, qty: 0, k: 1, ease: 1 }), 100)
  // Regenbogen = 12 normale Tiere
  assert.equal(modelValue({ base: 100, qty: 12, k: 0, ease: 1 }), 1200)
})

test('median handles odd, even and empty lists', () => {
  assert.equal(median([3, 1, 2]), 2)
  assert.equal(median([4, 1, 3, 2]), 2.5)
  assert.equal(median([]), null)
})

test('fills pull the value toward the market price, clamped against wash trades', () => {
  assert.equal(blendWithFills(1000, []), 1000)
  // 1 Trade → Gewicht 0,1
  assert.equal(blendWithFills(1000, [2000]), Math.round(Math.exp(0.9 * Math.log(1000) + 0.1 * Math.log(2000))))
  // Viele Trades → Gewicht max. 0,5; absurder Preis auf 4× geklemmt
  const many = new Array(10).fill(1e12)
  assert.equal(blendWithFills(1000, many), Math.round(Math.exp(0.5 * Math.log(1000) + 0.5 * Math.log(4000))))
  const dump = new Array(10).fill(1)
  assert.equal(blendWithFills(1000, dump), Math.round(Math.exp(0.5 * Math.log(1000) + 0.5 * Math.log(250))))
})

test('percent change and formatting', () => {
  assert.equal(percentChange(110, 100), 10)
  assert.equal(percentChange(90, 100), -10)
  assert.equal(percentChange(5, 0), 0)
  assert.equal(formatPct(3.456), '+3.46%')
  assert.equal(formatPct(-1.2, 1), '−1.2%')
  assert.equal(formatPct(0), '±0.00%')
})

test('ticker symbols look like exchange symbols', () => {
  assert.equal(tickerSymbol('lion'), 'LION')
  assert.equal(tickerSymbol('worldturtle'), 'WORL')
  assert.equal(tickerSymbol('ox'), 'OX')
  assert.equal(tickerSymbol(''), '???')
})

test('portfolio sums values, previous values and sparklines', () => {
  const markets = [
    { species: 'lion', tier: 'normal', value: 100, prev_24h: 80, spark: [80, 90, 100] },
    { species: 'lion', tier: 'gold', value: 400, prev_24h: 400, spark: [400, 400, 400] }
  ]
  const animals = [
    { species: 'lion', tier: 'normal' },
    { species: 'lion' },
    { species: 'lion', tier: 'gold' },
    { species: 'unknown', tier: 'normal' }
  ]
  const p = portfolio(animals, markets)
  assert.equal(p.value, 600)
  assert.equal(p.prev, 560)
  near(p.change, (40 / 560) * 100)
  assert.deepEqual(p.spark, [560, 580, 600])
  assert.deepEqual(portfolio([], markets), { value: 0, prev: 0, change: 0, spark: [] })
})

test('price suggestions around the market value', () => {
  const s = priceSuggestions(1000)
  assert.deepEqual(s.map(x => x.price), [900, 1000, 1100, 1250])
  assert.equal(priceSuggestions(0)[0].price, 1)
})

test('asks are grouped into price levels with depth and cumulative size', () => {
  const book = groupAsks([
    { id: 'a', price: 200, seller: 'x' },
    { id: 'b', price: 100, seller: 'y' },
    { id: 'c', price: 100, seller: 'z', mine: true },
    { id: 'd', price: 100, seller: 'y' }
  ])
  assert.equal(book.length, 2)
  assert.equal(book[0].price, 100)
  assert.equal(book[0].qty, 3)
  assert.deepEqual(book[0].ids, ['b', 'd'])
  assert.deepEqual(book[0].ownIds, ['c'])
  assert.deepEqual(book[0].sellers.sort(), ['y', 'z'])
  assert.equal(book[0].depth, 1)
  assert.equal(book[1].cum, 4)
  near(book[1].depth, 1 / 3)
})

test('chart helpers produce SVG paths within bounds', () => {
  const pts = chartPoints([1, 3, 2], 100, 50, 0)
  assert.equal(pts.length, 3)
  assert.equal(pts[0].x, 0)
  assert.equal(pts[2].x, 100)
  assert.equal(pts[1].y, 0)   // Maximum oben
  assert.equal(pts[0].y, 50)  // Minimum unten
  assert.equal(linePath(pts), 'M0,50L50,0L100,25')
  assert.equal(areaPath(pts, 50), 'M0,50L50,0L100,25L100,50L0,50Z')
  // Flache Linie landet in der Mitte statt an der Kante
  const flat = chartPoints([5, 5], 100, 50, 0)
  assert.equal(flat[0].y, 25)
  assert.deepEqual(chartPoints([], 10, 10), [])
  assert.equal(linePath([]), '')
})

test('time scale positions points by time and leaves headroom', () => {
  const s = timeScale([
    { t: '2026-09-24T00:00:00Z', v: 100 },
    { t: '2026-09-24T06:00:00Z', v: 200 },
    { t: '2026-09-24T01:00:00Z', v: 150 }
  ], 120, 60, 0)
  assert.equal(s.points.length, 3)
  assert.equal(s.points[0].x, 0)
  assert.equal(s.points[1].x, 20)   // 1 h von 6 h
  assert.equal(s.points[2].x, 120)
  assert.ok(s.min < 100 && s.max > 200)
  assert.ok(s.points[2].y > 0 && s.points[0].y < 60)
  // Trade-Preise erweitern die Skala
  const wide = timeScale([{ t: 0, v: 100 }, { t: 1000, v: 100 }], 100, 50, 0, [300])
  assert.ok(wide.max > 300)
  const empty = timeScale([], 100, 50)
  assert.deepEqual(empty.points, [])
})

test('nearest point for the crosshair', () => {
  const pts = [{ x: 0 }, { x: 10 }, { x: 30 }]
  assert.equal(nearestPoint(pts, 18).x, 10)
  assert.equal(nearestPoint(pts, 25).x, 30)
  assert.equal(nearestPoint([], 5), null)
})
