<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'
import { formatCoins } from '../animals'

const router = useRouter()
const rows = ref([])
const loading = ref(true)

onMounted(async () => {
  const { data } = await supabase
    .from('profiles')
    .select('username, coins, avatar_emoji')
    .order('coins', { ascending: false })
    .limit(50)
  rows.value = data || []
  loading.value = false
})

function openProfile(username) {
  router.push({ name: 'profile', query: { u: username } })
}
</script>

<template>
  <h1 class="title">🏆 Bestenliste</h1>
  <p class="subtitle">Die reichsten Zoo-Besitzer weltweit.</p>

  <div class="card">
    <div v-if="loading" class="subtitle">Lädt…</div>
    <div v-else-if="!rows.length" class="subtitle">Noch leer.</div>
    <button
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
    </button>
  </div>
</template>

<style scoped>
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
