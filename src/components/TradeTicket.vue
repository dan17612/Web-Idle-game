<script setup>
import { computed } from 'vue'
import { speciesInfo, tierInfo, formatCoins } from '../animals'
import { EGG_TYPES } from '../eggs'
import { fairness, isEmptySide } from '../tradeTickets'

// Eine Trade-Karte im Stil der Zoo-Börse: Kopf mit Partner und Status,
// darunter "Du gibst" (rot) und "Du bekommst" (grün) mit Marktwert und
// Fairness-Balken. Aktionen kommen über den Slot.
const props = defineProps({
  sides: { type: Object, required: true },
  partner: { type: String, default: '' },
  avatar: { type: String, default: '' },
  meta: { type: String, default: '' },
  status: { type: Object, default: null },   // { text, kind }
  expiry: { type: String, default: '' },
  note: { type: String, default: '' },
  giveValue: { type: Object, default: null }, // { value, partial }
  getValue: { type: Object, default: null },
  labels: { type: Object, required: true },
  compact: Boolean
})

const fair = computed(() => {
  const g = props.giveValue?.value || 0
  const r = props.getValue?.value || 0
  if (!g && !r) return null
  return fairness(g, r)
})

function animalTiles(side) {
  return side.animals.map((a) => {
    const info = speciesInfo(a.species)
    const td = tierInfo(a.tier)
    return { ...a, emoji: info.emoji, name: info.name, badge: td.badge, color: td.color, tiered: a.tier !== 'normal' }
  })
}
function eggTiles(side) {
  return side.eggs.map((e) => {
    const meta = EGG_TYPES[e.egg_type] || {}
    return { ...e, emoji: e.emoji || meta.emoji || '🥚', name: e.name || meta.name || e.egg_type }
  })
}
const give = computed(() => ({ animals: animalTiles(props.sides.give), eggs: eggTiles(props.sides.give), coins: props.sides.give.coins, wanted: props.sides.give.wanted, empty: isEmptySide(props.sides.give) }))
const get = computed(() => ({ animals: animalTiles(props.sides.get), eggs: eggTiles(props.sides.get), coins: props.sides.get.coins, wanted: props.sides.get.wanted, empty: isEmptySide(props.sides.get) }))

const fmtValue = (v) => (v ? `${v.partial ? '≥ ' : '≈ '}${formatCoins(v.value)}` : '')
const verdictText = computed(() => {
  const f = fair.value
  if (!f) return ''
  const pct = `${Math.abs(f.pct).toFixed(0)}%`
  if (f.verdict === 'great' || f.verdict === 'good') return props.labels.fairPlus?.replace('{pct}', pct) || ''
  if (f.verdict === 'bad' || f.verdict === 'awful') return props.labels.fairMinus?.replace('{pct}', pct) || ''
  return props.labels.fairEven || ''
})
</script>

<template>
  <article class="tk" :class="[{ compact }, status ? 'st-' + status.kind : '']">
    <header class="tk-head">
      <div class="tk-avatar">{{ avatar || (partner ? partner.charAt(0).toUpperCase() : '🌐') }}</div>
      <div class="tk-who">
        <b>{{ partner || labels.anyone }}</b>
        <small>{{ meta }}</small>
      </div>
      <div class="tk-flags">
        <span v-if="expiry" class="tk-flag timer">⏳ {{ expiry }}</span>
        <span v-if="status" class="tk-flag" :class="status.kind">{{ status.text }}</span>
      </div>
    </header>

    <div class="tk-body">
      <section class="tk-side give">
        <div class="tk-side-head">
          <span>{{ labels.give }}</span>
          <b v-if="giveValue && !give.empty">{{ fmtValue(giveValue) }}</b>
        </div>
        <div class="tk-items">
          <span v-for="a in give.animals" :key="a.key" class="tk-item" :class="{ tiered: a.tiered }" :style="a.tiered ? { '--tier': a.color } : null" :title="a.name">
            <span class="tk-emoji">{{ a.emoji }}<i v-if="a.badge">{{ a.badge }}</i></span>
            <small v-if="!compact">{{ a.name }}</small>
            <em v-if="a.qty > 1">×{{ a.qty }}</em>
          </span>
          <span v-for="e in give.eggs" :key="'e' + e.key" class="tk-item egg" :title="e.name">
            <span class="tk-emoji">{{ e.emoji }}</span>
            <small v-if="!compact">{{ e.name }}</small>
            <em v-if="e.qty > 1">×{{ e.qty }}</em>
          </span>
          <span v-if="give.coins" class="tk-coins">🪙 {{ formatCoins(give.coins) }}</span>
          <span v-if="give.empty" class="tk-nothing">{{ labels.nothing }}</span>
        </div>
        <div v-if="give.wanted" class="tk-hint">{{ labels.wanted }}</div>
      </section>

      <div class="tk-swap" aria-hidden="true">⇅</div>

      <section class="tk-side get">
        <div class="tk-side-head">
          <span>{{ labels.get }}</span>
          <b v-if="getValue && !get.empty">{{ fmtValue(getValue) }}</b>
        </div>
        <div class="tk-items">
          <span v-for="a in get.animals" :key="a.key" class="tk-item" :class="{ tiered: a.tiered }" :style="a.tiered ? { '--tier': a.color } : null" :title="a.name">
            <span class="tk-emoji">{{ a.emoji }}<i v-if="a.badge">{{ a.badge }}</i></span>
            <small v-if="!compact">{{ a.name }}</small>
            <em v-if="a.qty > 1">×{{ a.qty }}</em>
          </span>
          <span v-for="e in get.eggs" :key="'e' + e.key" class="tk-item egg" :title="e.name">
            <span class="tk-emoji">{{ e.emoji }}</span>
            <small v-if="!compact">{{ e.name }}</small>
            <em v-if="e.qty > 1">×{{ e.qty }}</em>
          </span>
          <span v-if="get.coins" class="tk-coins">🪙 {{ formatCoins(get.coins) }}</span>
          <span v-if="get.empty" class="tk-nothing">{{ labels.nothing }}</span>
        </div>
        <div v-if="get.wanted" class="tk-hint">{{ labels.wanted }}</div>
      </section>
    </div>

    <div v-if="fair && !compact" class="tk-fair" :class="fair.verdict">
      <div class="tk-meter">
        <i class="g" :style="{ width: ((1 - fair.share) * 100).toFixed(1) + '%' }"></i>
        <i class="r" :style="{ width: (fair.share * 100).toFixed(1) + '%' }"></i>
      </div>
      <span>{{ verdictText }}</span>
    </div>

    <p v-if="note" class="tk-note">💬 „{{ note }}"</p>

    <footer v-if="$slots.default" class="tk-actions">
      <slot />
    </footer>
  </article>
</template>

<style scoped>
.tk {
  --tk-up: var(--accent-2);
  --tk-down: var(--danger);
  background: var(--card);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  padding: var(--space-3) var(--space-4) var(--space-4);
  margin-bottom: var(--space-3);
  position: relative;
  overflow: hidden;
}
.tk::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 5px;
  background: var(--accent);
}
.tk.st-accepted::before { background: var(--tk-up); }
.tk.st-declined::before, .tk.st-cancelled::before { background: var(--tk-down); }
.tk.st-expired::before { background: var(--muted); }
.tk.st-public::before, .tk.st-mine::before { background: var(--purple); }
.tk.compact { padding: var(--space-3); margin-bottom: var(--space-2); box-shadow: none; }

.tk-head { display: flex; align-items: center; gap: 10px; margin-bottom: var(--space-3); }
.tk-avatar {
  width: 40px; height: 40px; border-radius: 50%; flex: 0 0 auto;
  display: grid; place-items: center; font-size: 19px; font-weight: 900; color: var(--accent-ink);
  background: linear-gradient(160deg, var(--accent-soft), var(--accent));
  box-shadow: 0 2px 0 var(--accent-deep);
}
.compact .tk-avatar { width: 32px; height: 32px; font-size: 15px; }
.tk-who { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.2; }
.tk-who b { color: var(--heading); font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tk-who small { color: var(--muted); font-size: 12px; font-weight: 700; }
.tk-flags { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.tk-flag {
  font-size: 11px; font-weight: 900; letter-spacing: 0.03em; white-space: nowrap;
  padding: 3px 8px; border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent-deep);
}
.tk-flag.timer { background: var(--surface-deep); color: var(--muted); }
.tk-flag.accepted { background: color-mix(in srgb, var(--tk-up) 16%, transparent); color: color-mix(in srgb, var(--tk-up) 80%, #000); }
.tk-flag.declined, .tk-flag.cancelled { background: color-mix(in srgb, var(--tk-down) 14%, transparent); color: var(--tk-down); }
.tk-flag.expired { background: var(--surface-deep); color: var(--muted); }
.tk-flag.public, .tk-flag.mine { background: color-mix(in srgb, var(--purple) 14%, transparent); color: var(--purple-deep); }

.tk-body { display: flex; flex-direction: column; gap: 4px; }
.tk-side {
  border-radius: 16px; padding: 10px 12px;
  border: 2px solid transparent;
}
.tk-side.give { background: color-mix(in srgb, var(--tk-down) 7%, var(--card)); border-color: color-mix(in srgb, var(--tk-down) 22%, transparent); }
.tk-side.get { background: color-mix(in srgb, var(--tk-up) 8%, var(--card)); border-color: color-mix(in srgb, var(--tk-up) 26%, transparent); }
.compact .tk-side { padding: 6px 10px; }
.tk-side-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 6px; }
.tk-side-head span { font-size: 11px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
.give .tk-side-head span { color: var(--tk-down); }
.get .tk-side-head span { color: color-mix(in srgb, var(--tk-up) 80%, #000); }
.tk-side-head b { font-size: 13px; font-variant-numeric: tabular-nums; color: var(--heading); }
.compact .tk-side-head { margin-bottom: 2px; }
.tk-items { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.tk-item {
  display: inline-flex; align-items: center; gap: 5px;
  background: var(--card); border: 2px solid var(--border); border-radius: 12px;
  padding: 4px 9px 4px 5px;
}
.tk-item.tiered { border-color: var(--tier); box-shadow: 0 0 0 1px color-mix(in srgb, var(--tier) 30%, transparent); }
.tk-emoji { position: relative; font-size: 22px; line-height: 1; }
.tk-emoji i { position: absolute; right: -6px; bottom: -4px; font-size: 11px; font-style: normal; }
.tk-item small { font-size: 12px; font-weight: 800; color: var(--text); max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tk-item em { font-style: normal; font-weight: 900; font-size: 12px; color: var(--accent-deep); font-variant-numeric: tabular-nums; }
.compact .tk-item { padding: 2px 7px 2px 4px; }
.compact .tk-emoji { font-size: 18px; }
.tk-coins {
  display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 12px;
  background: linear-gradient(180deg, #fff6d8, #ffe7a3); border: 2px solid var(--accent-soft);
  font-weight: 900; font-size: 13px; color: var(--accent-ink); font-variant-numeric: tabular-nums;
}
.tk-nothing { font-size: 13px; color: var(--muted); font-weight: 700; }
.tk-hint { font-size: 11px; color: var(--muted); margin-top: 5px; font-weight: 700; }
.tk-swap {
  align-self: center; width: 30px; height: 30px; margin: -12px 0; z-index: 1;
  display: grid; place-items: center; border-radius: 50%;
  background: var(--card); border: 2px solid var(--border); color: var(--accent-deep); font-weight: 900;
}
.compact .tk-swap { width: 24px; height: 24px; margin: -10px 0; font-size: 12px; }

.tk-fair { display: flex; align-items: center; gap: 10px; margin-top: var(--space-3); font-size: 12px; font-weight: 800; }
.tk-meter { flex: 1; display: flex; height: 8px; border-radius: 99px; overflow: hidden; background: var(--surface-deep); }
.tk-meter .g { background: var(--tk-down); }
.tk-meter .r { background: var(--tk-up); }
.tk-fair span { white-space: nowrap; }
.tk-fair.great span, .tk-fair.good span { color: color-mix(in srgb, var(--tk-up) 80%, #000); }
.tk-fair.bad span, .tk-fair.awful span { color: var(--tk-down); }
.tk-fair.fair span { color: var(--muted); }

.tk-note {
  margin: var(--space-3) 0 0; padding: 8px 12px; border-radius: 12px;
  background: var(--card-2); color: var(--text); font-size: 13px; font-style: italic;
}
.tk-actions { display: flex; gap: var(--space-2); margin-top: var(--space-3); }
.tk-actions :deep(.p-button) { flex: 1; }
</style>
