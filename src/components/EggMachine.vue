<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'
import { useAppToast } from '../composables/useAppToast'
import { speciesInfo } from '../animals'
import { rarityInfo, EGG_TYPES, loadEggCatalog } from '../eggs'
import { slotRemainingMs, slotReady, slotProgress, freeSlots } from '../eggSlots'
import { t } from '../i18n'

const game = useGameStore()
const toast = useAppToast()
const now = ref(Date.now())
const open = ref(false)
const busy = ref(false)
const hatchResult = ref(null)
const selectedType = ref('')

let timer
onMounted(async () => {
  await loadEggCatalog()
  await game.loadIncubation()
  timer = setInterval(() => {
    if (document.visibilityState === 'visible') now.value = Date.now()
  }, 1000)
})
onUnmounted(() => clearInterval(timer))

const playerEggs = computed(() => game.playerEggs || [])

const groupedEggs = computed(() => {
  const m = {}
  for (const e of playerEggs.value) {
    if (!m[e.egg_type]) m[e.egg_type] = { egg_type: e.egg_type, list: [] }
    m[e.egg_type].list.push(e)
  }
  return Object.values(m)
})

// Auswahl bleibt gültig, solange noch ein Ei dieses Typs da ist.
const selectedGroup = computed(() =>
  groupedEggs.value.find((g) => g.egg_type === selectedType.value) || null
)

function eggMeta(type) {
  return EGG_TYPES[type] || {}
}

const serverNow = computed(() => now.value + (game.serverOffset || 0))

// ── Brutplätze ────────────────────────────────────────────────────────
const slots = computed(() => game.incubation?.slots || [])
const maxSlots = computed(() => game.incubation?.maxSlots || slots.value.length || 1)
const free = computed(() => freeSlots(game.incubation))
const busyCount = computed(() => maxSlots.value - free.value)
const anyActive = computed(() => busyCount.value > 0)

const slotRows = computed(() => slots.value.map((s) => {
  const meta = eggMeta(s.egg_type)
  const ready = slotReady(s, serverNow.value)
  return {
    ...s,
    meta,
    ready,
    remaining: slotRemainingMs(s, serverNow.value),
    pct: ready ? 100 : Math.round(slotProgress(s, serverNow.value, meta.incubation_minutes || 60) * 100),
  }
}))

// Mit zwei freien Plätzen und genug Eiern lassen sich beide auf einmal füllen.
const canStartTwo = computed(() =>
  free.value >= 2 && (selectedGroup.value?.list.length || 0) >= 2
)

function fmtTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mmss = `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return h > 0 ? `${h}:${mmss}` : mmss
}

function toggleOpen() {
  open.value = !open.value
  if (open.value && !selectedType.value && groupedEggs.value.length === 1) {
    selectedType.value = groupedEggs.value[0].egg_type
  }
}

function openPicker() {
  if (!open.value) toggleOpen()
}

async function startIncubation(count = 1) {
  const group = selectedGroup.value
  if (!group || busy.value || free.value < 1) return
  // IDs vorher festhalten — die Eier-Liste wird nach jedem Start neu geladen.
  const ids = group.list.slice(0, Math.min(count, free.value)).map((e) => e.id)
  busy.value = true
  try {
    for (const id of ids) await game.startIncubation(id)
  } catch (e) {
    toast.err(e)
  } finally {
    busy.value = false
    if (!selectedGroup.value) selectedType.value = ''
    // Offen lassen, solange noch ein Platz frei ist und Eier da sind.
    if (free.value < 1 || !groupedEggs.value.length) open.value = false
  }
}

async function claim(slot) {
  if (busy.value || !slotReady(slot, serverNow.value)) return
  busy.value = true
  try {
    hatchResult.value = await game.claimHatched(slot.slot)
  } catch (e) { toast.err(e) } finally { busy.value = false }
}

const startLabel = computed(() => {
  if (free.value < 1) return t('eggs.allBusy')
  if (busy.value) return t('common.loadingShort')
  if (!selectedGroup.value) return t('eggs.pickEgg')
  return t('eggs.startIncubation')
})
</script>

<template>
  <!-- Eier-Maschine (gleiche Optik wie Crafter & Fusion), zwei Brutplätze -->
  <div class="card egg-card">
    <div class="row between" style="margin-bottom: 8px">
      <div class="egg-head">
        <h2 class="title" style="margin: 0; font-size: 18px">{{ t('eggs.machineTitle') }}</h2>
        <span class="egg-slots-pill" :class="{ full: free < 1 }">
          {{ t('eggs.slotsCount', { busy: busyCount, max: maxSlots }) }}
        </span>
      </div>
      <Button class="btn fusion-toggle" @click="toggleOpen">
        {{ open ? t('eggs.toggleClose') : t('eggs.toggleOpen') }}
      </Button>
    </div>
    <p class="hint">{{ t('eggs.hint', { max: maxSlots }) }}</p>

    <Button v-if="!open && !anyActive" class="fusion-preview" @click="toggleOpen">
      <span class="fusion-preview-emoji">🥚</span>
      <span class="fusion-preview-label">
        {{ playerEggs.length ? t('eggs.empty') : t('eggs.noEggs') }}
      </span>
    </Button>

    <template v-if="anyActive">
      <div
        v-for="s in slotRows"
        :key="s.slot"
        class="craft-job"
        :class="{ ready: s.ready, empty: !s.active }"
      >
        <div v-if="s.active" class="craft-job-row">
          <div class="craft-job-emoji" :class="s.ready ? 'sparkle' : 'shake'">
            {{ s.ready ? '🐣' : (s.meta.emoji || '🥚') }}
          </div>
          <div class="craft-job-body">
            <div class="craft-job-title">
              <span class="egg-slot-no">#{{ s.slot }}</span> {{ s.meta.name || s.egg_type }}
            </div>
            <div class="craft-job-time">
              {{ s.ready ? t('eggs.ready') : t('eggs.readyIn', { time: fmtTime(s.remaining) }) }}
            </div>
            <div class="craft-job-bar"><span :style="{ width: s.pct + '%' }"></span></div>
          </div>
          <Button class="btn small" :disabled="!s.ready || busy" @click="claim(s)">
            {{ t('eggs.claim') }}
          </Button>
        </div>
        <div v-else class="craft-job-row">
          <div class="craft-job-emoji egg-free-emoji">🥚</div>
          <div class="craft-job-body">
            <div class="craft-job-title">
              <span class="egg-slot-no">#{{ s.slot }}</span> {{ t('eggs.slotFree') }}
            </div>
            <div class="craft-job-time">
              {{ playerEggs.length ? t('eggs.empty') : t('eggs.noEggs') }}
            </div>
          </div>
          <Button
            class="btn secondary small"
            :disabled="!playerEggs.length"
            @click="openPicker"
          >{{ t('eggs.fill') }}</Button>
        </div>
      </div>
    </template>

    <div v-if="open" class="fusion-body">
      <div v-if="!groupedEggs.length" class="hint" style="text-align: center; padding: 12px">
        {{ t('eggs.noEggs') }}
      </div>

      <template v-else>
        <div class="fusion-machine">
          <div class="fm-slot">
            <div class="fm-slot-title">{{ t('eggs.slotEgg') }}</div>
            <div class="fm-slot-body">
              <div v-if="selectedGroup" class="egg-slot-pick">
                <span class="fm-chip big">{{ eggMeta(selectedGroup.egg_type).emoji || '🥚' }}</span>
                <span class="egg-slot-meta">
                  ⏳ {{ t('eggs.minutes', { minutes: eggMeta(selectedGroup.egg_type).incubation_minutes || 60 }) }}
                </span>
              </div>
              <div v-else class="hint" style="margin: 0">{{ t('eggs.pickEgg') }}</div>
            </div>
          </div>

          <div class="fm-core">
            <div class="fm-factory" :class="{ busy: free < 1 }">🐣</div>
            <div v-if="busy" class="hint">{{ t('common.loadingShort') }}</div>
          </div>

          <div class="fm-slot">
            <div class="fm-slot-title">{{ t('eggs.slotResult') }}</div>
            <div class="fm-slot-body">
              <div v-if="selectedGroup" class="egg-slot-pick">
                <span class="fm-chip big egg-mystery">❓</span>
                <span class="egg-slot-meta">{{ t('eggs.mystery') }}</span>
              </div>
              <div v-else class="hint" style="margin: 0">?</div>
            </div>
          </div>
        </div>

        <div class="fm-controls">
          <div class="fm-row">
            <label class="hint" style="margin: 0">{{ t('eggs.yourEggs') }}</label>
            <div class="fm-species-grid">
              <Button
                v-for="g in groupedEggs"
                :key="g.egg_type"
                class="fm-sp-btn"
                :class="{ active: selectedType === g.egg_type }"
                @click="selectedType = g.egg_type"
              >
                <span class="fm-sp-emoji">{{ eggMeta(g.egg_type).emoji || '🥚' }}</span>
                <span class="fm-sp-count">{{ eggMeta(g.egg_type).name || g.egg_type }} ×{{ g.list.length }}</span>
              </Button>
            </div>
          </div>

          <div class="egg-start-row" :class="{ two: canStartTwo }">
            <Button
              class="btn full"
              :disabled="!selectedGroup || busy || free < 1"
              @click="startIncubation(1)"
            >
              {{ startLabel }}
            </Button>
            <Button
              v-if="canStartTwo"
              class="btn full"
              :disabled="busy"
              @click="startIncubation(2)"
            >
              {{ t('eggs.startTwo') }}
            </Button>
          </div>
        </div>
      </template>
    </div>
  </div>

  <div v-if="hatchResult" class="hatch-modal" @click.self="hatchResult = null">
    <div class="hatch-dialog">
      <div class="hatch-emoji">{{ speciesInfo(hatchResult.species).emoji }}</div>
      <div class="hatch-rarity" :style="{ color: rarityInfo(hatchResult.rarity).color }">
        {{ rarityInfo(hatchResult.rarity).emoji }} {{ t('rarity.' + hatchResult.rarity).toUpperCase() }}
      </div>
      <div class="hatch-name">{{ speciesInfo(hatchResult.species).name }}</div>
      <Button class="btn full" @click="hatchResult = null">OK</Button>
    </div>
  </div>
</template>

<style scoped>
/* Maschinen-Optik gespiegelt aus GameView (.crafter-card / .fusion-card). */
.egg-card { position: relative; }
.hint {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  margin: 0 0 8px;
}
.fusion-toggle {
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 800;
  min-height: 40px;
}
.btn.small {
  padding: 6px 10px;
  font-size: 12px;
}
.fusion-preview {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: var(--card-2);
  border: 2px dashed var(--border);
  border-radius: 18px;
  padding: 18px 14px;
  margin-bottom: 8px;
  cursor: pointer;
  color: inherit;
  font: inherit;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.08s ease;
}
.fusion-preview:hover {
  background: var(--surface-deep);
  border-color: var(--accent);
  transform: translateY(-1px);
}
.fusion-preview-emoji {
  font-size: 56px;
  line-height: 1;
  animation: bob 2.2s ease-in-out infinite;
  filter: drop-shadow(0 4px 8px rgba(110, 80, 20, 0.25));
}
.fusion-preview-label {
  font-weight: 800;
  font-size: 15px;
  color: var(--heading);
}

.egg-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}
.egg-slots-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid rgba(168, 85, 247, 0.4);
  color: var(--purple-deep);
  font-variant-numeric: tabular-nums;
}
.egg-slots-pill.full {
  background: rgba(244, 169, 18, 0.14);
  border-color: rgba(244, 169, 18, 0.5);
  color: var(--accent-deep);
}
.craft-job.empty {
  background: var(--card-2);
  border: 2px dashed var(--border);
}
.egg-free-emoji { opacity: 0.35; filter: grayscale(1); }
.egg-slot-no {
  font-size: 11px;
  font-weight: 900;
  color: var(--muted);
  margin-right: 2px;
}
.egg-start-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}
.egg-start-row.two {
  grid-template-columns: 1fr 1fr;
}

/* Laufender Brutvorgang — wie .craft-job */
.craft-job {
  margin: 6px 0 10px;
  padding: 10px 12px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(96, 165, 250, 0.10));
  border: 2px solid rgba(124, 58, 237, 0.25);
}
.craft-job.ready {
  background: linear-gradient(135deg, rgba(46, 194, 114, 0.12), rgba(251, 211, 92, 0.14));
  border-color: rgba(46, 194, 114, 0.5);
  animation: cardPulse 2s ease-in-out infinite;
}
.craft-job-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.craft-job-emoji { font-size: 32px; flex-shrink: 0; }
.craft-job-emoji.shake { animation: eggShake 0.9s ease-in-out infinite; }
.craft-job-emoji.sparkle { animation: eggSparkle 1s ease-in-out infinite; }
.craft-job-body { flex: 1; min-width: 0; }
.craft-job-title { font-weight: 800; font-size: 14px; color: var(--heading); }
.craft-job-time {
  font-size: 12px;
  color: var(--muted);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.craft-job-bar {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: var(--surface-deep);
  overflow: hidden;
  border: 1px solid var(--border);
  margin-top: 4px;
}
.craft-job-bar span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #a855f7, var(--accent));
  transition: width 1s linear;
}
.craft-job.ready .craft-job-bar span {
  background: linear-gradient(90deg, #2ec272, #fbd35c);
}

/* Maschinen-Anzeige — wie .fusion-machine */
.fusion-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 8px;
}
.fusion-machine {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 10px;
  align-items: stretch;
  margin-bottom: 12px;
}
.fm-slot {
  background: var(--card-2);
  border: 2px solid var(--border);
  border-radius: 18px;
  padding: 10px;
  min-height: 110px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.fm-slot-title {
  font-weight: 800;
  font-size: 12px;
  color: var(--muted);
}
.fm-slot-body {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  justify-content: center;
  flex: 1;
}
.fm-chip {
  font-size: 26px;
  background: var(--card);
  padding: 4px 8px;
  border-radius: 12px;
  border: 2px solid var(--border);
}
.fm-chip.big {
  font-size: 44px;
  padding: 6px 14px;
}
.fm-chip.egg-mystery {
  filter: drop-shadow(0 0 10px rgba(168, 85, 247, 0.45));
  border-color: rgba(168, 85, 247, 0.45);
  animation: bob 2.4s ease-in-out infinite;
}
.egg-slot-pick {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.egg-slot-meta {
  font-size: 10px;
  font-weight: 800;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.fm-core {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}
.fm-factory {
  font-size: 64px;
  animation: bob 2.2s ease-in-out infinite;
  filter: drop-shadow(0 4px 8px rgba(110, 80, 20, 0.25));
}
.fm-factory.busy {
  animation: eggShake 0.9s ease-in-out infinite;
}
.fm-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fm-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.fm-species-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
  gap: 6px;
}
.fm-sp-btn {
  background: var(--card-2);
  border: 2px solid var(--border);
  border-radius: 12px;
  padding: 6px 4px;
  cursor: pointer;
  color: inherit;
  font: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.fm-sp-btn.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent) inset;
}
.fm-sp-emoji {
  font-size: 24px;
  line-height: 1;
}
.fm-sp-count {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  text-align: center;
}
@media (max-width: 520px) {
  .fm-factory { font-size: 48px; }
  .fm-chip { font-size: 22px; padding: 3px 6px; }
  .fm-chip.big { font-size: 34px; padding: 4px 10px; }
}

@keyframes bob {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-4px) rotate(2deg); }
}
@keyframes cardPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.012); }
}
@keyframes eggShake {
  0%, 100% { transform: translate(0, 0) rotate(0); }
  20% { transform: translate(-2px, -1px) rotate(-6deg); }
  40% { transform: translate(2px, 1px) rotate(6deg); }
  60% { transform: translate(-2px, 1px) rotate(-4deg); }
  80% { transform: translate(2px, -1px) rotate(4deg); }
}
@keyframes eggSparkle {
  0%, 100% { transform: scale(1) rotate(0); filter: drop-shadow(0 0 8px rgba(244, 169, 18, 0.6)); }
  50% { transform: scale(1.15) rotate(8deg); filter: drop-shadow(0 0 18px rgba(244, 169, 18, 1)); }
}

.hatch-modal {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
  padding: 16px;
}
.hatch-dialog {
  background: var(--card);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  padding: 28px 24px;
  text-align: center;
  min-width: 280px;
  max-width: 360px;
  box-shadow: var(--shadow-pop);
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
  filter: drop-shadow(0 0 18px rgba(244, 169, 18, 0.7));
}
.hatch-rarity { font-weight: 800; font-size: 14px; margin-bottom: 6px; letter-spacing: 1.5px; }
.hatch-name { font-size: 22px; font-weight: 800; margin-bottom: 18px; color: var(--heading); }
</style>
