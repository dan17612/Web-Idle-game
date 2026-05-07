<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'
import { formatCoins } from '../animals'
import { locale } from '../i18n'
import { useGameStore } from '../stores/game'
import { useAppToast } from '../composables/useAppToast'

const router = useRouter()
const game = useGameStore()
const appToast = useAppToast()

const I18N = {
  de: {
    title: '🐾 Merge-Safari',
    sub: 'Weltweite Fusionen, Tier-Zahlen und mythische Bonus-Momente.',
    back: 'Zurück',
    score: 'Punkte',
    fusions: 'Fusionen',
    highest: 'Höchstes Tier',
    global: 'Weltweit',
    combo: 'Combo',
    bonus: 'Global-Bonus',
    bonusInactive: 'Kein Bonus aktiv',
    milestones: 'Meilensteine',
    milestonesSub: 'Deine persönlichen Fusionen schalten Belohnungen frei.',
    yourProgress: 'Dein Fortschritt',
    next: 'Nächstes Ziel',
    claim: 'Abholen',
    claimed: 'Abgeholt',
    reset: 'Brett neu',
    eventEndsIn: 'Verschwindet in {time}',
    eventEnded: 'Ereignis beendet',
    eventEndedSub: 'Das Merge-Safari-Ereignis ist vorbei. Es können keine Züge oder Belohnungen mehr abgeholt werden.',
    loading: 'Lade Merge-Safari...',
    empty: 'Leer',
    gameOver: 'Keine Züge mehr',
    moveBlocked: 'Kein Zug',
    rewardClaimed: 'Belohnung erhalten!',
    mythic: 'Mythisches Tier!',
    mapping: 'Tierfolge',
    retry: 'Erneut versuchen',
    globalLine: '{count} Fusionen weltweit',
    pointsGain: '+{points} Punkte',
    rewardCoins: '{coins} Münzen',
    rewardTickets: '🎟️ {count} Tickets',
    rewardChests: '🎁 {count} Truhe(n)',
    rewardAnimal: '{qty}× {emoji} {name}',
    milestoneChestTitle: 'Meilenstein-Truhe geöffnet!',
    milestoneChestSub: 'Aus deiner Belohnung kamen:',
    continue: 'Weiter',
    resetConfirmTitle: 'Brett zurücksetzen?',
    resetConfirmSub: 'Dein aktueller Fortschritt auf diesem Brett geht verloren.',
    resetCancel: 'Abbrechen',
    resetConfirmAction: 'Ja, neu würfeln',
    controls: {
      up: 'Hoch',
      down: 'Runter',
      left: 'Links',
      right: 'Rechts'
    }
  },
  en: {
    title: '🐾 Merge Safari',
    sub: 'Worldwide merges, animal numbers and mythic bonus moments.',
    back: 'Back',
    score: 'Score',
    fusions: 'Merges',
    highest: 'Highest animal',
    global: 'Worldwide',
    combo: 'Combo',
    bonus: 'Global bonus',
    bonusInactive: 'No bonus active',
    milestones: 'Milestones',
    milestonesSub: 'Your personal merges unlock rewards.',
    yourProgress: 'Your progress',
    next: 'Next goal',
    claim: 'Claim',
    claimed: 'Claimed',
    reset: 'New board',
    eventEndsIn: 'Disappears in {time}',
    eventEnded: 'Event ended',
    eventEndedSub: 'The Merge Safari event is over. Moves and rewards can no longer be claimed.',
    loading: 'Loading Merge Safari...',
    empty: 'Empty',
    gameOver: 'No moves left',
    moveBlocked: 'No move',
    rewardClaimed: 'Reward claimed!',
    mythic: 'Mythic animal!',
    mapping: 'Animal chain',
    retry: 'Try again',
    globalLine: '{count} merges worldwide',
    pointsGain: '+{points} points',
    rewardCoins: '{coins} coins',
    rewardTickets: '🎟️ {count} tickets',
    rewardChests: '🎁 {count} chest(s)',
    rewardAnimal: '{qty}× {emoji} {name}',
    milestoneChestTitle: 'Milestone chest opened!',
    milestoneChestSub: 'Your reward contained:',
    continue: 'Continue',
    resetConfirmTitle: 'Reset board?',
    resetConfirmSub: 'Your current progress on this board will be lost.',
    resetCancel: 'Cancel',
    resetConfirmAction: 'Yes, reshuffle',
    controls: {
      up: 'Up',
      down: 'Down',
      left: 'Left',
      right: 'Right'
    }
  },
  ru: {
    title: '🐾 Merge-Сафари',
    sub: 'Глобальные слияния, животные-числа и мифические бонусы.',
    back: 'Назад',
    score: 'Очки',
    fusions: 'Слияния',
    highest: 'Лучшее животное',
    global: 'Мир',
    combo: 'Комбо',
    bonus: 'Глобальный бонус',
    bonusInactive: 'Бонус не активен',
    milestones: 'Этапы',
    milestonesSub: 'Твои личные слияния открывают награды.',
    yourProgress: 'Твой прогресс',
    next: 'Следующая цель',
    claim: 'Забрать',
    claimed: 'Получено',
    reset: 'Новое поле',
    eventEndsIn: 'Исчезнет через {time}',
    eventEnded: 'Событие завершено',
    eventEndedSub: 'Событие Merge-Сафари завершено. Ходы и награды больше недоступны.',
    loading: 'Загрузка Merge-Сафари...',
    empty: 'Пусто',
    gameOver: 'Ходов нет',
    moveBlocked: 'Нет хода',
    rewardClaimed: 'Награда получена!',
    mythic: 'Мифическое животное!',
    mapping: 'Цепочка животных',
    retry: 'Повторить',
    globalLine: '{count} слияний в мире',
    pointsGain: '+{points} очков',
    rewardCoins: '{coins} монет',
    rewardTickets: '🎟️ {count} билетов',
    rewardChests: '🎁 {count} сундук(ов)',
    rewardAnimal: '{qty}× {emoji} {name}',
    milestoneChestTitle: 'Сундук этапа открыт!',
    milestoneChestSub: 'В награде было:',
    continue: 'Дальше',
    resetConfirmTitle: 'Сбросить поле?',
    resetConfirmSub: 'Текущий прогресс на этом поле будет потерян.',
    resetCancel: 'Отмена',
    resetConfirmAction: 'Да, заново',
    controls: {
      up: 'Вверх',
      down: 'Вниз',
      left: 'Влево',
      right: 'Вправо'
    }
  }
}

function tx(key, vars = {}) {
  const dict = I18N[locale.value] || I18N.en
  let value = dict
  for (const part of key.split('.')) value = value?.[part]
  if (value == null) {
    value = I18N.en
    for (const part of key.split('.')) value = value?.[part]
  }
  return String(value ?? key).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

const data = ref(null)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const flash = ref(null)
const now = ref(Date.now())
let clockTimer = null
let channel = null
const showResetConfirm = ref(false)
const milestoneChestReveal = ref(null)
let touchStart = null

const tilePalette = [
  ['#ffd166', '#9b5b12'],
  ['#06d6a0', '#0b6b55'],
  ['#48cae4', '#115b73'],
  ['#ef476f', '#7d1731'],
  ['#f4a261', '#7c3f13'],
  ['#90be6d', '#31572c'],
  ['#c77dff', '#4c1d95'],
  ['#ff9f1c', '#7a3b04'],
  ['#4cc9f0', '#073b4c'],
  ['#f72585', '#6d123c']
]

const board = computed(() => data.value?.state?.board || Array.from({ length: 16 }, () => null))
const globalState = computed(() => data.value?.global || null)
const milestones = computed(() => data.value?.milestones || [])
const totalGlobal = computed(() => Number(globalState.value?.total_fusions || 0))
const playerFusions = computed(() => Number(data.value?.state?.total_fusions || 0))
const eventInfo = computed(() => data.value?.event || null)
const eventActive = computed(() => {
  void now.value
  const evt = eventInfo.value
  if (!evt) return true
  if (evt.enabled === false) return false
  if (evt.ends_at && new Date(evt.ends_at).getTime() <= Date.now()) return false
  if (evt.starts_at && new Date(evt.starts_at).getTime() > Date.now()) return false
  return true
})
const eventShowCountdown = computed(() => {
  const evt = eventInfo.value
  return !!(evt && evt.show_countdown !== false && evt.ends_at)
})
const eventRemaining = computed(() => {
  void now.value
  if (!eventShowCountdown.value) return 0
  const ends = eventInfo.value?.ends_at ? new Date(eventInfo.value.ends_at).getTime() : 0
  return Math.max(0, ends - Date.now())
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
  if (hours > 0) {
    if (loc === 'ru') return `${hours}ч ${minutes}м`
    return `${hours}h ${minutes}m`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
const claimableMilestones = computed(() =>
  milestones.value.filter((m) => !m.claimed && Number(m.fusion_goal || 0) <= playerFusions.value)
)
const nextMilestone = computed(() =>
  milestones.value.find((m) => !m.claimed && Number(m.fusion_goal || 0) > playerFusions.value) || null
)
const progressPct = computed(() => {
  const next = Number(nextMilestone.value?.fusion_goal || 0)
  if (!next) return 100
  const previous = milestones.value
    .filter((m) => Number(m.fusion_goal || 0) < next)
    .reduce((max, m) => Math.max(max, Number(m.fusion_goal || 0)), 0)
  const span = Math.max(1, next - previous)
  return Math.max(0, Math.min(100, ((playerFusions.value - previous) / span) * 100))
})
const bonusRemaining = computed(() => {
  void now.value
  const until = globalState.value?.bonus_until ? new Date(globalState.value.bonus_until).getTime() : 0
  return Math.max(0, until - Date.now())
})
const highestTile = computed(() => {
  const cells = board.value.filter(Boolean)
  return cells.sort((a, b) => Number(b.rank || 0) - Number(a.rank || 0))[0] || null
})

function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function speciesMeta(species) {
  return data.value?.mapping?.find((m) => m.species === species) || null
}

function rewardParts(reward = {}) {
  const parts = []
  if (Number(reward.coins || 0) > 0) {
    parts.push(tx('rewardCoins', { coins: formatCoins(Number(reward.coins || 0)) }))
  }
  if (Number(reward.tickets || 0) > 0) {
    parts.push(tx('rewardTickets', { count: formatCoins(Number(reward.tickets || 0)) }))
  }
  if (Number(reward.chests || 0) > 0) {
    parts.push(tx('rewardChests', { count: formatCoins(Number(reward.chests || 0)) }))
  }
  if (reward.species && Number(reward.qty || 0) > 0) {
    const meta = speciesMeta(reward.species)
    parts.push(tx('rewardAnimal', {
      qty: Number(reward.qty || 0),
      emoji: meta?.emoji || '🐾',
      name: meta?.name || reward.species
    }))
  }
  return parts
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function revealSpeciesList(species = []) {
  return species.map((s) => {
    const meta = speciesMeta(s)
    return {
      species: s,
      emoji: meta?.emoji || '🐾',
      name: meta?.name || s
    }
  })
}

function tileStyle(cell) {
  if (!cell) return {}
  const pair = tilePalette[Number(cell.rank || 0) % tilePalette.length]
  const glow = cell.mythic ? 'rgba(255, 209, 102, 0.72)' : 'rgba(0, 0, 0, 0.32)'
  return {
    '--tile-a': pair[0],
    '--tile-b': pair[1],
    '--tile-glow': glow
  }
}

function showFlash(text, kind = 'ok') {
  const id = Date.now()
  flash.value = { text, kind, id }
  setTimeout(() => {
    if (flash.value?.id === id) flash.value = null
  }, 1800)
}

async function callMerge(action, payload = {}) {
  const { data: result, error: fnError } = await supabase.functions.invoke('merge-game', {
    body: { action, ...payload }
  })
  if (fnError) throw fnError
  if (result?.error) throw new Error(result.error)
  return result
}

async function loadGame() {
  loading.value = true
  error.value = ''
  try {
    data.value = await callMerge('status')
  } catch (e) {
    error.value = e?.message || 'Fehler'
  } finally {
    loading.value = false
  }
}

async function move(direction) {
  if (busy.value || loading.value || !eventActive.value) return
  busy.value = true
  try {
    const result = await callMerge('move', { direction })
    data.value = result
    if (result.turn?.moved === false) showFlash(tx('moveBlocked'), 'warn')
    else if (Number(result.turn?.score_delta || 0) > 0) {
      showFlash(tx('pointsGain', { points: formatCoins(Number(result.turn.score_delta || 0)) }))
    }
    if (result.turn?.mythic_species) showFlash(tx('mythic'), 'mythic')
  } catch (e) {
    appToast.err(e?.message || 'Fehler')
    await loadGame()
  } finally {
    busy.value = false
  }
}

async function claimMilestone(goal) {
  if (busy.value) return
  busy.value = true
  try {
    const result = await callMerge('claim', { fusion_goal: goal })
    data.value = result
    await game.load()
    const claimed = result.turn?.claimed || {}
    const chestSpecies = Array.isArray(claimed.chest_species) ? claimed.chest_species : []
    const rewardItems = rewardParts(claimed)
    milestoneChestReveal.value = { phase: 'shake', species: revealSpeciesList(chestSpecies), rewardItems }
    await wait(650)
    milestoneChestReveal.value = { ...milestoneChestReveal.value, phase: 'open' }
    await wait(420)
    milestoneChestReveal.value = { ...milestoneChestReveal.value, phase: 'reveal' }
    appToast.ok(tx('rewardClaimed'))
  } catch (e) {
    appToast.err(e?.message || 'Fehler')
  } finally {
    busy.value = false
  }
}

function closeMilestoneChestReveal() {
  milestoneChestReveal.value = null
}

function requestReset() {
  if (busy.value || !eventActive.value) return
  showResetConfirm.value = true
}

async function confirmReset() {
  showResetConfirm.value = false
  if (busy.value) return
  busy.value = true
  try {
    data.value = await callMerge('reset')
  } catch (e) {
    appToast.err(e?.message || 'Fehler')
  } finally {
    busy.value = false
  }
}

function onKey(event) {
  const map = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'up',
    s: 'down',
    a: 'left',
    d: 'right'
  }
  const direction = map[event.key]
  if (!direction) return
  event.preventDefault()
  move(direction)
}

function onTouchStart(event) {
  const touch = event.changedTouches?.[0]
  if (!touch) return
  touchStart = { x: touch.clientX, y: touch.clientY }
}

function onTouchEnd(event) {
  const touch = event.changedTouches?.[0]
  if (!touchStart || !touch) return
  const dx = touch.clientX - touchStart.x
  const dy = touch.clientY - touchStart.y
  touchStart = null
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left')
  else move(dy > 0 ? 'down' : 'up')
}

function subscribeGlobal() {
  if (channel) supabase.removeChannel(channel)
  channel = supabase
    .channel('merge-global-state')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'merge_global_state', filter: 'id=eq.1' },
      (payload) => {
        if (!data.value || !payload.new) return
        data.value = {
          ...data.value,
          global: {
            ...data.value.global,
            ...payload.new,
            total_fusions: Number(payload.new.total_fusions || 0),
            highest_rank: Number(payload.new.highest_rank || 0),
            mythic_total: Number(payload.new.mythic_total || 0),
            bonus_multiplier: Number(payload.new.bonus_multiplier || 1),
            bonus_active: new Date(payload.new.bonus_until).getTime() > Date.now()
          }
        }
      }
    )
    .subscribe()
}

onMounted(() => {
  clockTimer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
  loadGame()
  subscribeGlobal()
})

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
  if (channel) supabase.removeChannel(channel)
})
</script>

<template>
  <div class="merge-view">
    <header class="merge-header">
      <Button class="btn small btn-ghost" @click="router.push('/')">
        <i class="pi pi-arrow-left"></i>
        <span>{{ tx('back') }}</span>
      </Button>
      <div class="merge-title-block">
        <h1 class="merge-title">{{ tx('title') }}</h1>
        <p class="merge-sub">{{ tx('sub') }}</p>
      </div>
    </header>

    <div v-if="loading" class="card merge-state">
      <i class="pi pi-spin pi-spinner"></i>
      <span>{{ tx('loading') }}</span>
    </div>

    <div v-else-if="error" class="card merge-state error-state">
      <span>{{ error }}</span>
      <Button class="btn small" @click="loadGame">{{ tx('retry') }}</Button>
    </div>

    <template v-else>
      <section class="merge-stats">
        <div class="merge-stat">
          <strong>{{ formatCoins(data.state.score) }}</strong>
          <span>{{ tx('score') }}</span>
        </div>
        <div class="merge-stat">
          <strong>{{ formatCoins(data.state.total_fusions) }}</strong>
          <span>{{ tx('fusions') }}</span>
        </div>
        <div class="merge-stat">
          <strong>{{ highestTile?.emoji || '🐾' }} {{ highestTile?.value_label || '1' }}</strong>
          <span>{{ tx('highest') }}</span>
        </div>
      </section>

      <section
        v-if="eventShowCountdown && (eventRemaining > 0 || !eventActive)"
        class="card event-banner"
        :class="{ ended: !eventActive }"
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

      <section class="card global-card" :class="{ active: bonusRemaining > 0 }">
        <div class="global-top">
          <div>
            <div class="global-label">{{ tx('global') }}</div>
            <div class="global-value">{{ tx('globalLine', { count: formatCoins(totalGlobal) }) }}</div>
          </div>
          <div class="global-bonus">
            <template v-if="bonusRemaining > 0">
              ×{{ globalState.bonus_multiplier }} · {{ formatDuration(bonusRemaining) }}
            </template>
            <template v-else>{{ tx('bonusInactive') }}</template>
          </div>
        </div>
        <div class="milestone-progress">
          <span :style="{ width: progressPct + '%' }"></span>
        </div>
        <div class="next-line">
          <template v-if="nextMilestone">
            {{ tx('yourProgress') }}: {{ formatCoins(playerFusions) }} / {{ formatCoins(nextMilestone.fusion_goal) }}
          </template>
          <template v-else>{{ tx('milestones') }} · 100%</template>
        </div>
      </section>

      <section
        class="merge-board-wrap"
        tabindex="0"
        @keydown="onKey"
        @touchstart.passive="onTouchStart"
        @touchend.passive="onTouchEnd"
      >
        <div class="merge-board" :class="{ busy, over: data.state.game_over }">
          <div
            v-for="(cell, index) in board"
            :key="cell?.id || 'empty-' + index"
            class="merge-cell"
            :class="{ filled: !!cell, mythic: cell?.mythic }"
            :style="tileStyle(cell)"
          >
            <template v-if="cell">
              <span class="cell-emoji">{{ cell.emoji }}</span>
              <span class="cell-value">{{ cell.value_label }}</span>
              <span class="cell-name">{{ cell.name }}</span>
            </template>
          </div>
        </div>
        <Transition name="merge-flash">
          <div v-if="flash" class="merge-flash" :class="flash.kind">{{ flash.text }}</div>
        </Transition>
        <div v-if="data.state.game_over" class="game-over-pill">{{ tx('gameOver') }}</div>
      </section>

      <section class="merge-controls">
        <Button class="ctrl spacer" disabled></Button>
        <Button class="ctrl" :title="tx('controls.up')" :disabled="busy || !eventActive" @click="move('up')">
          <i class="pi pi-arrow-up"></i>
        </Button>
        <Button class="ctrl spacer" disabled></Button>
        <Button class="ctrl" :title="tx('controls.left')" :disabled="busy || !eventActive" @click="move('left')">
          <i class="pi pi-arrow-left"></i>
        </Button>
        <Button class="ctrl reset" :disabled="busy || !eventActive" @click="requestReset">
          <i class="pi pi-refresh"></i>
          <span>{{ tx('reset') }}</span>
        </Button>
        <Button class="ctrl" :title="tx('controls.right')" :disabled="busy || !eventActive" @click="move('right')">
          <i class="pi pi-arrow-right"></i>
        </Button>
        <Button class="ctrl spacer" disabled></Button>
        <Button class="ctrl" :title="tx('controls.down')" :disabled="busy || !eventActive" @click="move('down')">
          <i class="pi pi-arrow-down"></i>
        </Button>
        <Button class="ctrl spacer" disabled></Button>
      </section>

      <section class="card milestones-card">
        <div class="section-head">
          <h2>{{ tx('milestones') }}</h2>
          <span class="ms-counter">{{ milestones.filter(m => m.claimed).length }} / {{ milestones.length }}</span>
        </div>
        <p class="milestones-sub">{{ tx('milestonesSub') }}</p>
        <div class="milestone-list">
          <div
            v-for="(m, idx) in milestones"
            :key="m.fusion_goal"
            class="milestone-row"
            :class="{ ready: !m.claimed && Number(m.fusion_goal) <= playerFusions, done: m.claimed }"
          >
            <div class="milestone-icon">
              <span v-if="m.claimed" class="ms-icon done">✓</span>
              <span v-else-if="Number(m.fusion_goal) <= playerFusions" class="ms-icon ready">★</span>
              <span v-else class="ms-icon locked">{{ idx + 1 }}</span>
            </div>
            <div class="milestone-body">
              <div class="milestone-title">{{ m.title }}</div>
              <div class="milestone-goal">
                {{ formatCoins(Math.min(playerFusions, m.fusion_goal)) }} / {{ formatCoins(m.fusion_goal) }} {{ tx('fusions') }}
              </div>
              <div class="milestone-reward">{{ rewardParts(m.reward).join(' · ') }}</div>
            </div>
            <Button
              v-if="!m.claimed && Number(m.fusion_goal) <= playerFusions"
              class="btn small ms-claim-btn"
              :disabled="busy || !eventActive"
              @click="claimMilestone(m.fusion_goal)"
            >
              {{ tx('claim') }}
            </Button>
            <span v-else-if="m.claimed" class="ms-claimed">✓</span>
          </div>
        </div>
      </section>

      <section class="card mapping-card">
        <div class="section-head">
          <h2>{{ tx('mapping') }}</h2>
        </div>
        <div class="mapping-strip">
          <div v-for="m in data.mapping.slice(0, 18)" :key="m.rank" class="mapping-chip" :class="{ mythic: m.mythic }">
            <span>{{ m.emoji }}</span>
            <b>{{ m.value_label }}</b>
          </div>
        </div>
      </section>

      <div
        v-if="milestoneChestReveal"
        class="milestone-chest-modal"
        @click.self="milestoneChestReveal.phase === 'reveal' && closeMilestoneChestReveal()"
      >
        <div
          v-if="milestoneChestReveal.phase !== 'reveal'"
          class="milestone-chest-stage"
        >
          <div
            class="milestone-chest-box"
            :class="{
              shake: milestoneChestReveal.phase === 'shake',
              opening: milestoneChestReveal.phase === 'open'
            }"
          >🎁</div>
          <div class="milestone-chest-glow"></div>
        </div>

        <div v-if="milestoneChestReveal.phase === 'reveal'" class="milestone-chest-reveal">
          <h3>{{ tx('milestoneChestTitle') }}</h3>
          <p>{{ tx('milestoneChestSub') }}</p>
          <div class="milestone-chest-items">
            <template v-if="milestoneChestReveal.species.length > 0">
              <div
                v-for="(item, i) in milestoneChestReveal.species"
                :key="item.species + '-' + i"
                class="milestone-chest-item"
                :style="{ animationDelay: (i * 0.12) + 's' }"
              >
                <span>{{ item.emoji }}</span>
                <b>{{ item.name }}</b>
              </div>
            </template>
            <template v-else>
              <div
                v-for="(part, i) in milestoneChestReveal.rewardItems"
                :key="i"
                class="milestone-chest-item reward-text-item"
                :style="{ animationDelay: (i * 0.15) + 's' }"
              >
                <b>{{ part }}</b>
              </div>
            </template>
          </div>
        </div>

        <Button
          v-if="milestoneChestReveal.phase === 'reveal'"
          class="btn"
          @click="closeMilestoneChestReveal"
        >{{ tx('continue') }}</Button>
      </div>

      <div v-if="showResetConfirm" class="confirm-backdrop" @click.self="showResetConfirm = false">
        <div class="confirm-dialog card">
          <div class="confirm-emoji">🔄</div>
          <h3 style="margin: 0 0 6px">{{ tx('resetConfirmTitle') }}</h3>
          <p class="confirm-sub">{{ tx('resetConfirmSub') }}</p>
          <div class="confirm-actions">
            <Button class="btn confirm-cancel" @click="showResetConfirm = false">{{ tx('resetCancel') }}</Button>
            <Button class="btn confirm-yes" @click="confirmReset">{{ tx('resetConfirmAction') }}</Button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.merge-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 18px;
}
.merge-header {
  display: flex;
  align-items: center;
  gap: 10px;
}
.btn-ghost {
  background: rgba(255, 255, 255, 0.06);
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}
.merge-title-block {
  min-width: 0;
}
.merge-title {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
}
.merge-sub {
  margin: 2px 0 0;
  color: var(--muted);
  font-size: 13px;
}
.merge-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 140px;
  color: var(--muted);
  font-weight: 800;
}
.error-state {
  flex-direction: column;
  color: var(--danger);
}
.merge-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.merge-stat {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01));
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px 10px;
  text-align: center;
  min-width: 0;
}
.merge-stat strong {
  display: block;
  color: var(--accent);
  font-weight: 900;
  font-size: 17px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.merge-stat span {
  display: block;
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.event-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background:
    radial-gradient(circle at 0% 0%, rgba(72, 202, 228, 0.18), transparent 60%),
    linear-gradient(135deg, #142244, #0d1730);
  border: 1px solid rgba(72, 202, 228, 0.45);
}
.event-banner.ended {
  background:
    radial-gradient(circle at 0% 0%, rgba(239, 71, 111, 0.22), transparent 60%),
    linear-gradient(135deg, #2a1226, #1a0a1a);
  border-color: rgba(239, 71, 111, 0.55);
}
.event-banner-icon {
  font-size: 26px;
  flex-shrink: 0;
}
.event-banner-body { min-width: 0; flex: 1; }
.event-banner-title {
  font-weight: 900;
  font-size: 14px;
  color: #48cae4;
  font-variant-numeric: tabular-nums;
}
.event-banner.ended .event-banner-title { color: #ef476f; }
.event-banner-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--muted);
  font-weight: 700;
}
.milestones-sub {
  margin: 0 0 10px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
}
.global-card {
  background:
    radial-gradient(circle at 8% 0%, rgba(255, 209, 102, 0.18), transparent 45%),
    linear-gradient(135deg, #17213a, #102035);
}
.global-card.active {
  border-color: rgba(6, 214, 160, 0.55);
  box-shadow: 0 0 0 1px rgba(6, 214, 160, 0.2) inset;
}
.global-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}
.global-label {
  color: var(--muted);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}
.global-value {
  font-size: 18px;
  font-weight: 900;
  color: var(--accent);
}
.global-bonus {
  min-width: 110px;
  text-align: right;
  color: var(--accent-2);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}
.milestone-progress {
  height: 9px;
  margin-top: 12px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid var(--border);
}
.milestone-progress span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #06d6a0, #ffd166, #ef476f);
  transition: width 0.2s ease;
}
.next-line {
  margin-top: 6px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}
.merge-board-wrap {
  position: relative;
  outline: none;
}
.merge-board {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(4, minmax(0, 1fr));
  gap: 8px;
  aspect-ratio: 1;
  padding: 10px;
  border-radius: 18px;
  background:
    radial-gradient(circle at 50% 50%, rgba(72, 202, 228, 0.06), transparent 70%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(0, 0, 0, 0.15)),
    #0d1528;
  border: 1px solid var(--border);
  box-shadow:
    inset 0 0 28px rgba(0, 0, 0, 0.35),
    0 8px 32px rgba(0, 0, 0, 0.3);
  touch-action: none;
}
.merge-board.busy {
  opacity: 0.8;
}
.merge-board.over {
  border-color: var(--danger);
}
.merge-cell {
  min-width: 0;
  min-height: 0;
  aspect-ratio: 1;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px;
  overflow: hidden;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.merge-cell.filled {
  background:
    radial-gradient(circle at 30% 18%, rgba(255, 255, 255, 0.32), transparent 45%),
    linear-gradient(145deg, var(--tile-a), var(--tile-b));
  border-color: rgba(255, 255, 255, 0.28);
  box-shadow:
    0 6px 16px var(--tile-glow),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}
.merge-cell.mythic {
  box-shadow:
    0 0 0 2px rgba(255, 209, 102, 0.45) inset,
    0 0 24px rgba(255, 209, 102, 0.5);
}
.cell-emoji {
  font-size: clamp(24px, 8vw, 42px);
  line-height: 1;
  flex-shrink: 0;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.5));
}
.cell-value {
  margin-top: 2px;
  padding: 1px 5px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.36);
  color: #fff;
  font-size: 10px;
  font-weight: 900;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}
.cell-name {
  margin-top: 1px;
  color: rgba(255, 255, 255, 0.86);
  font-size: 9px;
  font-weight: 800;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
}
.merge-flash {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  padding: 10px 16px;
  background: rgba(6, 214, 160, 0.94);
  color: #062217;
  font-weight: 900;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.42);
  pointer-events: none;
  z-index: 4;
}
.merge-flash.warn {
  background: rgba(255, 209, 102, 0.95);
  color: #2a1b00;
}
.merge-flash.mythic {
  background: linear-gradient(135deg, #ffd166, #c77dff);
  color: #1a0b2e;
}
.merge-flash-enter-active,
.merge-flash-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.merge-flash-enter-from,
.merge-flash-leave-to {
  opacity: 0;
  transform: translate(-50%, -42%) scale(0.92);
}
.game-over-pill {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 999px;
  padding: 8px 14px;
  background: rgba(239, 71, 111, 0.92);
  color: #fff;
  font-weight: 900;
}
.merge-controls {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.ctrl {
  min-height: 46px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border);
  color: var(--text);
  font-weight: 900;
  transition: background 0.15s, transform 0.1s;
}
.ctrl:active:not(:disabled) {
  transform: scale(0.94);
  background: rgba(255, 255, 255, 0.12);
}
.ctrl.reset {
  background: linear-gradient(135deg, #ffd166, #f4a261);
  color: #1b1300;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: none;
  box-shadow: 0 4px 12px rgba(255, 209, 102, 0.3);
}
.ctrl.reset:active:not(:disabled) {
  transform: scale(0.94);
}
.ctrl.spacer {
  opacity: 0;
  pointer-events: none;
}
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.section-head h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 900;
}
.ms-counter {
  background: rgba(255, 209, 102, 0.15);
  border: 1px solid rgba(255, 209, 102, 0.35);
  color: var(--accent);
  font-weight: 900;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
}
.milestone-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.milestone-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid var(--border);
  transition: border-color 0.2s, background 0.2s;
}
.milestone-row.ready {
  border-color: rgba(255, 209, 102, 0.6);
  background:
    radial-gradient(circle at 0% 50%, rgba(255, 209, 102, 0.14), transparent 65%),
    rgba(255, 209, 102, 0.05);
}
.milestone-row.done {
  opacity: 0.45;
}
.milestone-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ms-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 900;
}
.ms-icon.done {
  background: rgba(6, 214, 160, 0.18);
  border: 1px solid rgba(6, 214, 160, 0.4);
  color: var(--accent-2);
}
.ms-icon.ready {
  background: rgba(255, 209, 102, 0.22);
  border: 1px solid rgba(255, 209, 102, 0.55);
  color: var(--accent);
  animation: msPulse 1.8s ease-in-out infinite;
}
.ms-icon.locked {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border);
  color: var(--muted);
  font-size: 11px;
}
@keyframes msPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 209, 102, 0.4); }
  50% { box-shadow: 0 0 0 5px rgba(255, 209, 102, 0); }
}
.milestone-body {
  flex: 1;
  min-width: 0;
}
.milestone-title {
  font-size: 13px;
  font-weight: 900;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.milestone-goal {
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  margin-top: 1px;
}
.milestone-reward {
  color: var(--accent);
  font-size: 11px;
  font-weight: 800;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ms-claim-btn {
  flex-shrink: 0;
}
.ms-claimed {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(6, 214, 160, 0.14);
  border: 1px solid rgba(6, 214, 160, 0.35);
  color: var(--accent-2);
  font-size: 13px;
  font-weight: 900;
}
.mapping-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}
.mapping-chip {
  flex: 0 0 auto;
  min-width: 54px;
  border-radius: 12px;
  padding: 8px 7px;
  background: #0f1730;
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.mapping-chip.mythic {
  border-color: rgba(255, 209, 102, 0.55);
  background: linear-gradient(135deg, rgba(255, 209, 102, 0.16), rgba(199, 125, 255, 0.14));
}
.mapping-chip span {
  font-size: 26px;
  line-height: 1;
}
.mapping-chip b {
  font-size: 10px;
  color: var(--muted);
}
.milestone-chest-modal {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(6px);
}
.milestone-chest-stage {
  position: relative;
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.milestone-chest-box {
  position: relative;
  z-index: 2;
  font-size: 100px;
  line-height: 1;
  filter: drop-shadow(0 0 28px rgba(255, 209, 102, 0.5));
}
.milestone-chest-box.shake {
  animation: milestoneChestShake 0.72s ease-in-out infinite;
}
.milestone-chest-box.opening {
  animation: milestoneChestOpen 0.42s ease-out forwards;
}
.milestone-chest-glow {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 209, 102, 0.5), transparent 70%);
  animation: milestoneChestGlow 0.9s ease-in-out infinite alternate;
  pointer-events: none;
}
.milestone-chest-reveal {
  width: min(360px, 100%);
  border-radius: 18px;
  padding: 22px;
  background:
    linear-gradient(135deg, rgba(255, 209, 102, 0.14), rgba(6, 214, 160, 0.1)),
    #111a30;
  border: 1px solid rgba(255, 209, 102, 0.4);
  text-align: center;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.6);
  animation: milestoneRevealIn 0.25s ease-out;
}
.milestone-chest-reveal h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 900;
}
.milestone-chest-reveal p {
  margin: 6px 0 14px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}
.milestone-chest-items {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 8px;
  margin-bottom: 4px;
}
.milestone-chest-item {
  min-width: 0;
  border-radius: 14px;
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: milestoneRevealIn 0.3s ease-out both;
}
.milestone-chest-item span {
  display: block;
  font-size: 36px;
  line-height: 1;
}
.milestone-chest-item b {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.reward-text-item span {
  display: none;
}
.reward-text-item b {
  font-size: 15px;
  font-weight: 900;
  color: var(--accent);
  white-space: normal;
}
.confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
  backdrop-filter: blur(4px);
}
.confirm-dialog {
  max-width: 340px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  text-align: center;
  animation: confirmIn 0.2s ease;
}
.confirm-emoji {
  font-size: 48px;
  line-height: 1;
  margin-bottom: 10px;
}
.confirm-sub {
  color: var(--muted);
  font-size: 13px;
  margin: 0 0 18px;
}
.confirm-actions {
  display: flex;
  gap: 8px;
  width: 100%;
}
.confirm-cancel {
  flex: 1;
  background: rgba(255, 255, 255, 0.08) !important;
  color: var(--muted) !important;
  border: 1px solid var(--border) !important;
}
.confirm-yes {
  flex: 1;
  background: linear-gradient(135deg, #ef476f, #d62850) !important;
  color: #fff !important;
  border: none !important;
}
@keyframes confirmIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
@keyframes milestoneChestShake {
  0%, 100% { transform: translate(0,0) rotate(0); }
  15% { transform: translate(-4px,-2px) rotate(-4deg); }
  30% { transform: translate(5px,2px) rotate(5deg); }
  45% { transform: translate(-3px,1px) rotate(-3deg); }
  60% { transform: translate(4px,-2px) rotate(4deg); }
  75% { transform: translate(-2px,2px) rotate(-2deg); }
}
@keyframes milestoneChestOpen {
  0% { transform: scale(1); }
  40% { transform: scale(1.35); filter: drop-shadow(0 0 40px rgba(255, 209, 102, 1)); }
  100% { transform: scale(0.1); opacity: 0; }
}
@keyframes milestoneChestGlow {
  from { opacity: 0.45; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1.12); }
}
@keyframes milestoneRevealIn {
  from { transform: translateY(14px) scale(0.94); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}
@media (max-width: 420px) {
  .merge-stats {
    grid-template-columns: 1fr;
  }
  .global-top {
    align-items: flex-start;
    flex-direction: column;
  }
  .global-bonus {
    text-align: left;
  }
  .merge-board {
    gap: 6px;
    padding: 8px;
  }
  .merge-cell {
    border-radius: 10px;
  }
  .cell-name {
    display: none;
  }
}
</style>
