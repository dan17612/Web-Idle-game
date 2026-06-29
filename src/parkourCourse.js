// Zoo-Parkour: deterministischer Strecken-Generator + Geometrie/Physik-Konstanten.
// Jedes Level hat eine feste Strecke (Seed = Level), damit Sprünge lernbar sind.
//
// Datenmodell: Eine Strecke ist eine Liste von Reihen entlang der Z-Achse.
// Jede Reihe hat 3 Spuren; eine Zelle ist entweder solide (mit optionalem
// Hindernis) oder null (Lücke/Abgrund). Engine und Generator teilen sich die
// PHYSICS-Konstanten, damit Lücken garantiert übersprungen werden können.

export const MAX_LEVEL = 12
export const LANES = 3

// Welt-Einheiten. tile = Z-Abstand pro Reihe, laneWidth = X-Abstand der Spuren.
export const PHYSICS = {
  tile: 4,
  laneWidth: 3,
  gravity: 55,
  jumpV: 18,
  barrierHeight: 1.6
}

export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function laneToX(lane) {
  return (lane - 1) * PHYSICS.laneWidth
}

export function nearestLane(x) {
  return Math.max(0, Math.min(LANES - 1, Math.round(x / PHYSICS.laneWidth) + 1))
}

// Wie viele Reihen kann man bei diesem Tempo in der Sprungzeit überfliegen.
export function jumpRows(speed, physics = PHYSICS) {
  const airTime = (2 * physics.jumpV) / physics.gravity
  return Math.floor((speed * airTime) / physics.tile)
}

export function maxJumpHeight(physics = PHYSICS) {
  return (physics.jumpV * physics.jumpV) / (2 * physics.gravity)
}

export function levelConfig(level) {
  const lvl = Math.max(1, Math.min(MAX_LEVEL, Math.floor(Number(level) || 1)))
  const speed = 13 + lvl * 1.15
  // Lücke nie größer als sicher überspringbar (mind. 1 Reihe Reserve).
  const desiredGap = 1 + Math.floor((lvl - 1) / 4)
  const maxGap = Math.max(1, Math.min(desiredGap, jumpRows(speed) - 1))
  return {
    level: lvl,
    speed,
    rows: 50 + lvl * 12,
    maxGap,
    gapWeight: 3,
    barrierWeight: 2 + lvl * 0.2,
    pillarWeight: 1 + lvl * 0.3,
    moverWeight: lvl >= 7 ? (lvl - 6) * 0.6 : 0,
    moverSpeed: 1.4 + lvl * 0.12,
    checkpointEvery: 3
  }
}

function solidCell() {
  return { obstacle: null }
}

function solidRow() {
  return { lanes: [solidCell(), solidCell(), solidCell()], checkpoint: false, finish: false, mover: null }
}

function voidRow() {
  return { lanes: [null, null, null], checkpoint: false, finish: false, mover: null }
}

// Reihe aus einer Menge solider Spuren (übrige Spuren sind Lücken).
function pillarRow(solidSet) {
  const lanes = [null, null, null]
  for (const l of solidSet) lanes[l] = solidCell()
  return { lanes, checkpoint: false, finish: false, mover: null }
}

export function buildCourse(level) {
  const cfg = levelConfig(level)
  const rnd = mulberry32(cfg.level * 7919 + 17)
  const rows = []
  const checkpoints = []

  const pushRow = (row) => rows.push(row)
  const pushSolid = (n) => { for (let i = 0; i < n; i++) pushRow(solidRow()) }
  const markCheckpoint = () => {
    const i = rows.length - 1
    rows[i] = solidRow()
    rows[i].checkpoint = true
    checkpoints.push(i)
  }

  // Solider Anlauf nach jedem Checkpoint, damit man nach einem Respawn nie
  // direkt in eine Lücke/Barriere fällt (sonst Endlos-Sturz am Checkpoint).
  const RUNUP = 3
  const checkpointWithRunup = () => { markCheckpoint(); pushSolid(RUNUP) }

  // Start-Anlauf: solide Reihen, erster Checkpoint + Anlauf.
  pushSolid(6)
  checkpointWithRunup()

  // ── Hindernis-Segmente ────────────────────────────────────────────────
  function segGap() {
    const g = 1 + Math.floor(rnd() * cfg.maxGap)
    for (let i = 0; i < g; i++) pushRow(voidRow())
  }

  function segBarrier() {
    const row = solidRow()
    // 1-2 Spuren mit Barriere, mindestens eine Spur frei.
    const blocked = rnd() < 0.45 ? 2 : 1
    const lanesOrder = [0, 1, 2].sort(() => rnd() - 0.5)
    for (let i = 0; i < blocked; i++) {
      row.lanes[lanesOrder[i]].obstacle = { h: PHYSICS.barrierHeight }
    }
    pushRow(row)
  }

  function segPillar() {
    const len = 2 + Math.floor(rnd() * 3)
    let prev = [0, 1, 2]
    for (let i = 0; i < len; i++) {
      const anchor = prev[Math.floor(rnd() * prev.length)]
      const set = new Set([anchor])
      if (rnd() < 0.5) {
        const extra = Math.floor(rnd() * LANES)
        set.add(extra)
      }
      const arr = [...set]
      pushRow(pillarRow(arr))
      prev = arr
    }
  }

  function segMover() {
    const row = solidRow()
    const from = rnd() < 0.5 ? 0 : 1
    row.mover = {
      from,
      to: from + 1,
      speed: cfg.moverSpeed,
      phase: rnd() * Math.PI * 2,
      h: PHYSICS.barrierHeight
    }
    pushRow(row)
  }

  const pick = () => {
    const opts = [
      ['gap', cfg.gapWeight],
      ['barrier', cfg.barrierWeight],
      ['pillar', cfg.pillarWeight],
      ['mover', cfg.moverWeight]
    ].filter(([, w]) => w > 0)
    const total = opts.reduce((s, [, w]) => s + w, 0)
    let r = rnd() * total
    for (const [name, w] of opts) {
      r -= w
      if (r <= 0) return name
    }
    return opts[0][0]
  }

  let sinceCp = 0
  while (rows.length < cfg.rows - 10) {
    const seg = pick()
    if (seg === 'gap') segGap()
    else if (seg === 'barrier') segBarrier()
    else if (seg === 'pillar') segPillar()
    else segMover()
    pushSolid(2 + Math.floor(rnd() * 2)) // Ruhe-/Landereihen
    sinceCp += 1
    if (sinceCp >= cfg.checkpointEvery) {
      checkpointWithRunup()
      sinceCp = 0
    }
  }

  // Ziel-Anlauf.
  pushSolid(6)
  checkpointWithRunup()
  rows[rows.length - 1].finish = true

  const finishRow = rows.length - 1
  return {
    ...cfg,
    lanes: LANES,
    tile: PHYSICS.tile,
    laneWidth: PHYSICS.laneWidth,
    rows,
    rowCount: rows.length,
    length: rows.length * PHYSICS.tile,
    checkpoints,
    finishRow,
    startRow: 0
  }
}

export function starsForFalls(falls) {
  const n = Math.max(0, Math.floor(Number(falls) || 0))
  if (n === 0) return 3
  if (n <= 2) return 2
  return 1
}
