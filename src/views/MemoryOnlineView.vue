<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'
import { locale } from '../i18n'
import { useAppToast } from '../composables/useAppToast'
import {
  canStartGame, sortedPlayers, boardColumns, isMyTurn, turnSecondsLeft,
} from '../memoryOnline.js'

const router = useRouter()
const appToast = useAppToast()

const I18N = {
  de: {
    title: '🧠 Memory Online', back: 'Zurück', loading: 'Lade Räume...',
    refresh: 'Aktualisieren', create: 'Raum erstellen', noRooms: 'Keine offenen Räume. Erstelle einen!',
    join: 'Beitreten', players: 'Spieler', locked: 'Passwort',
    createTitle: 'Neuen Raum erstellen', roomName: 'Raumname', boardSize: 'Brettgröße',
    small: 'Klein (8 Paare)', medium: 'Mittel (12 Paare)', large: 'Groß (18 Paare)',
    maxPlayers: 'Max. Spieler', optionalPw: 'Passwort (optional)',
    cancel: 'Abbrechen', createBtn: 'Erstellen', pwTitle: 'Passwort eingeben',
    pwPlaceholder: 'Raum-Passwort', errName: 'Bitte einen Raumnamen eingeben',
    waiting: 'Warteraum', start: 'Spiel starten', waitHost: 'Warte auf Host...',
    leave: 'Verlassen', host: 'Host', you: 'Du', needMore: 'Mindestens 2 Spieler nötig',
    yourTurn: 'Du bist dran!', turnOf: '{n} ist dran', timeLeft: '{s}s',
    scores: 'Punkte', finished: 'Spiel beendet', winner: '🏆 Sieger: {n}',
    draw: 'Unentschieden', backToLobby: 'Zur Lobby',
  },
  en: {
    title: '🧠 Memory Online', back: 'Back', loading: 'Loading rooms...',
    refresh: 'Refresh', create: 'Create room', noRooms: 'No open rooms. Create one!',
    join: 'Join', players: 'Players', locked: 'Password',
    createTitle: 'Create a new room', roomName: 'Room name', boardSize: 'Board size',
    small: 'Small (8 pairs)', medium: 'Medium (12 pairs)', large: 'Large (18 pairs)',
    maxPlayers: 'Max players', optionalPw: 'Password (optional)',
    cancel: 'Cancel', createBtn: 'Create', pwTitle: 'Enter password',
    pwPlaceholder: 'Room password', errName: 'Please enter a room name',
    waiting: 'Waiting room', start: 'Start game', waitHost: 'Waiting for host...',
    leave: 'Leave', host: 'Host', you: 'You', needMore: 'At least 2 players needed',
    yourTurn: 'Your turn!', turnOf: "{n}'s turn", timeLeft: '{s}s',
    scores: 'Scores', finished: 'Game over', winner: '🏆 Winner: {n}',
    draw: 'Draw', backToLobby: 'Back to lobby',
  },
  ru: {
    title: '🧠 Memory Онлайн', back: 'Назад', loading: 'Загрузка комнат...',
    refresh: 'Обновить', create: 'Создать комнату', noRooms: 'Нет открытых комнат. Создай!',
    join: 'Войти', players: 'Игроки', locked: 'Пароль',
    createTitle: 'Создать комнату', roomName: 'Название', boardSize: 'Размер поля',
    small: 'Малое (8 пар)', medium: 'Среднее (12 пар)', large: 'Большое (18 пар)',
    maxPlayers: 'Макс. игроков', optionalPw: 'Пароль (необязательно)',
    cancel: 'Отмена', createBtn: 'Создать', pwTitle: 'Введите пароль',
    pwPlaceholder: 'Пароль комнаты', errName: 'Введите название комнаты',
    waiting: 'Комната ожидания', start: 'Начать игру', waitHost: 'Ждём хоста...',
    leave: 'Выйти', host: 'Хост', you: 'Ты', needMore: 'Нужно минимум 2 игрока',
    yourTurn: 'Твой ход!', turnOf: 'Ход: {n}', timeLeft: '{s}с',
    scores: 'Очки', finished: 'Игра окончена', winner: '🏆 Победитель: {n}',
    draw: 'Ничья', backToLobby: 'В лобби',
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
const form = ref({ name: '', board_pairs: 12, max_players: 4, password: '' })

const sizeOptions = [
  { label: () => tx('small'), value: 8 },
  { label: () => tx('medium'), value: 12 },
  { label: () => tx('large'), value: 18 },
]
const maxOptions = [2, 3, 4]

async function callOnline(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('memory-online', {
    body: { action, ...payload },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

async function loadRooms() {
  loading.value = true
  try {
    const res = await callOnline('list_rooms')
    rooms.value = Array.isArray(res?.rooms) ? res.rooms : []
  } catch (e) {
    appToast.err(e?.message || 'Fehler')
  } finally {
    loading.value = false
  }
}

async function submitCreate() {
  if (!form.value.name.trim()) { appToast.err(tx('errName')); return }
  busy.value = true
  try {
    const res = await callOnline('create_room', {
      name: form.value.name.trim(),
      board_pairs: form.value.board_pairs,
      max_players: form.value.max_players,
      password: form.value.password || null,
    })
    showCreate.value = false
    enterRoom(res)
  } catch (e) {
    appToast.err(e?.message || 'Fehler')
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
    appToast.err(e?.message || 'Fehler')
  } finally {
    busy.value = false
  }
}

const roomState = ref(null)
let channel = null

function roomId() { return roomState.value?.room_id }

async function refreshRoom() {
  if (!roomId()) return
  try {
    roomState.value = await callOnline('room_state', { room_id: roomId() })
  } catch (e) {
    appToast.err(e?.message || 'Fehler')
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
  if (roomId()) subscribe(roomId())
}

const canStart = () => canStartGame(roomState.value)
const playersList = () => sortedPlayers(roomState.value)

async function startGame() {
  busy.value = true
  try {
    roomState.value = await callOnline('start_game', { room_id: roomId() })
  } catch (e) {
    appToast.err(e?.message || 'Fehler')
  } finally {
    busy.value = false
  }
}

async function leaveRoom() {
  const id = roomId()
  if (channel) { supabase.removeChannel(channel); channel = null }
  roomState.value = null
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
    appToast.err(e?.message || 'Fehler')
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
onMounted(() => {
  loadRooms()
  poll = setInterval(() => { if (!roomState.value) loadRooms() }, 5000)
  clock = setInterval(() => {
    nowMs.value = Date.now()
    maybeSkip()
  }, 1000)
})
onUnmounted(() => {
  if (poll) clearInterval(poll)
  if (clock) clearInterval(clock)
  if (channel) supabase.removeChannel(channel)
})
</script>

<template>
  <div class="mo-view">
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
      <Button class="btn mo-create-btn" @click="showCreate = true">
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
      <div class="memory-board"
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
      <div v-if="showCreate" class="mo-backdrop" @click.self="showCreate = false">
        <div class="mo-dialog card">
          <h3>{{ tx('createTitle') }}</h3>
          <label class="mo-label">{{ tx('roomName') }}</label>
          <InputText v-model="form.name" maxlength="40" class="mo-input" />
          <label class="mo-label">{{ tx('boardSize') }}</label>
          <Select
            v-model="form.board_pairs"
            :options="sizeOptions.map((o) => ({ label: o.label(), value: o.value }))"
            optionLabel="label" optionValue="value" class="mo-input"
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
.mo-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.7); display:flex;
  align-items:center; justify-content:center; z-index:1300; padding:16px;
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
.mo-timer { font-variant-numeric:tabular-nums; font-size:13px;
  padding:2px 8px; border-radius:999px; background:rgba(255,255,255,0.08); }
.mo-scores { display:flex; flex-wrap:wrap; gap:10px; font-size:13px;
  font-weight:800; color:var(--muted); }
.mo-scores .active { color:var(--accent); }
.mo-scores .left { opacity:0.5; text-decoration:line-through; }
.memory-board { display:grid; gap:8px; padding:10px; border-radius:18px;
  background:linear-gradient(135deg,rgba(255,255,255,0.05),rgba(0,0,0,0.15)),#0d1528;
  border:1px solid var(--border); box-shadow:inset 0 0 28px rgba(0,0,0,0.35); }
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
