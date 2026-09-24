import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BlockFallGame, COLS, ROWS, HIDDEN_ROWS, MAX_LEVEL, GARBAGE, ROTATIONS, PIECE_TYPES,
  levelConfig, starsForScore, blockfallReward, garbageRows, createRng, chapterOf,
  kicksFor, LOCK_DELAY_MS, LINE_POINTS
} from './blockfall.js'

function fillRow(game, y, holeX = -1) {
  game.board[y] = new Array(COLS).fill(GARBAGE)
  if (holeX >= 0) game.board[y][holeX] = 0
}

test('jede Form hat vier Rotationen mit je vier Zellen', () => {
  for (const type of PIECE_TYPES) {
    assert.equal(ROTATIONS[type].length, 4)
    for (const cells of ROTATIONS[type]) assert.equal(cells.length, 4)
  }
})

test('vier Drehungen führen zur Ausgangsform zurück', () => {
  const game = new BlockFallGame(1, createRng(1))
  game.active = { type: 'T', rot: 0, x: 4, y: 8 }
  const before = JSON.stringify(game.cellsOf())
  for (let i = 0; i < 4; i++) assert.ok(game.rotate(1))
  assert.equal(JSON.stringify(game.cellsOf()), before)
})

test('das O dreht an Ort und Stelle', () => {
  assert.deepEqual(ROTATIONS.O[0], ROTATIONS.O[1])
  assert.deepEqual(kicksFor('O', 0, 1), [[0, 0]])
})

test('I steht nach einer Drehung senkrecht in Spalte 2 der Box', () => {
  const xs = new Set(ROTATIONS.I[1].map(([x]) => x))
  assert.deepEqual([...xs], [2])
})

test('Steine erscheinen mit sichtbarer Unterkante und im 7er-Beutel', () => {
  const game = new BlockFallGame(1, createRng(42))
  const maxY = Math.max(...game.cellsOf().map(([, y]) => y))
  assert.equal(maxY, HIDDEN_ROWS)
  const seen = [game.active.type, ...game.queue.slice(0, 6)]
  assert.equal(new Set(seen).size, 7)
})

test('Wände stoppen seitliche Bewegung', () => {
  const game = new BlockFallGame(1, createRng(3))
  let moves = 0
  while (game.move(-1)) moves++
  assert.ok(moves > 0 && moves <= COLS)
  assert.equal(Math.min(...game.cellsOf().map(([x]) => x)), 0)
  assert.equal(game.move(-1), false)
})

test('Wandsprung: senkrechtes I an der rechten Wand dreht trotzdem', () => {
  const game = new BlockFallGame(1, createRng(3))
  game.active = { type: 'I', rot: 1, x: 7, y: 10 } // Spalte 9, direkt an der Wand
  assert.ok(game.fits(game.active))
  assert.equal(game.fits({ ...game.active, rot: 2 }), false) // ohne Sprung ginge es nicht
  assert.ok(game.rotate(1))
  assert.equal(game.active.rot, 2)
  assert.ok(game.cellsOf().every(([x]) => x >= 0 && x < COLS))
})

test('Hard-Drop landet auf dem Boden und sperrt den Stein', () => {
  const game = new BlockFallGame(1, createRng(5))
  const type = game.active.type
  game.hardDrop()
  assert.equal(game.pieces, 1)
  const bottom = game.board[ROWS - 1]
  assert.ok(bottom.some((c) => c === PIECE_TYPES.indexOf(type) + 1))
})

test('volle Reihen verschwinden und zählen Punkte', () => {
  const game = new BlockFallGame(1, createRng(9))
  fillRow(game, ROWS - 1, 0)
  fillRow(game, ROWS - 2, 0)
  game.active = { type: 'I', rot: 1, x: -2, y: ROWS - 4 } // senkrecht in Spalte 0
  assert.ok(game.fits(game.active))
  game.hardDrop()
  assert.equal(game.lines, 2)
  assert.equal(game.score, LINE_POINTS[2])
  const clear = game.drainEvents().find((e) => e.type === 'clear')
  assert.equal(clear.count, 2)
  // Die verbliebenen zwei I-Zellen sind nach unten gerutscht.
  assert.equal(game.board[ROWS - 1][0], PIECE_TYPES.indexOf('I') + 1)
  assert.equal(game.board[ROWS - 1][1], 0)
})

test('Kombo-Bonus wächst mit aufeinanderfolgenden Abräumungen', () => {
  const game = new BlockFallGame(1, createRng(9))
  for (let i = 0; i < 2; i++) {
    fillRow(game, ROWS - 1, 0)
    game.active = { type: 'I', rot: 1, x: -2, y: 5 }
    game.hardDrop()
    // übrige I-Zellen entfernen, damit die nächste Runde gleich startet
    for (let y = 0; y < ROWS; y++) game.board[y][0] = 0
  }
  assert.equal(game.score, 100 + (100 + 50))
})

test('Ziel erreicht ⇒ gewonnen', () => {
  const game = new BlockFallGame(1, createRng(9))
  game.lines = game.cfg.goalLines - 1
  fillRow(game, ROWS - 1, 0)
  game.active = { type: 'I', rot: 1, x: -2, y: 5 }
  game.hardDrop()
  assert.equal(game.won, true)
  assert.ok(game.finished)
})

test('volles Feld ⇒ Game over', () => {
  const game = new BlockFallGame(1, createRng(9))
  for (let y = HIDDEN_ROWS; y < ROWS; y++) fillRow(game, y, y % COLS)
  game.hardDrop()
  assert.equal(game.over, true)
})

test('Schwerkraft + Lock-Delay sperren den Stein von selbst', () => {
  const game = new BlockFallGame(1, createRng(11))
  for (let i = 0; i < 400 && game.pieces === 0; i++) game.update(50)
  assert.equal(game.pieces, 1)
})

test('Lock-Delay wartet am Boden erst LOCK_DELAY_MS', () => {
  const game = new BlockFallGame(1, createRng(11))
  game.active = { ...game.active, y: game.ghostY() }
  for (let t = 0; t < LOCK_DELAY_MS - 50; t += 50) game.update(50)
  assert.equal(game.pieces, 0)
  game.update(50)
  game.update(50)
  assert.equal(game.pieces, 1)
})

test('Halten tauscht nur einmal pro Stein', () => {
  const game = new BlockFallGame(1, createRng(13))
  const first = game.active.type
  assert.ok(game.holdPiece())
  assert.equal(game.hold, first)
  assert.equal(game.holdPiece(), false)
  game.hardDrop()
  assert.ok(game.holdPiece())
})

test('Level-Kurve: mehr Reihen, schneller, mehr Müll', () => {
  const a = levelConfig(1)
  const b = levelConfig(MAX_LEVEL)
  assert.equal(a.goalLines, 5)
  assert.equal(b.goalLines, 34)
  assert.equal(a.garbageRows, 0)
  assert.equal(b.garbageRows, 9)
  assert.ok(b.gravityMs < a.gravityMs)
  assert.ok(b.gravityMs >= 100)
  for (let l = 2; l <= MAX_LEVEL; l++) {
    assert.ok(levelConfig(l).gravityMs <= levelConfig(l - 1).gravityMs)
  }
  assert.deepEqual(levelConfig(0), levelConfig(1))
  assert.deepEqual(levelConfig(99), levelConfig(MAX_LEVEL))
})

test('Kapitel: 5 × 6 Level', () => {
  assert.equal(chapterOf(1), 0)
  assert.equal(chapterOf(6), 0)
  assert.equal(chapterOf(7), 1)
  assert.equal(chapterOf(30), 4)
})

test('Müll-Reihen im Startfeld haben genau eine Lücke', () => {
  const game = new BlockFallGame(12, createRng(1))
  const n = game.cfg.garbageRows
  assert.ok(n > 0)
  for (let i = 0; i < n; i++) {
    const row = game.board[ROWS - 1 - i]
    assert.equal(row.filter((c) => c === 0).length, 1)
  }
})

test('aufeinanderfolgende Müll-Lücken liegen nie übereinander', () => {
  const rows = garbageRows(200, createRng(7))
  for (let i = 1; i < rows.length; i++) {
    assert.notEqual(rows[i].indexOf(0), rows[i - 1].indexOf(0))
  }
})

test('Sterne hängen an den Punktgrenzen', () => {
  const cfg = levelConfig(10)
  assert.equal(starsForScore(0, cfg), 1)
  assert.equal(starsForScore(cfg.star2, cfg), 2)
  assert.equal(starsForScore(cfg.star3 - 1, cfg), 2)
  assert.equal(starsForScore(cfg.star3, cfg), 3)
})

test('Belohnung: quadratische Coins, Tickets alle fünf Level', () => {
  assert.deepEqual(blockfallReward(1), { coins: 800, tickets: 0 })
  assert.deepEqual(blockfallReward(5), { coins: 20000, tickets: 1 })
  assert.deepEqual(blockfallReward(30), { coins: 720000, tickets: 5 })
  let tickets = 0
  for (let l = 1; l <= MAX_LEVEL; l++) tickets += blockfallReward(l).tickets
  assert.equal(tickets, 16)
})
