import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_LEVEL,
  levelConfig,
  mulberry32,
  buildTrack,
  nearestIndex,
  starsForCrashes
} from './driftTrack.js'

test('levelConfig clamps level into 1..MAX_LEVEL', () => {
  assert.equal(levelConfig(0).level, 1)
  assert.equal(levelConfig(-5).level, 1)
  assert.equal(levelConfig(99).level, MAX_LEVEL)
  assert.equal(levelConfig('abc').level, 1)
  assert.equal(levelConfig(7).level, 7)
})

test('difficulty scales with level: narrower road, faster car, more curves', () => {
  const lo = levelConfig(1)
  const hi = levelConfig(MAX_LEVEL)
  assert.ok(hi.roadWidth < lo.roadWidth)
  assert.ok(hi.speed > lo.speed)
  assert.ok(hi.curves > lo.curves)
  assert.ok(hi.maxAngle >= hi.minAngle)
})

test('mulberry32 is deterministic and in [0,1)', () => {
  const a = mulberry32(42)
  const b = mulberry32(42)
  for (let i = 0; i < 50; i++) {
    const va = a()
    assert.equal(va, b())
    assert.ok(va >= 0 && va < 1)
  }
})

test('buildTrack is deterministic per level', () => {
  for (const lvl of [1, 5, MAX_LEVEL]) {
    const t1 = buildTrack(lvl)
    const t2 = buildTrack(lvl)
    assert.deepEqual(t1.points, t2.points)
    assert.equal(t1.roadWidth, t2.roadWidth)
  }
})

test('buildTrack produces a long, finite polyline for every level', () => {
  for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
    const track = buildTrack(lvl)
    assert.ok(track.points.length > 100, `level ${lvl} too short`)
    for (const p of track.points) {
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y))
    }
    const first = track.points[0]
    const last = track.points[track.points.length - 1]
    const dist = Math.hypot(last.x - first.x, last.y - first.y)
    assert.ok(dist > 300, `level ${lvl} start and finish too close`)
  }
})

test('consecutive track points keep a stable step distance', () => {
  const track = buildTrack(3)
  for (let i = 1; i < track.points.length; i++) {
    const d = Math.hypot(
      track.points[i].x - track.points[i - 1].x,
      track.points[i].y - track.points[i - 1].y
    )
    assert.ok(d <= track.step + 0.001, `gap too large at ${i}`)
  }
})

test('nearestIndex finds the exact point and respects the window', () => {
  const track = buildTrack(2)
  const k = 50
  const hit = nearestIndex(track.points, track.points[k], 45)
  assert.equal(hit.index, k)
  assert.ok(hit.dist < 0.001)

  const far = nearestIndex(track.points, track.points[200], 10, 20)
  assert.ok(far.index <= 30, 'must not jump outside the search window')
})

test('starsForCrashes maps crash count to 3/2/1 stars', () => {
  assert.equal(starsForCrashes(0), 3)
  assert.equal(starsForCrashes(1), 2)
  assert.equal(starsForCrashes(2), 2)
  assert.equal(starsForCrashes(3), 1)
  assert.equal(starsForCrashes(99), 1)
  assert.equal(starsForCrashes(-1), 3)
})
