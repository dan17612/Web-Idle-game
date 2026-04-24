<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useGameStore } from '../stores/game'
import { supabase } from '../supabase'
import { useAuthStore } from '../stores/auth'
import { useRoute } from 'vue-router'
import { formatCoins } from '../animals'
import CoinInput from '../components/CoinInput.vue'
import { currentLocaleTag, t } from '../i18n'

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
  msg.value = ''
  error.value = ''
  busy.value = true
  try {
    await game.sendCoins(form.username.trim(), form.amount)
    msg.value = t('send.sentMessage', { amount: formatCoins(form.amount), username: form.username })
    form.username = ''
    await loadHistory()
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
    setTimeout(() => { msg.value = '' }, 3000)
  }
}
</script>

<template>
  <h1 class="title">💸 {{ t('send.title') }}</h1>
  <p class="subtitle">{{ t('send.subtitle') }}</p>

  <form class="card stack" @submit.prevent="send">
    <InputText v-model="form.username" :placeholder="t('send.usernamePlaceholder')" required />
    <CoinInput v-model="form.amount" :placeholder="t('send.amountPlaceholder')" required />
    <Button type="submit" class="btn full" :disabled="busy || !form.username || !form.amount || form.amount < 1">
      {{ busy ? t('common.loadingShort') : t('send.send') }}
    </Button>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="msg" class="success">{{ msg }}</p>
  </form>

  <div class="card">
    <h2 class="title" style="font-size:16px;margin:0 0 8px">{{ t('send.recentTransactions') }}</h2>
    <div v-if="!history.length" class="subtitle">{{ t('send.noTransactions') }}</div>
    <div v-for="tx in history" :key="tx.id" class="list-item">
      <div class="left">{{ tx.from_user === auth.user.id ? '⬆️' : '⬇️' }}</div>
      <div class="body">
        <div class="title-sm">
          {{ tx.from_user === auth.user.id ? t('send.sent') : t('send.received') }}
          · {{ formatCoins(tx.amount) }} 🪙
        </div>
        <div class="sub">{{ tx.kind }} · {{ new Date(tx.created_at).toLocaleString(currentLocaleTag()) }}</div>
      </div>
    </div>
  </div>
</template>
