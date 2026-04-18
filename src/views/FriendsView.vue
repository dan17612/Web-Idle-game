<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../supabase'
import { useRouter } from 'vue-router'
import { formatCoins } from '../animals'

const router = useRouter()
const friends = ref([])
const loading = ref(false)
const requestName = ref('')
const busy = ref(false)
const error = ref('')
const success = ref('')
const tab = ref('friends')

async function load() {
  loading.value = true
  const { data, error: e } = await supabase
    .from('friends_view')
    .select('*')
    .order('status')
    .order('created_at', { ascending: false })
  if (e) error.value = e.message
  friends.value = data || []
  loading.value = false
}
onMounted(load)

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

function sendCoinsTo(username) {
  router.push({ name: 'send', query: { to: username } })
}
</script>

<template>
  <h1 class="title">🤝 Freunde</h1>

  <form class="card stack" @submit.prevent="sendRequest">
    <label class="subtitle">Freund hinzufügen (Username)</label>
    <div class="row">
      <input v-model="requestName" placeholder="z.B. maxi42" style="flex:1" />
      <button class="btn" :disabled="busy || !requestName.trim()">Senden</button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="success" class="success">{{ success }}</p>
  </form>

  <div class="tabs">
    <button :class="{ active: tab==='friends' }" @click="tab='friends'">
      Freunde <span class="count">{{ accepted.length }}</span>
    </button>
    <button :class="{ active: tab==='incoming' }" @click="tab='incoming'">
      Eingang <span class="count" v-if="incoming.length">{{ incoming.length }}</span>
    </button>
    <button :class="{ active: tab==='outgoing' }" @click="tab='outgoing'">
      Ausgang
    </button>
  </div>

  <div class="card">
    <div v-if="loading" class="subtitle">Lädt…</div>

    <template v-else-if="tab==='friends'">
      <div v-if="!accepted.length" class="subtitle">Noch keine Freunde. Schick eine Anfrage!</div>
      <div v-for="f in accepted" :key="f.friendship_id" class="list-item">
        <div class="left">👤</div>
        <div class="body">
          <div class="title-sm">{{ f.friend_username }}</div>
          <div class="sub">🪙 {{ formatCoins(f.friend_coins) }}</div>
        </div>
        <div class="row">
          <button class="btn secondary small" @click="sendCoinsTo(f.friend_username)">💸</button>
          <button class="btn danger small" @click="remove(f.friend_id)">×</button>
        </div>
      </div>
    </template>

    <template v-else-if="tab==='incoming'">
      <div v-if="!incoming.length" class="subtitle">Keine offenen Anfragen.</div>
      <div v-for="f in incoming" :key="f.friendship_id" class="list-item">
        <div class="left">📨</div>
        <div class="body">
          <div class="title-sm">{{ f.friend_username }}</div>
          <div class="sub">möchte dein Freund werden</div>
        </div>
        <div class="row">
          <button class="btn small" :disabled="busy" @click="respond(f.friendship_id, true)">✓</button>
          <button class="btn danger small" :disabled="busy" @click="respond(f.friendship_id, false)">×</button>
        </div>
      </div>
    </template>

    <template v-else>
      <div v-if="!outgoing.length" class="subtitle">Keine ausstehenden Anfragen.</div>
      <div v-for="f in outgoing" :key="f.friendship_id" class="list-item">
        <div class="left">⏳</div>
        <div class="body">
          <div class="title-sm">{{ f.friend_username }}</div>
          <div class="sub">wartet auf Antwort</div>
        </div>
        <button class="btn danger small" :disabled="busy" @click="remove(f.friend_id)">×</button>
      </div>
    </template>
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
</style>
