<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { locale } from '../i18n'
import { formatCoins, speciesInfo, tierInfo } from '../animals'
import { useGameStore } from '../stores/game'
import { useAuthStore } from '../stores/auth'
import { useAppToast } from '../composables/useAppToast'
import { useReturnRefresh } from '../composables/useReturnRefresh'
import {
  PuzzleGame, MAX_LEVEL, LEVELS_PER_CHAPTER, CHAPTERS, PIECE_PAD, REWARD_PETS,
  levelConfig, starsForTime, puzzleReward, replayCoins
} from '../halloweenPuzzle'
import { renderScene, renderPiece, renderBoard } from '../halloweenScene'

const router = useRouter()
const game = useGameStore()
const auth = useAuthStore()
const appToast = useAppToast()

const TUT_KEY = 'halloween_puzzle_tutorial_v1'

const I18N = {
  de: {
    title: '🎃 Kürbis-Puzzle', sub: '24 Halloween-Bilder zum Zusammenpuzzeln',
    back: 'Zurück', level: 'Level', best: 'Bestes Level', stars: 'Sterne',
    loading: 'Lade Fortschritt...', retry: 'Erneut versuchen',
    eventEnded: 'Ereignis beendet', eventEndedSub: 'Das Halloween-Ereignis ist vorbei. Es können keine Puzzles mehr gestartet werden.',
    endsIn: 'Endet in {time}',
    batTitle: 'Fledermaus zu gewinnen!', batSub: 'Level 12 schenkt dir eine Fledermaus, Level 24 eine goldene. Gibt es nur an Halloween.',
    chapter: 'Kapitel {n}', ch_patch: 'Kürbisfeld', ch_castle: 'Spukschloss', ch_woods: 'Hexenwald', ch_treats: 'Süßes oder Saures',
    pieces: 'Teile', grid: 'Raster', bestShort: 'Bestzeit', gridVal: '{cols} × {rows}', helps: 'Hilfen',
    helpGhost: '👻 Geisterbild', helpOutlines: '✏️ Umrisse', helpRotate: '🔄 Teile gedreht', helpNone: 'Keine — nur du und das Bild',
    starRules: 'Sterne nach Zeit', star1: 'Puzzle fertig', starTime: 'bis {time}',
    bestTime: 'Bestzeit {time}',
    reward: 'Belohnung (Erstabschluss)', perfectBonus: '⭐⭐⭐ = +50 % Coins', replayReward: 'Wiederholung: 🪙 {n}',
    play: 'Puzzeln', replay: 'Nochmal', locked: 'Gesperrt', close: 'Schließen',
    placed: 'gelegt', left: '{n} übrig', edgesOnly: 'Nur Rand', preview: 'Vorschau',
    memorize: 'Merk dir das Bild!', tapToStart: 'Tippen zum Start',
    preparing: 'Puzzle wird geschnitten…',
    dragHint: 'Zieh die Teile aufs Brett', rotateHint: 'Tippen = drehen, ziehen = legen',
    rotateFirst: 'Richtiger Platz — aber erst drehen! Tipp das Teil an.',
    notHere: 'Passt hier nicht',
    trayEmptyEdges: 'Alle Randteile liegen!',
    paused: 'Pause', resume: 'Weiter',
    winTitle: 'Puzzle komplett!', time: 'Zeit', firstClear: 'Level freigeschaltet!', replayBadge: 'Wiederholungs-Bonus',
    perfect: '⭐ Perfekt! +50 % Coins', newPet: 'Neues Tier!', nextLevel: 'Nächstes Puzzle ▶', toMap: 'Zum Pfad', saving: 'Speichere...',
    saveFailed: 'Speichern fehlgeschlagen',
    quitTitle: 'Puzzle abbrechen?', quitSub: 'Die gelegten Teile gehen verloren.', quitNo: 'Weiterpuzzeln', quitYes: 'Abbrechen',
    tutTitle: 'So funktioniert das Kürbis-Puzzle',
    tut1: 'Vor dem Start siehst du das ganze Bild — merk es dir gut.',
    tut2: 'Zieh die Teile aus der Ablage unten an ihren Platz. Passt ein Teil, rastet es ein.',
    tut3: '„Nur Rand" zeigt nur Randteile, 👁 Vorschau (gedrückt halten) blendet das Bild ein.',
    tut4: 'Je schneller du fertig bist, desto mehr Sterne. Ab Kapitel 4 liegen die Teile verdreht: antippen dreht sie.',
    tut5: 'Level 12 und 24 belohnen dich mit einer Fledermaus 🦇 — nur in diesem Halloween-Event!',
    tutGot: 'Los geht\'s! 🎃'
  },
  en: {
    title: '🎃 Pumpkin Puzzle', sub: '24 Halloween pictures to piece together',
    back: 'Back', level: 'Level', best: 'Best level', stars: 'Stars',
    loading: 'Loading progress...', retry: 'Try again',
    eventEnded: 'Event ended', eventEndedSub: 'The Halloween event is over. No more puzzles can be started.',
    endsIn: 'Ends in {time}',
    batTitle: 'Win a bat!', batSub: 'Level 12 gives you a bat, level 24 a golden one. Only available at Halloween.',
    chapter: 'Chapter {n}', ch_patch: 'Pumpkin Patch', ch_castle: 'Haunted Castle', ch_woods: 'Witch Woods', ch_treats: 'Trick or Treat',
    pieces: 'Pieces', grid: 'Grid', bestShort: 'Best time', gridVal: '{cols} × {rows}', helps: 'Helps',
    helpGhost: '👻 Ghost image', helpOutlines: '✏️ Outlines', helpRotate: '🔄 Rotated pieces', helpNone: 'None — just you and the picture',
    starRules: 'Stars by time', star1: 'Puzzle done', starTime: 'within {time}',
    bestTime: 'Best time {time}',
    reward: 'Reward (first clear)', perfectBonus: '⭐⭐⭐ = +50% coins', replayReward: 'Replay: 🪙 {n}',
    play: 'Puzzle', replay: 'Replay', locked: 'Locked', close: 'Close',
    placed: 'placed', left: '{n} left', edgesOnly: 'Edges only', preview: 'Preview',
    memorize: 'Memorize the picture!', tapToStart: 'Tap to start',
    preparing: 'Cutting the puzzle…',
    dragHint: 'Drag the pieces onto the board', rotateHint: 'Tap = rotate, drag = place',
    rotateFirst: 'Right spot — but rotate it first! Tap the piece.',
    notHere: 'Doesn\'t fit here',
    trayEmptyEdges: 'All edge pieces placed!',
    paused: 'Paused', resume: 'Resume',
    winTitle: 'Puzzle complete!', time: 'Time', firstClear: 'Level unlocked!', replayBadge: 'Replay bonus',
    perfect: '⭐ Perfect! +50% coins', newPet: 'New animal!', nextLevel: 'Next puzzle ▶', toMap: 'Back to path', saving: 'Saving...',
    saveFailed: 'Saving failed',
    quitTitle: 'Quit the puzzle?', quitSub: 'Placed pieces will be lost.', quitNo: 'Keep puzzling', quitYes: 'Quit',
    tutTitle: 'How the Pumpkin Puzzle works',
    tut1: 'Before you start you see the whole picture — memorize it.',
    tut2: 'Drag pieces from the tray at the bottom to their spot. If a piece fits, it snaps in.',
    tut3: '"Edges only" shows just edge pieces, 👁 Preview (press and hold) shows the picture.',
    tut4: 'The faster you finish, the more stars. From chapter 4 pieces are rotated: tap them to turn.',
    tut5: 'Levels 12 and 24 reward you with a bat 🦇 — only during this Halloween event!',
    tutGot: 'Let\'s go! 🎃'
  },
  ru: {
    title: '🎃 Тыквенный пазл', sub: '24 картинки на Хэллоуин — собери их все',
    back: 'Назад', level: 'Уровень', best: 'Лучший уровень', stars: 'Звёзды',
    loading: 'Загрузка прогресса...', retry: 'Повторить',
    eventEnded: 'Событие завершено', eventEndedSub: 'Хэллоуин закончился. Новые пазлы недоступны.',
    endsIn: 'Закончится через {time}',
    batTitle: 'Выиграй летучую мышь!', batSub: 'Уровень 12 дарит летучую мышь, уровень 24 — золотую. Только на Хэллоуин.',
    chapter: 'Глава {n}', ch_patch: 'Тыквенное поле', ch_castle: 'Замок с привидениями', ch_woods: 'Ведьмин лес', ch_treats: 'Сладость или гадость',
    pieces: 'Детали', grid: 'Сетка', bestShort: 'Рекорд', gridVal: '{cols} × {rows}', helps: 'Подсказки',
    helpGhost: '👻 Призрачная картинка', helpOutlines: '✏️ Контуры', helpRotate: '🔄 Детали повёрнуты', helpNone: 'Нет — только ты и картинка',
    starRules: 'Звёзды за время', star1: 'Пазл собран', starTime: 'до {time}',
    bestTime: 'Рекорд {time}',
    reward: 'Награда (первое прохождение)', perfectBonus: '⭐⭐⭐ = +50% монет', replayReward: 'Повтор: 🪙 {n}',
    play: 'Собирать', replay: 'Снова', locked: 'Закрыто', close: 'Закрыть',
    placed: 'собрано', left: 'осталось {n}', edgesOnly: 'Только края', preview: 'Картинка',
    memorize: 'Запомни картинку!', tapToStart: 'Нажми, чтобы начать',
    preparing: 'Режем пазл…',
    dragHint: 'Перетаскивай детали на поле', rotateHint: 'Нажатие = поворот, тянуть = положить',
    rotateFirst: 'Место верное — но сначала поверни! Нажми на деталь.',
    notHere: 'Сюда не подходит',
    trayEmptyEdges: 'Все краевые детали на месте!',
    paused: 'Пауза', resume: 'Продолжить',
    winTitle: 'Пазл собран!', time: 'Время', firstClear: 'Уровень открыт!', replayBadge: 'Бонус за повтор',
    perfect: '⭐ Идеально! +50% монет', newPet: 'Новое животное!', nextLevel: 'Следующий пазл ▶', toMap: 'К пути', saving: 'Сохранение...',
    saveFailed: 'Не удалось сохранить',
    quitTitle: 'Прервать пазл?', quitSub: 'Собранные детали пропадут.', quitNo: 'Собирать дальше', quitYes: 'Прервать',
    tutTitle: 'Как играть в Тыквенный пазл',
    tut1: 'Перед стартом ты видишь всю картинку — запомни её.',
    tut2: 'Перетаскивай детали снизу на их место. Подходящая деталь защёлкнется.',
    tut3: '«Только края» показывает краевые детали, 👁 «Картинка» (удерживай) показывает картинку.',
    tut4: 'Чем быстрее, тем больше звёзд. С главы 4 детали повёрнуты: нажми, чтобы повернуть.',
    tut5: 'Уровни 12 и 24 награждают летучей мышью 🦇 — только в этом событии!',
    tutGot: 'Поехали! 🎃'
  }
}

function tx(key, vars = {}) {
  const dict = I18N[locale.value] || I18N.en
  let value = dict[key]
  if (value == null) value = I18N.en[key]
  return String(value ?? key).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

function fmtTime(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function petInfo(pet) {
  if (!pet) return null
  const info = speciesInfo(pet.species)
  return {
    emoji: info.emoji && info.emoji !== '❓' ? info.emoji : '🦇',
    name: info.name,
    badge: pet.tier && pet.tier !== 'normal' ? tierInfo(pet.tier).badge : ''
  }
}

// ── Fortschritt & Pfad ────────────────────────────────────────────────────
const loading = ref(true)
const error = ref('')
const showTutorial = ref(false)

const highest = computed(() => Number(game.halloweenPuzzleProgress?.highest_level || 0))
const starsMap = computed(() => game.halloweenPuzzleProgress?.stars || {})
const timesMap = computed(() => game.halloweenPuzzleProgress?.best_times || {})
const totalStars = computed(() => {
  let sum = 0
  for (let i = 1; i <= MAX_LEVEL; i++) sum += Number(starsMap.value[String(i)] || 0)
  return sum
})
const eventActive = computed(() => game.halloweenPuzzleActive)
const batPets = computed(() => Object.entries(REWARD_PETS).map(([level, pet]) => ({
  level: Number(level),
  ...petInfo(pet),
  done: Number(level) <= highest.value
})))

const now = ref(Date.now())
let clockTimer = 0
const eventCountdown = computed(() => {
  void now.value
  const info = game.eventFor('halloween_puzzle')
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

// Serpentine wie BlockFall: x in Prozent der Breite, eine Reihe pro Level.
const PATH_X = [24, 52, 76, 70, 44, 22]
const ROW_H = 100
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
    const reward = puzzleReward(level)
    nodes.push({
      level,
      x: PATH_X[i],
      y: ROW_H / 2 + i * ROW_H,
      status: levelStatus(level),
      stars: s,
      tickets: reward.tickets,
      pet: !!reward.pet
    })
  }
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
    await game.loadHalloweenPuzzleProgress()
  } catch (e) {
    error.value = e?.message || 'Fehler'
  } finally {
    loading.value = false
  }
}

async function scrollToCurrent() {
  await nextTick()
  document.querySelector('.hp-node.st-current')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

// ── Level-Karte ───────────────────────────────────────────────────────────
const sheetLevel = ref(0)
const thumbUrl = ref('')
const thumbCache = new Map()

function thumbFor(level) {
  if (!thumbCache.has(level)) {
    const cfg = levelConfig(level)
    const w = 300
    const h = Math.round(w * cfg.rows / cfg.cols)
    try {
      thumbCache.set(level, renderScene(level, w, h, 1).toDataURL('image/jpeg', 0.85))
    } catch {
      thumbCache.set(level, '')
    }
  }
  return thumbCache.get(level)
}

const sheet = computed(() => {
  if (!sheetLevel.value) return null
  const cfg = levelConfig(sheetLevel.value)
  const reward = puzzleReward(cfg.level)
  const best = timesMap.value[String(cfg.level)]
  return {
    ...cfg,
    status: levelStatus(cfg.level),
    stars: Number(starsMap.value[String(cfg.level)] || 0),
    bestTime: best != null ? Number(best) : null,
    reward,
    pet: petInfo(reward.pet),
    replayCoins: replayCoins(cfg.level),
    chapterIcon: CHAPTERS[cfg.chapter].icon
  }
})

function openSheet(node) {
  sheetLevel.value = node.level
  thumbUrl.value = node.status === 'locked' ? '' : thumbFor(node.level)
}

// ── Spiel ─────────────────────────────────────────────────────────────────
const playOpen = ref(false)
const playLevel = ref(1)
const phase = ref('ready') // ready | running | paused | won
const preparing = ref(false)
const quitConfirm = ref(false)
const saving = ref(false)
const rewardData = ref(null)
const saveError = ref('')
const showWinPanel = ref(false)
const winSeconds = ref(0)
const confetti = ref([])

const version = ref(0) // zählt Zustandsänderungen von `pg` (bewusst nicht reaktiv)
const cell = ref(40)
const boardBgUrl = ref('')
const fullUrl = ref('')
const pieceUrls = shallowRef([])
const edgesOnly = ref(false)
const trayPage = ref(0)
const traySlots = ref(4)
const clockMs = ref(0)
const previewOn = ref(false)
const hint = ref('')
const lastPlaced = ref(-1)
const drag = ref(null)

const stageRef = ref(null)
const boardRef = ref(null)
const trayRef = ref(null)

let pg = null
let prepSeq = 0
let hintTimer = 0
let winTimer = 0
let resizeTimer = 0
const TRAY_SLOT = 64
const TRAY_GAP = 8
const DRAG_THRESHOLD = 6

const cfgNow = computed(() => (playOpen.value ? levelConfig(playLevel.value) : null))
const boardW = computed(() => (cfgNow.value ? cell.value * cfgNow.value.cols : 0))
const boardH = computed(() => (cfgNow.value ? cell.value * cfgNow.value.rows : 0))
const pieceSize = computed(() => cell.value * (1 + PIECE_PAD * 2))

const trayItems = computed(() => {
  void version.value
  if (!pg) return []
  return pg.tray(edgesOnly.value).map((p) => ({ id: p.id, rot: p.rot }))
})
const leftCount = computed(() => {
  void version.value
  return pg ? pg.pieces.length - pg.placedCount : 0
})
const placedCount = computed(() => {
  void version.value
  return pg ? pg.placedCount : 0
})
const totalPieces = computed(() => cfgNow.value?.pieces || 0)
const placedPieces = computed(() => {
  void version.value
  if (!pg) return []
  return pg.pieces.filter((p) => p.placed).map((p) => ({ id: p.id, col: p.col, row: p.row }))
})
const pageCount = computed(() => Math.max(1, Math.ceil(trayItems.value.length / traySlots.value)))
const visibleTray = computed(() => {
  const start = trayPage.value * traySlots.value
  return trayItems.value.slice(start, start + traySlots.value)
})
const liveStars = computed(() => starsForTime(playLevel.value, Math.ceil(clockMs.value / 1000)))
const showFull = computed(() => !preparing.value && (phase.value === 'ready' || phase.value === 'won' || (previewOn.value && phase.value === 'running')))

watch(pageCount, (n) => {
  if (trayPage.value > n - 1) trayPage.value = Math.max(0, n - 1)
})

function bump() {
  version.value++
}

function showHint(text, ms = 1600) {
  hint.value = text
  clearTimeout(hintTimer)
  hintTimer = setTimeout(() => { hint.value = '' }, ms)
}

function startLevel(level) {
  if (!eventActive.value) { appToast.err(tx('eventEnded')); return }
  sheetLevel.value = 0
  playLevel.value = level
  pg = new PuzzleGame(level)
  phase.value = 'ready'
  quitConfirm.value = false
  rewardData.value = null
  saveError.value = ''
  showWinPanel.value = false
  confetti.value = []
  edgesOnly.value = false
  trayPage.value = 0
  clockMs.value = 0
  previewOn.value = false
  hint.value = ''
  lastPlaced.value = -1
  drag.value = null
  boardBgUrl.value = ''
  fullUrl.value = ''
  pieceUrls.value = []
  bump()
  playOpen.value = true
  prepareBoard()
}

// Zellgröße an den freien Platz anpassen und Bild + Teile neu zeichnen.
// Der Spielstand bleibt dabei erhalten (z. B. bei Drehung des Handys).
async function prepareBoard() {
  if (!pg) return
  const seq = ++prepSeq
  preparing.value = true
  await nextTick()
  const stage = stageRef.value
  const tray = trayRef.value
  if (!stage || !pg) return
  const cfg = pg.cfg
  const availW = Math.max(120, stage.clientWidth - 20)
  const availH = Math.max(120, stage.clientHeight - 20)
  const c = Math.max(24, Math.floor(Math.min(availW / cfg.cols, availH / cfg.rows)))
  cell.value = c
  if (tray) {
    const inner = tray.clientWidth - 2 * 40 - 16
    traySlots.value = Math.max(3, Math.floor((inner + TRAY_GAP) / (TRAY_SLOT + TRAY_GAP)))
  }
  // Einen Frame Luft lassen, damit der Lade-Kringel sichtbar ist.
  await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))
  if (seq !== prepSeq || !pg) return
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const scene = renderScene(cfg.level, c * cfg.cols, c * cfg.rows, dpr)
  fullUrl.value = scene.toDataURL('image/jpeg', 0.9)
  boardBgUrl.value = renderBoard(scene, pg.pieces, cfg, c, dpr).toDataURL('image/jpeg', 0.9)
  pieceUrls.value = pg.pieces.map((p) => renderPiece(scene, p, c, dpr).toDataURL())
  if (seq !== prepSeq) return
  preparing.value = false
}

function closePlay() {
  prepSeq++
  endDrag()
  pg = null
  clearTimeout(winTimer)
  clearTimeout(hintTimer)
  playOpen.value = false
  preparing.value = false
  pieceUrls.value = []
  boardBgUrl.value = ''
  fullUrl.value = ''
}

function beginRun() {
  if (!pg || preparing.value) return false
  if (phase.value === 'ready') {
    phase.value = 'running'
    pg.start(Date.now())
    showHint(pg.cfg.rotate ? tx('rotateHint') : tx('dragHint'), 2200)
  }
  return phase.value === 'running'
}

function onStageTap() {
  if (phase.value === 'ready') beginRun()
}

// ── Ziehen & Ablegen ──────────────────────────────────────────────────────
function onPieceDown(e, item) {
  if (e.button != null && e.button !== 0) return
  if (quitConfirm.value || !beginRun()) return
  e.preventDefault()
  const size = pieceSize.value
  drag.value = {
    id: item.id,
    rot: item.rot,
    startX: e.clientX,
    startY: e.clientY,
    x: e.clientX,
    y: e.clientY,
    // Bei Touch schwebt das Teil über dem Finger, sonst verdeckt der Daumen es.
    lift: e.pointerType === 'touch' ? size * 0.55 : 0,
    active: false,
    pointerId: e.pointerId
  }
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragUp)
  window.addEventListener('pointercancel', onDragCancel)
}

function onDragMove(e) {
  const d = drag.value
  if (!d || e.pointerId !== d.pointerId) return
  d.x = e.clientX
  d.y = e.clientY
  if (!d.active && Math.hypot(d.x - d.startX, d.y - d.startY) > DRAG_THRESHOLD) d.active = true
  drag.value = { ...d }
}

function onDragUp(e) {
  const d = drag.value
  if (!d || e.pointerId !== d.pointerId) return
  endDrag()
  if (!pg || phase.value !== 'running') return
  if (!d.active) {
    if (pg.cfg.rotate && pg.rotate(d.id)) {
      bump()
      try { navigator.vibrate?.(8) } catch {}
    }
    return
  }
  const rect = boardRef.value?.getBoundingClientRect()
  if (!rect) return
  const cx = d.x
  const cy = d.y - d.lift
  const bx = (cx - rect.left) / cell.value
  const by = (cy - rect.top) / cell.value
  const onBoard = bx >= -0.3 && by >= -0.3 && bx <= pg.cfg.cols + 0.3 && by <= pg.cfg.rows + 0.3
  if (!onBoard) return
  const result = pg.drop(d.id, bx, by)
  if (result === 'placed') {
    lastPlaced.value = d.id
    bump()
    try { navigator.vibrate?.(15) } catch {}
    if (pg.done) onWin()
  } else if (result === 'rotate') {
    showHint(tx('rotateFirst'), 2200)
  } else {
    showHint(tx('notHere'), 900)
  }
}

function onDragCancel(e) {
  const d = drag.value
  if (d && e.pointerId !== d.pointerId) return
  endDrag()
}

function endDrag() {
  drag.value = null
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragUp)
  window.removeEventListener('pointercancel', onDragCancel)
}

function toggleEdges() {
  edgesOnly.value = !edgesOnly.value
  trayPage.value = 0
}

function pageTray(delta) {
  trayPage.value = Math.max(0, Math.min(pageCount.value - 1, trayPage.value + delta))
}

// ── Pause, Uhr, Abschluss ─────────────────────────────────────────────────
function pause() {
  if (phase.value !== 'running' || !pg) return
  pg.stop(Date.now())
  endDrag()
  previewOn.value = false
  phase.value = 'paused'
}

function resumeGame() {
  if (phase.value !== 'paused' || !pg) return
  phase.value = 'running'
  pg.start(Date.now())
}

function togglePause() {
  if (phase.value === 'running') pause()
  else if (phase.value === 'paused') resumeGame()
}

function onVisibility() {
  if (document.visibilityState !== 'visible') pause()
}

function requestQuit() {
  if (phase.value === 'won') { closePlay(); return }
  if (phase.value === 'ready') { closePlay(); return }
  pause()
  quitConfirm.value = true
}

function cancelQuit() {
  quitConfirm.value = false
}

const CONFETTI = ['🎃', '🍬', '🦇', '🎃', '🍭', '👻', '🎃', '🍂']

function onWin() {
  const t = Date.now()
  pg.stop(t)
  clockMs.value = pg.elapsed(t)
  winSeconds.value = pg.seconds(t)
  phase.value = 'won'
  previewOn.value = false
  confetti.value = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    e: CONFETTI[i % CONFETTI.length],
    left: Math.round(Math.random() * 92) + '%',
    delay: (Math.random() * 0.6).toFixed(2) + 's',
    dur: (1.8 + Math.random() * 1.2).toFixed(2) + 's'
  }))
  try { navigator.vibrate?.([20, 40, 30]) } catch {}
  finishLevel()
  clearTimeout(winTimer)
  winTimer = setTimeout(() => { showWinPanel.value = true }, 1300)
}

async function finishLevel() {
  saving.value = true
  saveError.value = ''
  try {
    const data = await game.completeHalloweenPuzzle(playLevel.value, winSeconds.value)
    rewardData.value = {
      runStars: Number(data?.run_stars || starsForTime(playLevel.value, winSeconds.value)),
      seconds: Number(data?.seconds || winSeconds.value),
      bestTime: data?.best_time != null ? Number(data.best_time) : null,
      coins: Number(data?.coins_added || 0),
      tickets: Number(data?.tickets_added || 0),
      firstClear: !!data?.first_clear,
      pet: petInfo(data?.pet)
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
  if (!playOpen.value) return
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(prepareBoard, 180)
}

function onKeyDown(e) {
  if (!playOpen.value) return
  if (e.key === 'Escape' || e.key === 'p') {
    e.preventDefault()
    togglePause()
  }
}

useReturnRefresh(() => Promise.all([loadProgress(), game.loadEventSchedule()]))

onMounted(async () => {
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onKeyDown)
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

// Spieluhr: viermal pro Sekunde reicht für mm:ss und die Live-Sterne.
let playClock = 0
watch(playOpen, (open) => {
  clearInterval(playClock)
  if (!open) return
  playClock = setInterval(() => {
    if (document.visibilityState !== 'visible' || !pg) return
    if (phase.value === 'running') clockMs.value = pg.elapsed(Date.now())
  }, 250)
})

onUnmounted(() => {
  closePlay()
  clearInterval(clockTimer)
  clearInterval(playClock)
  clearTimeout(resizeTimer)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <div class="hp-view">
    <header class="hp-header">
      <Button class="btn small btn-ghost" @click="router.push('/')">
        <i class="pi pi-arrow-left"></i><span>{{ tx('back') }}</span>
      </Button>
      <div class="hp-title-block">
        <h1 class="hp-title">{{ tx('title') }}</h1>
        <p class="hp-sub">{{ tx('sub') }}</p>
      </div>
      <Button class="btn small btn-ghost help-btn" :aria-label="tx('tutTitle')" @click="showTutorial = true">
        <i class="pi pi-question-circle"></i>
      </Button>
    </header>

    <section class="hp-hero" aria-hidden="false">
      <div class="hero-sky" aria-hidden="true">
        <span class="hero-moon"></span>
        <span class="hero-bat b1">🦇</span>
        <span class="hero-bat b2">🦇</span>
        <span class="hero-pumpkin p1">🎃</span>
        <span class="hero-pumpkin p2">🎃</span>
        <span class="hero-pumpkin p3">🎃</span>
      </div>
      <div class="hero-body">
        <div class="hero-title">🦇 {{ tx('batTitle') }}</div>
        <div class="hero-sub">{{ tx('batSub') }}</div>
        <div class="hero-pets">
          <span v-for="b in batPets" :key="b.level" class="hero-pet" :class="{ done: b.done }">
            <span class="hp-pet-emoji">{{ b.emoji }}</span>
            <span v-if="b.badge" class="hp-pet-badge">{{ b.badge }}</span>
            <span class="hp-pet-lvl">{{ tx('level') }} {{ b.level }}</span>
            <span v-if="b.done" class="hp-pet-check">✓</span>
          </span>
        </div>
      </div>
    </section>

    <div v-if="loading" class="card hp-state">
      <i class="pi pi-spin pi-spinner"></i><span>{{ tx('loading') }}</span>
    </div>
    <div v-else-if="error" class="card hp-state error-state">
      <span>{{ error }}</span>
      <Button class="btn small" @click="loadProgress">{{ tx('retry') }}</Button>
    </div>

    <template v-else>
      <section class="hp-stats">
        <div class="hp-stat">
          <strong>{{ highest }} / {{ MAX_LEVEL }}</strong><span>{{ tx('best') }}</span>
        </div>
        <div class="hp-stat">
          <strong>⭐ {{ totalStars }} / {{ MAX_LEVEL * 3 }}</strong><span>{{ tx('stars') }}</span>
        </div>
      </section>

      <div v-if="eventActive && eventCountdown" class="hp-countdown">
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
        class="hp-chapter card"
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

        <div class="hp-path" :style="{ height: PATH_H + 'px' }">
          <svg class="hp-path-svg" :viewBox="`0 0 100 ${PATH_H}`" preserveAspectRatio="none" aria-hidden="true">
            <path :d="ch.fullPath" class="path-base" />
            <path v-if="ch.donePath" :d="ch.donePath" class="path-done" />
          </svg>
          <button
            v-for="node in ch.nodes"
            :key="node.level"
            type="button"
            class="hp-node"
            :class="'st-' + node.status"
            :style="{ left: node.x + '%', top: node.y + 'px' }"
            :aria-label="tx('level') + ' ' + node.level"
            @click="openSheet(node)"
          >
            <span v-if="node.status === 'current'" class="node-avatar">{{ auth.profile?.avatar_emoji || '🐾' }}</span>
            <span class="node-face" aria-hidden="true"></span>
            <span class="node-num">{{ node.status === 'locked' ? '🔒' : node.level }}</span>
            <span v-if="node.pet" class="node-badge">🦇</span>
            <span v-else-if="node.tickets" class="node-badge">🎟️</span>
            <span class="node-stars">
              <span v-for="s in 3" :key="s" :class="{ on: s <= node.stars }">★</span>
            </span>
          </button>
        </div>
      </section>
    </template>

    <Teleport to="body">
      <div v-if="sheet" class="hp-sheet-backdrop" @click.self="sheetLevel = 0">
        <div class="hp-sheet card">
          <div class="sh-head">
            <span class="sh-icon">{{ sheet.chapterIcon }}</span>
            <h3>{{ tx('level') }} {{ sheet.level }}</h3>
            <span class="sh-stars">
              <span v-for="s in 3" :key="s" :class="{ on: s <= sheet.stars }">★</span>
            </span>
          </div>
          <div class="sh-thumb" :class="{ locked: !thumbUrl }" :style="{ aspectRatio: `${sheet.cols} / ${sheet.rows}` }">
            <img v-if="thumbUrl" :src="thumbUrl" alt="" draggable="false" />
            <span v-else class="sh-thumb-lock">🔒</span>
          </div>
          <div class="sh-grid">
            <div class="sh-cell"><span>{{ tx('pieces') }}</span><strong>{{ sheet.pieces }}</strong></div>
            <div class="sh-cell"><span>{{ tx('grid') }}</span><strong>{{ tx('gridVal', { cols: sheet.cols, rows: sheet.rows }) }}</strong></div>
            <div class="sh-cell"><span>{{ tx('bestShort') }}</span><strong>{{ sheet.bestTime != null ? fmtTime(sheet.bestTime) : '—' }}</strong></div>
          </div>
          <div class="sh-block">
            <div class="sh-label">{{ tx('helps') }}</div>
            <div class="sh-chips">
              <span v-if="sheet.ghost" class="sh-chip">{{ tx('helpGhost') }}</span>
              <span v-if="sheet.outlines" class="sh-chip">{{ tx('helpOutlines') }}</span>
              <span v-if="sheet.rotate" class="sh-chip warn">{{ tx('helpRotate') }}</span>
              <span v-if="!sheet.ghost && !sheet.outlines && !sheet.rotate" class="sh-chip">{{ tx('helpNone') }}</span>
            </div>
          </div>
          <div class="sh-block">
            <div class="sh-label">{{ tx('starRules') }}</div>
            <div class="sh-star-row"><span class="st">★★★</span> {{ tx('starTime', { time: fmtTime(sheet.star3) }) }}</div>
            <div class="sh-star-row"><span class="st">★★</span> {{ tx('starTime', { time: fmtTime(sheet.star2) }) }}</div>
            <div class="sh-star-row"><span class="st">★</span> {{ tx('star1') }}</div>
          </div>
          <div class="sh-block">
            <div class="sh-label">{{ tx('reward') }}</div>
            <div class="sh-reward">
              🪙 {{ formatCoins(sheet.reward.coins) }}<template v-if="sheet.reward.tickets"> · 🎟️ {{ sheet.reward.tickets }}</template>
              <template v-if="sheet.pet"> · {{ sheet.pet.badge }}{{ sheet.pet.emoji }} {{ sheet.pet.name }}</template>
            </div>
            <div class="sh-note">{{ tx('perfectBonus') }} · {{ tx('replayReward', { n: formatCoins(sheet.replayCoins) }) }}</div>
          </div>
          <Button
            v-if="sheet.status !== 'locked'"
            class="btn full"
            :disabled="!eventActive"
            @click="startLevel(sheet.level)"
          >
            {{ sheet.status === 'cleared' ? '↻ ' + tx('replay') : '🧩 ' + tx('play') }}
          </Button>
          <div v-else class="sh-locked">🔒 {{ tx('locked') }}</div>
          <Button class="btn full secondary" @click="sheetLevel = 0">{{ tx('close') }}</Button>
        </div>
      </div>

      <div v-if="playOpen" class="hp-overlay">
        <div class="hp-hud">
          <Button class="btn small btn-ghost hud-btn" :aria-label="tx('quitYes')" @click="requestQuit">
            <i class="pi pi-times"></i>
          </Button>
          <div class="hud-center">
            <div class="hud-row">
              <span class="hud-level">🎃 {{ tx('level') }} {{ playLevel }}</span>
              <span class="hud-stars">
                <span v-for="s in 3" :key="s" :class="{ on: s <= liveStars }">★</span>
              </span>
            </div>
            <div class="hud-progress"><span :style="{ width: (totalPieces ? placedCount / totalPieces * 100 : 0) + '%' }"></span></div>
            <div class="hud-row small">
              <span>🧩 {{ placedCount }} / {{ totalPieces }} {{ tx('placed') }}</span>
              <span>⏱ {{ fmtTime(clockMs / 1000) }}</span>
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

        <div ref="stageRef" class="hp-stage" @pointerdown="onStageTap">
          <div
            ref="boardRef"
            class="hp-board"
            :class="{ won: phase === 'won' }"
            :style="{ width: boardW + 'px', height: boardH + 'px', backgroundImage: boardBgUrl ? `url(${boardBgUrl})` : 'none' }"
          >
            <img
              v-for="p in placedPieces"
              :key="p.id"
              class="hp-placed"
              :class="{ snap: lastPlaced === p.id }"
              :src="pieceUrls[p.id]"
              :style="{
                left: (p.col * cell - PIECE_PAD * cell) + 'px',
                top: (p.row * cell - PIECE_PAD * cell) + 'px',
                width: pieceSize + 'px',
                height: pieceSize + 'px'
              }"
              alt=""
              draggable="false"
            />
            <img v-if="showFull && fullUrl" class="hp-full" :class="{ peek: previewOn && phase === 'running' }" :src="fullUrl" alt="" draggable="false" />
            <div v-if="preparing" class="hp-prep">
              <i class="pi pi-spin pi-spinner"></i><span>{{ tx('preparing') }}</span>
            </div>
            <div v-else-if="phase === 'ready'" class="hp-start">
              <div class="hs-memo">👀 {{ tx('memorize') }}</div>
              <div class="hs-go">👆 {{ tx('tapToStart') }}</div>
            </div>
          </div>
          <transition name="hint-fade">
            <div v-if="hint" class="hp-hint">{{ hint }}</div>
          </transition>
          <div v-if="phase === 'won'" class="hp-confetti" aria-hidden="true">
            <span
              v-for="c in confetti"
              :key="c.id"
              :style="{ left: c.left, animationDelay: c.delay, animationDuration: c.dur }"
            >{{ c.e }}</span>
          </div>
        </div>

        <div class="hp-toolbar">
          <button type="button" class="tb-chip" :class="{ on: edgesOnly }" :disabled="phase !== 'running'" @click="toggleEdges">
            🧩 {{ tx('edgesOnly') }}
          </button>
          <span class="tb-left">{{ tx('left', { n: leftCount }) }}</span>
          <button
            type="button"
            class="tb-chip"
            :class="{ on: previewOn }"
            :disabled="phase !== 'running'"
            @pointerdown.prevent="previewOn = true"
            @pointerup="previewOn = false"
            @pointerleave="previewOn = false"
            @pointercancel="previewOn = false"
            @contextmenu.prevent
          >👁 {{ tx('preview') }}</button>
        </div>

        <div ref="trayRef" class="hp-tray">
          <button type="button" class="tray-nav" :disabled="trayPage === 0" aria-label="◀" @click="pageTray(-1)">◀</button>
          <div class="tray-slots">
            <div
              v-for="p in visibleTray"
              :key="p.id"
              class="tray-slot"
              :class="{ dragging: drag && drag.id === p.id && drag.active }"
              :data-piece="p.id"
              @pointerdown="onPieceDown($event, p)"
              @contextmenu.prevent
            >
              <img
                v-if="pieceUrls[p.id]"
                :src="pieceUrls[p.id]"
                :style="{ transform: `rotate(${p.rot * 90}deg)` }"
                alt=""
                draggable="false"
              />
            </div>
            <div v-if="!visibleTray.length && phase === 'running' && edgesOnly" class="tray-empty">{{ tx('trayEmptyEdges') }}</div>
          </div>
          <button type="button" class="tray-nav" :disabled="trayPage >= pageCount - 1" aria-label="▶" @click="pageTray(1)">▶</button>
          <div v-if="pageCount > 1" class="tray-pages">{{ trayPage + 1 }} / {{ pageCount }}</div>
        </div>

        <img
          v-if="drag && drag.active && pieceUrls[drag.id]"
          class="hp-drag"
          :src="pieceUrls[drag.id]"
          :style="{
            width: pieceSize + 'px',
            height: pieceSize + 'px',
            transform: `translate3d(${drag.x - pieceSize / 2}px, ${drag.y - drag.lift - pieceSize / 2}px, 0) rotate(${drag.rot * 90}deg)`
          }"
          alt=""
          draggable="false"
        />

        <div v-if="phase === 'paused' && !quitConfirm" class="hp-panel-wrap">
          <div class="hp-panel card">
            <div class="pf-emoji">⏸️</div>
            <h3>{{ tx('paused') }}</h3>
            <Button class="btn full" @click="resumeGame">▶ {{ tx('resume') }}</Button>
            <Button class="btn full secondary" @click="requestQuit">{{ tx('quitYes') }}</Button>
          </div>
        </div>

        <div v-if="phase === 'won' && showWinPanel" class="hp-panel-wrap">
          <div class="hp-panel card">
            <template v-if="saving">
              <div class="pf-emoji"><i class="pi pi-spin pi-spinner"></i></div>
              <h3>{{ tx('saving') }}</h3>
            </template>
            <template v-else-if="rewardData">
              <div class="pf-emoji pf-pumpkin">🎃</div>
              <h3>{{ tx('winTitle') }}</h3>
              <div class="pf-stars">
                <span v-for="s in 3" :key="s" :class="{ on: s <= rewardData.runStars }">★</span>
              </div>
              <div class="pf-time">⏱ {{ tx('time') }} {{ fmtTime(rewardData.seconds) }}<template v-if="rewardData.bestTime != null"> · {{ tx('bestTime', { time: fmtTime(rewardData.bestTime) }) }}</template></div>
              <div class="pf-badge" :class="{ replay: !rewardData.firstClear }">
                {{ rewardData.firstClear ? tx('firstClear') : tx('replayBadge') }}
              </div>
              <div v-if="rewardData.firstClear && rewardData.runStars === 3" class="pf-perfect">{{ tx('perfect') }}</div>
              <div v-if="rewardData.pet" class="pf-pet">
                <span class="pf-pet-glow"></span>
                <span class="pf-pet-emoji">{{ rewardData.pet.emoji }}</span>
                <span class="pf-pet-text">{{ tx('newPet') }} {{ rewardData.pet.badge }} {{ rewardData.pet.name }}</span>
              </div>
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
              <Button class="btn full secondary" @click="retryLevel">↻ {{ tx('replay') }}</Button>
              <Button class="btn full secondary" @click="closePlay">{{ tx('toMap') }}</Button>
            </template>
          </div>
        </div>

        <div v-if="quitConfirm" class="hp-panel-wrap">
          <div class="hp-panel card">
            <div class="pf-emoji">👻</div>
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
            <span class="tut-piece a">🎃</span><span class="tut-piece b">🦇</span><span class="tut-piece c">👻</span>
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
.hp-view { display: flex; flex-direction: column; gap: 12px; padding-bottom: 18px; }
.hp-header { display: flex; align-items: center; gap: 10px; }
.btn-ghost { background: var(--card-2); color: var(--muted);
  display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; }
.hp-title-block { flex: 1; min-width: 0; }
.hp-title { margin: 0; font-size: 22px; font-weight: 900; color: var(--heading); }
.hp-sub { margin: 2px 0 0; color: var(--muted); font-size: 13px; }
.help-btn { flex-shrink: 0; }
.hp-state { display: flex; align-items: center; justify-content: center; gap: 10px;
  min-height: 140px; color: var(--muted); font-weight: 800; }
.error-state { flex-direction: column; color: var(--danger); }

/* ── Halloween-Banner (immer Nacht, in beiden Farbschemata) ───────── */
.hp-hero { position: relative; overflow: hidden; border-radius: var(--radius);
  min-height: 132px; display: flex; align-items: flex-end;
  background:
    radial-gradient(circle at 80% 20%, rgba(255, 214, 140, 0.35), transparent 28%),
    linear-gradient(180deg, #1e0f3a 0%, #4a1f6b 55%, #c4561c 100%);
  border: 3px solid #f47c20; box-shadow: 0 5px 0 #a8460a, 0 16px 34px rgba(120, 50, 10, 0.3); }
.hero-sky { position: absolute; inset: 0; pointer-events: none; }
.hero-moon { position: absolute; top: 14px; right: 22px; width: 44px; height: 44px; border-radius: 50%;
  background: radial-gradient(circle at 40% 38%, #fff6d8, #ffd98a);
  box-shadow: 0 0 0 8px rgba(255, 217, 138, 0.15), 0 0 30px rgba(255, 217, 138, 0.6); }
.hero-bat { position: absolute; font-size: 20px; animation: heroBat 5s ease-in-out infinite; }
.hero-bat.b1 { top: 64px; right: 70px; }
.hero-bat.b2 { top: 30px; right: 96px; font-size: 15px; animation-delay: -2.4s; }
@keyframes heroBat { 0%, 100% { transform: translate(0, 0) rotate(-6deg); } 50% { transform: translate(14px, -8px) rotate(8deg); } }
.hero-pumpkin { position: absolute; bottom: -4px; filter: drop-shadow(0 0 10px rgba(255, 150, 40, 0.8)); }
.hero-pumpkin.p1 { right: 14px; font-size: 40px; }
.hero-pumpkin.p2 { right: 58px; font-size: 26px; bottom: -2px; }
.hero-pumpkin.p3 { right: 88px; font-size: 18px; }
.hero-body { position: relative; padding: 14px 130px 14px 16px; color: #fff5e6; }
.hero-title { font-size: 17px; font-weight: 900; text-shadow: 0 2px 0 rgba(0, 0, 0, 0.35); }
.hero-sub { font-size: 12px; font-weight: 700; opacity: 0.9; margin-top: 2px; }
.hero-pets { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
.hero-pet { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 999px;
  background: rgba(0, 0, 0, 0.32); border: 1px solid rgba(255, 210, 150, 0.35);
  font-size: 12px; font-weight: 800; }
.hero-pet.done { background: rgba(46, 194, 114, 0.35); border-color: rgba(120, 240, 170, 0.6); }
.hp-pet-emoji { font-size: 16px; }
.hp-pet-check { color: #9ff5c4; }
@media (max-width: 380px) { .hero-body { padding-right: 96px; } .hero-pumpkin.p3 { display: none; } }

.hp-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.hp-stat { background: var(--card); border: 2px solid var(--border); border-radius: 14px;
  padding: 12px 10px; text-align: center; box-shadow: var(--shadow-card); }
.hp-stat strong { display: block; color: var(--accent-deep); font-weight: 900; font-size: 17px; }
.hp-stat span { display: block; color: var(--muted); font-size: 11px; font-weight: 700;
  margin-top: 4px; text-transform: uppercase; letter-spacing: 0.03em; }
.hp-countdown { align-self: center; border-radius: 999px; padding: 5px 14px;
  background: var(--card); border: 2px solid var(--border); font-size: 12px; font-weight: 800;
  color: var(--purple-deep, var(--purple)); font-variant-numeric: tabular-nums; }

.event-over { display: flex; align-items: center; gap: 12px;
  border-color: rgba(239, 71, 111, 0.45); margin: 0; }
.eo-icon { font-size: 26px; flex-shrink: 0; }
.eo-body { min-width: 0; }
.eo-title { font-weight: 900; color: var(--danger); }
.eo-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }

/* ── Pfad ─────────────────────────────────────────────────────────── */
.hp-chapter { margin: 0; padding: 12px 12px 8px; overflow: hidden; }
.ch-patch { background: linear-gradient(180deg, rgba(255, 140, 40, 0.2), var(--card) 42%); }
.ch-castle { background: linear-gradient(180deg, rgba(139, 92, 246, 0.2), var(--card) 42%); }
.ch-woods { background: linear-gradient(180deg, rgba(46, 160, 120, 0.2), var(--card) 42%); }
.ch-treats { background: linear-gradient(180deg, rgba(230, 80, 160, 0.2), var(--card) 42%); }
.ch-locked .ch-head { opacity: 0.6; }
.ch-head { display: flex; align-items: center; gap: 10px; }
.ch-icon { font-size: 30px; filter: drop-shadow(0 3px 6px rgba(120, 50, 10, 0.3)); }
.ch-names { flex: 1; min-width: 0; }
.ch-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
.ch-name { font-size: 17px; font-weight: 900; color: var(--heading); }
.ch-starcount { font-size: 12px; font-weight: 900; color: var(--accent-deep); white-space: nowrap; }

.hp-path { position: relative; }
.hp-path-svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.path-base { fill: none; stroke: rgba(196, 82, 10, 0.25); stroke-width: 10;
  stroke-linecap: round; stroke-dasharray: 2 16; vector-effect: non-scaling-stroke; }
.path-done { fill: none; stroke: #f47c20; stroke-width: 8; stroke-linecap: round;
  vector-effect: non-scaling-stroke; opacity: 0.85; }

/* Knoten als Kürbis: Rippen über ::after, Stiel über ::before. */
.hp-node { position: absolute; transform: translate(-50%, -50%);
  width: 68px; height: 58px; border-radius: 48% 48% 44% 44% / 56% 56% 46% 46%;
  display: flex; align-items: center; justify-content: center;
  border: 3px solid #fff3e0; cursor: pointer; font: inherit; padding: 0;
  background: radial-gradient(ellipse at 50% 38%, #ffb04a 0%, #f47c20 58%, #c4520a 100%);
  box-shadow: 0 5px 0 #a8460a, 0 10px 20px rgba(150, 60, 10, 0.28);
  transition: transform 0.1s ease; }
.hp-node::before { content: ''; position: absolute; top: -12px; left: 50%; width: 9px; height: 13px;
  background: linear-gradient(180deg, #6fae3c, #3f7a22); border-radius: 4px 4px 2px 2px;
  transform: translateX(-50%) rotate(10deg); box-shadow: 0 0 0 2px #fff3e0; }
.hp-node::after { content: ''; position: absolute; inset: 5px 19px; border-radius: 50%;
  border-left: 2px solid rgba(150, 50, 0, 0.28); border-right: 2px solid rgba(150, 50, 0, 0.28);
  pointer-events: none; }
.hp-node:active { transform: translate(-50%, -46%); box-shadow: 0 2px 0 #a8460a; }
.hp-node.st-cleared { background: radial-gradient(ellipse at 50% 40%, #ffe08a 0%, #ff9a2e 50%, #d65a0c 100%);
  box-shadow: 0 5px 0 #a8460a, 0 0 22px rgba(255, 170, 60, 0.75); }
.hp-node.st-locked { background: radial-gradient(ellipse at 50% 38%, #b9b39f 0%, #8f8a78 60%, #6f6b5c 100%);
  box-shadow: 0 5px 0 #57534a; }
.hp-node.st-locked::before { background: #6f6b5c; }
.hp-node.st-current { animation: nodePulse 1.8s ease-in-out infinite; }
@keyframes nodePulse {
  0%, 100% { box-shadow: 0 5px 0 #a8460a, 0 0 0 0 rgba(244, 124, 32, 0.6); }
  50% { box-shadow: 0 5px 0 #a8460a, 0 0 0 13px rgba(244, 124, 32, 0); } }
/* Gelöste Level grinsen als Kürbislaterne. */
.node-face { display: none; }
.st-cleared .node-face { display: block; position: absolute; left: 50%; bottom: 9px; width: 30px; height: 9px;
  transform: translateX(-50%); background: rgba(90, 30, 0, 0.55);
  clip-path: polygon(0 0, 15% 55%, 30% 10%, 45% 60%, 55% 10%, 70% 60%, 85% 10%, 100% 0, 85% 100%, 15% 100%); }
.node-num { position: relative; font-size: 21px; font-weight: 900; color: #fff;
  text-shadow: 0 2px 0 rgba(90, 30, 0, 0.45); margin-top: -6px; }
.st-locked .node-num { font-size: 19px; margin-top: 0; }
.node-avatar { position: absolute; top: -40px; left: 50%; transform: translateX(-50%);
  font-size: 26px; animation: avatarHop 1.2s ease-in-out infinite; pointer-events: none; }
@keyframes avatarHop { 0%, 100% { translate: 0 0; } 50% { translate: 0 -6px; } }
.node-badge { position: absolute; top: -6px; right: -10px; font-size: 17px;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.25)); }
.node-stars { position: absolute; bottom: -21px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 1px; font-size: 13px; color: #ddd0b0; white-space: nowrap;
  text-shadow: 0 1px 0 #fff; }
.node-stars .on { color: var(--accent); }
.st-locked .node-stars { display: none; }

/* ── Level-Karte ──────────────────────────────────────────────────── */
.hp-sheet-backdrop { position: fixed; inset: 0; z-index: 1200; background: var(--overlay);
  display: flex; align-items: flex-end; justify-content: center; padding: 16px;
  padding-bottom: calc(16px + var(--safe-bot)); backdrop-filter: blur(4px); }
.hp-sheet { width: min(420px, 100%); margin: 0; display: flex; flex-direction: column; gap: 10px;
  max-height: calc(100vh - 32px - var(--safe-top)); overflow-y: auto;
  animation: sheetIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes sheetIn { from { transform: translateY(30px); opacity: 0; } to { transform: none; opacity: 1; } }
.sh-head { display: flex; align-items: center; gap: 10px; }
.sh-head h3 { flex: 1; margin: 0; font-size: 20px; font-weight: 900; color: var(--heading); }
.sh-icon { font-size: 26px; }
.sh-stars { font-size: 18px; color: #ddd0b0; letter-spacing: 1px; }
.sh-stars .on { color: var(--accent); }
.sh-thumb { width: min(220px, 70%); align-self: center; border-radius: 14px; overflow: hidden;
  border: 3px solid #f47c20; box-shadow: 0 4px 0 #a8460a, 0 0 18px rgba(244, 124, 32, 0.35);
  background: #24123a; display: flex; align-items: center; justify-content: center; }
.sh-thumb img { display: block; width: 100%; height: 100%; object-fit: cover; }
.sh-thumb.locked { filter: grayscale(1); opacity: 0.7; }
.sh-thumb-lock { font-size: 34px; }
.sh-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.sh-cell { background: var(--card-2); border: 2px solid var(--border); border-radius: 12px;
  padding: 8px 6px; text-align: center; display: flex; flex-direction: column; gap: 2px; }
.sh-cell span { font-size: 10px; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
.sh-cell strong { font-size: 14px; font-weight: 900; color: var(--heading); }
.sh-block { background: var(--card-2); border: 2px solid var(--border); border-radius: 14px; padding: 8px 12px; }
.sh-label { font-size: 11px; font-weight: 800; color: var(--muted); text-transform: uppercase;
  letter-spacing: 0.05em; margin-bottom: 4px; }
.sh-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.sh-chip { font-size: 12px; font-weight: 800; padding: 3px 10px; border-radius: 999px;
  background: color-mix(in srgb, var(--purple) 14%, var(--mix-base)); color: var(--purple-deep);
  border: 1px solid color-mix(in srgb, var(--purple) 40%, transparent); }
.sh-chip.warn { background: color-mix(in srgb, #f47c20 16%, var(--mix-base)); color: var(--accent-deep);
  border-color: color-mix(in srgb, #f47c20 45%, transparent); }
.sh-star-row { font-size: 13px; font-weight: 700; color: var(--text); }
.sh-star-row .st { display: inline-block; min-width: 44px; color: var(--accent); font-weight: 900; }
.sh-reward { font-size: 16px; font-weight: 900; color: var(--accent-deep); }
.sh-note { font-size: 11px; font-weight: 700; color: var(--muted); margin-top: 2px; }
.sh-locked { text-align: center; font-weight: 800; color: var(--muted); padding: 8px 0; }

/* ── Spiel-Overlay (immer Halloween-Nacht) ────────────────────────── */
.hp-overlay { position: fixed; inset: 0; z-index: 1100; display: flex; flex-direction: column;
  background:
    radial-gradient(circle at 85% 6%, rgba(255, 214, 140, 0.18), transparent 30%),
    radial-gradient(circle at 10% 100%, rgba(244, 124, 32, 0.25), transparent 45%),
    linear-gradient(180deg, #170b2b 0%, #2a1146 60%, #3a1630 100%);
  color: #fdf0e0; touch-action: none; overscroll-behavior: none;
  user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.hp-hud { display: flex; align-items: center; gap: 10px;
  padding: calc(8px + var(--safe-top)) 12px 8px; background: rgba(20, 8, 35, 0.75);
  border-bottom: 2px solid rgba(244, 124, 32, 0.45); }
.hp-hud .btn-ghost { background: rgba(255, 255, 255, 0.1); color: #fdf0e0; }
.hud-btn { flex-shrink: 0; width: 40px; justify-content: center; }
.hud-center { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.hud-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.hud-row.small { font-size: 11px; font-weight: 800; color: rgba(253, 240, 224, 0.75); font-variant-numeric: tabular-nums; }
.hud-level { font-weight: 900; font-size: 14px; }
.hud-stars { font-size: 15px; color: rgba(255, 255, 255, 0.22); letter-spacing: 1px; }
.hud-stars .on { color: #ffc23a; }
.hud-progress { width: 100%; height: 8px; border-radius: 999px; background: rgba(255, 255, 255, 0.12); overflow: hidden; }
.hud-progress span { display: block; height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, #9b5de5, #f47c20); transition: width 0.2s ease; }

.hp-stage { position: relative; flex: 1; min-height: 0; display: flex; align-items: center;
  justify-content: center; padding: 10px; }
.hp-board { position: relative; border-radius: 6px; background-size: 100% 100%;
  box-shadow: 0 0 0 4px #3b1a55, 0 0 0 7px #f47c20, 0 18px 40px rgba(0, 0, 0, 0.55); }
.hp-placed { position: absolute; pointer-events: none; }
.hp-placed.snap { animation: snapIn 0.35s ease-out; }
@keyframes snapIn { 0% { filter: brightness(1.8) drop-shadow(0 0 8px #ffb04a); } 100% { filter: none; } }
.hp-full { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; border-radius: 6px; }
.hp-full.peek { opacity: 0.92; }
.hp-board.won::after { content: ''; position: absolute; inset: 0; pointer-events: none; border-radius: 6px;
  background: linear-gradient(115deg, transparent 30%, rgba(255, 230, 170, 0.55) 50%, transparent 70%);
  background-size: 250% 100%; animation: shine 1.2s ease-out forwards; }
@keyframes shine { from { background-position: 120% 0; } to { background-position: -60% 0; } }
.hp-prep, .hp-start { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 10px; text-align: center; padding: 12px; }
.hp-prep { background: rgba(20, 8, 35, 0.75); font-weight: 800; flex-direction: row; }
.hs-memo { background: rgba(20, 8, 35, 0.78); border: 2px solid rgba(244, 124, 32, 0.6); border-radius: 999px;
  padding: 8px 16px; font-weight: 900; font-size: 15px; }
.hs-go { background: linear-gradient(180deg, #ffb04a, #f47c20); color: #3a1600; border-radius: 999px;
  padding: 10px 20px; font-weight: 900; font-size: 17px; box-shadow: 0 5px 0 #a8460a, 0 10px 24px rgba(0, 0, 0, 0.35);
  animation: goBounce 1.4s ease-in-out infinite; }
@keyframes goBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
.hp-hint { position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); max-width: 90%;
  background: rgba(20, 8, 35, 0.88); border: 2px solid rgba(244, 124, 32, 0.7); border-radius: 999px;
  padding: 7px 16px; font-size: 13px; font-weight: 800; text-align: center; pointer-events: none; }
.hint-fade-enter-active, .hint-fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.hint-fade-enter-from, .hint-fade-leave-to { opacity: 0; transform: translate(-50%, 8px); }
.hp-confetti { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.hp-confetti span { position: absolute; top: -40px; font-size: 26px; animation-name: confettiFall;
  animation-timing-function: ease-in; animation-fill-mode: forwards; }
@keyframes confettiFall { from { transform: translateY(0) rotate(0); opacity: 1; }
  to { transform: translateY(110vh) rotate(260deg); opacity: 0.6; } }

.hp-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 4px 14px; max-width: 560px; width: 100%; margin: 0 auto; box-sizing: border-box; }
.tb-chip { border: 2px solid rgba(244, 124, 32, 0.55); background: rgba(255, 255, 255, 0.08);
  color: #fdf0e0; border-radius: 999px; padding: 6px 12px; font-size: 13px; font-weight: 800;
  cursor: pointer; touch-action: none; -webkit-tap-highlight-color: transparent; }
.tb-chip.on { background: linear-gradient(180deg, #ffb04a, #f47c20); color: #3a1600; border-color: #ffd08a; }
.tb-chip:disabled { opacity: 0.45; cursor: default; }
.tb-left { font-size: 12px; font-weight: 800; color: rgba(253, 240, 224, 0.75); }

.hp-tray { position: relative; display: flex; align-items: center; gap: 8px;
  padding: 8px 8px calc(14px + var(--safe-bot)); max-width: 560px; width: 100%; margin: 0 auto;
  box-sizing: border-box; }
.tray-nav { flex-shrink: 0; width: 36px; height: 64px; border-radius: 14px; padding: 0;
  border: 2px solid rgba(244, 124, 32, 0.5); background: rgba(255, 255, 255, 0.08); color: #fdf0e0;
  font-size: 16px; font-weight: 900; cursor: pointer; }
.tray-nav:disabled { opacity: 0.3; cursor: default; }
.tray-slots { flex: 1; min-width: 0; display: flex; justify-content: center; gap: 8px; min-height: 76px; align-items: center; }
.tray-slot { width: 64px; height: 64px; flex-shrink: 0; border-radius: 16px; display: flex;
  align-items: center; justify-content: center; cursor: grab; touch-action: none;
  background: rgba(255, 255, 255, 0.06); border: 2px dashed rgba(255, 210, 150, 0.25); }
.tray-slot img { width: 92%; height: 92%; pointer-events: none; transition: transform 0.15s ease;
  filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.45)); }
.tray-slot.dragging { opacity: 0.25; }
.tray-empty { font-size: 13px; font-weight: 800; color: #9ff5c4; text-align: center; }
.tray-pages { position: absolute; top: -6px; left: 50%; transform: translateX(-50%); font-size: 10px;
  font-weight: 800; color: rgba(253, 240, 224, 0.6); }
.hp-drag { position: fixed; left: 0; top: 0; z-index: 3; pointer-events: none;
  filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.55)); will-change: transform; }

.hp-panel-wrap { position: absolute; inset: 0; display: flex; align-items: center;
  justify-content: center; padding: 18px; background: rgba(10, 4, 20, 0.6);
  backdrop-filter: blur(4px); z-index: 5; }
.hp-panel { width: min(340px, 100%); margin: 0; display: flex; flex-direction: column; align-items: center;
  gap: 9px; padding: 24px 20px; text-align: center; color: var(--text);
  max-height: calc(100vh - 36px); overflow-y: auto;
  animation: pfIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes pfIn { from { transform: translateY(18px) scale(0.92); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; } }
.pf-emoji { font-size: 52px; line-height: 1; }
.pf-pumpkin { filter: drop-shadow(0 0 16px rgba(255, 150, 40, 0.8)); animation: pumpkinWobble 1.6s ease-in-out infinite; }
@keyframes pumpkinWobble { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
.hp-panel h3 { margin: 0; font-size: 20px; font-weight: 900; color: var(--heading); }
.pf-sub { margin: 0; color: var(--muted); font-size: 13px; font-weight: 700; }
.pf-stars { font-size: 30px; color: #ddd0b0; letter-spacing: 3px; }
.pf-stars .on { color: var(--accent); text-shadow: 0 2px 0 rgba(160, 110, 0, 0.35); }
.pf-time { font-size: 13px; font-weight: 800; color: var(--muted); font-variant-numeric: tabular-nums; }
.pf-badge { border-radius: 999px; padding: 5px 14px; font-size: 12px; font-weight: 900;
  background: color-mix(in srgb, var(--accent-2) 18%, var(--mix-base)); color: var(--success-ink);
  border: 2px solid color-mix(in srgb, var(--accent-2) 55%, transparent); }
.pf-badge.replay { background: var(--card-2); color: var(--muted); border-color: var(--border); }
.pf-perfect { font-size: 12px; font-weight: 900; color: var(--accent-deep); }
.pf-pet { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 18px; border-radius: 18px; background: linear-gradient(180deg, #2a1146, #4a1f6b);
  color: #fdf0e0; border: 2px solid #f47c20; }
.pf-pet-glow { position: absolute; inset: -6px; border-radius: 22px; pointer-events: none;
  box-shadow: 0 0 24px rgba(244, 124, 32, 0.6); animation: petGlow 1.6s ease-in-out infinite; }
@keyframes petGlow { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
.pf-pet-emoji { font-size: 40px; animation: heroBat 2.4s ease-in-out infinite; }
.pf-pet-text { font-size: 13px; font-weight: 900; }
.pf-items { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin: 4px 0 6px; }
.pf-item { border-radius: 14px; padding: 10px 16px; font-size: 17px; font-weight: 900;
  color: var(--accent-deep); background: color-mix(in srgb, var(--accent) 12%, var(--mix-base));
  border: 2px solid var(--accent-soft); }
.pf-item.tickets { color: var(--purple-deep); border-color: var(--purple);
  background: color-mix(in srgb, var(--purple) 12%, var(--mix-base)); }

.tut-backdrop { position: fixed; inset: 0; background: var(--overlay); display: flex;
  align-items: center; justify-content: center; z-index: 1400; padding: 16px; backdrop-filter: blur(5px); }
.tut-dialog { max-width: 380px; width: 100%; padding: 22px; text-align: center; margin: 0;
  display: flex; flex-direction: column; gap: 14px; max-height: calc(100vh - 32px); overflow-y: auto; }
.tut-title { margin: 0; font-size: 20px; font-weight: 900; color: var(--heading); }
.tut-demo { display: flex; justify-content: center; gap: 4px; }
.tut-piece { width: 46px; height: 46px; display: flex; align-items: center; justify-content: center;
  font-size: 26px; border-radius: 10px; background: linear-gradient(180deg, #4a1f6b, #2a1146);
  box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.3); }
.tut-piece.b { animation: tutSlide 2s ease-in-out infinite; }
@keyframes tutSlide { 0%, 20% { transform: translateY(26px); opacity: 0.6; } 60%, 100% { transform: translateY(0); opacity: 1; } }
.tut-steps { text-align: left; margin: 0; padding-left: 20px; display: flex;
  flex-direction: column; gap: 8px; color: var(--text); font-size: 13px; font-weight: 600; }
.tut-steps li { line-height: 1.4; }
.tut-got { width: 100%; font-weight: 900; }

@media (prefers-reduced-motion: reduce) {
  .hero-bat, .hp-node.st-current, .node-avatar, .hs-go, .pf-pumpkin, .pf-pet-emoji, .tut-piece.b { animation: none; }
}

/* ── Dark Mode (Discord-Look) ─────────────────────────────────────── */
.app-dark .ch-patch { background: linear-gradient(180deg, rgba(255, 140, 40, 0.16), var(--card) 42%); }
.app-dark .ch-castle { background: linear-gradient(180deg, rgba(148, 156, 247, 0.18), var(--card) 42%); }
.app-dark .ch-woods { background: linear-gradient(180deg, rgba(46, 160, 120, 0.16), var(--card) 42%); }
.app-dark .ch-treats { background: linear-gradient(180deg, rgba(230, 80, 160, 0.16), var(--card) 42%); }
.app-dark .path-base { stroke: rgba(255, 170, 90, 0.18); }
.app-dark .hp-node { border-color: #4e5058; }
.app-dark .hp-node::before { box-shadow: 0 0 0 2px #4e5058; }
.app-dark .hp-node.st-locked { background: radial-gradient(ellipse at 50% 38%, #5c5f66 0%, #4e5058 60%, #404249 100%); box-shadow: 0 5px 0 #1e1f22; }
.app-dark .node-stars,
.app-dark .sh-stars,
.app-dark .pf-stars { color: #5c5f66; text-shadow: none; }
</style>
