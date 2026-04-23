<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../supabase'
import { useAuthStore } from '../stores/auth'
import { SPECIES, loadCatalog, tierInfo } from '../animals'

const route = useRoute()
const auth = useAuthStore()

const entries = ref([])
const profile = ref(null)
const loading = ref(false)
const error = ref('')
const filter = ref('all') // all | normal | gold | diamond | epic | rainbow

const tierOrder = ['normal', 'gold', 'diamond', 'epic', 'rainbow']
const tierRank = { normal: 0, gold: 1, diamond: 2, epic: 3, rainbow: 4 }

const username = computed(() => String(route.query.u || auth.profile?.username || ''))
const isSelf = computed(() => auth.profile?.username === username.value)

async function load() {
  if (!username.value) return
  loading.value = true; error.value = ''
  try {
    if (!Object.keys(SPECIES).length) await loadCatalog()
    const { data: p, error: pe } = await supabase.from('profiles')
      .select('id, username, avatar_emoji').eq('username', username.value).maybeSingle()
    if (pe) throw pe
    if (!p) { error.value = 'Spieler nicht gefunden'; return }
    profile.value = p
    const { data: rows } = await supabase.from('species_index')
      .select('species, tier, count, first_at')
      .eq('user_id', p.id)
      .order('first_at')
    entries.value = rows || []
  } catch (e) { error.value = e.message }
  finally { loading.value = false }
}
onMounted(load)
watch(() => route.query.u, load)

// Stats pro Tier (global)
const tierCounts = computed(() => {
  const c = { all: entries.value.length, normal: 0, gold: 0, diamond: 0, epic: 0, rainbow: 0 }
  for (const e of entries.value) c[e.tier] = (c[e.tier] || 0) + 1
  return c
})

// Gefilterte Ansicht: gruppiert nach Spezies
const speciesIndex = computed(() => {
  const filtered = filter.value === 'all'
    ? entries.value
    : entries.value.filter(e => e.tier === filter.value)

  // Gruppieren je Spezies → Map: species → { tiers: [{tier, count, first_at}], best }
  const map = {}
  for (const e of filtered) {
    if (!map[e.species]) map[e.species] = { tiers: [], best: 'normal' }
    map[e.species].tiers.push(e)
    if (tierRank[e.tier] > tierRank[map[e.species].best]) map[e.species].best = e.tier
  }

  // Alle bekannten Spezies durchgehen, damit auch nicht-besessene fehlen
  return Object.values(SPECIES)
    .filter(s => s.enabled !== false)
    .sort((a, b) => a.cost - b.cost)
    .map(s => {
      const d = map[s.key]
      return {
        species: s.key,
        info: s,
        owned: !!d,
        tiers: d ? d.tiers.sort((a, b) => tierRank[b.tier] - tierRank[a.tier]) : [],
        best: d?.best || null,
      }
    })
})

const ownedCount = computed(() => speciesIndex.value.filter(x => x.owned).length)
const totalSpecies = computed(() => speciesIndex.value.length)

const filters = [
  { k: 'all', label: 'Alle', badge: '📚' },
  { k: 'rainbow', label: 'Rainbow', badge: '🌈' },
  { k: 'epic', label: 'Episch', badge: '🟣' },
  { k: 'diamond', label: 'Diamant', badge: '💎' },
  { k: 'gold', label: 'Gold', badge: '🥇' },
  { k: 'normal', label: 'Normal', badge: '⚪' },
]
</script>

<template>
  <h1 class="title">🏆 Spezies-Index</h1>
  <div v-if="loading" class="card subtitle">Lädt…</div>
  <p v-else-if="error" class="error">{{ error }}</p>

  <template v-else-if="profile">
    <div class="card profile-row">
      <div class="avatar">{{ profile.avatar_emoji || '👤' }}</div>
      <div style="flex:1">
        <div style="font-weight:800">{{ profile.username }}</div>
        <div class="subtitle" style="margin:0">
          {{ ownedCount }} / {{ totalSpecies }} Spezies · {{ entries.length }} Einträge
        </div>
      </div>
      <span class="hint">Einträge bleiben dauerhaft — auch nach Verkauf/Trade.</span>
    </div>

    <div class="card filter-card">
      <div class="filter-bar">
        <Button
          v-for="f in filters"
          :key="f.k"
          class="filter-chip"
          :class="{ active: filter === f.k }"
          :disabled="f.k !== 'all' && !tierCounts[f.k]"
          @click="filter = f.k"
        >
          <span>{{ f.badge }}</span>
          <span>{{ f.label }}</span>
          <span class="filter-count">{{ tierCounts[f.k] || 0 }}</span>
        </Button>
      </div>
    </div>

    <div class="card">
      <div class="idx-grid">
        <div
          v-for="c in speciesIndex"
          :key="c.species"
          class="idx-cell"
          :class="{ owned: c.owned, missing: !c.owned }"
          :style="c.owned ? { '--tier-color': tierInfo(c.best).color } : null"
        >
          <div class="idx-emoji">
            {{ c.info.emoji }}
            <span v-if="c.owned && tierInfo(c.best).badge" class="idx-badge">
              {{ tierInfo(c.best).badge }}
            </span>
          </div>
          <div class="idx-name">{{ c.info.name }}</div>
          <div v-if="c.owned" class="tier-chips">
            <span
              v-for="t in c.tiers"
              :key="t.tier"
              class="tc"
              :style="{ '--t': tierInfo(t.tier).color }"
              :title="`${t.tier} · ×${t.count}`"
            >
              {{ tierInfo(t.tier).badge || '⚪' }}
              <span class="tc-n">{{ t.count }}</span>
            </span>
          </div>
          <div v-else class="idx-missing">noch nicht besessen</div>
        </div>
      </div>
    </div>
  </template>
</template>

<style scoped>
.profile-row { display: flex; align-items: center; gap: 10px; }
.avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: #162048; border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px;
}
.hint { font-size: 10px; color: var(--muted); max-width: 140px; text-align: right; }

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

.idx-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
}
.idx-cell {
  --tier-color: #2a3866;
  position: relative;
  background: color-mix(in srgb, var(--tier-color) 18%, #162048);
  border: 1px solid color-mix(in srgb, var(--tier-color) 40%, var(--border));
  border-radius: 12px;
  padding: 10px 6px 8px;
  text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.idx-cell.missing {
  background: repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0 8px, transparent 8px 16px);
  border-style: dashed;
  opacity: 0.5;
  filter: grayscale(1);
}
.idx-emoji { position: relative; font-size: 34px; line-height: 1; }
.idx-badge {
  position: absolute; bottom: -4px; right: -10px;
  font-size: 16px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.6));
}
.idx-name { font-size: 12px; font-weight: 700; }
.idx-missing { font-size: 10px; color: var(--muted); }

.tier-chips {
  display: flex; flex-wrap: wrap; gap: 3px; justify-content: center;
}
.tc {
  --t: #aaa;
  display: inline-flex; align-items: center; gap: 2px;
  padding: 2px 6px; border-radius: 999px;
  background: color-mix(in srgb, var(--t) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--t) 50%, var(--border));
  font-size: 11px; line-height: 1;
}
.tc-n { font-weight: 800; font-size: 10px; }
</style>
