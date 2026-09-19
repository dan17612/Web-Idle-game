// Zoo-Welt: reine Logik ohne Three.js — Welt-Layout, Bauplatz-Ringe, Kollision,
// Zonen-Erkennung und Katalog-Visuals mit Fallbacks. Wird von worldEngine.js
// und WorldView.vue genutzt und ist unit-testbar (node --test).

export const WORLD = {
  radius: 95, // begehbarer Kreis, gespiegelt vom Server-Clamp in world_save_pos
  walkSpeed: 5.2,
  plazaRadius: 15,
  spawn: { x: 0, z: 10 },
}

export const POI = {
  fountain: { x: 0, z: 0, r: 3 },
  shop: { x: -18, z: -5, r: 4.6, door: { x: -14.5, z: -1.5 } },
  gate: { x: 18, z: -5, r: 3.6, door: { x: 14.5, z: -1.5 } },
}

export const COLLIDERS = [
  { x: POI.fountain.x, z: POI.fountain.z, r: POI.fountain.r },
  { x: POI.shop.x, z: POI.shop.z, r: POI.shop.r },
  { x: POI.gate.x, z: POI.gate.z, r: POI.gate.r },
]

export const FARM = { w: 13, d: 9 }

// Gespiegelt von public.world_fountain_claim — synchron halten!
export const FOUNTAIN_REWARD = { coins: 25000, tickets: 1 }

export const EMOTES = ['👋', '💖', '😂', '🎉', '😮', '💪']
export const HONK_EMOTE = '📢'

// Bauplätze liegen in 4 Ringen um den Platz (Radius 42..84, Kapazität aus dem
// Umfang). Deterministisch aus der Plot-Nummer (Sequenz, ab 1). Jenseits der
// Gesamtkapazität wird mit leichtem Winkel-Versatz erneut von vorn belegt.
const RING_COUNT = 4
const ringRadius = (ring) => 42 + ring * 14
const ringCap = (ring) => Math.floor((2 * Math.PI * ringRadius(ring)) / 16)
export const PLOT_CAPACITY = Array.from({ length: RING_COUNT }, (_, r) => ringCap(r))
  .reduce((a, b) => a + b, 0)

export function plotPosition(plot) {
  const raw = Math.max(0, Math.floor(plot) - 1)
  let idx = raw % PLOT_CAPACITY
  let ring = 0
  while (idx >= ringCap(ring)) {
    idx -= ringCap(ring)
    ring += 1
  }
  const radius = ringRadius(ring)
  const angle = (idx / ringCap(ring)) * Math.PI * 2
    + ring * 0.35
    + Math.floor(raw / PLOT_CAPACITY) * 0.13
  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
    angle,
    ring,
  }
}

export function clampToWorld(x, z) {
  const d = Math.hypot(x, z)
  if (d <= WORLD.radius || d === 0) return { x, z }
  const s = WORLD.radius / d
  return { x: x * s, z: z * s }
}

export function resolveCollision(x, z, radius = 0.7, colliders = COLLIDERS) {
  let px = x
  let pz = z
  for (const c of colliders) {
    const dx = px - c.x
    const dz = pz - c.z
    const dist = Math.hypot(dx, dz)
    const min = c.r + radius
    if (dist >= min) continue
    if (dist === 0) {
      px = c.x + min
      continue
    }
    px = c.x + (dx / dist) * min
    pz = c.z + (dz / dist) * min
  }
  return clampToWorld(px, pz)
}

// Liefert die Interaktions-Zone an einer Position (oder null).
// farms: [{ plot, user_id, username }] für begehbare Bauplätze.
export function nearestZone(x, z, farms = [], ownUserId = null) {
  const near = (p, r) => Math.hypot(x - p.x, z - p.z) <= r
  if (near(POI.shop.door, 3.4)) return { kind: 'shop' }
  if (near(POI.gate.door, 3.4)) return { kind: 'gate' }
  if (near(POI.fountain, POI.fountain.r + 2.8)) return { kind: 'fountain' }
  for (const f of farms) {
    const pos = plotPosition(f.plot)
    if (Math.hypot(x - pos.x, z - pos.z) <= Math.max(FARM.w, FARM.d) * 0.62) {
      return { kind: 'farm', plot: f.plot, user_id: f.user_id, username: f.username, own: f.user_id === ownUserId }
    }
  }
  return null
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/
const hex = (v, fb) => (typeof v === 'string' && HEX_RE.test(v) ? v : fb)

export function outfitVisual(meta) {
  const m = meta || {}
  return {
    body: hex(m.body, '#4da3ff'),
    hat: typeof m.hat === 'string' ? m.hat : 'none',
  }
}

export function carVisual(meta) {
  const m = meta || {}
  const speed = Number(m.speed)
  return {
    color: hex(m.color, '#e53935'),
    speed: Number.isFinite(speed) ? Math.min(3, Math.max(1.2, speed)) : 2,
  }
}

export function farmVisual(meta) {
  const m = meta || {}
  return {
    ground: hex(m.ground, '#7ecb57'),
    fence: hex(m.fence, '#a5713f'),
    deco: Array.isArray(m.deco) && m.deco.length ? m.deco.slice(0, 4) : ['🌸', '🌼'],
  }
}

// Entfernte Spieler: Ziel per Velocity extrapolieren und weich hinterherziehen.
export function advanceRemote(r, dt) {
  r.tx += r.vx * dt
  r.tz += r.vz * dt
  const k = Math.min(1, 8 * dt)
  r.x += (r.tx - r.x) * k
  r.z += (r.tz - r.z) * k
  const still = Math.hypot(r.vx, r.vz) < 0.05 && Math.hypot(r.tx - r.x, r.tz - r.z) < 0.08
  return still
}
