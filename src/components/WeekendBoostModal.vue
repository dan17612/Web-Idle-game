<script setup>
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/game'
import { locale } from '../i18n'
import { speciesInfo } from '../animals'
import { WEEKEND_WEAK_SPECIES } from '../weekendBoost'

// Einmaliger Hinweis auf den Wochenend-Bonus. Ob ein Spieler ihn gesehen hat,
// speichert der Server (player_notices), also auch geräteübergreifend.
// Spec: docs/superpowers/specs/2026-10-14-wochenend-bonus-und-truhenlimits-design.md

const game = useGameStore()

const I18N = {
  de: {
    title: 'Neu: Wochenend-Bonus!',
    lead: 'Jeden Samstag und Sonntag (deutsche Zeit) gibt es in Truhen und im Shop bessere Tiere.',
    rare: 'Seltene, epische und legendäre Tiere kommen doppelt so oft.',
    weak: 'Küken, Huhn und Hase kommen nur halb so oft.',
    chance: 'Chance auf ein seltenes Tier pro Truhe: {normal} % → {weekend} %',
    active: 'Der Bonus läuft gerade, bis Sonntag 23:59 Uhr!',
    upcoming: 'Der nächste Bonus startet am Samstag um 0:00 Uhr.',
    ok: 'Cool, verstanden!'
  },
  en: {
    title: 'New: Weekend bonus!',
    lead: 'Every Saturday and Sunday (German time) chests and the shop give better animals.',
    rare: 'Rare, epic and legendary animals show up twice as often.',
    weak: 'Chicks, chickens and rabbits show up only half as often.',
    chance: 'Chance for a rare animal per chest: {normal}% → {weekend}%',
    active: 'The bonus is running right now, until Sunday 23:59!',
    upcoming: 'The next bonus starts on Saturday at 0:00.',
    ok: 'Cool, got it!'
  },
  ru: {
    title: 'Новинка: бонус выходного дня!',
    lead: 'Каждую субботу и воскресенье (по немецкому времени) в сундуках и магазине попадаются животные получше.',
    rare: 'Редкие, эпические и легендарные животные выпадают вдвое чаще.',
    weak: 'Цыплята, курицы и кролики выпадают вдвое реже.',
    chance: 'Шанс на редкое животное в сундуке: {normal}% → {weekend}%',
    active: 'Бонус действует прямо сейчас, до воскресенья 23:59!',
    upcoming: 'Следующий бонус начнётся в субботу в 0:00.',
    ok: 'Круто, понятно!'
  }
}

function tx(key, vars = {}) {
  const dict = I18N[locale.value] || I18N.en
  const value = dict[key] ?? I18N.en[key]
  return String(value ?? key).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

const status = computed(() => game.weekendBoost || {})
const weakEmojis = computed(() => WEEKEND_WEAK_SPECIES.map(s => speciesInfo(s).emoji).join(' '))
const hasChance = computed(() =>
  Number(status.value.rare_chance) > 0 && Number(status.value.rare_chance_weekend) > 0
)
const fmt = (n) => Number(n || 0).toLocaleString(locale.value, { maximumFractionDigits: 1 })
const busy = ref(false)

async function close() {
  if (busy.value) return
  busy.value = true
  try {
    await game.ackWeekendNotice()
  } catch {
    // Beim nächsten Laden fragt der Server erneut nach; lokal bleibt der Dialog zu.
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="wb-backdrop" role="dialog" aria-modal="true" :aria-label="tx('title')" @click.self="close">
      <div class="wb-dialog card">
        <div class="wb-icon">🌟</div>
        <h2 class="wb-title">{{ tx('title') }}</h2>
        <p class="wb-lead">{{ tx('lead') }}</p>

        <ul class="wb-list">
          <li><span class="wb-emoji">✨</span><span>{{ tx('rare') }}</span></li>
          <li><span class="wb-emoji">{{ weakEmojis }}</span><span>{{ tx('weak') }}</span></li>
          <li v-if="hasChance">
            <span class="wb-emoji">🎁</span>
            <span>{{ tx('chance', { normal: fmt(status.rare_chance), weekend: fmt(status.rare_chance_weekend) }) }}</span>
          </li>
        </ul>

        <div class="wb-when" :class="{ active: status.active }">
          {{ status.active ? tx('active') : tx('upcoming') }}
        </div>

        <Button type="button" class="btn full wb-ok" :disabled="busy" @click="close">
          {{ tx('ok') }}
        </Button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.wb-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(16px + var(--safe-top)) 16px calc(16px + var(--safe-bot));
  background: var(--overlay-strong);
  backdrop-filter: blur(6px);
  touch-action: manipulation;
}
.wb-dialog {
  width: min(400px, 100%);
  max-height: 100%;
  overflow-y: auto;
  padding: 22px 18px 16px;
  text-align: center;
  animation: wbIn 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.wb-icon { font-size: 52px; line-height: 1; margin-bottom: 6px; animation: wbSpin 2.4s ease-in-out infinite; }
.wb-title { margin: 0 0 6px; font-size: 21px; font-weight: 900; color: var(--heading); }
.wb-lead { margin: 0 0 12px; font-size: 13.5px; font-weight: 700; color: var(--text); }
.wb-list {
  list-style: none;
  margin: 0 0 12px;
  padding: 10px 12px;
  display: grid;
  gap: 8px;
  text-align: left;
  border-radius: 14px;
  border: 2px dashed var(--border);
  background: var(--card-2);
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
}
.wb-list li { display: flex; gap: 10px; align-items: center; }
.wb-emoji { flex: 0 0 auto; min-width: 28px; text-align: center; font-size: 18px; }
.wb-when {
  margin: 0 0 14px;
  padding: 8px 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 800;
  color: var(--heading);
  background: color-mix(in srgb, var(--accent) 18%, var(--mix-base));
}
.wb-when.active {
  color: var(--success-ink);
  background: color-mix(in srgb, var(--accent-2) 20%, var(--mix-base));
}
.wb-ok { font-weight: 900; }
@keyframes wbIn {
  from { transform: translateY(20px) scale(0.94); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes wbSpin {
  0%, 100% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(14deg) scale(1.12); }
}
</style>
