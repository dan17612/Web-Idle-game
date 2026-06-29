// Zoo-Parkour 3D-Engine (Three.js). Framework-unabhängig: bekommt ein Canvas +
// eine Strecke (aus parkourCourse.js) und meldet Fortschritt/Absturz/Ziel über
// Callbacks zurück. Three.js wird dynamisch importiert, damit es per
// Code-Splitting nur in dieser View geladen wird. dispose() räumt alle
// GPU-Ressourcen + Listener auf (kein WebGL-Context-Leak).

import { PHYSICS, laneToX, nearestLane } from './parkourCourse.js'

const LANE_LERP = 13 // Tempo des Spurwechsels (höher = schneppiger)
const FALL_DEATH_Y = -1.4 // ab hier zählt ein Sturz in die Lücke (auch 1-Reihen-Lücken erfordern einen Sprung)
const RESPAWN_FREEZE = 0.5 // Sekunden Pause nach Respawn
const CAM_BACK = 8
const CAM_HEIGHT = 4.6

export class ParkourEngine {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas
    this.cb = callbacks
    this.THREE = null
    this.rafId = 0
    this.lastTs = 0
    this.disposed = false

    this.course = null
    this.running = false
    this.finished = false
    this.falls = 0
    this.freezeUntil = 0
    this.time = 0
    this.lastPct = -1

    this.player = null // Spielzustand { z, x, lane, target, y, vy, grounded }
    this.movers = []
    this.levelGroup = null
    this._disposables = new Set()
  }

  async init() {
    const THREE = await import('three')
    if (this.disposed) return
    this.THREE = THREE

    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    this.renderer = renderer

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xfdf4dd) // Cream-Look des Spiels
    scene.fog = new THREE.Fog(0xfdf4dd, 34, 78)
    this.scene = scene

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 220)

    const hemi = new THREE.HemisphereLight(0xfff6e0, 0x6f8f4f, 1.05)
    scene.add(hemi)
    const sun = new THREE.DirectionalLight(0xffffff, 1.1)
    sun.position.set(-8, 18, -6)
    scene.add(sun)

    this.player3d = this._buildAnimal()
    scene.add(this.player3d)

    this.blob = new THREE.Mesh(
      this._track(new THREE.CircleGeometry(0.9, 18)),
      this._track(new THREE.MeshBasicMaterial({ color: 0x2b3a1a, transparent: true, opacity: 0.28 }))
    )
    this.blob.rotation.x = -Math.PI / 2
    this.blob.position.y = 0.04
    scene.add(this.blob)
  }

  // ── Level-Aufbau ────────────────────────────────────────────────────────
  build(course) {
    const THREE = this.THREE
    this.course = course
    this.finished = false
    this.running = false
    this.falls = 0
    this.time = 0
    this.freezeUntil = 0
    this.lastPct = -1
    this.movers = []

    if (this.levelGroup) {
      this.scene.remove(this.levelGroup)
      this._disposeObject(this.levelGroup)
    }
    const group = new THREE.Group()
    this.levelGroup = group

    const tile = course.tile
    const rows = course.rows

    // Plattform-Kacheln als InstancedMesh (eine Draw-Call für alle).
    const cells = []
    for (let r = 0; r < rows.length; r++) {
      for (let l = 0; l < 3; l++) {
        if (rows[r].lanes[l]) cells.push({ r, l, cp: rows[r].checkpoint, fin: rows[r].finish })
      }
    }
    const tileGeo = this._track(new THREE.BoxGeometry(course.laneWidth * 0.92, 1, tile * 0.96))
    const tileMat = this._track(new THREE.MeshLambertMaterial())
    const tiles = new THREE.InstancedMesh(tileGeo, tileMat, cells.length)
    const m = new THREE.Matrix4()
    const col = new THREE.Color()
    cells.forEach((c, i) => {
      m.makeTranslation(laneToX(c.l), -0.5, c.r * tile)
      tiles.setMatrixAt(i, m)
      if (c.fin) col.setHex(0xffd54a)
      else if (c.cp) col.setHex(0x57c7a8)
      else col.setHSL(0.27, 0.5, 0.42 + ((c.r * 7 + c.l) % 5) * 0.03)
      tiles.setColorAt(i, col)
    })
    tiles.instanceMatrix.needsUpdate = true
    if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true
    group.add(tiles)

    // Barrieren als InstancedMesh.
    const bars = []
    for (let r = 0; r < rows.length; r++) {
      for (let l = 0; l < 3; l++) {
        if (rows[r].lanes[l]?.obstacle) bars.push({ r, l, h: rows[r].lanes[l].obstacle.h })
      }
    }
    if (bars.length) {
      const bGeo = this._track(new THREE.BoxGeometry(course.laneWidth * 0.78, 1, tile * 0.42))
      const bMat = this._track(new THREE.MeshLambertMaterial({ color: 0xef476f }))
      const barMesh = new THREE.InstancedMesh(bGeo, bMat, bars.length)
      bars.forEach((b, i) => {
        m.makeScale(1, b.h, 1).setPosition(laneToX(b.l), b.h / 2, b.r * tile)
        barMesh.setMatrixAt(i, m)
      })
      barMesh.instanceMatrix.needsUpdate = true
      group.add(barMesh)
    }

    // Bewegliche Barrieren (einzelne Meshes, wenige).
    const moverGeo = this._track(new THREE.BoxGeometry(course.laneWidth * 0.7, 1, tile * 0.42))
    const moverMat = this._track(new THREE.MeshLambertMaterial({ color: 0xb05cff }))
    for (let r = 0; r < rows.length; r++) {
      const mv = rows[r].mover
      if (!mv) continue
      const mesh = new THREE.Mesh(moverGeo, moverMat)
      mesh.scale.y = mv.h
      mesh.position.set(laneToX(mv.from), mv.h / 2, r * tile)
      group.add(mesh)
      this.movers.push({ ...mv, row: r, mesh })
    }

    this._buildFinish(course)
    this._buildDecor(course)
    this.scene.add(group)

    // Spieler an den Start.
    this.player = { z: 0, x: 0, lane: 1, target: 1, y: 0, vy: 0, grounded: true, squash: 0 }
    this._syncPlayer()
    this._updateCamera(true)
    this.render()
  }

  _buildFinish(course) {
    const THREE = this.THREE
    const z = course.finishRow * course.tile
    const w = course.laneWidth * 3
    const postGeo = this._track(new THREE.BoxGeometry(0.25, 4, 0.25))
    const postMat = this._track(new THREE.MeshLambertMaterial({ color: 0x6d5640 }))
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, postMat)
      post.position.set(sx * (w / 2), 2, z)
      this.levelGroup.add(post)
    }
    const tex = this._checkerTexture()
    const banner = new THREE.Mesh(
      this._track(new THREE.PlaneGeometry(w, 1.1)),
      this._track(new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }))
    )
    banner.position.set(0, 3.6, z)
    this.levelGroup.add(banner)
  }

  _buildDecor(course) {
    const THREE = this.THREE
    const trunkGeo = this._track(new THREE.CylinderGeometry(0.16, 0.22, 1.1, 6))
    const trunkMat = this._track(new THREE.MeshLambertMaterial({ color: 0x7a5230 }))
    const leafGeo = this._track(new THREE.ConeGeometry(1.0, 2.2, 7))
    const leafMat = this._track(new THREE.MeshLambertMaterial({ color: 0x3e9d4f }))
    for (let r = 6; r < course.rowCount - 4; r += 5) {
      const side = (r % 10 === 6) ? -1 : 1
      const off = course.laneWidth * 2 + 1.4 + ((r * 13) % 5) * 0.4
      const x = side * off
      const z = r * course.tile
      const trunk = new THREE.Mesh(trunkGeo, trunkMat)
      trunk.position.set(x, -0.4, z)
      const leaf = new THREE.Mesh(leafGeo, leafMat)
      const s = 0.8 + ((r * 7) % 4) * 0.18
      leaf.scale.setScalar(s)
      leaf.position.set(x, 0.7 + s, z)
      this.levelGroup.add(trunk, leaf)
    }
  }

  _buildAnimal() {
    const THREE = this.THREE
    const g = new THREE.Group()
    const inner = new THREE.Group() // für Hüpf-/Squash-Animation
    g.add(inner)
    this._animInner = inner

    const box = (w, h, d, color, x, y, z) => {
      const mesh = new THREE.Mesh(
        this._track(new THREE.BoxGeometry(w, h, d)),
        this._track(new THREE.MeshLambertMaterial({ color }))
      )
      mesh.position.set(x, y, z)
      inner.add(mesh)
      return mesh
    }
    const ORANGE = 0xff8a3d
    const LIGHT = 0xffb070
    box(1.0, 0.8, 1.4, ORANGE, 0, 0.7, 0) // Körper
    box(0.8, 0.74, 0.7, LIGHT, 0, 1.12, 0.62) // Kopf
    box(0.42, 0.34, 0.32, 0xfff0dd, 0, 0.98, 1.02) // Schnauze
    box(0.22, 0.32, 0.14, ORANGE, -0.27, 1.58, 0.58) // Ohr L
    box(0.22, 0.32, 0.14, ORANGE, 0.27, 1.58, 0.58) // Ohr R
    box(0.13, 0.13, 0.08, 0x232323, -0.2, 1.22, 0.99) // Auge L
    box(0.13, 0.13, 0.08, 0x232323, 0.2, 1.22, 0.99) // Auge R
    box(0.2, 0.4, 0.2, LIGHT, -0.32, 0.2, 0.42) // Bein VL
    box(0.2, 0.4, 0.2, LIGHT, 0.32, 0.2, 0.42) // Bein VR
    box(0.2, 0.4, 0.2, LIGHT, -0.32, 0.2, -0.42) // Bein HL
    box(0.2, 0.4, 0.2, LIGHT, 0.32, 0.2, -0.42) // Bein HR
    box(0.18, 0.18, 0.6, ORANGE, 0, 0.8, -0.9) // Schwanz
    return g
  }

  _checkerTexture() {
    const THREE = this.THREE
    const c = document.createElement('canvas')
    c.width = 64; c.height = 16
    const ctx = c.getContext('2d')
    const cell = 8
    for (let y = 0; y < c.height; y += cell) {
      for (let x = 0; x < c.width; x += cell) {
        ctx.fillStyle = ((x / cell + y / cell) % 2 === 0) ? '#ffffff' : '#222222'
        ctx.fillRect(x, y, cell, cell)
      }
    }
    const tex = new THREE.CanvasTexture(c)
    this._disposables.add(tex)
    return tex
  }

  // ── Steuerung ─────────────────────────────────────────────────────────
  begin() {
    if (this.finished) return
    this.running = true
  }

  moveLane(dir) {
    if (!this.player || !this.running || this.finished) return
    this.player.target = Math.max(0, Math.min(2, this.player.target + Math.sign(dir)))
  }

  jump() {
    if (!this.player || this.finished) return
    if (!this.running) { this.begin(); return }
    if (this.player.grounded) {
      this.player.vy = PHYSICS.jumpV
      this.player.grounded = false
      this.player.squash = 0.35
    }
  }

  // ── Spiel-Loop ────────────────────────────────────────────────────────
  start() {
    this.lastTs = 0
    if (!this.rafId) this.rafId = requestAnimationFrame((t) => this._loop(t))
  }

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.rafId = 0
  }

  _loop(ts) {
    this.rafId = 0
    if (this.disposed) return
    if (!this.lastTs) this.lastTs = ts
    const dt = Math.min(0.05, (ts - this.lastTs) / 1000)
    this.lastTs = ts
    this._update(dt)
    this.render()
    if (!this.disposed) this.rafId = requestAnimationFrame((t) => this._loop(t))
  }

  _update(dt) {
    const p = this.player
    if (!p || this.finished) return
    this.time += dt
    const course = this.course
    const tile = course.tile

    // Spurwechsel weich interpolieren.
    const targetX = laneToX(p.target)
    p.x += (targetX - p.x) * Math.min(1, LANE_LERP * dt)
    p.lane = nearestLane(p.x)

    const frozen = this.time < this.freezeUntil
    if (this.running && !frozen) p.z += course.speed * dt

    // Vertikale Physik.
    const row = Math.round(p.z / tile)
    const laneIdx = nearestLane(p.x)
    const support = !!(course.rows[row] && course.rows[row].lanes[laneIdx])

    if (p.grounded) {
      if (support) {
        p.y = 0; p.vy = 0
      } else {
        p.grounded = false // über eine Lücke gelaufen
      }
    }
    if (!p.grounded) {
      p.vy -= PHYSICS.gravity * dt
      p.y += p.vy * dt
      if (p.vy <= 0 && support && p.y <= 0) {
        p.y = 0; p.vy = 0; p.grounded = true; p.squash = 0.3
      }
      if (!support && p.y < FALL_DEATH_Y) { this._respawn(); return }
    }

    // Barriere-Kollision (statisch).
    const cell = course.rows[row]?.lanes[laneIdx]
    if (cell?.obstacle && p.y < cell.obstacle.h - 0.15) { this._respawn(); return }

    // Bewegliche Barrieren animieren + Kollision.
    for (const mv of this.movers) {
      const f = (Math.sin(this.time * mv.speed + mv.phase) + 1) / 2
      const laneF = mv.from + (mv.to - mv.from) * f
      const mx = laneToX(laneF)
      mv.mesh.position.x = mx
      if (row === mv.row && Math.abs(p.x - mx) < course.laneWidth * 0.55 && p.y < mv.h - 0.15) {
        this._respawn(); return
      }
    }

    // Ziel erreicht.
    if (row >= course.finishRow) {
      this.finished = true
      this.running = false
      this._syncPlayer()
      this.cb.onFinish?.()
      return
    }

    // Fortschritt melden.
    const pct = Math.max(0, Math.min(100, Math.round((p.z / (course.finishRow * tile)) * 100)))
    if (pct !== this.lastPct) { this.lastPct = pct; this.cb.onProgress?.(pct) }

    if (p.squash > 0) p.squash = Math.max(0, p.squash - dt * 2.4)
    this._syncPlayer()
    this._updateCamera(false)
  }

  _respawn() {
    const p = this.player
    const course = this.course
    this.falls += 1
    try { navigator.vibrate?.(110) } catch {}
    // letzten Checkpoint <= aktueller Reihe finden.
    const row = Math.round(p.z / course.tile)
    let cp = 0
    for (const c of course.checkpoints) { if (c <= row) cp = c; else break }
    p.z = cp * course.tile
    p.x = 0; p.lane = 1; p.target = 1
    p.y = 0; p.vy = 0; p.grounded = true; p.squash = 0
    this.freezeUntil = this.time + RESPAWN_FREEZE
    this._syncPlayer()
    this._updateCamera(true)
    this.cb.onFall?.(this.falls)
  }

  _syncPlayer() {
    const p = this.player
    if (!p || !this.player3d) return
    this.player3d.position.set(p.x, p.y, p.z)
    // leichter Lauf-Bob + Squash beim Landen/Springen.
    const bob = this.running && p.grounded ? Math.sin(this.time * 14) * 0.06 : 0
    const inner = this._animInner
    if (inner) {
      inner.position.y = bob
      const sq = p.squash
      inner.scale.set(1 + sq * 0.5, 1 - sq * 0.6, 1 + sq * 0.5)
    }
    if (this.blob) {
      this.blob.position.set(p.x, 0.04, p.z)
      const fade = Math.max(0, 1 - Math.abs(p.y) / 3)
      this.blob.material.opacity = 0.28 * fade
    }
  }

  _updateCamera(snap) {
    const p = this.player
    if (!p) return
    const tx = p.x * 0.5
    const ty = CAM_HEIGHT
    const tz = p.z - CAM_BACK
    const cam = this.camera
    if (snap) cam.position.set(tx, ty, tz)
    else {
      cam.position.x += (tx - cam.position.x) * 0.12
      cam.position.y += (ty - cam.position.y) * 0.1
      cam.position.z += (tz - cam.position.z) * 0.18
    }
    cam.lookAt(p.x * 0.35, 1.2, p.z + 7)
  }

  resize(w, h) {
    if (!this.renderer || !this.camera) return
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.render()
  }

  render() {
    if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera)
  }

  // ── Ressourcen ──────────────────────────────────────────────────────────
  _track(resource) {
    this._disposables.add(resource)
    return resource
  }

  _disposeObject(obj) {
    obj.traverse?.((o) => {
      if (o.geometry) o.geometry.dispose()
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        for (const mt of mats) { mt.map?.dispose?.(); mt.dispose?.() }
      }
    })
  }

  dispose() {
    this.disposed = true
    this.stop()
    if (this.levelGroup) this._disposeObject(this.levelGroup)
    if (this.scene) this._disposeObject(this.scene)
    for (const d of this._disposables) d.dispose?.()
    this._disposables.clear()
    if (this.renderer) {
      this.renderer.dispose()
      this.renderer.forceContextLoss?.()
    }
    this.scene = null
    this.camera = null
    this.player = null
    this.movers = []
  }
}
