<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'
import { locale } from '../i18n'
import { speciesInfo, tierInfo } from '../animals'
import { useGameStore } from '../stores/game'
import { useAppToast } from '../composables/useAppToast'

const router = useRouter()
const game = useGameStore()
const appToast = useAppToast()

const TUT_KEY = 'memory_tutorial_v1'

const I18N = {
  de: {
    title: '🧠 Memory-Pfad', sub: 'Eine Reise durch {max} Level. Finde alle Tier-Paare, bevor die Züge ausgehen.',
    back: 'Zurück', level: 'Level', moves: 'Züge', best: 'Höchstes Level', progress: 'Fortschritt', pairsWord: 'Paare',
    play: 'Spielen', replay: 'Nochmal', locked: 'Gesperrt', cleared: 'Geschafft', current: 'Aktuell',
    finalLocked: '🏆 Finale geschafft - kein erneutes Spielen',
    reset: 'Brett neu', loading: 'Lade Memory...', retry: 'Erneut versuchen', close: 'Schließen',
    eventEndsIn: 'Verschwindet in {time}', eventEnded: 'Ereignis beendet',
    eventEndedSub: 'Das Memory-Ereignis ist vorbei. Es können keine Züge mehr gemacht werden.',
    matched: 'Paar gefunden!', failed: 'Zuglimit erreicht - Brett neu',
    levelDone: 'Level geschafft!', chestTitle: 'Belohnung!', chestSub: 'Du erhältst:',
    continue: 'Weiter', resetTitle: 'Brett zurücksetzen?',
    resetSub: 'Der aktuelle Fortschritt in diesem Level geht verloren.',
    resetCancel: 'Abbrechen', resetYes: 'Ja, neu mischen',
    rewardChest: '🎁 Truhe ({qty})', rewardAnimal: '{qty}× {emoji} {name}',
    pathComplete: '🏆 Alle {max} Level geschafft! Du kannst Level {max} wiederholen.',
    tutTitle: 'So funktioniert Memory',
    tutStep1: 'Tippe eine Karte an - sie dreht sich um und zeigt ein Tier.',
    tutStep2: 'Tippe eine zweite Karte. Zwei gleiche Tiere = Paar gefunden, sie bleiben offen.',
    tutStep3: 'Decke alle Paare auf, bevor dein Zuglimit erreicht ist. Sonst wird das Brett neu gemischt.',
    tutStep4: 'Jedes geschaffte Level bringt Truhen, alle 5 Level ein garantiertes Tier. Höhere Level sind größer.',
    tutGot: 'Verstanden, los geht\'s!',
    online: '🌐 Online spielen',
    error: 'Fehler'
  },
  en: {
    title: '🧠 Memory Path', sub: 'A journey through {max} levels. Find all animal pairs before you run out of moves.',
    back: 'Back', level: 'Level', moves: 'Moves', best: 'Highest level', progress: 'Progress', pairsWord: 'pairs',
    play: 'Play', replay: 'Replay', locked: 'Locked', cleared: 'Cleared', current: 'Current',
    finalLocked: '🏆 Finale cleared - no replay',
    reset: 'New board', loading: 'Loading Memory...', retry: 'Try again', close: 'Close',
    eventEndsIn: 'Disappears in {time}', eventEnded: 'Event ended',
    eventEndedSub: 'The Memory event is over. No more moves can be made.',
    matched: 'Pair found!', failed: 'Move limit reached - new board',
    levelDone: 'Level cleared!', chestTitle: 'Reward!', chestSub: 'You receive:',
    continue: 'Continue', resetTitle: 'Reset board?',
    resetSub: 'Your current progress in this level will be lost.',
    resetCancel: 'Cancel', resetYes: 'Yes, reshuffle',
    rewardChest: '🎁 Chest ({qty})', rewardAnimal: '{qty}× {emoji} {name}',
    pathComplete: '🏆 All {max} levels cleared! You can replay level {max}.',
    tutTitle: 'How Memory works',
    tutStep1: 'Tap a card - it flips over and shows an animal.',
    tutStep2: 'Tap a second card. Two identical animals = pair found, they stay open.',
    tutStep3: 'Reveal all pairs before your move limit runs out. Otherwise the board reshuffles.',
    tutStep4: 'Each cleared level gives chests, every 5 levels a guaranteed animal. Higher levels are bigger.',
    tutGot: 'Got it, let\'s go!',
    online: '🌐 Play online',
    error: 'Error'
  },
  ru: {
    title: '🧠 Memory-путь', sub: 'Путешествие по {max} уровням. Найди все пары животных, пока не кончились ходы.',
    back: 'Назад', level: 'Уровень', moves: 'Ходы', best: 'Лучший уровень', progress: 'Прогресс', pairsWord: 'пар',
    play: 'Играть', replay: 'Снова', locked: 'Закрыто', cleared: 'Пройдено', current: 'Текущий',
    finalLocked: '🏆 Финал пройден - без повтора',
    reset: 'Новое поле', loading: 'Загрузка Memory...', retry: 'Повторить', close: 'Закрыть',
    eventEndsIn: 'Исчезнет через {time}', eventEnded: 'Событие завершено',
    eventEndedSub: 'Событие Memory завершено. Ходы больше недоступны.',
    matched: 'Пара найдена!', failed: 'Лимит ходов - новое поле',
    levelDone: 'Уровень пройден!', chestTitle: 'Награда!', chestSub: 'Вы получаете:',
    continue: 'Дальше', resetTitle: 'Сбросить поле?',
    resetSub: 'Текущий прогресс на этом уровне будет потерян.',
    resetCancel: 'Отмена', resetYes: 'Да, заново',
    rewardChest: '🎁 Сундук ({qty})', rewardAnimal: '{qty}× {emoji} {name}',
    pathComplete: '🏆 Все {max} уровней пройдены! Можно повторить уровень {max}.',
    tutTitle: 'Как играть в Memory',
    tutStep1: 'Нажми на карту - она перевернётся и покажет животное.',
    tutStep2: 'Нажми вторую карту. Два одинаковых животных = пара, они остаются открытыми.',
    tutStep3: 'Открой все пары до конца лимита ходов. Иначе поле перемешается.',
    tutStep4: 'Каждый пройденный уровень даёт сундуки, каждые 5 уровней - гарантированное животное. Уровни растут.',
    tutGot: 'Понятно, поехали!',
    online: '🌐 Играть онлайн',
    error: 'Ошибка'
  }
}

function tx(key, vars = {}) {
  const dict = I18N[locale.value] || I18N.en
  let value = dict[key]
  if (value == null) value = I18N.en[key]
  return String(value ?? key).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

const data = ref(null)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const flash = ref(null)
const now = ref(Date.now())
let clockTimer = null
const showResetConfirm = ref(false)
const chestReveal = ref(null)
const playOpen = ref(false)
const showTutorial = ref(false)

const visibleCards = computed(() => data.value?.visible_cards || [])
const cardCount = computed(() => Number(data.value?.card_count || 0))
const columns = computed(() => {
  const n = cardCount.value
  if (n <= 0) return 4
  return Math.min(6, Math.ceil(Math.sqrt(n)))
})
const cardMap = computed(() => {
  const map = {}
  for (const c of visibleCards.value) map[c.index] = c
  return map
})

const configs = computed(() => Array.isArray(data.value?.configs) ? data.value.configs : [])
const maxLevel = computed(() => configs.value.reduce((m, c) => Math.max(m, Number(c.level || 0)), 0))
const curLevel = computed(() => Number(data.value?.level || 1))
const highest = computed(() => Number(data.value?.highest_level || 0))
const allCleared = computed(() => maxLevel.value > 0 && highest.value >= maxLevel.value)
const progressPct = computed(() => {
  if (maxLevel.value <= 0) return 0
  return Math.round((Math.min(highest.value, maxLevel.value) / maxLevel.value) * 100)
})

const levelNodes = computed(() =>
  configs.value.map((c) => {
    const lvl = Number(c.level || 0)
    const status = lvl < curLevel.value ? 'cleared' : lvl === curLevel.value ? 'current' : 'locked'
    const pet = c.reward_species && Number(c.reward_qty || 0) > 0
      ? { info: speciesInfo(c.reward_species), tier: c.reward_tier || 'normal', qty: Number(c.reward_qty) }
      : null
    const finalLocked = lvl === maxLevel.value && allCleared.value
    return {
      level: lvl,
      pairs: Number(c.pairs || 0),
      move_limit: Number(c.move_limit || 0),
      chest_qty: Number(c.chest_qty || 0),
      pet,
      status,
      side: lvl % 2 === 0 ? 'right' : 'left',
      redZone: lvl >= 20,
      finalLocked,
      replay: false
    }
  })
)

const eventActive = computed(() => {
  void now.value
  return data.value?.event_active !== false && game.memoryActive
})
const eventShowCountdown = computed(() => game.memoryShowCountdown)
const eventRemaining = computed(() => {
  void now.value
  if (!eventShowCountdown.value) return 0
  return Math.max(0, game.memoryEndsAt - Date.now())
})

function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const loc = locale.value
  if (days > 0) {
    if (loc === 'de') return `${days} ${days === 1 ? 'Tag' : 'Tagen'} ${hours}h`
    if (loc === 'ru') return `${days} ${days === 1 ? 'день' : 'дн.'} ${hours}ч`
    return `${days}d ${hours}h`
  }
  if (hours > 0) return loc === 'ru' ? `${hours}ч ${minutes}м` : `${hours}h ${minutes}m`
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function tierBadge(tier) {
  return tierInfo(tier)?.badge || ''
}

let flashTimer = null
function showFlash(text, kind = 'ok') {
  const id = Date.now()
  flash.value = { text, kind, id }
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    if (flash.value?.id === id) flash.value = null
    flashTimer = null
  }, 1600)
}

function wait(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function callMemory(action, payload = {}) {
  const { data: result, error: fnErr } = await supabase.functions.invoke('memory-game', {
    body: { action, ...payload }
  })
  if (fnErr) throw fnErr
  if (result?.error) throw new Error(result.error)
  return result
}

async function loadGame() {
  loading.value = true
  error.value = ''
  try {
    data.value = await callMemory('status')
  } catch (e) {
    error.value = e?.message || tx('error')
  } finally {
    loading.value = false
  }
}

function openPlay(node) {
  if (node.finalLocked) return
  if (node.status !== 'current' && !node.replay) return
  if (!eventActive.value) {
    appToast.err(tx('eventEnded'))
    return
  }
  playOpen.value = true
}

function closePlay() {
  if (busy.value) return
  playOpen.value = false
}

async function flip(index) {
  if (busy.value || loading.value || !eventActive.value) return
  if (cardMap.value[index]?.matched) return
  busy.value = true
  try {
    const res = await callMemory('flip', { index, version: data.value.version })
    data.value = res.state
    if (res.turn?.matched) showFlash(tx('matched'), 'ok')
    if (res.turn?.failed) showFlash(tx('failed'), 'warn')
    if (res.turn?.cleared) {
      showFlash(tx('levelDone'), 'ok')
      await wait(550)
      await completeLevel()
    }
  } catch (e) {
    appToast.err(e?.message || tx('error'))
    await loadGame()
  } finally {
    busy.value = false
  }
}

async function completeLevel() {
  try {
    const res = await callMemory('complete')
    const rewardIds = [res.chest_reward_id, res.animal_reward_id].filter(Boolean)
    data.value = res.state
    const opened = []
    for (const rid of rewardIds) {
      const o = await callMemory('open_chest', { reward_id: rid })
      opened.push(o)
    }
    await game.load()
    playOpen.value = false
    chestReveal.value = { phase: 'reveal', items: opened }
  } catch (e) {
    appToast.err(e?.message || tx('error'))
    await loadGame()
  }
}

function closeChestReveal() { chestReveal.value = null }

function requestReset() {
  if (busy.value || !eventActive.value) return
  showResetConfirm.value = true
}

async function confirmReset() {
  showResetConfirm.value = false
  if (busy.value) return
  busy.value = true
  try {
    const res = await callMemory('reset')
    data.value = res.state
  } catch (e) {
    appToast.err(e?.message || tx('error'))
  } finally {
    busy.value = false
  }
}

const revealAnimals = computed(() => {
  const out = []
  for (const o of (chestReveal.value?.items || [])) {
    const sp = Array.isArray(o.species) ? o.species : []
    for (const s of sp) {
      const info = speciesInfo(s)
      out.push({ emoji: info.emoji || '❓', name: info.name })
    }
  }
  return out
})

function dismissTutorial() {
  showTutorial.value = false
  try { localStorage.setItem(TUT_KEY, '1') } catch { /* ignore */ }
}

onMounted(() => {
  clockTimer = setInterval(() => { now.value = Date.now() }, 1000)
  if (!Object.keys(game.eventSchedule || {}).length) {
    game.loadEventSchedule?.().catch(() => {})
  }
  let seen = false
  try { seen = localStorage.getItem(TUT_KEY) === '1' } catch { seen = false }
  if (!seen) showTutorial.value = true
  loadGame()
})
onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
  if (flashTimer) clearTimeout(flashTimer)
})
</script>

<template>
  <div class="memory-view">
    <header class="memory-header">
      <Button class="btn small btn-ghost" @click="router.push('/')">
        <i class="pi pi-arrow-left"></i><span>{{ tx('back') }}</span>
      </Button>
      <div class="memory-title-block">
        <h1 class="memory-title">{{ tx('title') }}</h1>
        <p class="memory-sub">{{ tx('sub', { max: maxLevel || 30 }) }}</p>
      </div>
      <Button class="btn small btn-ghost help-btn" @click="showTutorial = true">
        <i class="pi pi-question-circle"></i>
      </Button>
    </header>

    <button class="online-banner" @click="router.push('/memory-online')">
      <span class="online-banner-text">
        <i class="pi pi-users"></i>
        <span>{{ tx('online') }}</span>
      </span>
      <i class="pi pi-chevron-right online-banner-arrow"></i>
    </button>

    <div v-if="loading" class="card memory-state">
      <i class="pi pi-spin pi-spinner"></i><span>{{ tx('loading') }}</span>
    </div>
    <div v-else-if="error" class="card memory-state error-state">
      <span>{{ error }}</span>
      <Button class="btn small" @click="loadGame">{{ tx('retry') }}</Button>
    </div>

    <template v-else>
      <section class="memory-stats">
        <div class="memory-stat">
          <strong>{{ Math.min(curLevel, maxLevel) }} / {{ maxLevel }}</strong><span>{{ tx('level') }}</span>
        </div>
        <div class="memory-stat">
          <strong>{{ highest }}</strong><span>{{ tx('best') }}</span>
        </div>
        <div class="memory-stat stat-progress">
          <div class="progress-bar"><span :style="{ width: progressPct + '%' }"></span></div>
          <span>{{ tx('progress') }} · {{ progressPct }}%</span>
        </div>
      </section>

      <section
        v-if="eventShowCountdown && (eventRemaining > 0 || !eventActive)"
        class="card event-banner" :class="{ ended: !eventActive }"
      >
        <span class="event-banner-icon">{{ eventActive ? '⏳' : '⏰' }}</span>
        <div class="event-banner-body">
          <div class="event-banner-title">
            <template v-if="eventActive">{{ tx('eventEndsIn', { time: formatCountdown(eventRemaining) }) }}</template>
            <template v-else>{{ tx('eventEnded') }}</template>
          </div>
          <div v-if="!eventActive" class="event-banner-sub">{{ tx('eventEndedSub') }}</div>
        </div>
      </section>

      <div v-if="allCleared" class="path-complete">{{ tx('pathComplete', { max: maxLevel }) }}</div>

      <section class="mem-path">
        <div
          v-for="(node, idx) in levelNodes"
          :key="node.level"
          class="mem-stage"
          :class="['stage-' + node.status, 'side-' + node.side, { 'red-zone': node.redZone, 'final-locked': node.finalLocked }]"
        >
          <div v-if="idx > 0" class="mem-trail" :class="'side-' + node.side"></div>
          <div class="mem-stage-card">
            <div class="mem-stage-num">{{ tx('level') }} {{ node.level }}</div>
            <div class="mem-node-circle" :class="'st-' + node.status">
              <span class="mem-node-emoji">🧠</span>
              <span v-if="node.status === 'cleared'" class="mem-badge cleared">✓</span>
              <span v-else-if="node.status === 'locked'" class="mem-badge locked">🔒</span>
              <span v-else class="mem-badge current">▶</span>
            </div>
            <div class="mem-stage-info">{{ node.pairs }} {{ tx('pairsWord') }} · {{ node.move_limit }} {{ tx('moves') }}</div>
            <div class="mem-stage-rewards">
              <span>🎁 {{ node.chest_qty }} 🐾</span>
              <span v-if="node.pet">{{ tierBadge(node.pet.tier) }} {{ node.pet.info.emoji }} {{ node.pet.info.name }}</span>
            </div>
            <div v-if="node.finalLocked" class="mem-hint final">{{ tx('finalLocked') }}</div>
            <Button
              v-else-if="node.status === 'current' || node.replay"
              class="btn mem-play-btn"
              :disabled="!eventActive"
              @click="openPlay(node)"
            >
              <template v-if="!eventActive">🔒 {{ tx('eventEnded') }}</template>
              <template v-else-if="node.replay">↻ {{ tx('replay') }}</template>
              <template v-else>▶ {{ tx('play') }}</template>
            </Button>
            <div v-else-if="node.status === 'locked'" class="mem-hint">🔒 {{ tx('locked') }}</div>
            <div v-else class="mem-hint cleared">🏆 {{ tx('cleared') }}</div>
          </div>
        </div>
      </section>
    </template>

    <Teleport to="body">
      <div v-if="playOpen && data" class="play-overlay">
        <div class="play-panel" :class="{ 'red-zone': Number(data.level) >= 20 }">
          <div class="play-head">
            <div class="play-title">{{ tx('level') }} {{ data.level }}</div>
            <div class="play-moves" :class="{ low: (data.move_limit - data.moves_used) <= 3 }">
              {{ data.moves_used }} / {{ data.move_limit }} {{ tx('moves') }}
            </div>
            <Button class="btn small btn-ghost" :disabled="busy" @click="closePlay">
              <i class="pi pi-times"></i>
            </Button>
          </div>

          <div class="memory-board-wrap">
            <div
              class="memory-board"
              :class="{ busy }"
              :style="{ gridTemplateColumns: 'repeat(' + columns + ', minmax(0, 1fr))' }"
            >
              <button
                v-for="i in cardCount"
                :key="i - 1"
                class="memory-card"
                :class="{ flipped: !!cardMap[i - 1], matched: cardMap[i - 1]?.matched }"
                :disabled="busy || !eventActive || !!cardMap[i - 1]"
                @click="flip(i - 1)"
              >
                <span class="card-inner">
                  <span class="card-face card-back">❓</span>
                  <span class="card-face card-front">{{ cardMap[i - 1]?.emoji || '' }}</span>
                </span>
              </button>
            </div>
            <Transition name="memory-flash">
              <div v-if="flash" class="memory-flash" :class="flash.kind">{{ flash.text }}</div>
            </Transition>
          </div>

          <Button class="ctrl reset" :disabled="busy || !eventActive" @click="requestReset">
            <i class="pi pi-refresh"></i><span>{{ tx('reset') }}</span>
          </Button>
        </div>
      </div>

      <div
        v-if="chestReveal"
        class="chest-modal"
        @click.self="chestReveal.phase === 'reveal' && closeChestReveal()"
      >
        <div v-if="chestReveal.phase !== 'reveal'" class="chest-stage">
          <div
            class="chest-box"
            :class="{ shake: chestReveal.phase === 'shake', opening: chestReveal.phase === 'open' }"
          >🎁</div>
        </div>
        <div v-if="chestReveal.phase === 'reveal'" class="chest-reveal">
          <h3>{{ tx('chestTitle') }}</h3>
          <p>{{ tx('chestSub') }}</p>
          <div class="chest-items">
            <div
              v-for="(a, i) in revealAnimals"
              :key="i"
              class="chest-animal"
              :style="{ animationDelay: (i * 0.12) + 's' }"
            >
              <span class="ca-emoji">{{ a.emoji }}</span>
              <b>{{ a.name }}</b>
            </div>
          </div>
          <Button class="btn" @click="closeChestReveal">{{ tx('continue') }}</Button>
        </div>
      </div>

      <div v-if="showResetConfirm" class="confirm-backdrop" @click.self="showResetConfirm = false">
        <div class="confirm-dialog card">
          <div class="confirm-emoji">🔄</div>
          <h3 style="margin:0 0 6px">{{ tx('resetTitle') }}</h3>
          <p class="confirm-sub">{{ tx('resetSub') }}</p>
          <div class="confirm-actions">
            <Button class="btn confirm-cancel" @click="showResetConfirm = false">{{ tx('resetCancel') }}</Button>
            <Button class="btn confirm-yes" @click="confirmReset">{{ tx('resetYes') }}</Button>
          </div>
        </div>
      </div>

      <div v-if="showTutorial" class="tut-backdrop" @click.self="dismissTutorial">
        <div class="tut-dialog card">
          <h3 class="tut-title">{{ tx('tutTitle') }}</h3>
          <div class="tut-demo">
            <div class="tut-card d1"><span class="tc-back">❓</span><span class="tc-front">🐼</span></div>
            <div class="tut-card d2"><span class="tc-back">❓</span><span class="tc-front">🐼</span></div>
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
.memory-view { display:flex; flex-direction:column; gap:12px; padding-bottom:18px;
  --mem-red:#ff5a5f; --mem-red-deep:#b3121b; }
.memory-header { display:flex; align-items:center; gap:10px; }
.btn-ghost { background:rgba(255,255,255,0.06); color:var(--muted);
  display:inline-flex; align-items:center; gap:5px; flex-shrink:0; }
.memory-title-block { flex:1; min-width:0; }
.memory-title { margin:0; font-size:22px; font-weight:900; }
.memory-sub { margin:2px 0 0; color:var(--muted); font-size:13px; }
.online-banner { width:100%; border:none; cursor:pointer; border-radius:16px;
  padding:16px 18px; display:flex; align-items:center; justify-content:space-between;
  gap:12px; color:#1b1300; font-weight:900; font-size:16px;
  background:linear-gradient(135deg,var(--accent),#f4a261);
  box-shadow:0 10px 26px rgba(244, 169, 18,0.35);
  animation:onlineBannerPulse 2.6s ease-in-out infinite; }
.online-banner:active { transform:scale(0.98); }
.online-banner-text { display:inline-flex; align-items:center; gap:10px; }
.online-banner-text .pi { font-size:20px; }
.online-banner-arrow { font-size:18px; opacity:0.8; }
@keyframes onlineBannerPulse {
  0%,100% { box-shadow:0 10px 26px rgba(244, 169, 18,0.32); }
  50% { box-shadow:0 10px 34px rgba(244, 169, 18,0.55); } }
.help-btn { flex-shrink:0; }
.memory-state { display:flex; align-items:center; justify-content:center; gap:10px;
  min-height:140px; color:var(--muted); font-weight:800; }
.error-state { flex-direction:column; color:var(--danger); }
.memory-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
.memory-stat { background:linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01));
  border:1px solid var(--border); border-radius:14px; padding:12px 10px; text-align:center; }
.memory-stat strong { display:block; color:var(--accent); font-weight:900; font-size:17px; }
.memory-stat span { display:block; color:var(--muted); font-size:11px; font-weight:700;
  margin-top:4px; text-transform:uppercase; letter-spacing:0.03em; }
.stat-progress { display:flex; flex-direction:column; justify-content:center; gap:6px; }
.progress-bar { width:100%; height:9px; border-radius:999px; background:rgba(0,0,0,0.3);
  overflow:hidden; border:1px solid var(--border); }
.progress-bar span { display:block; height:100%;
  background:linear-gradient(90deg,var(--accent-2),var(--accent),#ef476f); transition:width 0.3s ease; }
.event-banner { display:flex; align-items:center; gap:12px; padding:10px 14px;
  background:linear-gradient(135deg,var(--card-2),var(--surface-deep)); border:1px solid rgba(25, 146, 200,0.45); }
.event-banner.ended { background:linear-gradient(135deg,#2a1226,#1a0a1a);
  border-color:rgba(239,71,111,0.55); }
.event-banner-icon { font-size:26px; }
.event-banner-title { font-weight:900; font-size:14px; color:#1992c8; }
.event-banner.ended .event-banner-title { color:#ef476f; }
.event-banner-sub { margin-top:2px; font-size:12px; color:var(--muted); font-weight:700; }
.path-complete { text-align:center; padding:12px; border-radius:14px;
  background:linear-gradient(90deg,rgba(244, 169, 18,0.2),rgba(199,125,255,0.2));
  border:1px solid rgba(244, 169, 18,0.5); font-weight:800; }

.mem-path { display:flex; flex-direction:column; gap:0; border-radius:18px;
  overflow:hidden; border:1px solid var(--border);
  background:linear-gradient(180deg,var(--surface-deep),var(--surface-deep)); }
.mem-stage { position:relative; min-height:150px; padding:18px 16px; display:flex;
  align-items:center; }
.mem-stage.side-left { justify-content:flex-start; }
.mem-stage.side-right { justify-content:flex-end; }
.mem-stage.stage-locked { filter:grayscale(0.5) brightness(0.72); }
.mem-trail { position:absolute; top:-40px; width:6px; height:60px;
  background:repeating-linear-gradient(180deg,rgba(255,255,255,0.55) 0 8px,transparent 8px 16px);
  border-radius:4px; z-index:1; }
.mem-trail.side-left { left:22%; }
.mem-trail.side-right { right:22%; }
.mem-stage-card { position:relative; z-index:2; width:min(280px,72%);
  background:rgba(255,255,255,0.92); backdrop-filter:blur(8px);
  border:2px solid var(--border); border-radius:18px; padding:14px;
  display:flex; flex-direction:column; align-items:center; gap:7px;
  box-shadow:0 14px 30px rgba(110,80,20,0.18); }
.stage-current .mem-stage-card { border-color:var(--accent);
  box-shadow:0 0 0 3px rgba(244, 169, 18,0.22),0 14px 30px rgba(0,0,0,0.55);
  animation:cardPulse 2.4s ease-in-out infinite; }
@keyframes cardPulse {
  0%,100% { box-shadow:0 0 0 3px rgba(244, 169, 18,0.16),0 14px 30px rgba(0,0,0,0.55); }
  50% { box-shadow:0 0 0 8px rgba(244, 169, 18,0.04),0 14px 30px rgba(0,0,0,0.55); } }
.mem-stage.red-zone.stage-current .mem-stage-card { border-color:var(--mem-red);
  box-shadow:0 0 0 3px rgba(255,90,95,0.28),0 14px 30px rgba(0,0,0,0.55);
  animation:cardPulseRed 2.4s ease-in-out infinite; }
@keyframes cardPulseRed {
  0%,100% { box-shadow:0 0 0 3px rgba(255,90,95,0.22),0 14px 30px rgba(0,0,0,0.55); }
  50% { box-shadow:0 0 0 8px rgba(255,90,95,0.05),0 14px 30px rgba(0,0,0,0.55); } }
.mem-stage.red-zone .mem-stage-card { background:rgba(255,238,238,0.94);
  border-color:rgba(255,90,95,0.45); }
.mem-stage.red-zone .mem-trail {
  background:repeating-linear-gradient(180deg,rgba(255,90,95,0.7) 0 8px,transparent 8px 16px); }
.mem-stage-num { font-size:11px; letter-spacing:0.08em; text-transform:uppercase;
  color:var(--muted); font-weight:800; }
.mem-node-circle { width:74px; height:74px; border-radius:50%; display:grid;
  place-items:center; font-size:40px; position:relative;
  background:radial-gradient(circle at 40% 30%,#fff8e6,var(--bg-2));
  border:2px solid var(--border); }
.mem-node-circle.st-current { border-color:var(--accent);
  box-shadow:0 0 22px rgba(244, 169, 18,0.5); }
.red-zone .mem-node-circle.st-current { border-color:var(--mem-red);
  box-shadow:0 0 22px rgba(255,90,95,0.55); }
.mem-node-circle.st-cleared { border-color:var(--accent-2);
  background:radial-gradient(circle at 40% 30%,rgba(46, 194, 114,0.4),rgba(0,0,0,0.3)); }
.mem-node-emoji { filter:drop-shadow(0 4px 8px rgba(0,0,0,0.6)); }
.mem-badge { position:absolute; bottom:-4px; right:-4px; width:26px; height:26px;
  border-radius:50%; display:grid; place-items:center; font-size:13px; font-weight:900;
  border:2px solid var(--surface-deep); }
.mem-badge.cleared { background:var(--accent-2); color:var(--surface-deep); }
.mem-badge.locked { background:rgba(0,0,0,0.6); color:var(--muted); }
.mem-badge.current { background:var(--accent); color:var(--surface-deep); }
.red-zone .mem-badge.current { background:var(--mem-red); color:#180406; }
.mem-stage-info { font-size:12px; color:var(--muted); font-weight:800; text-align:center; }
.mem-stage-rewards { display:flex; flex-direction:column; gap:2px; font-size:11px;
  color:var(--accent); font-weight:800; text-align:center; }
.red-zone .mem-stage-rewards { color:var(--mem-red); }
.mem-play-btn { width:100%; font-weight:900; margin-top:2px; }
.red-zone .mem-play-btn {
  background:linear-gradient(135deg,#ff5a5f,#b3121b) !important; color:#fff !important;
  border:none !important; }
.mem-hint { font-size:12px; color:var(--muted); font-weight:700; }
.mem-hint.cleared { color:var(--accent-2); }
.mem-hint.final { color:var(--mem-red); font-weight:900; font-size:13px;
  padding:6px 12px; border-radius:999px; border:1px solid rgba(255,90,95,0.5);
  background:rgba(255,90,95,0.12); }

.play-overlay { position:fixed; inset:0; z-index:1100; display:flex;
  align-items:center; justify-content:center; padding:14px;
  background:rgba(0,0,0,0.82); backdrop-filter:blur(6px); overflow-y:auto; }
.play-panel { width:100%; max-width:460px; margin:auto;
  background:linear-gradient(135deg,var(--card-2),var(--surface-deep)); border:1px solid var(--border);
  border-radius:18px; padding:16px; display:flex; flex-direction:column; gap:12px; }
.play-panel.red-zone { background:linear-gradient(135deg,#2a0a0e,#160406);
  border-color:rgba(255,90,95,0.4); color:#ffe2e4; }
.play-head { display:flex; align-items:center; gap:10px; }
.play-title { font-size:18px; font-weight:900; flex:1; }
.play-moves { font-size:13px; font-weight:900; color:var(--accent);
  font-variant-numeric:tabular-nums; }
.play-moves.low { color:#ef476f; }
.play-panel.red-zone .play-moves { color:var(--mem-red); }
.play-panel.red-zone .play-moves.low { color:#ff9f1c; }
.memory-board-wrap { position:relative; }
.memory-board { display:grid; gap:8px; padding:10px; border-radius:18px;
  background:linear-gradient(135deg,rgba(255,255,255,0.05),rgba(0,0,0,0.15)),var(--surface-deep);
  border:1px solid var(--border); box-shadow:inset 0 0 28px rgba(0,0,0,0.35); }
.play-panel.red-zone .memory-board {
  background:linear-gradient(135deg,rgba(255,90,95,0.08),rgba(0,0,0,0.25)),#200709;
  border-color:rgba(255,90,95,0.35); box-shadow:inset 0 0 28px rgba(0,0,0,0.45); }
.memory-board.busy { opacity:0.8; }
.memory-card { aspect-ratio:1; border:none; padding:0; background:transparent;
  perspective:600px; cursor:pointer; }
.memory-card:disabled { cursor:default; }
.card-inner { position:relative; width:100%; height:100%; display:block;
  transform-style:preserve-3d; transition:transform 0.3s ease; }
.memory-card.flipped .card-inner { transform:rotateY(180deg); }
.card-face { position:absolute; inset:0; display:flex; align-items:center;
  justify-content:center; border-radius:12px; backface-visibility:hidden;
  font-size:clamp(20px,7vw,38px); }
.card-back { background:linear-gradient(145deg,#1992c8,#115b73);
  border:1px solid rgba(255,255,255,0.2); }
.play-panel.red-zone .card-back { background:linear-gradient(145deg,#ff5a5f,#7a0a10); }
.card-front { background:linear-gradient(145deg,var(--accent),#9b5b12);
  border:1px solid rgba(255,255,255,0.28); transform:rotateY(180deg); }
.memory-card.matched .card-front { background:linear-gradient(145deg,var(--accent-2),#0b6b55);
  box-shadow:0 0 0 2px rgba(46, 194, 114,0.45) inset; }
.memory-flash { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  border-radius:999px; padding:10px 16px; background:rgba(46, 194, 114,0.94); color:#062217;
  font-weight:900; box-shadow:0 14px 34px rgba(0,0,0,0.42); pointer-events:none; z-index:4; }
.memory-flash.warn { background:rgba(244, 169, 18,0.95); color:#2a1b00; }
.memory-flash-enter-active,.memory-flash-leave-active { transition:opacity 0.18s ease, transform 0.18s ease; }
.memory-flash-enter-from,.memory-flash-leave-to { opacity:0; transform:translate(-50%,-42%) scale(0.92); }
.ctrl.reset { min-height:46px; border-radius:14px;
  background:linear-gradient(135deg,var(--accent),#f4a261); color:#1b1300; border:none;
  font-weight:900; display:inline-flex; align-items:center; justify-content:center; gap:5px; }
.play-panel.red-zone .ctrl.reset {
  background:linear-gradient(135deg,#ff5a5f,#b3121b); color:#fff; }
.ctrl.reset:active:not(:disabled) { transform:scale(0.97); }

.chest-modal { position:fixed; inset:0; z-index:1200; display:flex; flex-direction:column;
  align-items:center; justify-content:center; gap:24px; padding:20px;
  background:rgba(0,0,0,0.78); backdrop-filter:blur(6px); }
.chest-stage { width:200px; height:200px; display:flex; align-items:center; justify-content:center; }
.chest-box { font-size:100px; filter:drop-shadow(0 0 28px rgba(244, 169, 18,0.5)); }
.chest-box.shake { animation:chestShake 0.72s ease-in-out infinite; }
.chest-box.opening { animation:chestOpen 0.42s ease-out forwards; }
.chest-reveal { width:min(360px,100%); border-radius:18px; padding:22px;
  background:linear-gradient(135deg,rgba(244, 169, 18,0.14),rgba(46, 194, 114,0.1)),var(--surface-deep);
  border:1px solid rgba(244, 169, 18,0.4); text-align:center; }
.chest-reveal h3 { margin:0; font-size:20px; font-weight:900; }
.chest-reveal p { margin:6px 0 14px; color:var(--muted); font-size:13px; font-weight:700; }
.chest-items { display:flex; flex-wrap:wrap; gap:10px; justify-content:center;
  margin-bottom:14px; }
.chest-animal { display:flex; flex-direction:column; align-items:center; gap:4px;
  min-width:78px; border-radius:14px; padding:12px 10px; background:rgba(255,255,255,0.08);
  border:1px solid rgba(255,255,255,0.1); animation:revealIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
.ca-emoji { font-size:42px; line-height:1;
  filter:drop-shadow(0 0 12px rgba(244, 169, 18,0.6)); }
.chest-animal b { font-size:12px; font-weight:800; color:#fff; text-align:center; }
.confirm-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.65); display:flex;
  align-items:center; justify-content:center; z-index:1300; padding:16px; backdrop-filter:blur(4px); }
.confirm-dialog { max-width:340px; width:100%; display:flex; flex-direction:column;
  align-items:center; padding:24px; text-align:center; }
.confirm-emoji { font-size:48px; margin-bottom:10px; }
.confirm-sub { color:var(--muted); font-size:13px; margin:0 0 18px; }
.confirm-actions { display:flex; gap:8px; width:100%; }
.confirm-cancel { flex:1; background:rgba(255,255,255,0.08) !important; color:var(--muted) !important;
  border:1px solid var(--border) !important; }
.confirm-yes { flex:1; background:linear-gradient(135deg,#ef476f,#d62850) !important;
  color:#fff !important; border:none !important; }

.tut-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.8); display:flex;
  align-items:center; justify-content:center; z-index:1400; padding:16px; backdrop-filter:blur(6px); }
.tut-dialog { max-width:380px; width:100%; padding:22px; text-align:center;
  display:flex; flex-direction:column; gap:14px; animation:revealIn 0.25s ease-out; }
.tut-title { margin:0; font-size:20px; font-weight:900; }
.tut-demo { display:flex; gap:14px; justify-content:center; perspective:700px; padding:6px 0; }
.tut-card { position:relative; width:64px; height:64px; transform-style:preserve-3d;
  animation:tutFlip 3.4s ease-in-out infinite; }
.tut-card.d2 { animation-delay:0.5s; }
.tut-card span { position:absolute; inset:0; display:flex; align-items:center;
  justify-content:center; border-radius:12px; backface-visibility:hidden; font-size:34px; }
.tc-back { background:linear-gradient(145deg,#1992c8,#115b73);
  border:1px solid rgba(255,255,255,0.2); }
.tc-front { background:linear-gradient(145deg,var(--accent-2),#0b6b55);
  border:1px solid rgba(255,255,255,0.28); transform:rotateY(180deg); }
.tut-steps { text-align:left; margin:0; padding-left:20px; display:flex;
  flex-direction:column; gap:8px; color:var(--text); font-size:13px; font-weight:600; }
.tut-steps li { line-height:1.4; }
.tut-got { width:100%; font-weight:900; }
@keyframes tutFlip {
  0%,18% { transform:rotateY(0deg); }
  42%,72% { transform:rotateY(180deg); }
  96%,100% { transform:rotateY(0deg); } }
@keyframes chestShake { 0%,100%{transform:translate(0,0) rotate(0);}
  25%{transform:translate(-4px,-2px) rotate(-4deg);} 50%{transform:translate(5px,2px) rotate(5deg);}
  75%{transform:translate(-2px,2px) rotate(-2deg);} }
@keyframes chestOpen { 0%{transform:scale(1);}
  40%{transform:scale(1.35);} 100%{transform:scale(0.1); opacity:0;} }
@keyframes revealIn { from{transform:translateY(14px) scale(0.94); opacity:0;}
  to{transform:translateY(0) scale(1); opacity:1;} }
@media (max-width:420px) {
  .memory-stats { grid-template-columns:1fr 1fr; }
  .stat-progress { grid-column:span 2; }
  .mem-stage { min-height:140px; padding:16px 12px; }
  .mem-stage-card { width:min(260px,90%); }
  .mem-node-circle { width:64px; height:64px; font-size:34px; }
}
</style>
