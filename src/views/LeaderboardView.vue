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
const now = ref(Date.now())
let clockTimer = null

// "Gesamt" bleibt die Voreinstellung; die alten Einzel-Listen stehen als
// weitere Tabs daneben (auf Wunsch der Spieler wieder da).
const TABS = [
  { key: 'overall', icon: '🏅', label: 'leaderboard.byOverall' },
  { key: 'rate', icon: '⚡', label: 'leaderboard.byRate' },
  { key: 'coins', icon: '🪙', label: 'leaderboard.byCoins' },
  { key: 'memory', icon: '🧠', label: 'leaderboard.byMemory' },
  { key: 'wordle', icon: '🟩', label: 'leaderboard.byWordle' },
  { key: 'blockfall', icon: '🧱', label: 'leaderboard.byBlockFall' }
]
const TAB_KEYS = TABS.map(tab => tab.key)
const mode = ref('overall')

const myUsername = computed(() => auth.profile?.username || null)

// Jede Liste hat ihre eigene RPC und ihr eigenes Zeilenformat.
async function fetchRows(m) {
  if (m === 'overall') {
    const { data, error: e } = await supabase.rpc('get_overall_leaderboard', { p_limit: 50 })
    if (e) throw e
    return (data || []).map(r => ({
      username: r.username,
      avatar_emoji: r.avatar_emoji,
      total_points: Number(r.total_points || 0),
      disciplines: Array.isArray(r.disciplines) ? r.disciplines : []
    }))
  }
  if (m === 'rate') {
    const { data, error: e } = await supabase.rpc('get_rate_leaderboard', { p_limit: 50 })
    if (e) throw e
    return (data || []).map(r => ({
      username: r.username,
      avatar_emoji: r.avatar_emoji,
      coins: Number(r.coins || 0),
      rate_per_sec: Number(r.rate_per_sec || 0)
    }))
  }
  if (m === 'memory') {
    const { data, error: e } = await supabase.rpc('get_memory_leaderboard', { p_limit: 50 })
    if (e) throw e
    return (data || []).map(r => ({
      username: r.username,
      avatar_emoji: r.avatar_emoji,
      highest_level: Number(r.highest_level || 0),
      total_pairs: Number(r.total_pairs || 0)
    }))
  }
  if (m === 'wordle') {
    const { data, error: e } = await supabase.rpc('get_wordle_leaderboard', { p_limit: 50 })
    if (e) throw e
    return (data || []).map(r => ({
      username: r.username,
      avatar_emoji: r.avatar_emoji,
      current_streak: Number(r.current_streak || 0),
      best_streak: Number(r.best_streak || 0),
      wins: Number(r.wins || 0)
    }))
  }
  if (m === 'blockfall') {
    const { data, error: e } = await supabase.rpc('get_blockfall_leaderboard', { p_limit: 50 })
    if (e) throw e
    return (data || []).map(r => ({
      username: r.username,
      avatar_emoji: r.avatar_emoji,
      highest_level: Number(r.highest_level || 0),
      stars: Number(r.stars || 0)
    }))
  }
  const { data, error: e } = await supabase
    .from('profiles')
    .select('username, coins, avatar_emoji')
    .order('coins', { ascending: false })
    .limit(50)
  if (e) throw e
  return (data || []).map(r => ({
    username: r.username,
    avatar_emoji: r.avatar_emoji,
    coins: Number(r.coins || 0)
  }))
}

let loadSeq = 0
async function load() {
  const seq = ++loadSeq
  const m = mode.value
  loading.value = true
  error.value = ''
  try {
    const next = await fetchRows(m)
    if (seq !== loadSeq) return
    rows.value = next
  } catch (e) {
    if (seq !== loadSeq) return
    error.value = e?.message || t('leaderboard.loadFailed')
    rows.value = []
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

function setMode(m) {
  if (mode.value === m) return
  mode.value = m
  detailFor.value = null
  rows.value = []
  router.replace({ query: m === 'overall' ? {} : { tab: m } }).catch(() => {})
  load()
}

watch(() => route.name, (name) => {
  if (name === 'leaderboard') load()
})
onMounted(() => {
  const tab = String(route.query.tab || '')
  if (TAB_KEYS.includes(tab)) mode.value = tab
  load()
  game.loadEventSchedule().catch(() => {})
  clockTimer = setInterval(() => {
    if (document.visibilityState !== 'visible') return
    now.value = Date.now()
  }, 1000)
})
onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
})
useReturnRefresh(load)

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

// Countdown-Banner für Listen, die an einem Ereignis hängen.
const EVENT_TABS = { memory: 'memory_game', blockfall: 'blockfall_game' }
const eventStatus = computed(() => {
  void now.value
  const key = EVENT_TABS[mode.value]
  if (!key) return null
  const info = game.eventFor(key)
  if (!info.showCountdown && !info.ended) return null
  const serverNow = Date.now() + game.serverOffset
  return { ended: info.ended, remainingMs: Math.max(0, info.endsAt - serverNow) }
})

// Disziplin-Namen fuer die Aufschluesselung hinter dem Info-Knopf.
const DISC_LABELS = {
  de: { rate: 'Pro Sekunde', coins: 'Münzen', boss_path: 'Bosspfad', boss_endless: 'Endlessboss',
        memory: 'Memory', merge: 'Fusion', wordle: 'Wordle', drift: 'Drift-Rennen', parkour: 'Zoo-Parkour',
        blockfall: 'BlockFall' },
  en: { rate: 'Per second', coins: 'Coins', boss_path: 'Boss path', boss_endless: 'Endless boss',
        memory: 'Memory', merge: 'Merge', wordle: 'Wordle', drift: 'Drift race', parkour: 'Zoo parkour',
        blockfall: 'BlockFall' },
  ru: { rate: 'В секунду', coins: 'Монеты', boss_path: 'Путь босса', boss_endless: 'Эндлесс-босс',
        memory: 'Memory', merge: 'Слияние', wordle: 'Wordle', drift: 'Дрифт', parkour: 'Паркур',
        blockfall: 'BlockFall' }
}

function discLabel(key) {
  const dict = DISC_LABELS[locale.value] || DISC_LABELS.en
  return dict[key] || DISC_LABELS.en[key] || key
}

// Jede Disziplin misst etwas anderes: Muenzen pro Sekunde, Etappe, Level,
// Serie. Der Messwert kommt als Zahl vom Server, die Einheit steht hier.
const DISC_UNITS = {
  de: { stage: 'Etappe', level: 'Level', rank: 'Rang', streak: 'Serie', damage: 'Schaden' },
  en: { stage: 'Stage', level: 'Level', rank: 'Rank', streak: 'Streak', damage: 'damage' },
  ru: { stage: 'Этап', level: 'Уровень', rank: 'Ранг', streak: 'Серия', damage: 'урона' }
}

function unit(key) {
  return (DISC_UNITS[locale.value] || DISC_UNITS.en)[key]
}

function discValue(d) {
  const v = Number(d?.value ?? 0)
  switch (d?.key) {
    case 'rate': return `${formatCoins(v)}/s`
    case 'coins': return `🪙 ${formatCoins(v)}`
    case 'boss_endless': return `${formatCoins(v)} ${unit('damage')}`
    case 'boss_path': return `${unit('stage')} ${v}`
    case 'merge': return `${unit('rank')} ${v}`
    case 'wordle': return `${unit('streak')} ${v}`
    case 'memory':
    case 'blockfall':
    case 'drift':
    case 'parkour': return `${unit('level')} ${v}`
    default: return String(v)
  }
}

const detailFor = ref(null)

function toggleDetail(username) {
  detailFor.value = detailFor.value === username ? null : username
}

function openProfile(username) {
  router.push({ name: 'profile', query: { u: username } })
}

const SUBTITLES = {
  overall: 'leaderboard.subtitleOverall',
  rate: 'leaderboard.subtitleRate',
  coins: 'leaderboard.subtitle',
  memory: 'leaderboard.subtitleMemory',
  wordle: 'leaderboard.subtitleWordle',
  blockfall: 'leaderboard.subtitleBlockFall'
}
const subtitle = computed(() => t(SUBTITLES[mode.value] || 'leaderboard.subtitleOverall'))
</script>

<template>
  <h1 class="title">🏆 {{ t('leaderboard.title') }}</h1>
  <p class="subtitle">{{ subtitle }}</p>

  <div class="lb-tabs" role="tablist">
    <Button
      v-for="tab in TABS"
      :key="tab.key"
      class="lb-tab"
      role="tab"
      :aria-selected="mode === tab.key"
      :class="{ active: mode === tab.key }"
      @click="setMode(tab.key)"
    >
      {{ tab.icon }} {{ t(tab.label) }}
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
      <div
        v-for="(r, i) in rows"
        :key="r.username"
        class="lb-item"
      >
      <div class="lb-row" :class="{ me: r.username === myUsername }">
      <Button
        class="lb-main"
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
            <template v-if="mode === 'overall'">
              <span class="primary">🏅 {{ r.total_points }} {{ t('leaderboard.points') }}</span>
              <span class="secondary">{{ r.disciplines.length }}×</span>
            </template>
            <template v-else-if="mode === 'memory'">
              <span class="primary">🧠 {{ t('leaderboard.memoryLevel') }} {{ r.highest_level }}</span>
              <span class="secondary">🔁 {{ r.total_pairs }} {{ t('leaderboard.memoryPairs') }}</span>
            </template>
            <template v-else-if="mode === 'wordle'">
              <span class="primary">🔥 {{ r.current_streak }} {{ t('leaderboard.wordleStreak') }}</span>
              <span class="secondary">🏅 {{ r.wins }} {{ t('leaderboard.wordleWins') }} · ⭐ {{ r.best_streak }}</span>
            </template>
            <template v-else-if="mode === 'blockfall'">
              <span class="primary">🧱 {{ t('leaderboard.memoryLevel') }} {{ r.highest_level }}</span>
              <span class="secondary">⭐ {{ r.stars }}</span>
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

      <Button
        v-if="mode === 'overall'"
        class="lb-info"
        :aria-label="t('leaderboard.breakdown')"
        :aria-expanded="detailFor === r.username"
        @click="toggleDetail(r.username)"
      >
        <i class="pi" :class="detailFor === r.username ? 'pi-chevron-up' : 'pi-info-circle'"></i>
      </Button>
      </div>

      <div v-if="mode === 'overall' && detailFor === r.username" class="lb-detail">
        <div class="lb-detail-head">{{ t('leaderboard.breakdown') }}</div>
        <div v-if="!r.disciplines.length" class="lb-detail-empty">
          {{ t('leaderboard.noPlacement') }}
        </div>
        <div
          v-for="d in r.disciplines"
          :key="d.key"
          class="lb-disc"
        >
          <span class="lb-disc-name">{{ discLabel(d.key) }}</span>
          <span class="lb-disc-value">{{ discValue(d) }}</span>
          <span class="lb-disc-rank">{{ t('leaderboard.place') }} {{ d.rank }}</span>
          <span class="lb-disc-pts">+{{ d.points }}</span>
        </div>
      </div>
      </div>
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
  background: rgba(244, 169, 18, 0.12);
  border-color: var(--gold, var(--accent));
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
    radial-gradient(circle at 0% 0%, rgba(25, 146, 200, 0.18), transparent 60%),
    linear-gradient(135deg, var(--card-2), var(--surface-deep));
  border: 1px solid rgba(25, 146, 200, 0.45);
  color: #1992c8;
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
/* Die Zeile ist ein Container: der Info-Knopf darf nicht im Profil-Button
   stecken, sonst ist es ein button im button und klickt beides. */
.lb-item:last-child .lb-row { border-bottom: none; }
.lb-row {
  display: flex; align-items: center;
  border-bottom: 1px solid var(--border);
}
.lb-row.me {
  background: rgba(244, 169, 18, 0.08);
  border-left: 3px solid var(--gold, var(--accent));
}
.lb-main {
  display: flex; align-items: center; gap: 10px;
  flex: 1; min-width: 0; padding: 8px;
  background: transparent; border: none;
  color: inherit; font: inherit; text-align: left;
  cursor: pointer;
}
.lb-main:hover { background: rgba(140, 105, 35, 0.03); }
.lb-row.me .lb-main:hover { background: rgba(244, 169, 18, 0.14); }
.lb-info {
  flex-shrink: 0;
  width: 38px; height: 38px;
  margin-right: 6px;
  display: flex; align-items: center; justify-content: center;
  background: transparent; border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--muted); cursor: pointer;
}
.lb-info:hover { color: var(--accent); border-color: var(--accent-soft); }
.lb-info .pi { font-size: 15px; }
.lb-detail {
  padding: 10px 12px 12px;
  background: rgba(140, 105, 35, 0.04);
  border-bottom: 1px solid var(--border);
}
.lb-detail-head {
  font-size: 11px; font-weight: 800; text-transform: uppercase;
  letter-spacing: 0.07em; color: var(--muted); margin-bottom: 6px;
}
.lb-detail-empty { font-size: 13px; color: var(--muted); }
.lb-disc {
  display: flex; align-items: center; gap: 8px;
  padding: 3px 0; font-size: 13px;
}
.lb-disc-name { flex: 1; min-width: 0; font-weight: 700; }
.lb-disc-value {
  color: var(--text); font-size: 12px; font-weight: 700;
  font-variant-numeric: tabular-nums; white-space: nowrap;
}
.lb-disc-rank { color: var(--muted); font-size: 12px; }
.lb-disc-pts {
  font-weight: 800; color: var(--accent-deep, var(--accent));
  font-variant-numeric: tabular-nums; min-width: 38px; text-align: right;
}
.lb-rank {
  width: 28px; text-align: center; font-weight: 700;
}
.lb-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--card-2); border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0;
}
.lb-body { flex: 1; min-width: 0; }
.me-tag {
  margin-left: 6px;
  padding: 1px 6px;
  font-size: 10px;
  border-radius: 8px;
  background: var(--gold, var(--accent));
  color: #1a1a1a;
  font-weight: 700;
  text-transform: uppercase;
}
.sub { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.sub .primary { font-weight: 600; }
.sub .secondary { color: var(--muted); font-size: 0.9em; }
</style>
