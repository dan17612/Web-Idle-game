<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { locale } from '../i18n'
import { speciesInfo, formatCoins, tierInfo } from '../animals'
import { useGameStore } from '../stores/game'
import { useAppToast } from '../composables/useAppToast'
import { useReturnRefresh } from '../composables/useReturnRefresh'
import { breedPower, breedCost, breedMinutes, breedChances } from '../breeding'

const router = useRouter()
const game = useGameStore()
const appToast = useAppToast()

const I18N = {
  de: {
    title: 'Zucht', sub: 'Verpaare zwei Tiere und erhalte ein Ei mit einer Art, die es sonst nirgends gibt.',
    back: 'Zurück', parentA: 'Erstes Tier', parentB: 'Zweites Tier', choose: 'Tier wählen',
    power: 'Zuchtkraft', cost: 'Kosten', duration: 'Brutzeit', chances: 'Chancen',
    breed: 'Verpaaren', breeding: 'Verpaare...', busy: 'Noch {time}',
    needTwo: 'Wähle zwei verschiedene Tiere.', noCoins: 'Nicht genug Münzen.',
    done: 'Ei erhalten! Leg es in den Brutkasten.', toIncubator: 'Zum Brutkasten',
    eventEnded: 'Ereignis beendet',
    eventEndedSub: 'Das Zucht-Ereignis ist vorbei. Es können keine Tiere mehr verpaart werden.',
    empty: 'Du hast noch keine Tiere zum Verpaaren.',
    loading: 'Lade...', minutes: 'Min', hours: 'Std',
    hint: 'Je seltener und höher aufgewertet die Eltern, desto besser die Chancen. Beide Eltern bleiben dir erhalten, sind aber während der Brutzeit besetzt.'
  },
  en: {
    title: 'Breeding', sub: 'Pair two animals and get an egg holding a species found nowhere else.',
    back: 'Back', parentA: 'First animal', parentB: 'Second animal', choose: 'Pick an animal',
    power: 'Breeding power', cost: 'Cost', duration: 'Incubation', chances: 'Chances',
    breed: 'Breed', breeding: 'Breeding...', busy: '{time} left',
    needTwo: 'Pick two different animals.', noCoins: 'Not enough coins.',
    done: 'Egg received! Put it in the incubator.', toIncubator: 'To the incubator',
    eventEnded: 'Event ended',
    eventEndedSub: 'The breeding event is over. No more pairings can be started.',
    empty: 'You have no animals to breed yet.',
    loading: 'Loading...', minutes: 'min', hours: 'h',
    hint: 'The rarer and more upgraded the parents, the better the odds. Both parents stay yours but are busy during incubation.'
  },
  ru: {
    title: 'Разведение', sub: 'Скрести двух животных и получи яйцо с видом, которого больше нигде нет.',
    back: 'Назад', parentA: 'Первое животное', parentB: 'Второе животное', choose: 'Выбери животное',
    power: 'Сила разведения', cost: 'Цена', duration: 'Инкубация', chances: 'Шансы',
    breed: 'Скрестить', breeding: 'Скрещиваю...', busy: 'Ещё {time}',
    needTwo: 'Выбери двух разных животных.', noCoins: 'Не хватает монет.',
    done: 'Яйцо получено! Положи его в инкубатор.', toIncubator: 'В инкубатор',
    eventEnded: 'Событие завершено',
    eventEndedSub: 'Событие разведения завершено. Новые скрещивания недоступны.',
    empty: 'Пока нет животных для скрещивания.',
    loading: 'Загрузка...', minutes: 'мин', hours: 'ч',
    hint: 'Чем реже и выше уровень родителей, тем лучше шансы. Оба родителя остаются у тебя, но заняты на время инкубации.'
  }
}

function tx(key, vars = {}) {
  const dict = I18N[locale.value] || I18N.en
  let text = String(dict[key] ?? I18N.en[key] ?? key)
  for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, v)
  return text
}

const status = ref(null)
const loading = ref(true)
const busyKey = ref('')
const pickA = ref(null)
const pickB = ref(null)
const result = ref(null)
const now = ref(Date.now())
let timer = null

const eventActive = computed(() => status.value?.event_active !== false)
const animals = computed(() => status.value?.animals || [])

function isBusy(a) {
  void now.value
  if (!a?.breeding_until) return false
  return new Date(a.breeding_until).getTime() > Date.now() + game.serverOffset
}

function busyLeft(a) {
  void now.value
  const ms = new Date(a.breeding_until).getTime() - (Date.now() + game.serverOffset)
  return fmtDuration(Math.max(0, Math.round(ms / 60000)))
}

function fmtDuration(minutes) {
  if (minutes < 60) return `${minutes} ${tx('minutes')}`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} ${tx('hours')} ${m} ${tx('minutes')}` : `${h} ${tx('hours')}`
}

const selectedA = computed(() => animals.value.find(a => a.id === pickA.value) || null)
const selectedB = computed(() => animals.value.find(a => a.id === pickB.value) || null)

const power = computed(() =>
  breedPower(Number(selectedA.value?.power || 0), Number(selectedB.value?.power || 0)))
const cost = computed(() => breedCost(power.value))
const minutes = computed(() => breedMinutes(power.value))

// Vorschau aus dem gespiegelten Modul — kein Server-Aufruf beim Auswählen.
const chances = computed(() =>
  breedChances(power.value)
    .filter(c => c.percent > 0)
    .sort((a, b) => b.percent - a.percent))

const ready = computed(() =>
  eventActive.value && !!selectedA.value && !!selectedB.value &&
  pickA.value !== pickB.value && !isBusy(selectedA.value) && !isBusy(selectedB.value))

const affordable = computed(() => game.coins >= cost.value)

function pick(a, slot) {
  if (isBusy(a)) return
  if (slot === 'a') {
    if (pickB.value === a.id) pickB.value = null
    pickA.value = pickA.value === a.id ? null : a.id
  } else {
    if (pickA.value === a.id) pickA.value = null
    pickB.value = pickB.value === a.id ? null : a.id
  }
}

async function load() {
  loading.value = true
  try {
    status.value = await game.loadBreedingStatus()
  } catch (e) {
    appToast.err(e?.message || 'Fehler')
  } finally {
    loading.value = false
  }
}

async function doBreed() {
  if (!ready.value) { appToast.err(tx('needTwo')); return }
  if (!affordable.value) { appToast.err(tx('noCoins')); return }
  busyKey.value = 'breed'
  try {
    const data = await game.breedAnimals(pickA.value, pickB.value)
    result.value = data
    pickA.value = null
    pickB.value = null
    appToast.ok(tx('done'))
    await load()
  } catch (e) {
    const msg = String(e?.message || '')
    if (/insufficient coins/i.test(msg)) appToast.err(tx('noCoins'))
    else if (/event ended/i.test(msg)) appToast.err(tx('eventEnded'))
    else appToast.err(msg || 'Fehler')
  } finally {
    busyKey.value = ''
  }
}

onMounted(() => {
  load()
  game.loadEventSchedule?.().catch(() => {})
  timer = setInterval(() => {
    if (document.visibilityState === 'visible') now.value = Date.now()
  }, 1000)
})
onUnmounted(() => { if (timer) clearInterval(timer) })
useReturnRefresh(load)
</script>

<template>
  <div class="breeding-view">
    <header class="bv-header">
      <Button class="btn small btn-ghost" @click="router.push('/')">
        <i class="pi pi-arrow-left"></i>
        <span>{{ tx('back') }}</span>
      </Button>
      <div class="bv-title-block">
        <h1 class="bv-title">{{ tx('title') }}</h1>
        <p class="bv-sub">{{ tx('sub') }}</p>
      </div>
    </header>

    <section v-if="!eventActive" class="card event-over">
      <span class="eo-icon">⏰</span>
      <div class="eo-body">
        <div class="eo-title">{{ tx('eventEnded') }}</div>
        <div class="eo-sub">{{ tx('eventEndedSub') }}</div>
      </div>
    </section>

    <div v-if="loading" class="card bv-state">
      <i class="pi pi-spin pi-spinner"></i>
      <span>{{ tx('loading') }}</span>
    </div>

    <div v-else-if="!animals.length" class="card bv-state">
      <span>{{ tx('empty') }}</span>
    </div>

    <template v-else>
      <section class="card bv-pair">
        <div class="bv-slot">
          <div class="bv-slot-title">{{ tx('parentA') }}</div>
          <div class="bv-slot-body" :class="{ filled: selectedA }">
            <template v-if="selectedA">
              <span class="bv-slot-emoji">{{ speciesInfo(selectedA.species).emoji }}</span>
              <span class="bv-slot-name">{{ speciesInfo(selectedA.species).name }}</span>
            </template>
            <span v-else class="bv-slot-empty">{{ tx('choose') }}</span>
          </div>
        </div>

        <div class="bv-heart">💞</div>

        <div class="bv-slot">
          <div class="bv-slot-title">{{ tx('parentB') }}</div>
          <div class="bv-slot-body" :class="{ filled: selectedB }">
            <template v-if="selectedB">
              <span class="bv-slot-emoji">{{ speciesInfo(selectedB.species).emoji }}</span>
              <span class="bv-slot-name">{{ speciesInfo(selectedB.species).name }}</span>
            </template>
            <span v-else class="bv-slot-empty">{{ tx('choose') }}</span>
          </div>
        </div>
      </section>

      <section class="card bv-stats">
        <div class="bv-stat">
          <strong>{{ power }} / 12</strong><span>{{ tx('power') }}</span>
        </div>
        <div class="bv-stat">
          <strong :class="{ short: !affordable }">🪙 {{ formatCoins(cost) }}</strong>
          <span>{{ tx('cost') }}</span>
        </div>
        <div class="bv-stat">
          <strong>{{ fmtDuration(minutes) }}</strong><span>{{ tx('duration') }}</span>
        </div>
      </section>

      <section class="card bv-chances">
        <div class="bv-chances-title">{{ tx('chances') }}</div>
        <div v-for="c in chances" :key="c.species" class="bv-chance">
          <span class="bv-chance-emoji">{{ speciesInfo(c.species).emoji }}</span>
          <span class="bv-chance-name">{{ speciesInfo(c.species).name }}</span>
          <span class="bv-chance-bar">
            <span :style="{ width: Math.max(2, c.percent) + '%' }"></span>
          </span>
          <span class="bv-chance-pct">{{ c.percent % 1 === 0 ? c.percent : c.percent.toFixed(1) }}%</span>
        </div>
        <p class="bv-hint">{{ tx('hint') }}</p>
      </section>

      <Button
        class="btn full bv-breed"
        :disabled="!ready || !affordable || busyKey === 'breed'"
        @click="doBreed"
      >
        {{ busyKey === 'breed' ? tx('breeding') : tx('breed') }}
      </Button>

      <section v-if="result" class="card bv-result">
        <span class="bv-result-icon">🐣</span>
        <div class="bv-result-body">
          <div class="bv-result-title">{{ tx('done') }}</div>
          <router-link to="/" class="bv-result-link">{{ tx('toIncubator') }} ›</router-link>
        </div>
      </section>

      <section class="card bv-grid-card">
        <div class="bv-grid-title">{{ tx('parentA') }}</div>
        <div class="bv-grid">
          <Button
            v-for="a in animals"
            :key="'a-' + a.id"
            class="bv-cell"
            :class="{ active: pickA === a.id, busy: isBusy(a) }"
            :disabled="isBusy(a) || !eventActive"
            :style="{ '--tier-color': tierInfo(a.tier).color }"
            @click="pick(a, 'a')"
          >
            <span class="bv-cell-emoji">{{ speciesInfo(a.species).emoji }}</span>
            <span class="bv-cell-power">{{ a.power }}</span>
            <span v-if="isBusy(a)" class="bv-cell-busy">{{ tx('busy', { time: busyLeft(a) }) }}</span>
          </Button>
        </div>

        <div class="bv-grid-title">{{ tx('parentB') }}</div>
        <div class="bv-grid">
          <Button
            v-for="a in animals"
            :key="'b-' + a.id"
            class="bv-cell"
            :class="{ active: pickB === a.id, busy: isBusy(a) }"
            :disabled="isBusy(a) || !eventActive"
            :style="{ '--tier-color': tierInfo(a.tier).color }"
            @click="pick(a, 'b')"
          >
            <span class="bv-cell-emoji">{{ speciesInfo(a.species).emoji }}</span>
            <span class="bv-cell-power">{{ a.power }}</span>
            <span v-if="isBusy(a)" class="bv-cell-busy">{{ tx('busy', { time: busyLeft(a) }) }}</span>
          </Button>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.breeding-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-bottom: 20px;
}
.bv-header { display: flex; align-items: center; gap: 10px; }
.bv-title-block { min-width: 0; }
.bv-title {
  margin: 0; font-size: 22px; font-weight: 900; color: var(--heading);
}
.bv-sub { margin: 2px 0 0; color: var(--muted); font-size: 13px; }

.bv-state {
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; padding: 24px 12px; color: var(--muted);
}

.bv-pair { display: flex; align-items: center; gap: 10px; }
.bv-slot { flex: 1; min-width: 0; }
.bv-slot-title {
  font-size: 10px; font-weight: 800; text-transform: uppercase;
  letter-spacing: 0.07em; color: var(--muted); margin-bottom: 6px;
}
.bv-slot-body {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; min-height: 84px; padding: 8px;
  border: 2px dashed var(--border); border-radius: 16px;
}
.bv-slot-body.filled { border-style: solid; border-color: var(--accent-soft, var(--accent)); }
.bv-slot-emoji { font-size: 34px; line-height: 1; }
.bv-slot-name { font-size: 12px; font-weight: 700; text-align: center; }
.bv-slot-empty { font-size: 12px; color: var(--muted); text-align: center; }
.bv-heart { font-size: 26px; flex-shrink: 0; }

.bv-stats { display: flex; justify-content: space-around; gap: 8px; text-align: center; }
.bv-stat { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.bv-stat strong { font-size: 16px; font-weight: 900; }
.bv-stat strong.short { color: var(--danger); }
.bv-stat span {
  font-size: 10px; font-weight: 800; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--muted);
}

.bv-chances { display: flex; flex-direction: column; gap: 6px; }
.bv-chances-title { font-weight: 900; font-size: 15px; margin-bottom: 2px; }
.bv-chance { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.bv-chance-emoji { font-size: 20px; flex-shrink: 0; }
.bv-chance-name { flex: 1; min-width: 0; font-weight: 700; }
.bv-chance-bar {
  width: 70px; height: 7px; flex-shrink: 0;
  background: var(--border); border-radius: 999px; overflow: hidden;
}
.bv-chance-bar > span {
  display: block; height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-2, var(--accent)));
}
.bv-chance-pct {
  width: 44px; text-align: right; flex-shrink: 0;
  font-weight: 800; font-variant-numeric: tabular-nums;
}
.bv-hint { margin: 6px 0 0; font-size: 11px; color: var(--muted); line-height: 1.45; }

.bv-result { display: flex; align-items: center; gap: 12px; }
.bv-result-icon { font-size: 30px; flex-shrink: 0; }
.bv-result-body { min-width: 0; }
.bv-result-title { font-weight: 900; }
.bv-result-link {
  font-size: 13px; font-weight: 800; color: var(--accent-deep, var(--accent));
  text-decoration: none;
}

.bv-grid-card { display: flex; flex-direction: column; gap: 8px; }
.bv-grid-title {
  font-size: 10px; font-weight: 800; text-transform: uppercase;
  letter-spacing: 0.07em; color: var(--muted);
}
.bv-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(62px, 1fr)); gap: 6px;
}
.bv-cell {
  display: flex; flex-direction: column; align-items: center; gap: 1px;
  padding: 6px 2px; background: var(--card-2, transparent);
  border: 2px solid var(--border); border-radius: 14px;
  cursor: pointer; color: inherit; font: inherit;
}
.bv-cell:hover:not(:disabled) { border-color: var(--tier-color, var(--accent)); }
.bv-cell.active {
  border-color: var(--accent); background: rgba(244, 169, 18, 0.14);
}
.bv-cell.busy, .bv-cell:disabled { opacity: 0.4; cursor: not-allowed; filter: grayscale(0.7); }
.bv-cell-emoji { font-size: 24px; line-height: 1; }
.bv-cell-power { font-size: 11px; font-weight: 800; color: var(--muted); }
.bv-cell-busy { font-size: 8px; font-weight: 700; color: var(--danger); }

.event-over {
  display: flex; align-items: center; gap: 12px;
  border-color: rgba(239, 71, 111, 0.45);
}
.eo-icon { font-size: 26px; flex-shrink: 0; }
.eo-body { min-width: 0; }
.eo-title { font-weight: 900; color: var(--danger); }
.eo-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
</style>
