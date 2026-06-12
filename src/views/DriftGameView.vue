<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { locale } from '../i18n'
import { formatCoins } from '../animals'
import { useGameStore } from '../stores/game'
import { useAppToast } from '../composables/useAppToast'
import { MAX_LEVEL, buildTrack, nearestIndex, starsForCrashes } from '../driftTrack'

const router = useRouter()
const game = useGameStore()
const appToast = useAppToast()

const TUT_KEY = 'drift_tutorial_v1'

const I18N = {
  de: {
    title: '🏎️ Drift-Rennen', sub: '12 Strecken voller Kurven. Halte links oder rechts, um zu driften.',
    back: 'Zurück', level: 'Level', best: 'Beste Strecke', stars: 'Sterne', curvesWord: 'Kurven',
    play: 'Fahren', replay: 'Nochmal', locked: 'Gesperrt', cleared: 'Geschafft',
    loading: 'Lade Fortschritt...', retry: 'Erneut versuchen',
    tapToStart: 'Tippen zum Starten', holdHint: '◀ halten = links · rechts = halten ▶',
    crash: 'Crash!', crashes: 'Crashes',
    finishTitle: '🏁 Ziel erreicht!', firstClear: 'Strecke freigeschaltet!', replayReward: 'Wiederholungs-Bonus',
    perfect: '⭐ Perfekt - keine Crashes! +50% Coins',
    next: 'Nächste Strecke ▶', toMap: 'Zur Übersicht', saving: 'Speichere...',
    quit: 'Aufgeben', resume: 'Weiter',
    quitTitle: 'Rennen abbrechen?', quitSub: 'Der Fortschritt auf dieser Strecke geht verloren.',
    quitNo: 'Weiterfahren', quitYes: 'Abbrechen',
    tutTitle: 'So funktioniert Drift',
    tutStep1: 'Dein Auto fährt automatisch. Halte links oder rechts auf dem Bildschirm, um zu lenken und zu driften.',
    tutStep2: 'Bleib auf der Straße! Neben der Strecke crasht dein Auto und du startest kurz davor neu.',
    tutStep3: 'Erreiche das Ziel: 0 Crashes = ⭐⭐⭐, bis 2 Crashes = ⭐⭐, mehr = ⭐.',
    tutStep4: 'Jede neue Strecke bringt Coins, alle 3 Strecken Tickets. 3 Sterne beim Erstabschluss = +50% Coins.',
    tutGot: 'Verstanden, los geht\'s!'
  },
  en: {
    title: '🏎️ Drift Race', sub: '12 tracks full of curves. Hold left or right to drift.',
    back: 'Back', level: 'Level', best: 'Best track', stars: 'Stars', curvesWord: 'curves',
    play: 'Drive', replay: 'Replay', locked: 'Locked', cleared: 'Cleared',
    loading: 'Loading progress...', retry: 'Try again',
    tapToStart: 'Tap to start', holdHint: '◀ hold = left · right = hold ▶',
    crash: 'Crash!', crashes: 'Crashes',
    finishTitle: '🏁 Finish!', firstClear: 'Track cleared!', replayReward: 'Replay bonus',
    perfect: '⭐ Perfect - no crashes! +50% coins',
    next: 'Next track ▶', toMap: 'Back to map', saving: 'Saving...',
    quit: 'Give up', resume: 'Resume',
    quitTitle: 'Quit the race?', quitSub: 'Progress on this track will be lost.',
    quitNo: 'Keep driving', quitYes: 'Quit',
    tutTitle: 'How Drift works',
    tutStep1: 'Your car drives automatically. Hold the left or right side of the screen to steer and drift.',
    tutStep2: 'Stay on the road! Going off-track crashes your car and respawns you slightly before.',
    tutStep3: 'Reach the finish: 0 crashes = ⭐⭐⭐, up to 2 crashes = ⭐⭐, more = ⭐.',
    tutStep4: 'Every new track pays coins, every 3rd track tickets. 3 stars on first clear = +50% coins.',
    tutGot: 'Got it, let\'s go!'
  },
  ru: {
    title: '🏎️ Дрифт-гонка', sub: '12 трасс с крутыми поворотами. Держи влево или вправо, чтобы дрифтовать.',
    back: 'Назад', level: 'Уровень', best: 'Лучшая трасса', stars: 'Звёзды', curvesWord: 'поворотов',
    play: 'Поехали', replay: 'Снова', locked: 'Закрыто', cleared: 'Пройдено',
    loading: 'Загрузка прогресса...', retry: 'Повторить',
    tapToStart: 'Нажми, чтобы стартовать', holdHint: '◀ держи = влево · вправо = держи ▶',
    crash: 'Авария!', crashes: 'Аварии',
    finishTitle: '🏁 Финиш!', firstClear: 'Трасса пройдена!', replayReward: 'Бонус за повтор',
    perfect: '⭐ Идеально - без аварий! +50% монет',
    next: 'Следующая трасса ▶', toMap: 'К карте', saving: 'Сохранение...',
    quit: 'Сдаться', resume: 'Продолжить',
    quitTitle: 'Прервать гонку?', quitSub: 'Прогресс на этой трассе будет потерян.',
    quitNo: 'Ехать дальше', quitYes: 'Прервать',
    tutTitle: 'Как играть в Дрифт',
    tutStep1: 'Машина едет сама. Держи левую или правую часть экрана, чтобы рулить и дрифтовать.',
    tutStep2: 'Держись дороги! Вылет с трассы - авария, и ты появишься чуть раньше.',
    tutStep3: 'Доберись до финиша: 0 аварий = ⭐⭐⭐, до 2 аварий = ⭐⭐, больше = ⭐.',
    tutStep4: 'Каждая новая трасса даёт монеты, каждая 3-я - тикеты. 3 звезды при первом прохождении = +50% монет.',
    tutGot: 'Понятно, поехали!'
  }
}

function tx(key, vars = {}) {
  const dict = I18N[locale.value] || I18N.en
  let value = dict[key]
  if (value == null) value = I18N.en[key]
  return String(value ?? key).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

// Spiegelt public._drift_reward für die Vorschau auf den Level-Karten.
function driftReward(lvl) {
  const tickets = { 3: 1, 6: 2, 9: 3, 12: 5 }[lvl] || 0
  return { coins: 1500 * lvl * lvl, tickets }
}

const loading = ref(true)
const error = ref('')
const showTutorial = ref(false)

const highest = computed(() => Number(game.driftProgress?.highest_level || 0))
const starsMap = computed(() => game.driftProgress?.stars || {})
const totalStars = computed(() => {
  let sum = 0
  for (let i = 1; i <= MAX_LEVEL; i++) sum += Number(starsMap.value[String(i)] || 0)
  return sum
})

const levels = computed(() => {
  const out = []
  for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
    const status = lvl <= highest.value ? 'cleared' : lvl === highest.value + 1 ? 'current' : 'locked'
    out.push({
      level: lvl,
      status,
      stars: Number(starsMap.value[String(lvl)] || 0),
      reward: driftReward(lvl),
      curves: 4 + lvl
    })
  }
  return out
})

async function loadProgress() {
  loading.value = true
  error.value = ''
  try {
    await game.loadDriftProgress()
  } catch (e) {
    error.value = e?.message || 'Fehler'
  } finally {
    loading.value = false
  }
}

// ── Spiel-Engine ─────────────────────────────────────────────────────
const TURN_RATE = 2.7
const GRIP = 5.2
const CAR_R = 10
const RESPAWN_BACK = 8
const FREEZE_MS = 700

const playOpen = ref(false)
const playLevel = ref(1)
const runState = ref('ready') // ready | running | crashed | finished
const crashes = ref(0)
const progressPct = ref(0)
const saving = ref(false)
const rewardData = ref(null)
const quitConfirm = ref(false)

const canvasRef = ref(null)
const wrapRef = ref(null)

let g = null // nicht-reaktiver Spielzustand
let rafId = 0
let steer = 0
let activePointer = null
let freezeUntil = 0
let shakeUntil = 0

function headingAt(points, i) {
  const a = points[Math.max(0, Math.min(points.length - 2, i))]
  const b = points[Math.max(1, Math.min(points.length - 1, i + 1))]
  return Math.atan2(b.y - a.y, b.x - a.x)
}

function makeDecos(track) {
  const decos = []
  const emojis = ['🌳', '🌲', '🌼', '🪨', '🌷', '🌳']
  const pts = track.points
  for (let i = 4; i < pts.length - 4; i += 9) {
    const h = headingAt(pts, i)
    const side = (i % 18 === 4) ? 1 : -1
    const off = track.roadWidth / 2 + 34 + ((i * 37) % 48)
    decos.push({
      x: pts[i].x + Math.cos(h + Math.PI / 2) * off * side,
      y: pts[i].y + Math.sin(h + Math.PI / 2) * off * side,
      e: emojis[(i / 9) % emojis.length | 0],
      s: 18 + ((i * 13) % 14)
    })
  }
  return decos
}

function resetCar(idx = 0) {
  const pts = g.track.points
  const i = Math.max(0, Math.min(pts.length - 2, idx))
  const h = headingAt(pts, i)
  g.car = { x: pts[i].x, y: pts[i].y, heading: h, velAngle: h }
  g.idx = i
}

function startRun(level) {
  playLevel.value = level
  playOpen.value = true
  runState.value = 'ready'
  crashes.value = 0
  progressPct.value = 0
  rewardData.value = null
  quitConfirm.value = false
  steer = 0
  activePointer = null
  const track = buildTrack(level)
  g = { track, decos: makeDecos(track), skids: [], smoke: [], car: null, idx: 0, last: 0 }
  resetCar(0)
  nextTick().then(() => {
    sizeCanvas()
    if (!rafId) rafId = requestAnimationFrame(tick)
  })
}

function stopLoop() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
}

function closePlay() {
  stopLoop()
  playOpen.value = false
  g = null
}

function sizeCanvas() {
  const canvas = canvasRef.value
  const wrap = wrapRef.value
  if (!canvas || !wrap) return
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const w = wrap.clientWidth
  const h = wrap.clientHeight
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  canvas.style.width = w + 'px'
  canvas.style.height = h + 'px'
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function crash() {
  crashes.value += 1
  runState.value = 'crashed'
  freezeUntil = performance.now() + FREEZE_MS
  shakeUntil = performance.now() + 420
  try { navigator.vibrate?.(120) } catch {}
  g.boom = { x: g.car.x, y: g.car.y, until: performance.now() + 650 }
  resetCar(g.idx - RESPAWN_BACK)
}

async function finishRun() {
  runState.value = 'finished'
  stopLoop()
  const stars = starsForCrashes(crashes.value)
  saving.value = true
  try {
    const data = await game.completeDriftLevel(playLevel.value, stars)
    rewardData.value = {
      stars: Number(data?.stars || stars),
      runStars: stars,
      coins: Number(data?.coins_added || 0),
      tickets: Number(data?.tickets_added || 0),
      firstClear: !!data?.first_clear
    }
  } catch (e) {
    appToast.err(e?.message || 'Fehler')
    closePlay()
  } finally {
    saving.value = false
  }
}

function update(dt) {
  if (!g || runState.value === 'finished') return
  const now = performance.now()
  if (runState.value === 'crashed' && now >= freezeUntil) runState.value = 'running'
  if (runState.value !== 'running') return

  const car = g.car
  car.heading += steer * TURN_RATE * dt
  let diff = car.heading - car.velAngle
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  car.velAngle += diff * Math.min(1, GRIP * dt)
  car.x += Math.cos(car.velAngle) * g.track.speed * dt
  car.y += Math.sin(car.velAngle) * g.track.speed * dt

  const hit = nearestIndex(g.track.points, car, g.idx, 30)
  g.idx = hit.index
  progressPct.value = Math.round((g.idx / (g.track.points.length - 1)) * 100)

  const drifting = Math.abs(diff) > 0.17
  if (drifting) {
    const back = car.heading + Math.PI
    for (const side of [-1, 1]) {
      g.skids.push({
        x: car.x + Math.cos(back) * 8 + Math.cos(car.heading + Math.PI / 2) * 5 * side,
        y: car.y + Math.sin(back) * 8 + Math.sin(car.heading + Math.PI / 2) * 5 * side,
        a: 0.55
      })
    }
    if (Math.random() < 0.5) {
      g.smoke.push({
        x: car.x + Math.cos(car.heading + Math.PI) * 12,
        y: car.y + Math.sin(car.heading + Math.PI) * 12,
        r: 4 + Math.random() * 4,
        a: 0.5
      })
    }
  }
  if (g.skids.length > 500) g.skids.splice(0, g.skids.length - 500)
  for (const s of g.skids) s.a -= dt * 0.25
  g.skids = g.skids.filter((s) => s.a > 0)
  for (const s of g.smoke) { s.a -= dt * 0.9; s.r += dt * 14 }
  g.smoke = g.smoke.filter((s) => s.a > 0)

  if (hit.dist > g.track.roadWidth / 2 - 6) {
    crash()
    return
  }
  if (g.idx >= g.track.points.length - 3) finishRun()
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas || !g) return
  const ctx = canvas.getContext('2d')
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  const now = performance.now()

  ctx.fillStyle = '#7ccf63'
  ctx.fillRect(0, 0, w, h)

  ctx.save()
  let shx = 0; let shy = 0
  if (now < shakeUntil) {
    shx = (Math.random() - 0.5) * 8
    shy = (Math.random() - 0.5) * 8
  }
  ctx.translate(w / 2 - g.car.x + shx, h * 0.62 - g.car.y + shy)

  const pts = g.track.points
  const from = Math.max(0, g.idx - 140)
  const to = Math.min(pts.length - 1, g.idx + 260)

  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  ctx.beginPath()
  ctx.moveTo(pts[from].x, pts[from].y)
  for (let i = from + 1; i <= to; i++) ctx.lineTo(pts[i].x, pts[i].y)
  ctx.strokeStyle = '#e8d9a8'
  ctx.lineWidth = g.track.roadWidth + 14
  ctx.stroke()
  ctx.strokeStyle = '#646b78'
  ctx.lineWidth = g.track.roadWidth
  ctx.stroke()

  ctx.setLineDash([14, 16])
  ctx.beginPath()
  ctx.moveTo(pts[from].x, pts[from].y)
  for (let i = from + 1; i <= to; i++) ctx.lineTo(pts[i].x, pts[i].y)
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.setLineDash([])

  // Start- und Ziellinie (Schachbrett)
  for (const [idx, isFinish] of [[4, false], [pts.length - 4, true]]) {
    if (idx < from - 40 || idx > to + 40) continue
    const hAng = headingAt(pts, idx)
    ctx.save()
    ctx.translate(pts[idx].x, pts[idx].y)
    ctx.rotate(hAng + Math.PI / 2)
    const half = g.track.roadWidth / 2
    const cell = 8
    const cells = Math.ceil((half * 2) / cell)
    for (let ci = 0; ci < cells; ci++) {
      for (let cy = 0; cy < 2; cy++) {
        ctx.fillStyle = ((ci + cy) % 2 === 0) ? '#fff' : '#222'
        ctx.fillRect(-half + ci * cell, (cy - 1) * cell, cell, cell)
      }
    }
    if (isFinish) {
      ctx.font = '26px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('🏁', half + 22, 8)
    }
    ctx.restore()
  }

  for (const d of g.decos) {
    if (d.x < g.car.x - w || d.x > g.car.x + w || d.y < g.car.y - h || d.y > g.car.y + h) continue
    ctx.font = `${d.s}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(d.e, d.x, d.y)
  }

  ctx.strokeStyle = 'rgba(35,35,40,1)'
  ctx.lineWidth = 3
  for (const s of g.skids) {
    ctx.globalAlpha = s.a
    ctx.beginPath()
    ctx.arc(s.x, s.y, 2.1, 0, Math.PI * 2)
    ctx.fillStyle = '#2b2b30'
    ctx.fill()
  }
  ctx.globalAlpha = 1

  for (const s of g.smoke) {
    ctx.globalAlpha = s.a
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fillStyle = '#f2f2f2'
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // Auto
  const car = g.car
  ctx.save()
  ctx.translate(car.x, car.y)
  ctx.rotate(car.heading)
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath()
  ctx.ellipse(0, 3, 14, 9, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1d1d22'
  for (const [wx, wy] of [[-8, -7], [8, -7], [-8, 7], [8, 7]]) {
    ctx.fillRect(wx - 3, wy - 2, 6, 4)
  }
  ctx.fillStyle = '#ef476f'
  ctx.beginPath()
  ctx.roundRect(-13, -7, 26, 14, 5)
  ctx.fill()
  ctx.fillStyle = '#a31b3f'
  ctx.beginPath()
  ctx.roundRect(-6, -5, 11, 10, 3)
  ctx.fill()
  ctx.fillStyle = '#bfe8ff'
  ctx.beginPath()
  ctx.roundRect(5, -5, 4, 10, 2)
  ctx.fill()
  ctx.restore()

  if (g.boom && now < g.boom.until) {
    ctx.font = '38px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('💥', g.boom.x, g.boom.y + 12)
  }

  ctx.restore()
}

function tick(ts) {
  rafId = 0
  if (!playOpen.value || !g) return
  if (!g.last) g.last = ts
  const dt = Math.min(0.05, (ts - g.last) / 1000)
  g.last = ts
  update(dt)
  draw()
  if (playOpen.value && runState.value !== 'finished') rafId = requestAnimationFrame(tick)
  else if (playOpen.value) draw()
}

function onPointerDown(e) {
  if (quitConfirm.value || runState.value === 'finished') return
  activePointer = e.pointerId
  if (runState.value === 'ready') runState.value = 'running'
  const rect = wrapRef.value.getBoundingClientRect()
  steer = (e.clientX - rect.left) < rect.width / 2 ? -1 : 1
}

function onPointerMove(e) {
  if (e.pointerId !== activePointer || steer === 0) return
  const rect = wrapRef.value.getBoundingClientRect()
  steer = (e.clientX - rect.left) < rect.width / 2 ? -1 : 1
}

function onPointerUp(e) {
  if (e.pointerId !== activePointer) return
  activePointer = null
  steer = 0
}

function onKeyDown(e) {
  if (!playOpen.value) return
  if (e.key === 'ArrowLeft' || e.key === 'a') { steer = -1; if (runState.value === 'ready') runState.value = 'running' }
  if (e.key === 'ArrowRight' || e.key === 'd') { steer = 1; if (runState.value === 'ready') runState.value = 'running' }
}
function onKeyUp(e) {
  if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key)) steer = 0
}

function requestQuit() {
  if (runState.value === 'finished') return
  quitConfirm.value = true
}

function confirmQuit() {
  quitConfirm.value = false
  closePlay()
}

function nextLevel() {
  const next = playLevel.value + 1
  closePlay()
  if (next <= MAX_LEVEL && next <= highest.value + 1) startRun(next)
}

const liveStars = computed(() => starsForCrashes(crashes.value))

function dismissTutorial() {
  showTutorial.value = false
  try { localStorage.setItem(TUT_KEY, '1') } catch {}
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('resize', sizeCanvas)
  let seen = false
  try { seen = localStorage.getItem(TUT_KEY) === '1' } catch { seen = false }
  if (!seen) showTutorial.value = true
  loadProgress()
})

onUnmounted(() => {
  stopLoop()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('resize', sizeCanvas)
})
</script>

<template>
  <div class="drift-view">
    <header class="drift-header">
      <Button class="btn small btn-ghost" @click="router.push('/')">
        <i class="pi pi-arrow-left"></i><span>{{ tx('back') }}</span>
      </Button>
      <div class="drift-title-block">
        <h1 class="drift-title">{{ tx('title') }}</h1>
        <p class="drift-sub">{{ tx('sub') }}</p>
      </div>
      <Button class="btn small btn-ghost help-btn" @click="showTutorial = true">
        <i class="pi pi-question-circle"></i>
      </Button>
    </header>

    <div v-if="loading" class="card drift-state">
      <i class="pi pi-spin pi-spinner"></i><span>{{ tx('loading') }}</span>
    </div>
    <div v-else-if="error" class="card drift-state error-state">
      <span>{{ error }}</span>
      <Button class="btn small" @click="loadProgress">{{ tx('retry') }}</Button>
    </div>

    <template v-else>
      <section class="drift-stats">
        <div class="drift-stat">
          <strong>{{ highest }} / {{ MAX_LEVEL }}</strong><span>{{ tx('best') }}</span>
        </div>
        <div class="drift-stat">
          <strong>⭐ {{ totalStars }} / {{ MAX_LEVEL * 3 }}</strong><span>{{ tx('stars') }}</span>
        </div>
      </section>

      <section class="drift-grid">
        <div
          v-for="node in levels"
          :key="node.level"
          class="drift-node card"
          :class="'st-' + node.status"
        >
          <div class="dn-level">{{ tx('level') }} {{ node.level }}</div>
          <div class="dn-icon">{{ node.status === 'locked' ? '🔒' : '🏎️' }}</div>
          <div class="dn-stars">
            <span v-for="s in 3" :key="s" :class="{ on: s <= node.stars }">★</span>
          </div>
          <div class="dn-info">{{ node.curves }} {{ tx('curvesWord') }}</div>
          <div class="dn-reward">
            🪙 {{ formatCoins(node.reward.coins) }}<template v-if="node.reward.tickets"> · 🎟️ {{ node.reward.tickets }}</template>
          </div>
          <Button
            v-if="node.status !== 'locked'"
            class="btn dn-play"
            :class="{ secondary: node.status === 'cleared' }"
            @click="startRun(node.level)"
          >
            {{ node.status === 'cleared' ? '↻ ' + tx('replay') : '▶ ' + tx('play') }}
          </Button>
          <div v-else class="dn-locked">{{ tx('locked') }}</div>
        </div>
      </section>
    </template>

    <Teleport to="body">
      <div v-if="playOpen" class="drift-overlay">
        <div class="drift-hud">
          <Button class="btn small btn-ghost hud-quit" @click="requestQuit">
            <i class="pi pi-times"></i>
          </Button>
          <div class="hud-center">
            <div class="hud-level">{{ tx('level') }} {{ playLevel }}</div>
            <div class="hud-progress"><span :style="{ width: progressPct + '%' }"></span></div>
          </div>
          <div class="hud-right">
            <div class="hud-stars">
              <span v-for="s in 3" :key="s" :class="{ on: s <= liveStars }">★</span>
            </div>
            <div class="hud-crashes">💥 {{ crashes }}</div>
          </div>
        </div>

        <div
          ref="wrapRef"
          class="drift-canvas-wrap"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <canvas ref="canvasRef"></canvas>
          <div v-if="runState === 'ready'" class="drift-start-hint">
            <div class="dsh-tap">👆 {{ tx('tapToStart') }}</div>
            <div class="dsh-hold">{{ tx('holdHint') }}</div>
          </div>
          <div v-if="runState === 'crashed'" class="drift-crash-flash">{{ tx('crash') }}</div>
          <div class="steer-zone left" :class="{ active: false }">◀</div>
          <div class="steer-zone right">▶</div>
        </div>

        <div v-if="runState === 'finished'" class="drift-finish">
          <div class="df-panel card">
            <template v-if="saving">
              <div class="df-emoji"><i class="pi pi-spin pi-spinner"></i></div>
              <h3>{{ tx('saving') }}</h3>
            </template>
            <template v-else-if="rewardData">
              <div class="df-emoji">🏁</div>
              <h3>{{ tx('finishTitle') }}</h3>
              <div class="df-stars">
                <span v-for="s in 3" :key="s" :class="{ on: s <= rewardData.runStars }">★</span>
              </div>
              <div class="df-badge" :class="{ replay: !rewardData.firstClear }">
                {{ rewardData.firstClear ? tx('firstClear') : tx('replayReward') }}
              </div>
              <div v-if="rewardData.firstClear && rewardData.runStars === 3" class="df-perfect">
                {{ tx('perfect') }}
              </div>
              <div class="df-items">
                <div class="df-item">🪙 +{{ formatCoins(rewardData.coins) }}</div>
                <div v-if="rewardData.tickets > 0" class="df-item tickets">🎟️ +{{ rewardData.tickets }}</div>
              </div>
              <Button
                v-if="playLevel < 12 && playLevel <= highest"
                class="btn full"
                @click="nextLevel"
              >{{ tx('next') }}</Button>
              <Button class="btn full secondary" @click="closePlay">{{ tx('toMap') }}</Button>
            </template>
          </div>
        </div>

        <div v-if="quitConfirm" class="drift-finish">
          <div class="df-panel card">
            <div class="df-emoji">🏳️</div>
            <h3>{{ tx('quitTitle') }}</h3>
            <p class="df-sub">{{ tx('quitSub') }}</p>
            <Button class="btn full" @click="quitConfirm = false">{{ tx('quitNo') }}</Button>
            <Button class="btn full secondary" @click="confirmQuit">{{ tx('quitYes') }}</Button>
          </div>
        </div>
      </div>

      <div v-if="showTutorial" class="tut-backdrop" @click.self="dismissTutorial">
        <div class="tut-dialog card">
          <h3 class="tut-title">{{ tx('tutTitle') }}</h3>
          <div class="tut-demo">
            <span class="tut-car">🏎️</span>
            <span class="tut-trail">〰️〰️</span>
          </div>
          <ol class="tut-steps">
            <li>{{ tx('tutStep1') }}</li>
            <li>{{ tx('tutStep2') }}</li>
            <li>{{ tx('tutStep3') }}</li>
            <li>{{ tx('tutStep4') }}</li>
          </ol>
          <Button class="btn tut-got" @click="dismissTutorial">{{ tx('tutGot') }}</Button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.drift-view { display:flex; flex-direction:column; gap:12px; padding-bottom:18px; }
.drift-header { display:flex; align-items:center; gap:10px; }
.btn-ghost { background:var(--card-2); color:var(--muted);
  display:inline-flex; align-items:center; gap:5px; flex-shrink:0; }
.drift-title-block { flex:1; min-width:0; }
.drift-title { margin:0; font-size:22px; font-weight:900; color:var(--heading); }
.drift-sub { margin:2px 0 0; color:var(--muted); font-size:13px; }
.help-btn { flex-shrink:0; }
.drift-state { display:flex; align-items:center; justify-content:center; gap:10px;
  min-height:140px; color:var(--muted); font-weight:800; }
.error-state { flex-direction:column; color:var(--danger); }
.drift-stats { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.drift-stat { background:var(--card); border:2px solid var(--border); border-radius:14px;
  padding:12px 10px; text-align:center; box-shadow:var(--shadow-card); }
.drift-stat strong { display:block; color:var(--accent-deep); font-weight:900; font-size:17px; }
.drift-stat span { display:block; color:var(--muted); font-size:11px; font-weight:700;
  margin-top:4px; text-transform:uppercase; letter-spacing:0.03em; }

.drift-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
.drift-node { display:flex; flex-direction:column; align-items:center; gap:5px;
  padding:14px 10px; text-align:center; }
.drift-node.st-locked { filter:grayscale(0.6); opacity:0.65; }
.drift-node.st-current { border-color:var(--accent);
  box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent), var(--shadow-card);
  animation:driftPulse 2.4s ease-in-out infinite; }
@keyframes driftPulse {
  0%,100% { box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent), var(--shadow-card); }
  50% { box-shadow:0 0 0 7px color-mix(in srgb, var(--accent) 8%, transparent), var(--shadow-card); } }
.dn-level { font-size:11px; letter-spacing:0.06em; text-transform:uppercase;
  color:var(--muted); font-weight:800; }
.dn-icon { font-size:34px; line-height:1.1; filter:drop-shadow(0 4px 8px rgba(110,80,20,0.25)); }
.dn-stars { display:flex; gap:2px; font-size:16px; color:#ddd0b0; }
.dn-stars .on { color:var(--accent); text-shadow:0 1px 0 rgba(160,110,0,0.4); }
.dn-info { font-size:12px; color:var(--muted); font-weight:800; }
.dn-reward { font-size:11px; color:var(--accent-deep); font-weight:900; }
.dn-play { width:100%; font-weight:900; margin-top:3px; }
.dn-locked { font-size:12px; color:var(--muted); font-weight:800; padding:8px 0 2px; }

.drift-overlay { position:fixed; inset:0; z-index:1100; display:flex; flex-direction:column;
  background:#5fb44d; touch-action:none; overscroll-behavior:none; }
.drift-hud { display:flex; align-items:center; gap:10px;
  padding:calc(8px + var(--safe-top)) 12px 8px; background:rgba(255,255,255,0.92);
  border-bottom:2px solid var(--border); }
.hud-quit { flex-shrink:0; }
.hud-center { flex:1; min-width:0; display:flex; flex-direction:column; gap:4px; }
.hud-level { font-weight:900; font-size:14px; color:var(--heading); }
.hud-progress { width:100%; height:8px; border-radius:999px; background:rgba(0,0,0,0.12);
  overflow:hidden; }
.hud-progress span { display:block; height:100%; border-radius:999px;
  background:linear-gradient(90deg,var(--accent-2),var(--accent)); transition:width 0.2s linear; }
.hud-right { flex-shrink:0; display:flex; flex-direction:column; align-items:flex-end; gap:1px; }
.hud-stars { font-size:14px; color:#ddd0b0; letter-spacing:1px; }
.hud-stars .on { color:var(--accent); }
.hud-crashes { font-size:12px; font-weight:900; color:var(--heading); }
.drift-canvas-wrap { position:relative; flex:1; min-height:0; cursor:pointer; }
.drift-canvas-wrap canvas { position:absolute; inset:0; display:block; }
.drift-start-hint { position:absolute; left:0; right:0; top:18%; display:flex;
  flex-direction:column; align-items:center; gap:8px; pointer-events:none; }
.dsh-tap { background:rgba(255,255,255,0.94); border-radius:999px; padding:10px 20px;
  font-weight:900; font-size:16px; color:var(--heading);
  box-shadow:0 8px 22px rgba(0,0,0,0.18); animation:dshBounce 1.4s ease-in-out infinite; }
.dsh-hold { background:rgba(0,0,0,0.45); color:#fff; border-radius:999px;
  padding:6px 14px; font-weight:800; font-size:12px; }
@keyframes dshBounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
.drift-crash-flash { position:absolute; left:50%; top:30%; transform:translate(-50%,-50%);
  background:rgba(239,71,111,0.95); color:#fff; font-weight:900; font-size:20px;
  border-radius:999px; padding:10px 22px; pointer-events:none;
  animation:crashIn 0.25s ease-out; box-shadow:0 10px 30px rgba(0,0,0,0.3); }
@keyframes crashIn { from { transform:translate(-50%,-50%) scale(0.5); opacity:0; }
  to { transform:translate(-50%,-50%) scale(1); opacity:1; } }
.steer-zone { position:absolute; bottom:calc(14px + var(--safe-bot)); font-size:26px;
  width:54px; height:54px; border-radius:50%; display:grid; place-items:center;
  background:rgba(255,255,255,0.35); color:rgba(255,255,255,0.9); pointer-events:none;
  font-weight:900; }
.steer-zone.left { left:16px; }
.steer-zone.right { right:16px; }

.drift-finish { position:absolute; inset:0; display:flex; align-items:center;
  justify-content:center; padding:18px; background:rgba(40,25,5,0.45);
  backdrop-filter:blur(4px); z-index:5; }
.df-panel { width:min(340px,100%); display:flex; flex-direction:column; align-items:center;
  gap:9px; padding:24px 20px; text-align:center; animation:dfIn 0.3s cubic-bezier(0.34,1.56,0.64,1); }
@keyframes dfIn { from { transform:translateY(18px) scale(0.92); opacity:0; }
  to { transform:translateY(0) scale(1); opacity:1; } }
.df-emoji { font-size:52px; line-height:1; }
.df-panel h3 { margin:0; font-size:20px; font-weight:900; color:var(--heading); }
.df-sub { margin:0; color:var(--muted); font-size:13px; font-weight:700; }
.df-stars { font-size:30px; color:#ddd0b0; letter-spacing:3px; }
.df-stars .on { color:var(--accent); text-shadow:0 2px 0 rgba(160,110,0,0.35); }
.df-badge { border-radius:999px; padding:5px 14px; font-size:12px; font-weight:900;
  background:color-mix(in srgb, var(--accent-2) 18%, #fff); color:#157a4c;
  border:2px solid color-mix(in srgb, var(--accent-2) 55%, #fff); }
.df-badge.replay { background:var(--card-2); color:var(--muted); border-color:var(--border); }
.df-perfect { font-size:12px; font-weight:900; color:var(--accent-deep); }
.df-items { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin:4px 0 6px; }
.df-item { border-radius:14px; padding:10px 16px; font-size:17px; font-weight:900;
  color:var(--accent-deep); background:linear-gradient(180deg,#fffaf0,#fff1d0);
  border:2px solid var(--accent-soft); }
.df-item.tickets { color:var(--purple-deep); border-color:var(--purple);
  background:linear-gradient(180deg,#f7f2ff,#ece1ff); }

.tut-backdrop { position:fixed; inset:0; background:rgba(60,40,10,0.5); display:flex;
  align-items:center; justify-content:center; z-index:1400; padding:16px; backdrop-filter:blur(5px); }
.tut-dialog { max-width:380px; width:100%; padding:22px; text-align:center;
  display:flex; flex-direction:column; gap:14px; }
.tut-title { margin:0; font-size:20px; font-weight:900; color:var(--heading); }
.tut-demo { display:flex; align-items:center; justify-content:center; gap:4px;
  font-size:34px; padding:4px 0; }
.tut-car { animation:tutDrift 2.6s ease-in-out infinite; display:inline-block; }
.tut-trail { font-size:22px; opacity:0.5; }
@keyframes tutDrift { 0%,100% { transform:rotate(-10deg) translateX(0); }
  50% { transform:rotate(14deg) translateX(8px); } }
.tut-steps { text-align:left; margin:0; padding-left:20px; display:flex;
  flex-direction:column; gap:8px; color:var(--text); font-size:13px; font-weight:600; }
.tut-steps li { line-height:1.4; }
.tut-got { width:100%; font-weight:900; }

@media (max-width:420px) {
  .drift-grid { grid-template-columns:repeat(2,1fr); gap:8px; }
}
</style>
