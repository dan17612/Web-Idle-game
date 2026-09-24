// Wischsteuerung für BlockFall — reine Logik, liefert Aktionen statt sie
// selbst auszuführen (BlockFallView wendet sie auf das Spiel an).
//
// - Tippen                → 'rotate'
// - seitlich ziehen       → 'left' / 'right', ein Schritt pro ~0,8 Zellen,
//                           der Stein folgt dem Finger
// - langsam runterziehen  → 'soft' pro Zelle
// - schnell nach unten    → 'drop'
// - schnell nach oben     → 'hold'
//
// Die Geste sperrt sich auf eine Achse, sobald sie eindeutig ist. Wer erst
// seitlich schiebt und dann deutlich nach unten zieht, wechselt auf die
// senkrechte Achse — zurück geht es nicht, damit ein Fallenlassen nie
// seitlich verrutscht.

export const TAP_SLOP = 10 // px — darunter gilt die Berührung als Tippen
export const TAP_MAX_MS = 280
export const FLICK_MIN_PX = 40
export const FLICK_SPEED = 0.6 // px/ms über die letzten ~90 ms
const LOCK_PX = 10

export class SwipeTracker {
  constructor(cellPx = 30) {
    this.setCell(cellPx)
    this.active = false
  }

  setCell(cellPx) {
    const c = Math.max(8, Number(cellPx) || 30)
    this.stepX = Math.max(16, c * 0.8)
    this.stepY = Math.max(16, c)
  }

  start(x, y, t) {
    this.active = true
    this.x0 = x
    this.y0 = y
    this.t0 = t
    this.maxDist = 0
    this.samples = [{ x, y, t }]
    this._rebaseAt(x, y, null)
  }

  _rebaseAt(x, y, axis) {
    this.axis = axis
    this.ox = x
    this.oy = y
    this.cellsX = 0
    this.cellsY = 0
    this.lastStepX = x
    this.lastStepY = y
  }

  // Neuer Stein mitten in der Geste: vom aktuellen Punkt aus neu zählen.
  rebase(x, y) {
    if (!this.active) return
    this._rebaseAt(x, y, null)
  }

  move(x, y, t) {
    if (!this.active) return []
    this.samples.push({ x, y, t })
    while (this.samples.length > 2 && t - this.samples[0].t > 90) this.samples.shift()
    this.maxDist = Math.max(this.maxDist, Math.hypot(x - this.x0, y - this.y0))

    const out = []
    const dx = x - this.ox
    const dy = y - this.oy
    if (!this.axis) {
      if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return out
      this.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y'
    }

    if (this.axis === 'x') {
      // Deutlich nach unten weitergezogen, ohne seitlich zu schieben → senkrecht.
      if (y - this.lastStepY > this.stepY * 1.5 && Math.abs(x - this.lastStepX) < this.stepX * 0.6) {
        this._rebaseAt(x, this.lastStepY, 'y')
        return out.concat(this._vertical(y))
      }
      const want = Math.trunc(dx / this.stepX)
      while (this.cellsX < want) { this.cellsX++; out.push('right') }
      while (this.cellsX > want) { this.cellsX--; out.push('left') }
      if (out.length) { this.lastStepX = x; this.lastStepY = y }
      return out
    }
    return out.concat(this._vertical(y))
  }

  _vertical(y) {
    const out = []
    const want = Math.max(0, Math.trunc((y - this.oy) / this.stepY))
    while (this.cellsY < want) { this.cellsY++; out.push('soft') }
    return out
  }

  velocity() {
    const a = this.samples[0]
    const b = this.samples[this.samples.length - 1]
    const dt = Math.max(1, b.t - a.t)
    return { vx: (b.x - a.x) / dt, vy: (b.y - a.y) / dt }
  }

  end(x, y, t) {
    if (!this.active) return []
    const out = this.move(x, y, t)
    this.active = false
    const dt = t - this.t0
    if (this.maxDist < TAP_SLOP && dt < TAP_MAX_MS) return ['rotate']
    const totalY = y - this.y0
    const { vx, vy } = this.velocity()
    const vertical = this.axis !== 'x' || Math.abs(vy) > Math.abs(vx) * 1.5
    if (vertical && totalY > FLICK_MIN_PX && vy > FLICK_SPEED) return out.concat('drop')
    if (vertical && totalY < -FLICK_MIN_PX && vy < -FLICK_SPEED) return out.concat('hold')
    return out
  }

  cancel() {
    this.active = false
  }
}
