// BlockFall — reine Spiellogik (kein DOM, kein Canvas).
//
// Spielfeld 10 × 20 plus zwei unsichtbare Spawn-Reihen oben. Die Drehung folgt
// SRS inklusive Wandsprüngen, damit sich das Spiel so anfühlt, wie Spieler es
// von fallenden Blöcken gewohnt sind. Gezeichnet wird in BlockFallView.vue.
//
// Achtung Reward-Spiegel: blockfallReward() lebt doppelt, hier und als
// public._blockfall_reward in supabase/migrations/20260924_blockfall.sql.
// src/blockfallSql.test.js vergleicht beide Level für Level.

export const COLS = 10
export const VISIBLE_ROWS = 20
export const HIDDEN_ROWS = 2
export const ROWS = VISIBLE_ROWS + HIDDEN_ROWS
export const MAX_LEVEL = 30
export const LEVELS_PER_CHAPTER = 6
export const LOCK_DELAY_MS = 500
export const MAX_LOCK_RESETS = 15
export const GARBAGE = 8 // Zellwert für Müll-Reihen (Steine sind 1–7)

export const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

// Grundform (Rotation 0) als Zellen [x, y] in der Box der Kantenlänge `size`.
const SHAPES = {
  I: { size: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { size: 4, cells: [[1, 0], [2, 0], [1, 1], [2, 1]] },
  T: { size: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  S: { size: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { size: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { size: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { size: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] }
}

// Alle vier Rotationen vorberechnet: Drehung im Uhrzeigersinn um die Box.
// Das O dreht nicht — SRS lässt es an Ort und Stelle.
export const ROTATIONS = Object.fromEntries(PIECE_TYPES.map((type) => {
  const { size, cells } = SHAPES[type]
  const states = [cells]
  for (let r = 1; r < 4; r++) {
    const prev = states[r - 1]
    states.push(type === 'O' ? prev : prev.map(([x, y]) => [size - 1 - y, x]))
  }
  return [type, states]
}))

// SRS-Wandsprünge. Angegeben wie im Standard mit y nach oben; beim Anwenden
// wird y negiert, weil unser Feld nach unten zählt.
const KICKS_JLSTZ = {
  '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
}
const KICKS_I = {
  '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
}

export function kicksFor(type, from, to) {
  if (type === 'O') return [[0, 0]]
  const table = type === 'I' ? KICKS_I : KICKS_JLSTZ
  return table[`${from}>${to}`] || [[0, 0]]
}

// Punkte nur für Reihen — Fallpunkte würden die Sterne vom Tempo abhängig machen.
export const LINE_POINTS = [0, 100, 300, 500, 800]
export const COMBO_BONUS = 50

export const CHAPTERS = [
  { id: 'meadow', icon: '🌿' },
  { id: 'desert', icon: '🏜️' },
  { id: 'ice', icon: '❄️' },
  { id: 'volcano', icon: '🌋' },
  { id: 'stars', icon: '🌌' }
]

function clampLevel(level) {
  const n = Math.floor(Number(level) || 1)
  return Math.max(1, Math.min(MAX_LEVEL, n))
}

export function chapterOf(level) {
  return Math.floor((clampLevel(level) - 1) / LEVELS_PER_CHAPTER)
}

export function levelConfig(level) {
  const L = clampLevel(level)
  const goalLines = 4 + L
  return {
    level: L,
    chapter: chapterOf(L),
    goalLines,
    gravityMs: Math.max(100, Math.round(850 * Math.pow(0.93, L - 1))),
    garbageRows: L < 4 ? 0 : Math.min(9, Math.floor((L - 1) / 3)),
    star2: goalLines * 130,
    star3: goalLines * 165,
    seed: L * 7919
  }
}

export function starsForScore(score, cfg) {
  const s = Number(score) || 0
  if (s >= cfg.star3) return 3
  if (s >= cfg.star2) return 2
  return 1
}

// Spiegelt public._blockfall_reward.
export const REWARD_TICKETS = { 5: 1, 10: 2, 15: 2, 20: 3, 25: 3, 30: 5 }
export function blockfallReward(level) {
  const L = clampLevel(level)
  return { coins: 800 * L * L, tickets: REWARD_TICKETS[L] || 0 }
}

// Kleiner deterministischer Zufall (mulberry32) — Tests und Müll-Reihen
// brauchen reproduzierbare Folgen.
export function createRng(seed) {
  let a = (Number(seed) >>> 0) || 1
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function emptyBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0))
}

// Müll-Reihen am Boden, jede mit genau einer Lücke. Aufeinanderfolgende
// Lücken liegen nie in derselben Spalte, sonst entstünde ein Schacht, der
// sich mit einem einzigen I-Stein komplett abräumen lässt.
export function garbageRows(count, rng) {
  const rows = []
  let lastHole = -1
  for (let i = 0; i < count; i++) {
    let hole = Math.floor(rng() * COLS)
    if (hole === lastHole) hole = (hole + 1 + Math.floor(rng() * (COLS - 1))) % COLS
    lastHole = hole
    const row = new Array(COLS).fill(GARBAGE)
    row[hole] = 0
    rows.push(row)
  }
  return rows
}

export class BlockFallGame {
  constructor(level, rng = Math.random) {
    this.cfg = levelConfig(level)
    this.rng = rng
    this.board = emptyBoard()
    const garbage = garbageRows(this.cfg.garbageRows, createRng(this.cfg.seed))
    for (let i = 0; i < garbage.length; i++) {
      this.board[ROWS - garbage.length + i] = garbage[i]
    }
    this.bag = []
    this.queue = []
    this.hold = null
    this.holdUsed = false
    this.active = null
    this.lines = 0
    this.score = 0
    this.combo = -1
    this.pieces = 0
    this.over = false
    this.won = false
    this.fallAcc = 0
    this.lockAcc = 0
    this.lockResets = 0
    this.events = []
    this._fillQueue()
    this._spawn(this.queue.shift())
  }

  get stars() {
    return starsForScore(this.score, this.cfg)
  }

  get finished() {
    return this.over || this.won
  }

  _nextFromBag() {
    if (!this.bag.length) {
      const bag = PIECE_TYPES.slice()
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1))
        ;[bag[i], bag[j]] = [bag[j], bag[i]]
      }
      this.bag = bag
    }
    return this.bag.shift()
  }

  _fillQueue() {
    while (this.queue.length < 6) this.queue.push(this._nextFromBag())
  }

  cellsOf(piece = this.active) {
    if (!piece) return []
    return ROTATIONS[piece.type][piece.rot].map(([x, y]) => [piece.x + x, piece.y + y])
  }

  fits(piece) {
    for (const [x, y] of this.cellsOf(piece)) {
      if (x < 0 || x >= COLS || y >= ROWS) return false
      if (y >= 0 && this.board[y][x]) return false
    }
    return true
  }

  _spawn(type) {
    const piece = { type, rot: 0, x: 3, y: HIDDEN_ROWS - 1 }
    this._fillQueue()
    this.active = piece
    this.fallAcc = 0
    this.lockAcc = 0
    this.lockResets = 0
    if (!this.fits(piece)) {
      this.over = true
      this.events.push({ type: 'gameover' })
    }
  }

  grounded() {
    if (!this.active) return false
    return !this.fits({ ...this.active, y: this.active.y + 1 })
  }

  // Erfolgreiche Bewegung am Boden verlängert die Lock-Zeit — begrenzt, damit
  // niemand einen Stein endlos am Boden drehen kann.
  _afterShift() {
    if (this.grounded() && this.lockResets < MAX_LOCK_RESETS) {
      this.lockAcc = 0
      this.lockResets++
    }
  }

  move(dx) {
    if (this.finished || !this.active) return false
    const next = { ...this.active, x: this.active.x + dx }
    if (!this.fits(next)) return false
    this.active = next
    this._afterShift()
    return true
  }

  rotate(dir = 1) {
    if (this.finished || !this.active) return false
    const from = this.active.rot
    const to = (from + (dir > 0 ? 1 : 3)) % 4
    for (const [kx, ky] of kicksFor(this.active.type, from, to)) {
      const next = { ...this.active, rot: to, x: this.active.x + kx, y: this.active.y - ky }
      if (this.fits(next)) {
        this.active = next
        this._afterShift()
        return true
      }
    }
    return false
  }

  softDrop() {
    if (this.finished || !this.active) return false
    const next = { ...this.active, y: this.active.y + 1 }
    if (!this.fits(next)) return false
    this.active = next
    this.fallAcc = 0
    return true
  }

  ghostY() {
    if (!this.active) return 0
    let y = this.active.y
    while (this.fits({ ...this.active, y: y + 1 })) y++
    return y
  }

  hardDrop() {
    if (this.finished || !this.active) return 0
    const target = this.ghostY()
    const dist = target - this.active.y
    this.active = { ...this.active, y: target }
    this._lock()
    return dist
  }

  holdPiece() {
    if (this.finished || !this.active || this.holdUsed) return false
    const current = this.active.type
    if (this.hold) {
      const swap = this.hold
      this.hold = current
      this._spawn(swap)
    } else {
      this.hold = current
      this._spawn(this.queue.shift())
    }
    this.holdUsed = true
    return true
  }

  _lock() {
    const cells = this.cellsOf()
    const color = PIECE_TYPES.indexOf(this.active.type) + 1
    let allHidden = true
    for (const [x, y] of cells) {
      if (y >= 0) this.board[y][x] = color
      if (y >= HIDDEN_ROWS) allHidden = false
    }
    this.pieces++
    this.active = null
    this.holdUsed = false

    const full = []
    for (let y = 0; y < ROWS; y++) {
      if (this.board[y].every((c) => c !== 0)) full.push(y)
    }
    if (full.length) {
      this.board = this.board.filter((_, y) => !full.includes(y))
      while (this.board.length < ROWS) this.board.unshift(new Array(COLS).fill(0))
      this.combo++
      const gained = LINE_POINTS[Math.min(4, full.length)] + COMBO_BONUS * this.combo
      this.lines += full.length
      this.score += gained
      this.events.push({ type: 'clear', rows: full, count: full.length, combo: this.combo, points: gained })
    } else {
      this.combo = -1
      this.events.push({ type: 'lock' })
    }

    if (this.lines >= this.cfg.goalLines) {
      this.won = true
      this.events.push({ type: 'win' })
      return
    }
    if (allHidden) {
      this.over = true
      this.events.push({ type: 'gameover' })
      return
    }
    this._spawn(this.queue.shift())
  }

  // Schwerkraft + Lock-Delay. `soft` = Spieler hält „runter".
  update(dtMs, soft = false) {
    if (this.finished || !this.active) return
    const dt = Math.max(0, Math.min(250, Number(dtMs) || 0))
    const interval = soft ? Math.min(this.cfg.gravityMs, 40) : this.cfg.gravityMs
    this.fallAcc += dt
    while (this.fallAcc >= interval) {
      this.fallAcc -= interval
      const next = { ...this.active, y: this.active.y + 1 }
      if (!this.fits(next)) { this.fallAcc = 0; break }
      this.active = next
      this.lockAcc = 0
    }
    if (this.grounded()) {
      this.lockAcc += dt
      if (this.lockAcc >= LOCK_DELAY_MS) this._lock()
    } else {
      this.lockAcc = 0
    }
  }

  drainEvents() {
    const out = this.events
    this.events = []
    return out
  }
}
