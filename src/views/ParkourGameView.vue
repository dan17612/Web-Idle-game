<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { locale } from '../i18n'
import { formatCoins } from '../animals'
import { useGameStore } from '../stores/game'
import { useAppToast } from '../composables/useAppToast'
import { MAX_LEVEL, buildCourse, levelConfig, starsForFalls } from '../parkourCourse'
import { ParkourEngine } from '../parkourEngine'

const router = useRouter()
const game = useGameStore()
const appToast = useAppToast()

const TUT_KEY = 'parkour_tutorial_v1'

const I18N = {
  de: {
    title: '🐾 Zoo-Parkour', sub: '12 Parcours in 3D. Tippen zum Springen, wischen für die Spur.',
    back: 'Zurück', level: 'Level', best: 'Bester Parcours', stars: 'Sterne', obstaclesWord: 'Hindernisse',
    play: 'Springen', replay: 'Nochmal', locked: 'Gesperrt', cleared: 'Geschafft',
    loading: 'Lade Fortschritt...', retry: 'Erneut versuchen', loading3d: 'Lade 3D-Welt...',
    tapToStart: 'Tippen zum Starten', controlsHint: 'Tippen = Springen · Wischen ◀▶ = Spur',
    fell: 'Sturz!', falls: 'Stürze',
    finishTitle: '🏁 Ziel erreicht!', firstClear: 'Parcours freigeschaltet!', replayReward: 'Wiederholungs-Bonus',
    perfect: '⭐ Perfekt - kein Sturz! +50% Coins',
    next: 'Nächster Parcours ▶', toMap: 'Zur Übersicht', saving: 'Speichere...',
    quit: 'Aufgeben', resume: 'Weiter',
    quitTitle: 'Parcours abbrechen?', quitSub: 'Der Fortschritt auf diesem Parcours geht verloren.',
    quitNo: 'Weiterlaufen', quitYes: 'Abbrechen',
    tutTitle: 'So funktioniert Zoo-Parkour',
    tutStep1: 'Dein Tier läuft automatisch vorwärts. Tippe auf den Bildschirm, um zu springen.',
    tutStep2: 'Wische nach links oder rechts, um die Spur zu wechseln und Hindernissen auszuweichen.',
    tutStep3: 'Spring über Lücken und Barrieren. Stürzt du, geht es am letzten Checkpoint weiter.',
    tutStep4: 'Erreiche das Ziel: 0 Stürze = ⭐⭐⭐, bis 2 Stürze = ⭐⭐, mehr = ⭐. 3 Sterne beim Erstabschluss = +50% Coins.',
    tutGot: 'Verstanden, los geht\'s!'
  },
  en: {
    title: '🐾 Zoo Parkour', sub: '12 courses in 3D. Tap to jump, swipe to change lane.',
    back: 'Back', level: 'Level', best: 'Best course', stars: 'Stars', obstaclesWord: 'obstacles',
    play: 'Jump', replay: 'Replay', locked: 'Locked', cleared: 'Cleared',
    loading: 'Loading progress...', retry: 'Try again', loading3d: 'Loading 3D world...',
    tapToStart: 'Tap to start', controlsHint: 'Tap = jump · Swipe ◀▶ = lane',
    fell: 'Fell!', falls: 'Falls',
    finishTitle: '🏁 Finish!', firstClear: 'Course cleared!', replayReward: 'Replay bonus',
    perfect: '⭐ Perfect - no falls! +50% coins',
    next: 'Next course ▶', toMap: 'Back to map', saving: 'Saving...',
    quit: 'Give up', resume: 'Resume',
    quitTitle: 'Quit the course?', quitSub: 'Progress on this course will be lost.',
    quitNo: 'Keep running', quitYes: 'Quit',
    tutTitle: 'How Zoo Parkour works',
    tutStep1: 'Your animal runs forward automatically. Tap the screen to jump.',
    tutStep2: 'Swipe left or right to change lane and dodge obstacles.',
    tutStep3: 'Jump over gaps and barriers. If you fall, you respawn at the last checkpoint.',
    tutStep4: 'Reach the finish: 0 falls = ⭐⭐⭐, up to 2 falls = ⭐⭐, more = ⭐. 3 stars on first clear = +50% coins.',
    tutGot: 'Got it, let\'s go!'
  },
  ru: {
    title: '🐾 Зоо-Паркур', sub: '12 трасс в 3D. Нажми, чтобы прыгнуть, свайп - смена дорожки.',
    back: 'Назад', level: 'Уровень', best: 'Лучшая трасса', stars: 'Звёзды', obstaclesWord: 'препятствий',
    play: 'Прыгать', replay: 'Снова', locked: 'Закрыто', cleared: 'Пройдено',
    loading: 'Загрузка прогресса...', retry: 'Повторить', loading3d: 'Загрузка 3D-мира...',
    tapToStart: 'Нажми, чтобы начать', controlsHint: 'Нажатие = прыжок · Свайп ◀▶ = дорожка',
    fell: 'Падение!', falls: 'Падения',
    finishTitle: '🏁 Финиш!', firstClear: 'Трасса пройдена!', replayReward: 'Бонус за повтор',
    perfect: '⭐ Идеально - без падений! +50% монет',
    next: 'Следующая трасса ▶', toMap: 'К карте', saving: 'Сохранение...',
    quit: 'Сдаться', resume: 'Продолжить',
    quitTitle: 'Прервать трассу?', quitSub: 'Прогресс на этой трассе будет потерян.',
    quitNo: 'Бежать дальше', quitYes: 'Прервать',
    tutTitle: 'Как играть в Зоо-Паркур',
    tutStep1: 'Твой зверь бежит вперёд сам. Нажми на экран, чтобы прыгнуть.',
    tutStep2: 'Свайпай влево или вправо, чтобы менять дорожку и обходить препятствия.',
    tutStep3: 'Прыгай через пропасти и барьеры. Упал - продолжишь с последнего чекпоинта.',
    tutStep4: 'Доберись до финиша: 0 падений = ⭐⭐⭐, до 2 = ⭐⭐, больше = ⭐. 3 звезды при первом прохождении = +50% монет.',
    tutGot: 'Понятно, побежали!'
  }
}

function tx(key, vars = {}) {
  const dict = I18N[locale.value] || I18N.en
  let value = dict[key]
  if (value == null) value = I18N.en[key]
  return String(value ?? key).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

// Spiegelt public._parkour_reward für die Vorschau auf den Level-Karten.
function parkourReward(lvl) {
  const tickets = { 3: 1, 6: 2, 9: 3, 12: 5 }[lvl] || 0
  return { coins: 1500 * lvl * lvl, tickets }
}

// Hindernis-Anzahl pro Level (einmal berechnet) für die Karten-Info.
const obstacleCounts = computed(() => {
  const out = {}
  for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
    const course = buildCourse(lvl)
    let n = 0
    let inGap = false
    for (const row of course.rows) {
      const isVoid = row.lanes.every((c) => c === null)
      if (isVoid && !inGap) { n++; inGap = true }
      if (!isVoid) inGap = false
      for (const c of row.lanes) if (c?.obstacle) n++
      if (row.mover) n++
    }
    out[lvl] = n
  }
  return out
})

const loading = ref(true)
const error = ref('')
const showTutorial = ref(false)

const highest = computed(() => Number(game.parkourProgress?.highest_level || 0))
const starsMap = computed(() => game.parkourProgress?.stars || {})
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
      reward: parkourReward(lvl),
      obstacles: obstacleCounts.value[lvl] || 0
    })
  }
  return out
})

async function loadProgress() {
  loading.value = true
  error.value = ''
  try {
    await game.loadParkourProgress()
  } catch (e) {
    error.value = e?.message || 'Fehler'
  } finally {
    loading.value = false
  }
}

// ── Spiel-Steuerung ──────────────────────────────────────────────────────
const playOpen = ref(false)
const playLevel = ref(1)
const runState = ref('ready') // ready | running | finished
const engineLoading = ref(true)
const falls = ref(0)
const progressPct = ref(0)
const saving = ref(false)
const rewardData = ref(null)
const quitConfirm = ref(false)
const showFellFlash = ref(false)

const canvasRef = ref(null)
const wrapRef = ref(null)

let engine = null
let fellTimer = 0
let pointer = null // { x, y, t } für Tap/Swipe-Erkennung

const liveStars = computed(() => starsForFalls(falls.value))

async function startRun(level) {
  playLevel.value = level
  playOpen.value = true
  runState.value = 'ready'
  engineLoading.value = true
  falls.value = 0
  progressPct.value = 0
  rewardData.value = null
  quitConfirm.value = false
  showFellFlash.value = false

  await nextTick()
  try {
    engine = new ParkourEngine(canvasRef.value, {
      onProgress: (pct) => { progressPct.value = pct },
      onFall: () => {
        falls.value += 1
        flashFell()
      },
      onFinish: () => { finishRun() }
    })
    await engine.init()
    if (!playOpen.value || !engine) return
    engine.build(buildCourse(level))
    sizeCanvas()
    engine.start()
    engineLoading.value = false
  } catch (e) {
    engineLoading.value = false
    appToast.err(e?.message || 'WebGL nicht verfügbar')
    closePlay()
  }
}

function flashFell() {
  showFellFlash.value = true
  clearTimeout(fellTimer)
  fellTimer = setTimeout(() => { showFellFlash.value = false }, 500)
}

function sizeCanvas() {
  const wrap = wrapRef.value
  if (!engine || !wrap) return
  engine.resize(wrap.clientWidth, wrap.clientHeight)
}

function closePlay() {
  clearTimeout(fellTimer)
  if (engine) { engine.dispose(); engine = null }
  playOpen.value = false
}

async function finishRun() {
  runState.value = 'finished'
  const stars = starsForFalls(falls.value)
  saving.value = true
  try {
    const data = await game.completeParkourLevel(playLevel.value, stars)
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

function ensureRunning() {
  if (runState.value === 'ready') {
    runState.value = 'running'
    engine?.begin()
    return true
  }
  return false
}

// Tap = Springen, horizontaler Wisch = Spurwechsel, Wisch nach oben = Springen.
function onPointerDown(e) {
  if (quitConfirm.value || runState.value === 'finished' || engineLoading.value) return
  pointer = { x: e.clientX, y: e.clientY, t: performance.now() }
}

function onPointerUp(e) {
  if (!pointer) return
  const dx = e.clientX - pointer.x
  const dy = e.clientY - pointer.y
  const dt = performance.now() - pointer.t
  pointer = null
  const dist = Math.hypot(dx, dy)
  const started = ensureRunning()
  if (dist < 16 && dt < 320) {
    if (!started) engine?.jump()
    return
  }
  if (Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy)) {
    engine?.moveLane(dx > 0 ? 1 : -1)
  } else if (dy < -24 && Math.abs(dy) > Math.abs(dx)) {
    engine?.jump()
  }
}

function onKeyDown(e) {
  if (!playOpen.value || engineLoading.value || runState.value === 'finished') return
  const started = ensureRunning()
  if (e.key === 'ArrowLeft' || e.key === 'a') engine?.moveLane(-1)
  else if (e.key === 'ArrowRight' || e.key === 'd') engine?.moveLane(1)
  else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') { if (!started) engine?.jump() }
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

function dismissTutorial() {
  showTutorial.value = false
  try { localStorage.setItem(TUT_KEY, '1') } catch {}
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('resize', sizeCanvas)
  let seen = false
  try { seen = localStorage.getItem(TUT_KEY) === '1' } catch { seen = false }
  if (!seen) showTutorial.value = true
  loadProgress()
})

onUnmounted(() => {
  closePlay()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('resize', sizeCanvas)
})
</script>

<template>
  <div class="pk-view">
    <header class="pk-header">
      <Button class="btn small btn-ghost" @click="router.push('/')">
        <i class="pi pi-arrow-left"></i><span>{{ tx('back') }}</span>
      </Button>
      <div class="pk-title-block">
        <h1 class="pk-title">{{ tx('title') }}</h1>
        <p class="pk-sub">{{ tx('sub') }}</p>
      </div>
      <Button class="btn small btn-ghost help-btn" @click="showTutorial = true">
        <i class="pi pi-question-circle"></i>
      </Button>
    </header>

    <div v-if="loading" class="card pk-state">
      <i class="pi pi-spin pi-spinner"></i><span>{{ tx('loading') }}</span>
    </div>
    <div v-else-if="error" class="card pk-state error-state">
      <span>{{ error }}</span>
      <Button class="btn small" @click="loadProgress">{{ tx('retry') }}</Button>
    </div>

    <template v-else>
      <section class="pk-stats">
        <div class="pk-stat">
          <strong>{{ highest }} / {{ MAX_LEVEL }}</strong><span>{{ tx('best') }}</span>
        </div>
        <div class="pk-stat">
          <strong>⭐ {{ totalStars }} / {{ MAX_LEVEL * 3 }}</strong><span>{{ tx('stars') }}</span>
        </div>
      </section>

      <section class="pk-grid">
        <div
          v-for="node in levels"
          :key="node.level"
          class="pk-node card"
          :class="'st-' + node.status"
        >
          <div class="pn-level">{{ tx('level') }} {{ node.level }}</div>
          <div class="pn-icon">{{ node.status === 'locked' ? '🔒' : '🐾' }}</div>
          <div class="pn-stars">
            <span v-for="s in 3" :key="s" :class="{ on: s <= node.stars }">★</span>
          </div>
          <div class="pn-info">{{ node.obstacles }} {{ tx('obstaclesWord') }}</div>
          <div class="pn-reward">
            🪙 {{ formatCoins(node.reward.coins) }}<template v-if="node.reward.tickets"> · 🎟️ {{ node.reward.tickets }}</template>
          </div>
          <Button
            v-if="node.status !== 'locked'"
            class="btn pn-play"
            :class="{ secondary: node.status === 'cleared' }"
            @click="startRun(node.level)"
          >
            {{ node.status === 'cleared' ? '↻ ' + tx('replay') : '▶ ' + tx('play') }}
          </Button>
          <div v-else class="pn-locked">{{ tx('locked') }}</div>
        </div>
      </section>
    </template>

    <Teleport to="body">
      <div v-if="playOpen" class="pk-overlay">
        <div class="pk-hud">
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
            <div class="hud-falls">💥 {{ falls }}</div>
          </div>
        </div>

        <div
          ref="wrapRef"
          class="pk-canvas-wrap"
          @pointerdown="onPointerDown"
          @pointerup="onPointerUp"
          @pointercancel="pointer = null"
        >
          <canvas ref="canvasRef"></canvas>
          <div v-if="engineLoading" class="pk-loading-3d">
            <i class="pi pi-spin pi-spinner"></i><span>{{ tx('loading3d') }}</span>
          </div>
          <div v-else-if="runState === 'ready'" class="pk-start-hint">
            <div class="psh-tap">👆 {{ tx('tapToStart') }}</div>
            <div class="psh-hold">{{ tx('controlsHint') }}</div>
          </div>
          <div v-if="showFellFlash" class="pk-fell-flash">{{ tx('fell') }}</div>
        </div>

        <div v-if="runState === 'finished'" class="pk-finish">
          <div class="pf-panel card">
            <template v-if="saving">
              <div class="pf-emoji"><i class="pi pi-spin pi-spinner"></i></div>
              <h3>{{ tx('saving') }}</h3>
            </template>
            <template v-else-if="rewardData">
              <div class="pf-emoji">🏁</div>
              <h3>{{ tx('finishTitle') }}</h3>
              <div class="pf-stars">
                <span v-for="s in 3" :key="s" :class="{ on: s <= rewardData.runStars }">★</span>
              </div>
              <div class="pf-badge" :class="{ replay: !rewardData.firstClear }">
                {{ rewardData.firstClear ? tx('firstClear') : tx('replayReward') }}
              </div>
              <div v-if="rewardData.firstClear && rewardData.runStars === 3" class="pf-perfect">
                {{ tx('perfect') }}
              </div>
              <div class="pf-items">
                <div class="pf-item">🪙 +{{ formatCoins(rewardData.coins) }}</div>
                <div v-if="rewardData.tickets > 0" class="pf-item tickets">🎟️ +{{ rewardData.tickets }}</div>
              </div>
              <Button
                v-if="playLevel < MAX_LEVEL && playLevel <= highest"
                class="btn full"
                @click="nextLevel"
              >{{ tx('next') }}</Button>
              <Button class="btn full secondary" @click="closePlay">{{ tx('toMap') }}</Button>
            </template>
          </div>
        </div>

        <div v-if="quitConfirm" class="pk-finish">
          <div class="pf-panel card">
            <div class="pf-emoji">🏳️</div>
            <h3>{{ tx('quitTitle') }}</h3>
            <p class="pf-sub">{{ tx('quitSub') }}</p>
            <Button class="btn full" @click="quitConfirm = false">{{ tx('quitNo') }}</Button>
            <Button class="btn full secondary" @click="confirmQuit">{{ tx('quitYes') }}</Button>
          </div>
        </div>
      </div>

      <div v-if="showTutorial" class="tut-backdrop" @click.self="dismissTutorial">
        <div class="tut-dialog card">
          <h3 class="tut-title">{{ tx('tutTitle') }}</h3>
          <div class="tut-demo">
            <span class="tut-animal">🐾</span>
            <span class="tut-trail">▫️▫️</span>
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
.pk-view { display:flex; flex-direction:column; gap:12px; padding-bottom:18px; }
.pk-header { display:flex; align-items:center; gap:10px; }
.btn-ghost { background:var(--card-2); color:var(--muted);
  display:inline-flex; align-items:center; gap:5px; flex-shrink:0; }
.pk-title-block { flex:1; min-width:0; }
.pk-title { margin:0; font-size:22px; font-weight:900; color:var(--heading); }
.pk-sub { margin:2px 0 0; color:var(--muted); font-size:13px; }
.help-btn { flex-shrink:0; }
.pk-state { display:flex; align-items:center; justify-content:center; gap:10px;
  min-height:140px; color:var(--muted); font-weight:800; }
.error-state { flex-direction:column; color:var(--danger); }
.pk-stats { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.pk-stat { background:var(--card); border:2px solid var(--border); border-radius:14px;
  padding:12px 10px; text-align:center; box-shadow:var(--shadow-card); }
.pk-stat strong { display:block; color:var(--accent-deep); font-weight:900; font-size:17px; }
.pk-stat span { display:block; color:var(--muted); font-size:11px; font-weight:700;
  margin-top:4px; text-transform:uppercase; letter-spacing:0.03em; }

.pk-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
.pk-node { display:flex; flex-direction:column; align-items:center; gap:5px;
  padding:14px 10px; text-align:center; }
.pk-node.st-locked { filter:grayscale(0.6); opacity:0.65; }
.pk-node.st-current { border-color:var(--accent);
  box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent), var(--shadow-card);
  animation:pkPulse 2.4s ease-in-out infinite; }
@keyframes pkPulse {
  0%,100% { box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent), var(--shadow-card); }
  50% { box-shadow:0 0 0 7px color-mix(in srgb, var(--accent) 8%, transparent), var(--shadow-card); } }
.pn-level { font-size:11px; letter-spacing:0.06em; text-transform:uppercase;
  color:var(--muted); font-weight:800; }
.pn-icon { font-size:34px; line-height:1.1; filter:drop-shadow(0 4px 8px rgba(110,80,20,0.25)); }
.pn-stars { display:flex; gap:2px; font-size:16px; color:#ddd0b0; }
.pn-stars .on { color:var(--accent); text-shadow:0 1px 0 rgba(160,110,0,0.4); }
.pn-info { font-size:12px; color:var(--muted); font-weight:800; }
.pn-reward { font-size:11px; color:var(--accent-deep); font-weight:900; }
.pn-play { width:100%; font-weight:900; margin-top:3px; }
.pn-locked { font-size:12px; color:var(--muted); font-weight:800; padding:8px 0 2px; }

.pk-overlay { position:fixed; inset:0; z-index:1100; display:flex; flex-direction:column;
  background:#fdf4dd; touch-action:none; overscroll-behavior:none; }
.pk-hud { display:flex; align-items:center; gap:10px;
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
.hud-falls { font-size:12px; font-weight:900; color:var(--heading); }
.pk-canvas-wrap { position:relative; flex:1; min-height:0; cursor:pointer; }
.pk-canvas-wrap canvas { position:absolute; inset:0; display:block; width:100%; height:100%; }
.pk-loading-3d { position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  gap:10px; color:var(--heading); font-weight:800; background:rgba(253,244,221,0.7); }
.pk-start-hint { position:absolute; left:0; right:0; top:16%; display:flex;
  flex-direction:column; align-items:center; gap:8px; pointer-events:none; }
.psh-tap { background:rgba(255,255,255,0.94); border-radius:999px; padding:10px 20px;
  font-weight:900; font-size:16px; color:var(--heading);
  box-shadow:0 8px 22px rgba(0,0,0,0.18); animation:pshBounce 1.4s ease-in-out infinite; }
.psh-hold { background:rgba(0,0,0,0.45); color:#fff; border-radius:999px;
  padding:6px 14px; font-weight:800; font-size:12px; }
@keyframes pshBounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
.pk-fell-flash { position:absolute; left:50%; top:30%; transform:translate(-50%,-50%);
  background:rgba(239,71,111,0.95); color:#fff; font-weight:900; font-size:20px;
  border-radius:999px; padding:10px 22px; pointer-events:none;
  animation:fellIn 0.25s ease-out; box-shadow:0 10px 30px rgba(0,0,0,0.3); }
@keyframes fellIn { from { transform:translate(-50%,-50%) scale(0.5); opacity:0; }
  to { transform:translate(-50%,-50%) scale(1); opacity:1; } }

.pk-finish { position:absolute; inset:0; display:flex; align-items:center;
  justify-content:center; padding:18px; background:rgba(40,25,5,0.45);
  backdrop-filter:blur(4px); z-index:5; }
.pf-panel { width:min(340px,100%); display:flex; flex-direction:column; align-items:center;
  gap:9px; padding:24px 20px; text-align:center; animation:pfIn 0.3s cubic-bezier(0.34,1.56,0.64,1); }
@keyframes pfIn { from { transform:translateY(18px) scale(0.92); opacity:0; }
  to { transform:translateY(0) scale(1); opacity:1; } }
.pf-emoji { font-size:52px; line-height:1; }
.pf-panel h3 { margin:0; font-size:20px; font-weight:900; color:var(--heading); }
.pf-sub { margin:0; color:var(--muted); font-size:13px; font-weight:700; }
.pf-stars { font-size:30px; color:#ddd0b0; letter-spacing:3px; }
.pf-stars .on { color:var(--accent); text-shadow:0 2px 0 rgba(160,110,0,0.35); }
.pf-badge { border-radius:999px; padding:5px 14px; font-size:12px; font-weight:900;
  background:color-mix(in srgb, var(--accent-2) 18%, #fff); color:#157a4c;
  border:2px solid color-mix(in srgb, var(--accent-2) 55%, #fff); }
.pf-badge.replay { background:var(--card-2); color:var(--muted); border-color:var(--border); }
.pf-perfect { font-size:12px; font-weight:900; color:var(--accent-deep); }
.pf-items { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin:4px 0 6px; }
.pf-item { border-radius:14px; padding:10px 16px; font-size:17px; font-weight:900;
  color:var(--accent-deep); background:linear-gradient(180deg,#fffaf0,#fff1d0);
  border:2px solid var(--accent-soft); }
.pf-item.tickets { color:var(--purple-deep); border-color:var(--purple);
  background:linear-gradient(180deg,#f7f2ff,#ece1ff); }

.tut-backdrop { position:fixed; inset:0; background:rgba(60,40,10,0.5); display:flex;
  align-items:center; justify-content:center; z-index:1400; padding:16px; backdrop-filter:blur(5px); }
.tut-dialog { max-width:380px; width:100%; padding:22px; text-align:center;
  display:flex; flex-direction:column; gap:14px; }
.tut-title { margin:0; font-size:20px; font-weight:900; color:var(--heading); }
.tut-demo { display:flex; align-items:center; justify-content:center; gap:4px;
  font-size:34px; padding:4px 0; }
.tut-animal { animation:tutHop 1.4s ease-in-out infinite; display:inline-block; }
.tut-trail { font-size:22px; opacity:0.5; }
@keyframes tutHop { 0%,100% { transform:translateY(0); } 40% { transform:translateY(-12px); } }
.tut-steps { text-align:left; margin:0; padding-left:20px; display:flex;
  flex-direction:column; gap:8px; color:var(--text); font-size:13px; font-weight:600; }
.tut-steps li { line-height:1.4; }
.tut-got { width:100%; font-weight:900; }

@media (max-width:420px) {
  .pk-grid { grid-template-columns:repeat(2,1fr); gap:8px; }
}
</style>
