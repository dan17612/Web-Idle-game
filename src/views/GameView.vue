<script setup>
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useGameStore } from "../stores/game";
import { useAuthStore } from "../stores/auth";
import {
  speciesInfo,
  formatCoins,
  TIERS,
  tierInfo,
  isUpgrading,
  compareAnimalsByRate,
} from "../animals";
import { locale, t as tGlobal } from "../i18n";

import TutorialBubble from "../components/TutorialBubble.vue";
import { supabase } from "../supabase";
import { useAppToast } from "../composables/useAppToast";
import { useReturnRefresh } from "../composables/useReturnRefresh";

const game = useGameStore();
const auth = useAuthStore();
const router = useRouter();
const appToast = useAppToast();

const I18N = {
  de: {
    gift: {
      title: "Ein Geschenk für dich!",
      subtitle: "Deine Start-Taps sind leer - als neuer Spieler bekommst du ein einmaliges Willkommensgeschenk.",
      open: "🎁 Geschenk öffnen",
      received: "Du hast erhalten:",
      bonusTaps: "+{count} einmalige Bonus-Taps",
      close: "Super!",
      openFailed: "Fehler beim Öffnen des Geschenks"
    },
    welcome: {
      back: "Willkommen zurück",
      defaultPlayer: "Spieler",
      profileHint: "-> Profil & Sammlung"
    },
    tap: {
      income: "Einkommen",
      taps: "Taps",
      bonusTitle: "Einmalige Bonus-Taps",
      limitReached: "Limit erreicht. Neue Taps in {time}.",
      favoriteHint: "ist dein Liebling. Tippe für Münzen.",
      buyFirst: "Kaufe dein erstes Tier im Shop, um es zu füttern und zu tippen."
    },
    upgrades: {
      title: "👆 Tap-Upgrades",
      multiplier: "Multiplikator",
      moreTaps: "Mehr Taps",
      offline: "Offline-Zeit",
      level: "Lvl {lvl}",
      round: "Runde",
      nextLevel: "Nächster Lvl: {value}",
      maximum: "Maximum erreicht",
      max: "MAX",
      upgrade: "⬆ {cost}",
      noFavorite: "Kein Liebling gewählt",
      chooseFavorite: "Wähle & füttere deinen Liebling für x-Boost.",
      choose: "⭐ Wählen",
      feed: "🍖 Füttern"
    },
    quick: {
      inventory: "Inventar",
      shop: "Shop",
      trade: "Trade",
      friends: "Freunde",
      index: "Index",
      collection: "Sammlung",
      swap: "Tauschen",
      send: "Senden",
      animals: "{count} Tiere",
      animalsFood: "Tiere & Futter",
      tickets: "Tickets",
      merge: "Merge",
      release: "Tier freilassen"
    },
    equipped: {
      title: "🎯 Ausgerüstet",
      manage: "📦 Inventar",
      equipBest: "🏆 Beste ausrüsten",
      freeSlotAria: "Freier Slot {slot} - zum Inventar",
      freeSlot: "Freier Slot",
      tapToEquip: "Tippen zum Ausrüsten",
      buySlot: "Slot kaufen",
      slotMaxed: "Max. Slots",
      slotBought: "Neuer Slot freigeschaltet!"
    },
    crafter: {
      title: "⚗️ Crafter-Maschine",
      toggleOpen: "⚗️ Öffnen",
      toggleClose: "✕ Schließen",
      hint: "Kombiniere Rainbow-Tiere zu einzigartigen Spezies. Gecraftete Tiere gibt es nicht im Shop oder in der Truhe.",
      pickRecipe: "Rezept wählen",
      loading: "Lade Rezepte...",
      none: "Keine Rezepte verfügbar.",
      ingredients: "🔸 Zutaten",
      result: "✨ Ergebnis",
      recipe: "Rezept",
      craft: "⚗️ Craften",
      notEnough: "Nicht genug Zutaten",
      crafted: "{emoji} {name} gecraftet!",
      started: "Crafting gestartet · 15 Min",
      alreadyRunning: "Es läuft bereits ein Craft.",
      ready: "Fertig!",
      claim: "🎁 Abholen",
      running: "Läuft… {time}",
      progress: "Fortschritt"
    },
    fusion: {
      title: "🧬 Fusions-Maschine",
      toggleOpen: "🧬 Öffnen",
      toggleClose: "✕ Schließen",
      hint: "Kombiniere gleiche Tiere (normal, nicht ausgerüstet) zu höherwertigen Tieren. 3x -> 🥇 Gold, 6x -> 💎 Diamant, 9x -> 🟣 Episch, 12x -> 🌈 Rainbow.",
      pickSpecies: "Wähle Spezies",
      none: "Keine normalen, nicht ausgerüsteten Tiere vorhanden.",
      locked: "🔒 Maschine belegt - nur ein Pet gleichzeitig. Warte, bis das laufende Upgrade fertig ist.",
      input: "🎯 Eingang",
      output: "✨ Ausgang",
      pickBoth: "Wähle Spezies & Ziel-Stufe",
      species: "Spezies",
      targetTier: "Ziel-Stufe",
      start: "🏭 Fusion starten",
      busySingle: "Maschine belegt - nur ein Pet gleichzeitig.",
      modeFuse: "🧬 Fusion",
      modeSplit: "✂️ Trennen",
      splitHint: "Höherwertige Tiere (Gold, Diamant, Episch, Rainbow) zurück in normale Tiere derselben Spezies aufspalten. Dauert 1 Minute.",
      pickAnimalToSplit: "Wähle ein Tier zum Trennen",
      splitNone: "Keine höherwertigen, nicht ausgerüsteten Tiere vorhanden.",
      splitOutput: "{count}x Normal",
      startSplit: "✂️ Trennen starten"
    },
    common: {
      loadingShort: "…"
    },
    bossPath: {
      title: "🗺️ Boss-Pfad",
      sub: "Reise durch 15 Etappen - Truhen & Boosts als Belohnung",
      stage: "Etappe {n} / 15"
    },
    mergeLink: {
      title: "🐾 Merge-Safari",
      sub: "Fusioniere Tiere, erreiche Meilensteine & erhalte Truhen"
    }
  },
  en: {
    gift: {
      title: "A gift for you!",
      subtitle: "Your starter taps are empty - as a new player you get a one-time welcome gift.",
      open: "🎁 Open gift",
      received: "You received:",
      bonusTaps: "+{count} one-time bonus taps",
      close: "Awesome!",
      openFailed: "Error opening the gift"
    },
    welcome: {
      back: "Welcome back",
      defaultPlayer: "Player",
      profileHint: "-> Profile & Collection"
    },
    tap: {
      income: "Income",
      taps: "Taps",
      bonusTitle: "One-time bonus taps",
      limitReached: "Limit reached. New taps in {time}.",
      favoriteHint: "is your favorite. Tap for coins.",
      buyFirst: "Buy your first animal in the shop to feed and tap it."
    },
    upgrades: {
      title: "👆 Tap Upgrades",
      multiplier: "Multiplier",
      moreTaps: "More taps",
      offline: "Offline time",
      level: "Lvl {lvl}",
      round: "round",
      nextLevel: "Next lvl: {value}",
      maximum: "Maximum reached",
      max: "MAX",
      upgrade: "⬆ {cost}",
      noFavorite: "No favorite selected",
      chooseFavorite: "Choose & feed your favorite for an x-boost.",
      choose: "⭐ Choose",
      feed: "🍖 Feed"
    },
    quick: {
      inventory: "Inventory",
      shop: "Shop",
      trade: "Trade",
      friends: "Friends",
      index: "Index",
      collection: "Collection",
      swap: "Swap",
      send: "Send",
      animals: "{count} animals",
      animalsFood: "Animals & Food",
      tickets: "Tickets",
      merge: "Merge",
      release: "Release pet"
    },
    equipped: {
      title: "🎯 Equipped",
      manage: "📦 Inventory",
      equipBest: "🏆 Equip best",
      freeSlotAria: "Free slot {slot} - to inventory",
      freeSlot: "Free slot",
      tapToEquip: "Tap to equip",
      buySlot: "Buy slot",
      slotMaxed: "Max slots",
      slotBought: "New slot unlocked!"
    },
    crafter: {
      title: "⚗️ Crafter Machine",
      toggleOpen: "⚗️ Open",
      toggleClose: "✕ Close",
      hint: "Combine rainbow animals into unique species. Crafted animals cannot be found in the shop or chest.",
      pickRecipe: "Choose recipe",
      loading: "Loading recipes...",
      none: "No recipes available.",
      ingredients: "🔸 Ingredients",
      result: "✨ Result",
      recipe: "Recipe",
      craft: "⚗️ Craft",
      notEnough: "Not enough ingredients",
      crafted: "{emoji} {name} crafted!",
      started: "Craft started · 15 min",
      alreadyRunning: "A craft is already running.",
      ready: "Ready!",
      claim: "🎁 Claim",
      running: "Running… {time}",
      progress: "Progress"
    },
    fusion: {
      title: "🧬 Fusion Machine",
      toggleOpen: "🧬 Open",
      toggleClose: "✕ Close",
      hint: "Combine identical animals (normal, unequipped) into higher tiers. 3x -> 🥇 Gold, 6x -> 💎 Diamond, 9x -> 🟣 Epic, 12x -> 🌈 Rainbow.",
      pickSpecies: "Choose species",
      none: "No normal unequipped animals available.",
      locked: "🔒 Machine busy - only one pet at a time. Wait until the current upgrade finishes.",
      input: "🎯 Input",
      output: "✨ Output",
      pickBoth: "Choose species & target tier",
      species: "Species",
      targetTier: "Target tier",
      start: "🏭 Start fusion",
      busySingle: "Machine busy - only one pet at a time.",
      modeFuse: "🧬 Fuse",
      modeSplit: "✂️ Split",
      splitHint: "Split higher-tier animals (Gold, Diamond, Epic, Rainbow) back into normal animals of the same species. Takes 1 minute.",
      pickAnimalToSplit: "Pick an animal to split",
      splitNone: "No higher-tier unequipped animals available.",
      splitOutput: "{count}x Normal",
      startSplit: "✂️ Start split"
    },
    common: {
      loadingShort: "…"
    },
    bossPath: {
      title: "🗺️ Boss path",
      sub: "Journey through 15 stages - chests & boosts as rewards",
      stage: "Stage {n} / 15"
    },
    mergeLink: {
      title: "🐾 Merge Safari",
      sub: "Merge animals, reach milestones & earn chests"
    }
  },
  ru: {
    gift: {
      title: "Подарок для тебя!",
      subtitle: "Твои стартовые тапы закончились - как новый игрок ты получаешь одноразовый приветственный подарок.",
      open: "🎁 Открыть подарок",
      received: "Ты получил:",
      bonusTaps: "+{count} одноразовых бонус-тапов",
      close: "Супер!",
      openFailed: "Ошибка при открытии подарка"
    },
    welcome: {
      back: "С возвращением",
      defaultPlayer: "Игрок",
      profileHint: "-> Профиль и коллекция"
    },
    tap: {
      income: "Доход",
      taps: "Тапы",
      bonusTitle: "Одноразовые бонус-тапы",
      limitReached: "Лимит достигнут. Новые тапы через {time}.",
      favoriteHint: "твой любимец. Тапай для монет.",
      buyFirst: "Купи первое животное в магазине, чтобы кормить его и тапать."
    },
    upgrades: {
      title: "👆 Улучшения тапа",
      multiplier: "Множитель",
      moreTaps: "Больше тапов",
      offline: "Офлайн-время",
      level: "Ур. {lvl}",
      round: "цикл",
      nextLevel: "След. ур.: {value}",
      maximum: "Достигнут максимум",
      max: "MAX",
      upgrade: "⬆ {cost}",
      noFavorite: "Любимец не выбран",
      chooseFavorite: "Выбери и покорми любимца для x-буста.",
      choose: "⭐ Выбрать",
      feed: "🍖 Кормить"
    },
    quick: {
      inventory: "Инвентарь",
      shop: "Магазин",
      trade: "Обмен",
      friends: "Друзья",
      index: "Индекс",
      collection: "Коллекция",
      swap: "Обмен",
      send: "Отправка",
      animals: "{count} животных",
      animalsFood: "Животные и еда",
      tickets: "Тикеты",
      merge: "Merge",
      release: "Отпустить питомца"
    },
    equipped: {
      title: "🎯 Экипировано",
      buySlot: "Купить слот",
      slotMaxed: "Макс. слоты",
      slotBought: "Новый слот открыт!",
      manage: "📦 Управлять инвентарем",
      equipBest: "🏆 Экипировать лучших",
      freeSlotAria: "Свободный слот {slot} - в инвентарь",
      freeSlot: "Свободный слот",
      tapToEquip: "Нажми для экипировки"
    },
    crafter: {
      title: "⚗️ Крафт-машина",
      toggleOpen: "⚗️ Открыть",
      toggleClose: "✕ Закрыть",
      hint: "Комбинируй радужных животных в уникальные виды. Скрафченных животных нет в магазине и сундуке.",
      pickRecipe: "Выбрать рецепт",
      loading: "Загрузка рецептов...",
      none: "Рецептов нет.",
      ingredients: "🔸 Ингредиенты",
      result: "✨ Результат",
      recipe: "Рецепт",
      craft: "⚗️ Крафт",
      notEnough: "Недостаточно ингредиентов",
      crafted: "{emoji} {name} скрафчен!",
      started: "Крафт начат · 15 мин",
      alreadyRunning: "Крафт уже идёт.",
      ready: "Готово!",
      claim: "🎁 Забрать",
      running: "Идёт… {time}",
      progress: "Прогресс"
    },
    fusion: {
      title: "🧬 Машина слияния",
      toggleOpen: "🧬 Открыть",
      toggleClose: "✕ Закрыть",
      hint: "Комбинируй одинаковых животных (обычных, не экипированных) в более высокий тир. 3x -> 🥇 Золото, 6x -> 💎 Алмаз, 9x -> 🟣 Эпик, 12x -> 🌈 Радужный.",
      pickSpecies: "Выбери вид",
      none: "Нет обычных неэкипированных животных.",
      locked: "🔒 Машина занята - только один питомец одновременно. Подожди завершения текущего апгрейда.",
      input: "🎯 Вход",
      output: "✨ Выход",
      pickBoth: "Выбери вид и целевой тир",
      species: "Вид",
      targetTier: "Целевой тир",
      start: "🏭 Начать слияние",
      busySingle: "Машина занята - только один питомец одновременно.",
      modeFuse: "🧬 Слияние",
      modeSplit: "✂️ Разделить",
      splitHint: "Разложи высокоуровневых животных (Золото, Алмаз, Эпик, Радужный) обратно в обычных того же вида. Занимает 1 минуту.",
      pickAnimalToSplit: "Выбери животное для разделения",
      splitNone: "Нет высокоуровневых неэкипированных животных.",
      splitOutput: "{count}x Обычный",
      startSplit: "✂️ Начать разделение"
    },
    common: {
      loadingShort: "…"
    },
    bossPath: {
      title: "🗺️ Путь босса",
      sub: "Путешествие по 15 этапам - сундуки и бусты в награду",
      stage: "Этап {n} / 15"
    },
    mergeLink: {
      title: "🐾 Merge-Сафари",
      sub: "Объединяй животных, достигай этапов и получай сундуки"
    }
  }
};

function tx(key, vars = {}) {
  const lang = I18N[locale.value] ? locale.value : "en";
  let value = I18N[lang];
  for (const part of key.split(".")) value = value?.[part];
  if (value == null) {
    value = I18N.en;
    for (const part of key.split(".")) value = value?.[part];
  }
  const text = String(value ?? key);
  return text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

const equipped = computed(() =>
  game.animals
    .filter((a) => a.equipped)
    .slice()
    .sort(compareAnimalsByRate)
    .map((a) => ({ ...a, info: speciesInfo(a.species), td: tierInfo(a.tier) })),
);

const slotCells = computed(() => {
  const cells = [];
  for (let i = 0; i < game.equipSlots; i++)
    cells.push(equipped.value[i] || null);
  return cells;
});

const slotInfo = ref({ next_slot: null, next_cost: null });
const slotBuyBusy = ref(false);

async function loadSlotInfo() {
  try {
    const { data } = await supabase.rpc("get_next_slot_cost");
    if (data) slotInfo.value = data;
  } catch {}
}

const canBuySlot = computed(() =>
  !game.slotsMaxed
  && slotInfo.value.next_cost != null
  && Number(game.displayCoins) >= Number(slotInfo.value.next_cost)
);

async function buySlot() {
  if (slotBuyBusy.value || game.slotsMaxed) return;
  slotBuyBusy.value = true;
  try {
    await game.buyEquipSlot();
    await loadSlotInfo();
    appToast.ok(tx("equipped.slotBought"));
  } catch (e) {
    appToast.err(e);
  } finally {
    slotBuyBusy.value = false;
  }
}

const favAnimal = computed(() => {
  const f = game.favoriteAnimal;
  return f ? { ...f, info: speciesInfo(f.species) } : null;
});

const favEmoji = computed(() => favAnimal.value?.info.emoji || "🐾");

const ownedAnimals = computed(() =>
  game.animals
    .slice()
    .sort(compareAnimalsByRate)
    .map((a) => ({
      ...a,
      info: speciesInfo(a.species),
      td: tierInfo(a.tier || "normal"),
    })),
);

const giftClaimed = ref(null); // { species, emoji, name, bonusTaps } after reveal
const giftBusy = ref(false);
const giftError = ref("");

const shouldShowGiftDialog = computed(
  () => game.newbieGiftAvailable && !giftClaimed.value,
);

async function openGift() {
  if (giftBusy.value) return;
  giftBusy.value = true;
  giftError.value = "";
  try {
    const data = await game.claimNewbieGift();
    const info = speciesInfo(data.species);
    giftClaimed.value = {
      species: data.species,
      emoji: info.emoji,
      name: info.name,
      bonusTaps: data.bonus_taps || 50,
      coinsAdded: Number(data.coins_added || 0),
    };
  } catch (e) {
    appToast.err(e?.message || tx("gift.openFailed"));
  } finally {
    giftBusy.value = false;
  }
}

function closeGiftDialog() {
  giftClaimed.value = null;
  giftError.value = "";
}

const equipBestWrap = ref(null);
watch(
  () => game.tutorialStep,
  (s) => {
    if (s === 2) {
      nextTick(() => {
        equipBestWrap.value?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  },
  { immediate: true },
);

const floats = ref([]);
let floatId = 0;
const floatTimers = new Set();
const error = ref("");
const equipBestBusy = ref(false);

const now = ref(Date.now());
let clockTimer;
onMounted(() => {
  clockTimer = setInterval(() => {
    if (document.visibilityState !== "visible") return;
    now.value = Date.now();
  }, 1000);
  loadSlotInfo();
});

useReturnRefresh(() => Promise.all([loadSlotInfo(), game.loadCraftStatus()]));
onUnmounted(() => {
  clearInterval(clockTimer);
  for (const t of floatTimers) clearTimeout(t);
  floatTimers.clear();
});

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

const bossBoostLabel = computed(() => {
  if (locale.value === "de") return "Boss-Boost aktiv";
  if (locale.value === "ru") return "Босс-буст активен";
  return "Boss boost active";
});

const tapLimitReached = computed(
  () => game.tapsUsed >= game.tapsMax && game.bonusTaps <= 0,
);

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
  const ft = setTimeout(() => {
    floatTimers.delete(ft);
    floats.value = floats.value.filter((f) => f.id !== id);
  }, 900);
  floatTimers.add(ft);
  try {
    const data = await game.tapEarn();
    const f = floats.value.find((f) => f.id === id);
    if (f) f.v = "+" + formatCoins(data.earned);
  } catch (err) {
    appToast.err(err);
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
    appToast.err(e);
  } finally {
    upgradingTap.value = "";
  }
}

async function equipBest() {
  if (equipBestBusy.value || !ownedAnimals.value.length) return;
  equipBestBusy.value = true;
  try {
    await game.equipBestAnimals();
    if (game.tutorialStep === 2) game.setTutorialStep(3);
  } catch (err) {
    appToast.err(err);
  } finally {
    equipBestBusy.value = false;
  }
}

// === Crafter ===
const crafterOpen      = ref(false)
const crafterBusy      = ref(false)
const crafterError     = ref('')
const crafterSuccess   = ref('')
const crafterRecipes   = ref([])
const crafterLoaded    = ref(false)
const crafterRecipeId  = ref('')   // selected recipe id

const crafterSelected = computed(() =>
  crafterRecipes.value.find(r => r.id === crafterRecipeId.value) || null
)

async function loadCrafterRecipes() {
  if (crafterLoaded.value) return
  try {
    crafterRecipes.value = await game.loadCraftRecipes()
    crafterLoaded.value = true
  } catch (e) {
    appToast.err(e)
  }
}

function ingCount(recipe, idx) {
  const ing = recipe?.ingredients?.[idx]
  if (!ing) return 0
  return game.animals.filter(a =>
    a.species === ing.species &&
    (a.tier || 'normal') === (ing.tier || 'normal') &&
    !a.equipped && !isUpgrading(a)
  ).length
}

function canCraft(recipe) {
  return recipe?.ingredients?.every((ing, i) => ingCount(recipe, i) >= ing.qty) ?? false
}

const craftRemainingMs = computed(() => {
  const job = game.craftJob
  if (!job?.active) return 0
  const ready = new Date(job.ready_at).getTime()
  return Math.max(0, ready - (now.value + game.serverOffset))
})
const craftRemainingLabel = computed(() => {
  const ms = craftRemainingMs.value
  if (ms <= 0) return tx("crafter.ready")
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
})
const craftProgressPct = computed(() => {
  const job = game.craftJob
  if (!job?.active) return 0
  const start = new Date(job.started_at).getTime()
  const ready = new Date(job.ready_at).getTime()
  const total = Math.max(1, ready - start)
  const done = Math.max(0, Math.min(total, (now.value + game.serverOffset) - start))
  return Math.round((done / total) * 100)
})

async function doCraft() {
  const recipe = crafterSelected.value
  if (!recipe || crafterBusy.value || !canCraft(recipe)) return
  if (game.craftJob?.active) {
    appToast.warn(tx("crafter.alreadyRunning"))
    return
  }
  crafterBusy.value = true
  try {
    await game.craftAnimal(recipe.id)
    crafterRecipeId.value = ''
    appToast.info(tx("crafter.started"))
  } catch (e) {
    appToast.err(e)
  } finally {
    crafterBusy.value = false
  }
}

async function claimCraft() {
  if (crafterBusy.value) return
  if (!game.craftJobReady) return
  crafterBusy.value = true
  try {
    const data = await game.claimCraftAnimal()
    const outInfo = speciesInfo(data.animal.species)
    appToast.ok(tx("crafter.crafted", { emoji: outInfo.emoji, name: outInfo.name }))
  } catch (e) {
    appToast.err(e)
  } finally {
    crafterBusy.value = false
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

const fusionSpecies = ref("");
const fusionTier = ref("");

const fusionSelectedGroup = computed(
  () =>
    fusionGroups.value.find((g) => g.species === fusionSpecies.value) || null,
);
const fusionSelectedTier = computed(() => {
  if (!fusionTier.value) return null;
  return tierList.value.find((t) => t.tier === fusionTier.value) || null;
});
const fusionAvailableTiers = computed(() => {
  const g = fusionSelectedGroup.value;
  if (!g) return [];
  return tierList.value.filter((t) => g.count >= t.required_qty);
});
const fusionInputPreview = computed(() => {
  const g = fusionSelectedGroup.value;
  const t = fusionSelectedTier.value;
  if (!g || !t) return [];
  return g.list.slice(0, t.required_qty);
});
const fusionLocked = computed(() => upgradingList.value.length > 0);

async function doFusion(species, tier) {
  const group = fusionGroups.value.find((g) => g.species === species);
  if (!group) return;
  const td = TIERS[tier];
  if (!td || group.count < td.required_qty) return;
  if (fusionLocked.value) {
    appToast.err(tx("fusion.busySingle"));
    return;
  }
  fusionBusy.value = true;
  fusionTarget.value = { species, tier };
  try {
    const ids = group.list.slice(0, td.required_qty).map((a) => a.id);
    await game.startTierUpgrade(ids, tier);
    fusionSpecies.value = "";
    fusionTier.value = "";
  } catch (e) {
    appToast.err(e);
  } finally {
    fusionBusy.value = false;
    fusionTarget.value = null;
  }
}

// === Split (Defusion) ===
const fusionMode = ref("fuse"); // 'fuse' | 'split'
const splitAnimalId = ref("");

const splitAnimals = computed(() =>
  game.animals
    .filter(
      (a) =>
        !a.equipped &&
        (a.tier || "normal") !== "normal" &&
        !isUpgrading(a),
    )
    .map((a) => ({
      ...a,
      info: speciesInfo(a.species),
      td: tierInfo(a.tier),
    })),
);

const splitSelected = computed(
  () => splitAnimals.value.find((a) => a.id === splitAnimalId.value) || null,
);

const splitOutputCount = computed(() => {
  const s = splitSelected.value;
  if (!s) return 0;
  return TIERS[s.tier]?.required_qty || 0;
});

async function doSplit(animalId) {
  if (!animalId) return;
  if (fusionLocked.value) {
    appToast.err(tx("fusion.busySingle"));
    return;
  }
  fusionBusy.value = true;
  try {
    await game.startTierDowngrade(animalId);
    splitAnimalId.value = "";
  } catch (e) {
    appToast.err(e);
  } finally {
    fusionBusy.value = false;
  }
}

</script>

<template>
  <div>
    <div
      v-if="shouldShowGiftDialog || giftClaimed"
      class="gift-backdrop"
      @click.self="giftClaimed && closeGiftDialog()"
    >
      <div class="gift-dialog card">
        <template v-if="!giftClaimed">
          <div class="gift-emoji">🎁</div>
          <h2 class="title" style="margin: 0 0 6px">{{ tx("gift.title") }}</h2>
          <p class="subtitle" style="margin: 0 0 14px; text-align: center">
            {{ tx("gift.subtitle") }}
          </p>
          <Button class="btn full" :disabled="giftBusy" @click="openGift">
            {{ giftBusy ? tx("common.loadingShort") : tx("gift.open") }}
          </Button>
        </template>
        <template v-else>
          <div class="gift-emoji pop">{{ giftClaimed.emoji }}</div>
          <h2 class="title" style="margin: 0 0 6px">{{ tx("gift.received") }}</h2>
          <p style="margin: 0 0 4px; font-weight: 700">
            1× {{ giftClaimed.name }}
          </p>
          <p v-if="giftClaimed.coinsAdded > 0" style="margin: 0 0 4px; font-weight: 700; color: var(--accent)">
            🪙 +{{ formatCoins(giftClaimed.coinsAdded) }}
          </p>
          <p style="margin: 0 0 14px">
            {{ tx("gift.bonusTaps", { count: giftClaimed.bonusTaps }) }}
          </p>
          <Button class="btn full" @click="closeGiftDialog">{{ tx("gift.close") }}</Button>
        </template>
      </div>
    </div>

    <div class="welcome">
      <router-link to="/profile" class="welcome-link">
        <div class="welcome-avatar">
          {{ auth.profile?.avatar_emoji || "👤" }}
        </div>
        <div>
          <div class="subtitle" style="margin: 0">{{ tx("welcome.back") }}</div>
          <div class="username">
            {{ auth.profile?.username || tx("welcome.defaultPlayer") }}
            <span class="profile-hint">{{ tx("welcome.profileHint") }}</span>
          </div>
        </div>
      </router-link>
      <div v-if="game.boostActive" class="boost-stack">
        <div v-if="game.bossBoostActive" class="boost-chip boss">
          {{ bossBoostLabel }} · ×{{ game.petBoostMultiplier }} · {{ fmtTime(boostRemaining) }}
        </div>
        <div v-else-if="game.favoriteBoostActive" class="boost-chip">
          ×{{ game.petBoostMultiplier }} · {{ fmtTime(boostRemaining) }}
        </div>
      </div>
    </div>

    <div class="card tap-card">
      <div class="row between" style="margin-bottom: 4px">
        <div>
          <div class="subtitle" style="margin: 0">{{ tx("tap.income") }}</div>
          <div class="rate">
            +{{ formatCoins(game.ratePerSec) }}
            <span style="opacity: 0.6">/s</span>
            <span v-if="game.favoriteBoostActive || game.bossBoostActive" class="rate-boost"
              >×{{ game.petBoostMultiplier }}</span
            >
          </div>
        </div>
        <div style="text-align: right">
          <div class="subtitle" style="margin: 0">{{ tx("tap.taps") }}</div>
          <div class="tap-count">
            <span
              :class="{ low: game.tapsRemaining <= 3, zero: tapLimitReached }"
            >
              {{ game.tapsRemaining }}
            </span>
            <span style="opacity: 0.4"> / {{ game.tapsMax }}</span>
            <span
              v-if="game.bonusTaps > 0"
              class="bonus-chip"
              :title="tx('tap.bonusTitle')"
              >+{{ game.bonusTaps }} 🎁</span
            >
          </div>
          <div class="tap-reset">↻ {{ fmtTime(tapCooldown) }}</div>
        </div>
      </div>

      <div class="tap-wrap">
        <TutorialBubble
          v-if="game.tutorialStep === 0 && !shouldShowGiftDialog"
          class="tap-tutorial"
          :text="tGlobal('tutorial.tap')"
          finger="👇"
        />
        <div
          class="tap-zone"
          :class="{
            disabled: tapLimitReached,
            boosted: game.favoriteBoostActive || game.bossBoostActive,
            empty: !favAnimal,
            'tut-highlight': game.tutorialStep === 0 && !shouldShowGiftDialog,
          }"
          @pointerdown="tap"
        >
          <span class="tap-emoji">{{ tapLimitReached ? "⏳" : favEmoji }}</span>
          <span v-if="game.favoriteBoostActive || game.bossBoostActive" class="tap-sparkle">✨</span>
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
        {{ tx("tap.limitReached", { time: fmtTime(tapCooldown) }) }}
      </p>
      <p v-else-if="favAnimal" class="tap-note">
        <b>{{ favAnimal.info.name }}</b> {{ tx("tap.favoriteHint") }}
      </p>
      <p v-else class="tap-note">
        {{ tx("tap.buyFirst") }}
      </p>
    </div>

    <div class="card">
      <div class="row between" style="margin-bottom: 8px">
        <h2 class="title" style="margin: 0; font-size: 16px">
          {{ tx("upgrades.title") }}
        </h2>
      </div>
      <div class="tap-upgrade-grid">
        <div class="tu-card">
          <div class="tu-head">
            <span class="tu-icon">⚡</span>
            <div>
              <div class="tu-title">{{ tx("upgrades.multiplier") }}</div>
              <div class="tu-sub">
                {{ tx("upgrades.level", { lvl: game.tapLevel }) }} · ×{{ game.tapMultiplier.toFixed(2) }}
              </div>
            </div>
          </div>
          <div class="tu-next">
            <template v-if="!game.tapMulMaxed"
              >{{ tx("upgrades.nextLevel", { value: `×${(game.tapMultiplier + 0.25).toFixed(2)}` }) }}</template
            >
            <template v-else>{{ tx("upgrades.maximum") }}</template>
          </div>
          <Button
            class="btn"
            :disabled="game.tapMulMaxed || !canUpgradeMul || !!upgradingTap"
            @click="upgradeTap('mul')"
          >
            {{
              upgradingTap === "mul"
                ? "..."
                : game.tapMulMaxed
                  ? tx("upgrades.max")
                  : tx("upgrades.upgrade", { cost: formatCoins(game.nextTapCost) })
            }}
          </Button>
        </div>
        <div class="tu-card">
          <div class="tu-head">
            <span class="tu-icon">🔋</span>
            <div>
              <div class="tu-title">{{ tx("upgrades.moreTaps") }}</div>
              <div class="tu-sub">
                {{ tx("upgrades.level", { lvl: game.tapCapLevel }) }} · {{ game.tapsMax }} / {{ tx("upgrades.round") }}
              </div>
            </div>
          </div>
          <div class="tu-next">
            <template v-if="!game.tapCapMaxed"
              >{{ tx("upgrades.nextLevel", { value: `${10 + game.tapCapLevel * 5} / ${tx('upgrades.round')}` }) }}</template
            >
            <template v-else>{{ tx("upgrades.maximum") }}</template>
          </div>
          <Button
            class="btn"
            :disabled="game.tapCapMaxed || !canUpgradeCap || !!upgradingTap"
            @click="upgradeTap('cap')"
          >
            {{
              upgradingTap === "cap"
                ? "..."
                : game.tapCapMaxed
                  ? tx("upgrades.max")
                  : tx("upgrades.upgrade", { cost: formatCoins(game.nextCapCost) })
            }}
          </Button>
        </div>
        <div class="tu-card">
          <div class="tu-head">
            <span class="tu-icon">💤</span>
            <div>
              <div class="tu-title">{{ tx("upgrades.offline") }}</div>
              <div class="tu-sub">
                {{ tx("upgrades.level", { lvl: game.offlineLevel }) }} · {{ game.maxOfflineHours }}h max
              </div>
            </div>
          </div>
          <div class="tu-next">
            <template v-if="game.maxOfflineHours < 8">
              {{ tx("upgrades.nextLevel", { value: `${(game.maxOfflineHours + 0.5).toFixed(1)}h` }) }}
            </template>
            <template v-else>{{ tx("upgrades.maximum") }}</template>
          </div>
          <Button
            class="btn"
            :disabled="!canUpgradeOffline || !!upgradingTap"
            @click="upgradeTap('offline')"
          >
            {{
              upgradingTap === "offline"
                ? "..."
                : game.maxOfflineHours >= 8
                  ? tx("upgrades.max")
                  : tx("upgrades.upgrade", { cost: formatCoins(game.nextOfflineCost) })
            }}
          </Button>
        </div>
        <div
          class="card pet-card"
          :class="{ boosted: game.favoriteBoostActive }"
        >
          <div class="pet-top">
            <div class="pet-emoji">
              {{ favEmoji }}
            </div>
            <div class="pet-body">
              <div class="pet-title">
                {{ favAnimal ? favAnimal.info.name : tx("upgrades.noFavorite") }}
              </div>
              <div v-if="game.favoriteBoostActive" class="pet-status boost">
                ×{{ game.petBoostMultiplier }} · {{ fmtTime(boostRemaining) }}
              </div>
              <div v-else class="pet-status">
                {{ tx("upgrades.chooseFavorite") }}
              </div>
            </div>
            <div class="pet-actions">
              <Button
                class="btn secondary"
                :disabled="!ownedAnimals.length"
                @click="router.push('/inventory')"
              >
                {{ tx("upgrades.choose") }}
              </Button>
              <Button
                class="btn"
                :disabled="!favAnimal"
                @click="router.push('/shop?tab=food')"
              >
                {{ tx("upgrades.feed") }}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card quick-actions">
      <router-link to="/inventory" class="qa-btn">
        <span class="qa-icon">📦</span>
        <span class="qa-label">{{ tx("quick.inventory") }}</span>
        <span class="qa-sub">{{ tx("quick.animals", { count: ownedAnimals.length }) }}</span>
      </router-link>
      <router-link to="/shop" class="qa-btn">
        <span class="qa-icon">🛒</span>
        <span class="qa-label">{{ tx("quick.shop") }}</span>
        <span class="qa-sub">{{ tx("quick.animalsFood") }}</span>
      </router-link>
      <router-link to="/trade" class="qa-btn">
        <span class="qa-icon">🔄</span>
        <span class="qa-label">{{ tx("quick.trade") }}</span>
        <span class="qa-sub">{{ tx("quick.swap") }}</span>
      </router-link>
      <router-link to="/friends" class="qa-btn">
        <span class="qa-icon">🤝</span>
        <span class="qa-label">{{ tx("quick.friends") }}</span>
        <span class="qa-sub">{{ tx("quick.send") }}</span>
      </router-link>
      <router-link to="/index" class="qa-btn">
        <span class="qa-icon">🏆</span>
        <span class="qa-label">{{ tx("quick.index") }}</span>
        <span class="qa-sub">{{ tx("quick.collection") }}</span>
      </router-link>
      <router-link to="/tickets" class="qa-btn">
        <span class="qa-icon">🎟️</span>
        <span class="qa-label">{{ tx("quick.tickets") }}</span>
        <span class="qa-sub">{{ tx("quick.release") }}</span>
      </router-link>
      <router-link to="/merge" class="qa-btn">
        <span class="qa-icon">🐾</span>
        <span class="qa-label">{{ tx("quick.merge") }}</span>
        <span class="qa-sub">2048</span>
      </router-link>
    </div>

    <div class="card equip-card">
      <div class="row between" style="margin-bottom: 8px">
        <h2 class="title" style="margin: 0; font-size: 18px">
          {{ tx("equipped.title") }}
          <span class="badge" style="margin-left: 6px"
            >{{ game.equippedCount }} / {{ game.equipSlots }}</span
          >
        </h2>
        <div class="equip-actions">
          <router-link to="/inventory" class="btn inventory-btn">
            {{ tx("equipped.manage") }}
          </router-link>
          <div class="equip-best-wrap" ref="equipBestWrap">
            <TutorialBubble
              v-if="game.tutorialStep === 2"
              class="equip-best-tutorial"
              :text="tGlobal('tutorial.equipBest')"
              finger="👇"
            />
            <Button
              class="btn inventory-btn equip-best-btn"
              :class="{ 'tut-highlight': game.tutorialStep === 2 }"
              :disabled="equipBestBusy || !ownedAnimals.length"
              @click="equipBest"
            >
              {{ equipBestBusy ? tx("common.loadingShort") : tx("equipped.equipBest") }}
            </Button>
          </div>
        </div>
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
            :aria-label="tx('equipped.freeSlotAria', { slot: i + 1 })"
          >
            <div class="farm-plus">＋</div>
            <div class="farm-meta">{{ tx("equipped.freeSlot") }}</div>
            <div class="farm-meta-sub">{{ tx("equipped.tapToEquip") }}</div>
          </router-link>
        </template>
        <button
          v-if="!game.slotsMaxed && slotInfo.next_cost != null"
          type="button"
          class="farm-cell slot-buy"
          :class="{ disabled: !canBuySlot || slotBuyBusy }"
          :disabled="!canBuySlot || slotBuyBusy"
          @click="buySlot"
        >
          <div class="farm-plus">＋</div>
          <div class="farm-meta">{{ tx("equipped.buySlot") }}</div>
          <div class="farm-meta-sub coin-line">🪙 {{ formatCoins(slotInfo.next_cost) }}</div>
        </button>
      </div>
    </div>

    <!-- Crafter-Maschine -->
    <div class="card crafter-card">
      <div class="row between" style="margin-bottom: 8px">
        <h2 class="title" style="margin: 0; font-size: 18px">{{ tx("crafter.title") }}</h2>
        <Button
          class="btn fusion-toggle"
          @click="crafterOpen = !crafterOpen; if (crafterOpen) loadCrafterRecipes()"
        >
          {{ crafterOpen ? tx("crafter.toggleClose") : tx("crafter.toggleOpen") }}
        </Button>
      </div>
      <p class="hint">
        {{ tx("crafter.hint") }}
      </p>

      <Button v-if="!crafterOpen" class="fusion-preview" @click="crafterOpen = true; loadCrafterRecipes()">
        <span class="fusion-preview-emoji">⚗️</span>
        <span class="fusion-preview-label">{{ tx("crafter.pickRecipe") }}</span>
      </Button>

      <div v-if="game.craftJob && game.craftJob.active" class="craft-job" :class="{ ready: game.craftJobReady }">
        <div class="craft-job-row">
          <div class="craft-job-emoji">{{ speciesInfo(game.craftJob.output_species).emoji }}</div>
          <div class="craft-job-body">
            <div class="craft-job-title">{{ speciesInfo(game.craftJob.output_species).name }}</div>
            <div class="craft-job-time">{{ game.craftJobReady ? tx("crafter.ready") : tx("crafter.running", { time: craftRemainingLabel }) }}</div>
            <div class="craft-job-bar"><span :style="{ width: craftProgressPct + '%' }"></span></div>
          </div>
          <Button
            class="btn small"
            :disabled="!game.craftJobReady || crafterBusy"
            @click="claimCraft"
          >{{ tx("crafter.claim") }}</Button>
        </div>
      </div>

      <div v-if="crafterOpen" class="fusion-body">
        <div v-if="!crafterLoaded" class="hint" style="text-align:center;padding:12px">{{ tx("crafter.loading") }}</div>
        <div v-else-if="!crafterRecipes.length" class="hint" style="text-align:center;padding:12px">{{ tx("crafter.none") }}</div>

        <template v-else>
          <!-- Maschinen-Anzeige (gleiche Optik wie Fusion) -->
          <div class="fusion-machine">
            <div class="fm-slot fm-left">
              <div class="fm-slot-title">{{ tx("crafter.ingredients") }}</div>
              <div class="fm-slot-body">
                <template v-if="crafterSelected">
                  <div
                    v-for="(ing, i) in crafterSelected.ingredients"
                    :key="i"
                    class="cr-ing-wrap"
                  >
                    <span class="fm-chip" :class="{ 'cr-short': ingCount(crafterSelected, i) < ing.qty }">
                      {{ speciesInfo(ing.species).emoji }}<sup v-if="ing.tier && ing.tier !== 'normal'" class="tb">{{ tierInfo(ing.tier).badge }}</sup>
                    </span>
                    <span
                      class="cr-qty-label"
                      :class="{ ok: ingCount(crafterSelected, i) >= ing.qty }"
                    >{{ ingCount(crafterSelected, i) }}/{{ ing.qty }}</span>
                  </div>
                </template>
                <div v-else class="hint" style="margin:0">{{ tx("crafter.pickRecipe") }}</div>
              </div>
            </div>

            <div class="fm-core">
              <div class="fm-factory" style="font-size:52px">⚗️</div>
              <div v-if="crafterBusy" class="hint">{{ tx("common.loadingShort") }}</div>
            </div>

            <div class="fm-slot fm-right">
              <div class="fm-slot-title">{{ tx("crafter.result") }}</div>
              <div class="fm-slot-body">
                <template v-if="crafterSelected">
                  <span class="fm-chip big cr-out-chip">
                    {{ speciesInfo(crafterSelected.output_species).emoji }}
                  </span>
                </template>
                <div v-else class="hint" style="margin:0">?</div>
              </div>
            </div>
          </div>

          <!-- Rezept-Auswahl (gleiche Optik wie Spezies-Picker in Fusion) -->
          <div class="fm-controls">
            <div class="fm-row">
              <label class="hint" style="margin:0">{{ tx("crafter.recipe") }}</label>
              <div class="fm-species-grid">
                <Button
                  v-for="r in crafterRecipes"
                  :key="r.id"
                  class="fm-sp-btn"
                  :class="{ active: crafterRecipeId === r.id }"
                  @click="crafterRecipeId = r.id"
                >
                  <span class="fm-sp-emoji">{{ speciesInfo(r.output_species).emoji }}</span>
                  <span class="fm-sp-count">{{ r.name }}</span>
                  <span class="cr-ready-dot" :class="{ ready: canCraft(r) }">●</span>
                </Button>
              </div>
            </div>

            <Button
              class="btn full"
              :disabled="!crafterSelected || !canCraft(crafterSelected) || crafterBusy || (game.craftJob && game.craftJob.active)"
              @click="doCraft"
            >
              {{
                game.craftJob && game.craftJob.active ? tx("crafter.alreadyRunning")
                : crafterBusy ? tx("common.loadingShort")
                : !crafterSelected ? tx("crafter.pickRecipe")
                : canCraft(crafterSelected) ? tx("crafter.craft")
                : tx("crafter.notEnough")
              }}
            </Button>
          </div>
        </template>
      </div>
    </div>

    <div class="card fusion-card">
      <div class="row between" style="margin-bottom: 8px">
        <h2 class="title" style="margin: 0; font-size: 18px">
          {{ tx("fusion.title") }}
        </h2>
        <Button class="btn fusion-toggle" @click="fusionOpen = !fusionOpen">
          {{ fusionOpen ? tx("fusion.toggleClose") : tx("fusion.toggleOpen") }}
        </Button>
      </div>
      <p class="hint">
        {{ tx("fusion.hint") }}
      </p>

      <Button
        v-if="!fusionOpen"
        class="fusion-preview"
        @click="fusionOpen = true"
      >
        <span class="fusion-preview-emoji">🏭</span>
        <span class="fusion-preview-label">{{ tx("fusion.pickSpecies") }}</span>
      </Button>

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
        <div class="fm-mode-toggle">
          <Button
            class="fm-mode-btn"
            :class="{ active: fusionMode === 'fuse' }"
            @click="fusionMode = 'fuse'"
          >
            {{ tx("fusion.modeFuse") }}
          </Button>
          <Button
            class="fm-mode-btn"
            :class="{ active: fusionMode === 'split' }"
            @click="fusionMode = 'split'"
          >
            {{ tx("fusion.modeSplit") }}
          </Button>
        </div>

        <template v-if="fusionMode === 'fuse'">
        <div
          v-if="fusionGroups.length === 0 && !fusionLocked"
          class="hint"
          style="text-align: center; padding: 12px"
        >
          {{ tx("fusion.none") }}
        </div>

        <div
          v-if="fusionLocked"
          class="fusion-locked hint"
          style="text-align: center"
        >
          {{ tx("fusion.locked") }}
        </div>

        <div v-else class="fusion-machine">
          <div class="fm-slot fm-left">
            <div class="fm-slot-title">{{ tx("fusion.input") }}</div>
            <div class="fm-slot-body">
              <template v-if="fusionInputPreview.length">
                <span
                  v-for="a in fusionInputPreview"
                  :key="a.id"
                  class="fm-chip"
                  >{{ fusionSelectedGroup.info.emoji }}</span
                >
              </template>
              <div v-else class="hint" style="margin: 0">
                {{ tx("fusion.pickBoth") }}
              </div>
            </div>
          </div>

          <div class="fm-core">
            <div class="fm-factory">🏭</div>
            <div v-if="fusionBusy" class="hint">{{ tx("common.loadingShort") }}</div>
          </div>

          <div class="fm-slot fm-right">
            <div class="fm-slot-title">{{ tx("fusion.output") }}</div>
            <div class="fm-slot-body">
              <template v-if="fusionSelectedGroup && fusionSelectedTier">
                <span
                  class="fm-chip big"
                  :style="{ '--tier-color': fusionSelectedTier.color }"
                  >{{ fusionSelectedGroup.info.emoji
                  }}<sup class="tb">{{ fusionSelectedTier.badge }}</sup></span
                >
              </template>
              <div v-else class="hint" style="margin: 0">?</div>
            </div>
          </div>
        </div>

        <div v-if="!fusionLocked" class="fm-controls">
          <div class="fm-row">
            <label class="hint" style="margin: 0">{{ tx("fusion.species") }}</label>
            <div class="fm-species-grid">
              <Button
                v-for="g in fusionGroups"
                :key="g.species"
                class="fm-sp-btn"
                :class="{ active: fusionSpecies === g.species }"
                @click="
                  fusionSpecies = g.species;
                  fusionTier = '';
                "
              >
                <span class="fm-sp-emoji">{{ g.info.emoji }}</span>
                <span class="fm-sp-count">{{ g.count }}×</span>
              </Button>
            </div>
          </div>

          <div v-if="fusionSelectedGroup" class="fm-row">
            <label class="hint" style="margin: 0">{{ tx("fusion.targetTier") }}</label>
            <div class="fm-tier-grid">
              <Button
                v-for="t in tierList"
                :key="t.tier"
                class="tier-chip fm-tier-chip"
                :class="{
                  locked: fusionSelectedGroup.count < t.required_qty,
                  active: fusionTier === t.tier,
                }"
                :style="{ '--tier-color': t.color }"
                :disabled="fusionSelectedGroup.count < t.required_qty"
                @click="fusionTier = t.tier"
              >
                <div class="tier-emoji">
                  {{ fusionSelectedGroup.info.emoji
                  }}<span class="tier-badge">{{ t.badge }}</span>
                </div>
                <div class="tier-name">{{ t.tier }}</div>
                <div class="tier-meta">
                  {{ t.required_qty }}× · ×{{ t.multiplier }} ·
                  {{ t.upgrade_minutes }}min
                </div>
              </Button>
            </div>
          </div>

          <Button
            class="btn full"
            :disabled="
              !fusionSelectedGroup || !fusionSelectedTier || fusionBusy
            "
            @click="doFusion(fusionSpecies, fusionTier)"
          >
            {{ fusionBusy ? tx("common.loadingShort") : tx("fusion.start") }}
          </Button>
        </div>
        </template>

        <template v-if="fusionMode === 'split'">
          <p class="hint" style="margin: 0 0 8px">{{ tx("fusion.splitHint") }}</p>

          <div
            v-if="fusionLocked"
            class="fusion-locked hint"
            style="text-align: center"
          >
            {{ tx("fusion.locked") }}
          </div>

          <div
            v-else-if="splitAnimals.length === 0"
            class="hint"
            style="text-align: center; padding: 12px"
          >
            {{ tx("fusion.splitNone") }}
          </div>

          <template v-else>
            <div class="fusion-machine">
              <div class="fm-slot fm-left">
                <div class="fm-slot-title">{{ tx("fusion.input") }}</div>
                <div class="fm-slot-body">
                  <template v-if="splitSelected">
                    <span
                      class="fm-chip big"
                      :style="{ '--tier-color': splitSelected.td.color }"
                      >{{ splitSelected.info.emoji
                      }}<sup class="tb">{{ splitSelected.td.badge }}</sup></span
                    >
                  </template>
                  <div v-else class="hint" style="margin: 0">
                    {{ tx("fusion.pickAnimalToSplit") }}
                  </div>
                </div>
              </div>

              <div class="fm-core">
                <div class="fm-factory">✂️</div>
                <div v-if="fusionBusy" class="hint">
                  {{ tx("common.loadingShort") }}
                </div>
              </div>

              <div class="fm-slot fm-right">
                <div class="fm-slot-title">{{ tx("fusion.output") }}</div>
                <div class="fm-slot-body">
                  <template v-if="splitSelected">
                    <span
                      v-for="i in splitOutputCount"
                      :key="i"
                      class="fm-chip"
                      >{{ splitSelected.info.emoji }}</span
                    >
                  </template>
                  <div v-else class="hint" style="margin: 0">?</div>
                </div>
              </div>
            </div>

            <div class="fm-controls">
              <div class="fm-row">
                <label class="hint" style="margin: 0">
                  {{ tx("fusion.pickAnimalToSplit") }}
                </label>
                <div class="fm-species-grid">
                  <Button
                    v-for="a in splitAnimals"
                    :key="a.id"
                    class="fm-sp-btn"
                    :class="{ active: splitAnimalId === a.id }"
                    :style="{ '--tier-color': a.td.color }"
                    @click="splitAnimalId = a.id"
                  >
                    <span class="fm-sp-emoji"
                      >{{ a.info.emoji
                      }}<sup class="tb">{{ a.td.badge }}</sup></span
                    >
                    <span class="fm-sp-count">{{ a.td.tier || a.tier }}</span>
                  </Button>
                </div>
              </div>

              <Button
                class="btn full"
                :disabled="!splitSelected || fusionBusy"
                @click="doSplit(splitAnimalId)"
              >
                {{ fusionBusy ? tx("common.loadingShort") : tx("fusion.startSplit") }}
              </Button>
            </div>
          </template>
        </template>

      </div>
    </div>

    <router-link to="/boss-path" class="card boss-path-link">
      <div class="bpl-icon">🗺️</div>
      <div class="bpl-body">
        <div class="bpl-title">{{ tx("bossPath.title") }}</div>
        <div class="bpl-sub">{{ tx("bossPath.sub") }}</div>
        <div v-if="game.bossPathHighest > 0" class="bpl-progress">
          {{ tx("bossPath.stage", { n: game.bossPathHighest }) }}
        </div>
      </div>
      <div class="bpl-arrow">›</div>
    </router-link>

    <router-link to="/merge" class="card merge-link">
      <div class="ml-icon">🐾</div>
      <div class="bpl-body">
        <div class="ml-title">{{ tx("mergeLink.title") }}</div>
        <div class="bpl-sub">{{ tx("mergeLink.sub") }}</div>
      </div>
      <div class="bpl-arrow">›</div>
    </router-link>
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
.boost-stack {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 6px;
}
.boost-chip.boss {
  background: linear-gradient(135deg, #ff477e, #ffd166 48%, #06d6a0);
  box-shadow: 0 4px 18px rgba(255, 71, 126, 0.35);
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
.tap-tutorial {
  position: absolute;
  top: -28px;
  left: 50%;
  transform: translateX(-50%);
}
.equip-best-wrap {
  position: relative;
  display: inline-block;
}
.equip-best-tutorial {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 6px;
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
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
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
  gap: 8px;
  background: #162048;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 10px;
}
.pet-top {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex-wrap: wrap;
}
.pet-actions {
  display: flex;
  flex-direction: row;
  gap: 6px;
  flex-shrink: 0;
  width: 100%;
  margin-top: 4px;
}
.pet-actions .btn {
  flex: 1;
  min-width: 0;
  min-height: 40px;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
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
  flex-basis: 140px;
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
.equip-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
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
.farm-cell.slot-buy {
  background: linear-gradient(135deg, rgba(255, 209, 102, 0.18), rgba(255, 71, 126, 0.12));
  border: 2px dashed rgba(255, 209, 102, 0.6);
  cursor: pointer;
  font: inherit;
  color: inherit;
}
.farm-cell.slot-buy:hover:not(.disabled) {
  border-color: var(--accent);
  border-style: solid;
  transform: translateY(-2px);
}
.farm-cell.slot-buy.disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.farm-cell.slot-buy .coin-line {
  font-weight: 800;
  color: var(--accent);
  opacity: 1;
  font-size: 12px;
}

.craft-job {
  margin: 6px 0 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(99, 242, 255, 0.12), rgba(168, 85, 247, 0.12));
  border: 1px solid rgba(99, 242, 255, 0.35);
}
.craft-job.ready {
  background: linear-gradient(135deg, rgba(6, 214, 160, 0.18), rgba(255, 209, 102, 0.12));
  border-color: rgba(6, 214, 160, 0.5);
  animation: cardPulse 2s ease-in-out infinite;
}
.craft-job-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.craft-job-emoji { font-size: 32px; flex-shrink: 0; }
.craft-job-body { flex: 1; min-width: 0; }
.craft-job-title { font-weight: 800; font-size: 14px; }
.craft-job-time { font-size: 12px; color: var(--muted); font-weight: 700; }
.craft-job-bar {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: rgba(0,0,0,0.3);
  overflow: hidden;
  border: 1px solid var(--border);
  margin-top: 4px;
}
.craft-job-bar span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #06d6a0, #ffd166);
  transition: width 0.3s ease;
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
@media (max-width: 520px) {
  .equip-actions {
    width: 100%;
    justify-content: stretch;
  }
  .equip-actions .inventory-btn {
    flex: 1 1 150px;
    justify-content: center;
  }
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
  align-items: stretch;
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

.gift-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}
.gift-dialog {
  max-width: 360px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 22px;
  text-align: center;
  animation: giftIn 0.25s ease;
}
.gift-emoji {
  font-size: 72px;
  line-height: 1;
  margin-bottom: 10px;
}
.gift-emoji.pop {
  animation: giftPop 0.5s ease;
}
@keyframes giftIn {
  from {
    transform: scale(0.85);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
@keyframes giftPop {
  0% {
    transform: scale(0.5);
  }
  60% {
    transform: scale(1.25);
  }
  100% {
    transform: scale(1);
  }
}
.bonus-chip {
  display: inline-block;
  margin-left: 6px;
  background: rgba(255, 209, 102, 0.18);
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 700;
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
.fm-mode-toggle {
  display: flex;
  gap: 6px;
  background: #0f1736;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 4px;
}
.fm-mode-btn {
  flex: 1;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 6px 10px;
  color: inherit;
  cursor: pointer;
  font-weight: 600;
}
.fm-mode-btn.active {
  background: var(--surface, #1a2350);
  border-color: var(--border);
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
.fusion-preview {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: #0f1736;
  border: 1px dashed var(--border);
  border-radius: 14px;
  padding: 18px 14px;
  margin-bottom: 8px;
  cursor: pointer;
  color: inherit;
  font: inherit;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    transform 0.08s ease;
}
.fusion-preview:hover {
  background: #162048;
  border-color: var(--accent);
  transform: translateY(-1px);
}
.fusion-preview-emoji {
  font-size: 56px;
  line-height: 1;
  animation: bob 2.2s ease-in-out infinite;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.4));
}
.fusion-preview-label {
  font-weight: 700;
  font-size: 15px;
}
.fusion-machine {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 10px;
  align-items: stretch;
  margin-bottom: 12px;
}
.fm-slot {
  background: #0f1736;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 10px;
  min-height: 110px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.fm-slot-title {
  font-weight: 700;
  font-size: 12px;
  color: var(--muted);
}
.fm-slot-body {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  flex: 1;
}
.fm-chip {
  font-size: 26px;
  background: rgba(255, 255, 255, 0.04);
  padding: 4px 8px;
  border-radius: 10px;
  border: 1px solid var(--border);
}
.fm-chip.big {
  font-size: 44px;
  padding: 6px 14px;
  filter: drop-shadow(0 0 6px var(--tier-color, transparent));
}
.fm-chip .tb {
  font-size: 0.5em;
  vertical-align: super;
}
.fm-core {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}
.fm-factory {
  font-size: 64px;
  animation: bob 2.2s ease-in-out infinite;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.4));
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
.fm-species-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
  gap: 6px;
}
.fm-sp-btn {
  background: #162048;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 6px 4px;
  cursor: pointer;
  color: inherit;
  font: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.fm-sp-btn.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent) inset;
}
.fm-sp-emoji {
  font-size: 24px;
  line-height: 1;
}
.fm-sp-count {
  font-size: 10px;
  color: var(--muted);
}
.fm-tier-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
}
.fm-tier-chip.active {
  outline: 2px solid var(--accent);
}
.fusion-locked {
  padding: 14px;
}
@media (max-width: 520px) {
  .fm-factory {
    font-size: 48px;
  }
  .fm-chip {
    font-size: 22px;
    padding: 3px 6px;
  }
  .fm-chip.big {
    font-size: 34px;
    padding: 4px 10px;
  }
}
@media (max-width: 760px) {
  .tap-upgrade-grid {
    grid-template-columns: 1fr;
  }
  .pet-top {
    gap: 10px;
    flex-wrap: wrap;
  }
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

/* === Crafter-Maschine === */
.crafter-card {
  position: relative;
}
.cr-ing-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.cr-qty-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--danger);
  font-variant-numeric: tabular-nums;
}
.cr-qty-label.ok {
  color: var(--accent-2);
}
.cr-ready-dot {
  font-size: 8px;
  color: var(--border);
  margin-top: 2px;
  line-height: 1;
}
.cr-ready-dot.ready {
  color: var(--accent-2);
  filter: drop-shadow(0 0 4px var(--accent-2));
}
.fm-chip.cr-out-chip {
  filter: drop-shadow(0 0 12px rgba(255, 209, 102, 0.5));
  border-color: rgba(255, 209, 102, 0.35);
  animation: bob 2.4s ease-in-out infinite;
}
.fm-chip.cr-short {
  opacity: 0.45;
  border-color: var(--danger);
}
.boss-path-link {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  text-decoration: none;
  color: inherit;
  background:
    radial-gradient(circle at 0% 0%, rgba(255, 209, 102, 0.18), transparent 55%),
    radial-gradient(circle at 100% 100%, rgba(168, 85, 247, 0.16), transparent 60%),
    linear-gradient(135deg, #1c2452, #0d1130);
  border: 1px solid rgba(255, 209, 102, 0.35);
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}
.boss-path-link:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: 0 12px 28px rgba(255, 209, 102, 0.18);
}
.bpl-icon {
  font-size: 36px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.45));
  flex-shrink: 0;
  animation: bplFloat 3s ease-in-out infinite;
}
@keyframes bplFloat {
  0%, 100% { transform: translateY(0) rotate(-3deg); }
  50% { transform: translateY(-3px) rotate(3deg); }
}
.bpl-body {
  flex: 1;
  min-width: 0;
}
.bpl-title {
  font-weight: 800;
  font-size: 16px;
  background: linear-gradient(90deg, #ffd166, #ff476f, #a855f7);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.bpl-sub {
  font-size: 12px;
  color: var(--muted);
  font-weight: 700;
  margin-top: 2px;
}
.bpl-progress {
  font-size: 11px;
  font-weight: 800;
  color: var(--accent);
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}
.bpl-arrow {
  font-size: 30px;
  color: var(--accent);
  font-weight: 800;
  line-height: 1;
  flex-shrink: 0;
}
.merge-link {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  text-decoration: none;
  color: inherit;
  background:
    radial-gradient(circle at 0% 0%, rgba(6, 214, 160, 0.18), transparent 55%),
    radial-gradient(circle at 100% 100%, rgba(72, 202, 228, 0.16), transparent 60%),
    linear-gradient(135deg, #122436, #0d1628);
  border: 1px solid rgba(6, 214, 160, 0.3);
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}
.merge-link:hover {
  transform: translateY(-2px);
  border-color: #06d6a0;
  box-shadow: 0 12px 28px rgba(6, 214, 160, 0.15);
}
.ml-icon {
  font-size: 36px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.45));
  flex-shrink: 0;
  animation: mlFloat 3.4s ease-in-out infinite;
}
@keyframes mlFloat {
  0%, 100% { transform: translateY(0) rotate(3deg); }
  50% { transform: translateY(-3px) rotate(-3deg); }
}
.ml-title {
  font-weight: 800;
  font-size: 16px;
  background: linear-gradient(90deg, #06d6a0, #48cae4, #c77dff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
</style>
