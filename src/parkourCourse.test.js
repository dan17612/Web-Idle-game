import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_LEVEL,
  LANES,
  PHYSICS,
  levelConfig,
  buildCourse,
  jumpRows,
  maxJumpHeight,
  laneToX,
  nearestLane,
  starsForFalls
} from './parkourCourse.js'

const isVoidRow = (row) => row.lanes.every((c) => c === null)
const solidLanes = (row) => row.lanes.map((c, i) => (c ? i : -1)).filter((i) => i >= 0)

test('levelConfig clamps level into 1..MAX_LEVEL', () => {
  assert.equal(levelConfig(0).level, 1)
  assert.equal(levelConfig(-5).level, 1)
  assert.equal(levelConfig(99).level, MAX_LEVEL)
  assert.equal(levelConfig('abc').level, 1)
  assert.equal(levelConfig(7).level, 7)
})

test('difficulty scales with level: faster, longer, movers only later', () => {
  const lo = levelConfig(1)
  const hi = levelConfig(MAX_LEVEL)
  assert.ok(hi.speed > lo.speed)
  assert.ok(hi.rows > lo.rows)
  assert.equal(levelConfig(1).moverWeight, 0)
  assert.equal(levelConfig(6).moverWeight, 0)
  assert.ok(levelConfig(7).moverWeight > 0)
})

test('lane helpers map to centered world positions and back', () => {
  assert.equal(laneToX(1), 0)
  assert.equal(laneToX(0), -PHYSICS.laneWidth)
  assert.equal(laneToX(2), PHYSICS.laneWidth)
  assert.equal(nearestLane(laneToX(0)), 0)
  assert.equal(nearestLane(laneToX(2)), 2)
  assert.equal(nearestLane(-99), 0)
  assert.equal(nearestLane(99), 2)
})

test('buildCourse is deterministic for a given level', () => {
  for (const lvl of [1, 5, 12]) {
    assert.deepEqual(buildCourse(lvl), buildCourse(lvl))
  }
})

test('every gap run is short enough to jump at the level speed', () => {
  for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
    const course = buildCourse(lvl)
    const safeRows = jumpRows(course.speed)
    let run = 0
    for (const row of course.rows) {
      if (isVoidRow(row)) {
        run += 1
        assert.ok(run <= course.maxGap, `lvl ${lvl}: void run ${run} > maxGap ${course.maxGap}`)
        assert.ok(run < safeRows, `lvl ${lvl}: void run ${run} not jumpable (safe ${safeRows})`)
      } else {
        run = 0
      }
    }
  }
})

test('barriers are always jumpable in height', () => {
  const clear = maxJumpHeight()
  for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
    for (const row of buildCourse(lvl).rows) {
      for (const cell of row.lanes) {
        if (cell?.obstacle) assert.ok(cell.obstacle.h < clear)
      }
      if (row.mover) assert.ok(row.mover.h < clear)
    }
  }
})

test('no dead ends: every barrier row keeps a free solid lane, movers stay reachable', () => {
  for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
    for (const row of buildCourse(lvl).rows) {
      if (isVoidRow(row)) continue
      const free = row.lanes.some((c) => c && !c.obstacle)
      assert.ok(free, `lvl ${lvl}: row has no obstacle-free solid lane`)
      // Mover-Reihen sind komplett solide, damit Landen sicher ist.
      if (row.mover) {
        assert.ok(row.lanes.every((c) => c))
        assert.ok(row.mover.to - row.mover.from === 1, 'mover sweeps two adjacent lanes')
        assert.ok(row.mover.from >= 0 && row.mover.to <= LANES - 1)
      }
    }
  }
})

test('adjacent solid rows always share a lane (lane path never breaks)', () => {
  for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
    const rows = buildCourse(lvl).rows
    for (let i = 1; i < rows.length; i++) {
      if (isVoidRow(rows[i]) || isVoidRow(rows[i - 1])) continue
      const a = new Set(solidLanes(rows[i - 1]))
      const shared = solidLanes(rows[i]).some((l) => a.has(l))
      assert.ok(shared, `lvl ${lvl}: rows ${i - 1}->${i} share no solid lane`)
    }
  }
})

test('checkpoints and finish are on safe all-solid rows', () => {
  for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
    const course = buildCourse(lvl)
    assert.ok(course.checkpoints.length >= 1)
    const sorted = [...course.checkpoints].every((v, i, a) => i === 0 || a[i - 1] < v)
    assert.ok(sorted, 'checkpoints sorted + unique')
    for (const ci of course.checkpoints) {
      assert.ok(course.rows[ci].lanes.every((c) => c && !c.obstacle), 'checkpoint fully solid')
    }
    assert.equal(course.finishRow, course.rows.length - 1)
    assert.ok(course.rows[course.finishRow].finish)
    assert.ok(course.rows[course.finishRow].lanes.every((c) => c))
  }
})

test('every checkpoint has a solid run-up so respawns never drop into a hazard', () => {
  for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
    const course = buildCourse(lvl)
    for (const ci of course.checkpoints) {
      for (let k = 1; k <= 2 && ci + k <= course.finishRow; k++) {
        const row = course.rows[ci + k]
        assert.ok(
          row.lanes.every((c) => c && !c.obstacle) && !row.mover,
          `lvl ${lvl}: row ${ci + k} after checkpoint ${ci} is not safe run-up`
        )
      }
    }
  }
})

test('start runway is solid so the player never spawns over a void', () => {
  for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
    const rows = buildCourse(lvl).rows
    for (let i = 0; i < 5; i++) assert.ok(rows[i].lanes.every((c) => c))
  }
})

test('starsForFalls mirrors the drift star thresholds', () => {
  assert.equal(starsForFalls(0), 3)
  assert.equal(starsForFalls(1), 2)
  assert.equal(starsForFalls(2), 2)
  assert.equal(starsForFalls(3), 1)
  assert.equal(starsForFalls(99), 1)
  assert.equal(starsForFalls(-4), 3)
})
