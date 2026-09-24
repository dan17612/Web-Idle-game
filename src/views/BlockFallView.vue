<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { locale } from '../i18n'
import { formatCoins } from '../animals'
import { useGameStore } from '../stores/game'
import { useAuthStore } from '../stores/auth'
import { useAppToast } from '../composables/useAppToast'
import { useReturnRefresh } from '../composables/useReturnRefresh'
import {
  BlockFallGame, COLS, VISIBLE_ROWS, HIDDEN_ROWS, ROWS, MAX_LEVEL, LEVELS_PER_CHAPTER,
  GARBAGE, PIECE_TYPES, ROTATIONS, CHAPTERS, levelConfig, blockfallReward
} from '../blockfall'

const router = useRouter()
const game = useGameStore()
const auth = useAuthStore()
const appToast = useAppToast()

const TUT_KEY = 'blockfall_tutorial_v1'

const I18N = {
  de: {
    title: '🧱 BlockFall', sub: '30 Level im Pfad. Stapeln, drehen, Reihen abräumen!',
    back: 'Zurück', level: 'Level', best: 'Bestes Level', stars: 'Sterne',
    loading: 'Lade Fortschritt...', retry: 'Erneut versuchen',
    eventEnded: 'Ereignis beendet', eventEndedSub: 'Das BlockFall-Ereignis ist vorbei. Es können keine Level mehr gestartet werden.',
    endsIn: 'Endet in {time}',
    chapter: 'Kapitel {n}', ch_meadow: 'Wiese', ch_desert: 'Wüste', ch_ice: 'Eisland', ch_volcano: 'Vulkan', ch_stars: 'Sternenhimmel',
    goal: 'Ziel', goalLines: '{n} Reihen', speed: 'Tempo', speedVal: '{n} Reihen/s', garbage: 'Müll-Reihen', none: 'keine',
    starRules: 'Sterne', star1: 'Ziel geschafft', starN: 'ab {n} Punkten',
    reward: 'Belohnung (Erstabschluss)', perfectBonus: '⭐⭐⭐ = +50 % Coins', replayReward: 'Wiederholung: 🪙 {n}',
    play: 'Spielen', replay: 'Nochmal', locked: 'Gesperrt', close: 'Schließen',
    lines: 'Reihen', score: 'Punkte', hold: 'Halten', next: 'Nächste',
    tapToStart: 'Los geht\'s!', startHint: 'Tippen = drehen · Ziehen = schieben · Wisch ↓ = fallen',
    paused: 'Pause', resume: 'Weiter',
    clear1: 'Reihe!', clear2: 'Doppel!', clear3: 'Dreifach!', clear4: 'BlockFall!', combo: 'Kombo ×{n}',
    winTitle: '🏁 Level geschafft!', firstClear: 'Level freigeschaltet!', replayBadge: 'Wiederholungs-Bonus',
    perfect: '⭐ Perfekt! +50% Coins', nextLevel: 'Nächstes Level ▶', toMap: 'Zum Pfad', saving: 'Speichere...',
    lostTitle: 'Feld voll!', lostSub: '{lines} von {goal} Reihen geschafft.', tryAgain: 'Nochmal versuchen',
    quitTitle: 'Level abbrechen?', quitSub: 'Der Fortschritt in diesem Level geht verloren.', quitNo: 'Weiterspielen', quitYes: 'Abbrechen',
    saveFailed: 'Speichern fehlgeschlagen',
    tutTitle: 'So funktioniert BlockFall',
    tut1: 'Blöcke fallen von oben. Schiebe sie mit ◀ ▶ oder ziehe den Finger über das Feld.',
    tut2: 'Tippe aufs Feld oder ⟳ zum Drehen. ⤓ oder ein schneller Wisch nach unten lässt den Stein sofort fallen.',
    tut3: 'Volle Reihen verschwinden. Räume die Ziel-Anzahl ab, bevor das Feld überläuft.',
    tut4: 'Mehrere Reihen auf einmal und Kombos bringen mehr Punkte — und mehr Sterne. 3 Sterne beim Erstabschluss = +50 % Coins.',
    tut5: 'Tippe auf „Halten", um einen Stein für später zu parken.',
    tutGot: 'Verstanden, los geht\'s!'
  },
  en: {
    title: '🧱 BlockFall', sub: '30 levels on the path. Stack, rotate, clear lines!',
    back: 'Back', level: 'Level', best: 'Best level', stars: 'Stars',
    loading: 'Loading progress...', retry: 'Try again',
    eventEnded: 'Event ended', eventEndedSub: 'The BlockFall event is over. No more levels can be started.',
    endsIn: 'Ends in {time}',
    chapter: 'Chapter {n}', ch_meadow: 'Meadow', ch_desert: 'Desert', ch_ice: 'Ice Land', ch_volcano: 'Volcano', ch_stars: 'Starry Sky',
    goal: 'Goal', goalLines: '{n} lines', speed: 'Speed', speedVal: '{n} rows/s', garbage: 'Garbage rows', none: 'none',
    starRules: 'Stars', star1: 'Goal reached', starN: 'from {n} points',
    reward: 'Reward (first clear)', perfectBonus: '⭐⭐⭐ = +50% coins', replayReward: 'Replay: 🪙 {n}',
    play: 'Play', replay: 'Replay', locked: 'Locked', close: 'Close',
    lines: 'Lines', score: 'Score', hold: 'Hold', next: 'Next',
    tapToStart: 'Let\'s go!', startHint: 'Tap = rotate · Drag = move · Swipe ↓ = drop',
    paused: 'Paused', resume: 'Resume',
    clear1: 'Line!', clear2: 'Double!', clear3: 'Triple!', clear4: 'BlockFall!', combo: 'Combo ×{n}',
    winTitle: '🏁 Level cleared!', firstClear: 'Level unlocked!', replayBadge: 'Replay bonus',
    perfect: '⭐ Perfect! +50% coins', nextLevel: 'Next level ▶', toMap: 'Back to path', saving: 'Saving...',
    lostTitle: 'Board full!', lostSub: '{lines} of {goal} lines cleared.', tryAgain: 'Try again',
    quitTitle: 'Quit the level?', quitSub: 'Progress in this level will be lost.', quitNo: 'Keep playing', quitYes: 'Quit',
    saveFailed: 'Saving failed',
    tutTitle: 'How BlockFall works',
    tut1: 'Blocks fall from the top. Move them with ◀ ▶ or drag your finger across the board.',
    tut2: 'Tap the board or ⟳ to rotate. ⤓ or a quick swipe down drops the piece instantly.',
    tut3: 'Full lines disappear. Clear the goal number of lines before the board overflows.',
    tut4: 'Multiple lines at once and combos score more points — and more stars. 3 stars on first clear = +50% coins.',
    tut5: 'Tap "Hold" to park a piece for later.',
    tutGot: 'Got it, let\'s go!'
  },
  ru: {
    title: '🧱 BlockFall', sub: '30 уровней на пути. Складывай, вращай, очищай ряды!',
    back: 'Назад', level: 'Уровень', best: 'Лучший уровень', stars: 'Звёзды',
    loading: 'Загрузка прогресса...', retry: 'Повторить',
    eventEnded: 'Событие завершено', eventEndedSub: 'Событие BlockFall завершено. Новые уровни недоступны.',
    endsIn: 'Закончится через {time}',
    chapter: 'Глава {n}', ch_meadow: 'Луг', ch_desert: 'Пустыня', ch_ice: 'Ледяная земля', ch_volcano: 'Вулкан', ch_stars: 'Звёздное небо',
    goal: 'Цель', goalLines: '{n} рядов', speed: 'Скорость', speedVal: '{n} ряд./с', garbage: 'Мусорные ряды', none: 'нет',
    starRules: 'Звёзды', star1: 'Цель достигнута', starN: 'от {n} очков',
    reward: 'Награда (первое прохождение)', perfectBonus: '⭐⭐⭐ = +50% монет', replayReward: 'Повтор: 🪙 {n}',
    play: 'Играть', replay: 'Снова', locked: 'Закрыто', close: 'Закрыть',
    lines: 'Ряды', score: 'Очки', hold: 'Запас', next: 'Далее',
    tapToStart: 'Поехали!', startHint: 'Нажатие = поворот · Тянуть = двигать · Свайп ↓ = бросить',
    paused: 'Пауза', resume: 'Продолжить',
    clear1: 'Ряд!', clear2: 'Двойной!', clear3: 'Тройной!', clear4: 'BlockFall!', combo: 'Комбо ×{n}',
    winTitle: '🏁 Уровень пройден!', firstClear: 'Уровень открыт!', replayBadge: 'Бонус за повтор',
    perfect: '⭐ Идеально! +50% монет', nextLevel: 'Следующий уровень ▶', toMap: 'К пути', saving: 'Сохранение...',
    lostTitle: 'Поле заполнено!', lostSub: 'Очищено {lines} из {goal} рядов.', tryAgain: 'Попробовать снова',
    quitTitle: 'Прервать уровень?', quitSub: 'Прогресс на этом уровне будет потерян.', quitNo: 'Играть дальше', quitYes: 'Прервать',
    saveFailed: 'Не удалось сохранить',
    tutTitle: 'Как играть в BlockFall',
    tut1: 'Блоки падают сверху. Двигай их кнопками ◀ ▶ или веди пальцем по полю.',
    tut2: 'Нажми на поле или ⟳, чтобы повернуть. ⤓ или быстрый свайп вниз сразу бросает блок.',
    tut3: 'Заполненные ряды исчезают. Очисти нужное число рядов, пока поле не переполнилось.',
    tut4: 'Несколько рядов сразу и комбо дают больше очков — и больше звёзд. 3 звезды при первом прохождении = +50% монет.',
    tut5: 'Нажми «Запас», чтобы отложить блок на потом.',
    tutGot: 'Понятно, поехали!'
  }
}

function tx(key, vars = {}) {
  const dict = I18N[locale.value] || I18N.en
  let value = dict[key]
  if (value == null) value = I18N.en[key]
  return String(value ?? key).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

// Farben je Stein (Index = PIECE_TYPES-Index + 1), 8 = Müll.
const COLORS = ['', '#4cc9f0', '#f4c21a', '#9b5de5', '#2ec272', '#ef476f', '#3a86ff', '#ff8c42', '#c7b18a']
const SHADES = ['', '#2b9fc4', '#c99a0a', '#7239b8', '#1f9656', '#c22d51', '#1f5fd1', '#d8661e', '#9c8762']
const BOARD_BG = ['#f1fbe9', '#fff4df', '#ecf7ff', '#fff0ea', '#f1ecff']

// ── Fortschritt & Pfad ────────────────────────────────────────────────────
const loading = ref(true)
const error = ref('')
const showTutorial = ref(false)

const highest = computed(() => Number(game.blockfallProgress?.highest_level || 0))
const starsMap = computed(() => game.blockfallProgress?.stars || {})
const totalStars = computed(() => {
  let sum = 0
  for (let i = 1; i <= MAX_LEVEL; i++) sum += Number(starsMap.value[String(i)] || 0)
  return sum
})
const eventActive = computed(() => game.blockfallActive)

const now = ref(Date.now())
let clockTimer = 0
const eventCountdown = computed(() => {
  void now.value
  const info = game.eventFor('blockfall_game')
  if (!info.showCountdown || info.ended) return ''
  return fmtCountdown(Math.max(0, info.endsAt - (Date.now() + game.serverOffset)))
})

function fmtCountdown(ms) {
  const total = Math.floor(ms / 1000)
  const d = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${total % 60}s`
}

// Serpentine: x in Prozent der Breite, eine Reihe pro Level.
const PATH_X = [22, 48, 74, 80, 54, 28]
const ROW_H = 96
const PATH_H = LEVELS_PER_CHAPTER * ROW_H

function levelStatus(lvl) {
  if (lvl <= highest.value) return 'cleared'
  if (lvl === highest.value + 1) return 'current'
  return 'locked'
}

const chapters = computed(() => CHAPTERS.map((ch, ci) => {
  const nodes = []
  let stars = 0
  for (let i = 0; i < LEVELS_PER_CHAPTER; i++) {
    const level = ci * LEVELS_PER_CHAPTER + i + 1
    const s = Number(starsMap.value[String(level)] || 0)
    stars += s
    nodes.push({
      level,
      x: PATH_X[i],
      y: ROW_H / 2 + i * ROW_H,
      status: levelStatus(level),
      stars: s,
      tickets: blockfallReward(level).tickets
    })
  }
  // Glatte Kurve durch alle Knoten; der Fortschritts-Pfad endet am aktuellen Level.
  const seg = (a, b) => `C ${a.x} ${a.y + ROW_H / 2} ${b.x} ${b.y - ROW_H / 2} ${b.x} ${b.y}`
  let full = `M ${nodes[0].x} ${nodes[0].y}`
  let done = full
  let doneLen = 0
  for (let i = 1; i < nodes.length; i++) {
    full += ' ' + seg(nodes[i - 1], nodes[i])
    if (nodes[i].status !== 'locked') { done += ' ' + seg(nodes[i - 1], nodes[i]); doneLen++ }
  }
  return {
    ...ch,
    index: ci,
    name: tx('ch_' + ch.id),
    nodes,
    stars,
    locked: nodes[0].status === 'locked',
    fullPath: full,
    donePath: doneLen ? done : ''
  }
}))

async function loadProgress() {
  loading.value = true
  error.value = ''
  try {
    await game.loadBlockFallProgress()
  } catch (e) {
    error.value = e?.message || 'Fehler'
  } finally {
    loading.value = false
  }
}

async function scrollToCurrent() {
  await nextTick()
  document.querySelector('.bf-node.st-current')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

// ── Level-Karte ───────────────────────────────────────────────────────────
const sheetLevel = ref(0)
const sheet = computed(() => {
  if (!sheetLevel.value) return null
  const cfg = levelConfig(sheetLevel.value)
  const reward = blockfallReward(cfg.level)
  return {
    ...cfg,
    status: levelStatus(cfg.level),
    stars: Number(starsMap.value[String(cfg.level)] || 0),
    speed: (1000 / cfg.gravityMs).toFixed(1),
    reward,
    replayCoins: Math.max(100, Math.floor(reward.coins / 20)),
    chapterIcon: CHAPTERS[cfg.chapter].icon
  }
})

function openSheet(node) {
  sheetLevel.value = node.level
}

// ── Spiel ─────────────────────────────────────────────────────────────────
const playOpen = ref(false)
const playLevel = ref(1)
const phase = ref('ready') // ready | running | paused | won | lost
const quitConfirm = ref(false)
const saving = ref(false)
const rewardData = ref(null)
const saveError = ref('')

const hudLines = ref(0)
const hudGoal = ref(0)
const hudScore = ref(0)
const hudStars = ref(1)
const hudStar2 = ref(0)
const hudStar3 = ref(0)
const holdType = ref(null)
const holdUsed = ref(false)
const nextTypes = ref([])
const popups = ref([])
const boardBg = ref(BOARD_BG[0])

const canvasRef = ref(null)
const boardWrapRef = ref(null)

let bf = null // BlockFallGame — bewusst nicht reaktiv
let ctx = null
let raf = 0
let lastTs = 0
let cell = 20
let dpr = 1
let softHeld = false
let flashes = []
let popupId = 0
const popupTimers = new Set()
const DAS = 160
const ARR = 45
const repeat = { left: null, right: null }

function startLevel(level) {
  if (!eventActive.value) { appToast.err(tx('eventEnded')); return }
  sheetLevel.value = 0
  playLevel.value = level
  bf = new BlockFallGame(level)
  boardBg.value = BOARD_BG[bf.cfg.chapter] || BOARD_BG[0]
  phase.value = 'ready'
  quitConfirm.value = false
  rewardData.value = null
  saveError.value = ''
  flashes = []
  popups.value = []
  softHeld = false
  repeat.left = repeat.right = null
  syncHud()
  playOpen.value = true
  nextTick(() => {
    const canvas = canvasRef.value
    if (!canvas || !bf) return
    ctx = canvas.getContext('2d')
    sizeBoard()
    lastTs = 0
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(frame)
  })
}

function closePlay() {
  cancelAnimationFrame(raf)
  raf = 0
  bf = null
  ctx = null
  for (const t of popupTimers) clearTimeout(t)
  popupTimers.clear()
  playOpen.value = false
}

function sizeBoard() {
  const wrap = boardWrapRef.value
  const canvas = canvasRef.value
  if (!wrap || !canvas) return
  dpr = Math.min(2, window.devicePixelRatio || 1)
  cell = Math.max(8, Math.floor(Math.min(wrap.clientWidth / COLS, wrap.clientHeight / VISIBLE_ROWS)))
  const w = cell * COLS
  const h = cell * VISIBLE_ROWS
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  canvas.style.width = w + 'px'
  canvas.style.height = h + 'px'
}

function frame(ts) {
  raf = requestAnimationFrame(frame)
  const dt = lastTs ? Math.min(100, ts - lastTs) : 16
  lastTs = ts
  if (!bf) return
  if (phase.value === 'running') {
    stepRepeat(dt)
    bf.update(dt, softHeld)
    handleEvents()
  }
  flashes = flashes.filter((f) => (f.age += dt) < 220)
  syncHud()
  draw()
}

function syncHud() {
  if (!bf) return
  hudLines.value = bf.lines
  hudGoal.value = bf.cfg.goalLines
  hudScore.value = bf.score
  hudStars.value = bf.stars
  hudStar2.value = bf.cfg.star2
  hudStar3.value = bf.cfg.star3
  holdType.value = bf.hold
  holdUsed.value = bf.holdUsed
  const next = bf.queue.slice(0, 3)
  if (next.join() !== nextTypes.value.join()) nextTypes.value = next
}

function handleEvents() {
  for (const ev of bf.drainEvents()) {
    if (ev.type === 'clear') {
      for (const row of ev.rows) flashes.push({ row: row - HIDDEN_ROWS, age: 0 })
      pushPopup(tx('clear' + Math.min(4, ev.count)), ev.combo > 0 ? tx('combo', { n: ev.combo }) : '', ev.points)
      try { navigator.vibrate?.(ev.count >= 4 ? 40 : 15) } catch {}
    } else if (ev.type === 'win') {
      phase.value = 'won'
      finishLevel()
    } else if (ev.type === 'gameover') {
      phase.value = 'lost'
      softHeld = false
    }
  }
}

function pushPopup(text, sub, points) {
  const id = ++popupId
  popups.value.push({ id, text, sub, points })
  const timer = setTimeout(() => {
    popupTimers.delete(timer)
    popups.value = popups.value.filter((p) => p.id !== id)
  }, 1000)
  popupTimers.add(timer)
}

// ── Zeichnen ──────────────────────────────────────────────────────────────
function rr(x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawBlock(x, y, v) {
  const c = cell
  const pad = Math.max(1, c * 0.06)
  const s = c - pad * 2
  const r = c * 0.22
  const px = x * c + pad
  const py = y * c + pad
  ctx.fillStyle = SHADES[v]
  rr(px, py, s, s, r)
  ctx.fill()
  ctx.fillStyle = COLORS[v]
  rr(px, py, s, s - c * 0.12, r)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.38)'
  rr(px + s * 0.16, py + s * 0.1, s * 0.68, s * 0.16, s * 0.08)
  ctx.fill()
  if (v !== GARBAGE && c >= 14) {
    ctx.fillStyle = 'rgba(40,25,5,0.72)'
    ctx.beginPath()
    ctx.arc(x * c + c * 0.36, y * c + c * 0.5, c * 0.07, 0, Math.PI * 2)
    ctx.arc(x * c + c * 0.64, y * c + c * 0.5, c * 0.07, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawGhost(x, y, v) {
  const c = cell
  const pad = Math.max(1, c * 0.08)
  ctx.fillStyle = COLORS[v] + '22'
  ctx.strokeStyle = COLORS[v] + '99'
  ctx.lineWidth = Math.max(1, c * 0.07)
  rr(x * c + pad, y * c + pad, c - pad * 2, c - pad * 2, c * 0.2)
  ctx.fill()
  ctx.stroke()
}

function draw() {
  if (!ctx || !bf) return
  const w = cell * COLS
  const h = cell * VISIBLE_ROWS
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = boardBg.value
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(120, 90, 30, 0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 1; x < COLS; x++) { ctx.moveTo(x * cell + 0.5, 0); ctx.lineTo(x * cell + 0.5, h) }
  for (let y = 1; y < VISIBLE_ROWS; y++) { ctx.moveTo(0, y * cell + 0.5); ctx.lineTo(w, y * cell + 0.5) }
  ctx.stroke()

  for (let y = HIDDEN_ROWS; y < ROWS; y++) {
    const row = bf.board[y]
    for (let x = 0; x < COLS; x++) if (row[x]) drawBlock(x, y - HIDDEN_ROWS, row[x])
  }

  if (bf.active && !bf.finished) {
    const v = PIECE_TYPES.indexOf(bf.active.type) + 1
    const gy = bf.ghostY()
    const cells = bf.cellsOf()
    if (gy !== bf.active.y) {
      for (const [x, y] of cells) {
        const yy = y - bf.active.y + gy
        if (yy >= HIDDEN_ROWS) drawGhost(x, yy - HIDDEN_ROWS, v)
      }
    }
    for (const [x, y] of cells) if (y >= HIDDEN_ROWS) drawBlock(x, y - HIDDEN_ROWS, v)
  }

  for (const f of flashes) {
    ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - f.age / 220)})`
    ctx.fillRect(0, f.row * cell, w, cell)
  }
}

// Mini-Vorschau für Halten/Nächste: Zellen der Grundform, normiert.
function miniCells(type) {
  if (!type) return []
  const cells = ROTATIONS[type][0]
  const minX = Math.min(...cells.map(([x]) => x))
  const minY = Math.min(...cells.map(([, y]) => y))
  const maxX = Math.max(...cells.map(([x]) => x))
  const width = maxX - minX + 1
  const v = PIECE_TYPES.indexOf(type) + 1
  return cells.map(([x, y], i) => ({
    key: i,
    left: ((x - minX) + (4 - width) / 2) * 25 + '%',
    top: ((y - minY) + (type === 'I' ? 0.5 : 0)) * 50 + '%',
    color: COLORS[v],
    shade: SHADES[v]
  }))
}

// ── Steuerung ─────────────────────────────────────────────────────────────
function canAct() {
  if (!bf || quitConfirm.value) return false
  if (phase.value === 'ready') { phase.value = 'running'; return true }
  return phase.value === 'running'
}

function press(action) {
  if (!canAct()) return
  switch (action) {
    case 'left': bf.move(-1); repeat.left = { t: 0, next: DAS }; repeat.right = null; break
    case 'right': bf.move(1); repeat.right = { t: 0, next: DAS }; repeat.left = null; break
    case 'down': softHeld = true; break
    case 'rotate': bf.rotate(1); break
    case 'rotateCcw': bf.rotate(-1); break
    case 'drop': bf.hardDrop(); handleEvents(); break
    case 'hold': bf.holdPiece(); break
  }
}

function release(action) {
  if (action === 'left') repeat.left = null
  else if (action === 'right') repeat.right = null
  else if (action === 'down') softHeld = false
}

function stepRepeat(dt) {
  for (const key of ['left', 'right']) {
    const r = repeat[key]
    if (!r) continue
    r.t += dt
    while (r.t >= r.next) {
      if (!bf.move(key === 'left' ? -1 : 1)) break
      r.next += ARR
    }
  }
}

// Gesten auf dem Feld: Tippen = drehen, Ziehen = schieben / langsam runter,
// schneller Wisch nach unten = fallen lassen.
let drag = null
function onBoardDown(e) {
  const starting = phase.value === 'ready'
  if (!canAct()) return
  e.currentTarget.setPointerCapture?.(e.pointerId)
  drag = { x: e.clientX, y: e.clientY, t: performance.now(), mx: 0, my: 0, moved: false, starting }
}

function onBoardMove(e) {
  if (!drag || !bf || phase.value !== 'running') return
  const dx = e.clientX - drag.x
  const dy = e.clientY - drag.y
  const step = Math.max(14, cell * 0.9)
  const wantX = Math.trunc(dx / step)
  while (drag.mx < wantX && bf.move(1)) { drag.mx++; drag.moved = true }
  while (drag.mx > wantX && bf.move(-1)) { drag.mx--; drag.moved = true }
  if (drag.mx !== wantX) drag.mx = wantX
  const wantY = Math.max(0, Math.trunc(dy / step))
  if (Math.abs(dy) > Math.abs(dx) * 1.2) {
    while (drag.my < wantY && bf.softDrop()) { drag.my++; drag.moved = true }
  }
  if (Math.abs(dx) > 8 || Math.abs(dy) > 8) drag.moved = true
}

function onBoardUp(e) {
  if (!drag) return
  const d = drag
  drag = null
  if (!bf || phase.value !== 'running') return
  const dx = e.clientX - d.x
  const dy = e.clientY - d.y
  const dt = Math.max(1, performance.now() - d.t)
  // Der Tipp, der das Level startet, dreht noch nicht.
  if (!d.moved && dt < 300) { if (!d.starting) bf.rotate(1); return }
  if (dy > 50 && dy / dt > 0.8 && Math.abs(dx) < dy) {
    bf.hardDrop()
    handleEvents()
  }
}

function onKeyDown(e) {
  if (!playOpen.value) return
  const map = {
    ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowDown: 'down', s: 'down',
    ArrowUp: 'rotate', x: 'rotate', w: 'rotate', z: 'rotateCcw', y: 'rotateCcw',
    ' ': 'drop', c: 'hold', Shift: 'hold'
  }
  if (e.key === 'p' || e.key === 'Escape') {
    e.preventDefault()
    togglePause()
    return
  }
  const action = map[e.key]
  if (!action) return
  e.preventDefault()
  // Browser-Tastenwiederholung übernimmt bei links/rechts das Auto-Repeat.
  if (e.repeat && action !== 'left' && action !== 'right') return
  if ((action === 'left' || action === 'right') && e.repeat) {
    if (canAct()) bf.move(action === 'left' ? -1 : 1)
    return
  }
  press(action)
  if (action === 'left' || action === 'right') repeat[action] = null
}

function onKeyUp(e) {
  if (e.key === 'ArrowDown' || e.key === 's') softHeld = false
}

function togglePause() {
  if (phase.value === 'running') pause()
  else if (phase.value === 'paused') resumeGame()
}

function pause() {
  if (phase.value !== 'running') return
  phase.value = 'paused'
  softHeld = false
  repeat.left = repeat.right = null
}

function resumeGame() {
  if (phase.value !== 'paused') return
  lastTs = 0
  phase.value = 'running'
}

function onVisibility() {
  if (document.visibilityState !== 'visible') pause()
}

function requestQuit() {
  if (phase.value === 'won' || phase.value === 'lost') { closePlay(); return }
  if (phase.value === 'running') pause()
  quitConfirm.value = true
}

function cancelQuit() {
  quitConfirm.value = false
}

// ── Abschluss ─────────────────────────────────────────────────────────────
async function finishLevel() {
  if (!bf) return
  const stars = bf.stars
  saving.value = true
  saveError.value = ''
  try {
    const data = await game.completeBlockFallLevel(playLevel.value, stars)
    rewardData.value = {
      runStars: stars,
      coins: Number(data?.coins_added || 0),
      tickets: Number(data?.tickets_added || 0),
      firstClear: !!data?.first_clear
    }
  } catch (e) {
    saveError.value = e?.message || tx('saveFailed')
    appToast.err(saveError.value)
  } finally {
    saving.value = false
  }
}

function nextLevel() {
  const next = playLevel.value + 1
  closePlay()
  if (next <= MAX_LEVEL && next <= highest.value + 1) startLevel(next)
}

function retryLevel() {
  const level = playLevel.value
  closePlay()
  startLevel(level)
}

function dismissTutorial() {
  showTutorial.value = false
  try { localStorage.setItem(TUT_KEY, '1') } catch {}
}

function onResize() {
  if (playOpen.value) sizeBoard()
}

useReturnRefresh(() => Promise.all([loadProgress(), game.loadEventSchedule()]))

onMounted(async () => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('resize', onResize)
  document.addEventListener('visibilitychange', onVisibility)
  clockTimer = setInterval(() => {
    if (document.visibilityState !== 'visible') return
    now.value = Date.now()
  }, 1000)
  game.loadEventSchedule?.().catch(() => {})
  let seen = false
  try { seen = localStorage.getItem(TUT_KEY) === '1' } catch { seen = false }
  if (!seen) showTutorial.value = true
  await loadProgress()
  if (!error.value) scrollToCurrent()
})

onUnmounted(() => {
  closePlay()
  clearInterval(clockTimer)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('resize', onResize)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <div class="bf-view">
    <header class="bf-header">
      <Button class="btn small btn-ghost" @click="router.push('/')">
        <i class="pi pi-arrow-left"></i><span>{{ tx('back') }}</span>
      </Button>
      <div class="bf-title-block">
        <h1 class="bf-title">{{ tx('title') }}</h1>
        <p class="bf-sub">{{ tx('sub') }}</p>
      </div>
      <Button class="btn small btn-ghost help-btn" @click="showTutorial = true">
        <i class="pi pi-question-circle"></i>
      </Button>
    </header>

    <div v-if="loading" class="card bf-state">
      <i class="pi pi-spin pi-spinner"></i><span>{{ tx('loading') }}</span>
    </div>
    <div v-else-if="error" class="card bf-state error-state">
      <span>{{ error }}</span>
      <Button class="btn small" @click="loadProgress">{{ tx('retry') }}</Button>
    </div>

    <template v-else>
      <section class="bf-stats">
        <div class="bf-stat">
          <strong>{{ highest }} / {{ MAX_LEVEL }}</strong><span>{{ tx('best') }}</span>
        </div>
        <div class="bf-stat">
          <strong>⭐ {{ totalStars }} / {{ MAX_LEVEL * 3 }}</strong><span>{{ tx('stars') }}</span>
        </div>
      </section>

      <div v-if="eventActive && eventCountdown" class="bf-countdown">
        ⏳ {{ tx('endsIn', { time: eventCountdown }) }}
      </div>

      <section v-if="!eventActive" class="card event-over">
        <span class="eo-icon">⏰</span>
        <div class="eo-body">
          <div class="eo-title">{{ tx('eventEnded') }}</div>
          <div class="eo-sub">{{ tx('eventEndedSub') }}</div>
        </div>
      </section>

      <section
        v-for="ch in chapters"
        :key="ch.id"
        class="bf-chapter card"
        :class="['ch-' + ch.id, { 'ch-locked': ch.locked }]"
      >
        <div class="ch-head">
          <span class="ch-icon">{{ ch.icon }}</span>
          <div class="ch-names">
            <div class="ch-label">{{ tx('chapter', { n: ch.index + 1 }) }}</div>
            <div class="ch-name">{{ ch.name }}</div>
          </div>
          <div class="ch-starcount">⭐ {{ ch.stars }} / {{ LEVELS_PER_CHAPTER * 3 }}</div>
        </div>

        <div class="bf-path" :style="{ height: PATH_H + 'px' }">
          <svg class="bf-path-svg" :viewBox="`0 0 100 ${PATH_H}`" preserveAspectRatio="none" aria-hidden="true">
            <path :d="ch.fullPath" class="path-base" />
            <path v-if="ch.donePath" :d="ch.donePath" class="path-done" />
          </svg>
          <button
            v-for="node in ch.nodes"
            :key="node.level"
            type="button"
            class="bf-node"
            :class="'st-' + node.status"
            :style="{ left: node.x + '%', top: node.y + 'px' }"
            :aria-label="tx('level') + ' ' + node.level"
            @click="openSheet(node)"
          >
            <span v-if="node.status === 'current'" class="node-avatar">{{ auth.profile?.avatar_emoji || '🐾' }}</span>
            <span class="node-num">{{ node.status === 'locked' ? '🔒' : node.level }}</span>
            <span v-if="node.tickets" class="node-ticket">🎟️</span>
            <span class="node-stars">
              <span v-for="s in 3" :key="s" :class="{ on: s <= node.stars }">★</span>
            </span>
          </button>
        </div>
      </section>
    </template>

    <Teleport to="body">
      <div v-if="sheet" class="bf-sheet-backdrop" @click.self="sheetLevel = 0">
        <div class="bf-sheet card">
          <div class="sh-head">
            <span class="sh-icon">{{ sheet.chapterIcon }}</span>
            <h3>{{ tx('level') }} {{ sheet.level }}</h3>
            <span class="sh-stars">
              <span v-for="s in 3" :key="s" :class="{ on: s <= sheet.stars }">★</span>
            </span>
          </div>
          <div class="sh-grid">
            <div class="sh-cell"><span>{{ tx('goal') }}</span><strong>{{ tx('goalLines', { n: sheet.goalLines }) }}</strong></div>
            <div class="sh-cell"><span>{{ tx('speed') }}</span><strong>{{ tx('speedVal', { n: sheet.speed }) }}</strong></div>
            <div class="sh-cell"><span>{{ tx('garbage') }}</span><strong>{{ sheet.garbageRows || tx('none') }}</strong></div>
          </div>
          <div class="sh-block">
            <div class="sh-label">{{ tx('starRules') }}</div>
            <div class="sh-star-row"><span class="st">★</span> {{ tx('star1') }}</div>
            <div class="sh-star-row"><span class="st">★★</span> {{ tx('starN', { n: formatCoins(sheet.star2) }) }}</div>
            <div class="sh-star-row"><span class="st">★★★</span> {{ tx('starN', { n: formatCoins(sheet.star3) }) }}</div>
          </div>
          <div class="sh-block">
            <div class="sh-label">{{ tx('reward') }}</div>
            <div class="sh-reward">
              🪙 {{ formatCoins(sheet.reward.coins) }}<template v-if="sheet.reward.tickets"> · 🎟️ {{ sheet.reward.tickets }}</template>
            </div>
            <div class="sh-note">{{ tx('perfectBonus') }} · {{ tx('replayReward', { n: formatCoins(sheet.replayCoins) }) }}</div>
          </div>
          <Button
            v-if="sheet.status !== 'locked'"
            class="btn full"
            :disabled="!eventActive"
            @click="startLevel(sheet.level)"
          >
            {{ sheet.status === 'cleared' ? '↻ ' + tx('replay') : '▶ ' + tx('play') }}
          </Button>
          <div v-else class="sh-locked">🔒 {{ tx('locked') }}</div>
          <Button class="btn full secondary" @click="sheetLevel = 0">{{ tx('close') }}</Button>
        </div>
      </div>

      <div v-if="playOpen" class="bf-overlay">
        <div class="bf-hud">
          <Button class="btn small btn-ghost hud-btn" :aria-label="tx('quitYes')" @click="requestQuit">
            <i class="pi pi-times"></i>
          </Button>
          <div class="hud-center">
            <div class="hud-row">
              <span class="hud-level">{{ tx('level') }} {{ playLevel }}</span>
              <span class="hud-stars">
                <span v-for="s in 3" :key="s" :class="{ on: s <= hudStars }">★</span>
              </span>
            </div>
            <div class="hud-progress"><span :style="{ width: Math.min(100, hudLines / Math.max(1, hudGoal) * 100) + '%' }"></span></div>
            <div class="hud-row small">
              <span>{{ tx('lines') }} {{ hudLines }} / {{ hudGoal }}</span>
              <span>{{ tx('score') }} {{ formatCoins(hudScore) }}</span>
            </div>
          </div>
          <Button
            class="btn small btn-ghost hud-btn"
            :aria-label="tx('paused')"
            :disabled="phase !== 'running' && phase !== 'paused'"
            @click="togglePause"
          >
            <i class="pi" :class="phase === 'paused' ? 'pi-play' : 'pi-pause'"></i>
          </Button>
        </div>

        <div class="bf-main">
          <div
            ref="boardWrapRef"
            class="bf-board-wrap"
            @pointerdown="onBoardDown"
            @pointermove="onBoardMove"
            @pointerup="onBoardUp"
            @pointercancel="drag = null"
          >
            <canvas ref="canvasRef" class="bf-canvas"></canvas>
            <div class="bf-popups">
              <div v-for="p in popups" :key="p.id" class="bf-popup">
                <div class="pp-text">{{ p.text }}</div>
                <div class="pp-points">+{{ p.points }}</div>
                <div v-if="p.sub" class="pp-sub">{{ p.sub }}</div>
              </div>
            </div>
            <div v-if="phase === 'ready'" class="bf-start">
              <div class="bs-go">👆 {{ tx('tapToStart') }}</div>
              <div class="bs-hint">{{ tx('startHint') }}</div>
            </div>
          </div>

          <aside class="bf-side">
            <button type="button" class="side-box hold-box" :class="{ used: holdUsed }" @pointerdown.prevent="press('hold')">
              <span class="side-label">{{ tx('hold') }}</span>
              <span class="mini">
                <span
                  v-for="c in miniCells(holdType)"
                  :key="c.key"
                  class="mini-cell"
                  :style="{ left: c.left, top: c.top, background: c.color, boxShadow: `inset 0 -3px 0 ${c.shade}` }"
                ></span>
              </span>
            </button>
            <div class="side-box">
              <span class="side-label">{{ tx('next') }}</span>
              <span v-for="(type, i) in nextTypes" :key="i + type" class="mini" :class="{ first: i === 0 }">
                <span
                  v-for="c in miniCells(type)"
                  :key="c.key"
                  class="mini-cell"
                  :style="{ left: c.left, top: c.top, background: c.color, boxShadow: `inset 0 -3px 0 ${c.shade}` }"
                ></span>
              </span>
            </div>
            <div class="side-goal">
              <div>★★ {{ formatCoins(hudStar2) }}</div>
              <div>★★★ {{ formatCoins(hudStar3) }}</div>
            </div>
          </aside>
        </div>

        <div class="bf-controls">
          <div class="ctrl-group">
            <button
              v-for="a in ['left', 'down', 'right']"
              :key="a"
              type="button"
              class="ctrl"
              :aria-label="a"
              @pointerdown.prevent="press(a)"
              @pointerup="release(a)"
              @pointerleave="release(a)"
              @pointercancel="release(a)"
              @contextmenu.prevent
            >{{ a === 'left' ? '◀' : a === 'right' ? '▶' : '▼' }}</button>
          </div>
          <div class="ctrl-group">
            <button type="button" class="ctrl rot" aria-label="rotate" @pointerdown.prevent="press('rotate')" @contextmenu.prevent>⟳</button>
            <button type="button" class="ctrl drop" aria-label="drop" @pointerdown.prevent="press('drop')" @contextmenu.prevent>⤓</button>
          </div>
        </div>

        <div v-if="phase === 'paused' && !quitConfirm" class="bf-panel-wrap">
          <div class="bf-panel card">
            <div class="pf-emoji">⏸️</div>
            <h3>{{ tx('paused') }}</h3>
            <Button class="btn full" @click="resumeGame">▶ {{ tx('resume') }}</Button>
            <Button class="btn full secondary" @click="requestQuit">{{ tx('quitYes') }}</Button>
          </div>
        </div>

        <div v-if="phase === 'won'" class="bf-panel-wrap">
          <div class="bf-panel card">
            <template v-if="saving">
              <div class="pf-emoji"><i class="pi pi-spin pi-spinner"></i></div>
              <h3>{{ tx('saving') }}</h3>
            </template>
            <template v-else-if="rewardData">
              <div class="pf-emoji">🏁</div>
              <h3>{{ tx('winTitle') }}</h3>
              <div class="pf-stars">
                <span v-for="s in 3" :key="s" :class="{ on: s <= rewardData.runStars }">★</span>
              </div>
              <div class="pf-badge" :class="{ replay: !rewardData.firstClear }">
                {{ rewardData.firstClear ? tx('firstClear') : tx('replayBadge') }}
              </div>
              <div v-if="rewardData.firstClear && rewardData.runStars === 3" class="pf-perfect">{{ tx('perfect') }}</div>
              <div class="pf-items">
                <div class="pf-item">🪙 +{{ formatCoins(rewardData.coins) }}</div>
                <div v-if="rewardData.tickets > 0" class="pf-item tickets">🎟️ +{{ rewardData.tickets }}</div>
              </div>
              <Button v-if="playLevel < MAX_LEVEL && playLevel <= highest" class="btn full" @click="nextLevel">
                {{ tx('nextLevel') }}
              </Button>
              <Button class="btn full secondary" @click="closePlay">{{ tx('toMap') }}</Button>
            </template>
            <template v-else>
              <div class="pf-emoji">⚠️</div>
              <h3>{{ tx('saveFailed') }}</h3>
              <p class="pf-sub">{{ saveError }}</p>
              <Button class="btn full" @click="finishLevel">{{ tx('retry') }}</Button>
              <Button class="btn full secondary" @click="closePlay">{{ tx('toMap') }}</Button>
            </template>
          </div>
        </div>

        <div v-if="phase === 'lost'" class="bf-panel-wrap">
          <div class="bf-panel card">
            <div class="pf-emoji">🧱</div>
            <h3>{{ tx('lostTitle') }}</h3>
            <p class="pf-sub">{{ tx('lostSub', { lines: hudLines, goal: hudGoal }) }}</p>
            <Button class="btn full" @click="retryLevel">↻ {{ tx('tryAgain') }}</Button>
            <Button class="btn full secondary" @click="closePlay">{{ tx('toMap') }}</Button>
          </div>
        </div>

        <div v-if="quitConfirm" class="bf-panel-wrap">
          <div class="bf-panel card">
            <div class="pf-emoji">🏳️</div>
            <h3>{{ tx('quitTitle') }}</h3>
            <p class="pf-sub">{{ tx('quitSub') }}</p>
            <Button class="btn full" @click="cancelQuit">{{ tx('quitNo') }}</Button>
            <Button class="btn full secondary" @click="quitConfirm = false; closePlay()">{{ tx('quitYes') }}</Button>
          </div>
        </div>
      </div>

      <div v-if="showTutorial" class="tut-backdrop" @click.self="dismissTutorial">
        <div class="tut-dialog card">
          <h3 class="tut-title">{{ tx('tutTitle') }}</h3>
          <div class="tut-demo" aria-hidden="true">
            <span class="tut-block b1"></span><span class="tut-block b2"></span><span class="tut-block b3"></span><span class="tut-block b4"></span>
          </div>
          <ol class="tut-steps">
            <li>{{ tx('tut1') }}</li>
            <li>{{ tx('tut2') }}</li>
            <li>{{ tx('tut3') }}</li>
            <li>{{ tx('tut4') }}</li>
            <li>{{ tx('tut5') }}</li>
          </ol>
          <Button class="btn tut-got" @click="dismissTutorial">{{ tx('tutGot') }}</Button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.bf-view { display: flex; flex-direction: column; gap: 12px; padding-bottom: 18px; }
.bf-header { display: flex; align-items: center; gap: 10px; }
.btn-ghost { background: var(--card-2); color: var(--muted);
  display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; }
.bf-title-block { flex: 1; min-width: 0; }
.bf-title { margin: 0; font-size: 22px; font-weight: 900; color: var(--heading); }
.bf-sub { margin: 2px 0 0; color: var(--muted); font-size: 13px; }
.help-btn { flex-shrink: 0; }
.bf-state { display: flex; align-items: center; justify-content: center; gap: 10px;
  min-height: 140px; color: var(--muted); font-weight: 800; }
.error-state { flex-direction: column; color: var(--danger); }

.bf-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.bf-stat { background: var(--card); border: 2px solid var(--border); border-radius: 14px;
  padding: 12px 10px; text-align: center; box-shadow: var(--shadow-card); }
.bf-stat strong { display: block; color: var(--accent-deep); font-weight: 900; font-size: 17px; }
.bf-stat span { display: block; color: var(--muted); font-size: 11px; font-weight: 700;
  margin-top: 4px; text-transform: uppercase; letter-spacing: 0.03em; }
.bf-countdown { align-self: center; border-radius: 999px; padding: 5px 14px;
  background: var(--card); border: 2px solid var(--border); font-size: 12px; font-weight: 800;
  color: var(--purple-deep, var(--purple)); font-variant-numeric: tabular-nums; }

.event-over { display: flex; align-items: center; gap: 12px;
  border-color: rgba(239, 71, 111, 0.45); margin: 0; }
.eo-icon { font-size: 26px; flex-shrink: 0; }
.eo-body { min-width: 0; }
.eo-title { font-weight: 900; color: var(--danger); }
.eo-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }

/* ── Pfad ─────────────────────────────────────────────────────────── */
.bf-chapter { margin: 0; padding: 12px 12px 6px; overflow: hidden; }
.ch-meadow { background: linear-gradient(180deg, #f3fbe9, var(--card) 40%); }
.ch-desert { background: linear-gradient(180deg, #fff1d6, var(--card) 40%); }
.ch-ice { background: linear-gradient(180deg, #e7f5ff, var(--card) 40%); }
.ch-volcano { background: linear-gradient(180deg, #ffe9df, var(--card) 40%); }
.ch-stars { background: linear-gradient(180deg, #ede6ff, var(--card) 40%); }
.ch-locked .ch-head { opacity: 0.6; }
.ch-head { display: flex; align-items: center; gap: 10px; }
.ch-icon { font-size: 30px; filter: drop-shadow(0 3px 6px rgba(110, 80, 20, 0.25)); }
.ch-names { flex: 1; min-width: 0; }
.ch-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
.ch-name { font-size: 17px; font-weight: 900; color: var(--heading); }
.ch-starcount { font-size: 12px; font-weight: 900; color: var(--accent-deep); white-space: nowrap; }

.bf-path { position: relative; }
.bf-path-svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.path-base { fill: none; stroke: rgba(140, 105, 35, 0.22); stroke-width: 10;
  stroke-linecap: round; stroke-dasharray: 2 16; vector-effect: non-scaling-stroke; }
.path-done { fill: none; stroke: var(--accent); stroke-width: 8; stroke-linecap: round;
  vector-effect: non-scaling-stroke; opacity: 0.85; }

.bf-node { position: absolute; transform: translate(-50%, -50%);
  width: 62px; height: 62px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  border: 3px solid #fff; cursor: pointer; font: inherit; padding: 0;
  background: linear-gradient(180deg, #fbcf4a, #f0a312);
  box-shadow: 0 5px 0 #cf8a08, 0 10px 20px rgba(110, 80, 20, 0.25);
  transition: transform 0.1s ease; }
.bf-node:active { transform: translate(-50%, -46%); box-shadow: 0 2px 0 #cf8a08; }
.bf-node.st-cleared { background: linear-gradient(180deg, #6fd99a, #2ec272); box-shadow: 0 5px 0 #1f9656, 0 10px 20px rgba(46, 194, 114, 0.25); }
.bf-node.st-locked { background: linear-gradient(180deg, #e9e0cc, #d6c9ab); box-shadow: 0 5px 0 #b8a984; cursor: pointer; }
.bf-node.st-current { animation: nodePulse 1.8s ease-in-out infinite; }
@keyframes nodePulse {
  0%, 100% { box-shadow: 0 5px 0 #cf8a08, 0 0 0 0 rgba(244, 169, 18, 0.55); }
  50% { box-shadow: 0 5px 0 #cf8a08, 0 0 0 12px rgba(244, 169, 18, 0); } }
.node-num { font-size: 22px; font-weight: 900; color: #fff; text-shadow: 0 2px 0 rgba(0, 0, 0, 0.18); }
.st-locked .node-num { font-size: 20px; }
.node-avatar { position: absolute; top: -34px; left: 50%; transform: translateX(-50%);
  font-size: 26px; animation: avatarHop 1.2s ease-in-out infinite; pointer-events: none; }
@keyframes avatarHop { 0%, 100% { translate: 0 0; } 50% { translate: 0 -6px; } }
.node-ticket { position: absolute; top: -6px; right: -8px; font-size: 16px;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.2)); }
.node-stars { position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 1px; font-size: 13px; color: #ddd0b0; white-space: nowrap;
  text-shadow: 0 1px 0 #fff; }
.node-stars .on { color: var(--accent); }
.st-locked .node-stars { display: none; }

/* ── Level-Karte ──────────────────────────────────────────────────── */
.bf-sheet-backdrop { position: fixed; inset: 0; z-index: 1200; background: rgba(60, 40, 10, 0.45);
  display: flex; align-items: flex-end; justify-content: center; padding: 16px;
  padding-bottom: calc(16px + var(--safe-bot)); backdrop-filter: blur(4px); }
.bf-sheet { width: min(420px, 100%); margin: 0; display: flex; flex-direction: column; gap: 10px;
  animation: sheetIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes sheetIn { from { transform: translateY(30px); opacity: 0; } to { transform: none; opacity: 1; } }
.sh-head { display: flex; align-items: center; gap: 10px; }
.sh-head h3 { flex: 1; margin: 0; font-size: 20px; font-weight: 900; color: var(--heading); }
.sh-icon { font-size: 26px; }
.sh-stars { font-size: 18px; color: #ddd0b0; letter-spacing: 1px; }
.sh-stars .on { color: var(--accent); }
.sh-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.sh-cell { background: var(--card-2); border: 2px solid var(--border); border-radius: 12px;
  padding: 8px 6px; text-align: center; display: flex; flex-direction: column; gap: 2px; }
.sh-cell span { font-size: 10px; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
.sh-cell strong { font-size: 14px; font-weight: 900; color: var(--heading); }
.sh-block { background: var(--card-2); border: 2px solid var(--border); border-radius: 14px; padding: 8px 12px; }
.sh-label { font-size: 11px; font-weight: 800; color: var(--muted); text-transform: uppercase;
  letter-spacing: 0.05em; margin-bottom: 4px; }
.sh-star-row { font-size: 13px; font-weight: 700; color: var(--text); }
.sh-star-row .st { display: inline-block; min-width: 44px; color: var(--accent); font-weight: 900; }
.sh-reward { font-size: 17px; font-weight: 900; color: var(--accent-deep); }
.sh-note { font-size: 11px; font-weight: 700; color: var(--muted); margin-top: 2px; }
.sh-locked { text-align: center; font-weight: 800; color: var(--muted); padding: 8px 0; }

/* ── Spiel-Overlay ────────────────────────────────────────────────── */
.bf-overlay { position: fixed; inset: 0; z-index: 1100; display: flex; flex-direction: column;
  background: var(--bg); touch-action: none; overscroll-behavior: none;
  user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.bf-hud { display: flex; align-items: center; gap: 10px;
  padding: calc(8px + var(--safe-top)) 12px 8px; background: rgba(255, 255, 255, 0.92);
  border-bottom: 2px solid var(--border); }
.hud-btn { flex-shrink: 0; width: 40px; justify-content: center; }
.hud-center { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.hud-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.hud-row.small { font-size: 11px; font-weight: 800; color: var(--muted); font-variant-numeric: tabular-nums; }
.hud-level { font-weight: 900; font-size: 14px; color: var(--heading); }
.hud-stars { font-size: 15px; color: #ddd0b0; letter-spacing: 1px; }
.hud-stars .on { color: var(--accent); }
.hud-progress { width: 100%; height: 8px; border-radius: 999px; background: rgba(0, 0, 0, 0.1); overflow: hidden; }
.hud-progress span { display: block; height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, var(--accent-2), var(--accent)); transition: width 0.2s ease; }

.bf-main { flex: 1; min-height: 0; display: flex; gap: 8px; padding: 10px 10px 6px;
  max-width: 560px; width: 100%; margin: 0 auto; box-sizing: border-box; }
.bf-board-wrap { position: relative; flex: 1; min-width: 0; min-height: 0;
  display: flex; align-items: center; justify-content: center; touch-action: none; cursor: pointer; }
.bf-canvas { display: block; border-radius: 14px; border: 3px solid #fff;
  box-shadow: 0 4px 0 var(--border), 0 14px 30px rgba(110, 80, 20, 0.18); }
.bf-popups { position: absolute; left: 0; right: 0; top: 30%; display: flex; flex-direction: column;
  align-items: center; pointer-events: none; }
.bf-popup { text-align: center; animation: popUp 1s ease-out forwards; }
.pp-text { font-size: 24px; font-weight: 900; color: #fff;
  text-shadow: 0 3px 0 var(--accent-deep, #c47f00), 0 6px 14px rgba(0, 0, 0, 0.25); }
.pp-points { font-size: 15px; font-weight: 900; color: var(--accent-deep); text-shadow: 0 1px 0 #fff; }
.pp-sub { font-size: 13px; font-weight: 900; color: var(--purple-deep, var(--purple)); text-shadow: 0 1px 0 #fff; }
@keyframes popUp {
  0% { transform: scale(0.6); opacity: 0; }
  15% { transform: scale(1.1); opacity: 1; }
  30% { transform: scale(1); }
  100% { transform: translateY(-40px); opacity: 0; } }
.bf-start { position: absolute; left: 0; right: 0; top: 22%; display: flex; flex-direction: column;
  align-items: center; gap: 8px; pointer-events: none; padding: 0 12px; text-align: center; }
.bs-go { background: rgba(255, 255, 255, 0.95); border-radius: 999px; padding: 10px 20px;
  font-weight: 900; font-size: 17px; color: var(--heading); box-shadow: 0 8px 22px rgba(0, 0, 0, 0.18);
  animation: bsBounce 1.4s ease-in-out infinite; }
.bs-hint { background: rgba(0, 0, 0, 0.5); color: #fff; border-radius: 999px; padding: 6px 14px;
  font-weight: 800; font-size: 11px; }
@keyframes bsBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }

.bf-side { width: 68px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; }
.side-box { background: var(--card); border: 2px solid var(--border); border-radius: 14px;
  padding: 6px; display: flex; flex-direction: column; align-items: center; gap: 6px; font: inherit; color: inherit; }
.hold-box { cursor: pointer; }
.hold-box.used { opacity: 0.5; }
.side-label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
.mini { position: relative; width: 48px; height: 24px; display: block; }
.mini:not(.first) { transform: scale(0.8); opacity: 0.8; }
.mini-cell { position: absolute; width: 25%; height: 50%; border-radius: 3px; box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.6); }
.side-goal { font-size: 10px; font-weight: 900; color: var(--accent-deep); text-align: center;
  line-height: 1.5; font-variant-numeric: tabular-nums; }

.bf-controls { display: flex; justify-content: space-between; gap: 10px;
  padding: 6px 14px calc(14px + var(--safe-bot)); max-width: 560px; width: 100%;
  margin: 0 auto; box-sizing: border-box; }
.ctrl-group { display: flex; gap: 8px; }
.ctrl { width: 58px; height: 58px; border-radius: 18px; border: 3px solid #fff;
  font: inherit; font-size: 24px; font-weight: 900; color: var(--heading);
  background: linear-gradient(180deg, #fffaf0, #f3e6c6);
  box-shadow: 0 5px 0 var(--border), 0 10px 18px rgba(110, 80, 20, 0.15);
  cursor: pointer; touch-action: none; -webkit-tap-highlight-color: transparent; }
.ctrl:active { transform: translateY(3px); box-shadow: 0 2px 0 var(--border); }
.ctrl.rot { background: linear-gradient(180deg, #c9a8f5, #9b5de5); color: #fff; box-shadow: 0 5px 0 #7239b8, 0 10px 18px rgba(155, 93, 229, 0.3); }
.ctrl.rot:active { box-shadow: 0 2px 0 #7239b8; }
.ctrl.drop { background: linear-gradient(180deg, #fbcf4a, #f0a312); color: var(--accent-ink, #3a2600); box-shadow: 0 5px 0 #cf8a08, 0 10px 18px rgba(242, 168, 18, 0.35); }
.ctrl.drop:active { box-shadow: 0 2px 0 #cf8a08; }
@media (max-width: 360px) {
  .ctrl { width: 50px; height: 50px; font-size: 21px; }
  .ctrl-group { gap: 6px; }
}

.bf-panel-wrap { position: absolute; inset: 0; display: flex; align-items: center;
  justify-content: center; padding: 18px; background: rgba(40, 25, 5, 0.45);
  backdrop-filter: blur(4px); z-index: 5; }
.bf-panel { width: min(340px, 100%); margin: 0; display: flex; flex-direction: column; align-items: center;
  gap: 9px; padding: 24px 20px; text-align: center; animation: pfIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes pfIn { from { transform: translateY(18px) scale(0.92); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; } }
.pf-emoji { font-size: 52px; line-height: 1; }
.bf-panel h3 { margin: 0; font-size: 20px; font-weight: 900; color: var(--heading); }
.pf-sub { margin: 0; color: var(--muted); font-size: 13px; font-weight: 700; }
.pf-stars { font-size: 30px; color: #ddd0b0; letter-spacing: 3px; }
.pf-stars .on { color: var(--accent); text-shadow: 0 2px 0 rgba(160, 110, 0, 0.35); }
.pf-badge { border-radius: 999px; padding: 5px 14px; font-size: 12px; font-weight: 900;
  background: color-mix(in srgb, var(--accent-2) 18%, #fff); color: #157a4c;
  border: 2px solid color-mix(in srgb, var(--accent-2) 55%, #fff); }
.pf-badge.replay { background: var(--card-2); color: var(--muted); border-color: var(--border); }
.pf-perfect { font-size: 12px; font-weight: 900; color: var(--accent-deep); }
.pf-items { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin: 4px 0 6px; }
.pf-item { border-radius: 14px; padding: 10px 16px; font-size: 17px; font-weight: 900;
  color: var(--accent-deep); background: linear-gradient(180deg, #fffaf0, #fff1d0);
  border: 2px solid var(--accent-soft); }
.pf-item.tickets { color: var(--purple-deep); border-color: var(--purple);
  background: linear-gradient(180deg, #f7f2ff, #ece1ff); }

.tut-backdrop { position: fixed; inset: 0; background: rgba(60, 40, 10, 0.5); display: flex;
  align-items: center; justify-content: center; z-index: 1400; padding: 16px; backdrop-filter: blur(5px); }
.tut-dialog { max-width: 380px; width: 100%; padding: 22px; text-align: center; margin: 0;
  display: flex; flex-direction: column; gap: 14px; max-height: calc(100vh - 32px); overflow-y: auto; }
.tut-title { margin: 0; font-size: 20px; font-weight: 900; color: var(--heading); }
.tut-demo { display: grid; grid-template-columns: repeat(3, 22px); grid-template-rows: repeat(2, 22px);
  gap: 3px; justify-content: center; animation: tutFall 1.8s ease-in infinite; }
.tut-block { border-radius: 6px; background: #9b5de5; box-shadow: inset 0 -4px 0 #7239b8; }
.tut-block.b1 { grid-column: 2; grid-row: 1; }
.tut-block.b2 { grid-column: 1; grid-row: 2; }
.tut-block.b3 { grid-column: 2; grid-row: 2; }
.tut-block.b4 { grid-column: 3; grid-row: 2; }
@keyframes tutFall { 0% { transform: translateY(-14px); opacity: 0; } 25% { opacity: 1; }
  70%, 100% { transform: translateY(0); } }
.tut-steps { text-align: left; margin: 0; padding-left: 20px; display: flex;
  flex-direction: column; gap: 8px; color: var(--text); font-size: 13px; font-weight: 600; }
.tut-steps li { line-height: 1.4; }
.tut-got { width: 100%; font-weight: 900; }
</style>
