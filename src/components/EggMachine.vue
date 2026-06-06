<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'
import { useAppToast } from '../composables/useAppToast'
import { speciesInfo } from '../animals'
import { rarityInfo, EGG_TYPES, loadEggCatalog } from '../eggs'
import { t } from '../i18n'

const game = useGameStore()
const toast = useAppToast()
const now = ref(Date.now())
const showPicker = ref(false)
const busy = ref(false)
const hatchResult = ref(null)

let timer
onMounted(async () => {
  await loadEggCatalog()
  await game.loadIncubation()
  timer = setInterval(() => { now.value = Date.now() }, 1000)
})
onUnmounted(() => clearInterval(timer))

const incubation = computed(() => game.incubation || { active: false })
const playerEggs = computed(() => game.playerEggs || [])

const groupedEggs = computed(() => {
  const m = {}
  for (const e of playerEggs.value) {
    if (!m[e.egg_type]) m[e.egg_type] = { egg_type: e.egg_type, list: [] }
    m[e.egg_type].list.push(e)
  }
  return Object.values(m)
})

const remainingMs = computed(() => {
  if (!incubation.value?.active || !incubation.value.ready_at) return 0
  return Math.max(0, new Date(incubation.value.ready_at).getTime() - now.value)
})

const readyNow = computed(() => incubation.value?.active && remainingMs.value === 0)

function fmtTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const progress = computed(() => {
  const et = EGG_TYPES[incubation.value?.egg_type]
  const totalMin = et?.incubation_minutes || 60
  const total = totalMin * 60 * 1000
  return Math.max(0, Math.min(1, 1 - (remainingMs.value / total)))
})

const currentEggName = computed(() => EGG_TYPES[incubation.value?.egg_type]?.name || '🥚')

const subtitleText = computed(() => {
  if (readyNow.value) return t('eggs.ready')
  if (incubation.value.active) return t('eggs.readyIn', { time: fmtTime(remainingMs.value) })
  if (!playerEggs.value.length) return t('eggs.noEggs')
  return t('eggs.empty')
})

const cardIcon = computed(() => {
  if (readyNow.value) return '✨'
  if (incubation.value.active) return '🥚'
  return '🥚'
})

const arrowGlyph = computed(() => {
  if (readyNow.value) return '🎁'
  if (incubation.value.active) return ''
  return '›'
})

function handleCardClick() {
  if (busy.value) return
  if (readyNow.value) { claim(); return }
  if (incubation.value.active) return
  if (!playerEggs.value.length) return
  showPicker.value = !showPicker.value
}

async function startIncubation(eggId) {
  busy.value = true
  try {
    await game.startIncubation(eggId)
    showPicker.value = false
  } catch (e) { toast.err(e) } finally { busy.value = false }
}

async function claim() {
  busy.value = true
  try {
    const result = await game.claimHatched()
    hatchResult.value = result
  } catch (e) { toast.err(e) } finally { busy.value = false }
}

function closeHatchResult() {
  hatchResult.value = null
}
</script>

<template>
  <div
    class="card egg-link"
    :class="{ 'is-ready': readyNow, 'is-brewing': incubation.active && !readyNow, 'is-disabled': !incubation.active && !playerEggs.length }"
    @click="handleCardClick"
  >
    <div class="egl-icon" :class="{ shake: incubation.active && !readyNow, sparkle: readyNow }">{{ cardIcon }}</div>
    <div class="egl-body">
      <div class="egl-title">{{ t('eggs.machineTitle') }}</div>
      <div class="egl-sub">
        <template v-if="incubation.active && !readyNow">{{ t('eggs.brewing', { name: currentEggName }) }}</template>
        <template v-else>{{ subtitleText }}</template>
      </div>
      <div v-if="incubation.active && !readyNow" class="egl-progress">
        <div class="egl-progress-fill" :style="{ width: (progress * 100) + '%' }"></div>
      </div>
      <div v-if="incubation.active && !readyNow" class="egl-countdown">{{ fmtTime(remainingMs) }}</div>
      <div v-else-if="readyNow" class="egl-status-pill ready">{{ t('eggs.ready') }}</div>
    </div>
    <div class="egl-arrow">{{ arrowGlyph }}</div>
  </div>

  <div v-if="showPicker" class="egg-picker-overlay" @click.self="showPicker = false">
    <div class="egg-picker-dialog">
      <div class="row between" style="align-items:center;margin-bottom:10px">
        <h3 style="margin:0;font-size:18px">{{ t('eggs.pickEgg') }}</h3>
        <Button class="btn secondary small" @click="showPicker = false">×</Button>
      </div>
      <div class="egg-picker-list">
        <div v-for="g in groupedEggs" :key="g.egg_type" class="egg-picker-row">
          <span class="egg-picker-emoji">{{ EGG_TYPES[g.egg_type]?.emoji || '🥚' }}</span>
          <span class="egg-picker-name">{{ EGG_TYPES[g.egg_type]?.name || g.egg_type }} ×{{ g.list.length }}</span>
          <Button class="btn small" :disabled="busy" @click="startIncubation(g.list[0].id)">
            {{ t('eggs.startIncubation') }}
          </Button>
        </div>
      </div>
    </div>
  </div>

  <div v-if="hatchResult" class="hatch-modal" @click.self="closeHatchResult">
    <div class="hatch-dialog">
      <div class="hatch-emoji">{{ speciesInfo(hatchResult.species).emoji }}</div>
      <div class="hatch-rarity" :style="{ color: rarityInfo(hatchResult.rarity).color }">
        {{ rarityInfo(hatchResult.rarity).emoji }} {{ t('rarity.' + hatchResult.rarity).toUpperCase() }}
      </div>
      <div class="hatch-name">{{ speciesInfo(hatchResult.species).name }}</div>
      <Button class="btn full" @click="closeHatchResult">OK</Button>
    </div>
  </div>
</template>

<style scoped>
.egg-link {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  background:
    radial-gradient(circle at 0% 0%, rgba(168, 85, 247, 0.20), transparent 55%),
    radial-gradient(circle at 100% 100%, rgba(255, 209, 102, 0.16), transparent 60%),
    linear-gradient(135deg, #2a1f4d, #0d1130);
  border: 1px solid rgba(168, 85, 247, 0.35);
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}
.egg-link:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: 0 12px 28px rgba(168, 85, 247, 0.22);
}
.egg-link.is-disabled {
  cursor: default;
  filter: grayscale(0.45);
  opacity: 0.78;
}
.egg-link.is-disabled:hover {
  transform: none;
  box-shadow: none;
}
.egg-link.is-brewing {
  cursor: default;
  border-color: rgba(72, 202, 228, 0.5);
}
.egg-link.is-brewing:hover {
  transform: none;
}
.egg-link.is-ready {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent) inset, 0 12px 28px rgba(255, 209, 102, 0.28);
  animation: readyGlow 1.4s ease-in-out infinite;
}
@keyframes readyGlow {
  0%, 100% { box-shadow: 0 0 0 1px var(--accent) inset, 0 12px 28px rgba(255, 209, 102, 0.22); }
  50% { box-shadow: 0 0 0 1px var(--accent) inset, 0 12px 36px rgba(255, 209, 102, 0.45); }
}
.egl-icon {
  font-size: 36px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.45));
  flex-shrink: 0;
  animation: bplFloat 3s ease-in-out infinite;
}
.egl-icon.shake {
  animation: eggShake 0.9s ease-in-out infinite;
}
.egl-icon.sparkle {
  animation: eggSparkle 1s ease-in-out infinite;
}
@keyframes bplFloat {
  0%, 100% { transform: translateY(0) rotate(-3deg); }
  50% { transform: translateY(-3px) rotate(3deg); }
}
@keyframes eggShake {
  0%, 100% { transform: translate(0, 0) rotate(0); }
  20% { transform: translate(-2px, -1px) rotate(-6deg); }
  40% { transform: translate(2px, 1px) rotate(6deg); }
  60% { transform: translate(-2px, 1px) rotate(-4deg); }
  80% { transform: translate(2px, -1px) rotate(4deg); }
}
@keyframes eggSparkle {
  0%, 100% { transform: scale(1) rotate(0); filter: drop-shadow(0 0 8px rgba(255, 209, 102, 0.6)); }
  50% { transform: scale(1.15) rotate(8deg); filter: drop-shadow(0 0 18px rgba(255, 209, 102, 1)); }
}
.egl-body { flex: 1; min-width: 0; }
.egl-title {
  font-weight: 800;
  font-size: 16px;
  background: linear-gradient(90deg, #ffd166, #ff6bd6, #a855f7);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.egl-sub {
  font-size: 12px;
  color: var(--muted);
  font-weight: 700;
  margin-top: 2px;
}
.egl-progress {
  margin-top: 8px;
  height: 8px;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.egl-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #a855f7, #ffd166);
  transition: width 1s linear;
}
.egl-countdown {
  margin-top: 4px;
  font-size: 12px;
  font-weight: 800;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.egl-status-pill {
  margin-top: 6px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  background: rgba(255, 209, 102, 0.18);
  border: 1px solid rgba(255, 209, 102, 0.55);
  color: var(--accent);
}
.egl-arrow {
  font-size: 30px;
  color: var(--accent);
  font-weight: 800;
  line-height: 1;
  flex-shrink: 0;
}

.egg-picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
  padding: 16px;
  backdrop-filter: blur(4px);
}
.egg-picker-dialog {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 18px 20px;
  width: min(360px, 92vw);
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.45);
}
.egg-picker-list { display: flex; flex-direction: column; gap: 8px; }
.egg-picker-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--card-2);
  border-radius: 10px;
  border: 1px solid var(--border);
}
.egg-picker-emoji { font-size: 22px; }
.egg-picker-name { flex: 1; font-weight: 600; }
.btn.small { padding: 6px 10px; font-size: 13px; }

.hatch-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
  padding: 16px;
}
.hatch-dialog {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 28px 24px;
  text-align: center;
  min-width: 280px;
  max-width: 360px;
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.45);
  animation: hatch-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes hatch-pop {
  0% { opacity: 0; transform: scale(0.4); }
  60% { opacity: 1; transform: scale(1.1); }
  100% { opacity: 1; transform: scale(1); }
}
.hatch-emoji {
  font-size: 88px;
  margin-bottom: 12px;
  filter: drop-shadow(0 0 18px rgba(255, 209, 102, 0.7));
}
.hatch-rarity { font-weight: 800; font-size: 14px; margin-bottom: 6px; letter-spacing: 1.5px; }
.hatch-name { font-size: 22px; font-weight: 800; margin-bottom: 18px; }
</style>
