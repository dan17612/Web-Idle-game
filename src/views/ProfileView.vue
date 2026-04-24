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
const loading = ref(false)
const error = ref('')
const activeTier = reactive({})

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
    const { data: a } = await supabase.from('animals_public')
      .select('id, species, tier, equipped').eq('owner_id', p.id)
    animals.value = a || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(() => route.query.u, load)

const collection = computed(() => {
  const bySpecies = {}
  for (const a of animals.value) {
    const tier = a.tier || 'normal'
    if (!bySpecies[a.species]) {
      bySpecies[a.species] = { counts: {}, best: 'normal', total: 0 }
    }
    const s = bySpecies[a.species]
    s.counts[tier] = (s.counts[tier] || 0) + 1
    s.total++
    if (tierRank[tier] > tierRank[s.best]) s.best = tier
  }
  return Object.values(SPECIES)
    .filter(s => s.enabled !== false)
    .sort((a, b) => a.cost - b.cost)
    .map(s => {
      const d = bySpecies[s.key]
      const variants = tierOrder.filter(tt => d?.counts?.[tt])
      return {
        species: s.key,
        info: s,
        owned: !!d,
        total: d?.total || 0,
        counts: d?.counts || {},
        best: d?.best || null,
        variants
      }
    })
})

const stats = computed(() => {
  const s = { normal: 0, gold: 0, diamond: 0, epic: 0, rainbow: 0 }
  for (const a of animals.value) s[a.tier || 'normal']++
  return s
})

const badges = computed(() => {
  const all = collection.value
  if (!all.length) return []
  const out = []
  const every = all.every(c => c.owned)
  if (every) out.push({ key: 'complete', label: t('profile.badges.complete'), emoji: '📚', color: '#9bb0ff' })
  const minRank = every ? Math.min(...all.map(c => tierRank[c.best])) : -1
  if (minRank >= 1) out.push({ key: 'all-gold', label: t('profile.badges.allGold'), emoji: '🥇', color: '#ffd166' })
  if (minRank >= 2) out.push({ key: 'all-diamond', label: t('profile.badges.allDiamond'), emoji: '💎', color: '#63f2ff' })
  if (minRank >= 3) out.push({ key: 'all-epic', label: t('profile.badges.allEpic'), emoji: '🟣', color: '#a855f7' })
  if (minRank >= 4) out.push({ key: 'all-rainbow', label: t('profile.badges.allRainbow'), emoji: '🌈', color: '#ff6bd6' })
  return out
})

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
      <div class="subtitle" style="margin:0 0 8px">
        {{ t('profile.speciesIndex', { owned: collection.filter(c=>c.owned).length, total: collection.length }) }}
      </div>
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
          <div v-else class="col-tier-line missing-label">{{ t('profile.missing') }}</div>
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
</style>
