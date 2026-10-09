// Kürbis-Puzzle — Zeichnen per Canvas 2D: das Halloween-Bild eines Levels,
// die einzelnen Puzzleteile (Bild + Nasen + Schattenkante) und das Brett.
// Die Anordnung kommt deterministisch aus sceneLayout() (src/halloweenPuzzle.js).
//
// Emoji landen hier im Canvas: nur Ein-Codepoint-Emoji, Schrift immer über
// emojiFontSpec (src/emojiSafe.test.js prüft beides).

import { emojiFontSpec } from './emojiFont.js'
import { sceneLayout, piecePath, PIECE_PAD } from './halloweenPuzzle.js'

export function makeCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return c
}

// Pseudo-Zufall aus Index + Level, damit Grashalme stabil bleiben.
function hash(i, level) {
  const x = Math.sin(i * 12.9898 + level * 78.233) * 43758.5453
  return x - Math.floor(x)
}

function drawHills(ctx, hill, color, W, H) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, H)
  const steps = 24
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const y = (hill.base + hill.amp * Math.sin(hill.freq * t * Math.PI * 2 + hill.phase)) * H
    ctx.lineTo(t * W, y)
  }
  ctx.lineTo(W, H)
  ctx.closePath()
  ctx.fill()
}

export function drawScene(ctx, layout, W, H) {
  const { theme, moon, stars, hills, props, level } = layout

  // Himmel
  const sky = ctx.createLinearGradient(0, 0, 0, H * theme.horizon)
  sky.addColorStop(0, theme.sky[0])
  sky.addColorStop(0.55, theme.sky[1])
  sky.addColorStop(1, theme.sky[2])
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  // Sterne
  ctx.fillStyle = '#fff8e6'
  for (const s of stars) {
    ctx.globalAlpha = s.a
    ctx.beginPath()
    ctx.arc(s.x * W, s.y * H, Math.max(0.6, s.r * W), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // Mond mit Schein und Kratern
  const mx = moon.x * W
  const my = moon.y * H
  const mr = moon.r * W
  const glow = ctx.createRadialGradient(mx, my, mr * 0.7, mx, my, mr * 3.2)
  glow.addColorStop(0, 'rgba(255, 236, 190, 0.5)')
  glow.addColorStop(1, 'rgba(255, 236, 190, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(mx - mr * 3.2, my - mr * 3.2, mr * 6.4, mr * 6.4)
  ctx.fillStyle = theme.moon
  ctx.beginPath()
  ctx.arc(mx, my, mr, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(120, 100, 70, 0.16)'
  for (const [dx, dy, r] of [[-0.3, -0.2, 0.22], [0.25, 0.1, 0.16], [-0.05, 0.38, 0.12]]) {
    ctx.beginPath()
    ctx.arc(mx + dx * mr, my + dy * mr, r * mr, 0, Math.PI * 2)
    ctx.fill()
  }

  // Hügel und Boden
  drawHills(ctx, hills[0], theme.hills[0], W, H)
  drawHills(ctx, hills[1], theme.hills[1], W, H)
  const groundTop = (theme.horizon + 0.05) * H
  const ground = ctx.createLinearGradient(0, groundTop, 0, H)
  ground.addColorStop(0, theme.ground[0])
  ground.addColorStop(1, theme.ground[1])
  ctx.fillStyle = ground
  ctx.beginPath()
  ctx.moveTo(0, H)
  ctx.lineTo(0, groundTop + H * 0.02)
  ctx.quadraticCurveTo(W * 0.5, groundTop - H * 0.03, W, groundTop + H * 0.015)
  ctx.lineTo(W, H)
  ctx.closePath()
  ctx.fill()

  // Nebelband über dem Horizont
  const fog = ctx.createLinearGradient(0, groundTop - H * 0.06, 0, groundTop + H * 0.06)
  fog.addColorStop(0, 'rgba(220, 200, 255, 0)')
  fog.addColorStop(0.5, 'rgba(220, 200, 255, 0.14)')
  fog.addColorStop(1, 'rgba(220, 200, 255, 0)')
  ctx.fillStyle = fog
  ctx.fillRect(0, groundTop - H * 0.06, W, H * 0.12)

  // Grashalme geben dem Boden Struktur — sonst sähen Bodenteile gleich aus.
  ctx.strokeStyle = 'rgba(140, 190, 90, 0.35)'
  ctx.lineWidth = Math.max(1, W * 0.004)
  ctx.beginPath()
  for (let i = 0; i < 70; i++) {
    const x = hash(i, level) * W
    const y = groundTop + H * 0.03 + hash(i + 100, level) * (H - groundTop - H * 0.03)
    const h = H * (0.012 + hash(i + 200, level) * 0.018)
    ctx.moveTo(x, y)
    ctx.lineTo(x + h * 0.3, y - h)
  }
  ctx.stroke()

  // Requisiten
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const p of props) {
    const x = p.x * W
    const y = p.y * H
    const size = p.s * W
    if (p.zone !== 'sky') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)'
      ctx.beginPath()
      ctx.ellipse(x, y + size * 0.42, size * 0.42, size * 0.1, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    if (p.glow) {
      const g = ctx.createRadialGradient(x, y, size * 0.2, x, y, size * 1.1)
      g.addColorStop(0, 'rgba(255, 170, 60, 0.45)')
      g.addColorStop(1, 'rgba(255, 140, 30, 0)')
      ctx.fillStyle = g
      ctx.fillRect(x - size * 1.1, y - size * 1.1, size * 2.2, size * 2.2)
    }
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(p.rot)
    ctx.font = emojiFontSpec(size)
    ctx.fillText(p.e, 0, 0)
    ctx.restore()
  }

  // Vignette
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75)
  vig.addColorStop(0, 'rgba(10, 0, 20, 0)')
  vig.addColorStop(1, 'rgba(10, 0, 20, 0.35)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, W, H)
}

// Ganzes Bild eines Levels als Canvas in Gerätepixeln.
export function renderScene(level, W, H, dpr = 1) {
  const canvas = makeCanvas(W * dpr, H * dpr)
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  drawScene(ctx, sceneLayout(level), W, H)
  return canvas
}

export function tracePath(ctx, cmds, ox = 0, oy = 0) {
  ctx.beginPath()
  for (const c of cmds) {
    if (c[0] === 'M') ctx.moveTo(ox + c[1], oy + c[2])
    else if (c[0] === 'L') ctx.lineTo(ox + c[1], oy + c[2])
    else if (c[0] === 'C') ctx.bezierCurveTo(ox + c[1], oy + c[2], ox + c[3], oy + c[4], ox + c[5], oy + c[6])
    else ctx.closePath()
  }
}

// Ein Puzzleteil: Ausschnitt des Bildes im Umriss, mit Licht- und
// Schattenkante. Das Canvas hat rundum PIECE_PAD × Zelle Rand für die Nasen.
export function renderPiece(scene, piece, cell, dpr = 1) {
  const pad = PIECE_PAD * cell
  const size = cell + pad * 2
  const canvas = makeCanvas(size * dpr, size * dpr)
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  const cmds = piecePath(piece.sides, cell)

  ctx.save()
  tracePath(ctx, cmds, pad, pad)
  ctx.clip()
  ctx.drawImage(scene, pad - piece.col * cell, pad - piece.row * cell, scene.width / dpr, scene.height / dpr)
  // Schmale Licht- und Schattenkante, damit das Teil plastisch wirkt.
  const edge = Math.max(1, cell * 0.022)
  ctx.lineWidth = edge * 2
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
  tracePath(ctx, cmds, pad + edge * 0.7, pad + edge * 0.7)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255, 236, 200, 0.24)'
  tracePath(ctx, cmds, pad - edge * 0.7, pad - edge * 0.7)
  ctx.stroke()
  ctx.restore()

  ctx.lineWidth = Math.max(1, cell * 0.018)
  ctx.strokeStyle = 'rgba(25, 10, 35, 0.7)'
  tracePath(ctx, cmds, pad, pad)
  ctx.stroke()
  return canvas
}

// Brett: dunkler Grund, optional Geisterbild und gestrichelte Umrisse.
export function renderBoard(scene, pieces, cfg, cell, dpr = 1) {
  const W = cell * cfg.cols
  const H = cell * cfg.rows
  const canvas = makeCanvas(W * dpr, H * dpr)
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#24123a')
  bg.addColorStop(1, '#170b26')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  if (cfg.ghost > 0) {
    ctx.globalAlpha = cfg.ghost
    ctx.drawImage(scene, 0, 0, W, H)
    ctx.globalAlpha = 1
  }
  if (cfg.outlines) {
    ctx.setLineDash([Math.max(2, cell * 0.06), Math.max(2, cell * 0.06)])
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(255, 210, 160, 0.28)'
    for (const p of pieces) {
      tracePath(ctx, piecePath(p.sides, cell), p.col * cell, p.row * cell)
      ctx.stroke()
    }
    ctx.setLineDash([])
  }
  return canvas
}
