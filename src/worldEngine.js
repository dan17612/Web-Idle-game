// Zoo-Welt 3D-Engine (Three.js). Framework-unabhängig: bekommt ein Canvas,
// rendert Platz, Farmen und Spieler und meldet Interaktions-Zonen über
// Callbacks. Three.js wird dynamisch importiert (Code-Splitting wie beim
// Parkour), dispose() räumt alle GPU-Ressourcen auf.

import {
  WORLD, POI, COLLIDERS, FARM,
  plotPosition, resolveCollision, nearestZone, advanceRemote,
} from './world.js'

const CAM_BACK = 11
const CAM_HEIGHT = 7.5
const CAM_DRIVE_EXTRA = 3
const PLAYER_RADIUS = 0.7
const FARM_DETAIL_DIST = 55
const EMOTE_SECONDS = 2.2

export class WorldEngine {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas
    this.cb = callbacks
    this.THREE = null
    this.rafId = 0
    this.lastTs = 0
    this.time = 0
    this.disposed = false

    this.input = { x: 0, y: 0 }
    this.me = null // { x, z, vx, vz, angle, moving, driving, speed }
    this.remotes = new Map() // uid -> Remote
    this.farmGroups = []
    this.farmAnims = []
    this.particles = []
    this.emotes = []
    this.zone = null
    this.zoneFarms = []
    this.ownUserId = null
    this._zoneTimer = 0
    this._detailTimer = 0
    this._emojiMats = new Map()
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
    scene.background = new THREE.Color(0xbfe7fa)
    scene.fog = new THREE.Fog(0xbfe7fa, 70, 150)
    this.scene = scene

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 420)

    const hemi = new THREE.HemisphereLight(0xfff6e0, 0x6f9f5f, 1.1)
    scene.add(hemi)
    const sun = new THREE.DirectionalLight(0xffffff, 1.0)
    sun.position.set(-30, 50, -20)
    scene.add(sun)

    this._buildStaticWorld()
  }

  // ── Statische Welt: Boden, Platz, Brunnen, Shop, Tor, Deko ─────────────
  _buildStaticWorld() {
    const THREE = this.THREE
    const g = new THREE.Group()
    this.worldGroup = g

    const ground = new THREE.Mesh(
      this._track(new THREE.CircleGeometry(WORLD.radius + 60, 48)),
      this._track(new THREE.MeshLambertMaterial({ color: 0x86d16a }))
    )
    ground.rotation.x = -Math.PI / 2
    g.add(ground)

    const plaza = new THREE.Mesh(
      this._track(new THREE.CircleGeometry(WORLD.plazaRadius, 40)),
      this._track(new THREE.MeshLambertMaterial({ color: 0xf0e0b8 }))
    )
    plaza.rotation.x = -Math.PI / 2
    plaza.position.y = 0.02
    g.add(plaza)

    const pathGeo = this._track(new THREE.PlaneGeometry(3.4, 34))
    const pathMat = this._track(new THREE.MeshLambertMaterial({ color: 0xe6d4a8 }))
    for (let i = 0; i < 4; i++) {
      const path = new THREE.Mesh(pathGeo, pathMat)
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4
      path.rotation.x = -Math.PI / 2
      path.rotation.z = -a
      path.position.set(Math.cos(a) * 30, 0.015, Math.sin(a) * 30)
      g.add(path)
    }

    this._buildFountain(g)
    this._buildShop(g)
    this._buildGate(g)
    this._buildLanterns(g)
    this._buildTrees(g)

    this.scene.add(g)
  }

  _buildFountain(parent) {
    const THREE = this.THREE
    const f = new THREE.Group()
    f.position.set(POI.fountain.x, 0, POI.fountain.z)
    const stone = this._track(new THREE.MeshLambertMaterial({ color: 0xcfd8dc }))
    const base = new THREE.Mesh(this._track(new THREE.CylinderGeometry(3, 3.2, 0.7, 24)), stone)
    base.position.y = 0.35
    f.add(base)
    const water = new THREE.Mesh(
      this._track(new THREE.CylinderGeometry(2.5, 2.5, 0.5, 24)),
      this._track(new THREE.MeshLambertMaterial({ color: 0x64c7f0 }))
    )
    water.position.y = 0.6
    f.add(water)
    const pillar = new THREE.Mesh(this._track(new THREE.CylinderGeometry(0.4, 0.55, 1.6, 12)), stone)
    pillar.position.y = 1.4
    f.add(pillar)
    const bowl = new THREE.Mesh(this._track(new THREE.CylinderGeometry(1.1, 0.7, 0.4, 16)), stone)
    bowl.position.y = 2.25
    f.add(bowl)
    this.fountainDrop = new THREE.Mesh(
      this._track(new THREE.SphereGeometry(0.22, 10, 10)),
      this._track(new THREE.MeshLambertMaterial({ color: 0x9fdcf7 }))
    )
    this.fountainDrop.position.y = 2.6
    f.add(this.fountainDrop)
    const coin = this._emojiSprite('🪙', 1.4)
    coin.position.y = 4
    f.add(coin)
    this.fountainCoin = coin
    parent.add(f)
  }

  _buildShop(parent) {
    const THREE = this.THREE
    const s = new THREE.Group()
    s.position.set(POI.shop.x, 0, POI.shop.z)
    const body = new THREE.Mesh(
      this._track(new THREE.BoxGeometry(7.5, 4.2, 6)),
      this._track(new THREE.MeshLambertMaterial({ color: 0xffe1b0 }))
    )
    body.position.y = 2.1
    s.add(body)
    const roof = new THREE.Mesh(
      this._track(new THREE.ConeGeometry(6, 2.6, 4)),
      this._track(new THREE.MeshLambertMaterial({ color: 0xef476f }))
    )
    roof.position.y = 5.4
    roof.rotation.y = Math.PI / 4
    s.add(roof)
    const door = new THREE.Mesh(
      this._track(new THREE.PlaneGeometry(1.8, 2.6)),
      this._track(new THREE.MeshLambertMaterial({ color: 0x8d6e63 }))
    )
    door.position.set(2.2, 1.3, 3.02)
    s.add(door)
    const sign = this._textSprite('🛍️ Shop', 42)
    sign.position.set(0, 7.2, 0)
    s.add(sign)
    parent.add(s)
  }

  _buildGate(parent) {
    const THREE = this.THREE
    const gate = new THREE.Group()
    gate.position.set(POI.gate.x, 0, POI.gate.z)
    const postGeo = this._track(new THREE.CylinderGeometry(0.45, 0.55, 5.2, 10))
    const postMat = this._track(new THREE.MeshLambertMaterial({ color: 0xa5713f }))
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, postMat)
      post.position.set(sx * 2.6, 2.6, 0)
      gate.add(post)
    }
    const top = new THREE.Mesh(
      this._track(new THREE.BoxGeometry(6.4, 0.9, 0.9)),
      postMat
    )
    top.position.y = 5.3
    gate.add(top)
    const sign = this._textSprite('🦁 Mein Zoo', 42)
    sign.position.set(0, 7, 0)
    gate.add(sign)
    parent.add(gate)
  }

  _buildLanterns(parent) {
    const THREE = this.THREE
    const poleGeo = this._track(new THREE.CylinderGeometry(0.12, 0.16, 3.4, 8))
    const poleMat = this._track(new THREE.MeshLambertMaterial({ color: 0x5c4a32 }))
    const lampGeo = this._track(new THREE.SphereGeometry(0.4, 10, 10))
    const lampMat = this._track(new THREE.MeshLambertMaterial({ color: 0xffe28a, emissive: 0xcc9a2e }))
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3
      const x = Math.cos(a) * (WORLD.plazaRadius + 1.5)
      const z = Math.sin(a) * (WORLD.plazaRadius + 1.5)
      const pole = new THREE.Mesh(poleGeo, poleMat)
      pole.position.set(x, 1.7, z)
      const lamp = new THREE.Mesh(lampGeo, lampMat)
      lamp.position.set(x, 3.5, z)
      parent.add(pole, lamp)
    }
  }

  _buildTrees(parent) {
    const THREE = this.THREE
    const spots = []
    for (let i = 0; i < 26; i++) {
      const a = i * 2.399963 // goldener Winkel: gleichmäßig, deterministisch
      const r = 22 + ((i * 37) % 13)
      spots.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, s: 0.8 + ((i * 7) % 4) * 0.2 })
    }
    for (let i = 0; i < 40; i++) {
      const a = i * 0.157 + 0.4
      const r = WORLD.radius + 4 + ((i * 11) % 3) * 3
      spots.push({ x: Math.cos(a * 40) * r, z: Math.sin(a * 40) * r, s: 1.4 + ((i * 5) % 3) * 0.3 })
    }
    const trunkGeo = this._track(new THREE.CylinderGeometry(0.18, 0.26, 1.2, 6))
    const trunkMat = this._track(new THREE.MeshLambertMaterial({ color: 0x7a5230 }))
    const leafGeo = this._track(new THREE.ConeGeometry(1.1, 2.4, 7))
    const leafMat = this._track(new THREE.MeshLambertMaterial({ color: 0x3e9d4f }))
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, spots.length)
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, spots.length)
    const m = new THREE.Matrix4()
    spots.forEach((p, i) => {
      const inPlaza = Math.hypot(p.x, p.z) < WORLD.plazaRadius + 3
      const nearPoi = COLLIDERS.some(c => Math.hypot(p.x - c.x, p.z - c.z) < c.r + 3)
      const s = (inPlaza || nearPoi) ? 0.0001 : p.s
      m.makeScale(s, s, s).setPosition(p.x, 0.55 * s, p.z)
      trunks.setMatrixAt(i, m)
      m.makeScale(s, s, s).setPosition(p.x, (1.15 + 1.2) * s, p.z)
      leaves.setMatrixAt(i, m)
    })
    trunks.instanceMatrix.needsUpdate = true
    leaves.instanceMatrix.needsUpdate = true
    parent.add(trunks, leaves)
  }

  // ── Farmen ──────────────────────────────────────────────────────────────
  // farms: [{ plot, user_id, username, own, visual {ground,fence,deco}, animals: [emoji] }]
  setFarms(farms) {
    const THREE = this.THREE
    if (!THREE) return
    for (const fg of this.farmGroups) {
      this.scene.remove(fg)
      this._disposeObject(fg)
    }
    this.farmGroups = []
    this.farmAnims = []
    this.zoneFarms = farms.map(f => ({ plot: f.plot, user_id: f.user_id, username: f.username }))

    const groundGeo = this._track(new THREE.PlaneGeometry(FARM.w, FARM.d))
    const postGeo = this._track(new THREE.BoxGeometry(0.28, 1.1, 0.28))

    for (const farm of farms) {
      const pos = plotPosition(farm.plot)
      const group = new THREE.Group()
      group.position.set(pos.x, 0, pos.z)
      group.rotation.y = -pos.angle + Math.PI / 2 // Front zeigt zum Platz

      const ground = new THREE.Mesh(
        groundGeo,
        this._track(new THREE.MeshLambertMaterial({ color: farm.visual.ground }))
      )
      ground.rotation.x = -Math.PI / 2
      ground.position.y = 0.03
      group.add(ground)

      if (farm.own) {
        const ring = new THREE.Mesh(
          this._track(new THREE.RingGeometry(FARM.w * 0.62, FARM.w * 0.62 + 0.5, 32)),
          this._track(new THREE.MeshBasicMaterial({ color: 0xf4a912, transparent: true, opacity: 0.55 }))
        )
        ring.rotation.x = -Math.PI / 2
        ring.position.y = 0.05
        group.add(ring)
      }

      // Zaunpfosten mit Lücke an der Vorderseite (Eingang).
      const posts = []
      const stepX = 1.6
      for (let x = -FARM.w / 2; x <= FARM.w / 2 + 0.01; x += stepX) {
        posts.push({ x, z: -FARM.d / 2 })
        if (Math.abs(x) > 1.8) posts.push({ x, z: FARM.d / 2 })
      }
      for (let z = -FARM.d / 2 + stepX; z < FARM.d / 2; z += stepX) {
        posts.push({ x: -FARM.w / 2, z })
        posts.push({ x: FARM.w / 2, z })
      }
      const fenceMat = this._track(new THREE.MeshLambertMaterial({ color: farm.visual.fence }))
      const fence = new THREE.InstancedMesh(postGeo, fenceMat, posts.length)
      const m = new THREE.Matrix4()
      posts.forEach((p, i) => {
        m.makeTranslation(p.x, 0.55, p.z)
        fence.setMatrixAt(i, m)
      })
      fence.instanceMatrix.needsUpdate = true
      group.add(fence)

      // Detail-Gruppe (Schild, Tiere, Deko) wird auf Distanz ausgeblendet.
      const detail = new THREE.Group()
      const sign = this._textSprite(`${farm.username}`, 34)
      sign.position.set(0, 2.6, FARM.d / 2 + 0.6)
      detail.add(sign)

      farm.visual.deco.forEach((emoji, i) => {
        const d = this._emojiSprite(emoji, 1.6)
        const sx = (i % 2 === 0 ? -1 : 1) * (FARM.w / 2 - 1.4)
        const sz = (i < 2 ? -1 : 1) * (FARM.d / 2 - 1.2)
        d.position.set(sx, 0.9, sz)
        detail.add(d)
      })

      const animals = (farm.animals || []).slice(0, 8)
      animals.forEach((emoji, i) => {
        const sprite = this._emojiSprite(emoji, 1.5)
        const ax = -FARM.w / 2 + 2 + ((i * 2.9) % (FARM.w - 4))
        const az = -FARM.d / 2 + 2 + ((i * 1.9) % (FARM.d - 4))
        sprite.position.set(ax, 0.85, az)
        detail.add(sprite)
        this.farmAnims.push({ sprite, baseX: ax, baseZ: az, phase: i * 1.7 + farm.plot, r: 0.9 })
      })

      group.add(detail)
      group.userData.detail = detail
      group.userData.center = { x: pos.x, z: pos.z }
      this.scene.add(group)
      this.farmGroups.push(group)
    }
    this._updateFarmDetail(true)
  }

  _updateFarmDetail(force) {
    if (!this.me) return
    for (const g of this.farmGroups) {
      const c = g.userData.center
      const near = Math.hypot(this.me.x - c.x, this.me.z - c.z) < FARM_DETAIL_DIST
      if (force || g.userData.detail.visible !== near) g.userData.detail.visible = near
    }
  }

  // ── Spieler ─────────────────────────────────────────────────────────────
  setSelf(data) {
    this.ownUserId = data.userId
    this.me = {
      x: data.x, z: data.z, vx: 0, vz: 0,
      angle: Math.PI, moving: false,
      driving: false, carSpeed: 2,
    }
    if (this.selfObj) {
      this.scene.remove(this.selfObj.group)
      this._disposeObject(this.selfObj.group)
    }
    this.selfObj = this._buildPlayerObj(data)
    this.scene.add(this.selfObj.group)
    this._syncPlayerObj(this.selfObj, this.me.x, this.me.z, this.me.angle, 0)
    this._updateCamera(true)
  }

  setInput(x, y) {
    this.input.x = x
    this.input.y = y
  }

  setDriving(driving, carVisualData) {
    if (!this.me || !this.selfObj) return
    this.me.driving = driving
    if (carVisualData) this.me.carSpeed = carVisualData.speed
    this._applyCar(this.selfObj, driving, carVisualData)
  }

  setOutfit(visual, avatar, username) {
    if (!this.selfObj || !this.me) return
    const driving = this.me.driving
    const carVis = this.selfObj.carVisual
    const leash = this.selfObj.leashEmoji
    this.scene.remove(this.selfObj.group)
    this._disposeObject(this.selfObj.group)
    this.selfObj = this._buildPlayerObj({ outfit: visual, avatar, username })
    this.selfObj.carVisual = carVis
    this.scene.add(this.selfObj.group)
    if (driving) this._applyCar(this.selfObj, true, carVis)
    if (leash) this.setLeash(leash)
    this._syncPlayerObj(this.selfObj, this.me.x, this.me.z, this.me.angle, 0)
  }

  setLeash(emoji) {
    if (!this.selfObj) return
    this._applyLeash(this.selfObj, emoji)
  }

  upsertRemote(uid, data) {
    if (uid === this.ownUserId) return
    this.removeRemote(uid)
    const obj = this._buildPlayerObj(data)
    obj.interp = { x: data.x, z: data.z, tx: data.x, tz: data.z, vx: 0, vz: 0 }
    obj.angle = Math.PI
    obj.walk = 0
    this.scene.add(obj.group)
    if (data.car && data.driving) this._applyCar(obj, true, data.car)
    if (data.leash) this._applyLeash(obj, data.leash)
    this.remotes.set(uid, obj)
    this._syncPlayerObj(obj, data.x, data.z, obj.angle, 0)
  }

  moveRemote(uid, data) {
    const r = this.remotes.get(uid)
    if (!r) return
    r.interp.tx = data.x
    r.interp.tz = data.z
    r.interp.vx = data.vx || 0
    r.interp.vz = data.vz || 0
    if (typeof data.driving === 'boolean' && data.driving !== r.driving) {
      this._applyCar(r, data.driving, r.carVisual)
    }
  }

  removeRemote(uid) {
    const r = this.remotes.get(uid)
    if (!r) return
    this.scene.remove(r.group)
    this._disposeObject(r.group)
    this.remotes.delete(uid)
  }

  remoteCount() {
    return this.remotes.size
  }

  setEmote(uid, emoji) {
    const obj = uid === this.ownUserId || uid === 'me' ? this.selfObj : this.remotes.get(uid)
    if (!obj) return
    const sprite = this._emojiSprite(emoji, 1.5)
    sprite.position.set(0, 3.3, 0)
    obj.group.add(sprite)
    this.emotes.push({ sprite, parent: obj.group, t: 0 })
  }

  fountainBurst() {
    for (let i = 0; i < 14; i++) {
      const sprite = this._emojiSprite('🪙', 0.9)
      const a = (i / 14) * Math.PI * 2
      sprite.position.set(POI.fountain.x, 2.4, POI.fountain.z)
      this.scene.add(sprite)
      this.particles.push({
        sprite,
        vx: Math.cos(a) * (2 + (i % 3)),
        vy: 5 + (i % 4),
        vz: Math.sin(a) * (2 + (i % 3)),
        t: 0,
      })
    }
  }

  getSelfPos() {
    if (!this.me) return null
    return {
      x: this.me.x, z: this.me.z,
      vx: this.me.vx, vz: this.me.vz,
      moving: this.me.moving, driving: this.me.driving,
    }
  }

  // ── Spieler-Objekte bauen ───────────────────────────────────────────────
  // data: { outfit {body,hat}, avatar, username }
  _buildPlayerObj(data) {
    const THREE = this.THREE
    const group = new THREE.Group()
    const inner = new THREE.Group()
    group.add(inner)

    const bodyColor = new THREE.Color(data.outfit?.body || '#4da3ff')
    const box = (w, h, d, color, x, y, z, parent = inner) => {
      const mesh = new THREE.Mesh(
        this._track(new THREE.BoxGeometry(w, h, d)),
        this._track(new THREE.MeshLambertMaterial({ color }))
      )
      mesh.position.set(x, y, z)
      parent.add(mesh)
      return mesh
    }

    box(0.9, 1.0, 0.55, bodyColor, 0, 1.05, 0)
    const head = box(0.72, 0.66, 0.66, 0xffe0c2, 0, 1.95, 0)
    const legL = box(0.26, 0.55, 0.3, 0x5c4a32, -0.22, 0.28, 0)
    const legR = box(0.26, 0.55, 0.3, 0x5c4a32, 0.22, 0.28, 0)
    box(0.22, 0.62, 0.26, bodyColor, -0.56, 1.2, 0)
    box(0.22, 0.62, 0.26, bodyColor, 0.56, 1.2, 0)

    const face = this._emojiSprite(data.avatar || '🙂', 0.62)
    face.position.set(0, 1.98, 0.42)
    inner.add(face)

    this._addHat(inner, data.outfit?.hat, bodyColor)

    const label = this._textSprite(data.username || '???', 30)
    label.position.set(0, 2.95, 0)
    group.add(label)

    const blob = new THREE.Mesh(
      this._track(new THREE.CircleGeometry(0.7, 16)),
      this._track(new THREE.MeshBasicMaterial({ color: 0x2b3a1a, transparent: true, opacity: 0.25 }))
    )
    blob.rotation.x = -Math.PI / 2
    blob.position.y = 0.04
    group.add(blob)

    return {
      group, inner, legL, legR,
      driving: false, carGroup: null, carVisual: data.car || null,
      leashEmoji: null, pet: null, leashLine: null,
      petPos: null, walk: 0,
    }
  }

  _addHat(inner, hat, bodyColor) {
    const THREE = this.THREE
    const mat = (color) => this._track(new THREE.MeshLambertMaterial({ color }))
    const add = (geo, color, y, x = 0, z = 0) => {
      const mesh = new THREE.Mesh(this._track(geo), mat(color))
      mesh.position.set(x, y, z)
      inner.add(mesh)
      return mesh
    }
    switch (hat) {
      case 'straw':
        add(new THREE.CylinderGeometry(0.75, 0.8, 0.1, 12), 0xe8c77a, 2.32)
        add(new THREE.CylinderGeometry(0.4, 0.45, 0.28, 12), 0xd9b45f, 2.48)
        break
      case 'cap': {
        add(new THREE.SphereGeometry(0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xef476f, 2.26)
        add(new THREE.BoxGeometry(0.5, 0.07, 0.4), 0xef476f, 2.3, 0, 0.5)
        break
      }
      case 'ranger':
        add(new THREE.CylinderGeometry(0.8, 0.85, 0.09, 12), 0x8d6e63, 2.3)
        add(new THREE.CylinderGeometry(0.42, 0.5, 0.4, 12), 0x795548, 2.52)
        break
      case 'pirate':
        add(new THREE.CylinderGeometry(0.82, 0.88, 0.16, 12), 0x263238, 2.32)
        add(new THREE.CylinderGeometry(0.4, 0.46, 0.34, 12), 0x37474f, 2.54)
        break
      case 'wizard':
        add(new THREE.ConeGeometry(0.55, 1.2, 12), 0x8b5cf6, 2.85)
        break
      case 'crown': {
        add(new THREE.CylinderGeometry(0.42, 0.42, 0.26, 10), 0xf4a912, 2.4)
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2
          add(new THREE.ConeGeometry(0.09, 0.24, 6), 0xf4a912, 2.62, Math.cos(a) * 0.32, Math.sin(a) * 0.32)
        }
        break
      }
      case 'antenna':
        add(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), 0x90a4ae, 2.5)
        add(new THREE.SphereGeometry(0.12, 8, 8), 0xef476f, 2.8)
        break
      case 'dino':
        for (let i = 0; i < 3; i++) {
          add(new THREE.ConeGeometry(0.16, 0.34, 6), 0x2e7d32, 2.35, 0, -0.2 + i * 0.22)
        }
        break
      default:
        break
    }
  }

  _applyCar(obj, driving, visual) {
    const THREE = this.THREE
    obj.driving = driving
    if (visual) obj.carVisual = visual
    if (obj.carGroup) {
      obj.group.remove(obj.carGroup)
      this._disposeObject(obj.carGroup)
      obj.carGroup = null
    }
    if (driving && obj.carVisual) {
      const car = new THREE.Group()
      const color = new THREE.Color(obj.carVisual.color || '#e53935')
      const chassis = new THREE.Mesh(
        this._track(new THREE.BoxGeometry(1.5, 0.55, 2.4)),
        this._track(new THREE.MeshLambertMaterial({ color }))
      )
      chassis.position.y = 0.55
      car.add(chassis)
      const front = new THREE.Mesh(
        this._track(new THREE.BoxGeometry(1.3, 0.35, 0.7)),
        this._track(new THREE.MeshLambertMaterial({ color }))
      )
      front.position.set(0, 0.45, 1.2)
      car.add(front)
      const wheelGeo = this._track(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12))
      const wheelMat = this._track(new THREE.MeshLambertMaterial({ color: 0x263238 }))
      for (const [wx, wz] of [[-0.75, 0.85], [0.75, 0.85], [-0.75, -0.85], [0.75, -0.85]]) {
        const w = new THREE.Mesh(wheelGeo, wheelMat)
        w.rotation.z = Math.PI / 2
        w.position.set(wx, 0.34, wz)
        car.add(w)
      }
      obj.group.add(car)
      obj.carGroup = car
    }
    // Im Auto sitzt die Figur höher, Beine verschwinden im Wagen.
    obj.inner.position.y = driving ? 0.55 : 0
    obj.legL.visible = !driving
    obj.legR.visible = !driving
  }

  _applyLeash(obj, emoji) {
    const THREE = this.THREE
    obj.leashEmoji = emoji || null
    if (obj.pet) {
      this.scene.remove(obj.pet)
      this._disposeObject(obj.pet)
      obj.pet = null
    }
    if (obj.leashLine) {
      this.scene.remove(obj.leashLine)
      obj.leashLine.geometry.dispose()
      obj.leashLine = null
    }
    if (!emoji) return
    const pet = this._emojiSprite(emoji, 1.2)
    const start = obj.group.position
    pet.position.set(start.x - 1.2, 0.65, start.z - 1.2)
    this.scene.add(pet)
    obj.pet = pet
    obj.petPos = { x: pet.position.x, z: pet.position.z }
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(), new THREE.Vector3(),
    ])
    const line = new THREE.Line(geo, this._track(new THREE.LineBasicMaterial({ color: 0x5c4a32 })))
    this.scene.add(line)
    obj.leashLine = line
  }

  // ── Loop ────────────────────────────────────────────────────────────────
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
    this.time += dt
    const me = this.me
    if (!me) return

    // Eigene Bewegung: Joystick-oben = von der Kamera weg (-Z).
    const len = Math.hypot(this.input.x, this.input.y)
    const speed = WORLD.walkSpeed * (me.driving ? me.carSpeed : 1)
    if (len > 0.12) {
      const nx = this.input.x / Math.max(1, len)
      const ny = this.input.y / Math.max(1, len)
      me.vx = nx * speed * Math.min(1, len)
      me.vz = -ny * speed * Math.min(1, len)
      const next = resolveCollision(me.x + me.vx * dt, me.z + me.vz * dt, PLAYER_RADIUS)
      me.x = next.x
      me.z = next.z
      me.angle = Math.atan2(me.vx, me.vz)
      me.moving = true
    } else {
      me.vx = 0
      me.vz = 0
      me.moving = false
    }

    if (this.selfObj) {
      this.selfObj.walk += dt * (me.moving ? (me.driving ? 0 : 10) : 0)
      this._syncPlayerObj(this.selfObj, me.x, me.z, me.angle, dt, me.moving)
    }

    // Entfernte Spieler interpolieren.
    for (const r of this.remotes.values()) {
      const still = advanceRemote(r.interp, dt)
      const dx = r.interp.tx - r.interp.x
      const dz = r.interp.tz - r.interp.z
      if (!still && (Math.abs(r.interp.vx) > 0.05 || Math.abs(r.interp.vz) > 0.05 || Math.hypot(dx, dz) > 0.05)) {
        const ax = Math.abs(r.interp.vx) > 0.05 || Math.abs(r.interp.vz) > 0.05
          ? Math.atan2(r.interp.vx, r.interp.vz)
          : Math.atan2(dx, dz)
        r.angle += (ax - r.angle + Math.PI * 3) % (Math.PI * 2) - Math.PI
        r.walk += dt * (r.driving ? 0 : 9)
      }
      this._syncPlayerObj(r, r.interp.x, r.interp.z, r.angle, dt, !still)
    }

    // Emotes nach oben schweben lassen und ausblenden.
    for (let i = this.emotes.length - 1; i >= 0; i--) {
      const e = this.emotes[i]
      e.t += dt
      e.sprite.position.y = 3.3 + e.t * 0.7
      e.sprite.material.opacity = Math.max(0, 1 - e.t / EMOTE_SECONDS)
      if (e.t >= EMOTE_SECONDS) {
        e.parent.remove(e.sprite)
        e.sprite.material.dispose()
        this.emotes.splice(i, 1)
      }
    }

    // Brunnen-Münzen-Partikel.
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.t += dt
      p.vy -= 12 * dt
      p.sprite.position.x += p.vx * dt
      p.sprite.position.y += p.vy * dt
      p.sprite.position.z += p.vz * dt
      p.sprite.material.opacity = Math.max(0, 1 - p.t / 1.4)
      if (p.t > 1.4 || p.sprite.position.y < 0) {
        this.scene.remove(p.sprite)
        p.sprite.material.dispose()
        this.particles.splice(i, 1)
      }
    }

    // Farm-Tiere wuseln lassen (nur sichtbare Details).
    for (const a of this.farmAnims) {
      if (!a.sprite.parent?.visible) continue
      a.sprite.position.x = a.baseX + Math.sin(this.time * 0.7 + a.phase) * a.r
      a.sprite.position.z = a.baseZ + Math.cos(this.time * 0.5 + a.phase * 1.3) * a.r
      a.sprite.position.y = 0.85 + Math.abs(Math.sin(this.time * 2.2 + a.phase)) * 0.12
    }

    // Brunnen-Animation.
    if (this.fountainDrop) this.fountainDrop.position.y = 2.6 + Math.sin(this.time * 2.4) * 0.25
    if (this.fountainCoin) this.fountainCoin.position.y = 4 + Math.sin(this.time * 1.6) * 0.3

    // Zonen-Check (gedrosselt).
    this._zoneTimer += dt
    if (this._zoneTimer > 0.15) {
      this._zoneTimer = 0
      const zone = nearestZone(me.x, me.z, this.zoneFarms, this.ownUserId)
      const changed = JSON.stringify(zone) !== JSON.stringify(this.zone)
      if (changed) {
        this.zone = zone
        this.cb.onZone?.(zone)
      }
    }
    this._detailTimer += dt
    if (this._detailTimer > 0.5) {
      this._detailTimer = 0
      this._updateFarmDetail(false)
    }

    this._updateCamera(false)
  }

  _syncPlayerObj(obj, x, z, angle, dt, moving = false) {
    obj.group.position.set(x, 0, z)
    obj.group.rotation.y = angle
    const swing = moving && !obj.driving ? Math.sin(obj.walk) * 0.45 : 0
    obj.legL.rotation.x = swing
    obj.legR.rotation.x = -swing
    const bob = moving && !obj.driving ? Math.abs(Math.sin(obj.walk)) * 0.08 : 0
    obj.inner.position.y = (obj.driving ? 0.55 : 0) + bob

    if (obj.pet && dt > 0) {
      if (obj.driving) {
        // Tier hüpft aufs Autodach.
        const k = Math.min(1, 10 * dt)
        obj.petPos.x += (x - obj.petPos.x) * k
        obj.petPos.z += (z - obj.petPos.z) * k
        obj.pet.position.set(obj.petPos.x, 1.6, obj.petPos.z)
        if (obj.leashLine) obj.leashLine.visible = false
      } else {
        const behind = 1.4
        const tx = x - Math.sin(angle) * behind
        const tz = z - Math.cos(angle) * behind
        const k = Math.min(1, 5 * dt)
        obj.petPos.x += (tx - obj.petPos.x) * k
        obj.petPos.z += (tz - obj.petPos.z) * k
        const hop = moving ? Math.abs(Math.sin(this.time * 6)) * 0.18 : 0
        obj.pet.position.set(obj.petPos.x, 0.65 + hop, obj.petPos.z)
        if (obj.leashLine) {
          obj.leashLine.visible = true
          const posAttr = obj.leashLine.geometry.attributes.position
          posAttr.setXYZ(0, x, 1.1, z)
          posAttr.setXYZ(1, obj.petPos.x, 0.75, obj.petPos.z)
          posAttr.needsUpdate = true
        }
      }
    }
  }

  _updateCamera(snap) {
    const me = this.me
    if (!me) return
    const back = CAM_BACK + (me.driving ? CAM_DRIVE_EXTRA : 0)
    const tx = me.x
    const ty = CAM_HEIGHT + (me.driving ? 1.2 : 0)
    const tz = me.z + back
    const cam = this.camera
    if (snap) cam.position.set(tx, ty, tz)
    else {
      cam.position.x += (tx - cam.position.x) * 0.1
      cam.position.y += (ty - cam.position.y) * 0.08
      cam.position.z += (tz - cam.position.z) * 0.1
    }
    cam.lookAt(me.x, 1.4, me.z)
  }

  // ── Sprites & Texturen ──────────────────────────────────────────────────
  _emojiMaterial(emoji, px) {
    const key = `${emoji}@${px}`
    if (this._emojiMats.has(key)) return this._emojiMats.get(key)
    const THREE = this.THREE
    const c = document.createElement('canvas')
    c.width = px
    c.height = px
    const ctx = c.getContext('2d')
    ctx.font = `${Math.round(px * 0.82)}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(emoji, px / 2, px / 2 + px * 0.04)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true })
    this._disposables.add(tex)
    this._disposables.add(mat)
    this._emojiMats.set(key, mat)
    return mat
  }

  _emojiSprite(emoji, size) {
    const THREE = this.THREE
    // Emotes/Partikel brauchen eigene Materialien (Opacity-Animation).
    const shared = this._emojiMaterial(emoji, 96)
    const mat = shared.clone()
    this._disposables.add(mat)
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(size, size, 1)
    return sprite
  }

  _textSprite(text, fontPx) {
    const THREE = this.THREE
    const pad = 14
    const c = document.createElement('canvas')
    const ctx = c.getContext('2d')
    const font = `700 ${fontPx}px "Baloo 2", "Nunito", sans-serif`
    ctx.font = font
    const w = Math.ceil(ctx.measureText(text).width) + pad * 2
    const h = fontPx + pad * 2
    c.width = w
    c.height = h
    const ctx2 = c.getContext('2d')
    ctx2.font = font
    ctx2.textAlign = 'center'
    ctx2.textBaseline = 'middle'
    const r = h / 2
    ctx2.fillStyle = 'rgba(255,255,255,0.88)'
    ctx2.beginPath()
    ctx2.roundRect(0, 0, w, h, r)
    ctx2.fill()
    ctx2.fillStyle = '#3a2c17'
    ctx2.fillText(text, w / 2, h / 2 + 2)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true })
    this._disposables.add(tex)
    this._disposables.add(mat)
    const sprite = new THREE.Sprite(mat)
    const scale = 0.026
    sprite.scale.set(w * scale, h * scale, 1)
    return sprite
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
    if (this.scene) this._disposeObject(this.scene)
    for (const d of this._disposables) d.dispose?.()
    this._disposables.clear()
    this._emojiMats.clear()
    if (this.renderer) {
      this.renderer.dispose()
      this.renderer.forceContextLoss?.()
    }
    this.scene = null
    this.camera = null
    this.me = null
    this.remotes.clear()
    this.farmGroups = []
    this.farmAnims = []
  }
}
