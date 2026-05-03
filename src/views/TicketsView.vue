<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useGameStore } from "../stores/game";
import { speciesInfo, tierInfo, isUpgrading, formatCoins, animalRate } from "../animals";
import { locale } from "../i18n";
import { useReturnRefresh } from "../composables/useReturnRefresh";

const game = useGameStore();

const I18N = {
  de: {
    title: "🎟️ Tickets & Freilassen",
    balance: "🎟️ Tickets",
    releaseTitle: "🏞️ Freilass-Station",
    releaseHint:
      "Lass ein Tier frei und erhalte Tickets (Hälfte des Münzwerts, Tier-Multiplikator gilt). Nicht für Tiere die gerade upgraden.",
    releasePickSpecies: "Wähle Spezies & Stufe",
    releaseNone: "Keine freilassbaren Tiere vorhanden.",
    releaseInput: "🎯 Tier",
    releaseOutput: "✨ Tickets",
    release: "🏞️ Freilassen ×{qty}",
    releaseAll: "🏞️ Alle freilassen ({count})",
    releaseBusy: "Läuft...",
    releaseDone: "{qty}× {emoji} freigelassen — +{gained} 🎟️",
    qtyLabel: "Menge",
    species: "Spezies",
    tier: "Stufe",
    none: "—",
    shopTitle: "🎟️ Ticket-Shop",
    shopHint:
      "3 zufällige Tiere — rotiert alle 5 Minuten. Jedes Tier einmal pro Rotation kaufbar.",
    nextRotation: "Nächste Rotation in",
    shopBuy: "Kaufen · 🎟️ {price}",
    shopBought: "Schon gekauft",
    shopEmpty: "Keine Tiere verfügbar.",
    chestTitle: "🎁 Ticket-Truhe",
    chestHint:
      "Zufälliges Tier (gewichtet nach Seltenheit). Max. {limit}× pro 5-Min-Rotation.",
    chestOpen: "Öffnen · 🎟️ {price}",
    chestLimit: "Limit erreicht ({bought}/{limit})",
    chestRemaining: "Übrig: {count}",
    notEnough: "Nicht genug Tickets",
    loading: "...",
    qty: "Menge",
    continue: "Weiter",
    openedTitle: "Truhe geöffnet!",
    bought: "Gekauft: {emoji} {name}"
  },
  en: {
    title: "🎟️ Tickets & Release",
    balance: "🎟️ Tickets",
    releaseTitle: "🏞️ Release Station",
    releaseHint:
      "Release an animal for tickets (half its coin cost, tier multiplier applies). Animals that are upgrading can't be released.",
    releasePickSpecies: "Choose species & tier",
    releaseNone: "No releasable animals.",
    releaseInput: "🎯 Animal",
    releaseOutput: "✨ Tickets",
    release: "🏞️ Release ×{qty}",
    releaseAll: "🏞️ Release all ({count})",
    releaseBusy: "Running...",
    releaseDone: "{qty}× {emoji} released — +{gained} 🎟️",
    qtyLabel: "Qty",
    species: "Species",
    tier: "Tier",
    none: "—",
    shopTitle: "🎟️ Ticket shop",
    shopHint:
      "3 random animals — rotates every 5 minutes. Each animal buyable once per rotation.",
    nextRotation: "Next rotation in",
    shopBuy: "Buy · 🎟️ {price}",
    shopBought: "Already bought",
    shopEmpty: "No animals available.",
    chestTitle: "🎁 Ticket chest",
    chestHint:
      "Random animal (weighted by rarity). Max {limit}× per 5-min rotation.",
    chestOpen: "Open · 🎟️ {price}",
    chestLimit: "Limit reached ({bought}/{limit})",
    chestRemaining: "Remaining: {count}",
    notEnough: "Not enough tickets",
    loading: "...",
    qty: "Qty",
    continue: "Continue",
    openedTitle: "Chest opened!",
    bought: "Bought: {emoji} {name}"
  },
  ru: {
    title: "🎟️ Тикеты и освобождение",
    balance: "🎟️ Тикеты",
    releaseTitle: "🏞️ Станция освобождения",
    releaseHint:
      "Отпусти животное и получи тикеты (половина стоимости в монетах, с учётом тир-множителя). Животных в апгрейде отпустить нельзя.",
    releasePickSpecies: "Выбери вид и тир",
    releaseNone: "Нет животных для освобождения.",
    releaseInput: "🎯 Животное",
    releaseOutput: "✨ Тикеты",
    release: "🏞️ Отпустить ×{qty}",
    releaseAll: "🏞️ Отпустить всех ({count})",
    releaseBusy: "Процесс...",
    releaseDone: "{qty}× {emoji} отпущено — +{gained} 🎟️",
    qtyLabel: "Кол-во",
    species: "Вид",
    tier: "Тир",
    none: "—",
    shopTitle: "🎟️ Тикет-магазин",
    shopHint:
      "3 случайных животных — ротация каждые 5 минут. Каждое можно купить 1 раз за ротацию.",
    nextRotation: "Следующая ротация через",
    shopBuy: "Купить · 🎟️ {price}",
    shopBought: "Уже куплено",
    shopEmpty: "Нет доступных животных.",
    chestTitle: "🎁 Тикет-сундук",
    chestHint:
      "Случайное животное (взвешено по редкости). Макс. {limit}× за 5-мин. ротацию.",
    chestOpen: "Открыть · 🎟️ {price}",
    chestLimit: "Лимит достигнут ({bought}/{limit})",
    chestRemaining: "Осталось: {count}",
    notEnough: "Недостаточно тикетов",
    loading: "...",
    qty: "Кол-во",
    continue: "Далее",
    openedTitle: "Сундук открыт!",
    bought: "Куплено: {emoji} {name}"
  }
};

function tx(key, vars = {}) {
  const lang = I18N[locale.value] ? locale.value : "en";
  const value = I18N[lang][key] ?? I18N.en[key] ?? key;
  return String(value).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

// ===== Release =====
const releaseBusy = ref(false);
const releaseError = ref("");
const releaseSuccess = ref("");
const releaseSpecies = ref("");
const releaseTier = ref("");
const releaseQty = ref(1);

const tierRank = { normal: 0, gold: 1, diamond: 2, epic: 3, rainbow: 4 };

const groups = computed(() => {
  const map = new Map();
  for (const a of game.animals) {
    if (isUpgrading(a)) continue;
    const tier = a.tier || "normal";
    const key = `${a.species}|${tier}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        species: a.species,
        tier,
        info: speciesInfo(a.species),
        td: tierInfo(tier),
        rate: animalRate(a),
        members: []
      });
    }
    map.get(key).members.push(a);
  }
  const arr = [...map.values()];
  arr.sort((a, b) => {
    if ((b.rate || 0) !== (a.rate || 0)) return b.rate - a.rate;
    const ta = tierRank[a.tier] ?? 99;
    const tb = tierRank[b.tier] ?? 99;
    if (ta !== tb) return tb - ta;
    return (b.info?.cost || 0) - (a.info?.cost || 0);
  });
  return arr;
});

const uniqueSpecies = computed(() => {
  const seen = new Set();
  const arr = [];
  for (const g of groups.value) {
    if (seen.has(g.species)) continue;
    seen.add(g.species);
    arr.push(g);
  }
  return arr;
});

const tiersForSpecies = computed(() => {
  if (!releaseSpecies.value) return [];
  return groups.value
    .filter((g) => g.species === releaseSpecies.value)
    .sort((a, b) => (b.rate || 0) - (a.rate || 0) || (tierRank[b.tier] ?? 99) - (tierRank[a.tier] ?? 99));
});

const selectedGroup = computed(() =>
  groups.value.find(
    (g) => g.species === releaseSpecies.value && g.tier === releaseTier.value
  ) || null
);

const ticketConfig = ref({ buy_divisor: 2, release_divisor: 2 });

const perAnimalGain = computed(() => {
  const g = selectedGroup.value;
  if (!g) return 0;
  const mul = g.td?.multiplier ?? 1;
  const cost = g.info?.cost || 0;
  const div = ticketConfig.value.release_divisor || 2;
  return Math.max(1, Math.floor((cost * mul) / div));
});

const maxReleaseQty = computed(() => selectedGroup.value?.members.length || 0);

const clampedReleaseQty = computed(() =>
  Math.min(Math.max(1, releaseQty.value || 1), Math.max(1, maxReleaseQty.value))
);

const estimatedGain = computed(() => perAnimalGain.value * clampedReleaseQty.value);

watch(selectedGroup, (g) => {
  releaseQty.value = g ? Math.min(releaseQty.value || 1, g.members.length) : 1;
});

async function doRelease(useAll = false) {
  const g = selectedGroup.value;
  if (!g || releaseBusy.value) return;
  const qty = useAll ? g.members.length : clampedReleaseQty.value;
  if (qty < 1) return;
  releaseBusy.value = true;
  releaseError.value = "";
  releaseSuccess.value = "";
  try {
    const data = await game.releaseAnimalsBulk(g.species, g.tier, qty);
    releaseSuccess.value = tx("releaseDone", {
      qty: data?.qty ?? qty,
      emoji: g.info.emoji,
      gained: formatCoins(data?.gained ?? 0)
    });
    if (!groups.value.find((x) => x.species === releaseSpecies.value)) {
      releaseSpecies.value = "";
      releaseTier.value = "";
    } else if (!groups.value.find((x) => x.species === releaseSpecies.value && x.tier === releaseTier.value)) {
      releaseTier.value = "";
    }
    releaseQty.value = 1;
    setTimeout(() => (releaseSuccess.value = ""), 3000);
  } catch (e) {
    releaseError.value = e.message;
    setTimeout(() => (releaseError.value = ""), 3000);
  } finally {
    releaseBusy.value = false;
  }
}

// ===== Ticket Shop =====
const shopData = ref({
  species: [],
  my_purchases: [],
  slot_start: null,
  rotates_at: null,
  chest_price: 0,
  chest_slot_limit: 5,
  chest_bought: 0,
  buy_divisor: 2
});
const shopError = ref("");
const shopSuccess = ref("");
const shopBusy = ref("");
const now = ref(Date.now());
const serverOffset = ref(0);

async function loadShop() {
  try {
    const data = await game.getTicketShop();
    if (!data) return;
    shopData.value = data;
    ticketConfig.value = {
      buy_divisor: data.buy_divisor || 2,
      release_divisor: data.release_divisor || 2
    };
    if (data.server_now)
      serverOffset.value = new Date(data.server_now).getTime() - Date.now();
  } catch (e) {
    shopError.value = e.message;
  }
}

const rotatesInMs = computed(() => {
  const r = shopData.value.rotates_at
    ? new Date(shopData.value.rotates_at).getTime()
    : 0;
  return Math.max(0, r - (now.value + serverOffset.value));
});

const rotationLabel = computed(() => {
  const ms = rotatesInMs.value;
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
});

const shopEntries = computed(() => {
  const species = Array.isArray(shopData.value.species)
    ? shopData.value.species
    : [];
  const mine = new Set(shopData.value.my_purchases || []);
  const div = shopData.value.buy_divisor || 2;
  return species.map((key) => {
    const info = speciesInfo(key);
    const price = Math.max(1, Math.floor((info.cost || 0) / div));
    return { key, info, price, bought: mine.has(key) };
  });
});

async function buyFromShop(key) {
  shopError.value = "";
  shopSuccess.value = "";
  shopBusy.value = `s-${key}`;
  try {
    const data = await game.buyTicketShop(key);
    const info = speciesInfo(key);
    shopSuccess.value = tx("bought", { emoji: info.emoji, name: info.name });
    await loadShop();
    setTimeout(() => (shopSuccess.value = ""), 3000);
  } catch (e) {
    shopError.value = e.message;
    setTimeout(() => (shopError.value = ""), 3000);
  } finally {
    shopBusy.value = "";
  }
}

// ===== Ticket Chest =====
const chestQty = ref(1);
const chestAnim = ref(null);

const chestRemaining = computed(() =>
  Math.max(
    0,
    (shopData.value.chest_slot_limit || 0) - (shopData.value.chest_bought || 0)
  )
);

async function openChest() {
  shopError.value = "";
  shopBusy.value = "chest";
  chestAnim.value = { phase: "shake", species: [] };
  try {
    const qty = Math.min(chestQty.value, chestRemaining.value || 1);
    const data = await game.openTicketChest(qty);
    await loadShop();
    await new Promise((r) => setTimeout(r, 800));
    chestAnim.value = { phase: "open", species: data.species || [] };
    await new Promise((r) => setTimeout(r, 500));
    chestAnim.value = { phase: "reveal", species: data.species || [] };
  } catch (e) {
    shopError.value = e.message;
    chestAnim.value = null;
    setTimeout(() => (shopError.value = ""), 3000);
  } finally {
    shopBusy.value = "";
  }
}

function closeChestAnim() {
  chestAnim.value = null;
}

useReturnRefresh(loadShop);

let timer;
onMounted(async () => {
  if (!game.animals.length) await game.load();
  await loadShop();
  timer = setInterval(() => {
    if (document.visibilityState !== "visible") return;
    now.value = Date.now();
    if (rotatesInMs.value <= 0) {
      loadShop();
    }
  }, 1000);
});
onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <section class="tickets-view">
    <header class="head">
      <h1 class="title">{{ tx("title") }}</h1>
      <div class="balance">
        <span>{{ tx("balance") }}</span>
        <strong>{{ formatCoins(game.tickets) }}</strong>
      </div>
    </header>

    <!-- Release -->
    <div class="card fusion-card">
      <div class="fusion-head">
        <h2 class="title" style="margin: 0; font-size: 18px">{{ tx("releaseTitle") }}</h2>
      </div>
      <p class="hint">{{ tx("releaseHint") }}</p>

      <p v-if="releaseError" class="error" style="text-align:center;margin:0 0 6px">{{ releaseError }}</p>
      <p v-if="releaseSuccess" class="success" style="text-align:center;margin:0 0 6px">{{ releaseSuccess }}</p>

      <div v-if="groups.length === 0" class="hint" style="text-align:center;padding:12px">
        {{ tx("releaseNone") }}
      </div>

      <template v-else>
        <div class="fusion-machine">
          <div class="fm-slot">
            <div class="fm-slot-title">{{ tx("releaseInput") }}</div>
            <div class="fm-slot-body">
              <template v-if="selectedGroup">
                <span
                  class="fm-chip"
                  :style="{ '--tier-color': selectedGroup.td?.color || '#aaa' }"
                >
                  {{ selectedGroup.info.emoji
                  }}<sup v-if="selectedGroup.td?.badge" class="tb">{{ selectedGroup.td.badge }}</sup>
                </span>
              </template>
              <div v-else class="hint" style="margin:0">{{ tx("releasePickSpecies") }}</div>
            </div>
          </div>
          <div class="fm-arrow">
            <span class="fm-arrow-icon">➜</span>
            <div v-if="releaseBusy" class="hint">{{ tx("releaseBusy") }}</div>
          </div>
          <div class="fm-slot">
            <div class="fm-slot-title">{{ tx("releaseOutput") }}</div>
            <div class="fm-slot-body">
              <template v-if="selectedGroup">
                <span class="tickets-out">🎟️ {{ formatCoins(estimatedGain) }}</span>
              </template>
              <div v-else class="hint" style="margin:0">{{ tx("none") }}</div>
            </div>
          </div>
        </div>

        <div class="fm-controls">
          <div class="fm-row">
            <label class="hint" style="margin:0">{{ tx("species") }}</label>
            <div class="fusion-tiers">
              <Button
                v-for="g in uniqueSpecies"
                :key="g.species"
                class="fusion-sp"
                :class="{ active: releaseSpecies === g.species }"
                @click="releaseSpecies = g.species; releaseTier = ''"
              >
                {{ g.info.emoji }}
              </Button>
            </div>
          </div>

          <div v-if="releaseSpecies" class="fm-row">
            <label class="hint" style="margin:0">{{ tx("tier") }}</label>
            <div class="fusion-tiers">
              <Button
                v-for="g in tiersForSpecies"
                :key="g.key"
                class="fusion-sp"
                :class="{ active: releaseTier === g.tier }"
                :style="{ '--tier-color': g.td?.color || '#aaa' }"
                @click="releaseTier = g.tier"
              >
                {{ g.info.emoji
                }}<sup v-if="g.td?.badge" class="tb">{{ g.td.badge }}</sup>
                <small>×{{ g.members.length }}</small>
              </Button>
            </div>
          </div>

          <div v-if="selectedGroup" class="fm-row">
            <label class="hint" style="margin:0">
              {{ tx("qtyLabel") }} ({{ clampedReleaseQty }}/{{ maxReleaseQty }})
            </label>
            <div class="qty-row">
              <Button
                class="fusion-sp"
                :disabled="clampedReleaseQty <= 1"
                @click="releaseQty = Math.max(1, clampedReleaseQty - 1)"
              >−</Button>
              <input
                type="range"
                class="qty-range"
                min="1"
                :max="maxReleaseQty"
                :value="clampedReleaseQty"
                @input="releaseQty = parseInt($event.target.value) || 1"
              />
              <Button
                class="fusion-sp"
                :disabled="clampedReleaseQty >= maxReleaseQty"
                @click="releaseQty = Math.min(maxReleaseQty, clampedReleaseQty + 1)"
              >+</Button>
            </div>
          </div>

          <div class="release-actions">
            <Button
              class="btn full"
              :disabled="!selectedGroup || releaseBusy"
              @click="doRelease(false)"
            >
              {{ releaseBusy ? tx("releaseBusy") : tx("release", { qty: clampedReleaseQty }) }}
            </Button>
            <Button
              class="btn full release-all"
              :disabled="!selectedGroup || releaseBusy || maxReleaseQty < 2"
              @click="doRelease(true)"
            >
              {{ tx("releaseAll", { count: maxReleaseQty }) }}
            </Button>
          </div>
        </div>
      </template>
    </div>

    <!-- Ticket Shop -->
    <div class="card fusion-card">
      <div class="fusion-head">
        <h2 class="title" style="margin: 0; font-size: 18px">{{ tx("shopTitle") }}</h2>
        <div class="rot hint">⏱ {{ tx("nextRotation") }} {{ rotationLabel }}</div>
      </div>
      <p class="hint">{{ tx("shopHint") }}</p>

      <p v-if="shopError" class="error" style="text-align:center;margin:0 0 6px">{{ shopError }}</p>
      <p v-if="shopSuccess" class="success" style="text-align:center;margin:0 0 6px">{{ shopSuccess }}</p>

      <div v-if="!shopEntries.length" class="hint" style="text-align:center;padding:12px">
        {{ tx("shopEmpty") }}
      </div>

      <div v-else class="shop-grid">
        <div v-for="s in shopEntries" :key="s.key" class="shop-item">
          <div class="shop-emoji">{{ s.info.emoji }}</div>
          <div class="shop-name">{{ s.info.name }}</div>
          <Button
            class="btn full"
            :disabled="s.bought || shopBusy === `s-${s.key}` || game.tickets < s.price"
            @click="buyFromShop(s.key)"
          >
            <template v-if="shopBusy === `s-${s.key}`">{{ tx("loading") }}</template>
            <template v-else-if="s.bought">{{ tx("shopBought") }}</template>
            <template v-else>{{ tx("shopBuy", { price: formatCoins(s.price) }) }}</template>
          </Button>
        </div>
      </div>
    </div>

    <!-- Ticket Chest -->
    <div class="card fusion-card">
      <div class="fusion-head">
        <h2 class="title" style="margin: 0; font-size: 18px">{{ tx("chestTitle") }}</h2>
        <div class="hint">{{ tx("chestRemaining", { count: chestRemaining }) }}</div>
      </div>
      <p class="hint">
        {{ tx("chestHint", { limit: shopData.chest_slot_limit || 5 }) }}
      </p>

      <div class="fm-controls">
        <div class="fm-row">
          <label class="hint" style="margin:0">{{ tx("qty") }}</label>
          <div class="fusion-tiers">
            <Button
              v-for="q in [1,2,5].filter(n => n <= Math.max(chestRemaining, 1))"
              :key="q"
              class="fusion-sp"
              :class="{ active: chestQty === q }"
              @click="chestQty = q"
            >×{{ q }}</Button>
          </div>
        </div>
        <Button
          class="btn full"
          :disabled="chestRemaining <= 0 || shopBusy === 'chest' || game.tickets < (shopData.chest_price || 0) * Math.min(chestQty, Math.max(chestRemaining, 1))"
          @click="openChest"
        >
          <template v-if="shopBusy === 'chest'">{{ tx("loading") }}</template>
          <template v-else-if="chestRemaining <= 0">
            {{ tx("chestLimit", { bought: shopData.chest_bought, limit: shopData.chest_slot_limit }) }}
          </template>
          <template v-else>
            {{ tx("chestOpen", { price: formatCoins((shopData.chest_price || 0) * Math.min(chestQty, Math.max(chestRemaining, 1))) }) }}
          </template>
        </Button>
      </div>
    </div>

    <!-- Chest animation (same style as shop chest) -->
    <div
      v-if="chestAnim"
      class="chest-modal"
      @click.self="chestAnim.phase === 'reveal' && closeChestAnim()"
    >
      <div class="chest-stage" :class="{ 'revealing': chestAnim.phase === 'reveal' }">
        <div
          class="chest-box"
          :class="{
            'shake': chestAnim.phase === 'shake',
            'opening': chestAnim.phase === 'open',
            'gone': chestAnim.phase === 'reveal'
          }"
        >🎁</div>
        <div
          v-if="chestAnim.phase === 'shake' || chestAnim.phase === 'open'"
          class="chest-glow"
        ></div>
        <div v-if="chestAnim.phase === 'reveal'" class="chest-reveal">
          <div
            v-for="(s, i) in chestAnim.species"
            :key="i"
            class="reveal-animal"
            :style="{ animationDelay: (i * 0.25) + 's' }"
          >
            {{ speciesInfo(s).emoji || '❓' }}
            <div class="reveal-name">{{ speciesInfo(s).name }}</div>
          </div>
        </div>
      </div>
      <Button v-if="chestAnim.phase === 'reveal'" class="btn" @click="closeChestAnim">
        {{ tx("continue") }}
      </Button>
    </div>
  </section>
</template>

<style scoped>
.tickets-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  max-width: 720px;
  margin: 0 auto;
  padding-bottom: 100px;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px;
}
.head .title {
  font-size: 20px;
  font-weight: 800;
  margin: 0;
}
.balance {
  display: flex;
  gap: 6px;
  align-items: baseline;
  background: rgba(255, 209, 102, 0.12);
  border: 1px solid rgba(255, 209, 102, 0.35);
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 14px;
}
.balance strong {
  font-size: 16px;
  color: var(--accent, #ffd166);
}
.card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fusion-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.hint {
  color: var(--muted, #9aa3b2);
  font-size: 13px;
  margin: 0;
}
.error { color: #ff6b6b; font-size: 13px; }
.success { color: #6ad67a; font-size: 13px; }
.fusion-machine {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 10px;
  align-items: stretch;
  padding: 10px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
}
.fm-slot {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.fm-slot-title {
  font-size: 12px;
  color: var(--muted, #9aa3b2);
  text-align: center;
}
.fm-slot-body {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 10px;
}
.fm-chip {
  font-size: 40px;
  position: relative;
  filter: drop-shadow(0 0 6px var(--tier-color, rgba(255, 255, 255, 0.2)));
}
.fm-chip .tb { font-size: 16px; }
.fm-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.fm-arrow-icon { font-size: 28px; color: var(--accent, #ffd166); }
.tickets-out {
  font-size: 26px;
  font-weight: 800;
  color: var(--accent, #ffd166);
}
.fm-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fm-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.fusion-tiers {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.fusion-sp {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px !important;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.15)) !important;
  background: rgba(255, 255, 255, 0.04) !important;
  border-radius: 10px !important;
  font-size: 18px !important;
  color: inherit !important;
}
.fusion-sp.active {
  border-color: var(--tier-color, var(--accent, #ffd166)) !important;
  background: rgba(255, 209, 102, 0.12) !important;
}
.fusion-sp small { font-size: 12px; opacity: 0.75; }
.tb { font-size: 14px; margin-left: 2px; }
.btn.full { width: 100%; }
.qty-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.qty-range {
  flex: 1;
  accent-color: var(--accent, #ffd166);
}
.release-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.release-all {
  background: rgba(255, 107, 107, 0.12) !important;
  border-color: rgba(255, 107, 107, 0.4) !important;
}
.rot { font-size: 12px; }

.shop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}
.shop-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
}
.shop-emoji { font-size: 40px; }
.shop-name { font-size: 13px; font-weight: 600; text-align: center; }

.chest-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  z-index: 2000;
  backdrop-filter: blur(4px);
}
.chest-stage {
  position: relative;
  width: 220px;
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chest-stage.revealing {
  height: auto;
  width: min(340px, 90vw);
}
.chest-box {
  font-size: 110px;
  filter: drop-shadow(0 0 30px rgba(255, 209, 102, 0.5));
  transition: transform 0.4s, opacity 0.4s;
}
.chest-box.shake {
  animation: chest-shake 0.8s ease-in-out infinite;
}
.chest-box.opening {
  animation: chest-pop 0.5s ease-out forwards;
}
.chest-box.gone {
  display: none;
}
.chest-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(255, 209, 102, 0.6), transparent 70%);
  animation: glow-pulse 1s ease-in-out infinite;
  pointer-events: none;
}
.chest-reveal {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: center;
  padding: 8px;
}
.reveal-animal {
  font-size: 56px;
  text-align: center;
  opacity: 0;
  transform: translateY(40px) scale(0.4);
  animation: reveal-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  filter: drop-shadow(0 0 14px rgba(255, 209, 102, 0.7));
}
.reveal-name {
  font-size: 12px;
  color: #fff;
  font-weight: 700;
  margin-top: 2px;
}
@keyframes chest-shake {
  0%, 100% { transform: translate(0, 0) rotate(0); }
  15% { transform: translate(-4px, -2px) rotate(-4deg); }
  30% { transform: translate(5px, 2px) rotate(5deg); }
  45% { transform: translate(-3px, 3px) rotate(-3deg); }
  60% { transform: translate(4px, -2px) rotate(4deg); }
  75% { transform: translate(-2px, 2px) rotate(-2deg); }
}
@keyframes chest-pop {
  0% { transform: scale(1); }
  40% { transform: scale(1.35); filter: drop-shadow(0 0 40px rgba(255, 209, 102, 1)); }
  100% { transform: scale(0.1); opacity: 0; }
}
@keyframes glow-pulse {
  0%, 100% { opacity: 0.4; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.1); }
}
@keyframes reveal-pop {
  0% { opacity: 0; transform: translateY(40px) scale(0.4); }
  60% { opacity: 1; transform: translateY(-8px) scale(1.15); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
