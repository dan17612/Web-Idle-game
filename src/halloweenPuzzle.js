// Kürbis-Puzzle — reine Spiellogik (kein DOM, kein Canvas).
//
// Ein Legepuzzle: Das Bild wird in Spalten × Reihen Teile zerschnitten, jede
// innere Kante bekommt eine Nase oder Bucht. Gezeichnet wird in
// src/halloweenScene.js, die Oberfläche lebt in HalloweenPuzzleView.vue.
//
// Achtung Reward-Spiegel: GRIDS, starsForTime() und puzzleReward() leben
// doppelt, hier und als _hpuzzle_pieces/_hpuzzle_stars/_hpuzzle_reward in
// supabase/migrations/20261008_halloween_puzzle.sql.
// src/halloweenPuzzleSql.test.js vergleicht beide Seiten Level für Level.
//
// Spec: docs/superpowers/specs/2026-10-08-halloween-update-design.md

export const MAX_LEVEL = 25
export const LEVELS_PER_CHAPTER = 6

// Hilfen je Kapitel: Geisterbild (Deckkraft) und Umrisse auf dem Brett,
// gedrehte Teile, Sekunden pro Teil für drei Sterne, Anzahl Level.
// Das Finale (Level 25) ist ein eigenes Kapitel mit einem Level und den
// strengsten drei Sternen. Der SQL-Spiegel rechnet das Kapitel als
// (Level − 1) / 6 — passt, solange nur das letzte Kapitel kürzer ist.
export const CHAPTERS = [
  { id: 'patch', icon: '🎃', ghost: 0.35, outlines: true, rotate: false, secPerPiece: 3, levels: 6 },
  { id: 'castle', icon: '🏰', ghost: 0.15, outlines: true, rotate: false, secPerPiece: 4, levels: 6 },
  { id: 'woods', icon: '🌲', ghost: 0, outlines: false, rotate: false, secPerPiece: 5, levels: 6 },
  { id: 'treats', icon: '🍬', ghost: 0, outlines: false, rotate: true, secPerPiece: 7, levels: 6 },
  { id: 'finale', icon: '🌕', ghost: 0, outlines: false, rotate: true, secPerPiece: 4, levels: 1, finale: true }
]

// Erstes Level je Kapitel: 1, 7, 13, 19, 25.
export const CHAPTER_STARTS = CHAPTERS.map((_, i) =>
  1 + CHAPTERS.slice(0, i).reduce((sum, ch) => sum + ch.levels, 0))

// [Spalten, Reihen] pro Level. Hochformat, damit das Brett aufs Handy passt.
export const GRIDS = [
  [3, 3], [3, 4], [4, 4], [4, 5], [4, 5], [5, 5],
  [4, 5], [5, 5], [5, 6], [5, 6], [6, 6], [6, 6],
  [5, 6], [5, 6], [6, 6], [6, 7], [6, 7], [6, 8],
  [5, 6], [6, 6], [6, 7], [6, 7], [7, 7], [7, 8],
  [8, 8]
]

// Wie nah (in Zellen) die Mitte eines Teils an seinem Platz liegen muss.
export const SNAP_DISTANCE = 0.45
// Wie weit Nasen über die Zelle hinausragen; Teil-Bilder brauchen diesen Rand.
export const TAB_HEIGHT = 0.25
export const PIECE_PAD = 0.3

function clampLevel(level) {
  const n = Math.floor(Number(level) || 1)
  return Math.max(1, Math.min(MAX_LEVEL, n))
}

export function chapterOf(level) {
  const L = clampLevel(level)
  let chapter = 0
  for (let i = 0; i < CHAPTER_STARTS.length; i++) if (L >= CHAPTER_STARTS[i]) chapter = i
  return chapter
}

export function isFinale(level) {
  return !!CHAPTERS[chapterOf(level)].finale
}

export function levelConfig(level) {
  const L = clampLevel(level)
  const chapter = chapterOf(L)
  const ch = CHAPTERS[chapter]
  const [cols, rows] = GRIDS[L - 1]
  const pieces = cols * rows
  const star3 = pieces * ch.secPerPiece
  return {
    level: L,
    chapter,
    cols,
    rows,
    pieces,
    ghost: ch.ghost,
    outlines: ch.outlines,
    rotate: ch.rotate,
    star3,
    star2: star3 * 2,
    seed: L * 7907 + 13
  }
}

// Spiegelt public._hpuzzle_stars: fertig = 1, schnell = 2, sehr schnell = 3.
export function starsForTime(level, seconds) {
  const cfg = levelConfig(level)
  const s = Math.max(0, Math.floor(Number(seconds) || 0))
  if (s <= cfg.star3) return 3
  if (s <= cfg.star2) return 2
  return 1
}

// Spiegelt public._hpuzzle_reward.
export const REWARD_TICKETS = { 6: 2, 12: 3, 18: 4, 24: 6, 25: 8 }
export const REWARD_PETS = {
  12: { species: 'bat', tier: 'normal' },
  24: { species: 'bat', tier: 'gold' }
}

export function puzzleReward(level) {
  const L = clampLevel(level)
  return {
    coins: 1000 * L * L,
    tickets: REWARD_TICKETS[L] || 0,
    pet: REWARD_PETS[L] || null
  }
}

export function replayCoins(level) {
  return Math.max(100, Math.floor(puzzleReward(level).coins / 20))
}

// Spiegelt public._hpuzzle_rainbow_goal(): Wer jedes Level mit drei Sternen
// schafft — also auch das Finale —, bekommt einmalig die Regenbogen-Fledermaus.
export const RAINBOW_STAR_GOAL = MAX_LEVEL * 3
export const RAINBOW_PET = { species: 'bat', tier: 'rainbow' }

// Summe der besten Sterne je Level (wie public._stars_total, aber nur echte Level).
export function totalStars(starsMap) {
  const map = starsMap && typeof starsMap === 'object' ? starsMap : {}
  let sum = 0
  for (let l = 1; l <= MAX_LEVEL; l++) {
    sum += Math.max(0, Math.min(3, Math.floor(Number(map[String(l)]) || 0)))
  }
  return sum
}

// Kleiner deterministischer Zufall (mulberry32): gleiches Level = gleiches
// Bild, gleiche Kanten, gleiche Ablage.
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

// ── Kanten ─────────────────────────────────────────────────────────────────
// h[r][c]: Kante zwischen Reihe r und r+1 in Spalte c.
// v[r][c]: Kante zwischen Spalte c und c+1 in Reihe r.
// +1 = das obere/linke Teil hat dort eine Nase, das andere die passende Bucht.
export function buildEdges(cols, rows, rng) {
  const pick = () => (rng() < 0.5 ? 1 : -1)
  const h = Array.from({ length: Math.max(0, rows - 1) }, () => Array.from({ length: cols }, pick))
  const v = Array.from({ length: rows }, () => Array.from({ length: Math.max(0, cols - 1) }, pick))
  return { cols, rows, h, v }
}

// Seiten eines Teils: 1 = Nase nach außen, -1 = Bucht, 0 = gerade (Rand).
export function pieceSides(edges, col, row) {
  const { cols, rows, h, v } = edges
  return {
    top: row > 0 ? -h[row - 1][col] : 0,
    right: col < cols - 1 ? v[row][col] : 0,
    bottom: row < rows - 1 ? h[row][col] : 0,
    left: col > 0 ? -v[row][col - 1] : 0
  }
}

// Nasen-Schablone entlang einer Kante: (u entlang, n nach außen), symmetrisch
// um u = 0,5 — deshalb passt die Bucht des Nachbarn, der dieselbe Kante in
// Gegenrichtung abläuft, exakt.
const TAB = [
  [[0.4, 0], [0.42, 0.06], [0.38, 0.12]],
  [[0.33, 0.21], [0.4, TAB_HEIGHT], [0.5, TAB_HEIGHT]],
  [[0.6, TAB_HEIGHT], [0.67, 0.21], [0.62, 0.12]],
  [[0.58, 0.06], [0.6, 0], [0.65, 0]]
]

// Umriss eines Teils als Zeichenbefehle in Zellkoordinaten (Zelle = 0..size).
// ['M', x, y] · ['L', x, y] · ['C', x1, y1, x2, y2, x, y] · ['Z']
export function piecePath(sides, size = 1) {
  const s = size
  // Je Seite: Startpunkt, Richtung entlang (ux, uy), Normale nach außen (nx, ny).
  const SIDES = [
    ['top', 0, 0, 1, 0, 0, -1],
    ['right', s, 0, 0, 1, 1, 0],
    ['bottom', s, s, -1, 0, 0, 1],
    ['left', 0, s, 0, -1, -1, 0]
  ]
  const cmds = [['M', 0, 0]]
  for (const [key, x0, y0, ux, uy, nx, ny] of SIDES) {
    const dir = sides[key] || 0
    const pt = (u, n) => [x0 + ux * u * s + nx * n * s * dir, y0 + uy * u * s + ny * n * s * dir]
    if (dir) {
      cmds.push(['L', ...pt(0.35, 0)])
      for (const [c1, c2, end] of TAB) cmds.push(['C', ...pt(...c1), ...pt(...c2), ...pt(...end)])
    }
    cmds.push(['L', ...pt(1, 0)])
  }
  cmds.push(['Z'])
  return cmds
}

export function isEdgePiece(piece) {
  const s = piece.sides
  return !s.top || !s.right || !s.bottom || !s.left
}

function shuffle(list, rng) {
  const a = list.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Spielzustand ───────────────────────────────────────────────────────────
export class PuzzleGame {
  constructor(level, rng = createRng(levelConfig(level).seed * 31 + 7)) {
    this.cfg = levelConfig(level)
    const { cols, rows } = this.cfg
    this.edges = buildEdges(cols, rows, createRng(this.cfg.seed))
    this.pieces = []
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const piece = { id: row * cols + col, col, row, rot: 0, placed: false }
        piece.sides = pieceSides(this.edges, col, row)
        piece.edge = isEdgePiece(piece)
        // Kapitel 4: jedes Teil liegt verdreht und muss erst gedreht werden.
        if (this.cfg.rotate) piece.rot = 1 + Math.floor(rng() * 3)
        this.pieces.push(piece)
      }
    }
    this.order = shuffle(this.pieces.map((p) => p.id), rng)
    this.placedCount = 0
    this.drops = 0
    this.misses = 0
    this.elapsedMs = 0
    this.runningSince = null
  }

  get done() {
    return this.placedCount >= this.pieces.length
  }

  piece(id) {
    return this.pieces[id] || null
  }

  // Unplatzierte Teile in Ablage-Reihenfolge, optional nur Randteile.
  tray(edgesOnly = false) {
    const out = []
    for (const id of this.order) {
      const p = this.pieces[id]
      if (p.placed) continue
      if (edgesOnly && !p.edge) continue
      out.push(p)
    }
    return out
  }

  rotate(id) {
    const p = this.piece(id)
    if (!p || p.placed) return false
    p.rot = (p.rot + 1) % 4
    return true
  }

  // Teil mit seiner Mitte bei (x, y) — in Zelleinheiten relativ zum Brett —
  // ablegen. Ergebnis: 'placed', 'rotate' (richtiger Platz, falsch gedreht)
  // oder 'miss'.
  drop(id, x, y) {
    const p = this.piece(id)
    if (!p || p.placed || this.done) return 'miss'
    this.drops++
    const dist = Math.hypot(x - (p.col + 0.5), y - (p.row + 0.5))
    if (dist > SNAP_DISTANCE) {
      this.misses++
      return 'miss'
    }
    if (p.rot !== 0) return 'rotate'
    p.placed = true
    this.placedCount++
    return 'placed'
  }

  // Ab hier: Uhr. Gezählt wird nur aktive Spielzeit.
  start(now) {
    if (this.runningSince == null && !this.done) this.runningSince = now
  }

  stop(now) {
    if (this.runningSince == null) return
    this.elapsedMs += Math.max(0, now - this.runningSince)
    this.runningSince = null
  }

  elapsed(now) {
    const live = this.runningSince == null ? 0 : Math.max(0, now - this.runningSince)
    return this.elapsedMs + live
  }

  // Sekunden, die an den Server gehen: aufgerundet, mindestens 1.
  seconds(now) {
    return Math.max(1, Math.ceil(this.elapsed(now) / 1000))
  }
}

// ── Bild-Komposition ───────────────────────────────────────────────────────
// Rein deterministische Anordnung der Requisiten; gezeichnet wird in
// src/halloweenScene.js. Koordinaten x/y in 0..1 der Bildbreite/-höhe, Größe s
// als Anteil der Bildbreite. Nur Ein-Codepoint-Emoji — sie landen im Canvas.

export const PUMPKIN = '🎃'
export const SKULL = '💀'

export const SCENE_THEMES = [
  { sky: ['#2a1450', '#7a2d6b', '#f08a3c'], hills: ['#3b1d4f', '#24123a'], ground: ['#3a2a1c', '#21160d'], moon: '#ffe9a8', horizon: 0.6 },
  { sky: ['#0d0b2a', '#2b1a5a', '#5a3a8a'], hills: ['#1c1440', '#120c2b'], ground: ['#2a2238', '#17121f'], moon: '#f5f1d6', horizon: 0.64 },
  { sky: ['#06201f', '#0f3b3a', '#2d6b5a'], hills: ['#0b2a26', '#071b18'], ground: ['#1d2b1a', '#101a0e'], moon: '#e9f7c9', horizon: 0.62 },
  { sky: ['#1a0b33', '#4b1c66', '#c2457f'], hills: ['#2d1347', '#1c0b2e'], ground: ['#33213f', '#1f1427'], moon: '#ffe3f1', horizon: 0.66 },
  { sky: ['#05030f', '#1a0f3d', '#4a1d5e'], hills: ['#140a2a', '#0a0517'], ground: ['#1f1530', '#0e0918'], moon: '#fff4cc', horizon: 0.62 }
]

// Requisiten je Kapitel: [Emoji, Anzahl min, max, Größe min, max, Bereich].
// Bereiche: sky = obere Hälfte, horizon = an der Horizontlinie, ground = Boden.
// Totenköpfe nur vereinzelt und nur in manchen Leveln — Kürbisse dominieren.
const PROPS = [
  [
    [PUMPKIN, 6, 9, 0.08, 0.17, 'ground'],
    ['🌽', 1, 2, 0.08, 0.1, 'horizon'],
    ['🦇', 2, 4, 0.05, 0.08, 'sky'],
    ['🍂', 2, 4, 0.04, 0.06, 'ground'],
    ['🦉', 1, 1, 0.1, 0.12, 'horizon'],
    ['🦊', 0, 1, 0.11, 0.13, 'ground'],
    ['🐰', 0, 1, 0.1, 0.12, 'ground']
  ],
  [
    ['🏰', 1, 1, 0.34, 0.42, 'horizon'],
    [PUMPKIN, 4, 6, 0.08, 0.14, 'ground'],
    ['👻', 2, 3, 0.1, 0.14, 'sky'],
    ['🦇', 3, 5, 0.05, 0.08, 'sky'],
    ['🐺', 0, 1, 0.12, 0.14, 'horizon'],
    ['🦉', 0, 1, 0.09, 0.11, 'horizon'],
    [SKULL, 0, 1, 0.06, 0.07, 'ground']
  ],
  [
    ['🌲', 4, 6, 0.14, 0.24, 'horizon'],
    [PUMPKIN, 3, 5, 0.08, 0.13, 'ground'],
    ['🧙', 1, 1, 0.14, 0.16, 'ground'],
    ['🔮', 1, 1, 0.07, 0.08, 'ground'],
    ['🍄', 2, 3, 0.05, 0.07, 'ground'],
    ['🦇', 1, 3, 0.05, 0.07, 'sky'],
    ['🧹', 0, 1, 0.1, 0.12, 'sky'],
    [SKULL, 0, 1, 0.05, 0.06, 'ground']
  ],
  [
    ['🏠', 2, 3, 0.16, 0.2, 'horizon'],
    [PUMPKIN, 4, 6, 0.08, 0.13, 'ground'],
    ['🍬', 2, 3, 0.05, 0.07, 'ground'],
    ['🍭', 1, 2, 0.06, 0.08, 'ground'],
    ['🍫', 1, 2, 0.05, 0.07, 'ground'],
    ['👻', 1, 1, 0.12, 0.14, 'ground'],
    ['🧛', 0, 1, 0.13, 0.15, 'ground'],
    ['🐼', 0, 1, 0.12, 0.14, 'ground'],
    ['🦇', 2, 3, 0.05, 0.07, 'sky'],
    [SKULL, 0, 1, 0.05, 0.06, 'ground']
  ],
  // Finale „Geisterstunde": Kürbis-Parade unterm Mitternachtsmond.
  [
    [PUMPKIN, 8, 11, 0.08, 0.15, 'ground'],
    ['🏰', 1, 1, 0.3, 0.36, 'horizon'],
    ['🌲', 2, 3, 0.14, 0.2, 'horizon'],
    ['👻', 2, 3, 0.1, 0.13, 'sky'],
    ['🦇', 4, 6, 0.05, 0.08, 'sky'],
    ['🧙', 1, 1, 0.13, 0.15, 'sky'],
    ['🍬', 1, 2, 0.05, 0.06, 'ground'],
    [SKULL, 0, 1, 0.05, 0.06, 'ground']
  ]
]

function rangeInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1))
}

export function sceneLayout(level) {
  const cfg = levelConfig(level)
  const rng = createRng(cfg.seed * 17 + 3)
  const theme = SCENE_THEMES[cfg.chapter]
  const aspect = cfg.rows / cfg.cols // Bildhöhe relativ zur Breite
  const horizon = theme.horizon

  const moon = {
    x: 0.18 + rng() * 0.64,
    y: 0.1 + rng() * 0.12,
    r: 0.09 + rng() * 0.04
  }
  const stars = Array.from({ length: 26 + Math.floor(rng() * 20) }, () => ({
    x: rng(),
    y: rng() * horizon * 0.9,
    r: 0.002 + rng() * 0.004,
    a: 0.35 + rng() * 0.6
  }))
  // Zwei Hügelketten als Wellen über die Bildbreite.
  const hills = [0, 1].map((i) => ({
    base: horizon - 0.06 + i * 0.05,
    amp: 0.03 + rng() * 0.03,
    freq: 1.5 + rng() * 2,
    phase: rng() * Math.PI * 2
  }))

  const props = []
  const fits = (x, y, s) => props.every((p) => {
    // Abstand in Breiten-Einheiten (y mit Seitenverhältnis umrechnen).
    const dx = p.x - x
    const dy = (p.y - y) * aspect
    return Math.hypot(dx, dy) > (p.s + s) * 0.42
  })

  for (const [emoji, min, max, sMin, sMax, zone] of PROPS[cfg.chapter]) {
    let count = rangeInt(rng, min, max)
    // Totenkopf höchstens in jedem zweiten Level.
    if (emoji === SKULL && cfg.level % 2) count = 0
    for (let i = 0; i < count; i++) {
      const s = sMin + rng() * (sMax - sMin)
      let placed = null
      for (let attempt = 0; attempt < 40 && !placed; attempt++) {
        const x = 0.06 + rng() * 0.88
        let y
        if (zone === 'sky') y = 0.08 + rng() * (horizon - 0.26)
        else if (zone === 'horizon') y = horizon - 0.02 + rng() * 0.06
        else y = horizon + 0.1 + rng() * (0.92 - horizon - 0.1)
        if (fits(x, y, s) || attempt === 39) placed = { x, y }
      }
      props.push({
        e: emoji,
        x: placed.x,
        y: placed.y,
        s,
        rot: (rng() - 0.5) * 0.4,
        glow: emoji === PUMPKIN,
        zone
      })
    }
  }
  // Hinten nach vorn: Himmel, Horizont, dann Boden nach y.
  const zoneOrder = { sky: 0, horizon: 1, ground: 2 }
  props.sort((a, b) => zoneOrder[a.zone] - zoneOrder[b.zone] || a.y - b.y)

  return { level: cfg.level, chapter: cfg.chapter, theme, aspect, moon, stars, hills, props }
}

export function countProps(layout, emoji) {
  return layout.props.filter((p) => p.e === emoji).length
}
