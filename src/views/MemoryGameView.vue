<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'
import { locale } from '../i18n'
import { useGameStore } from '../stores/game'
import { useAppToast } from '../composables/useAppToast'

const router = useRouter()
const game = useGameStore()
const appToast = useAppToast()

const I18N = {
  de: {
    title: '🧠 Memory', sub: 'Finde alle Tier-Paare, bevor die Züge ausgehen.',
    back: 'Zurück', level: 'Level', moves: 'Züge', best: 'Höchstes Level',
    reset: 'Brett neu', loading: 'Lade Memory...', retry: 'Erneut versuchen',
    eventEndsIn: 'Verschwindet in {time}', eventEnded: 'Ereignis beendet',
    eventEndedSub: 'Das Memory-Ereignis ist vorbei. Es können keine Züge mehr gemacht werden.',
    matched: 'Paar gefunden!', failed: 'Zuglimit erreicht - Brett neu',
    levelDone: 'Level geschafft!', chestTitle: 'Belohnung!', chestSub: 'Du erhältst:',
    continue: 'Weiter', resetTitle: 'Brett zurücksetzen?',
    resetSub: 'Der aktuelle Fortschritt in diesem Level geht verloren.',
    resetCancel: 'Abbrechen', resetYes: 'Ja, neu mischen',
    rewardChest: '🎁 Truhe ({qty})', rewardAnimal: '{qty}x {emoji} {name}'
  },
  en: {
    title: '🧠 Memory', sub: 'Find all animal pairs before you run out of moves.',
    back: 'Back', level: 'Level', moves: 'Moves', best: 'Highest level',
    reset: 'New board', loading: 'Loading Memory...', retry: 'Try again',
    eventEndsIn: 'Disappears in {time}', eventEnded: 'Event ended',
    eventEndedSub: 'The Memory event is over. No more moves can be made.',
    matched: 'Pair found!', failed: 'Move limit reached - new board',
    levelDone: 'Level cleared!', chestTitle: 'Reward!', chestSub: 'You receive:',
    continue: 'Continue', resetTitle: 'Reset board?',
    resetSub: 'Your current progress in this level will be lost.',
    resetCancel: 'Cancel', resetYes: 'Yes, reshuffle',
    rewardChest: '🎁 Chest ({qty})', rewardAnimal: '{qty}x {emoji} {name}'
  },
  ru: {
    title: '🧠 Memory', sub: 'Найди все пары животных, пока не кончились ходы.',
    back: 'Назад', level: 'Уровень', moves: 'Ходы', best: 'Лучший уровень',
    reset: 'Новое поле', loading: 'Загрузка Memory...', retry: 'Повторить',
    eventEndsIn: 'Исчезнет через {time}', eventEnded: 'Событие завершено',
    eventEndedSub: 'Событие Memory завершено. Ходы больше недоступны.',
    matched: 'Пара найдена!', failed: 'Лимит ходов - новое поле',
    levelDone: 'Уровень пройден!', chestTitle: 'Награда!', chestSub: 'Вы получаете:',
    continue: 'Дальше', resetTitle: 'Сбросить поле?',
    resetSub: 'Текущий прогресс на этом уровне будет потерян.',
    resetCancel: 'Отмена', resetYes: 'Да, заново',
    rewardChest: '🎁 Сундук ({qty})', rewardAnimal: '{qty}x {emoji} {name}'
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

function showFlash(text, kind = 'ok') {
  const id = Date.now()
  flash.value = { text, kind, id }
  setTimeout(() => { if (flash.value?.id === id) flash.value = null }, 1600)
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
    error.value = e?.message || 'Fehler'
  } finally {
    loading.value = false
  }
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
    appToast.err(e?.message || 'Fehler')
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
    chestReveal.value = { phase: 'shake', items: opened }
    await wait(650)
    chestReveal.value = { ...chestReveal.value, phase: 'open' }
    await wait(420)
    chestReveal.value = { ...chestReveal.value, phase: 'reveal' }
  } catch (e) {
    appToast.err(e?.message || 'Fehler')
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
    appToast.err(e?.message || 'Fehler')
  } finally {
    busy.value = false
  }
}

function rewardLabel(o) {
  const species = Array.isArray(o.species) ? o.species : []
  if (o.kind === 'animal' && species.length) {
    return tx('rewardAnimal', { qty: o.qty, emoji: '🐾', name: species[0] })
  }
  return tx('rewardChest', { qty: o.qty })
}

onMounted(() => {
  clockTimer = setInterval(() => { now.value = Date.now() }, 1000)
  if (!Object.keys(game.eventSchedule || {}).length) {
    game.loadEventSchedule?.().catch(() => {})
  }
  loadGame()
})
onUnmounted(() => { if (clockTimer) clearInterval(clockTimer) })
</script>

<template>
  <div class="memory-view">
    <header class="memory-header">
      <Button class="btn small btn-ghost" @click="router.push('/')">
        <i class="pi pi-arrow-left"></i><span>{{ tx('back') }}</span>
      </Button>
      <div class="memory-title-block">
        <h1 class="memory-title">{{ tx('title') }}</h1>
        <p class="memory-sub">{{ tx('sub') }}</p>
      </div>
    </header>

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
          <strong>{{ data.level }}</strong><span>{{ tx('level') }}</span>
        </div>
        <div class="memory-stat">
          <strong>{{ data.moves_used }} / {{ data.move_limit }}</strong>
          <span>{{ tx('moves') }}</span>
        </div>
        <div class="memory-stat">
          <strong>{{ data.highest_level }}</strong><span>{{ tx('best') }}</span>
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

      <section class="memory-board-wrap">
        <div
          class="memory-board"
          :class="{ busy }"
          :style="{ gridTemplateColumns: 'repeat(' + columns + ', minmax(0, 1fr))' }"
        >
          <button
            v-for="i in cardCount"
            :key="i - 1"
            class="memory-card"
            :class="{
              flipped: !!cardMap[i - 1],
              matched: cardMap[i - 1]?.matched
            }"
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
      </section>

      <section class="memory-controls">
        <Button class="ctrl reset" :disabled="busy || !eventActive" @click="requestReset">
          <i class="pi pi-refresh"></i><span>{{ tx('reset') }}</span>
        </Button>
      </section>

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
              v-for="(o, i) in chestReveal.items"
              :key="i"
              class="chest-item"
              :style="{ animationDelay: (i * 0.12) + 's' }"
            ><b>{{ rewardLabel(o) }}</b></div>
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
    </template>
  </div>
</template>

<style scoped>
.memory-view { display:flex; flex-direction:column; gap:12px; padding-bottom:18px; }
.memory-header { display:flex; align-items:center; gap:10px; }
.btn-ghost { background:rgba(255,255,255,0.06); color:var(--muted);
  display:inline-flex; align-items:center; gap:5px; flex-shrink:0; }
.memory-title { margin:0; font-size:22px; font-weight:900; }
.memory-sub { margin:2px 0 0; color:var(--muted); font-size:13px; }
.memory-state { display:flex; align-items:center; justify-content:center; gap:10px;
  min-height:140px; color:var(--muted); font-weight:800; }
.error-state { flex-direction:column; color:var(--danger); }
.memory-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
.memory-stat { background:linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01));
  border:1px solid var(--border); border-radius:14px; padding:12px 10px; text-align:center; }
.memory-stat strong { display:block; color:var(--accent); font-weight:900; font-size:17px; }
.memory-stat span { display:block; color:var(--muted); font-size:11px; font-weight:700;
  margin-top:4px; text-transform:uppercase; letter-spacing:0.03em; }
.event-banner { display:flex; align-items:center; gap:12px; padding:10px 14px;
  background:linear-gradient(135deg,#142244,#0d1730); border:1px solid rgba(72,202,228,0.45); }
.event-banner.ended { background:linear-gradient(135deg,#2a1226,#1a0a1a);
  border-color:rgba(239,71,111,0.55); }
.event-banner-icon { font-size:26px; }
.event-banner-title { font-weight:900; font-size:14px; color:#48cae4; }
.event-banner.ended .event-banner-title { color:#ef476f; }
.event-banner-sub { margin-top:2px; font-size:12px; color:var(--muted); font-weight:700; }
.memory-board-wrap { position:relative; }
.memory-board { display:grid; gap:8px; padding:10px; border-radius:18px;
  background:linear-gradient(135deg,rgba(255,255,255,0.05),rgba(0,0,0,0.15)),#0d1528;
  border:1px solid var(--border); box-shadow:inset 0 0 28px rgba(0,0,0,0.35); }
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
.card-back { background:linear-gradient(145deg,#48cae4,#115b73);
  border:1px solid rgba(255,255,255,0.2); }
.card-front { background:linear-gradient(145deg,#ffd166,#9b5b12);
  border:1px solid rgba(255,255,255,0.28); transform:rotateY(180deg); }
.memory-card.matched .card-front { background:linear-gradient(145deg,#06d6a0,#0b6b55);
  box-shadow:0 0 0 2px rgba(6,214,160,0.45) inset; }
.memory-flash { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  border-radius:999px; padding:10px 16px; background:rgba(6,214,160,0.94); color:#062217;
  font-weight:900; box-shadow:0 14px 34px rgba(0,0,0,0.42); pointer-events:none; z-index:4; }
.memory-flash.warn { background:rgba(255,209,102,0.95); color:#2a1b00; }
.memory-flash-enter-active,.memory-flash-leave-active { transition:opacity 0.18s ease, transform 0.18s ease; }
.memory-flash-enter-from,.memory-flash-leave-to { opacity:0; transform:translate(-50%,-42%) scale(0.92); }
.memory-controls { display:flex; }
.ctrl.reset { flex:1; min-height:46px; border-radius:14px;
  background:linear-gradient(135deg,#ffd166,#f4a261); color:#1b1300; border:none;
  font-weight:900; display:inline-flex; align-items:center; justify-content:center; gap:5px; }
.ctrl.reset:active:not(:disabled) { transform:scale(0.97); }
.chest-modal { position:fixed; inset:0; z-index:1100; display:flex; flex-direction:column;
  align-items:center; justify-content:center; gap:24px; padding:20px;
  background:rgba(0,0,0,0.78); backdrop-filter:blur(6px); }
.chest-stage { width:200px; height:200px; display:flex; align-items:center; justify-content:center; }
.chest-box { font-size:100px; filter:drop-shadow(0 0 28px rgba(255,209,102,0.5)); }
.chest-box.shake { animation:chestShake 0.72s ease-in-out infinite; }
.chest-box.opening { animation:chestOpen 0.42s ease-out forwards; }
.chest-reveal { width:min(360px,100%); border-radius:18px; padding:22px;
  background:linear-gradient(135deg,rgba(255,209,102,0.14),rgba(6,214,160,0.1)),#111a30;
  border:1px solid rgba(255,209,102,0.4); text-align:center; }
.chest-reveal h3 { margin:0; font-size:20px; font-weight:900; }
.chest-reveal p { margin:6px 0 14px; color:var(--muted); font-size:13px; font-weight:700; }
.chest-items { display:flex; flex-direction:column; gap:8px; margin-bottom:14px; }
.chest-item { border-radius:14px; padding:12px 8px; background:rgba(255,255,255,0.08);
  border:1px solid rgba(255,255,255,0.1); animation:revealIn 0.3s ease-out both; }
.chest-item b { font-size:15px; font-weight:900; color:var(--accent); }
.confirm-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.65); display:flex;
  align-items:center; justify-content:center; z-index:1000; padding:16px; backdrop-filter:blur(4px); }
.confirm-dialog { max-width:340px; width:100%; display:flex; flex-direction:column;
  align-items:center; padding:24px; text-align:center; }
.confirm-emoji { font-size:48px; margin-bottom:10px; }
.confirm-sub { color:var(--muted); font-size:13px; margin:0 0 18px; }
.confirm-actions { display:flex; gap:8px; width:100%; }
.confirm-cancel { flex:1; background:rgba(255,255,255,0.08) !important; color:var(--muted) !important;
  border:1px solid var(--border) !important; }
.confirm-yes { flex:1; background:linear-gradient(135deg,#ef476f,#d62850) !important;
  color:#fff !important; border:none !important; }
@keyframes chestShake { 0%,100%{transform:translate(0,0) rotate(0);}
  25%{transform:translate(-4px,-2px) rotate(-4deg);} 50%{transform:translate(5px,2px) rotate(5deg);}
  75%{transform:translate(-2px,2px) rotate(-2deg);} }
@keyframes chestOpen { 0%{transform:scale(1);}
  40%{transform:scale(1.35);} 100%{transform:scale(0.1); opacity:0;} }
@keyframes revealIn { from{transform:translateY(14px) scale(0.94); opacity:0;}
  to{transform:translateY(0) scale(1); opacity:1;} }
@media (max-width:420px) {
  .memory-stats { grid-template-columns:1fr; }
  .memory-board { gap:6px; padding:8px; }
}
</style>
