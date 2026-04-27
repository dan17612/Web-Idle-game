<script setup>
import { onMounted, ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase'
import { formatCoins } from '../animals'
import { useAuthStore } from '../stores/auth'
import { t } from '../i18n'
import { useReturnRefresh } from '../composables/useReturnRefresh'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const rows = ref([])
const loading = ref(true)
const error = ref('')
const mode = ref('rate')

const myUsername = computed(() => auth.profile?.username || null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    if (mode.value === 'rate') {
      const { data, error: e } = await supabase.rpc('get_rate_leaderboard', { p_limit: 50 })
      if (e) throw e
      rows.value = (data || []).map(r => ({
        username: r.username,
        coins: Number(r.coins || 0),
        avatar_emoji: r.avatar_emoji,
        rate_per_sec: Number(r.rate_per_sec || 0)
      }))
    } else {
      const { data, error: e } = await supabase
        .from('profiles')
        .select('username, coins, avatar_emoji')
        .order('coins', { ascending: false })
        .limit(50)
      if (e) throw e
      rows.value = (data || []).map(r => ({
        username: r.username,
        coins: Number(r.coins || 0),
        avatar_emoji: r.avatar_emoji,
        rate_per_sec: null
      }))
    }
  } catch (e) {
    error.value = e?.message || t('leaderboard.loadFailed')
    rows.value = []
  } finally {
    loading.value = false
  }
}

function setMode(m) {
  if (mode.value === m) return
  mode.value = m
  load()
}

watch(() => route.name, (name) => {
  if (name === 'leaderboard') load()
})
onMounted(load)
useReturnRefresh(load)

function openProfile(username) {
  router.push({ name: 'profile', query: { u: username } })
}

function formatRate(n) {
  const v = Number(n || 0)
  if (v < 10) return v.toFixed(2)
  if (v < 100) return v.toFixed(1)
  return formatCoins(v)
}
</script>

<template>
  <h1 class="title">🏆 {{ t('leaderboard.title') }}</h1>
  <p class="subtitle">{{ mode === 'rate' ? t('leaderboard.subtitleRate') : t('leaderboard.subtitle') }}</p>

  <div class="lb-tabs">
    <Button
      class="lb-tab"
      :class="{ active: mode === 'rate' }"
      @click="setMode('rate')"
    >
      ⚡ {{ t('leaderboard.byRate') }}
    </Button>
    <Button
      class="lb-tab"
      :class="{ active: mode === 'coins' }"
      @click="setMode('coins')"
    >
      🪙 {{ t('leaderboard.byCoins') }}
    </Button>
  </div>

  <div class="card">
    <div v-if="loading" class="lb-state">
      <i class="pi pi-spin pi-spinner" style="font-size:24px; color: var(--muted)" />
      <span class="subtitle" style="margin:0">{{ t('common.loading') }}</span>
    </div>

    <div v-else-if="error" class="lb-state">
      <i class="pi pi-exclamation-triangle" style="font-size:24px; color: var(--danger)" />
      <span class="error" style="margin:0">{{ error }}</span>
      <Button class="btn secondary" style="margin-top:4px" @click="load">
        <i class="pi pi-refresh" /> {{ t('leaderboard.retry') }}
      </Button>
    </div>

    <div v-else-if="!rows.length" class="lb-state">
      <span class="subtitle" style="margin:0">{{ t('leaderboard.empty') }}</span>
    </div>

    <template v-else>
      <Button
        v-for="(r, i) in rows"
        :key="r.username"
        class="lb-row"
        :class="{ me: r.username === myUsername }"
        @click="openProfile(r.username)"
      >
        <div class="lb-rank">
          <template v-if="i===0">🥇</template>
          <template v-else-if="i===1">🥈</template>
          <template v-else-if="i===2">🥉</template>
          <template v-else>{{ i + 1 }}</template>
        </div>
        <div class="lb-avatar">{{ r.avatar_emoji || '👤' }}</div>
        <div class="lb-body">
          <div class="title-sm">
            {{ r.username }}
            <span v-if="r.username === myUsername" class="me-tag">{{ t('leaderboard.you') }}</span>
          </div>
          <div class="sub">
            <span v-if="mode === 'rate'" class="primary">⚡ {{ formatRate(r.rate_per_sec) }}/s</span>
            <span v-if="mode === 'rate'" class="secondary">🪙 {{ formatCoins(r.coins) }}</span>
            <span v-else class="primary">🪙 {{ formatCoins(r.coins) }}</span>
          </div>
        </div>
      </Button>
    </template>
  </div>
</template>

<style scoped>
.lb-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 12px;
}
.lb-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.lb-tab {
  flex: 1;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--muted);
  padding: 8px 12px;
  font-weight: 600;
}
.lb-tab.active {
  background: rgba(255, 209, 102, 0.12);
  border-color: var(--gold, #ffd166);
  color: var(--text);
}
.lb-row {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 8px;
  background: transparent; border: none;
  border-bottom: 1px solid var(--border);
  color: inherit; font: inherit; text-align: left;
  cursor: pointer;
}
.lb-row:last-child { border-bottom: none; }
.lb-row:hover { background: rgba(255,255,255,0.03); }
.lb-row.me {
  background: rgba(255, 209, 102, 0.08);
  border-left: 3px solid var(--gold, #ffd166);
}
.lb-row.me:hover { background: rgba(255, 209, 102, 0.14); }
.lb-rank {
  width: 28px; text-align: center; font-weight: 700;
}
.lb-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: #162048; border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0;
}
.lb-body { flex: 1; min-width: 0; }
.me-tag {
  margin-left: 6px;
  padding: 1px 6px;
  font-size: 10px;
  border-radius: 8px;
  background: var(--gold, #ffd166);
  color: #1a1a1a;
  font-weight: 700;
  text-transform: uppercase;
}
.sub { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.sub .primary { font-weight: 600; }
.sub .secondary { color: var(--muted); font-size: 0.9em; }
</style>
