import test from 'node:test'
import assert from 'node:assert/strict'
import {
  WORLD, POI, FARM, COLLIDERS, PLOT_CAPACITY,
  plotPosition, clampToWorld, resolveCollision, nearestZone,
  outfitVisual, carVisual, farmVisual, advanceRemote,
} from './world.js'

test('plotPosition ist deterministisch und bis zur Kapazität überlappungsfrei', () => {
  const a = plotPosition(7)
  const b = plotPosition(7)
  assert.deepEqual(a, b)
  const seen = []
  for (let p = 1; p <= PLOT_CAPACITY; p++) {
    const pos = plotPosition(p)
    for (const other of seen) {
      const d = Math.hypot(pos.x - other.x, pos.z - other.z)
      assert.ok(d > FARM.w, `Plots überlappen: Abstand ${d.toFixed(1)}`)
    }
    seen.push(pos)
  }
  assert.ok(PLOT_CAPACITY >= 90, `Kapazität zu klein: ${PLOT_CAPACITY}`)
})

test('plotPosition: Farmen liegen außerhalb des Platzes, innerhalb der Welt', () => {
  for (let p = 1; p <= PLOT_CAPACITY + 10; p++) {
    const pos = plotPosition(p)
    const d = Math.hypot(pos.x, pos.z)
    assert.ok(d > WORLD.plazaRadius + FARM.d, `Plot ${p} zu nah am Platz`)
    assert.ok(d < WORLD.radius - FARM.d / 2, `Plot ${p} außerhalb der Welt`)
  }
})

test('plotPosition füllt Ringe der Reihe nach und wrappt jenseits der Kapazität', () => {
  assert.equal(plotPosition(1).ring, 0)
  assert.ok(plotPosition(PLOT_CAPACITY).ring === 3)
  const wrapped = plotPosition(PLOT_CAPACITY + 1)
  assert.equal(wrapped.ring, 0)
  const first = plotPosition(1)
  const d = Math.hypot(wrapped.x - first.x, wrapped.z - first.z)
  assert.ok(d > 1, 'Wrap bekommt einen Winkel-Versatz')
})

test('clampToWorld hält Positionen im Weltkreis', () => {
  const inside = clampToWorld(10, -20)
  assert.deepEqual(inside, { x: 10, z: -20 })
  const out = clampToWorld(300, 400)
  assert.ok(Math.hypot(out.x, out.z) <= WORLD.radius + 1e-9)
  assert.ok(Math.abs(out.x / out.z - 300 / 400) < 1e-9, 'Richtung bleibt erhalten')
})

test('resolveCollision drückt aus Collidern heraus', () => {
  for (const c of COLLIDERS) {
    const res = resolveCollision(c.x + 0.1, c.z, 0.7)
    const d = Math.hypot(res.x - c.x, res.z - c.z)
    assert.ok(d >= c.r + 0.7 - 1e-6, `zu nah am Collider (${d.toFixed(2)})`)
  }
  const free = resolveCollision(30, 30, 0.7)
  assert.deepEqual(free, { x: 30, z: 30 })
})

test('resolveCollision überlebt Position exakt im Collider-Zentrum', () => {
  const c = COLLIDERS[0]
  const res = resolveCollision(c.x, c.z, 0.7)
  assert.ok(Number.isFinite(res.x) && Number.isFinite(res.z))
  assert.ok(Math.hypot(res.x - c.x, res.z - c.z) >= c.r + 0.7 - 1e-6)
})

test('nearestZone erkennt Shop, Tor, Brunnen und Farmen', () => {
  assert.equal(nearestZone(POI.shop.door.x, POI.shop.door.z).kind, 'shop')
  assert.equal(nearestZone(POI.gate.door.x, POI.gate.door.z).kind, 'gate')
  assert.equal(nearestZone(0, POI.fountain.r + 1).kind, 'fountain')
  assert.equal(nearestZone(50, 50), null)
  const farms = [{ plot: 3, user_id: 'u1', username: 'abc' }]
  const pos = plotPosition(3)
  const zone = nearestZone(pos.x, pos.z, farms, 'u1')
  assert.equal(zone.kind, 'farm')
  assert.equal(zone.username, 'abc')
  assert.equal(zone.own, true)
  const foreign = nearestZone(pos.x, pos.z, farms, 'u2')
  assert.equal(foreign.own, false)
})

test('Katalog-Visuals fallen bei kaputten Metadaten sauber zurück', () => {
  assert.deepEqual(outfitVisual(null), { body: '#4da3ff', hat: 'none' })
  assert.equal(outfitVisual({ body: 'javascript:alert(1)' }).body, '#4da3ff')
  assert.equal(outfitVisual({ body: '#8b5cf6', hat: 'wizard' }).hat, 'wizard')
  assert.equal(carVisual({}).speed, 2)
  assert.equal(carVisual({ speed: 99 }).speed, 3)
  assert.equal(carVisual({ speed: 0.1 }).speed, 1.2)
  assert.deepEqual(farmVisual(undefined).deco, ['🌸', '🌼'])
  assert.equal(farmVisual({ ground: '#3b3b5c', deco: [] }).ground, '#3b3b5c')
  assert.equal(farmVisual({ deco: ['a', 'b', 'c', 'd', 'e', 'f'] }).deco.length, 4)
})

test('advanceRemote nähert sich dem Broadcast-Ziel', () => {
  const r = { x: 0, z: 0, tx: 4, tz: 0, vx: 0, vz: 0 }
  for (let i = 0; i < 120; i++) advanceRemote(r, 1 / 60)
  assert.ok(Math.abs(r.x - 4) < 0.1, `x=${r.x}`)
  const moving = { x: 0, z: 0, tx: 0, tz: 0, vx: 2, vz: 0 }
  advanceRemote(moving, 0.5)
  assert.ok(moving.tx > 0.9, 'Ziel wird per Velocity extrapoliert')
  const still = { x: 1, z: 1, tx: 1, tz: 1, vx: 0, vz: 0 }
  assert.equal(advanceRemote(still, 1 / 60), true)
})
