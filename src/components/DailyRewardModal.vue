<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'
import { formatCoins } from '../animals'
import { locale } from '../i18n'
import { useAppToast } from '../composables/useAppToast'

const props = defineProps({ open: Boolean })
const emit = defineEmits(['close'])

const game = useGameStore()
const appToast = useAppToast()

const I18N = {
  de: {
    title: '🎁 Tägliche Belohnung',
    sub: 'Komm jeden Tag vorbei und halte deinen Streak am Leben!',
    day: 'Tag',
    streak: '🔥 {n} Tage Streak',
    streak1: '🔥 1 Tag Streak',
    weekBonus: 'Wochen-Bonus ×{mult}',
    claim: '🎁 Belohnung abholen',
    claimed: '✓ Heute abgeholt',
    nextIn: 'Nächste Belohnung in {time}',
    today: 'Heute',
    rewardTitle: 'Belohnung abgeholt!',
    close: 'Weiter sammeln',
    error: 'Belohnung konnte nicht abgeholt werden'
  },
  en: {
    title: '🎁 Daily Reward',
    sub: 'Come back every day and keep your streak alive!',
    day: 'Day',
    streak: '🔥 {n} day streak',
    streak1: '🔥 1 day streak',
    weekBonus: 'Week bonus ×{mult}',
    claim: '🎁 Claim reward',
    claimed: '✓ Claimed today',
    nextIn: 'Next reward in {time}',
    today: 'Today',
    rewardTitle: 'Reward claimed!',
    close: 'Keep collecting',
    error: 'Could not claim the reward'
  },
  ru: {
    title: '🎁 Ежедневная награда',
    sub: 'Заходи каждый день и поддерживай серию!',
    day: 'День',
    streak: '🔥 Серия {n} дн.',
    streak1: '🔥 Серия 1 день',
    weekBonus: 'Бонус недели ×{mult}',
    claim: '🎁 Забрать награду',
    claimed: '✓ Получено сегодня',
    nextIn: 'Следующая награда через {time}',
    today: 'Сегодня',
    rewardTitle: 'Награда получена!',
    close: 'Продолжить',
    error: 'Не удалось забрать награду'
  }
}

function tx(key, vars = {}) {
  const dict = I18N[locale.value] || I18N.en
  let value = dict[key]
  if (value == null) value = I18N.en[key]
  return String(value ?? key).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

function txStreak(n) {
  return n === 1 ? tx('streak1') : tx('streak', { n })
}

const busy = ref(false)
const justClaimed = ref(null)
const now = ref(Date.now())
let timer = null

onMounted(() => { timer = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => { if (timer) clearInterval(timer) })

const status = computed(() => game.dailyReward)
const days = computed(() => Array.isArray(status.value?.days) ? status.value.days : [])
const canClaim = computed(() => !!status.value?.can_claim)
const displayStreak = computed(() => Number(status.value?.streak || 0))
const weekMult = computed(() => Number(status.value?.multiplier || 1))

const nextClaimRemaining = computed(() => {
  void now.value
  const at = status.value?.next_claim_at ? new Date(status.value.next_claim_at).getTime() : 0
  return Math.max(0, at - (Date.now() + game.serverOffset))
})

function fmtRemaining(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

async function claim() {
  if (busy.value || !canClaim.value) return
  busy.value = true
  try {
    const data = await game.claimDailyReward()
    justClaimed.value = {
      coins: Number(data?.coins_added || 0),
      tickets: Number(data?.tickets_added || 0),
      streak: Number(data?.streak || 1)
    }
  } catch (e) {
    appToast.err(e?.message || tx('error'))
  } finally {
    busy.value = false
  }
}

function close() {
  justClaimed.value = null
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="props.open" class="dr-backdrop" @click.self="close">
      <div class="dr-dialog card">
        <template v-if="!justClaimed">
          <button class="dr-close" @click="close">✕</button>
          <h2 class="dr-title">{{ tx('title') }}</h2>
          <p class="dr-sub">{{ tx('sub') }}</p>

          <div class="dr-meta">
            <span class="dr-chip streak">{{ txStreak(displayStreak) }}</span>
            <span v-if="weekMult > 1" class="dr-chip mult">{{ tx('weekBonus', { mult: weekMult }) }}</span>
          </div>

          <div class="dr-grid">
            <div
              v-for="d in days"
              :key="d.day"
              class="dr-day"
              :class="{ claimed: d.claimed, next: d.is_next, big: d.day === 7 }"
            >
              <div class="dr-day-label">
                {{ d.is_next ? tx('today') : tx('day') + ' ' + d.day }}
              </div>
              <div class="dr-day-icon">{{ d.day === 7 ? '🏆' : d.tickets > 0 ? '🎟️' : '🪙' }}</div>
              <div class="dr-day-coins">🪙 {{ formatCoins(d.coins) }}</div>
              <div v-if="d.tickets > 0" class="dr-day-tickets">🎟️ +{{ d.tickets }}</div>
              <div v-if="d.claimed" class="dr-day-check">✓</div>
            </div>
          </div>

          <Button v-if="canClaim" class="btn full dr-claim" :disabled="busy" @click="claim">
            {{ busy ? '…' : tx('claim') }}
          </Button>
          <div v-else class="dr-done">
            <div class="dr-done-badge">{{ tx('claimed') }}</div>
            <div class="dr-done-next">⏳ {{ tx('nextIn', { time: fmtRemaining(nextClaimRemaining) }) }}</div>
          </div>
        </template>

        <template v-else>
          <div class="dr-reveal">
            <div class="dr-reveal-emoji">🎉</div>
            <h2 class="dr-title">{{ tx('rewardTitle') }}</h2>
            <div class="dr-reveal-items">
              <div class="dr-reveal-item">🪙 +{{ formatCoins(justClaimed.coins) }}</div>
              <div v-if="justClaimed.tickets > 0" class="dr-reveal-item tickets">
                🎟️ +{{ justClaimed.tickets }}
              </div>
            </div>
            <div class="dr-chip streak big">{{ txStreak(justClaimed.streak) }}</div>
            <Button class="btn full dr-claim" @click="close">{{ tx('close') }}</Button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.dr-backdrop { position:fixed; inset:0; z-index:1300; display:flex; align-items:center;
  justify-content:center; padding:16px; background:rgba(60,40,10,0.45); backdrop-filter:blur(5px); }
.dr-dialog { position:relative; width:min(400px,100%); max-height:90vh; overflow-y:auto;
  padding:22px 18px; text-align:center; animation:drIn 0.28s cubic-bezier(0.34,1.56,0.64,1); }
.dr-close { position:absolute; top:10px; right:10px; width:32px; height:32px;
  border-radius:50%; border:2px solid var(--border); background:var(--card-2);
  color:var(--muted); font-weight:900; cursor:pointer; padding:0; line-height:1; }
.dr-title { margin:0 0 4px; font-size:21px; font-weight:900; color:var(--heading); }
.dr-sub { margin:0 0 12px; color:var(--muted); font-size:13px; font-weight:700; }
.dr-meta { display:flex; justify-content:center; gap:8px; margin-bottom:12px; flex-wrap:wrap; }
.dr-chip { border-radius:999px; padding:5px 12px; font-size:12px; font-weight:900;
  background:var(--card-2); border:2px solid var(--border); color:var(--text); }
.dr-chip.streak { border-color:var(--accent-soft); color:var(--accent-deep); }
.dr-chip.mult { border-color:var(--purple); color:var(--purple-deep); }
.dr-chip.big { font-size:14px; padding:7px 16px; margin-bottom:14px; }
.dr-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:14px; }
.dr-day { position:relative; border-radius:14px; border:2px solid var(--border);
  background:var(--card-2); padding:8px 4px; display:flex; flex-direction:column;
  align-items:center; gap:2px; min-height:86px; justify-content:center; }
.dr-day.big { grid-column:span 2; background:linear-gradient(135deg,#fff3cf,#ffe49a);
  border-color:var(--accent-soft); }
.dr-day.claimed { opacity:0.55; }
.dr-day.next { border-color:var(--accent); background:linear-gradient(180deg,#fffaf0,#fff1d0);
  box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 30%, transparent);
  animation:drPulse 1.8s ease-in-out infinite; }
.dr-day-label { font-size:10px; font-weight:900; text-transform:uppercase;
  letter-spacing:0.04em; color:var(--muted); }
.dr-day.next .dr-day-label { color:var(--accent-deep); }
.dr-day-icon { font-size:22px; line-height:1.1; }
.dr-day-coins { font-size:11px; font-weight:900; color:var(--accent-deep); }
.dr-day-tickets { font-size:11px; font-weight:900; color:var(--purple-deep); }
.dr-day-check { position:absolute; top:-7px; right:-5px; width:22px; height:22px;
  border-radius:50%; background:var(--accent-2); color:#fff; font-size:12px;
  font-weight:900; display:grid; place-items:center; border:2px solid #fff; }
.dr-claim { font-weight:900; }
.dr-done { display:flex; flex-direction:column; gap:6px; align-items:center; }
.dr-done-badge { font-weight:900; color:var(--accent-2); font-size:15px; }
.dr-done-next { color:var(--muted); font-weight:800; font-size:13px;
  font-variant-numeric:tabular-nums; }
.dr-reveal { display:flex; flex-direction:column; align-items:center; gap:10px; }
.dr-reveal-emoji { font-size:64px; line-height:1; animation:drPop 0.5s cubic-bezier(0.34,1.56,0.64,1); }
.dr-reveal-items { display:flex; gap:10px; flex-wrap:wrap; justify-content:center; }
.dr-reveal-item { border-radius:14px; padding:12px 18px; font-size:18px; font-weight:900;
  color:var(--accent-deep); background:linear-gradient(180deg,#fffaf0,#fff1d0);
  border:2px solid var(--accent-soft); animation:drPop 0.45s cubic-bezier(0.34,1.56,0.64,1) both; }
.dr-reveal-item.tickets { color:var(--purple-deep); border-color:var(--purple);
  background:linear-gradient(180deg,#f7f2ff,#ece1ff); animation-delay:0.12s; }
@keyframes drIn { from { transform:translateY(20px) scale(0.94); opacity:0; }
  to { transform:translateY(0) scale(1); opacity:1; } }
@keyframes drPop { from { transform:scale(0.4); opacity:0; }
  to { transform:scale(1); opacity:1; } }
@keyframes drPulse {
  0%,100% { box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 30%, transparent); }
  50% { box-shadow:0 0 0 6px color-mix(in srgb, var(--accent) 12%, transparent); } }
@media (max-width:380px) { .dr-grid { grid-template-columns:repeat(3,1fr); }
  .dr-day.big { grid-column:span 3; } }
</style>
