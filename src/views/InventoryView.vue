<script setup>
import { ref, computed, onMounted } from 'vue'
import { useGameStore } from '../stores/game'
import { supabase } from '../supabase'
import { speciesInfo, formatCoins } from '../animals'

const game = useGameStore()
const error = ref('')
const success = ref('')
const busy = ref('')
const slotInfo = ref({ current_slots: 1, next_slot: 2, next_cost: null })

async function loadSlot() {
  const { data } = await supabase.rpc('get_next_slot_cost')
  slotInfo.value = data || slotInfo.value
}

onMounted(async () => {
  if (!game.animals.length) await game.load()
  await loadSlot()
})

const grouped = computed(() => {
  const list = game.animals.map(a => ({ ...a, info: speciesInfo(a.species) }))
  list.sort((a, b) => {
    if (a.equipped !== b.equipped) return a.equipped ? -1 : 1
    return b.info.cost - a.info.cost
  })
  return list
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

  <div class="card">
    <div v-if="!grouped.length" class="subtitle">
      Noch keine Tiere. Geh in den Shop und kauf dein erstes Tier!
    </div>
    <div v-else>
      <div class="subtitle" style="margin-bottom:8px">
        {{ grouped.length }} Tier{{ grouped.length === 1 ? '' : 'e' }}
        · Freie Slots: {{ game.freeSlots }}
      </div>
      <div v-for="a in grouped" :key="a.id" class="inv-item" :class="{ active: a.equipped }">
        <div class="emoji">{{ a.info.emoji }}</div>
        <div class="body">
          <div class="title-sm">{{ a.info.name }}</div>
          <div class="sub">
            <span v-if="a.equipped" class="badge">aktiv · +{{ formatCoins(a.info.rate) }}/s</span>
            <span v-else style="color:var(--muted)">inaktiv</span>
          </div>
        </div>
        <button
          class="btn"
          :class="{ secondary: !a.equipped, danger: a.equipped }"
          :disabled="busy===a.id || (!a.equipped && game.freeSlots <= 0)"
          @click="toggle(a)"
        >
          {{ a.equipped ? 'Abziehen' : 'Ausrüsten' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inv-item {
  display: flex; gap: 10px; align-items: center;
  padding: 10px; border-bottom: 1px solid var(--border);
}
.inv-item:last-child { border-bottom: none; }
.inv-item.active { background: rgba(6, 214, 160, 0.06); border-radius: 8px; }
.inv-item .emoji { font-size: 30px; }
.inv-item .body { flex: 1; min-width: 0; }
</style>
