<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase'
import { useAuthStore } from '../stores/auth'
import { SPECIES, tierInfo, loadCatalog, formatCoins } from '../animals'
import { t } from '../i18n'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const profile = ref(null)
const animals = ref([])
const entries = ref([])
const loading = ref(false)
const error = ref('')
const activeTier = reactive({})
const filter = ref('all')

const username = computed(() => String(route.query.u || auth.profile?.username || ''))

const tierRank = { normal: 0, gold: 1, diamond: 2, epic: 3, rainbow: 4 }
const tierOrder = ['normal', 'gold', 'diamond', 'epic', 'rainbow']

async function load() {
  if (!username.value) return
  loading.value = true
  error.value = ''
  try {
    if (!Object.keys(SPECIES).length) await loadCatalog()
    const { data: p, error: pe } = await supabase.from('profiles')
      .select('id, username, coins, avatar_emoji, created_at')
      .eq('username', username.value).maybeSingle()
    if (pe) throw pe
    if (!p) {
      error.value = t('profile.playerNotFound')
      profile.value = null
      return
    }
    profile.value = p
    const [{ data: a }, { data: rows }] = await Promise.all([
      supabase.from('animals_public').select('id, species, tier, equipped').eq('owner_id', p.id),
      supabase.from('species_index').select('species, tier, count, first_at').eq('user_id', p.id).order('first_at')
    ])
    animals.value = a || []
    entries.value = rows || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(() => route.query.u, load)

// Tier counts from historical species_index entries (total ever had per tier)
const tierCounts = computed(() => {
  const c = { all: 0, normal: 0, gold: 0, diamond: 0, epic: 0, rainbow: 0 }
  for (const e of entries.value) {
    c[e.tier] = (c[e.tier] || 0) + e.count
    c.all += e.count
  }
  return c
})

// Build a lookup of best tier per species across all entries (ignoring filter)
const allEntriesMap = computed(() => {
  const map = {}
  for (const e of entries.value) {
    if (!map[e.species]) map[e.species] = 'normal'
    if (tierRank[e.tier] > tierRank[map[e.species]]) map[e.species] = e.tier
  }
  return map
})

const collection = computed(() => {
  const filtered = filter.value === 'all'
    ? entries.value
    : entries.value.filter(e => e.tier === filter.value)

  const map = {}
  for (const e of filtered) {
    if (!map[e.species]) map[e.species] = { counts: {}, best: 'normal', total: 0 }
    const s = map[e.species]
    s.counts[e.tier] = (s.counts[e.tier] || 0) + e.count
    s.total += e.count
    if (tierRank[e.tier] > tierRank[s.best]) s.best = e.tier
  }

  return Object.values(SPECIES)
    .filter(s => s.enabled !== false || !!allEntriesMap.value[s.key])
    .sort((a, b) => a.cost - b.cost)
    .map(s => {
      const d = map[s.key]
      const variants = tierOrder.filter(tt => d?.counts?.[tt])
      return {
        species: s.key,
        info: s,
        owned: !!d,
        everOwned: !!allEntriesMap.value[s.key],
        total: d?.total || 0,
        counts: d?.counts || {},
        best: d?.best || allEntriesMap.value[s.key] || null,
        variants
      }
    })
})

// Stats based on historical species_index data (total ever had per tier)
const stats = computed(() => {
  const s = { normal: 0, gold: 0, diamond: 0, epic: 0, rainbow: 0 }
  for (const e of entries.value) s[e.tier || 'normal'] = (s[e.tier || 'normal'] || 0) + e.count
  return s
})

const ownedCount = computed(() => Object.keys(allEntriesMap.value).length)
const totalSpecies = computed(() => collection.value.length)

const badges = computed(() => {
  const allSpecies = Object.values(SPECIES).filter(s => s.enabled !== false)
  if (!allSpecies.length || !entries.value.length) return []
  const out = []
  const every = allSpecies.every(s => !!allEntriesMap.value[s.key])
  if (every) out.push({ key: 'complete', label: t('profile.badges.complete'), emoji: '📚', color: '#9bb0ff' })
  const minRank = every ? Math.min(...allSpecies.map(s => tierRank[allEntriesMap.value[s.key] || 'normal'])) : -1
  if (minRank >= 1) out.push({ key: 'all-gold', label: t('profile.badges.allGold'), emoji: '🥇', color: '#ffd166' })
  if (minRank >= 2) out.push({ key: 'all-diamond', label: t('profile.badges.allDiamond'), emoji: '💎', color: '#63f2ff' })
  if (minRank >= 3) out.push({ key: 'all-epic', label: t('profile.badges.allEpic'), emoji: '🟣', color: '#a855f7' })
  if (minRank >= 4) out.push({ key: 'all-rainbow', label: t('profile.badges.allRainbow'), emoji: '🌈', color: '#ff6bd6' })
  return out
})

const filters = computed(() => [
  { k: 'all', label: t('index.filters.all'), badge: '📚' },
  { k: 'rainbow', label: t('index.filters.rainbow'), badge: '🌈' },
  { k: 'epic', label: t('index.filters.epic'), badge: '🟣' },
  { k: 'diamond', label: t('index.filters.diamond'), badge: '💎' },
  { k: 'gold', label: t('index.filters.gold'), badge: '🥇' },
  { k: 'normal', label: t('index.filters.normal'), badge: '⚪' }
])

function tierFor(c) {
  return activeTier[c.species] || c.best || 'normal'
}

function selectTier(species, tier) {
  activeTier[species] = tier
}

const isSelf = computed(() => auth.profile?.username === profile.value?.username)

function openTrade() {
  if (!profile.value || isSelf.value) return
  router.push({ name: 'trade', query: { partner: profile.value.username } })
}

function openSend() {
  if (!profile.value || isSelf.value) return
  router.push({ name: 'trade', query: { send: profile.value.username } })
}
</script>

<template>
  <h1 class="title">👤 {{ t('profile.title') }}</h1>
  <div v-if="loading" class="card subtitle">{{ t('common.loading') }}</div>
  <p v-else-if="error" class="error">{{ error }}</p>

  <template v-else-if="profile">
    <div class="card profile-head">
      <div class="big-avatar">{{ profile.avatar_emoji || '👤' }}</div>
      <div style="flex:1;min-width:0">
        <div class="row" style="gap:6px;flex-wrap:wrap;align-items:center">
          <h2 style="margin:0">{{ profile.username }}</h2>
          <span
            v-for="b in badges"
            :key="b.key"
            class="player-badge"
            :title="b.label"
            :style="{ '--bc': b.color }"
          >{{ b.emoji }}</span>
        </div>
        <div class="subtitle" style="margin:2px 0 0">
          {{ t('profile.coinsAndAnimals', { coins: formatCoins(profile.coins), animals: animals.length }) }}
        </div>
      </div>
      <div v-if="!isSelf" class="actions-col">
        <Button class="btn small" @click="openSend">💸 {{ t('profile.send') }}</Button>
        <Button class="btn secondary small" @click="openTrade">🔄 {{ t('profile.trade') }}</Button>
      </div>
    </div>

    <div class="card">
      <div class="subtitle" style="margin:0 0 6px">{{ t('profile.collectionByTier') }}</div>
      <div class="tier-stats">
        <div v-for="tier in tierOrder" :key="tier" class="stat" :style="{ '--c': tierInfo(tier).color }">
          <span class="stat-badge">{{ tierInfo(tier).badge || '⚪' }}</span>
          <span class="stat-count">{{ stats[tier] }}</span>
          <span class="stat-name">{{ t(`profile.tiers.${tier}`) }}</span>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="idx-header">
        <div class="subtitle" style="margin:0">
          {{ t('index.speciesProgress', { owned: ownedCount, total: totalSpecies, entries: tierCounts.all }) }}
        </div>
        <span class="hint">{{ t('index.permanentHint') }}</span>
      </div>
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
      <div class="col-grid">
        <div
          v-for="c in collection"
          :key="c.species"
          class="col-cell"
          :class="{ owned: c.owned, missing: !c.owned }"
          :style="c.owned ? { '--tier-color': tierInfo(tierFor(c)).color } : null"
        >
          <div class="col-emoji">
            {{ c.info.emoji }}
            <span v-if="c.owned && tierInfo(tierFor(c)).badge" class="col-badge">
              {{ tierInfo(tierFor(c)).badge }}
            </span>
          </div>
          <div class="col-name">{{ c.info.name }}</div>

          <template v-if="c.owned && c.variants.length > 1">
            <div class="var-tabs">
              <Button
                v-for="tier in c.variants"
                :key="tier"
                class="var-tab"
                :class="{ active: tierFor(c) === tier }"
                :style="{ '--t': tierInfo(tier).color }"
                @click="selectTier(c.species, tier)"
                :title="`${tier} × ${c.counts[tier]}`"
              >
                <span>{{ tierInfo(tier).badge || '⚪' }}</span>
                <span class="var-count">{{ c.counts[tier] }}</span>
              </Button>
            </div>
            <div class="col-tier-line">
              {{ t(`profile.tiers.${tierFor(c)}`) }} · ×{{ c.counts[tierFor(c)] }}
            </div>
          </template>
          <div v-else-if="c.owned" class="col-tier-line" :style="{ color: tierInfo(c.best).color }">
            {{ t(`profile.tiers.${c.best}`) }} · ×{{ c.counts[c.best] }}
          </div>
          <div v-else class="col-tier-line missing-label">{{ t('index.notOwnedYet') }}</div>
        </div>
      </div>
    </div>
  </template>
</template>

<style scoped>
.profile-head {
  display: flex; gap: 12px; align-items: center;
}
.big-avatar {
  width: 64px; height: 64px; border-radius: 50%;
  background: linear-gradient(135deg, #2a3866, #162048);
  border: 2px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: 36px;
  flex-shrink: 0;
}
.actions-col { display: flex; flex-direction: column; gap: 6px; }
.btn.small { padding: 6px 10px; font-size: 12px; }

.player-badge {
  --bc: #aaa;
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 50%;
  background: color-mix(in srgb, var(--bc) 20%, transparent);
  border: 1px solid var(--bc);
  font-size: 12px;
}

.tier-stats {
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px;
}
.stat {
  --c: #aaa;
  background: color-mix(in srgb, var(--c) 15%, #0f1736);
  border: 1px solid color-mix(in srgb, var(--c) 40%, transparent);
  border-radius: 10px;
  padding: 8px 4px; text-align: center;
}
.stat-badge { display: block; font-size: 18px; }
.stat-count { font-weight: 800; font-size: 16px; }
.stat-name { display: block; font-size: 10px; color: var(--muted); }

.col-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px;
}
.col-cell {
  --tier-color: #2a3866;
  position: relative;
  background: color-mix(in srgb, var(--tier-color) 18%, #162048);
  border: 1px solid color-mix(in srgb, var(--tier-color) 40%, var(--border));
  border-radius: 12px;
  padding: 10px 6px 8px;
  text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.col-cell.missing {
  background: repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0 8px, transparent 8px 16px);
  border-style: dashed;
  opacity: 0.55;
  filter: grayscale(1);
}
.col-emoji { position: relative; font-size: 34px; line-height: 1; }
.col-badge {
  position: absolute; bottom: -4px; right: -10px;
  font-size: 16px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.6));
}
.col-name { font-size: 12px; font-weight: 700; }
.col-tier-line { font-size: 10px; font-weight: 700; }
.missing-label { color: var(--muted); }

.var-tabs {
  display: flex; gap: 3px; flex-wrap: wrap; justify-content: center;
  margin-top: 2px;
}
.var-tab {
  --t: #aaa;
  display: inline-flex; align-items: center; gap: 2px;
  padding: 2px 6px;
  border: 1px solid color-mix(in srgb, var(--t) 40%, var(--border));
  background: color-mix(in srgb, var(--t) 12%, transparent);
  border-radius: 999px;
  font: inherit; color: inherit; cursor: pointer;
  font-size: 11px;
  line-height: 1;
}
.var-tab.active {
  background: color-mix(in srgb, var(--t) 35%, transparent);
  border-color: var(--t);
  box-shadow: 0 0 0 1px var(--t) inset;
}
.var-count { font-weight: 800; font-size: 10px; opacity: 0.9; }

.idx-header {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  flex-wrap: wrap;
}
.hint { font-size: 10px; color: var(--muted); max-width: 160px; text-align: right; }

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
</style>
