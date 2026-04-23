<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase'
import { formatCoins } from '../animals'

const router = useRouter()
const route  = useRoute()
const rows   = ref([])
const loading = ref(true)
const error   = ref('')

async function load() {
  loading.value = true
  error.value   = ''
  try {
    const { data, error: e } = await supabase
      .from('profiles')
      .select('username, coins, avatar_emoji')
      .order('coins', { ascending: false })
      .limit(50)
    if (e) throw e
    rows.value = data || []
  } catch (e) {
    error.value = e?.message || 'Laden fehlgeschlagen'
    rows.value  = []
  } finally {
    loading.value = false
  }
}

// Neu laden wenn man zur Bestenliste navigiert (z.B. zurück-Navigation)
watch(() => route.name, (name) => { if (name === 'leaderboard') load() })
onMounted(load)

function openProfile(username) {
  router.push({ name: 'profile', query: { u: username } })
}
</script>

<template>
  <h1 class="title">🏆 Bestenliste</h1>
  <p class="subtitle">Die reichsten Zoo-Besitzer weltweit.</p>

  <div class="card">
    <div v-if="loading" class="lb-state">
      <i class="pi pi-spin pi-spinner" style="font-size:24px; color: var(--muted)" />
      <span class="subtitle" style="margin:0">Lädt…</span>
    </div>

    <div v-else-if="error" class="lb-state">
      <i class="pi pi-exclamation-triangle" style="font-size:24px; color: var(--danger)" />
      <span class="error" style="margin:0">{{ error }}</span>
      <Button class="btn secondary" style="margin-top:4px" @click="load">
        <i class="pi pi-refresh" /> Erneut versuchen
      </Button>
    </div>

    <div v-else-if="!rows.length" class="lb-state">
      <span class="subtitle" style="margin:0">Noch leer.</span>
    </div>

    <template v-else>
      <Button
        v-for="(r, i) in rows"
        :key="r.username"
        class="lb-row"
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
          <div class="title-sm">{{ r.username }}</div>
          <div class="sub">🪙 {{ formatCoins(r.coins) }}</div>
        </div>
      </Button>
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
.lb-row {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 8px;
  background: transparent; border: none;
  border-bottom: 1px solid var(--border);
  color: inherit; font: inherit; text-align: left;
  cursor: pointer;
}
.lb-row:last-child { border-bottom: none; }
.lb-row:hover { background: rgba(255,255,255,0.03); }
.lb-rank {
  width: 28px; text-align: center; font-weight: 700;
}
.lb-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: #162048; border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0;
}
.lb-body { flex: 1; min-width: 0; }
</style>
