<script setup>
import { ref, computed, onMounted } from 'vue'
import { useGameStore } from '../stores/game'
import { supabase } from '../supabase'
import { speciesInfo, formatCoins, tierInfo, TIERS, isUpgrading, animalRate } from '../animals'

const game = useGameStore()
const error = ref('')
const success = ref('')
const busy = ref('')
const slotInfo = ref({ current_slots: 1, next_slot: 2, next_cost: null })
const filter = ref('all') // all | equipped | normal | gold | diamond | epic | rainbow

async function loadSlot() {
  const { data } = await supabase.rpc('get_next_slot_cost')
  slotInfo.value = data || slotInfo.value
}

onMounted(async () => {
  if (!game.animals.length) await game.load()
  await loadSlot()
})

const enriched = computed(() =>
  game.animals.map(a => ({
    ...a,
    info: speciesInfo(a.species),
    td: tierInfo(a.tier || 'normal'),
    t: a.tier || 'normal',
    rate: animalRate(a),
    upgrading: isUpgrading(a)
  }))
)

const tierOrder = ['rainbow', 'epic', 'diamond', 'gold', 'normal']

const groups = computed(() => {
  const src = enriched.value.filter(a => {
    if (filter.value === 'all') return true
    if (filter.value === 'equipped') return a.equipped
    return a.t === filter.value
  })
  const byTier = {}
  for (const a of src) {
    (byTier[a.t] ||= []).push(a)
  }
  for (const t of Object.keys(byTier)) {
    byTier[t].sort((a, b) => {
      if (a.equipped !== b.equipped) return a.equipped ? -1 : 1
      return b.info.cost - a.info.cost
    })
  }
  return tierOrder
    .filter(t => byTier[t]?.length)
    .map(t => ({ tier: t, td: TIERS[t] || tierInfo(t), list: byTier[t] }))
})

const counts = computed(() => {
  const c = { all: enriched.value.length, equipped: 0 }
  for (const t of tierOrder) c[t] = 0
  for (const a of enriched.value) {
    if (a.equipped) c.equipped++
    c[a.t] = (c[a.t] || 0) + 1
  }
  return c
})

async function toggle(animal) {
  error.value = ''; success.value = ''
  busy.value = animal.id
  try {
    if (animal.equipped) {
      await game.unequipAnimal(animal.id)
    } else {
      if (game.freeSlots <= 0) throw new Error('Keine freien Slots — erst einen kaufen oder anderes Tier abziehen.')
      await game.equipAnimal(animal.id)
    }
  } catch (e) { error.value = e.message }
  finally { busy.value = '' }
}

async function buySlot() {
  error.value = ''; success.value = ''
  busy.value = 'slot'
  try {
    const data = await game.buyEquipSlot()
    success.value = `Slot ${data.equip_slots} freigeschaltet!`
    await loadSlot()
  } catch (e) { error.value = e.message }
  finally { busy.value = '' }
}

const filters = [
  { k: 'all', label: 'Alle', badge: '📦' },
  { k: 'equipped', label: 'Aktiv', badge: '🎯' },
  { k: 'rainbow', label: 'Rainbow', badge: '🌈' },
  { k: 'epic', label: 'Episch', badge: '🟣' },
  { k: 'diamond', label: 'Diamant', badge: '💎' },
  { k: 'gold', label: 'Gold', badge: '🥇' },
  { k: 'normal', label: 'Normal', badge: '⚪' }
]
</script>

<template>
  <h1 class="title">📦 Inventar</h1>

  <div class="card row between">
    <div>
      <div class="subtitle" style="margin:0">Ausrüst-Slots</div>
      <div style="font-weight:800;font-size:18px">
        {{ game.equippedCount }} / {{ game.equipSlots }}
      </div>
    </div>
    <div style="text-align:right">
      <div class="subtitle" style="margin:0">
        <template v-if="slotInfo.next_cost != null">Slot {{ slotInfo.next_slot }}</template>
        <template v-else>Max erreicht</template>
      </div>
      <button
        v-if="slotInfo.next_cost != null"
        class="btn"
        :disabled="busy==='slot' || game.displayCoins < slotInfo.next_cost"
        @click="buySlot"
      >
        🪙 {{ formatCoins(slotInfo.next_cost) }}
      </button>
    </div>
  </div>

  <p v-if="error" class="error">{{ error }}</p>
  <p v-if="success" class="success">{{ success }}</p>

  <div class="card filter-card">
    <div class="filter-bar">
      <button
        v-for="f in filters"
        :key="f.k"
        class="filter-chip"
        :class="{ active: filter === f.k }"
        :disabled="!counts[f.k]"
        @click="filter = f.k"
      >
        <span>{{ f.badge }}</span>
        <span>{{ f.label }}</span>
        <span class="filter-count">{{ counts[f.k] || 0 }}</span>
      </button>
    </div>
  </div>

  <div v-if="!enriched.length" class="card subtitle">
    Noch keine Tiere. Geh in den Shop und kauf dein erstes Tier!
  </div>

  <div v-for="g in groups" :key="g.tier" class="card tier-group" :style="{ '--tier-color': g.td.color || '#aaa' }">
    <div class="tier-head">
      <span class="tier-head-badge">{{ g.td.badge || '⚪' }}</span>
      <span class="tier-head-name">{{ g.tier }}</span>
      <span class="tier-head-meta">×{{ (g.td.multiplier || 1).toFixed(2) }} · {{ g.list.length }} Tier{{ g.list.length === 1 ? '' : 'e' }}</span>
    </div>
    <div v-for="a in g.list" :key="a.id" class="inv-row" :class="{ active: a.equipped, tiered: a.t !== 'normal' }" :style="{ '--row-tier': a.td.color }">
      <div class="inv-emoji">
        {{ a.info.emoji }}
        <span v-if="a.td.badge" class="inv-badge">{{ a.td.badge }}</span>
      </div>
      <div class="inv-body">
        <div class="inv-name">
          {{ a.info.name }}
          <span v-if="a.id === game.favoriteAnimalId" class="star">⭐</span>
        </div>
        <div class="inv-meta">
          <span v-if="a.upgrading" class="chip upg">⏳ wird aufgewertet</span>
          <span v-else-if="a.equipped" class="chip on">aktiv · +{{ formatCoins(a.rate) }}/s</span>
          <span v-else class="chip off">inaktiv · +{{ formatCoins(a.rate) }}/s</span>
        </div>
      </div>
      <button
        class="btn"
        :class="{ secondary: !a.equipped, danger: a.equipped }"
        :disabled="busy===a.id || a.upgrading || (!a.equipped && game.freeSlots <= 0)"
        @click="toggle(a)"
      >
        {{ a.equipped ? 'Abziehen' : 'Ausrüsten' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.filter-card { padding: 8px; }
.filter-bar {
  display: flex; gap: 6px; overflow-x: auto; padding: 2px;
  scrollbar-width: thin;
}
.filter-chip {
  flex: 0 0 auto;
  display: inline-flex; align-items: center; gap: 4px;
  background: #162048; border: 1px solid var(--border);
  color: inherit; font: inherit;
  padding: 6px 10px; border-radius: 999px; cursor: pointer;
  font-size: 12px;
}
.filter-chip.active {
  background: var(--accent); color: #1b1300; border-color: var(--accent);
  font-weight: 700;
}
.filter-chip:disabled { opacity: 0.4; cursor: not-allowed; }
.filter-count {
  background: rgba(255,255,255,0.1); padding: 1px 6px; border-radius: 999px;
  font-size: 10px; font-weight: 700;
}
.filter-chip.active .filter-count { background: rgba(0,0,0,0.15); }

.tier-group {
  --tier-color: #aaa;
  border-left: 3px solid color-mix(in srgb, var(--tier-color) 80%, transparent);
}
.tier-head {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 0 8px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 8px;
}
.tier-head-badge { font-size: 20px; }
.tier-head-name {
  font-weight: 800; text-transform: capitalize;
  color: color-mix(in srgb, var(--tier-color) 80%, #fff);
}
.tier-head-meta {
  font-size: 11px; color: var(--muted);
  margin-left: auto;
}

.inv-row {
  --row-tier: transparent;
  display: flex; gap: 10px; align-items: center;
  padding: 8px 4px;
  border-bottom: 1px solid var(--border);
}
.inv-row:last-child { border-bottom: none; }
.inv-row.active { background: rgba(6, 214, 160, 0.06); border-radius: 8px; padding: 8px; }
.inv-row.tiered .inv-emoji {
  background: radial-gradient(circle, color-mix(in srgb, var(--row-tier) 30%, transparent), transparent 70%);
  border-radius: 50%;
}
.inv-emoji {
  position: relative; font-size: 30px; line-height: 1;
  width: 48px; height: 48px;
  display: flex; align-items: center; justify-content: center;
}
.inv-badge {
  position: absolute; bottom: -2px; right: -2px;
  font-size: 14px;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.6));
}
.inv-body { flex: 1; min-width: 0; }
.inv-name { font-weight: 700; font-size: 14px; }
.inv-name .star { font-size: 11px; margin-left: 4px; }
.inv-meta { font-size: 11px; margin-top: 2px; }
.chip {
  display: inline-block;
  padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700;
}
.chip.on { background: rgba(6,214,160,0.18); color: var(--accent-2); }
.chip.off { color: var(--muted); background: rgba(255,255,255,0.04); }
.chip.upg { background: rgba(255,209,102,0.15); color: var(--accent); }
</style>
