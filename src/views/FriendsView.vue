<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { supabase } from '../supabase'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/game'
import { formatCoins } from '../animals'
import CoinInput from '../components/CoinInput.vue'

const router = useRouter()
const game = useGameStore()
const friends = ref([])
const avatars = ref({}) // username -> emoji
const loading = ref(false)
const requestName = ref('')
const busy = ref(false)
const error = ref('')
const success = ref('')
const tab = ref('friends')

// Inline send-coins modal
const sendModal = reactive({ open: false, to: '', amount: 0, busy: false, err: '' })

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data, error: e } = await supabase
      .from('friends_view')
      .select('*')
      .order('status')
      .order('created_at', { ascending: false })
    if (e) throw e
    friends.value = data || []
    const names = [...new Set((data || []).map(f => f.friend_username).filter(Boolean))]
    if (names.length) {
      const { data: ps } = await supabase.from('profiles')
        .select('username, avatar_emoji').in('username', names)
      const m = {}
      for (const p of ps || []) m[p.username] = p.avatar_emoji || '👤'
      avatars.value = m
    }
  } catch (e) {
    error.value = e?.message || 'Laden fehlgeschlagen'
  } finally {
    loading.value = false
  }
}
onMounted(load)

function av(name) { return avatars.value[name] || '👤' }

const accepted = computed(() => friends.value.filter(f => f.status === 'accepted'))
const incoming = computed(() => friends.value.filter(f => f.status === 'pending' && f.direction === 'incoming'))
const outgoing = computed(() => friends.value.filter(f => f.status === 'pending' && f.direction === 'outgoing'))

async function sendRequest() {
  if (!requestName.value.trim()) return
  busy.value = true; error.value = ''; success.value = ''
  try {
    const { data, error: e } = await supabase.rpc('friend_request', { p_username: requestName.value.trim() })
    if (e) throw e
    success.value = data?.status === 'accepted' ? 'Freundschaft bestätigt!' : 'Anfrage gesendet.'
    requestName.value = ''
    await load()
  } catch (e) { error.value = e.message } finally { busy.value = false }
}

async function respond(id, accept) {
  busy.value = true; error.value = ''
  try {
    const { error: e } = await supabase.rpc('friend_respond', { p_id: id, p_accept: accept })
    if (e) throw e
    await load()
  } catch (e) { error.value = e.message } finally { busy.value = false }
}

async function remove(friendId) {
  if (!confirm('Freundschaft wirklich entfernen?')) return
  busy.value = true; error.value = ''
  try {
    const { error: e } = await supabase.rpc('friend_remove', { p_friend_id: friendId })
    if (e) throw e
    await load()
  } catch (e) { error.value = e.message } finally { busy.value = false }
}

function openSend(username) {
  sendModal.open = true
  sendModal.to = username
  sendModal.amount = 0
  sendModal.err = ''
}
function closeSend() { sendModal.open = false }

async function confirmSend() {
  sendModal.err = ''
  const amt = Math.floor(Number(sendModal.amount) || 0)
  if (amt < 1) { sendModal.err = 'Betrag muss ≥ 1 sein'; return }
  if (amt > game.displayCoins) { sendModal.err = 'Nicht genug Münzen'; return }
  sendModal.busy = true
  try {
    await game.sendCoins(sendModal.to, amt)
    success.value = `${formatCoins(amt)} 🪙 an ${sendModal.to} gesendet`
    sendModal.open = false
    setTimeout(() => success.value = '', 3000)
  } catch (e) { sendModal.err = e.message } finally { sendModal.busy = false }
}

function openTrade(username) {
  router.push({ name: 'trade', query: { partner: username } })
}
function openProfile(username) {
  router.push({ name: 'profile', query: { u: username } })
}
</script>

<template>
  <h1 class="title">🤝 Freunde</h1>

  <form class="card stack" @submit.prevent="sendRequest">
    <label class="subtitle">Freund hinzufügen (Username)</label>
    <div class="row">
      <InputText v-model="requestName" placeholder="z.B. maxi42" style="flex:1" />
      <Button type="submit" class="btn" :disabled="busy || !requestName.trim()">Senden</Button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="success" class="success">{{ success }}</p>
  </form>

  <div class="tabs">
    <Button :class="{ active: tab==='friends' }" @click="tab='friends'">
      Freunde <span class="count">{{ accepted.length }}</span>
    </Button>
    <Button :class="{ active: tab==='incoming' }" @click="tab='incoming'">
      Eingang <span class="count" v-if="incoming.length">{{ incoming.length }}</span>
    </Button>
    <Button :class="{ active: tab==='outgoing' }" @click="tab='outgoing'">
      Ausgang
    </Button>
  </div>

  <div class="card">
    <div v-if="loading" class="subtitle">Lädt…</div>

    <template v-else-if="tab==='friends'">
      <div v-if="!accepted.length" class="subtitle">Noch keine Freunde. Schick eine Anfrage!</div>
      <div v-for="f in accepted" :key="f.friendship_id" class="list-item friend-row">
        <Button class="avatar" @click="openProfile(f.friend_username)" :title="`Profil von ${f.friend_username}`">
          {{ av(f.friend_username) }}
        </Button>
        <div class="body">
          <div class="title-sm">{{ f.friend_username }}</div>
          <div class="sub">🪙 {{ formatCoins(f.friend_coins) }}</div>
        </div>
        <div class="actions">
          <Button class="btn small" @click="openSend(f.friend_username)" title="Münzen senden">💸</Button>
          <Button class="btn secondary small" @click="openTrade(f.friend_username)" title="Trade anbieten">🔄</Button>
          <Button class="btn danger small" @click="remove(f.friend_id)" title="Entfernen">×</Button>
        </div>
      </div>
    </template>

    <template v-else-if="tab==='incoming'">
      <div v-if="!incoming.length" class="subtitle">Keine offenen Anfragen.</div>
      <div v-for="f in incoming" :key="f.friendship_id" class="list-item friend-row">
        <div class="avatar">{{ av(f.friend_username) }}</div>
        <div class="body">
          <div class="title-sm">{{ f.friend_username }}</div>
          <div class="sub">möchte dein Freund werden</div>
        </div>
        <div class="actions">
          <Button class="btn small" :disabled="busy" @click="respond(f.friendship_id, true)">✓</Button>
          <Button class="btn danger small" :disabled="busy" @click="respond(f.friendship_id, false)">×</Button>
        </div>
      </div>
    </template>

    <template v-else>
      <div v-if="!outgoing.length" class="subtitle">Keine ausstehenden Anfragen.</div>
      <div v-for="f in outgoing" :key="f.friendship_id" class="list-item friend-row">
        <div class="avatar">{{ av(f.friend_username) }}</div>
        <div class="body">
          <div class="title-sm">{{ f.friend_username }}</div>
          <div class="sub">wartet auf Antwort</div>
        </div>
        <Button class="btn danger small" :disabled="busy" @click="remove(f.friend_id)">×</Button>
      </div>
    </template>
  </div>

  <!-- Send modal -->
  <div v-if="sendModal.open" class="modal-backdrop" @click.self="closeSend">
    <div class="modal">
      <div class="row between" style="margin-bottom:8px">
        <h3 style="margin:0">💸 Senden an {{ sendModal.to }}</h3>
        <Button class="btn secondary small" @click="closeSend">×</Button>
      </div>
      <div class="subtitle" style="margin:0 0 8px">Dein Guthaben: 🪙 {{ formatCoins(game.displayCoins) }}</div>
      <CoinInput v-model="sendModal.amount" placeholder="Betrag (z.B. 10K)" />
      <p v-if="sendModal.err" class="error" style="margin-top:6px">{{ sendModal.err }}</p>
      <div class="row" style="gap:6px;margin-top:10px">
        <Button class="btn full" :disabled="sendModal.busy || !sendModal.amount" @click="confirmSend">
          {{ sendModal.busy ? '...' : 'Senden' }}
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.count {
  display: inline-block;
  background: var(--accent);
  color: #1b1300;
  font-size: 10px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 999px;
  margin-left: 4px;
}
.btn.small { padding: 6px 10px; font-size: 13px; }
.friend-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; }
.avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: #162048; border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; cursor: pointer;
  color: inherit;
}
.avatar:hover { border-color: var(--accent); }
.body { flex: 1; min-width: 0; }
.actions { display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }

.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 100; padding: 20px;
}
.modal {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 14px; padding: 16px;
  width: 100%; max-width: 360px;
}
</style>
