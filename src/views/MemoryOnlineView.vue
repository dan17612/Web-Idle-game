<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'
import { locale } from '../i18n'
import { useAppToast } from '../composables/useAppToast'
import { canStartGame, sortedPlayers } from '../memoryOnline.js'

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
  },
}
function tx(key) {
  const dict = I18N[locale.value] || I18N.en
  return dict[key] != null ? dict[key] : (I18N.en[key] || key)
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

let poll = null
onMounted(() => {
  loadRooms()
  poll = setInterval(() => { if (!roomState.value) loadRooms() }, 5000)
})
onUnmounted(() => {
  if (poll) clearInterval(poll)
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
</style>
