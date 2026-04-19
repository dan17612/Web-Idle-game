<script setup>
import { computed, ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useGameStore } from "../stores/game";
import { useAuthStore } from "../stores/auth";
import {
  speciesInfo,
  formatCoins,
  TIERS,
  tierInfo,
  isUpgrading,
} from "../animals";

const game = useGameStore();
const auth = useAuthStore();
const router = useRouter();

const equipped = computed(() =>
  game.animals
    .filter((a) => a.equipped)
    .map((a) => ({ ...a, info: speciesInfo(a.species), td: tierInfo(a.tier) })),
);

const slotCells = computed(() => {
  const cells = [];
  for (let i = 0; i < game.equipSlots; i++)
    cells.push(equipped.value[i] || null);
  return cells;
});

const favAnimal = computed(() => {
  const f = game.favoriteAnimal;
  return f ? { ...f, info: speciesInfo(f.species) } : null;
});

const favEmoji = computed(() => favAnimal.value?.info.emoji || "🐾");

const ownedAnimals = computed(() =>
  game.animals.map((a) => ({
    ...a,
    info: speciesInfo(a.species),
    td: tierInfo(a.tier || "normal"),
  })),
);

const pickerOpen = ref(false);
const floats = ref([]);
let floatId = 0;
const error = ref("");

const now = ref(Date.now());
let clockTimer;
onMounted(() => {
  clockTimer = setInterval(() => {
    now.value = Date.now();
  }, 500);
});
onUnmounted(() => clearInterval(clockTimer));

function fmtTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

const tapCooldown = computed(() => {
  void now.value;
  return Math.max(0, game.tapsNextReset - (Date.now() + game.serverOffset));
});

const boostRemaining = computed(() => {
  void now.value;
  return Math.max(0, game.petBoostUntil - (Date.now() + game.serverOffset));
});

const tapLimitReached = computed(() => game.tapsUsed >= game.tapsMax);

async function tap(e) {
  if (tapLimitReached.value) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const x =
    (e.clientX ?? e.touches?.[0]?.clientX ?? rect.left + rect.width / 2) -
    rect.left;
  const y =
    (e.clientY ?? e.touches?.[0]?.clientY ?? rect.top + rect.height / 2) -
    rect.top;
  const id = ++floatId;
  const earnGuess = Math.max(1, Math.floor(game.ratePerSec));
  floats.value.push({ id, x, y, v: "+" + formatCoins(earnGuess) });
  setTimeout(() => {
    floats.value = floats.value.filter((f) => f.id !== id);
  }, 900);
  try {
    const data = await game.tapEarn();
    const f = floats.value.find((f) => f.id === id);
    if (f) f.v = "+" + formatCoins(data.earned);
  } catch (err) {
    error.value = err.message;
    setTimeout(() => (error.value = ""), 2500);
  }
}

const upgradingTap = ref("");
const canUpgradeMul = computed(() => game.displayCoins >= game.nextTapCost);
const canUpgradeCap = computed(() => game.displayCoins >= game.nextCapCost);
const canUpgradeOffline = computed(
  () => game.displayCoins >= game.nextOfflineCost && game.maxOfflineHours < 8,
);

async function upgradeTap(kind) {
  if (upgradingTap.value) return;
  if (kind === "mul" && !canUpgradeMul.value) return;
  if (kind === "cap" && !canUpgradeCap.value) return;
  if (kind === "offline" && !canUpgradeOffline.value) return;
  upgradingTap.value = kind;
  try {
    await game.persist();
    if (kind === "offline") await game.upgradeOffline();
    else await game.upgradeTap(kind);
  } catch (e) {
    error.value = e.message;
    setTimeout(() => (error.value = ""), 2500);
  } finally {
    upgradingTap.value = "";
  }
}

// === Fusion ===
const fusionOpen = ref(false);
const fusionBusy = ref(false);
const fusionTarget = ref(null); // { species, tier }

const tierList = computed(() =>
  Object.entries(TIERS)
    .filter(([t, d]) => t !== "normal" && d.required_qty > 0)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([t, d]) => ({ tier: t, ...d })),
);

const fusionGroups = computed(() => {
  const groups = {};
  for (const a of game.animals) {
    if (a.equipped) continue;
    if ((a.tier || "normal") !== "normal") continue;
    if (isUpgrading(a)) continue;
    groups[a.species] ??= [];
    groups[a.species].push(a);
  }
  return Object.entries(groups)
    .map(([sp, list]) => {
      const info = speciesInfo(sp);
      // next reachable tier given count
      let next = null;
      for (const t of tierList.value) {
        if (list.length >= t.required_qty) next = t;
      }
      return { species: sp, info, list, count: list.length, next };
    })
    .filter((g) => g.count > 0)
    .sort((a, b) => b.count - a.count);
});

const upgradingList = computed(() =>
  game.animals
    .filter((a) => isUpgrading(a))
    .map((a) => ({ ...a, info: speciesInfo(a.species), td: tierInfo(a.tier) })),
);

function fmtReady(a) {
  void now.value;
  const ms =
    new Date(a.upgrade_ready_at).getTime() - (Date.now() + game.serverOffset);
  return fmtTime(Math.max(0, ms));
}

async function doFusion(species, tier) {
  const group = fusionGroups.value.find((g) => g.species === species);
  if (!group) return;
  const td = TIERS[tier];
  if (!td || group.count < td.required_qty) return;
  fusionBusy.value = true;
  fusionTarget.value = { species, tier };
  try {
    const ids = group.list.slice(0, td.required_qty).map((a) => a.id);
    await game.startTierUpgrade(ids, tier);
  } catch (e) {
    error.value = e.message;
    setTimeout(() => (error.value = ""), 2500);
  } finally {
    fusionBusy.value = false;
    fusionTarget.value = null;
  }
}

async function pickFavorite(animalId) {
  try {
    await game.setFavoriteAnimal(animalId);
    pickerOpen.value = false;
  } catch (e) {
    error.value = e.message;
    setTimeout(() => (error.value = ""), 2500);
  }
}
</script>

<template>
  <div>
    <div class="welcome">
      <router-link to="/profile" class="welcome-link">
        <div class="welcome-avatar">{{ auth.profile?.avatar_emoji || "👤" }}</div>
        <div>
          <div class="subtitle" style="margin: 0">Willkommen zurück</div>
          <div class="username">
            {{ auth.profile?.username || "Spieler" }}
            <span class="profile-hint">→ Profil & Sammlung</span>
          </div>
        </div>
      </router-link>
      <div v-if="game.favoriteBoostActive" class="boost-chip">
        ×{{ game.petBoostMultiplier }} · {{ fmtTime(boostRemaining) }}
      </div>
    </div>

    <div class="card tap-card">
      <div class="row between" style="margin-bottom: 4px">
        <div>
          <div class="subtitle" style="margin: 0">Einkommen</div>
          <div class="rate">
            +{{ formatCoins(game.ratePerSec) }}
            <span style="opacity: 0.6">/s</span>
            <span v-if="game.favoriteBoostActive" class="rate-boost"
              >×{{ game.petBoostMultiplier }}</span
            >
          </div>
        </div>
        <div style="text-align: right">
          <div class="subtitle" style="margin: 0">Taps</div>
          <div class="tap-count">
            <span
              :class="{ low: game.tapsRemaining <= 3, zero: tapLimitReached }"
            >
              {{ game.tapsRemaining }}
            </span>
            <span style="opacity: 0.4"> / {{ game.tapsMax }}</span>
          </div>
          <div class="tap-reset">↻ {{ fmtTime(tapCooldown) }}</div>
        </div>
      </div>

      <div class="tap-wrap">
        <div
          class="tap-zone"
          :class="{
            disabled: tapLimitReached,
            boosted: game.favoriteBoostActive,
            empty: !favAnimal,
          }"
          @pointerdown="tap"
        >
          <span class="tap-emoji">{{ tapLimitReached ? "⏳" : favEmoji }}</span>
          <span v-if="game.favoriteBoostActive" class="tap-sparkle">✨</span>
        </div>
        <span
          v-for="f in floats"
          :key="f.id"
          class="float"
          :style="{ left: f.x + 'px', top: f.y + 'px' }"
          >{{ f.v }}</span
        >
      </div>

      <p v-if="tapLimitReached" class="tap-note locked">
        Limit erreicht. Neue Taps in {{ fmtTime(tapCooldown) }}.
      </p>
      <p v-else-if="favAnimal" class="tap-note">
        <b>{{ favAnimal.info.name }}</b> ist dein Liebling. Tippe für Münzen.
      </p>
      <p v-else class="tap-note">
        Kaufe dein erstes Tier im Shop, um es zu füttern und zu tippen.
      </p>
      <p v-if="error" class="error" style="text-align: center; margin: 4px 0 0">
        {{ error }}
      </p>
    </div>

    <div class="card">
      <div class="row between" style="margin-bottom: 8px">
        <h2 class="title" style="margin: 0; font-size: 16px">
          👆 Tap-Upgrades
        </h2>
      </div>
      <div class="tap-upgrade-grid">
        <div class="tu-card">
          <div class="tu-head">
            <span class="tu-icon">⚡</span>
            <div>
              <div class="tu-title">Multiplikator</div>
              <div class="tu-sub">
                Lvl {{ game.tapLevel }} · ×{{ game.tapMultiplier.toFixed(2) }}
              </div>
            </div>
          </div>
          <div class="tu-next">
            Nächster Lvl: ×{{ (game.tapMultiplier + 0.25).toFixed(2) }}
          </div>
          <button
            class="btn"
            :disabled="!canUpgradeMul || !!upgradingTap"
            @click="upgradeTap('mul')"
          >
            {{
              upgradingTap === "mul"
                ? "..."
                : "⬆ " + formatCoins(game.nextTapCost)
            }}
          </button>
        </div>
        <div class="tu-card">
          <div class="tu-head">
            <span class="tu-icon">🔋</span>
            <div>
              <div class="tu-title">Mehr Taps</div>
              <div class="tu-sub">
                Lvl {{ game.tapCapLevel }} · {{ game.tapsMax }} / Runde
              </div>
            </div>
          </div>
          <div class="tu-next">
            Nächster Lvl: {{ 10 + game.tapCapLevel * 5 }} / Runde
          </div>
          <button
            class="btn"
            :disabled="!canUpgradeCap || !!upgradingTap"
            @click="upgradeTap('cap')"
          >
            {{
              upgradingTap === "cap"
                ? "..."
                : "⬆ " + formatCoins(game.nextCapCost)
            }}
          </button>
        </div>
        <div class="tu-card">
          <div class="tu-head">
            <span class="tu-icon">💤</span>
            <div>
              <div class="tu-title">Offline-Zeit</div>
              <div class="tu-sub">
                Lvl {{ game.offlineLevel }} · {{ game.maxOfflineHours }}h max
              </div>
            </div>
          </div>
          <div class="tu-next">
            <template v-if="game.maxOfflineHours < 8">
              Nächster Lvl: {{ (game.maxOfflineHours + 0.5).toFixed(1) }}h
            </template>
            <template v-else> Maximum erreicht </template>
          </div>
          <button
            class="btn"
            :disabled="!canUpgradeOffline || !!upgradingTap"
            @click="upgradeTap('offline')"
          >
            {{
              upgradingTap === "offline"
                ? "..."
                : game.maxOfflineHours >= 8
                  ? "MAX"
                  : "⬆ " + formatCoins(game.nextOfflineCost)
            }}
          </button>
        </div>
      </div>
    </div>

    <div class="card pet-card" :class="{ boosted: game.favoriteBoostActive }">
      <div class="pet-top">
        <div class="pet-emoji">
          {{ favEmoji }}{{ game.favoriteBoostActive ? "✨" : "" }}
        </div>
        <div class="pet-body">
          <div class="pet-title">
            {{ favAnimal ? favAnimal.info.name : "Kein Liebling gewählt" }}
          </div>
          <div v-if="game.favoriteBoostActive" class="pet-status boost">
            ×{{ game.petBoostMultiplier }} · {{ fmtTime(boostRemaining) }}
          </div>
          <div v-else class="pet-status">
            Wähle & füttere deinen Liebling für ×-Boost.
          </div>
        </div>
        <div class="pet-actions">
          <button
            class="btn secondary small"
            :disabled="!ownedAnimals.length"
            @click="pickerOpen = !pickerOpen"
          >
            ⭐ Wählen
          </button>
          <button
            class="btn small"
            :disabled="!favAnimal"
            @click="router.push('/shop?tab=food')"
          >
            🍖 Füttern
          </button>
        </div>
      </div>
      <div v-if="pickerOpen && ownedAnimals.length" class="fav-strip">
        <button
          v-for="a in ownedAnimals"
          :key="a.id"
          class="fav-pill"
          :class="{
            active: a.id === game.favoriteAnimalId,
            tiered: (a.tier || 'normal') !== 'normal',
          }"
          :style="
            (a.tier || 'normal') !== 'normal'
              ? { '--tier-color': tierInfo(a.tier).color }
              : null
          "
          @click="pickFavorite(a.id)"
        >
          <span class="fav-pill-emoji">{{ a.info.emoji }}</span>
          <span v-if="tierInfo(a.tier).badge" class="fav-pill-badge">{{
            tierInfo(a.tier).badge
          }}</span>
          <span class="fav-pill-name">{{ a.info.name }}</span>
        </button>
      </div>
    </div>

    <div class="card quick-actions">
      <router-link to="/inventory" class="qa-btn">
        <span class="qa-icon">📦</span>
        <span class="qa-label">Inventar</span>
        <span class="qa-sub">{{ ownedAnimals.length }} Tiere</span>
      </router-link>
      <router-link to="/shop" class="qa-btn">
        <span class="qa-icon">🛒</span>
        <span class="qa-label">Shop</span>
        <span class="qa-sub">Tiere & Futter</span>
      </router-link>
      <router-link to="/trade" class="qa-btn">
        <span class="qa-icon">🔄</span>
        <span class="qa-label">Trade</span>
        <span class="qa-sub">Tauschen</span>
      </router-link>
      <router-link to="/friends" class="qa-btn">
        <span class="qa-icon">🤝</span>
        <span class="qa-label">Freunde</span>
        <span class="qa-sub">Senden</span>
      </router-link>
      <router-link to="/index" class="qa-btn">
        <span class="qa-icon">🏆</span>
        <span class="qa-label">Index</span>
        <span class="qa-sub">Sammlung</span>
      </router-link>
    </div>

    <div class="card equip-card">
      <div class="row between" style="margin-bottom: 8px">
        <h2 class="title" style="margin: 0; font-size: 18px">
          🎯 Ausgerüstet
          <span class="badge" style="margin-left: 6px"
            >{{ game.equippedCount }} / {{ game.equipSlots }}</span
          >
        </h2>
        <router-link to="/inventory" class="btn inventory-btn">
          📦 Inventar verwalten
        </router-link>
      </div>
      <div class="farm-grid">
        <template v-for="(cell, i) in slotCells" :key="i">
          <div
            v-if="cell"
            class="farm-cell alive"
            :class="{
              boosted: cell.id === game.favoriteAnimalId && game.boostActive,
              favorite: cell.id === game.favoriteAnimalId,
              tiered: (cell.tier || 'normal') !== 'normal',
            }"
            :style="
              (cell.tier || 'normal') !== 'normal'
                ? { '--tier-color': cell.td.color }
                : null
            "
          >
            <div v-if="cell.id === game.favoriteAnimalId" class="farm-star">
              ⭐
            </div>
            <div v-if="cell.td && cell.td.badge" class="farm-tier">
              {{ cell.td.badge }}
            </div>
            <div class="farm-emoji">{{ cell.info.emoji }}</div>
            <div class="farm-name">{{ cell.info.name }}</div>
            <div class="farm-rate">
              +{{ formatCoins(game.rateForAnimal(cell)) }}/s
            </div>
            <div
              v-if="cell.id === game.favoriteAnimalId && game.boostActive"
              class="farm-spark"
            >
              ✨
            </div>
          </div>
          <router-link
            v-else
            to="/inventory"
            class="farm-cell empty"
            :aria-label="`Freier Slot ${i + 1} — zum Inventar`"
          >
            <div class="farm-plus">＋</div>
            <div class="farm-meta">Freier Slot</div>
            <div class="farm-meta-sub">Tippen zum Ausrüsten</div>
          </router-link>
        </template>
      </div>
    </div>

    <div class="card fusion-card">
      <div class="row between" style="margin-bottom: 8px">
        <h2 class="title" style="margin: 0; font-size: 18px">
          🧬 Fusions-Maschine
        </h2>
        <button class="btn fusion-toggle" @click="fusionOpen = !fusionOpen">
          {{ fusionOpen ? "✕ Schließen" : "🧬 Öffnen" }}
        </button>
      </div>
      <p class="hint">
        Kombiniere gleiche Tiere (normal, nicht ausgerüstet) zu höherwertigen
        Tieren. 3× → 🥇 Gold, 6× → 💎 Diamant, 9× → 🟣 Episch, 12× → 🌈 Rainbow.
      </p>

      <div v-if="upgradingList.length > 0" class="upgrading-grid">
        <div
          v-for="a in upgradingList"
          :key="a.id"
          class="tier-chip upgrading"
          :style="{ '--tier-color': a.td.color }"
        >
          <div class="tier-emoji">
            {{ a.info.emoji }}<span class="tier-badge">{{ a.td.badge }}</span>
          </div>
          <div class="tier-name">{{ a.info.name }}</div>
          <div class="tier-time">⏳ {{ fmtReady(a) }}</div>
        </div>
      </div>

      <div v-if="fusionOpen" class="fusion-body">
        <div
          v-if="fusionGroups.length === 0"
          class="hint"
          style="text-align: center; padding: 12px"
        >
          Keine normalen, nicht ausgerüsteten Tiere vorhanden.
        </div>
        <div v-for="g in fusionGroups" :key="g.species" class="fusion-row">
          <div class="fusion-head">
            <div class="fusion-sp">
              <span style="font-size: 32px">{{ g.info.emoji }}</span>
              <div>
                <div style="font-weight: 700">{{ g.info.name }}</div>
                <div class="hint">{{ g.count }}× verfügbar</div>
              </div>
            </div>
          </div>
          <div class="fusion-tiers">
            <button
              v-for="t in tierList"
              :key="t.tier"
              class="tier-chip"
              :class="{
                locked: g.count < t.required_qty,
                busy:
                  fusionBusy &&
                  fusionTarget &&
                  fusionTarget.species === g.species &&
                  fusionTarget.tier === t.tier,
              }"
              :style="{ '--tier-color': t.color }"
              :disabled="g.count < t.required_qty || fusionBusy"
              @click="doFusion(g.species, t.tier)"
            >
              <div class="tier-emoji">
                {{ g.info.emoji }}<span class="tier-badge">{{ t.badge }}</span>
              </div>
              <div class="tier-name">{{ t.tier }}</div>
              <div class="tier-meta">
                {{ t.required_qty }}× · ×{{ t.multiplier }} ·
                {{ t.upgrade_minutes }}min
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.welcome {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  gap: 10px;
}
.welcome-link {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: inherit;
  flex: 1;
  min-width: 0;
}
.welcome-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2a3866, #162048);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}
.welcome-link:hover .welcome-avatar {
  border-color: var(--accent);
}
.username {
  font-weight: 800;
  font-size: 18px;
}
.profile-hint {
  font-size: 10px;
  font-weight: 500;
  color: var(--muted);
  margin-left: 6px;
}
.boost-chip {
  background: linear-gradient(135deg, #06d6a0, #ffd166);
  color: #0b1220;
  font-weight: 800;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  box-shadow: 0 4px 14px rgba(6, 214, 160, 0.35);
}

.tap-card {
  text-align: center;
  position: relative;
  overflow: hidden;
}
.rate {
  font-size: 22px;
  font-weight: 800;
  color: var(--accent-2);
}
.rate-boost {
  font-size: 12px;
  background: var(--accent);
  color: #1b1300;
  padding: 2px 6px;
  border-radius: 999px;
  margin-left: 4px;
  vertical-align: middle;
}
.tap-count {
  font-size: 22px;
  font-weight: 800;
}
.tap-count .low {
  color: var(--accent);
}
.tap-count .zero {
  color: var(--danger);
}
.tap-reset {
  font-size: 11px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.tap-wrap {
  position: relative;
  display: flex;
  justify-content: center;
}
.tap-zone {
  position: relative;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #3b4a88, #162048 70%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  box-shadow:
    0 20px 50px rgba(0, 0, 0, 0.4),
    inset 0 0 40px rgba(255, 255, 255, 0.05);
  transition: transform 0.08s ease;
}
.tap-zone:active {
  transform: scale(0.96);
}
.tap-zone.disabled {
  filter: grayscale(0.8);
  opacity: 0.55;
  cursor: not-allowed;
}
.tap-zone.empty {
  opacity: 0.6;
}
.tap-zone.boosted {
  box-shadow:
    0 0 0 3px rgba(6, 214, 160, 0.4),
    0 20px 50px rgba(6, 214, 160, 0.25),
    inset 0 0 40px rgba(255, 209, 102, 0.1);
  animation: pulse 1.6s ease-in-out infinite;
}
.tap-emoji {
  font-size: 150px;
  line-height: 1;
  animation: bob 2.4s ease-in-out infinite;
}
.tap-sparkle {
  position: absolute;
  top: 20px;
  right: 30px;
  font-size: 28px;
  animation: sparkle 1.8s linear infinite;
}
.tap-note {
  font-size: 12px;
  color: var(--muted);
  margin: 8px 0 0;
}
.tap-note.locked {
  color: var(--danger);
  font-weight: 600;
}
@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.03);
  }
}

.pet-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pet-top {
  display: flex;
  align-items: center;
  gap: 12px;
}
.pet-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.fav-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 2px;
  scrollbar-width: thin;
}
.fav-pill {
  --tier-color: transparent;
  position: relative;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 10px;
  background: #162048;
  border: 1px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  color: inherit;
  font: inherit;
  min-width: 64px;
}
.fav-pill.tiered {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--tier-color) 35%, #162048),
    color-mix(in srgb, var(--tier-color) 10%, #0f1736)
  );
  border-color: color-mix(in srgb, var(--tier-color) 60%, transparent);
}
.fav-pill.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent) inset;
}
.fav-pill-emoji {
  font-size: 26px;
  line-height: 1;
}
.fav-pill-badge {
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 12px;
}
.fav-pill-name {
  font-size: 10px;
  opacity: 0.8;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tap-upgrade {
  display: flex;
  align-items: center;
  gap: 12px;
}
.quick-actions {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  padding: 10px;
}
.qa-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 6px;
  background: #162048;
  border: 1px solid var(--border);
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: transform 0.08s ease;
}
.qa-btn:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
}
.qa-icon {
  font-size: 24px;
  line-height: 1;
}
.qa-label {
  font-weight: 700;
  font-size: 12px;
}
.qa-sub {
  font-size: 10px;
  color: var(--muted);
}
@media (max-width: 520px) {
  .quick-actions {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 360px) {
  .quick-actions {
    grid-template-columns: repeat(2, 1fr);
  }
}
.pet-card.boosted {
  background: linear-gradient(
    135deg,
    rgba(6, 214, 160, 0.12),
    rgba(255, 209, 102, 0.12)
  );
  border-color: rgba(6, 214, 160, 0.5);
}
.pet-emoji {
  font-size: 44px;
  line-height: 1;
}
.pet-body {
  flex: 1;
  min-width: 0;
}
.pet-title {
  font-weight: 700;
}
.pet-status {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}
.pet-status.boost {
  color: var(--accent-2);
  font-weight: 700;
}

.fav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 8px;
}
.fav-cell {
  position: relative;
  background: #162048;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 8px 4px;
  text-align: center;
  cursor: pointer;
  color: inherit;
  font: inherit;
}
.fav-cell.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent) inset;
}
.fav-emoji {
  font-size: 32px;
  line-height: 1;
}
.fav-name {
  font-size: 11px;
  margin-top: 4px;
  opacity: 0.8;
}
.fav-star {
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 12px;
}
.btn.small {
  padding: 6px 10px;
  font-size: 12px;
}

.equip-card {
  position: relative;
}
.farm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
}
.farm-cell {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #2a3866, #162048);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 14px 8px 10px;
  text-align: center;
  min-height: 130px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.farm-cell.empty {
  background: repeating-linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.02) 0 10px,
    transparent 10px 20px
  );
  border-style: dashed;
}
.farm-cell.alive::before {
  content: "";
  position: absolute;
  inset: -20% -20% auto -20%;
  height: 80%;
  background: radial-gradient(
    ellipse at center,
    rgba(255, 209, 102, 0.18),
    transparent 60%
  );
  pointer-events: none;
}
.farm-cell.favorite {
  border-color: var(--accent);
}
.farm-cell.tiered {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--tier-color) 40%, #2a3866) 0%,
    color-mix(in srgb, var(--tier-color) 12%, #162048) 100%
  );
  border-color: color-mix(in srgb, var(--tier-color) 70%, transparent);
  box-shadow: 0 6px 22px color-mix(in srgb, var(--tier-color) 30%, transparent);
}
.farm-tier {
  position: absolute;
  top: 6px;
  right: 8px;
  font-size: 16px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
}
.farm-cell.boosted {
  border-color: var(--accent-2);
  box-shadow:
    0 0 0 1px var(--accent-2) inset,
    0 6px 20px rgba(6, 214, 160, 0.3);
}
.farm-emoji {
  font-size: 48px;
  line-height: 1;
  animation: bob 2.4s ease-in-out infinite;
}
.farm-name {
  font-weight: 700;
  margin-top: 6px;
  font-size: 13px;
}
.farm-rate {
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  margin-top: 2px;
}
.farm-cell.empty {
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition:
    transform 0.1s ease,
    border-color 0.1s ease;
}
.farm-cell.empty:hover,
.farm-cell.empty:active {
  border-color: var(--accent);
  border-style: solid;
  transform: translateY(-2px);
}
.farm-plus {
  font-size: 36px;
  opacity: 0.5;
  color: var(--accent);
}
.farm-meta {
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  margin-top: 2px;
}
.farm-meta-sub {
  font-size: 10px;
  color: var(--muted);
  opacity: 0.7;
  margin-top: 2px;
}
.inventory-btn {
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 40px;
}
.fusion-toggle {
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 700;
  min-height: 40px;
}
.farm-spark {
  position: absolute;
  top: 6px;
  right: 8px;
  font-size: 16px;
  animation: sparkle 1.8s linear infinite;
}
.farm-star {
  position: absolute;
  top: 6px;
  left: 8px;
  font-size: 14px;
}
@keyframes bob {
  0%,
  100% {
    transform: translateY(0) rotate(-2deg);
  }
  50% {
    transform: translateY(-4px) rotate(2deg);
  }
}
@keyframes sparkle {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.3);
  }
}
.tap-upgrade-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.tu-card {
  background: #162048;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tu-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.tu-icon {
  font-size: 28px;
}
.tu-title {
  font-weight: 700;
  font-size: 14px;
}
.tu-sub {
  font-size: 11px;
  color: var(--muted);
}
.tu-next {
  font-size: 11px;
  color: var(--accent-2);
}
.btn.secondary.small {
  padding: 6px 10px;
  font-size: 12px;
}
.hint {
  font-size: 12px;
  opacity: 0.75;
  margin: 0 0 8px;
}

.fusion-card {
  position: relative;
}
.fusion-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 8px;
}
.fusion-row {
  background: #0f1736;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 10px;
}
.fusion-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.fusion-sp {
  display: flex;
  align-items: center;
  gap: 10px;
}
.fusion-tiers {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
}
.upgrading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}
.tier-chip {
  position: relative;
  --tier-color: #aaa;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--tier-color) 35%, #162048) 0%,
    color-mix(in srgb, var(--tier-color) 10%, #0f1736) 100%
  );
  border: 1px solid color-mix(in srgb, var(--tier-color) 60%, transparent);
  border-radius: 12px;
  padding: 10px 6px;
  text-align: center;
  color: inherit;
  font: inherit;
  cursor: pointer;
  box-shadow: 0 4px 18px color-mix(in srgb, var(--tier-color) 25%, transparent);
  transition: transform 0.08s ease;
}
.tier-chip:not([disabled]):hover {
  transform: translateY(-2px);
}
.tier-chip.locked {
  opacity: 0.45;
  cursor: not-allowed;
  filter: grayscale(0.3);
  box-shadow: none;
}
.tier-chip.busy {
  opacity: 0.6;
}
.tier-chip.upgrading {
  cursor: default;
  animation: pulse 2s ease-in-out infinite;
}
.tier-emoji {
  font-size: 36px;
  line-height: 1;
  position: relative;
}
.tier-badge {
  position: absolute;
  bottom: -2px;
  right: -6px;
  font-size: 18px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
}
.tier-name {
  font-weight: 700;
  font-size: 12px;
  text-transform: capitalize;
  margin-top: 4px;
}
.tier-meta {
  font-size: 10px;
  opacity: 0.8;
  margin-top: 2px;
}
.tier-time {
  font-size: 11px;
  color: var(--accent);
  font-weight: 700;
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}

.float {
  position: absolute;
  pointer-events: none;
  font-weight: 800;
  color: var(--accent);
  animation: floatUp 0.9s ease-out forwards;
}
@keyframes floatUp {
  0% {
    opacity: 1;
    transform: translate(-50%, 0);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -60px);
  }
}
</style>
