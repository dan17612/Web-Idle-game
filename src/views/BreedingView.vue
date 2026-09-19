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
    search: 'Tier suchen...', all: 'Alle', free: 'frei', pickHint: 'Tippe Tiere an, um sie zu verpaaren. Gleiche Tiere sind gestapelt.',
    noMatch: 'Keine passenden Tiere.', clear: 'Auswahl leeren',
    tiers: { normal: 'Normal', gold: 'Gold', diamond: 'Diamant', epic: 'Episch', rainbow: 'Rainbow' },
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
    search: 'Search animal...', all: 'All', free: 'free', pickHint: 'Tap animals to pair them. Identical animals are stacked.',
    noMatch: 'No matching animals.', clear: 'Clear selection',
    tiers: { normal: 'Normal', gold: 'Gold', diamond: 'Diamond', epic: 'Epic', rainbow: 'Rainbow' },
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
    search: 'Поиск животного...', all: 'Все', free: 'своб.', pickHint: 'Нажимай на животных, чтобы скрестить их. Одинаковые сложены в стопку.',
    noMatch: 'Нет подходящих животных.', clear: 'Сбросить выбор',
    tiers: { normal: 'Обычный', gold: 'Золотой', diamond: 'Алмазный', epic: 'Эпический', rainbow: 'Радужный' },
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

const TIER_FILTERS = ['all', 'rainbow', 'epic', 'diamond', 'gold', 'normal']
const tierFilter = ref('all')
const query = ref('')

const animalById = computed(() => new Map(animals.value.map(a => [a.id, a])))

// Gleiche Art + gleiche Stufe werden zu einem Stapel zusammengefasst.
const groups = computed(() => {
  void now.value
  const q = query.value.trim().toLowerCase()
  const map = new Map()
  for (const a of animals.value) {
    if (tierFilter.value !== 'all' && (a.tier || 'normal') !== tierFilter.value) continue
    if (q && !speciesInfo(a.species).name.toLowerCase().includes(q)) continue
    const key = `${a.species}|${a.tier || 'normal'}`
    let g = map.get(key)
    if (!g) {
      g = { key, species: a.species, tier: a.tier || 'normal', power: Number(a.power || 0), ids: [] }
      map.set(key, g)
    }
    g.ids.push(a.id)
  }
  return [...map.values()].map(g => {
    const picked = [pickA.value, pickB.value].filter(id => g.ids.includes(id)).length
    const busyAnimals = g.ids.map(id => animalById.value.get(id)).filter(isBusy)
    const free = g.ids.length - busyAnimals.length - picked
    const nextBusy = busyAnimals.length && free <= 0
      ? busyAnimals.reduce((m, a) => (new Date(a.breeding_until) < new Date(m.breeding_until) ? a : m))
      : null
    return { ...g, picked, free, total: g.ids.length, nextBusy }
  })
})

const tierCounts = computed(() => {
  const c = { all: animals.value.length }
  for (const a of animals.value) c[a.tier || 'normal'] = (c[a.tier || 'normal'] || 0) + 1
  return c
})

function toggleGroup(g) {
  if (!eventActive.value) return
  const freeId = g.ids.find(id =>
    id !== pickA.value && id !== pickB.value && !isBusy(animalById.value.get(id)))
  const slotOpen = !pickA.value || !pickB.value
  if (freeId && slotOpen) {
    if (!pickA.value) pickA.value = freeId
    else pickB.value = freeId
  } else if (g.picked) {
    if (g.ids.includes(pickB.value)) pickB.value = null
    else pickA.value = null
  } else if (freeId) {
    pickB.value = freeId
  }
}

const gridCard = ref(null)

function onSlotClick(k) {
  if (k === 'a') pickA.value = null
  else pickB.value = null
  gridCard.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function clearPicks() {
  pickA.value = null
  pickB.value = null
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
        <button
          v-for="slot in [{ k: 'a', sel: selectedA, title: tx('parentA') }, { k: 'b', sel: selectedB, title: tx('parentB') }]"
          :key="slot.k"
          type="button"
          class="bv-slot"
          @click="onSlotClick(slot.k)"
        >
          <div class="bv-slot-title">{{ slot.title }}</div>
          <div
            class="bv-slot-body"
            :class="[{ filled: slot.sel }, slot.sel ? 'tier-' + (slot.sel.tier || 'normal') : '']"
            :style="slot.sel ? { '--tier-color': tierInfo(slot.sel.tier).color } : {}"
          >
            <template v-if="slot.sel">
              <span class="bv-slot-emoji">{{ speciesInfo(slot.sel.species).emoji }}</span>
              <span class="bv-slot-name">{{ speciesInfo(slot.sel.species).name }}</span>
              <span v-if="slot.sel.tier && slot.sel.tier !== 'normal'" class="bv-tier-chip">
                {{ tierInfo(slot.sel.tier).badge }} {{ tx('tiers')[slot.sel.tier] }}
              </span>
            </template>
            <span v-else class="bv-slot-empty">{{ tx('choose') }}</span>
          </div>
        </button>
        <div class="bv-heart">💞</div>
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
        <div class="bv-chance-row">
          <span v-for="c in chances" :key="c.species" class="bv-chance-chip">
            <span class="bv-chance-emoji">{{ speciesInfo(c.species).emoji }}</span>
            <span class="bv-chance-name">{{ speciesInfo(c.species).name }}</span>
            <strong>{{ c.percent % 1 === 0 ? c.percent : c.percent.toFixed(1) }}%</strong>
          </span>
        </div>
        <p class="bv-hint">{{ tx('hint') }}</p>
      </section>

      <section v-if="result" class="card bv-result">
        <span class="bv-result-icon">🐣</span>
        <div class="bv-result-body">
          <div class="bv-result-title">{{ tx('done') }}</div>
          <router-link to="/" class="bv-result-link">{{ tx('toIncubator') }} ›</router-link>
        </div>
      </section>

      <section ref="gridCard" class="card bv-grid-card">
        <div class="bv-filters">
          <InputText v-model="query" class="bv-search" :placeholder="tx('search')" />
          <div class="bv-tier-filters">
            <button
              v-for="f in TIER_FILTERS"
              :key="f"
              type="button"
              class="bv-filter"
              :class="[{ on: tierFilter === f }, 'tier-' + f]"
              @click="tierFilter = f"
            >
              <span v-if="f !== 'all' && f !== 'normal'">{{ tierInfo(f).badge }}</span>
              {{ f === 'all' ? tx('all') : tx('tiers')[f] }}
              <em>{{ tierCounts[f] || 0 }}</em>
            </button>
          </div>
        </div>
        <p class="bv-pick-hint">
          {{ tx('pickHint') }}
          <button v-if="pickA || pickB" type="button" class="bv-clear" @click="clearPicks">{{ tx('clear') }}</button>
        </p>

        <div v-if="!groups.length" class="bv-nomatch">{{ tx('noMatch') }}</div>
        <div v-else class="bv-grid">
          <button
            v-for="g in groups"
            :key="g.key"
            type="button"
            class="bv-cell"
            :class="['tier-' + g.tier, { active: g.picked > 0, busy: g.free <= 0 && !g.picked }]"
            :disabled="!eventActive || (g.free <= 0 && !g.picked)"
            :style="{ '--tier-color': tierInfo(g.tier).color }"
            :title="speciesInfo(g.species).name + ' · ' + tx('tiers')[g.tier]"
            @click="toggleGroup(g)"
          >
            <span v-if="g.tier !== 'normal'" class="bv-cell-tier">{{ tierInfo(g.tier).badge }}</span>
            <span v-if="g.total > 1" class="bv-cell-count">
              {{ g.picked ? g.picked + '/' : '' }}{{ g.total }}×
            </span>
            <span class="bv-cell-emoji">{{ speciesInfo(g.species).emoji }}</span>
            <span class="bv-cell-name">{{ speciesInfo(g.species).name }}</span>
            <span class="bv-cell-power">⚡{{ g.power }}</span>
            <span v-if="g.nextBusy" class="bv-cell-busy">{{ tx('busy', { time: busyLeft(g.nextBusy) }) }}</span>
          </button>
        </div>
      </section>

      <div class="bv-breed-bar">
        <Button
          class="btn full bv-breed"
          :disabled="!ready || !affordable || busyKey === 'breed'"
          @click="doBreed"
        >
          {{ busyKey === 'breed' ? tx('breeding') : tx('breed') }}
        </Button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.breeding-view {
  --rainbow-gradient: linear-gradient(135deg, #ff6b6b, #ffd166, #63f2ff, #a855f7, #ff6bd6);
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

.bv-pair { position: relative; display: flex; align-items: stretch; gap: 10px; }
.bv-slot {
  flex: 1; min-width: 0; padding: 0; background: none; border: 0;
  color: inherit; font: inherit; text-align: inherit; cursor: pointer;
}
.bv-slot-title {
  font-size: 10px; font-weight: 800; text-transform: uppercase;
  letter-spacing: 0.07em; color: var(--muted); margin-bottom: 6px;
}
.bv-slot-body {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px; min-height: 92px; padding: 8px;
  border: 2px dashed var(--border); border-radius: 16px;
}
.bv-slot-body.filled { border-style: solid; border-color: var(--tier-color, var(--accent)); }
.bv-slot-emoji { font-size: 34px; line-height: 1; }
.bv-slot-name { font-size: 12px; font-weight: 700; text-align: center; }
.bv-slot-empty { font-size: 12px; color: var(--muted); text-align: center; }
.bv-tier-chip {
  font-size: 10px; font-weight: 800; padding: 1px 7px; border-radius: 999px;
  background: var(--card-2, rgba(0, 0, 0, 0.05)); color: var(--tier-color, inherit);
}
.bv-heart {
  position: absolute; left: 50%; top: 58%; transform: translate(-50%, -50%);
  font-size: 22px; pointer-events: none;
}

.bv-stats { display: flex; justify-content: space-around; gap: 8px; text-align: center; }
.bv-stat { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.bv-stat strong { font-size: 16px; font-weight: 900; }
.bv-stat strong.short { color: var(--danger); }
.bv-stat span {
  font-size: 10px; font-weight: 800; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--muted);
}

.bv-chances { display: flex; flex-direction: column; gap: 6px; }
.bv-chances-title { font-weight: 900; font-size: 15px; }
.bv-chance-row { display: flex; flex-wrap: wrap; gap: 6px; }
.bv-chance-chip {
  display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px 3px 6px;
  background: var(--card-2, rgba(0, 0, 0, 0.04)); border: 1px solid var(--border);
  border-radius: 999px; font-size: 12px;
}
.bv-chance-emoji { font-size: 16px; }
.bv-chance-name { font-weight: 700; }
.bv-chance-chip strong { font-variant-numeric: tabular-nums; font-weight: 900; }
.bv-hint { margin: 2px 0 0; font-size: 11px; color: var(--muted); line-height: 1.45; }

.bv-result { display: flex; align-items: center; gap: 12px; }
.bv-result-icon { font-size: 30px; flex-shrink: 0; }
.bv-result-body { min-width: 0; }
.bv-result-title { font-weight: 900; }
.bv-result-link {
  font-size: 13px; font-weight: 800; color: var(--accent-deep, var(--accent));
  text-decoration: none;
}

.bv-grid-card { display: flex; flex-direction: column; gap: 8px; }
.bv-filters { display: flex; flex-direction: column; gap: 8px; }
.bv-search { width: 100%; }
.bv-tier-filters { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; }
.bv-tier-filters::-webkit-scrollbar { display: none; }
.bv-filter {
  flex-shrink: 0; display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 10px; border-radius: 999px; cursor: pointer;
  border: 2px solid var(--border); background: transparent;
  color: inherit; font: inherit; font-size: 12px; font-weight: 800;
}
.bv-filter em { font-style: normal; font-size: 10px; color: var(--muted); }
.bv-filter.on { border-color: var(--accent); background: rgba(244, 169, 18, 0.14); }
.bv-filter.tier-rainbow.on {
  border-color: transparent;
  background: linear-gradient(var(--card), var(--card)) padding-box, var(--rainbow-gradient) border-box;
}
.bv-pick-hint { margin: 0; font-size: 11px; color: var(--muted); }
.bv-clear {
  margin-left: 6px; padding: 0; background: none; border: 0; cursor: pointer;
  color: var(--accent-deep, var(--accent)); font: inherit; font-weight: 800;
}
.bv-nomatch { padding: 14px 0; text-align: center; color: var(--muted); font-size: 13px; }
.bv-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(78px, 1fr)); gap: 6px;
}
.bv-cell {
  position: relative; display: flex; flex-direction: column; align-items: center; gap: 1px;
  padding: 14px 2px 6px; background: var(--card-2, transparent);
  border: 2px solid var(--border); border-radius: 14px;
  cursor: pointer; color: inherit; font: inherit;
}
.bv-cell:hover:not(:disabled) { border-color: var(--tier-color, var(--accent)); }
.bv-cell.tier-gold, .bv-cell.tier-diamond, .bv-cell.tier-epic { border-color: var(--tier-color); }
.bv-cell.tier-rainbow, .bv-slot-body.filled.tier-rainbow {
  border: 2px solid transparent;
  background: linear-gradient(var(--card), var(--card)) padding-box, var(--rainbow-gradient) border-box;
  box-shadow: 0 0 10px rgba(255, 107, 214, 0.35);
}
.bv-cell.active { background: rgba(244, 169, 18, 0.18); outline: 3px solid var(--accent); outline-offset: -1px; }
.bv-cell.tier-rainbow.active {
  background: linear-gradient(rgba(244, 169, 18, 0.14), rgba(244, 169, 18, 0.14)) padding-box, var(--rainbow-gradient) border-box;
}
.bv-cell.busy, .bv-cell:disabled { opacity: 0.4; cursor: not-allowed; filter: grayscale(0.7); }
.bv-cell-tier { position: absolute; top: 2px; left: 4px; font-size: 12px; line-height: 1; }
.bv-cell-count {
  position: absolute; top: 2px; right: 4px; padding: 0 5px; border-radius: 999px;
  background: var(--accent); color: #fff; font-size: 10px; font-weight: 900; line-height: 16px;
}
.bv-cell-emoji { font-size: 26px; line-height: 1; }
.bv-cell-name {
  max-width: 100%; padding: 0 2px; font-size: 10px; font-weight: 700;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.bv-cell-power { font-size: 10px; font-weight: 800; color: var(--muted); }
.bv-cell-busy { font-size: 8px; font-weight: 700; color: var(--danger); }

.bv-breed-bar {
  position: sticky; bottom: calc(10px + var(--safe-bot));
  z-index: 5; padding-top: 4px;
}
.bv-breed-bar .bv-breed { box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2); }

.event-over {
  display: flex; align-items: center; gap: 12px;
  border-color: rgba(239, 71, 111, 0.45);
}
.eo-icon { font-size: 26px; flex-shrink: 0; }
.eo-body { min-width: 0; }
.eo-title { font-weight: 900; color: var(--danger); }
.eo-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
</style>
