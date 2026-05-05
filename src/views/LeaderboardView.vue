<script setup>
import { onMounted, onUnmounted, ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase'
import { formatCoins } from '../animals'
import { useAuthStore } from '../stores/auth'
import { useGameStore } from '../stores/game'
import { t, locale } from '../i18n'
import { useReturnRefresh } from '../composables/useReturnRefresh'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const game = useGameStore()
const rows = ref([])
const loading = ref(true)
const error = ref('')
const mode = ref('rate')
const now = ref(Date.now())
let clockTimer = null

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
    } else if (mode.value === 'boss') {
      const { data, error: e } = await supabase.rpc('get_boss_leaderboard', { p_limit: 50 })
      if (e) throw e
      rows.value = (data || []).map(r => ({
        username: r.username,
        avatar_emoji: r.avatar_emoji,
        highest_stage: r.highest_stage,
        total_victories: r.total_victories
      }))
    } else if (mode.value === 'merge') {
      const { data, error: e } = await supabase.rpc('get_merge_leaderboard', { p_limit: 50 })
      if (e) throw e
      rows.value = (data || []).map(r => ({
        username: r.username,
        avatar_emoji: r.avatar_emoji,
        score: Number(r.score || 0),
        total_fusions: Number(r.total_fusions || 0),
        highest_rank: Number(r.highest_rank || 0)
      }))
    } else if (mode.value === 'endless') {
      const { data, error: e } = await supabase.rpc('get_boss_endless_leaderboard', { p_limit: 50 })
      if (e) throw e
      rows.value = (data || []).map(r => ({
        username: r.username,
        avatar_emoji: r.avatar_emoji,
        damage: Number(r.damage || 0),
        finished_at: r.finished_at
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
onMounted(() => {
  load()
  game.loadEventSchedule().catch(() => {})
  clockTimer = setInterval(() => { now.value = Date.now() }, 1000)
})
onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
})
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

const eventStatus = computed(() => {
  void now.value
  if (mode.value === 'boss') {
    if (!game.bossPathShowCountdown) return null
    const ms = Math.max(0, game.bossPathEndsAt - Date.now())
    return { ended: !game.bossPathActive, remainingMs: ms }
  }
  if (mode.value === 'merge') {
    if (!game.mergeShowCountdown) return null
    const ms = Math.max(0, game.mergeEndsAt - Date.now())
    return { ended: !game.mergeActive, remainingMs: ms }
  }
  return null
})

function tileLabel(rank) {
  const r = Math.max(0, Math.floor(Number(rank) || 0))
  if (r <= 50) {
    const v = 2 ** r
    if (v < 1000) return String(v)
    const units = ['', 'K', 'M', 'B', 'T', 'Q']
    let value = v
    let unit = 0
    while (value >= 1000 && unit < units.length - 1) {
      value /= 1000
      unit++
    }
    const decimals = value < 10 ? 2 : value < 100 ? 1 : 0
    return `${value.toFixed(decimals)}${units[unit]}`
  }
  return `2^${r}`
}

const subtitle = computed(() => {
  if (mode.value === 'rate') return t('leaderboard.subtitleRate')
  if (mode.value === 'boss') return t('leaderboard.subtitleBoss')
  if (mode.value === 'merge') return t('leaderboard.subtitleMerge')
  if (mode.value === 'endless') return t('leaderboard.subtitleEndless')
  return t('leaderboard.subtitle')
})
</script>

<template>
  <h1 class="title">🏆 {{ t('leaderboard.title') }}</h1>
  <p class="subtitle">{{ subtitle }}</p>

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
    <Button
      class="lb-tab"
      :class="{ active: mode === 'boss' }"
      @click="setMode('boss')"
    >
      ⚔️ {{ t('leaderboard.byBoss') }}
    </Button>
    <Button
      class="lb-tab"
      :class="{ active: mode === 'merge' }"
      @click="setMode('merge')"
    >
      🐾 {{ t('leaderboard.byMerge') }}
    </Button>
    <Button
      class="lb-tab"
      :class="{ active: mode === 'endless' }"
      @click="setMode('endless')"
    >
      ⏱️ {{ t('leaderboard.byEndless') }}
    </Button>
  </div>

  <div
    v-if="eventStatus"
    class="lb-event-banner"
    :class="{ ended: eventStatus.ended }"
  >
    <span class="lb-event-icon">{{ eventStatus.ended ? '⏰' : '⏳' }}</span>
    <span class="lb-event-text">
      <template v-if="eventStatus.ended">{{ t('leaderboard.eventEnded') }}</template>
      <template v-else>{{ t('leaderboard.eventEndsIn', { time: formatCountdown(eventStatus.remainingMs) }) }}</template>
    </span>
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
            <template v-if="mode === 'boss'">
              <span class="primary">⚔️ {{ t('leaderboard.bossStage') }} {{ r.highest_stage }}</span>
              <span class="secondary">🏅 {{ r.total_victories }} {{ t('leaderboard.bossVictories') }}</span>
            </template>
            <template v-else-if="mode === 'merge'">
              <span class="primary">🐾 {{ t('leaderboard.mergeHighestTile') }}: {{ tileLabel(r.highest_rank) }}</span>
              <span class="secondary">⭐ {{ formatCoins(r.score) }} {{ t('leaderboard.mergeScore') }}</span>
              <span class="secondary">🔁 {{ formatCoins(r.total_fusions) }} {{ t('leaderboard.mergeFusions') }}</span>
            </template>
            <template v-else-if="mode === 'endless'">
              <span class="primary">💥 {{ formatCoins(r.damage) }} {{ t('leaderboard.endlessDamage') }}</span>
            </template>
            <template v-else-if="mode === 'rate'">
              <span class="primary">⚡ {{ formatRate(r.rate_per_sec) }}/s</span>
              <span class="secondary">🪙 {{ formatCoins(r.coins) }}</span>
            </template>
            <template v-else>
              <span class="primary">🪙 {{ formatCoins(r.coins) }}</span>
            </template>
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
  flex-wrap: wrap;
}
.lb-tab {
  flex: 1 1 auto;
  min-width: 100px;
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
.lb-event-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  margin-bottom: 12px;
  border-radius: 12px;
  background:
    radial-gradient(circle at 0% 0%, rgba(72, 202, 228, 0.18), transparent 60%),
    linear-gradient(135deg, #142244, #0d1730);
  border: 1px solid rgba(72, 202, 228, 0.45);
  color: #48cae4;
  font-weight: 800;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.lb-event-banner.ended {
  background:
    radial-gradient(circle at 0% 0%, rgba(239, 71, 111, 0.22), transparent 60%),
    linear-gradient(135deg, #2a1226, #1a0a1a);
  border-color: rgba(239, 71, 111, 0.55);
  color: #ef476f;
}
.lb-event-icon { font-size: 18px; flex-shrink: 0; }
.lb-event-text { min-width: 0; }
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
