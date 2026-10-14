<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { locale } from '../i18n'
import { speciesInfo } from '../animals'
import { WEEKEND_WEAK_SPECIES, isWeekendBoost } from '../weekendBoost'

// Hinweis-Banner in Shop und Ticket-Shop, solange der Wochenend-Bonus läuft.
const game = useGameStore()

const I18N = {
  de: { title: 'Wochenend-Bonus aktiv', text: 'Seltene Tiere ×2 · {weak} ×½' },
  en: { title: 'Weekend bonus active', text: 'Rare animals ×2 · {weak} ×½' },
  ru: { title: 'Бонус выходного дня', text: 'Редкие животные ×2 · {weak} ×½' }
}

function tx(key, vars = {}) {
  const dict = I18N[locale.value] || I18N.en
  return String(dict[key] ?? I18N.en[key]).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

// Nur zeigen, wenn der Server den Bonus kennt; Tageswechsel über Serverzeit.
const visible = computed(() =>
  !!game.weekendBoost && isWeekendBoost(new Date(Date.now() + (game.serverOffset || 0)))
)
const weak = computed(() => WEEKEND_WEAK_SPECIES.map(s => speciesInfo(s).emoji).join(''))
</script>

<template>
  <div v-if="visible" class="wb-banner">
    <span class="wb-star">🌟</span>
    <div>
      <div class="wb-banner-title">{{ tx('title') }}</div>
      <div class="wb-banner-text">{{ tx('text', { weak }) }}</div>
    </div>
  </div>
</template>

<style scoped>
.wb-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 10px;
  padding: 8px 12px;
  border-radius: 14px;
  border: 2px solid color-mix(in srgb, var(--accent) 60%, var(--border));
  background: color-mix(in srgb, var(--accent) 16%, var(--mix-base));
  color: var(--heading);
  text-align: left;
}
.wb-star { font-size: 22px; line-height: 1; }
.wb-banner-title { font-size: 13px; font-weight: 900; }
.wb-banner-text { font-size: 12px; font-weight: 700; color: var(--text); }
</style>
