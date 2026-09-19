<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { locale } from '../i18n'
import { formatCoins } from '../animals'
import { useGameStore } from '../stores/game'
import { useAppToast } from '../composables/useAppToast'
import {
  WORD_LENGTH,
  MAX_GUESSES,
  KEYBOARD_ROWS,
  normalizeGuess,
  isValidGuess,
  keyStates,
  wordleReward
} from '../wordle'

const router = useRouter()
const game = useGameStore()
const appToast = useAppToast()

const TUT_KEY = 'wordle_tutorial_v1'

const I18N = {
  de: {
    title: '🟩 Zoo-Wordle', sub: 'Errate das deutsche Wort des Tages in 6 Versuchen.',
    back: 'Zurück', loading: 'Lade Spielstand...', retry: 'Erneut versuchen',
    tooShort: 'Zu kurz - 5 Buchstaben eingeben', invalidWord: 'Nur Buchstaben A-Z, Ä, Ö, Ü erlaubt',
    statStreak: 'Serie', statWins: 'Siege', statGames: 'Spiele', statBest: 'Beste Serie',
    winTitle: '🎉 Gelöst!', loseTitle: '😿 Nicht geschafft', solutionWas: 'Das Wort war',
    attemptsOf: 'Versuch {n} von {max}', streakNow: '🔥 Serie: {n}',
    nextWordIn: 'Nächstes Wort in {time}', toLeaderboard: '🏆 Bestenliste',
    distTitle: 'Deine Verteilung',
    tutTitle: 'So funktioniert Zoo-Wordle',
    tutStep1: 'Jeden Tag gibt es für alle dasselbe deutsche Wort mit 5 Buchstaben (auch Ä, Ö, Ü).',
    tutStep2: 'Du hast 6 Versuche. Nach jedem Tipp färben sich die Felder: Grün = richtige Stelle, Gelb = im Wort, Grau = nicht im Wort.',
    tutStep3: 'Je weniger Versuche, desto mehr Coins und Tickets. Siege an aufeinanderfolgenden Tagen erhöhen deine Serie - bis zu doppelte Coins!',
    tutStep4: 'Deine Serie zählt für die Wordle-Bestenliste. Ein verlorener oder verpasster Tag setzt sie zurück.',
    tutGot: 'Verstanden, los geht\'s!'
  },
  en: {
    title: '🟩 Zoo Wordle', sub: 'Guess the German word of the day in 6 tries.',
    back: 'Back', loading: 'Loading game...', retry: 'Try again',
    tooShort: 'Too short - enter 5 letters', invalidWord: 'Only letters A-Z, Ä, Ö, Ü allowed',
    statStreak: 'Streak', statWins: 'Wins', statGames: 'Games', statBest: 'Best streak',
    winTitle: '🎉 Solved!', loseTitle: '😿 Out of tries', solutionWas: 'The word was',
    attemptsOf: 'Guess {n} of {max}', streakNow: '🔥 Streak: {n}',
    nextWordIn: 'Next word in {time}', toLeaderboard: '🏆 Leaderboard',
    distTitle: 'Your distribution',
    tutTitle: 'How Zoo Wordle works',
    tutStep1: 'Every day there is one German 5-letter word for everyone (including Ä, Ö, Ü).',
    tutStep2: 'You have 6 tries. After each guess the tiles turn: green = right spot, yellow = in the word, gray = not in the word.',
    tutStep3: 'Fewer tries = more coins and tickets. Winning on consecutive days grows your streak - up to double coins!',
    tutStep4: 'Your streak counts for the Wordle leaderboard. A lost or skipped day resets it.',
    tutGot: 'Got it, let\'s go!'
  },
  ru: {
    title: '🟩 Зоо-Wordle', sub: 'Угадай немецкое слово дня за 6 попыток.',
    back: 'Назад', loading: 'Загрузка игры...', retry: 'Повторить',
    tooShort: 'Слишком коротко - введи 5 букв', invalidWord: 'Только буквы A-Z, Ä, Ö, Ü',
    statStreak: 'Серия', statWins: 'Победы', statGames: 'Игры', statBest: 'Лучшая серия',
    winTitle: '🎉 Отгадано!', loseTitle: '😿 Попытки кончились', solutionWas: 'Это было слово',
    attemptsOf: 'Попытка {n} из {max}', streakNow: '🔥 Серия: {n}',
    nextWordIn: 'Новое слово через {time}', toLeaderboard: '🏆 Рейтинг',
    distTitle: 'Твоя статистика попыток',
    tutTitle: 'Как играть в Зоо-Wordle',
    tutStep1: 'Каждый день одно немецкое слово из 5 букв для всех (включая Ä, Ö, Ü).',
    tutStep2: 'У тебя 6 попыток. После каждой буквы окрашиваются: зелёный = верное место, жёлтый = есть в слове, серый = нет в слове.',
    tutStep3: 'Чем меньше попыток, тем больше монет и тикетов. Победы подряд растят серию - до двойных монет!',
    tutStep4: 'Серия идёт в рейтинг Wordle. Проигранный или пропущенный день сбрасывает её.',
    tutGot: 'Понятно, поехали!'
  }
}

function tx(key, vars = {}) {
  const dict = I18N[locale.value] || I18N.en
  let value = dict[key]
  if (value == null) value = I18N.en[key]
  return String(value ?? key).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

const loading = ref(true)
const error = ref('')
const showTutorial = ref(false)
const current = ref('')
const submitting = ref(false)
const revealIndex = ref(-1)
const shake = ref(false)
const now = ref(Date.now())
let clockTimer = null
let revealTimer = null

const st = computed(() => game.wordleState)
const guesses = computed(() => st.value?.guesses || [])
const finished = computed(() => !!st.value?.finished)
const solved = computed(() => !!st.value?.solved)
const attempts = computed(() => Number(st.value?.attempts || 0))
const stats = computed(() => st.value?.stats || { games: 0, wins: 0, current_streak: 0, best_streak: 0, dist: {} })
const keys = computed(() => keyStates(guesses.value))
const revealDone = computed(() => revealIndex.value === -1)
const showResult = computed(() => finished.value && revealDone.value && !loading.value)

const rows = computed(() => {
  const out = []
  for (let r = 0; r < MAX_GUESSES; r++) {
    const entry = guesses.value[r]
    if (entry) {
      out.push({ tiles: [...entry.g].map((ch, i) => ({ ch, state: entry.r[i] })), submitted: true, index: r })
    } else if (r === guesses.value.length && !finished.value) {
      const chars = [...current.value]
      out.push({
        tiles: Array.from({ length: WORD_LENGTH }, (_, i) => ({ ch: chars[i] || '', state: '' })),
        submitted: false,
        index: r
      })
    } else {
      out.push({
        tiles: Array.from({ length: WORD_LENGTH }, () => ({ ch: '', state: '' })),
        submitted: false,
        index: r
      })
    }
  }
  return out
})

const reward = computed(() => {
  if (!solved.value) return null
  const added = Number(st.value?.coins_added || 0)
  if (added > 0) return { coins: added, tickets: Number(st.value?.tickets_added || 0) }
  return wordleReward(attempts.value, stats.value.current_streak || 1)
})

const distBars = computed(() => {
  const dist = stats.value.dist || {}
  const counts = Array.from({ length: MAX_GUESSES }, (_, i) => Number(dist[String(i + 1)] || 0))
  const max = Math.max(1, ...counts)
  return counts.map((n, i) => ({ attempts: i + 1, count: n, pct: Math.round((n / max) * 100) }))
})

const countdown = computed(() => {
  void now.value
  const target = new Date(st.value?.next_day_at || 0).getTime()
  const serverNow = Date.now() + Number(game.serverOffset || 0)
  const total = Math.max(0, Math.floor((target - serverNow) / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

async function loadState() {
  loading.value = true
  error.value = ''
  try {
    await game.loadWordleState()
  } catch (e) {
    error.value = e?.message || 'Fehler'
  } finally {
    loading.value = false
  }
}

function pressKey(key) {
  if (loading.value || submitting.value || finished.value || !revealDone.value) return
  if (key === 'ENTER') { submit(); return }
  if (key === 'BACK') { current.value = current.value.slice(0, -1); return }
  if (current.value.length < WORD_LENGTH) current.value += key
}

function triggerShake() {
  shake.value = false
  requestAnimationFrame(() => { shake.value = true })
  setTimeout(() => { shake.value = false }, 500)
}

async function submit() {
  const word = normalizeGuess(current.value)
  if (word.length < WORD_LENGTH) {
    triggerShake()
    appToast.err(tx('tooShort'))
    return
  }
  if (!isValidGuess(word)) {
    triggerShake()
    appToast.err(tx('invalidWord'))
    return
  }
  submitting.value = true
  try {
    await game.submitWordleGuess(word)
    current.value = ''
    revealIndex.value = guesses.value.length - 1
    if (revealTimer) clearTimeout(revealTimer)
    revealTimer = setTimeout(() => { revealIndex.value = -1 }, WORD_LENGTH * 250 + 500)
  } catch (e) {
    triggerShake()
    appToast.err(e?.message || 'Fehler')
  } finally {
    submitting.value = false
  }
}

function onKeyDown(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if (e.key === 'Enter') { pressKey('ENTER'); return }
  if (e.key === 'Backspace') { pressKey('BACK'); return }
  const ch = String(e.key || '').toUpperCase()
  if (/^[A-ZÄÖÜ]$/.test(ch)) pressKey(ch)
}

function openLeaderboard() {
  router.push({ name: 'leaderboard' })
}

function dismissTutorial() {
  showTutorial.value = false
  try { localStorage.setItem(TUT_KEY, '1') } catch {}
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  clockTimer = setInterval(() => { now.value = Date.now() }, 1000)
  let seen = false
  try { seen = localStorage.getItem(TUT_KEY) === '1' } catch { seen = false }
  if (!seen) showTutorial.value = true
  loadState()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  if (clockTimer) clearInterval(clockTimer)
  if (revealTimer) clearTimeout(revealTimer)
})
</script>

<template>
  <div class="wordle-view">
    <header class="wordle-header">
      <Button class="btn small btn-ghost" @click="router.push('/')">
        <i class="pi pi-arrow-left"></i><span>{{ tx('back') }}</span>
      </Button>
      <div class="wordle-title-block">
        <h1 class="wordle-title">{{ tx('title') }}</h1>
        <p class="wordle-sub">{{ tx('sub') }}</p>
      </div>
      <Button class="btn small btn-ghost help-btn" @click="showTutorial = true">
        <i class="pi pi-question-circle"></i>
      </Button>
    </header>

    <div v-if="loading" class="card wordle-state">
      <i class="pi pi-spin pi-spinner"></i><span>{{ tx('loading') }}</span>
    </div>
    <div v-else-if="error" class="card wordle-state error-state">
      <span>{{ error }}</span>
      <Button class="btn small" @click="loadState">{{ tx('retry') }}</Button>
    </div>

    <template v-else>
      <section class="wordle-stats">
        <div class="ws-stat"><strong>🔥 {{ stats.current_streak }}</strong><span>{{ tx('statStreak') }}</span></div>
        <div class="ws-stat"><strong>🏅 {{ stats.wins }}</strong><span>{{ tx('statWins') }}</span></div>
        <div class="ws-stat"><strong>🎯 {{ stats.games }}</strong><span>{{ tx('statGames') }}</span></div>
        <div class="ws-stat"><strong>⭐ {{ stats.best_streak }}</strong><span>{{ tx('statBest') }}</span></div>
      </section>

      <section class="wordle-grid" :class="{ shake }">
        <div v-for="row in rows" :key="row.index" class="wg-row">
          <div
            v-for="(tile, i) in row.tiles"
            :key="i"
            class="wg-tile"
            :class="[
              tile.state ? 'st-' + tile.state : '',
              { filled: !!tile.ch && !row.submitted, reveal: row.index === revealIndex }
            ]"
            :style="row.index === revealIndex ? { animationDelay: (i * 250) + 'ms' } : null"
          >{{ tile.ch }}</div>
        </div>
      </section>

      <section v-if="showResult" class="card wordle-result">
        <div class="wr-emoji">{{ solved ? '🎉' : '😿' }}</div>
        <h3>{{ solved ? tx('winTitle') : tx('loseTitle') }}</h3>
        <p v-if="solved" class="wr-sub">{{ tx('attemptsOf', { n: attempts, max: MAX_GUESSES }) }}</p>
        <p v-else class="wr-sub">
          {{ tx('solutionWas') }} <strong class="wr-solution">{{ st?.solution }}</strong>
        </p>
        <div v-if="reward" class="wr-items">
          <div class="wr-item">🪙 +{{ formatCoins(reward.coins) }}</div>
          <div v-if="reward.tickets > 0" class="wr-item tickets">🎟️ +{{ reward.tickets }}</div>
        </div>
        <div v-if="solved" class="wr-streak">{{ tx('streakNow', { n: stats.current_streak }) }}</div>
        <div class="wr-dist">
          <div class="wr-dist-title">{{ tx('distTitle') }}</div>
          <div v-for="bar in distBars" :key="bar.attempts" class="wr-bar-row">
            <span class="wr-bar-label">{{ bar.attempts }}</span>
            <div class="wr-bar-track">
              <div class="wr-bar" :class="{ me: solved && bar.attempts === attempts }" :style="{ width: bar.pct + '%' }">
                {{ bar.count || '' }}
              </div>
            </div>
          </div>
        </div>
        <div class="wr-countdown">⏳ {{ tx('nextWordIn', { time: countdown }) }}</div>
        <Button class="btn full" @click="openLeaderboard">{{ tx('toLeaderboard') }}</Button>
      </section>

      <section v-else class="wordle-keyboard">
        <div v-for="(krow, ri) in KEYBOARD_ROWS" :key="ri" class="wk-row">
          <Button
            v-for="key in krow"
            :key="key"
            class="wk-key"
            :class="[keys[key] ? 'st-' + keys[key] : '', { wide: key === 'ENTER' || key === 'BACK' }]"
            :disabled="submitting"
            @click="pressKey(key)"
          >
            <template v-if="key === 'ENTER'">⏎</template>
            <template v-else-if="key === 'BACK'">⌫</template>
            <template v-else>{{ key }}</template>
          </Button>
        </div>
      </section>
    </template>

    <Teleport to="body">
      <div v-if="showTutorial" class="tut-backdrop" @click.self="dismissTutorial">
        <div class="tut-dialog card">
          <h3 class="tut-title">{{ tx('tutTitle') }}</h3>
          <div class="wordle-tut-demo">
            <span class="wg-tile st-c">Z</span>
            <span class="wg-tile st-a">E</span>
            <span class="wg-tile st-p">B</span>
            <span class="wg-tile st-a">R</span>
            <span class="wg-tile st-a">A</span>
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
.wordle-view { display: flex; flex-direction: column; gap: 12px; padding-bottom: 18px; }
.wordle-header { display: flex; align-items: center; gap: 10px; }
.btn-ghost { background: var(--card-2); color: var(--muted);
  display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; }
.wordle-title-block { flex: 1; min-width: 0; }
.wordle-title { margin: 0; font-size: 22px; font-weight: 900; color: var(--heading); }
.wordle-sub { margin: 2px 0 0; color: var(--muted); font-size: 13px; }
.help-btn { flex-shrink: 0; }
.wordle-state { display: flex; align-items: center; justify-content: center; gap: 10px;
  min-height: 140px; color: var(--muted); font-weight: 800; }
.error-state { flex-direction: column; color: var(--danger); }

.wordle-stats { display: flex; gap: 8px; }
.ws-stat {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 8px 4px; border-radius: 12px;
  background: var(--card); border: 1px solid var(--border);
}
.ws-stat strong { font-size: 15px; }
.ws-stat span { font-size: 11px; color: var(--muted); }

.wordle-grid {
  display: flex; flex-direction: column; gap: 6px;
  max-width: 330px; width: 100%; margin: 0 auto;
}
.wordle-grid.shake { animation: wg-shake 0.4s; }
@keyframes wg-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-6px); }
  40%, 80% { transform: translateX(6px); }
}
.wg-row { display: flex; gap: 6px; }
.wg-tile {
  flex: 1; aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
  border: 2px solid var(--border); border-radius: 10px;
  background: var(--card); color: var(--text);
  font-size: 26px; font-weight: 800; text-transform: uppercase;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.wg-tile.filled { border-color: var(--muted); transform: scale(1.02); }
.wg-tile.st-c { background: #58a35b; border-color: #58a35b; color: #fff; }
.wg-tile.st-p { background: #d9a514; border-color: #d9a514; color: #fff; }
.wg-tile.st-a { background: var(--card-2); border-color: var(--card-2); color: var(--muted); }
.wg-tile.reveal { animation: wg-flip 0.5s ease both; }
@keyframes wg-flip {
  0% { transform: rotateX(90deg); }
  100% { transform: rotateX(0); }
}

.wordle-keyboard {
  display: flex; flex-direction: column; gap: 6px;
  max-width: 500px; width: 100%; margin: 0 auto;
}
.wk-row { display: flex; gap: 4px; justify-content: center; }
.wk-key {
  flex: 1; min-width: 0; padding: 12px 0;
  border: 1px solid var(--border); border-radius: 8px;
  background: var(--card); color: var(--text);
  font-size: 14px; font-weight: 700;
}
.wk-key.wide { flex: 1.6; font-size: 16px; }
.wk-key.st-c { background: #58a35b; border-color: #58a35b; color: #fff; }
.wk-key.st-p { background: #d9a514; border-color: #d9a514; color: #fff; }
.wk-key.st-a { background: var(--card-2); color: var(--muted); opacity: 0.7; }

.wordle-result {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 18px 16px; text-align: center;
  max-width: 420px; width: 100%; margin: 0 auto;
}
.wordle-result h3 { margin: 0; }
.wr-emoji { font-size: 40px; }
.wr-sub { margin: 0; color: var(--muted); }
.wr-solution { letter-spacing: 2px; color: var(--text); }
.wr-items { display: flex; gap: 10px; }
.wr-item {
  padding: 6px 14px; border-radius: 12px; font-weight: 800;
  background: rgba(244, 169, 18, 0.14); border: 1px solid var(--gold, var(--accent));
}
.wr-item.tickets { background: rgba(25, 146, 200, 0.14); border-color: #1992c8; }
.wr-streak { font-weight: 700; }
.wr-dist { width: 100%; display: flex; flex-direction: column; gap: 4px; }
.wr-dist-title { font-size: 12px; color: var(--muted); margin-bottom: 2px; }
.wr-bar-row { display: flex; align-items: center; gap: 8px; }
.wr-bar-label { width: 14px; font-size: 12px; font-weight: 700; color: var(--muted); }
.wr-bar-track { flex: 1; }
.wr-bar {
  min-width: 18px; padding: 1px 6px; border-radius: 6px;
  background: var(--card-2); color: var(--muted);
  font-size: 11px; font-weight: 700; text-align: right;
}
.wr-bar.me { background: #58a35b; color: #fff; }
.wr-countdown {
  font-weight: 800; font-variant-numeric: tabular-nums;
  color: #1992c8;
}

.tut-backdrop { position: fixed; inset: 0; background: rgba(60,40,10,0.5); display: flex;
  align-items: center; justify-content: center; z-index: 1400; padding: 16px; backdrop-filter: blur(5px); }
.tut-dialog { max-width: 380px; width: 100%; padding: 22px; text-align: center;
  display: flex; flex-direction: column; gap: 14px; }
.tut-title { margin: 0; font-size: 20px; font-weight: 900; color: var(--heading); }
.tut-steps { text-align: left; margin: 0; padding-left: 20px; display: flex;
  flex-direction: column; gap: 8px; color: var(--text); font-size: 13px; font-weight: 600; }
.tut-steps li { line-height: 1.4; }
.tut-got { width: 100%; font-weight: 900; }
.wordle-tut-demo { display: flex; gap: 6px; justify-content: center; margin: 8px 0; }
.wordle-tut-demo .wg-tile {
  flex: 0 0 44px; width: 44px; height: 44px; aspect-ratio: auto; font-size: 20px;
}
</style>
