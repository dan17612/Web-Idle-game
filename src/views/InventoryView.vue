<script setup>
import { ref, computed, onMounted } from "vue";
import { useGameStore } from "../stores/game";
import { supabase } from "../supabase";
import { speciesInfo, formatCoins, tierInfo, isUpgrading, animalRate, compareAnimalsByRate } from "../animals";
import { t } from "../i18n";
import { useReturnRefresh } from "../composables/useReturnRefresh";
import { useAppToast } from "../composables/useAppToast";

const game = useGameStore();
const appToast = useAppToast();
const error = ref("");
const busy = ref("");
const slotInfo = ref({ current_slots: 1, next_slot: 2, next_cost: null });
const filter = ref("all");
const search = ref("");

async function loadSlot() {
  const { data } = await supabase.rpc("get_next_slot_cost");
  slotInfo.value = data || slotInfo.value;
}

onMounted(async () => {
  if (!game.animals.length) await game.load();
  await loadSlot();
});

useReturnRefresh(loadSlot);

const tierOrder = ["rainbow", "epic", "diamond", "gold", "normal"];
const tierRank = { rainbow: 0, epic: 1, diamond: 2, gold: 3, normal: 4 };

const enriched = computed(() =>
  game.animals.map((a) => ({
    ...a,
    info: speciesInfo(a.species),
    td: tierInfo(a.tier || "normal"),
    t: a.tier || "normal",
    rate: animalRate(a),
    upgrading: isUpgrading(a),
  })),
);

const filteredAnimals = computed(() => {
  const q = search.value.trim().toLowerCase();
  return enriched.value
    .filter((a) => {
      if (filter.value !== "all" && filter.value !== "equipped" && a.t !== filter.value) return false;
      if (filter.value === "equipped" && !a.equipped) return false;
      if (q && !a.info.name.toLowerCase().includes(q) && !a.species.toLowerCase().includes(q)) return false;
      return true;
    })
    .slice()
    .sort(compareAnimalsByRate);
});

const groupedAnimals = computed(() => {
  const map = new Map();

  for (const a of filteredAnimals.value) {
    const key = `${a.species}|${a.t}|${a.upgrading ? "upg" : "ready"}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        species: a.species,
        t: a.t,
        info: a.info,
        td: a.td,
        rate: a.rate,
        upgrading: a.upgrading,
        members: [],
      });
    }
    map.get(key).members.push(a);
  }

  const groups = [...map.values()].map((g) => {
    const equipped = g.members.filter((m) => m.equipped);
    const unequippedReady = g.members.filter((m) => !m.equipped && !m.upgrading);
    const favorite = g.members.find((m) => m.id === game.favoriteAnimalId) || null;
    return {
      ...g,
      total: g.members.length,
      equippedCount: equipped.length,
      equippedIds: equipped.map((m) => m.id),
      unequippedReadyIds: unequippedReady.map((m) => m.id),
      favoriteId: favorite?.id || null,
      favoriteInGroup: !!favorite,
    };
  });

  groups.sort((a, b) => {
    if (a.favoriteInGroup !== b.favoriteInGroup) return a.favoriteInGroup ? -1 : 1;
    if ((a.equippedCount > 0) !== (b.equippedCount > 0)) return a.equippedCount > 0 ? -1 : 1;
    if ((b.rate || 0) !== (a.rate || 0)) return b.rate - a.rate;
    const ra = tierRank[a.t] ?? 99;
    const rb = tierRank[b.t] ?? 99;
    if (ra !== rb) return ra - rb;
    if ((b.total || 0) !== (a.total || 0)) return b.total - a.total;
    return (b.info?.cost || 0) - (a.info?.cost || 0);
  });

  return groups;
});

const counts = computed(() => {
  const c = { all: enriched.value.length, equipped: 0 };
  for (const tier of tierOrder) c[tier] = 0;
  for (const a of enriched.value) {
    if (a.equipped) c.equipped++;
    c[a.t] = (c[a.t] || 0) + 1;
  }
  return c;
});

async function equipOne(group) {
  const id = group.unequippedReadyIds[0];
  if (!id || game.freeSlots <= 0) {
    if (game.freeSlots <= 0) appToast.err(t("inventory.noFreeSlots"));
    return;
  }
  busy.value = `eq-${group.key}`;
  try {
    await game.equipAnimal(id);
  } catch (e) {
    appToast.err(e);
  } finally {
    busy.value = "";
  }
}

async function equipAll(group) {
  const toEquip = group.unequippedReadyIds.slice(0, game.freeSlots);
  if (!toEquip.length) return;
  busy.value = `eq-${group.key}`;
  try {
    await Promise.all(toEquip.map(id => game.equipAnimal(id)));
  } catch (e) {
    appToast.err(e);
  } finally {
    busy.value = "";
  }
}

async function unequipOne(group) {
  const id = group.equippedIds[0];
  if (!id) return;
  busy.value = `uneq-${group.key}`;
  try {
    await game.unequipAnimal(id);
  } catch (e) {
    appToast.err(e);
  } finally {
    busy.value = "";
  }
}

async function unequipAll(group) {
  if (!group.equippedIds.length) return;
  busy.value = `uneq-${group.key}`;
  try {
    await Promise.all(group.equippedIds.map(id => game.unequipAnimal(id)));
  } catch (e) {
    appToast.err(e);
  } finally {
    busy.value = "";
  }
}

async function setFavorite(group) {
  if (group.favoriteInGroup) return;
  const id =
    group.favoriteId ||
    group.equippedIds[0] ||
    group.unequippedReadyIds[0] ||
    group.members[0]?.id;
  if (!id) return;
  busy.value = `fav-${group.key}`;
  try {
    await game.setFavoriteAnimal(id);
  } catch (e) {
    appToast.err(e);
  } finally {
    busy.value = "";
  }
}

async function buySlot() {
  busy.value = "slot";
  try {
    await game.buyEquipSlot();
    await loadSlot();
  } catch (e) {
    appToast.err(e);
  } finally {
    busy.value = "";
  }
}

const filters = computed(() => [
  { k: "all", label: t("index.filters.all"), badge: "📦" },
  { k: "equipped", label: t("inventory.active"), badge: "🎯" },
  { k: "rainbow", label: t("profile.tiers.rainbow"), badge: "🌈" },
  { k: "epic", label: t("profile.tiers.epic"), badge: "🟣" },
  { k: "diamond", label: t("profile.tiers.diamond"), badge: "💎" },
  { k: "gold", label: t("profile.tiers.gold"), badge: "🥇" },
  { k: "normal", label: t("profile.tiers.normal"), badge: "⚪" },
]);
</script>

<template>
  <h1 class="title">📦 {{ t("inventory.title") }}</h1>

  <div class="card slot-bar">
    <div class="slot-info">
      <span class="slot-label">{{ t("inventory.equipSlots") }}</span>
      <span class="slot-value">{{ game.equippedCount }}<span class="slot-sep">/</span>{{ game.equipSlots }}</span>
    </div>
    <div class="slot-track">
      <div
        class="slot-fill"
        :style="{ width: game.equipSlots ? (game.equippedCount / game.equipSlots * 100) + '%' : '0%' }"
      />
    </div>
    <Button
      v-if="slotInfo.next_cost != null"
      class="btn slot-buy"
      :disabled="busy === 'slot' || game.displayCoins < slotInfo.next_cost"
      @click="buySlot"
    >
      🪙 {{ formatCoins(slotInfo.next_cost) }}
    </Button>
    <span v-else class="subtitle" style="margin:0;font-size:12px">{{ t("inventory.max") }}</span>
  </div>


  <div class="card filter-card">
    <div class="filter-bar">
      <Button
        v-for="f in filters"
        :key="f.k"
        class="filter-chip"
        :class="{ active: filter === f.k }"
        :disabled="!counts[f.k]"
        @click="filter = f.k"
      >
        <span>{{ f.badge }}</span>
        <span>{{ f.label }}</span>
        <span class="filter-count">{{ counts[f.k] || 0 }}</span>
      </Button>
    </div>
    <div class="search-bar">
      <span class="search-icon">🔍</span>
      <input
        v-model="search"
        class="search-input"
        type="text"
        :placeholder="t('inventory.search')"
        autocomplete="off"
      />
      <button v-if="search" class="search-clear" @click="search = ''">✕</button>
    </div>
  </div>

  <div v-if="!enriched.length" class="card subtitle">
    {{ t("inventory.empty") }}
  </div>
  <div v-else-if="!groupedAnimals.length" class="card subtitle">
    {{ t("inventory.noResults") }}
  </div>

  <div v-else>
    <div class="inv-summary-row subtitle">
      {{ t("inventory.summary", { groups: groupedAnimals.length, animals: filteredAnimals.length }) }}
    </div>

    <div class="inv-grid">
      <div
        v-for="g in groupedAnimals"
        :key="g.key"
        class="inv-card"
        :class="{
          'is-equipped': g.equippedCount > 0,
          'is-tiered': g.t !== 'normal',
          'is-upgrading': g.upgrading,
          'is-fav': g.favoriteInGroup,
        }"
        :style="{ '--tier-color': g.td.color }"
      >
        <div class="inv-top">
          <span class="stack-badge">×{{ g.total }}</span>
          <Button
            class="fav-btn"
            :class="{ active: g.favoriteInGroup }"
            :disabled="busy === `fav-${g.key}`"
            @click="setFavorite(g)"
            :title="t('inventory.markFavorite')"
          >{{ g.favoriteInGroup ? "★" : "☆" }}</Button>
        </div>

        <div class="inv-emoji-wrap">
          <span class="inv-emoji">{{ g.info.emoji }}</span>
          <span v-if="g.td.badge" class="tier-badge">{{ g.td.badge }}</span>
        </div>

        <div class="inv-name">{{ g.info.name }}</div>
        <div class="inv-tier-label" :style="{ color: g.td.color }">
          {{ g.t !== "normal" ? t(`profile.tiers.${g.t}`) : "" }}
        </div>

        <div class="inv-rate">
          <span v-if="g.upgrading">⏳ {{ t("inventory.upgrading") }}</span>
          <span v-else>+{{ formatCoins(g.rate) }}/s</span>
        </div>

        <div v-if="!g.upgrading" class="equip-row">
          <Button
            class="step-btn"
            :disabled="busy === `uneq-${g.key}` || busy === `eq-${g.key}` || !g.equippedIds.length"
            @click="unequipOne(g)"
            :title="t('inventory.unequipOne')"
          >−</Button>

          <div class="equip-counter">
            <span class="eq-num">{{ g.equippedCount }}</span>
            <span class="eq-sep">/</span>
            <span class="eq-total">{{ g.total }}</span>
          </div>

          <Button
            class="step-btn plus"
            :disabled="busy === `eq-${g.key}` || busy === `uneq-${g.key}` || !g.unequippedReadyIds.length || game.freeSlots <= 0"
            @click="equipOne(g)"
            :title="t('inventory.equipOne')"
          >+</Button>
        </div>

        <div v-if="!g.upgrading && g.total > 1" class="bulk-row">
          <Button
            class="btn-ghost"
            :disabled="busy === `eq-${g.key}` || !g.unequippedReadyIds.length || game.freeSlots <= 0"
            @click="equipAll(g)"
          >{{ t("inventory.equipAll") }}</Button>
          <Button
            class="btn-ghost danger"
            :disabled="busy === `uneq-${g.key}` || !g.equippedIds.length"
            @click="unequipAll(g)"
          >{{ t("inventory.unequipAll") }}</Button>
        </div>
        <div v-else-if="!g.upgrading" class="bulk-row single">
          <Button
            v-if="!g.equippedCount"
            class="btn secondary small"
            :disabled="busy === `eq-${g.key}` || !g.unequippedReadyIds.length || game.freeSlots <= 0"
            @click="equipOne(g)"
          >{{ t("inventory.equip") }}</Button>
          <Button
            v-else
            class="btn small"
            :disabled="busy === `uneq-${g.key}` || !g.equippedIds.length"
            @click="unequipOne(g)"
          >{{ t("inventory.unequip") }}</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Slot bar */
.slot-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
}
.slot-info {
  display: flex;
  flex-direction: column;
  min-width: 70px;
}
.slot-label {
  font-size: 10px;
  color: var(--subtitle);
  text-transform: uppercase;
  letter-spacing: .04em;
}
.slot-value {
  font-weight: 800;
  font-size: 17px;
  line-height: 1.2;
}
.slot-sep {
  color: var(--subtitle);
  margin: 0 2px;
}
.slot-track {
  flex: 1;
  height: 6px;
  background: rgba(255,255,255,.08);
  border-radius: 999px;
  overflow: hidden;
}
.slot-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 999px;
  transition: width .4s;
}
.slot-buy {
  flex: 0 0 auto;
  font-size: 12px;
  padding: 6px 12px;
}

/* Filter */
.filter-card { padding: 8px; display: flex; flex-direction: column; gap: 8px; }
.filter-bar {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 2px;
  scrollbar-width: thin;
}

/* Search */
.search-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,.05);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 6px 10px;
}
.search-icon { font-size: 14px; flex: 0 0 auto; opacity: .6; }
.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: inherit;
  font: inherit;
  font-size: 13px;
}
.search-input::placeholder { color: var(--subtitle); opacity: .7; }
.search-clear {
  background: none;
  border: none;
  color: var(--subtitle);
  cursor: pointer;
  font-size: 12px;
  padding: 0 2px;
  line-height: 1;
  flex: 0 0 auto;
}
.search-clear:hover { color: inherit; }
.filter-chip {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #162048;
  border: 1px solid var(--border);
  color: inherit;
  font: inherit;
  padding: 6px 10px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 12px;
}
.filter-chip.active {
  background: var(--accent);
  color: #1b1300;
  border-color: var(--accent);
  font-weight: 700;
}
.filter-chip:disabled { opacity: .4; cursor: not-allowed; }
.filter-count {
  background: rgba(255,255,255,.1);
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}
.filter-chip.active .filter-count { background: rgba(0,0,0,.15); }

/* Summary row */
.inv-summary-row {
  margin: 6px 0 8px;
  font-size: 12px;
}

/* Grid */
.inv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}

/* Card */
.inv-card {
  --tier-color: transparent;
  position: relative;
  background: var(--card-2);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 10px 10px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transition: border-color .2s, box-shadow .2s;
}
.inv-card.is-tiered {
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--tier-color) 16%, var(--card-2)),
    color-mix(in srgb, var(--tier-color) 5%, #101a34)
  );
}
.inv-card.is-equipped {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px rgba(255,209,102,.18) inset, 0 2px 12px rgba(255,209,102,.08);
}
.inv-card.is-fav {
  border-color: color-mix(in srgb, var(--accent) 70%, transparent);
}
.inv-card.is-upgrading { opacity: .65; }

/* Top row */
.inv-top {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.stack-badge {
  font-size: 11px;
  font-weight: 800;
  color: var(--accent);
  background: rgba(255,209,102,.14);
  border: 1px solid rgba(255,209,102,.3);
  border-radius: 999px;
  padding: 2px 7px;
  line-height: 1.4;
}
.fav-btn {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.05);
  color: #cdd6ff;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background .15s, border-color .15s, color .15s;
}
.fav-btn.active {
  color: var(--accent);
  border-color: var(--accent);
  background: rgba(255,209,102,.14);
}
.fav-btn:disabled { opacity: .5; cursor: not-allowed; }

/* Emoji */
.inv-emoji-wrap {
  position: relative;
  font-size: 42px;
  line-height: 1;
  margin: 2px 0;
}
.tier-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  font-size: 16px;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,.6));
}

/* Text */
.inv-name {
  font-weight: 700;
  font-size: 13px;
  text-align: center;
  margin-top: 4px;
}
.inv-tier-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  min-height: 14px;
}
.inv-rate {
  font-size: 11px;
  color: var(--subtitle);
  margin: 2px 0 6px;
}

/* Equip stepper */
.equip-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 4px 0;
}
.step-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.07);
  color: inherit;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background .15s, border-color .15s;
}
.step-btn:not(:disabled):hover { background: rgba(255,255,255,.14); }
.step-btn.plus:not(:disabled) {
  border-color: rgba(255,209,102,.5);
  color: var(--accent);
}
.step-btn.plus:not(:disabled):hover { background: rgba(255,209,102,.1); }
.step-btn:disabled { opacity: .35; cursor: not-allowed; }

.equip-counter {
  flex: 1;
  text-align: center;
  font-size: 14px;
  font-weight: 800;
}
.eq-num { color: var(--accent); }
.eq-sep { color: var(--subtitle); margin: 0 2px; }
.eq-total { color: var(--subtitle); }

/* Bulk actions */
.bulk-row {
  display: flex;
  gap: 5px;
  width: 100%;
  margin-top: 2px;
}
.bulk-row.single { justify-content: center; }
.btn-ghost {
  flex: 1;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--subtitle);
  font: inherit;
  font-size: 10px;
  font-weight: 700;
  padding: 5px 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: background .15s, color .15s, border-color .15s;
  white-space: nowrap;
}
.btn-ghost:not(:disabled):hover {
  background: rgba(255,255,255,.08);
  color: inherit;
  border-color: rgba(255,255,255,.3);
}
.btn-ghost.danger:not(:disabled):hover {
  color: #ff6b6b;
  border-color: rgba(255,107,107,.4);
  background: rgba(255,107,107,.06);
}
.btn-ghost:disabled { opacity: .3; cursor: not-allowed; }

.btn.small { padding: 8px 14px; font-size: 12px; }
</style>
