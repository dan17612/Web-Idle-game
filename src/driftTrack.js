// Drift-Minispiel: deterministische Strecken-Generierung + Geometrie-Helfer.
// Jedes Level hat eine feste Strecke (Seed = Level), damit Kurven lernbar sind.

export const MAX_LEVEL = 12

export function levelConfig(level) {
  const lvl = Math.max(1, Math.min(MAX_LEVEL, Math.floor(Number(level) || 1)))
  return {
    level: lvl,
    curves: 4 + lvl,
    roadWidth: Math.max(64, 116 - lvl * 4),
    speed: 150 + lvl * 10,
    minAngle: 35 + lvl * 4,
    maxAngle: Math.min(150, 60 + lvl * 8)
  }
}

export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const STEP = 8

export function buildTrack(level) {
  const cfg = levelConfig(level)
  const rnd = mulberry32(cfg.level * 7919 + 17)
  const points = []
  let x = 0
  let y = 0
  let heading = -Math.PI / 2

  function straight(len) {
    const n = Math.max(1, Math.round(len / STEP))
    for (let i = 0; i < n; i++) {
      x += Math.cos(heading) * STEP
      y += Math.sin(heading) * STEP
      points.push({ x, y })
    }
  }

  function arc(angleRad, radius) {
    const arcLen = Math.abs(angleRad) * radius
    const n = Math.max(2, Math.round(arcLen / STEP))
    const da = angleRad / n
    for (let i = 0; i < n; i++) {
      heading += da
      x += Math.cos(heading) * STEP
      y += Math.sin(heading) * STEP
      points.push({ x, y })
    }
  }

  points.push({ x, y })
  straight(280)
  let deviation = 0
  for (let i = 0; i < cfg.curves; i++) {
    const angleDeg = cfg.minAngle + rnd() * (cfg.maxAngle - cfg.minAngle)
    let dir = rnd() < 0.5 ? 1 : -1
    if (Math.abs(deviation + dir * angleDeg) > 100) dir = -dir
    deviation += dir * angleDeg
    const radius = 90 + rnd() * 110
    arc((angleDeg * Math.PI / 180) * dir, radius)
    straight(110 + rnd() * 150)
  }
  straight(220)
  return { ...cfg, points, step: STEP }
}

// Sucht den nächstgelegenen Streckenpunkt in einem Fenster um den letzten
// bekannten Index. Verhindert Rückwärts-Springen auf spätere Streckenteile.
export function nearestIndex(points, pos, fromIndex = 0, windowSize = 40) {
  const start = Math.max(0, fromIndex - 6)
  const end = Math.min(points.length - 1, fromIndex + windowSize)
  let best = start
  let bestD = Infinity
  for (let i = start; i <= end; i++) {
    const dx = points[i].x - pos.x
    const dy = points[i].y - pos.y
    const d = dx * dx + dy * dy
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return { index: best, dist: Math.sqrt(bestD) }
}

export function starsForCrashes(crashes) {
  const n = Math.max(0, Math.floor(Number(crashes) || 0))
  if (n === 0) return 3
  if (n <= 2) return 2
  return 1
}
