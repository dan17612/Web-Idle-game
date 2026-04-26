<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useRoute } from "vue-router";
import { useGameStore } from "../stores/game";
import { useAuthStore } from "../stores/auth";
import { supabase } from "../supabase";
import { SPECIES, speciesInfo, formatCoins } from "../animals";
import { t } from "../i18n";
import TutorialBubble from "../components/TutorialBubble.vue";

const game = useGameStore();
const auth = useAuthStore();
const route = useRoute();

const tab = ref(route.query.tab === "food" ? "food" : "animals");
watch(
  () => route.query.tab,
  (t) => {
    if (t === "food" || t === "animals") tab.value = t;
  },
);

const chestStatus = ref({ price: 0, slot_limit: 5, bought_slot: 0 });
const chestCard = ref(null);
watch(
  () => game.tutorialStep,
  (s) => {
    if (s === 4) {
      nextTick(() => {
        chestCard.value?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  },
);
const chestQty = ref(1);
const chestAnim = ref(null); // { phase: 'shake'|'open'|'reveal'|'done', species: [...] }

async function loadChestStatus() {
  const { data } = await supabase.rpc("get_chest_status");
  if (data) chestStatus.value = data;
}

async function buyChest() {
  error.value = "";
  success.value = "";
  busyKey.value = "chest";
  chestAnim.value = { phase: "shake", species: [] };
  try {
    await game.persist();
    const { data, error: e } = await supabase.rpc("buy_chest", { p_qty: chestQty.value });
    if (e) throw e;
    game.coins = Number(data.coins);
    await Promise.all([game.load(), loadChestStatus()]);
    await new Promise(r => setTimeout(r, 800));
    chestAnim.value = { phase: "open", species: data.species };
    await new Promise(r => setTimeout(r, 500));
    chestAnim.value = { phase: "reveal", species: data.species };
    if (game.tutorialStep === 4) game.setTutorialStep(5);
  } catch (e) {
    error.value = e.message;
    chestAnim.value = null;
  } finally {
    busyKey.value = "";
  }
}

function closeChestAnim() {
  chestAnim.value = null;
}

const chestRemaining = computed(() =>
  Math.max(0, (chestStatus.value.slot_limit || 0) - (chestStatus.value.bought_slot || 0))
);

const error = ref("");
const success = ref("");
const busyKey = ref("");
const busyAdmin = ref("");
const adminOpen = ref(false);

const stock = ref({});
const forcedStock = ref({});
const myPurchases = ref({});
const rotatesAt = ref(0);
const serverOffset = ref(0);
const now = ref(Date.now());
const enabledMap = ref({});
const weightMap = ref({});
const weightDraft = ref({});
const restockQty = ref({});
const foods = ref([]);
let timer;
const ROTATION_RELOAD_KEY = "shopReloadedForRotation";

function totalStock(key) {
  return (stock.value[key] || 0) + (forcedStock.value[key] || 0);
}

function reloadPageForRotation() {
  const stamp = String(rotatesAt.value || "");
  if (!stamp) return;
  try {
    if (sessionStorage.getItem(ROTATION_RELOAD_KEY) === stamp) return;
    sessionStorage.setItem(ROTATION_RELOAD_KEY, stamp);
  } catch {}
  window.location.reload();
}

async function loadShop() {
  const { data, error: e } = await supabase.rpc("get_shop");
  if (e) {
    error.value = e.message;
    return;
  }
  stock.value = data?.stock || {};
  forcedStock.value = data?.forced_stock || {};
  myPurchases.value = data?.my_purchases || {};
  rotatesAt.value = data?.rotates_at ? new Date(data.rotates_at).getTime() : 0;
  if (data?.server_now)
    serverOffset.value = new Date(data.server_now).getTime() - Date.now();
  try {
    const stamp = String(rotatesAt.value || "");
    if (stamp && sessionStorage.getItem(ROTATION_RELOAD_KEY) !== stamp) {
      sessionStorage.removeItem(ROTATION_RELOAD_KEY);
    }
  } catch {}
}

async function loadFoods() {
  const { data } = await supabase.from("food_costs").select("*").order("cost");
  foods.value = data || [];
}

async function loadAdminData() {
  if (!auth.profile?.is_admin) return;
  const { data } = await supabase
    .from("species_costs")
    .select("species, enabled, weight");
  const em = {},
    wm = {},
    wd = {};
  for (const r of data || []) {
    em[r.species] = r.enabled;
    wm[r.species] = r.weight;
    wd[r.species] = r.weight;
  }
  enabledMap.value = em;
  weightMap.value = wm;
  weightDraft.value = wd;
}

async function saveWeight(species) {
  const val = parseInt(weightDraft.value[species], 10);
  if (!(val > 0)) {
    error.value = t("shop.weightMustBePositive");
    return;
  }
  if (val === weightMap.value[species]) return;
  await callAdmin(
    "admin_set_species_weight",
    { p_species: species, p_weight: val },
    "w-" + species,
  );
}

onMounted(async () => {
  if (game.tutorialStep === 3) game.setTutorialStep(4);
  await Promise.all([loadShop(), loadAdminData(), loadFoods(), loadChestStatus()]);
  if (game.tutorialStep === 4) {
    nextTick(() => {
      chestCard.value?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
  timer = setInterval(() => {
    now.value = Date.now();
    if (rotatesAt.value && serverNow() >= rotatesAt.value + 500)
      reloadPageForRotation();
  }, 500);
});
onUnmounted(() => clearInterval(timer));

function serverNow() {
  return now.value + serverOffset.value;
}

function fmtMmSs(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

const countdown = computed(() => {
  if (!rotatesAt.value) return "—";
  const s = Math.max(0, Math.floor((rotatesAt.value - serverNow()) / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
});

const favoriteForFood = computed(() => {
  const fav = game.favoriteAnimal
  if (!fav) return null
  const info = speciesInfo(fav.species)
  if (!info) return null;
  return {
    emoji: info.emoji,
    name: info.name,
  };
});

const boostRemaining = computed(() =>
  Math.max(0, game.petBoostUntil - (now.value + game.serverOffset)),
);

const speciesList = computed(() =>
  Object.entries(SPECIES)
    .filter(([, info]) => info.shop_visible !== false)
    .map(([key, info]) => {
      const catalogQty = stock.value[key] || 0;
      const forcedQty = forcedStock.value[key] || 0;
      const randomQty = Math.max(0, catalogQty - forcedQty);
      const boughtQty = myPurchases.value[key] || 0;
      const remaining = Math.max(0, catalogQty - boughtQty);
      return {
        key,
        info,
        qty: catalogQty,
        randomQty,
        forcedQty,
        remaining,
        boughtQty,
        inStock: remaining > 0,
        isForced: forcedQty > 0,
        enabled: enabledMap.value[key] !== false,
      };
    }),
);
const stockTotal = computed(() =>
  speciesList.value.reduce((s, x) => s + x.remaining, 0),
);

async function buy(key) {
  error.value = "";
  success.value = "";
  busyKey.value = key;
  try {
    await game.buyAnimal(key);
    success.value = t("shop.boughtAnimal", { animal: speciesInfo(key).name });
    await loadShop();
  } catch (e) {
    error.value = e.message;
    if (/rotation|ausverkauft|stock/i.test(e.message)) await loadShop();
  } finally {
    busyKey.value = "";
    setTimeout(() => (success.value = ""), 2000);
  }
}

async function feed(food) {
  error.value = "";
  success.value = "";
  if (game.boostActive) {
    error.value = t("storeErrors.boostAlreadyActive");
    return;
  }
  busyKey.value = "food-" + food.food;
  try {
    const res = await game.feedPet(food.food);
    success.value = t("shop.foodFedSuccess", { food: food.name, mult: res.boost_multiplier });
  } catch (e) {
    error.value = e.message;
  } finally {
    busyKey.value = "";
    setTimeout(() => (success.value = ""), 2500);
  }
}

async function callAdmin(rpc, args, key) {
  error.value = "";
  success.value = "";
  busyAdmin.value = key;
  try {
    const { error: e } = await supabase.rpc(rpc, args);
    if (e) throw e;
    await Promise.all([loadShop(), loadAdminData()]);
  } catch (e) {
    error.value = e.message;
  } finally {
    busyAdmin.value = "";
  }
}

function adminRestock(species) {
  const qty = Math.max(1, parseInt(restockQty.value[species] || 1, 10));
  return callAdmin(
    "admin_force_add",
    { p_species: species, p_qty: qty },
    "f-" + species,
  );
}

const promoCode = ref("");
const promoBusy = ref(false);
const promoMessage = ref("");

async function redeemPromo() {
  const code = (promoCode.value || "").trim();
  if (!code) return;
  promoBusy.value = true;
  error.value = "";
  success.value = "";
  promoMessage.value = "";
  try {
    const { data, error: e } = await supabase.rpc("redeem_promo_code", { p_code: code });
    if (e) throw e;
    const r = data?.rewards || {};
    const parts = [];
    if (Number(r.coins) > 0) parts.push(t("shop.promoRewardCoins", { coins: formatCoins(Number(r.coins)) }));
    if (Number(r.tickets) > 0) parts.push(t("shop.promoRewardTickets", { tickets: Number(r.tickets) }));
    if (r.species && Number(r.qty) > 0) {
      parts.push(t("shop.promoRewardSpecies", {
        qty: r.qty,
        emoji: speciesInfo(r.species).emoji || r.species,
        tier: r.tier || "normal",
      }));
    }
    if (Number(r.pet_boost_multiplier) > 0 && Number(r.pet_boost_minutes) > 0) {
      parts.push(t("shop.promoRewardBoost", {
        mult: r.pet_boost_multiplier,
        minutes: r.pet_boost_minutes,
      }));
    }
    const bonusTaps = Number(r.bonus_taps) || 0;
    if (bonusTaps > 0) {
      game.bonusTaps = (game.bonusTaps || 0) + bonusTaps;
      try {
        if (auth.user) localStorage.setItem("bonusTaps:" + auth.user.id, String(game.bonusTaps));
      } catch {}
      parts.push(t("shop.promoRewardTaps", { taps: bonusTaps }));
    }
    promoMessage.value = `${t("shop.promoSuccess")} ${parts.join(" · ")}`.trim();
    promoCode.value = "";
    await game.load();
  } catch (e) {
    error.value = e.message;
  } finally {
    promoBusy.value = false;
  }
}
</script>

<template>
  <h1 class="title">🛒 {{ t("shop.title") }}</h1>

  <div class="tabs">
    <Button :class="{ active: tab === 'animals' }" @click="tab = 'animals'">
      🐾 {{ t("shop.animalsTab") }}
    </Button>
    <Button :class="{ active: tab === 'food' }" @click="tab = 'food'">
      🍖 {{ t("shop.foodTab") }}
    </Button>
  </div>

  <p v-if="error" class="error">{{ error }}</p>
  <p v-if="success" class="success">{{ success }}</p>

  <template v-if="tab === 'animals'">
    <div class="card row between" style="margin-bottom: 10px">
      <div>
        <div class="subtitle" style="margin: 0">{{ t("shop.nextRotation") }}</div>
        <div
          style="
            font-weight: 800;
            font-size: 22px;
            color: var(--accent);
            font-variant-numeric: tabular-nums;
          "
        >
          {{ countdown }}
        </div>
      </div>
      <div style="text-align: right">
        <div class="subtitle" style="margin: 0">{{ t("shop.inStock") }}</div>
        <div style="font-weight: 800">
          {{ t("shop.stockCount", { count: stockTotal }) }}
        </div>
      </div>
    </div>

    <div
      v-if="false"
      class="card"
      style="background: linear-gradient(135deg, #3a1d5c, #1d2a5c)"
    >
      <div
        class="row between"
        @click="adminOpen = !adminOpen"
        style="cursor: pointer"
      >
        <div>
          <div style="font-weight: 800">🛠️ {{ t("shop.adminPanelTitle") }}</div>
          <div class="subtitle" style="margin: 2px 0 0">
            {{ t("shop.adminPanelSub") }}
          </div>
        </div>
        <div>{{ adminOpen ? "▲" : "▼" }}</div>
      </div>

      <div v-if="adminOpen" style="margin-top: 12px">
        <Button
          class="btn full"
          style="margin-bottom: 12px"
          :disabled="busyAdmin === 'rotate'"
          @click="callAdmin('admin_force_rotation', {}, 'rotate')"
        >
          🎲 {{ t("shop.adminRerollNow") }}
        </Button>

        <div v-for="s in speciesList" :key="'adm-' + s.key" class="admin-row">
          <div class="admin-left">
            <span style="font-size: 22px">{{ s.info.emoji }}</span>
            <div>
              <div style="font-weight: 700">{{ speciesInfo(s.key).name }}</div>
              <div
                class="subtitle"
                style="margin: 0; display: flex; gap: 4px; flex-wrap: wrap"
              >
                <span
                  v-if="s.forcedQty > 0"
                  class="badge"
                  style="
                    background: rgba(255, 209, 102, 0.15);
                    color: var(--accent);
                  "
                >
                  {{ t("shop.adminRestockCount", { count: s.forcedQty }) }}
                </span>
                <span v-if="s.randomQty > 0" class="badge"
                  >{{ t("shop.adminRotationCount", { count: s.randomQty }) }}</span
                >
                <span v-if="s.qty === 0" style="color: var(--muted)">{{ t("shop.adminEmpty") }}</span>
              </div>
            </div>
          </div>
          <div class="admin-actions">
            <label class="weight"
              ><span>⚖️</span>
              <InputText
                type="number"
                min="1"
                max="9999"
                v-model.number="weightDraft[s.key]"
                :disabled="busyAdmin === 'w-' + s.key"
                @blur="saveWeight(s.key)"
                @keydown.enter.prevent="
                  saveWeight(s.key);
                  $event.target.blur();
                " />
            </label>
            <label class="toggle">
              <Checkbox
                :modelValue="s.enabled"
                binary
                :disabled="busyAdmin === 'en-' + s.key"
                @update:modelValue="
                  callAdmin(
                    'admin_set_species_enabled',
                    { p_species: s.key, p_enabled: !s.enabled },
                    'en-' + s.key,
                  )
                "
              />
              <span>{{ s.enabled ? t("shop.adminActive") : t("shop.adminInactive") }}</span>
            </label>
            <label class="weight" :title="t('shop.adminRestockAmount')">
              <span>＋</span>
              <InputText
                type="number"
                min="1"
                max="99"
                v-model.number="restockQty[s.key]"
                placeholder="1" />
            </label>
            <Button
              class="btn secondary small"
              :disabled="busyAdmin === 'f-' + s.key"
              @click="adminRestock(s.key)"
            >
              {{ t("shop.restock") }}
            </Button>
            <Button
              v-if="s.forcedQty > 0"
              class="btn danger small"
              :disabled="busyAdmin === 'u-' + s.key"
              @click="
                callAdmin(
                  'admin_force_remove',
                  { p_species: s.key },
                  'u-' + s.key,
                )
              "
            >
              {{ t("shop.adminStop") }}
            </Button>
          </div>
        </div>
      </div>
    </div>

    <div class="card chest-card" ref="chestCard" :class="{ 'tut-highlight': game.tutorialStep === 4 }">
      <TutorialBubble
        v-if="game.tutorialStep === 4"
        class="chest-tutorial"
        :text="t('tutorial.chest')"
        finger="👇"
      />
      <div class="row between" style="align-items:flex-start">
        <div>
          <div style="font-weight:800;font-size:18px">🎁 {{ t("shop.chestTitle") }}</div>
          <div class="subtitle" style="margin:2px 0 0">
            {{ t("shop.chestSubtitle", { price: formatCoins(chestStatus.price) }) }}
          </div>
        </div>
        <div style="text-align:right">
          <div class="subtitle" style="margin:0">{{ t("shop.thisRotation") }}</div>
          <div style="font-weight:800">
            {{ chestStatus.bought_slot }} / {{ chestStatus.slot_limit }}
          </div>
        </div>
      </div>
      <div class="row" style="gap:6px;margin-top:10px">
        <Button
          v-for="n in [1, 2, 3]"
          :key="n"
          class="btn secondary small qty-pick"
          :class="{ active: chestQty === n }"
          :disabled="n > chestRemaining"
          @click="chestQty = n"
        >×{{ n }}</Button>
        <Button
          class="btn"
          style="flex:1"
          :disabled="busyKey === 'chest' || !!chestAnim || chestRemaining < chestQty || game.displayCoins < chestStatus.price * chestQty"
          @click="buyChest"
        >
          {{
            busyKey === 'chest' ? t('common.loadingShort') :
            chestRemaining < 1 ? t('shop.limitReached') :
            chestRemaining < chestQty ? t('shop.onlyFree', { count: chestRemaining }) :
            t('shop.openFor', { price: formatCoins(chestStatus.price * chestQty) })
          }}
        </Button>
      </div>
    </div>

    <p class="subtitle">
      {{ t("shop.rotationHint") }}
    </p>

    <div v-if="chestAnim" class="chest-modal" @click.self="chestAnim.phase === 'reveal' && closeChestAnim()">
      <div class="chest-stage">
        <div
          class="chest-box"
          :class="{
            'shake': chestAnim.phase === 'shake',
            'opening': chestAnim.phase === 'open',
            'gone': chestAnim.phase === 'reveal'
          }"
        >🎁</div>
        <div v-if="chestAnim.phase === 'shake' || chestAnim.phase === 'open'" class="chest-glow"></div>
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
      <Button v-if="chestAnim.phase === 'reveal'" class="btn" @click="closeChestAnim">{{ t("shop.continue") }}</Button>
    </div>

    <div class="grid">
      <div
        v-for="s in speciesList"
        :key="s.key"
        class="animal-card"
        :class="{ 'out-of-stock': !s.inStock, 'is-forced': s.isForced }"
      >
        <div v-if="s.isForced" class="ribbon">⭐ {{ t("shop.restock") }}</div>
        <div v-if="s.remaining > 1" class="qty-badge">×{{ s.remaining }}</div>
        <div class="animal-emoji">{{ s.info.emoji }}</div>
        <div class="animal-name">{{ speciesInfo(s.key).name }}</div>
        <div class="animal-meta">+{{ formatCoins(s.info.rate) }} / {{ t("shop.perSec") }}</div>
        <div class="animal-cost">🪙 {{ formatCoins(s.info.cost) }}</div>
        <Button
          v-if="s.inStock"
          class="btn full"
          style="margin-top: 8px"
          :disabled="busyKey === s.key || game.displayCoins < s.info.cost"
          @click="buy(s.key)"
        >
          {{ busyKey === s.key ? t("common.loadingShort") : t("shop.buy") }}
        </Button>
        <div v-else-if="s.qty > 0" class="stock-badge">{{ t("shop.alreadyBought") }}</div>
        <div v-else class="stock-badge">{{ t("shop.soldOut") }}</div>
      </div>
    </div>
  </template>

  <template v-if="tab === 'food'">
    <div class="card food-hero" :class="{ boosted: game.boostActive }">
      <div class="food-hero-head">
        <div class="food-hero-icon">🍖</div>
        <div>
          <div class="food-hero-title">{{ t("shop.feedTitle") }}</div>
          <div class="food-hero-sub">
            {{ t("shop.feedSubtitle") }}
          </div>
        </div>
      </div>
      <div class="food-hero-status">
        <div class="food-pet" v-if="favoriteForFood">
          <span class="food-pet-emoji">{{ favoriteForFood.emoji }}</span>
          <span class="food-pet-name">{{ favoriteForFood.name }}</span>
        </div>
        <div v-else class="food-pet empty">{{ t("shop.noFavoriteSelected") }}</div>
        <div v-if="game.boostActive" class="food-boost-chip">
          {{ t("shop.boostActive") }} · {{ fmtMmSs(boostRemaining) }}
        </div>
      </div>
    </div>
    <p class="subtitle food-note">
      {{ t("shop.boostHint") }}
    </p>
    <div class="grid">
      <div
        v-for="f in foods"
        :key="f.food"
        class="animal-card food-card"
        :class="{ locked: game.boostActive }"
      >
        <div class="animal-emoji">{{ f.emoji }}</div>
        <div class="animal-name">{{ f.name }}</div>
        <div class="animal-meta food-meta">
          <span class="food-pill">×{{ f.multiplier }} {{ t("shop.boost") }}</span>
          <span class="food-pill">{{ f.duration_min }} {{ t("shop.minutes") }}</span>
        </div>
        <div class="animal-cost">🪙 {{ formatCoins(f.cost) }}</div>
        <Button
          class="btn full feed-btn"
          style="margin-top: 8px"
          :disabled="
            busyKey === 'food-' + f.food ||
            game.displayCoins < f.cost ||
            game.boostActive
          "
          @click="feed(f)"
        >
          {{ busyKey === "food-" + f.food ? t("common.loadingShort") : t("shop.feedAction") }}
        </Button>
      </div>
    </div>
  </template>

  <div class="card promo-card">
    <div class="promo-head">
      <div class="promo-icon">🎟️</div>
      <div>
        <div class="promo-title">{{ t("shop.promoTitle") }}</div>
        <div class="promo-sub">{{ t("shop.promoSub") }}</div>
      </div>
    </div>
    <div class="promo-row">
      <InputText
        v-model="promoCode"
        :placeholder="t('shop.promoPlaceholder')"
        maxlength="40"
        class="promo-input"
        @keydown.enter.prevent="redeemPromo"
      />
      <Button
        class="btn"
        :disabled="promoBusy || !promoCode.trim()"
        @click="redeemPromo"
      >
        {{ promoBusy ? t("shop.promoRedeeming") : t("shop.promoRedeem") }}
      </Button>
    </div>
    <p v-if="promoMessage" class="success promo-msg">{{ promoMessage }}</p>
  </div>
</template>

<style scoped>
.out-of-stock {
  opacity: 0.45;
  filter: grayscale(0.6);
}
.is-forced {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent) inset;
}
.ribbon {
  position: absolute;
  top: 6px;
  right: 6px;
  background: var(--accent);
  color: #1b1300;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 999px;
}
.qty-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  background: var(--accent-2);
  color: #001a15;
  font-size: 11px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 999px;
}
.stock-badge {
  margin-top: 8px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(239, 71, 111, 0.15);
  color: var(--danger);
  font-weight: 700;
  font-size: 12px;
  text-align: center;
}
.admin-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  gap: 8px;
  flex-wrap: wrap;
}
.admin-row:last-child {
  border-bottom: none;
}
.admin-left {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}
.admin-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.btn.small {
  padding: 6px 10px;
  font-size: 12px;
}
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--muted);
}
.toggle :deep(.p-checkbox) {
  width: 18px;
  height: 18px;
}
.weight {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--muted);
}
.weight input {
  width: 54px;
  padding: 4px 6px;
  font-size: 16px;
  border-radius: 8px;
  text-align: right;
}

.chest-card {
  position: relative;
  background: linear-gradient(135deg, #3a1d5c, #1d3a5c);
  border-color: var(--accent);
  margin-bottom: 10px;
}
.chest-tutorial {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
}
.qty-pick.active {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(255, 209, 102, 0.08);
}

.food-hero {
  margin-bottom: 10px;
  background: linear-gradient(135deg, #1e4c44, #163a52 52%, #17284a);
  border-color: rgba(6, 214, 160, 0.45);
}
.food-hero.boosted {
  box-shadow: 0 0 0 1px rgba(6, 214, 160, 0.45) inset;
}
.food-hero-head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.food-hero-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}
.food-hero-title {
  font-size: 18px;
  font-weight: 800;
}
.food-hero-sub {
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  margin-top: 2px;
}
.food-hero-status {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.food-pet {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.food-pet.empty {
  color: rgba(255, 255, 255, 0.72);
}
.food-pet-emoji {
  font-size: 16px;
}
.food-pet-name {
  font-size: 12px;
  font-weight: 700;
}
.food-boost-chip {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  background: rgba(255, 209, 102, 0.2);
  color: #ffdf9f;
  border: 1px solid rgba(255, 209, 102, 0.45);
  font-variant-numeric: tabular-nums;
}
.food-note {
  margin-bottom: 10px;
}

.food-card {
  background: linear-gradient(165deg, #19284d, #122344 62%, #101d39);
  border-color: rgba(98, 169, 255, 0.25);
  transition:
    transform 0.12s ease,
    border-color 0.15s ease,
    opacity 0.15s ease;
}
.food-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 209, 102, 0.6);
}
.food-card.locked {
  opacity: 0.75;
}
.food-meta {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
}
.food-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
}
.feed-btn {
  font-weight: 800;
}

@media (max-width: 520px) {
  .food-hero-title {
    font-size: 16px;
  }
  .food-hero-sub {
    font-size: 11px;
  }
}

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
  opacity: 0;
  transform: scale(0.2) rotate(20deg);
}
.chest-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(255, 209, 102, 0.6), transparent 70%);
  animation: glow-pulse 1s ease-in-out infinite;
  pointer-events: none;
}
.chest-reveal {
  position: absolute;
  inset: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: center;
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

.promo-card {
  margin-top: 16px;
  background: linear-gradient(135deg, rgba(155, 110, 255, 0.18), rgba(255, 209, 102, 0.12));
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.promo-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.promo-icon {
  font-size: 32px;
  filter: drop-shadow(0 0 8px rgba(255, 209, 102, 0.4));
}
.promo-title { font-weight: 800; font-size: 16px; }
.promo-sub { color: var(--muted); font-size: 12px; margin-top: 2px; }
.promo-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.promo-input {
  flex: 1;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 700;
}
.promo-msg { margin: 8px 0 0; word-break: break-word; }
</style>
