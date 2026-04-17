<script setup>
import { onMounted, ref } from 'vue'
import { supabase } from '../supabase'
import { formatCoins } from '../animals'

const rows = ref([])
const loading = ref(true)

onMounted(async () => {
  const { data } = await supabase
    .from('profiles')
    .select('username, coins')
    .order('coins', { ascending: false })
    .limit(50)
  rows.value = data || []
  loading.value = false
})
</script>

<template>
  <h1 class="title">🏆 Bestenliste</h1>
  <p class="subtitle">Die reichsten Zoo-Besitzer weltweit.</p>

  <div class="card">
    <div v-if="loading" class="subtitle">Lädt…</div>
    <div v-else-if="!rows.length" class="subtitle">Noch leer.</div>
    <div v-for="(r, i) in rows" :key="r.username" class="list-item">
      <div class="left" style="width:28px;text-align:center">
        <template v-if="i===0">🥇</template>
        <template v-else-if="i===1">🥈</template>
        <template v-else-if="i===2">🥉</template>
        <template v-else>{{ i + 1 }}</template>
      </div>
      <div class="body">
        <div class="title-sm">{{ r.username }}</div>
        <div class="sub">🪙 {{ formatCoins(r.coins) }}</div>
      </div>
    </div>
  </div>
</template>
