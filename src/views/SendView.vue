<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useGameStore } from '../stores/game'
import { supabase } from '../supabase'
import { useAuthStore } from '../stores/auth'
import { useRoute } from 'vue-router'
import { formatCoins } from '../animals'

const game = useGameStore()
const auth = useAuthStore()
const route = useRoute()
const form = reactive({ username: route.query.to || '', amount: 100 })
const msg = ref('')
const error = ref('')
const busy = ref(false)
const history = ref([])

async function loadHistory() {
  if (!auth.user) return
  const { data } = await supabase
    .from('transactions')
    .select('*')
    .or(`from_user.eq.${auth.user.id},to_user.eq.${auth.user.id}`)
    .order('created_at', { ascending: false })
    .limit(20)
  history.value = data || []
}

onMounted(loadHistory)

async function send() {
  msg.value = ''; error.value = ''
  busy.value = true
  try {
    await game.sendCoins(form.username.trim(), form.amount)
    msg.value = `${formatCoins(form.amount)} 🪙 an ${form.username} gesendet.`
    form.username = ''
    await loadHistory()
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
    setTimeout(() => msg.value = '', 3000)
  }
}
</script>

<template>
  <h1 class="title">💸 Münzen senden</h1>
  <p class="subtitle">Schicke anderen Spielern Münzen über ihren Usernamen.</p>

  <form class="card stack" @submit.prevent="send">
    <input v-model="form.username" placeholder="Empfänger-Username" required />
    <input v-model.number="form.amount" type="number" min="1" step="1" placeholder="Betrag" required />
    <button class="btn full" :disabled="busy || !form.username || form.amount < 1">
      {{ busy ? '...' : 'Senden' }}
    </button>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="msg" class="success">{{ msg }}</p>
  </form>

  <div class="card">
    <h2 class="title" style="font-size:16px;margin:0 0 8px">Letzte Transaktionen</h2>
    <div v-if="!history.length" class="subtitle">Noch keine Transaktionen.</div>
    <div v-for="t in history" :key="t.id" class="list-item">
      <div class="left">{{ t.from_user === auth.user.id ? '⬆️' : '⬇️' }}</div>
      <div class="body">
        <div class="title-sm">
          {{ t.from_user === auth.user.id ? 'Gesendet' : 'Empfangen' }}
          · {{ formatCoins(t.amount) }} 🪙
        </div>
        <div class="sub">{{ t.kind }} · {{ new Date(t.created_at).toLocaleString('de-DE') }}</div>
      </div>
    </div>
  </div>
</template>
