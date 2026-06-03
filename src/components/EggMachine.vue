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

const currentEggName = computed(() => {
  return EGG_TYPES[incubation.value?.egg_type]?.name || 'Ei'
})

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
  <div class="card egg-machine">
    <div class="row between" style="align-items:flex-start">
      <div style="font-weight:800;font-size:18px">{{ t('eggs.machineTitle') }}</div>
    </div>

    <template v-if="readyNow">
      <div class="ready-banner">{{ t('eggs.ready') }}</div>
      <Button class="btn full" :disabled="busy" @click="claim">
        {{ busy ? t('common.loadingShort') : t('eggs.claim') }}
      </Button>
    </template>

    <template v-else-if="incubation.active">
      <div class="brewing">
        <div class="brewing-label">{{ t('eggs.brewing', { name: currentEggName }) }}</div>
        <div class="progress-bar"><div class="progress-fill" :style="{ width: (progress * 100) + '%' }"></div></div>
        <div class="countdown">{{ t('eggs.readyIn', { time: fmtTime(remainingMs) }) }}</div>
      </div>
    </template>

    <template v-else>
      <p class="subtitle" style="margin:6px 0">{{ t('eggs.empty') }}</p>
      <div v-if="!playerEggs.length" class="subtitle">{{ t('eggs.noEggs') }}</div>
      <template v-else>
        <Button class="btn full" :disabled="busy" @click="showPicker = !showPicker">
          {{ showPicker ? '×' : t('eggs.pickEgg') }}
        </Button>
        <div v-if="showPicker" class="picker">
          <div v-for="g in groupedEggs" :key="g.egg_type" class="picker-row">
            <span class="picker-emoji">{{ EGG_TYPES[g.egg_type]?.emoji || '🥚' }}</span>
            <span class="picker-name">{{ EGG_TYPES[g.egg_type]?.name || g.egg_type }} ×{{ g.list.length }}</span>
            <Button class="btn small" :disabled="busy" @click="startIncubation(g.list[0].id)">
              {{ t('eggs.startIncubation') }}
            </Button>
          </div>
        </div>
      </template>
    </template>

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
  </div>
</template>

<style scoped>
.egg-machine {
  margin-bottom: 10px;
  background: linear-gradient(135deg, #4a2f5c, #1d3a4c);
  border-color: var(--accent);
  position: relative;
}
.ready-banner {
  font-weight: 800;
  color: var(--accent);
  margin: 10px 0;
  text-align: center;
  font-size: 16px;
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.02); }
}
.brewing { margin-top: 8px; }
.brewing-label { font-weight: 700; margin-bottom: 6px; }
.progress-bar {
  background: var(--card-2);
  height: 12px;
  border-radius: 999px;
  overflow: hidden;
  margin: 6px 0;
  border: 1px solid var(--border);
}
.progress-fill {
  background: linear-gradient(90deg, var(--accent), var(--accent-2));
  height: 100%;
  transition: width 1s linear;
}
.countdown {
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  font-size: 16px;
  color: var(--accent);
}
.picker {
  margin-top: 8px;
  background: var(--card-2);
  border-radius: 10px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.picker-row { display: flex; align-items: center; gap: 8px; }
.picker-emoji { font-size: 22px; }
.picker-name { flex: 1; font-weight: 600; }
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
.hatch-rarity {
  font-weight: 800;
  font-size: 14px;
  margin-bottom: 6px;
  letter-spacing: 1.5px;
}
.hatch-name {
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 18px;
}
</style>
