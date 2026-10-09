import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_LEVEL, LEVELS_PER_CHAPTER, CHAPTERS, CHAPTER_STARTS, GRIDS, SNAP_DISTANCE, PUMPKIN, SKULL,
  levelConfig, chapterOf, isFinale, starsForTime, puzzleReward, replayCoins, createRng,
  RAINBOW_STAR_GOAL, RAINBOW_PET, totalStars,
  buildEdges, pieceSides, piecePath, PuzzleGame, sceneLayout, countProps
} from './halloweenPuzzle.js'
import { findEmojiSequences } from './emojiFont.js'

test('24 Level in 4 Kapiteln plus Finale, Raster wird nie kleiner', () => {
  assert.equal(GRIDS.length, MAX_LEVEL)
  assert.equal(MAX_LEVEL, 25)
  assert.equal(CHAPTERS.reduce((sum, ch) => sum + ch.levels, 0), MAX_LEVEL)
  assert.deepEqual(CHAPTER_STARTS, [1, 7, 13, 19, 25])
  assert.equal(chapterOf(1), 0)
  assert.equal(chapterOf(6), 0)
  assert.equal(chapterOf(7), 1)
  assert.equal(chapterOf(24), 3)
  assert.equal(chapterOf(25), 4)
  // Der SQL-Spiegel rechnet das Kapitel als (Level − 1) / 6.
  for (let l = 1; l <= MAX_LEVEL; l++) {
    assert.equal(chapterOf(l), Math.floor((l - 1) / LEVELS_PER_CHAPTER), `Level ${l}`)
  }
  for (let ch = 0; ch < CHAPTERS.length; ch++) {
    for (let i = 1; i < CHAPTERS[ch].levels; i++) {
      const prev = levelConfig(CHAPTER_STARTS[ch] + i - 1)
      const cur = levelConfig(CHAPTER_STARTS[ch] + i)
      assert.ok(cur.pieces >= prev.pieces, `Level ${cur.level} hat weniger Teile`)
    }
  }
  // Hochformat oder quadratisch, und nie mehr als 8 Spalten (Handybreite).
  for (const [cols, rows] of GRIDS) {
    assert.ok(rows >= cols)
    assert.ok(cols <= 8)
  }
})

test('levelConfig klemmt Level und kennt die Hilfen je Kapitel', () => {
  assert.equal(levelConfig(0).level, 1)
  assert.equal(levelConfig(99).level, MAX_LEVEL)
  assert.deepEqual([levelConfig(1).cols, levelConfig(1).rows, levelConfig(1).pieces], [3, 3, 9])
  assert.equal(levelConfig(1).ghost > 0, true)
  assert.equal(levelConfig(13).ghost, 0)
  assert.equal(levelConfig(18).rotate, false)
  assert.equal(levelConfig(19).rotate, true)
})

test('Sterne nach Zeit: 3 / 4 / 5 / 7 Sekunden pro Teil', () => {
  const cfg = levelConfig(1) // 9 Teile, 3 s
  assert.equal(cfg.star3, 27)
  assert.equal(cfg.star2, 54)
  assert.equal(starsForTime(1, 27), 3)
  assert.equal(starsForTime(1, 28), 2)
  assert.equal(starsForTime(1, 54), 2)
  assert.equal(starsForTime(1, 55), 1)
  assert.equal(levelConfig(24).star3, 56 * 7)
  assert.equal(starsForTime(24, 0), 3)
  assert.equal(starsForTime(24, 'quatsch'), 3)
})

test('Finale: größtes Puzzle, keine Hilfen, verdreht, strengste drei Sterne', () => {
  const fin = levelConfig(25)
  assert.equal(isFinale(25), true)
  assert.equal(isFinale(24), false)
  assert.deepEqual([fin.cols, fin.rows, fin.pieces], [8, 8, 64])
  assert.equal(fin.ghost, 0)
  assert.equal(fin.outlines, false)
  assert.equal(fin.rotate, true)
  assert.equal(fin.star3, 64 * 4)
  assert.equal(starsForTime(25, 256), 3)
  assert.equal(starsForTime(25, 257), 2)
  assert.equal(starsForTime(25, 513), 1)
  // Pro Teil strenger als jedes andere Kapitel mit gedrehten Teilen.
  for (let l = 1; l < 25; l++) {
    const cfg = levelConfig(l)
    if (cfg.rotate) assert.ok(cfg.star3 / cfg.pieces > fin.star3 / fin.pieces, `Level ${l}`)
    assert.ok(cfg.pieces < fin.pieces, `Level ${l} ist nicht kleiner als das Finale`)
  }
  assert.deepEqual(puzzleReward(25), { coins: 625000, tickets: 8, pet: null })
})

test('Belohnung: Coins quadratisch, Tickets und Fledermäuse an Meilensteinen', () => {
  assert.deepEqual(puzzleReward(1), { coins: 1000, tickets: 0, pet: null })
  assert.deepEqual(puzzleReward(6), { coins: 36000, tickets: 2, pet: null })
  assert.deepEqual(puzzleReward(12), { coins: 144000, tickets: 3, pet: { species: 'bat', tier: 'normal' } })
  assert.deepEqual(puzzleReward(24), { coins: 576000, tickets: 6, pet: { species: 'bat', tier: 'gold' } })
  assert.equal(replayCoins(1), 100)
  assert.equal(replayCoins(24), 28800)
})

test('Kanten: Nachbarn haben immer Nase gegen Bucht, Rand ist gerade', () => {
  const edges = buildEdges(6, 7, createRng(42))
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 6; c++) {
      const s = pieceSides(edges, c, r)
      if (c < 5) assert.equal(s.right, -pieceSides(edges, c + 1, r).left)
      if (r < 6) assert.equal(s.bottom, -pieceSides(edges, c, r + 1).top)
      if (r === 0) assert.equal(s.top, 0)
      if (c === 0) assert.equal(s.left, 0)
      if (r === 6) assert.equal(s.bottom, 0)
      if (c === 5) assert.equal(s.right, 0)
      for (const side of ['top', 'right', 'bottom', 'left']) {
        assert.ok([-1, 0, 1].includes(s[side]))
      }
    }
  }
})

// Punkte einer Kontur (ohne Z) als Liste — Bezier-Stützpunkte reichen, weil
// die Schablone symmetrisch ist und die Kurven dieselben Kontrollpunkte haben.
function points(cmds, ox = 0, oy = 0) {
  const out = []
  for (const cmd of cmds) {
    for (let i = 1; i < cmd.length; i += 2) out.push([+(cmd[i] + ox).toFixed(6), +(cmd[i + 1] + oy).toFixed(6)])
  }
  return out
}

test('Umriss: gemeinsame Kante zweier Nachbarn ist deckungsgleich', () => {
  const edges = buildEdges(2, 2, createRng(7))
  const a = points(piecePath(pieceSides(edges, 0, 0), 1))
  const b = points(piecePath(pieceSides(edges, 1, 0), 1), 1, 0)
  const onSeam = (pts) => pts.filter(([x, y]) => Math.abs(x - 1) <= 0.3 && y >= 0 && y <= 1 && !(y === 0 || y === 1))
  const key = (pts) => pts.map((p) => p.join(',')).sort()
  assert.deepEqual(key(onSeam(a)), key(onSeam(b)))
  assert.ok(onSeam(a).length >= 12, 'Nase fehlt auf der Naht')
})

test('Umriss: gerade Ränder sind Rechteck, Nasen ragen höchstens TAB_HEIGHT hinaus', () => {
  const flat = piecePath({ top: 0, right: 0, bottom: 0, left: 0 }, 10)
  assert.deepEqual(flat, [['M', 0, 0], ['L', 10, 0], ['L', 10, 10], ['L', 0, 10], ['L', 0, 0], ['Z']])
  const all = points(piecePath({ top: 1, right: -1, bottom: 1, left: -1 }, 1))
  for (const [x, y] of all) {
    assert.ok(x >= -0.26 && x <= 1.26 && y >= -0.26 && y <= 1.26)
  }
})

test('Spiel: Teil rastet nur am richtigen Platz ein', () => {
  const g = new PuzzleGame(1)
  assert.equal(g.pieces.length, 9)
  assert.equal(g.tray().length, 9)
  const p = g.piece(4) // Mitte (1,1)
  assert.equal(g.drop(4, 0.5, 0.5), 'miss')
  assert.equal(g.drop(4, 1.5 + SNAP_DISTANCE * 0.9, 1.5), 'placed')
  assert.equal(p.placed, true)
  assert.equal(g.drop(4, 1.5, 1.5), 'miss', 'schon gelegt')
  assert.equal(g.placedCount, 1)
  assert.equal(g.misses, 1)
  assert.equal(g.tray().length, 8)
  assert.ok(g.tray(true).every((q) => q.edge))
  assert.equal(g.tray(true).length, 8, 'im 3×3 sind alle außer der Mitte Randteile')
})

test('Spiel: gedrehte Teile müssen erst gedreht werden', () => {
  const g = new PuzzleGame(19)
  assert.ok(g.pieces.every((p) => p.rot >= 1 && p.rot <= 3))
  const p = g.piece(0)
  assert.equal(g.drop(0, 0.5, 0.5), 'rotate')
  while (p.rot !== 0) g.rotate(0)
  assert.equal(g.drop(0, 0.5, 0.5), 'placed')
  assert.equal(g.rotate(0), false, 'gelegte Teile drehen nicht mehr')
})

test('Spiel: alles gelegt = fertig, Ablage deterministisch', () => {
  const a = new PuzzleGame(5)
  const b = new PuzzleGame(5)
  assert.deepEqual(a.order, b.order)
  for (const p of a.pieces) a.drop(p.id, p.col + 0.5, p.row + 0.5)
  assert.equal(a.done, true)
  assert.equal(a.tray().length, 0)
})

test('Uhr zählt nur aktive Zeit', () => {
  const g = new PuzzleGame(1)
  assert.equal(g.seconds(0), 1)
  g.start(1000)
  assert.equal(g.elapsed(4000), 3000)
  g.stop(4000)
  assert.equal(g.elapsed(60000), 3000, 'Pause zählt nicht')
  g.start(60000)
  assert.equal(g.seconds(62500), 6)
  g.start(70000) // doppelter Start ändert nichts
  assert.equal(g.elapsed(62500), 5500)
})

test('Bilder: in jedem Level mehr Kürbisse als Totenköpfe', () => {
  let pumpkins = 0
  let skulls = 0
  for (let l = 1; l <= MAX_LEVEL; l++) {
    const layout = sceneLayout(l)
    const p = countProps(layout, PUMPKIN)
    const s = countProps(layout, SKULL)
    assert.ok(p >= 3, `Level ${l}: nur ${p} Kürbisse`)
    assert.ok(s <= 1, `Level ${l}: ${s} Totenköpfe`)
    assert.ok(p > s, `Level ${l}`)
    pumpkins += p
    skulls += s
  }
  assert.ok(pumpkins >= skulls * 10, `${pumpkins} Kürbisse vs. ${skulls} Totenköpfe`)
})

test('Bilder: deterministisch, im Bild und nur Ein-Codepoint-Emoji', () => {
  assert.deepEqual(sceneLayout(9), sceneLayout(9))
  assert.notDeepEqual(sceneLayout(9).props, sceneLayout(10).props)
  for (let l = 1; l <= MAX_LEVEL; l++) {
    for (const p of sceneLayout(l).props) {
      assert.ok(p.x > 0 && p.x < 1 && p.y > 0 && p.y < 1, `Level ${l}: ${p.e} außerhalb`)
      assert.deepEqual(findEmojiSequences(p.e), [], `Level ${l}: ${p.e}`)
    }
  }
})

test('Regenbogen-Fledermaus: alle 75 Sterne inkl. Finale, Summe zählt nur echte Level', () => {
  assert.equal(RAINBOW_STAR_GOAL, 75)
  assert.deepEqual(RAINBOW_PET, { species: 'bat', tier: 'rainbow' })
  assert.equal(totalStars(null), 0)
  assert.equal(totalStars({ 1: 3, 2: 2, 3: '1' }), 6)
  const all = Object.fromEntries(Array.from({ length: MAX_LEVEL }, (_, i) => [i + 1, 3]))
  assert.equal(totalStars(all), RAINBOW_STAR_GOAL)
  // Ausreißer werden geklemmt, fremde Schlüssel ignoriert.
  assert.equal(totalStars({ 1: 9, 26: 3, x: 3, 2: -1 }), 3)
  // 72 Sterne ohne Finale reichen nicht.
  const without = Object.fromEntries(Array.from({ length: 24 }, (_, i) => [i + 1, 3]))
  assert.ok(totalStars(without) < RAINBOW_STAR_GOAL)
})
