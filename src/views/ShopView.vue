<script setup>
import { ref } from 'vue'
import { useGameStore } from '../stores/game'
import { SPECIES, formatCoins } from '../animals'

const game = useGameStore()
const error = ref('')
const success = ref('')
const busyKey = ref('')

async function buy(key) {
  error.value = ''; success.value = ''
  busyKey.value = key
  try {
    await game.buyAnimal(key)
    success.value = SPECIES[key].name + ' gekauft!'
  } catch (e) {
    error.value = e.message
  } finally {
    busyKey.value = ''
    setTimeout(() => success.value = '', 2000)
  }
}
</script>

<template>
  <h1 class="title">🛒 Shop</h1>
  <p class="subtitle">Tiere erzeugen passiv Münzen — auch offline (bis zu 8 Stunden).</p>

  <div v-if="error" class="error">{{ error }}</div>
  <div v-if="success" class="success">{{ success }}</div>

  <div class="grid">
    <div v-for="(info, key) in SPECIES" :key="key" class="animal-card">
      <div class="animal-emoji">{{ info.emoji }}</div>
      <div class="animal-name">{{ info.name }}</div>
      <div class="animal-meta">+{{ formatCoins(info.rate) }} / Sek</div>
      <div class="animal-cost">🪙 {{ formatCoins(info.cost) }}</div>
      <button
        class="btn full"
        style="margin-top:8px"
        :disabled="busyKey===key || game.displayCoins < info.cost"
        @click="buy(key)"
      >
        {{ busyKey===key ? '...' : 'Kaufen' }}
      </button>
    </div>
  </div>
</template>
