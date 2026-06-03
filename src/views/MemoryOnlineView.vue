<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'
import { locale } from '../i18n'
import { useAuthStore } from '../stores/auth'
import { useAppToast } from '../composables/useAppToast'
import {
  canStartGame, sortedPlayers, boardColumns, isMyTurn, turnSecondsLeft,
  pickFnError,
} from '../memoryOnline.js'

const router = useRouter()
const appToast = useAppToast()
const auth = useAuthStore()

const I18N = {
  de: {
    title: '🧠 Memory Online', back: 'Zurück', loading: 'Lade Räume...',
    refresh: 'Aktualisieren', create: 'Raum erstellen', noRooms: 'Keine offenen Räume. Erstelle einen!',
    join: 'Beitreten', players: 'Spieler', locked: 'Passwort',
    createTitle: 'Neuen Raum erstellen', roomName: 'Raumname', boardSize: 'Brettgröße',
    turnSeconds: 'Sekunden pro Zug', defaultPlayer: 'Spieler', defaultRoom: '{name}s Raum',
    maxPlayers: 'Max. Spieler', optionalPw: 'Passwort (optional)',
    cancel: 'Abbrechen', createBtn: 'Erstellen', pwTitle: 'Passwort eingeben',
    pwPlaceholder: 'Raum-Passwort', errName: 'Bitte einen Raumnamen eingeben',
    waiting: 'Warteraum', start: 'Spiel starten', waitHost: 'Warte auf Host...',
    leave: 'Verlassen', host: 'Host', you: 'Du', needMore: 'Mindestens 2 Spieler nötig',
    yourTurn: 'Du bist dran!', turnOf: '{n} ist dran', timeLeft: '{s}s',
    scores: 'Punkte', finished: 'Spiel beendet', winner: '🏆 Sieger: {n}',
    draw: 'Unentschieden', backToLobby: 'Zur Lobby',
    connectionProblem: 'Verbindungsproblem - bitte Seite neu laden', reload: 'Neu laden',
    error: 'Fehler',
  },
  en: {
    title: '🧠 Memory Online', back: 'Back', loading: 'Loading rooms...',
    refresh: 'Refresh', create: 'Create room', noRooms: 'No open rooms. Create one!',
    join: 'Join', players: 'Players', locked: 'Password',
    createTitle: 'Create a new room', roomName: 'Room name', boardSize: 'Board size',
    turnSeconds: 'Seconds per turn', defaultPlayer: 'Player', defaultRoom: "{name}'s Room",
    maxPlayers: 'Max players', optionalPw: 'Password (optional)',
    cancel: 'Cancel', createBtn: 'Create', pwTitle: 'Enter password',
    pwPlaceholder: 'Room password', errName: 'Please enter a room name',
    waiting: 'Waiting room', start: 'Start game', waitHost: 'Waiting for host...',
    leave: 'Leave', host: 'Host', you: 'You', needMore: 'At least 2 players needed',
    yourTurn: 'Your turn!', turnOf: "{n}'s turn", timeLeft: '{s}s',
    scores: 'Scores', finished: 'Game over', winner: '🏆 Winner: {n}',
    draw: 'Draw', backToLobby: 'Back to lobby',
    connectionProblem: 'Connection problem - please reload the page', reload: 'Reload',
    error: 'Error',
  },
  ru: {
    title: '🧠 Memory Онлайн', back: 'Назад', loading: 'Загрузка комнат...',
    refresh: 'Обновить', create: 'Создать комнату', noRooms: 'Нет открытых комнат. Создай!',
    join: 'Войти', players: 'Игроки', locked: 'Пароль',
    createTitle: 'Создать комнату', roomName: 'Название', boardSize: 'Размер поля',
    turnSeconds: 'Секунд на ход', defaultPlayer: 'Игрок', defaultRoom: 'Комната {name}',
    maxPlayers: 'Макс. игроков', optionalPw: 'Пароль (необязательно)',
    cancel: 'Отмена', createBtn: 'Создать', pwTitle: 'Введите пароль',
    pwPlaceholder: 'Пароль комнаты', errName: 'Введите название комнаты',
    waiting: 'Комната ожидания', start: 'Начать игру', waitHost: 'Ждём хоста...',
    leave: 'Выйти', host: 'Хост', you: 'Ты', needMore: 'Нужно минимум 2 игрока',
    yourTurn: 'Твой ход!', turnOf: 'Ход: {n}', timeLeft: '{s}с',
    scores: 'Очки', finished: 'Игра окончена', winner: '🏆 Победитель: {n}',
    draw: 'Ничья', backToLobby: 'В лобби',
    connectionProblem: 'Проблема соединения - перезагрузите страницу', reload: 'Перезагрузить',
    error: 'Ошибка',
  },
}
function tx(key, vars = {}) {
  const dict = I18N[locale.value] || I18N.en
  const raw = dict[key] != null ? dict[key] : (I18N.en[key] || key)
  return String(raw).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

const loading = ref(true)
const rooms = ref([])
const showCreate = ref(false)
const showPw = ref(false)
const pwRoom = ref(null)
const pwInput = ref('')
const busy = ref(false)
const form = ref({ name: '', board_pairs: 12, turn_seconds: 20, max_players: 4, password: '' })
const maxOptions = [2, 3, 4]
const connectionProblem = ref(false)
const consecutivePollFailures = ref(0)
const showTurnBanner = ref(false)
const turnBannerText = ref('')
const turnBannerMine = ref(false)
const turnBannerSeq = ref(0)
let turnBannerTimer = null
let previousTurnId = null

function clampInt(value, min, max, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(n)))
}

function clampCreateForm() {
  form.value.board_pairs = clampInt(form.value.board_pairs, 2, 99, 12)
  form.value.turn_seconds = clampInt(form.value.turn_seconds, 5, 120, 20)
  form.value.max_players = clampInt(form.value.max_players, 2, 4, 4)
}

function defaultRoomName() {
  const fallback = tx('defaultPlayer')
  const name = String(auth.profile?.username || '').trim() || fallback
  return tx('defaultRoom', { name })
}

function openCreateDialog() {
  if (!form.value.name.trim()) form.value.name = defaultRoomName()
  showCreate.value = true
}

watch(showCreate, (open) => {
  if (open && !form.value.name.trim()) form.value.name = defaultRoomName()
})

async function callOnline(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('memory-online', {
    body: { action, ...payload },
  })
  if (error) {
    let body = null
    if (error.context && typeof error.context.json === 'function') {
      try { body = await error.context.json() } catch { /* keep null */ }
    }
    throw new Error(pickFnError({ data, error, body }))
  }
  if (data?.error) throw new Error(data.error)
  return data
}

function markOnlineSuccess() {
  consecutivePollFailures.value = 0
  if (navigator.onLine !== false) connectionProblem.value = false
}

function markOnlineFailure(trackConnectivity) {
  if (!trackConnectivity) return
  consecutivePollFailures.value += 1
  if (consecutivePollFailures.value >= 2) connectionProblem.value = true
}

function reloadPage() {
  window.location.reload()
}

async function loadRooms(options = {}) {
  const trackConnectivity = options.trackConnectivity === true
  loading.value = true
  try {
    const res = await callOnline('list_rooms')
    rooms.value = Array.isArray(res?.rooms) ? res.rooms : []
    markOnlineSuccess()
  } catch (e) {
    markOnlineFailure(trackConnectivity)
    appToast.err(e?.message || tx('error'))
  } finally {
    loading.value = false
  }
}

async function submitCreate() {
  clampCreateForm()
  if (!form.value.name.trim()) { appToast.err(tx('errName')); return }
  busy.value = true
  try {
    const res = await callOnline('create_room', {
      name: form.value.name.trim(),
      board_pairs: form.value.board_pairs,
      turn_seconds: form.value.turn_seconds,
      max_players: form.value.max_players,
      password: form.value.password || null,
    })
    showCreate.value = false
    enterRoom(res)
  } catch (e) {
    appToast.err(e?.message || tx('error'))
  } finally {
    busy.value = false
  }
}

function clickJoin(room) {
  if (room.has_password) { pwRoom.value = room; pwInput.value = ''; showPw.value = true; return }
  doJoin(room, null)
}

async function doJoin(room, password) {
  busy.value = true
  try {
    const res = await callOnline('join_room', { room_id: room.id, password })
    showPw.value = false
    enterRoom(res)
  } catch (e) {
    appToast.err(e?.message || tx('error'))
  } finally {
    busy.value = false
  }
}

const roomState = ref(null)
let channel = null

const ROOM_KEY = 'mem_online_room_v1'
function rememberRoom(id) {
  try { id ? localStorage.setItem(ROOM_KEY, id) : localStorage.removeItem(ROOM_KEY) } catch { /* ignore */ }
}

function roomId() { return roomState.value?.room_id }

async function refreshRoom(options = {}) {
  if (!roomId()) return
  const trackConnectivity = options.trackConnectivity === true
  try {
    roomState.value = await callOnline('room_state', { room_id: roomId() })
    markOnlineSuccess()
  } catch (e) {
    markOnlineFailure(trackConnectivity)
    appToast.err(e?.message || tx('error'))
  }
}

function subscribe(id) {
  if (channel) supabase.removeChannel(channel)
  channel = supabase
    .channel('mem_room_' + id)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'mem_online_rooms', filter: 'id=eq.' + id },
      () => refreshRoom())
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'mem_online_players', filter: 'room_id=eq.' + id },
      () => refreshRoom())
    .subscribe()
}

function enterRoom(state) {
  roomState.value = state
  if (roomId()) {
    rememberRoom(roomId())
    subscribe(roomId())
  }
}

async function restoreRoom() {
  let id = null
  try { id = localStorage.getItem(ROOM_KEY) } catch { id = null }
  if (!id) return
  try {
    enterRoom(await callOnline('room_state', { room_id: id }))
  } catch {
    rememberRoom(null)
  }
}

const canStart = () => canStartGame(roomState.value)
const playersList = () => sortedPlayers(roomState.value)

async function startGame() {
  busy.value = true
  try {
    roomState.value = await callOnline('start_game', { room_id: roomId() })
  } catch (e) {
    appToast.err(e?.message || tx('error'))
  } finally {
    busy.value = false
  }
}

async function leaveRoom() {
  const id = roomId()
  if (channel) { supabase.removeChannel(channel); channel = null }
  roomState.value = null
  rememberRoom(null)
  try { if (id) await callOnline('leave_room', { room_id: id }) } catch { /* ignore */ }
  loadRooms()
}

const nowMs = ref(Date.now())
let clock = null

const cardCount = computed(() => Number(roomState.value?.card_count || 0))
const columns = computed(() => boardColumns(cardCount.value))
const cardMap = computed(() => {
  const m = {}
  for (const c of (roomState.value?.visible_cards || [])) m[c.index] = c
  return m
})
const myTurn = computed(() => isMyTurn(roomState.value))
const secondsLeft = computed(() => turnSecondsLeft(roomState.value, nowMs.value))
const turnName = computed(() => {
  const p = (roomState.value?.players || []).find(
    (x) => x.user_id === roomState.value?.turn_player_id)
  return p ? p.display_name : ''
})
const winnerName = computed(() => {
  const p = (roomState.value?.players || []).find(
    (x) => x.user_id === roomState.value?.winner_id)
  return p ? p.display_name : ''
})

function playerName(userId) {
  const p = (roomState.value?.players || []).find((x) => x.user_id === userId)
  return p ? p.display_name : ''
}

function hideTurnBanner() {
  if (turnBannerTimer) clearTimeout(turnBannerTimer)
  turnBannerTimer = null
  showTurnBanner.value = false
}

function triggerTurnBanner(turnId) {
  if (turnBannerTimer) clearTimeout(turnBannerTimer)
  turnBannerMine.value = turnId === roomState.value?.me
  turnBannerText.value = turnBannerMine.value
    ? tx('yourTurn')
    : tx('turnOf', { n: playerName(turnId) })
  turnBannerSeq.value += 1
  showTurnBanner.value = true
  turnBannerTimer = setTimeout(() => {
    showTurnBanner.value = false
    turnBannerTimer = null
  }, 2000)
}

watch(
  () => ({ turnId: roomState.value?.turn_player_id || null, status: roomState.value?.status || null }),
  ({ turnId, status }, oldValue) => {
    if (status !== 'playing' || !turnId) {
      previousTurnId = null
      hideTurnBanner()
      return
    }
    const enteredPlaying = !oldValue || oldValue.status !== 'playing'
    if (enteredPlaying || turnId !== previousTurnId) {
      previousTurnId = turnId
      triggerTurnBanner(turnId)
    }
  },
  { flush: 'post' },
)

async function flipCard(index) {
  if (busy.value || !myTurn.value) return
  if (cardMap.value[index]) return
  busy.value = true
  try {
    const res = await callOnline('flip', {
      room_id: roomId(), index, version: roomState.value.version,
    })
    roomState.value = res.state
  } catch (e) {
    appToast.err(e?.message || tx('error'))
    refreshRoom()
  } finally {
    busy.value = false
  }
}

async function maybeSkip() {
  if (!roomState.value || roomState.value.status !== 'playing') return
  if (secondsLeft.value > 0) return
  if (myTurn.value) return
  try {
    await callOnline('skip_turn', {
      room_id: roomId(), version: roomState.value.version,
    })
  } catch { /* another client already skipped; realtime will refresh */ }
}

let poll = null
function handleOffline() {
  connectionProblem.value = true
}

function handleOnline() {
  if (roomState.value) refreshRoom({ trackConnectivity: true })
  else loadRooms({ trackConnectivity: true })
}

onMounted(async () => {
  window.addEventListener('offline', handleOffline)
  window.addEventListener('online', handleOnline)
  if (navigator.onLine === false) connectionProblem.value = true
  await loadRooms()
  await restoreRoom()
  // Selbst-Aktualisierung alle 10s: im Raum als Realtime-Fallback,
  // sonst die Lobby-Liste. Kein manuelles Aktualisieren nötig.
  poll = setInterval(() => {
    if (roomState.value) refreshRoom({ trackConnectivity: true })
    else loadRooms({ trackConnectivity: true })
  }, 10000)
  clock = setInterval(() => {
    nowMs.value = Date.now()
    maybeSkip()
  }, 1000)
})
onUnmounted(() => {
  if (poll) clearInterval(poll)
  if (clock) clearInterval(clock)
  hideTurnBanner()
  window.removeEventListener('offline', handleOffline)
  window.removeEventListener('online', handleOnline)
  if (channel) supabase.removeChannel(channel)
})
</script>

<template>
  <div class="mo-view">
    <div v-if="connectionProblem" class="mo-connection-banner">
      <span>{{ tx('connectionProblem') }}</span>
      <Button class="btn small" @click="reloadPage">{{ tx('reload') }}</Button>
    </div>

    <header class="mo-header">
      <Button class="btn small btn-ghost" @click="router.push('/memory')">
        <i class="pi pi-arrow-left"></i><span>{{ tx('back') }}</span>
      </Button>
      <h1 class="mo-title">{{ tx('title') }}</h1>
      <Button class="btn small btn-ghost" :disabled="loading" @click="loadRooms">
        <i class="pi pi-refresh"></i>
      </Button>
    </header>

    <div v-if="!roomState">
      <Button class="btn mo-create-btn" @click="openCreateDialog">
        <i class="pi pi-plus"></i><span>{{ tx('create') }}</span>
      </Button>

      <div v-if="loading" class="card mo-state">
        <i class="pi pi-spin pi-spinner"></i><span>{{ tx('loading') }}</span>
      </div>
      <div v-else-if="!rooms.length" class="card mo-state">{{ tx('noRooms') }}</div>
      <ul v-else class="mo-room-list">
        <li v-for="r in rooms" :key="r.id" class="mo-room card">
          <div class="mo-room-main">
            <strong>{{ r.name }}</strong>
            <span class="mo-room-meta">
              👥 {{ r.player_count }}/{{ r.max_players }} · 🧠 {{ r.board_pairs }}
              <span v-if="r.has_password">· 🔒 {{ tx('locked') }}</span>
            </span>
          </div>
          <Button class="btn small" :disabled="busy" @click="clickJoin(r)">{{ tx('join') }}</Button>
        </li>
      </ul>
    </div>

    <div v-else-if="roomState.status === 'lobby'" class="mo-room-wrap card">
      <div class="mo-room-head">
        <h2>{{ roomState.name }}</h2>
        <Button class="btn small confirm-cancel" @click="leaveRoom">{{ tx('leave') }}</Button>
      </div>
      <ul class="mo-seat-list">
        <li v-for="p in playersList()" :key="p.user_id" class="mo-seat">
          <span>{{ p.display_name }}</span>
          <span class="mo-seat-tags">
            <b v-if="p.is_host">{{ tx('host') }}</b>
            <b v-if="p.user_id === roomState.me">{{ tx('you') }}</b>
          </span>
        </li>
      </ul>
      <Button v-if="canStart()" class="btn mo-start-btn" :disabled="busy" @click="startGame">
        {{ tx('start') }}
      </Button>
      <div v-else class="mo-wait-hint">
        {{ roomState.host_id === roomState.me ? tx('needMore') : tx('waitHost') }}
      </div>
    </div>

    <div v-else-if="roomState && roomState.status === 'playing'" class="mo-game card">
      <div class="mo-game-head">
        <div class="mo-turn" :class="{ mine: myTurn }">
          {{ myTurn ? tx('yourTurn') : tx('turnOf', { n: turnName }) }}
          <span class="mo-timer">{{ tx('timeLeft', { s: secondsLeft }) }}</span>
        </div>
        <Button class="btn small confirm-cancel" @click="leaveRoom">{{ tx('leave') }}</Button>
      </div>
      <div class="mo-scores">
        <span v-for="p in playersList()" :key="p.user_id"
              :class="{ active: p.user_id === roomState.turn_player_id, left: p.left_game }">
          {{ p.display_name }}: <b>{{ p.score }}</b>
        </span>
      </div>
      <div class="memory-board" :class="{ 'my-turn': myTurn }"
           :style="{ gridTemplateColumns: 'repeat(' + columns + ', minmax(0, 1fr))' }">
        <button v-for="i in cardCount" :key="i - 1" class="memory-card"
                :class="{ flipped: !!cardMap[i - 1], matched: cardMap[i - 1]?.matched }"
                :disabled="busy || !myTurn || !!cardMap[i - 1]"
                @click="flipCard(i - 1)">
          <span class="card-inner">
            <span class="card-face card-back">❓</span>
            <span class="card-face card-front">{{ cardMap[i - 1]?.emoji || '' }}</span>
          </span>
        </button>
      </div>
    </div>

    <div v-else-if="roomState && roomState.status === 'finished'" class="mo-game card">
      <h2 class="mo-finish-title">{{ tx('finished') }}</h2>
      <p class="mo-finish-winner">
        {{ winnerName ? tx('winner', { n: winnerName }) : tx('draw') }}
      </p>
      <div class="mo-scores">
        <span v-for="p in playersList()" :key="p.user_id">
          {{ p.display_name }}: <b>{{ p.score }}</b>
        </span>
      </div>
      <Button class="btn mo-start-btn" @click="leaveRoom">{{ tx('backToLobby') }}</Button>
    </div>

    <Teleport to="body">
      <div v-if="showTurnBanner" class="mo-turn-banner" :class="{ mine: turnBannerMine }">
        <span :key="turnBannerSeq" class="mo-turn-banner-text">{{ turnBannerText }}</span>
      </div>

      <div v-if="showCreate" class="mo-backdrop" @click.self="showCreate = false">
        <div class="mo-dialog card">
          <h3>{{ tx('createTitle') }}</h3>
          <label class="mo-label">{{ tx('roomName') }}</label>
          <InputText v-model="form.name" maxlength="40" class="mo-input" />
          <label class="mo-label">{{ tx('boardSize') }}</label>
          <InputText
            v-model.number="form.board_pairs" type="number" inputmode="numeric"
            min="2" max="99" step="1" class="mo-input" @blur="clampCreateForm"
          />
          <label class="mo-label">{{ tx('turnSeconds') }}</label>
          <InputText
            v-model.number="form.turn_seconds" type="number" inputmode="numeric"
            min="5" max="120" step="1" class="mo-input" @blur="clampCreateForm"
          />
          <label class="mo-label">{{ tx('maxPlayers') }}</label>
          <Select v-model="form.max_players" :options="maxOptions" class="mo-input" />
          <label class="mo-label">{{ tx('optionalPw') }}</label>
          <InputText v-model="form.password" type="password" class="mo-input" />
          <div class="mo-actions">
            <Button class="btn confirm-cancel" @click="showCreate = false">{{ tx('cancel') }}</Button>
            <Button class="btn" :disabled="busy" @click="submitCreate">{{ tx('createBtn') }}</Button>
          </div>
        </div>
      </div>

      <div v-if="showPw" class="mo-backdrop" @click.self="showPw = false">
        <div class="mo-dialog card">
          <h3>{{ tx('pwTitle') }}</h3>
          <InputText
            v-model="pwInput" type="password" class="mo-input"
            :placeholder="tx('pwPlaceholder')" @keyup.enter="doJoin(pwRoom, pwInput)"
          />
          <div class="mo-actions">
            <Button class="btn confirm-cancel" @click="showPw = false">{{ tx('cancel') }}</Button>
            <Button class="btn" :disabled="busy" @click="doJoin(pwRoom, pwInput)">{{ tx('join') }}</Button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.mo-view { display:flex; flex-direction:column; gap:12px; padding-bottom:18px; }
.mo-connection-banner { position:fixed; top:0; left:0; right:0; z-index:900;
  display:flex; align-items:center; justify-content:center; gap:12px; padding:10px 14px;
  background:rgba(120,28,28,0.96); color:white; font-weight:900;
  box-shadow:0 8px 24px rgba(0,0,0,0.35); }
.mo-connection-banner .btn { min-height:32px; padding:6px 10px; background:rgba(255,255,255,0.16); }
.mo-header { display:flex; align-items:center; gap:10px; }
.btn-ghost { background:rgba(255,255,255,0.06); color:var(--muted);
  display:inline-flex; align-items:center; gap:5px; flex-shrink:0; }
.mo-title { margin:0; flex:1; font-size:22px; font-weight:900; }
.mo-create-btn { width:100%; font-weight:900; margin-bottom:12px;
  display:inline-flex; align-items:center; justify-content:center; gap:6px; }
.mo-state { display:flex; align-items:center; justify-content:center; gap:10px;
  min-height:120px; color:var(--muted); font-weight:800; }
.mo-room-list { list-style:none; margin:0; padding:0; display:flex;
  flex-direction:column; gap:8px; }
.mo-room { display:flex; align-items:center; justify-content:space-between;
  gap:10px; padding:14px; }
.mo-room-main { display:flex; flex-direction:column; gap:3px; min-width:0; }
.mo-room-main strong { font-size:15px; font-weight:900; }
.mo-room-meta { color:var(--muted); font-size:12px; font-weight:700; }
/* z-index must stay below PrimeVue's Select overlay (default base 1000),
   otherwise the dropdown panel renders behind the backdrop and is unclickable. */
.mo-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.7); display:flex;
  align-items:center; justify-content:center; z-index:100; padding:16px;
  backdrop-filter:blur(4px); }
.mo-dialog { width:100%; max-width:360px; padding:22px; display:flex;
  flex-direction:column; gap:8px; }
.mo-dialog h3 { margin:0 0 6px; font-size:18px; font-weight:900; }
.mo-label { font-size:12px; font-weight:800; color:var(--muted); margin-top:6px; }
.mo-input { width:100%; }
.mo-actions { display:flex; gap:8px; margin-top:14px; }
.mo-actions .btn { flex:1; }
.confirm-cancel { background:rgba(255,255,255,0.08) !important;
  color:var(--muted) !important; border:1px solid var(--border) !important; }
.mo-room-wrap { display:flex; flex-direction:column; gap:12px; padding:18px; }
.mo-room-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.mo-room-head h2 { margin:0; font-size:18px; font-weight:900; }
.mo-seat-list { list-style:none; margin:0; padding:0; display:flex;
  flex-direction:column; gap:6px; }
.mo-seat { display:flex; align-items:center; justify-content:space-between;
  padding:10px 12px; border-radius:12px; background:rgba(255,255,255,0.05);
  border:1px solid var(--border); font-weight:800; }
.mo-seat-tags { display:flex; gap:6px; }
.mo-seat-tags b { font-size:11px; color:var(--accent); }
.mo-start-btn { width:100%; font-weight:900; }
.mo-wait-hint { text-align:center; color:var(--muted); font-weight:800;
  padding:10px; }
.mo-game { display:flex; flex-direction:column; gap:12px; padding:16px; }
.mo-game-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.mo-turn { font-weight:900; font-size:15px; color:var(--muted);
  display:flex; align-items:center; gap:8px; }
.mo-turn.mine { color:var(--accent); }
.mo-turn-banner { position:fixed; inset:0; z-index:850; pointer-events:none;
  display:flex; align-items:center; justify-content:center; padding:24px;
  color:#ff3b3b; font-size:clamp(34px,8vw,76px); font-weight:1000;
  text-align:center; }
.mo-turn-banner.mine { color:var(--accent); }
.mo-turn-banner-text { display:inline-block; will-change:transform,opacity;
  text-shadow:0 3px 18px rgba(0,0,0,0.65), 0 0 26px currentColor;
  animation:mo-turn-pop 2s cubic-bezier(0.22,1,0.36,1) both; }
@keyframes mo-turn-pop {
  0%   { opacity:0; transform:scale(0.55) translateY(14px); }
  14%  { opacity:1; transform:scale(1.16) translateY(0); }
  24%  { transform:scale(0.97); }
  32%  { transform:scale(1.04); }
  40%  { transform:scale(1); }
  78%  { opacity:1; transform:scale(1); }
  100% { opacity:0; transform:scale(1.14); }
}
@media (prefers-reduced-motion:reduce) {
  .mo-turn-banner-text { animation:mo-turn-fade 2s ease both; }
  @keyframes mo-turn-fade { 0%,80% { opacity:1; } 100% { opacity:0; } }
}
.mo-timer { font-variant-numeric:tabular-nums; font-size:13px;
  padding:2px 8px; border-radius:999px; background:rgba(255,255,255,0.08); }
.mo-scores { display:flex; flex-wrap:wrap; gap:10px; font-size:13px;
  font-weight:800; color:var(--muted); }
.mo-scores .active { color:var(--accent); }
.mo-scores .left { opacity:0.5; text-decoration:line-through; }
.memory-board { display:grid; gap:8px; padding:10px; border-radius:18px;
  background:linear-gradient(135deg,rgba(255,255,255,0.05),rgba(0,0,0,0.15)),#0d1528;
  border:1px solid var(--border); box-shadow:inset 0 0 28px rgba(0,0,0,0.35);
  transition:border-color 0.25s ease, box-shadow 0.25s ease; }
.memory-board.my-turn { border-color:#ffd400;
  box-shadow:inset 0 0 28px rgba(0,0,0,0.35),
    0 0 0 2px #ffd400, 0 0 22px rgba(255,212,0,0.85), 0 0 44px rgba(255,212,0,0.5);
  animation:mo-board-glow 1.4s ease-in-out infinite; }
@keyframes mo-board-glow {
  0%,100% { box-shadow:inset 0 0 28px rgba(0,0,0,0.35),
    0 0 0 2px #ffd400, 0 0 18px rgba(255,212,0,0.7), 0 0 36px rgba(255,212,0,0.4); }
  50%     { box-shadow:inset 0 0 28px rgba(0,0,0,0.35),
    0 0 0 3px #ffe34d, 0 0 30px rgba(255,212,0,1), 0 0 60px rgba(255,212,0,0.65); }
}
@media (prefers-reduced-motion:reduce) {
  .memory-board.my-turn { animation:none; }
}
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
.mo-finish-title { margin:0; font-size:20px; font-weight:900; text-align:center; }
.mo-finish-winner { margin:4px 0 8px; text-align:center; font-weight:800;
  color:var(--accent); }
</style>
