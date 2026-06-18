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
import EggMachine from "../components/EggMachine.vue";
import DailyRewardModal from "../components/DailyRewardModal.vue";
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
    hero: {
      income: "Einkommen · pro Sekunde",
      budget: "Tap-Budget",
      tap: "TAP"
    },
    scene: { favorite: "Liebling" },
    team: { edit: "Team bearbeiten" },
    stats: { mult: "Mult", caps: "Taps", idle: "Idle" },
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
      memory: "Memory",
      drift: "Drift",
      curves: "Kurven & Ziel",
      release: "Tier freilassen"
    },
    equipped: {
      title: "Ausgerüstet",
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
      title: "👑 Boss-Kampf",
      sub: "Boss-Pfad ({total} Etappen) und Endlos-Boss-Challenge",
      stage: "Etappe {n} / {total}",
      bossBoostActive: "👑 Boss-Boost"
    },
    memoryLink: {
      title: "🧠 Memory",
      sub: "Tier-Paare finden, Level schaffen & Truhen verdienen"
    },
    driftLink: {
      title: "🏎️ Drift-Rennen",
      sub: "Drifte durch enge Kurven bis ins Ziel - 12 Strecken"
    },
    daily: {
      title: "Tägliche Belohnung",
      ready: "Bereit zum Abholen!",
      next: "Wieder in {time}",
      streak: "🔥 {n}"
    },
    eventStatus: {
      endsIn: "Verschwindet in {time}",
      ended: "Ereignis beendet"
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
    hero: {
      income: "Income · per second",
      budget: "Tap budget",
      tap: "TAP"
    },
    scene: { favorite: "Favorite" },
    team: { edit: "Edit team" },
    stats: { mult: "Mult", caps: "Taps", idle: "Idle" },
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
      memory: "Memory",
      drift: "Drift",
      curves: "Curves & finish",
      release: "Release pet"
    },
    equipped: {
      title: "Equipped",
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
      title: "👑 Boss fight",
      sub: "Boss path ({total} stages) and endless boss challenge",
      stage: "Stage {n} / {total}",
      bossBoostActive: "👑 Boss Boost"
    },
    memoryLink: {
      title: "🧠 Memory",
      sub: "Find animal pairs, clear levels & earn chests"
    },
    driftLink: {
      title: "🏎️ Drift Race",
      sub: "Drift through tight curves to the finish - 12 tracks"
    },
    daily: {
      title: "Daily Reward",
      ready: "Ready to claim!",
      next: "Back in {time}",
      streak: "🔥 {n}"
    },
    eventStatus: {
      endsIn: "Disappears in {time}",
      ended: "Event ended"
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
    hero: {
      income: "Доход · в секунду",
      budget: "Тап-бюджет",
      tap: "TAP"
    },
    scene: { favorite: "Любимец" },
    team: { edit: "Изменить команду" },
    stats: { mult: "Множ.", caps: "Тапы", idle: "Офлайн" },
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
      memory: "Memory",
      drift: "Дрифт",
      curves: "Повороты и финиш",
      release: "Отпустить питомца"
    },
    equipped: {
      title: "Экипировано",
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
      title: "👑 Бой с боссами",
      sub: "Путь босса ({total} этапов) и эндлесс-челлендж",
      stage: "Этап {n} / {total}",
      bossBoostActive: "👑 Босс-Буст"
    },
    memoryLink: {
      title: "🧠 Memory",
      sub: "Находи пары животных, проходи уровни и получай сундуки"
    },
    driftLink: {
      title: "🏎️ Дрифт-гонка",
      sub: "Дрифтуй через крутые повороты до финиша - 12 трасс"
    },
    daily: {
      title: "Ежедневная награда",
      ready: "Можно забрать!",
      next: "Снова через {time}",
      streak: "🔥 {n}"
    },
    eventStatus: {
      endsIn: "Исчезнет через {time}",
      ended: "Событие завершено"
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

const SCENE_SPOTS = [
  { left: 12, bottom: 18, size: 56, delay: 0, flip: false },
  { left: 72, bottom: 30, size: 38, delay: 0.4, flip: true },
  { left: 44, bottom: 8, size: 40, delay: 0.8, flip: false },
  { left: 85, bottom: 10, size: 42, delay: 0.2, flip: true },
  { left: 30, bottom: 34, size: 32, delay: 0.6, flip: true },
  { left: 60, bottom: 24, size: 34, delay: 1.0, flip: false },
];
const sceneAnimals = computed(() => {
  const fav = equipped.value.find((a) => a.id === game.favoriteAnimalId);
  const rest = equipped.value.filter((a) => a.id !== game.favoriteAnimalId);
  const list = (fav ? [fav, ...rest] : rest).slice(0, SCENE_SPOTS.length);
  return list.map((a, i) => ({
    ...a,
    spot: SCENE_SPOTS[i],
    isFav: a.id === game.favoriteAnimalId,
  }));
});
const perTap = computed(() => Math.max(1, Math.floor(game.ratePerSec)));
const sceneWrap = ref(null);

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

const shouldShowGiftDialog = computed(
  () => game.newbieGiftAvailable && !giftClaimed.value,
);

async function openGift() {
  if (giftBusy.value) return;
  giftBusy.value = true;
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

const bossBoostLabel = computed(() => tx("bossPath.bossBoostActive"));

function fmtCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) {
    if (locale.value === "de") return `${days} ${days === 1 ? "Tag" : "Tagen"} ${hours}h`;
    if (locale.value === "ru") return `${days} ${days === 1 ? "день" : "дн."} ${hours}ч`;
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    if (locale.value === "ru") return `${hours}ч ${minutes}м`;
    return `${hours}h ${minutes}m`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const memoryRemaining = computed(() => {
  void now.value;
  return Math.max(0, game.memoryEndsAt - Date.now());
});
const memoryEnded = computed(() => game.memoryShowCountdown && (memoryRemaining.value <= 0 || !game.memoryActive));

const dailyOpen = ref(false);
const dailyRemaining = computed(() => {
  void now.value;
  const at = game.dailyReward?.next_claim_at
    ? new Date(game.dailyReward.next_claim_at).getTime()
    : 0;
  return Math.max(0, at - (Date.now() + game.serverOffset));
});
watch(
  () => game.dailyRewardAvailable,
  (available) => {
    if (!available || shouldShowGiftDialog.value) return;
    const key = "dailyAutoOpened";
    const today = new Date().toISOString().slice(0, 10);
    let seen = false;
    try { seen = sessionStorage.getItem(key) === today; } catch {}
    if (seen) return;
    dailyOpen.value = true;
    try { sessionStorage.setItem(key, today); } catch {}
  },
  { immediate: true },
);

const tapLimitReached = computed(
  () => game.tapsUsed >= game.tapsMax && game.bonusTaps <= 0,
);

async function tap(e) {
  if (tapLimitReached.value) return;
  const host = sceneWrap.value || e.currentTarget;
  const rect = host.getBoundingClientRect();
  const cx = e.clientX ?? e.touches?.[0]?.clientX;
  const cy = e.clientY ?? e.touches?.[0]?.clientY;
  const x = (cx != null ? cx : rect.left + rect.width / 2) - rect.left;
  const y = (cy != null ? cy : rect.top + rect.height * 0.45) - rect.top;
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
    // Nur überschreiben wenn der Server einen echten Wert geliefert hat,
    // sonst bleibt der Schätzwert (earnGuess) sichtbar.
    if (f && data.earned != null) f.v = "+" + formatCoins(data.earned);
  } catch (err) {
    floats.value = floats.value.filter((f) => f.id !== id);
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

    <div class="hero-banner">
      <div class="hb-left">
        <div class="hb-label">{{ tx("hero.income") }}</div>
        <div class="hb-value">
          +{{ formatCoins(game.ratePerSec) }}<span class="hb-unit">/s</span>
          <span
            v-if="game.favoriteBoostActive || game.bossBoostActive"
            class="hb-boost"
            >×{{ game.petBoostMultiplier }}</span
          >
        </div>
      </div>
      <div class="hb-right">
        <div class="hb-label">{{ tx("hero.budget") }}</div>
        <div class="hb-budget">
          <span :class="{ low: game.tapsRemaining <= 3, zero: tapLimitReached }">{{
            game.tapsRemaining
          }}</span>
          <span class="hb-budget-max"> / {{ game.tapsMax }}</span>
          <span
            v-if="game.bonusTaps > 0"
            class="hb-bonus"
            :title="tx('tap.bonusTitle')"
            >+{{ game.bonusTaps }} 🎁</span
          >
        </div>
        <div class="hb-reset">↻ {{ fmtTime(tapCooldown) }}</div>
      </div>
    </div>

    <button
      class="daily-banner"
      :class="{ ready: game.dailyRewardAvailable }"
      @click="dailyOpen = true"
    >
      <span class="db-icon">🎁</span>
      <span class="db-body">
        <span class="db-title">{{ tx("daily.title") }}</span>
        <span v-if="game.dailyRewardAvailable" class="db-status ready">{{ tx("daily.ready") }}</span>
        <span v-else-if="game.dailyReward" class="db-status">{{ tx("daily.next", { time: fmtCountdown(dailyRemaining) }) }}</span>
      </span>
      <span
        v-if="Number(game.dailyReward?.streak || 0) > 0"
        class="db-streak"
      >{{ tx("daily.streak", { n: game.dailyReward.streak }) }}</span>
      <span class="db-arrow">›</span>
    </button>

    <div class="scene-wrap" ref="sceneWrap">
      <TutorialBubble
        v-if="game.tutorialStep === 0 && !shouldShowGiftDialog"
        class="tap-tutorial"
        :text="tGlobal('tutorial.tap')"
        finger="👇"
      />
      <div
        class="zoo-scene"
        :class="{
          disabled: tapLimitReached,
          boosted: game.favoriteBoostActive || game.bossBoostActive,
          'tut-highlight': game.tutorialStep === 0 && !shouldShowGiftDialog,
        }"
        @pointerdown="tap"
      >
        <div class="sun"></div>
        <div class="cloud c1"></div>
        <div class="cloud c2"></div>
        <div class="cloud c3"></div>
        <div class="grass"></div>
        <span class="deco d1">🌳</span>
        <span class="deco d2">🌼</span>
        <span class="deco d3">🌷</span>
        <span class="deco d4">🌳</span>
        <div v-if="favAnimal" class="fav-flag">★ {{ tx("scene.favorite") }}</div>
        <div
          v-if="game.favoriteBoostActive || game.bossBoostActive"
          class="scene-boost"
        >
          ✨ ×{{ game.petBoostMultiplier }}
        </div>
        <div
          v-for="a in sceneAnimals"
          :key="a.id"
          class="scene-animal"
          :class="{ fav: a.isFav }"
          :style="{
            left: a.spot.left + '%',
            bottom: a.spot.bottom + '%',
            fontSize: a.spot.size + 'px',
            animationDelay: a.spot.delay + 's',
          }"
        >
          <span class="sa-emoji" :class="{ flip: a.spot.flip }">{{
            a.info.emoji
          }}</span>
          <span v-if="a.td && a.td.badge" class="sa-tier">{{ a.td.badge }}</span>
          <span v-if="a.isFav" class="sa-rate"
            >+{{ formatCoins(game.rateForAnimal(a)) }}/s</span
          >
        </div>
        <div v-if="!sceneAnimals.length" class="scene-empty">🐾</div>
        <div v-if="tapLimitReached" class="scene-locked">⏳</div>
      </div>
      <span
        v-for="f in floats"
        :key="f.id"
        class="float"
        :style="{ left: f.x + 'px', top: f.y + 'px' }"
        >{{ f.v }}</span
      >
      <button
        type="button"
        class="tap-btn"
        :disabled="tapLimitReached"
        @pointerdown.stop="tap"
      >
        <span class="tap-hand">👆</span> {{ tx("hero.tap") }} +{{
          formatCoins(perTap)
        }}
      </button>
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

    <div class="stat-grid">
      <button
        type="button"
        class="stat-card"
        :disabled="game.tapMulMaxed || !canUpgradeMul || !!upgradingTap"
        :title="tx('upgrades.multiplier')"
        @click="upgradeTap('mul')"
      >
        <span class="st-icon">⚡</span>
        <span class="st-label">{{ tx("stats.mult") }}</span>
        <span class="st-lvl">Lvl {{ game.tapLevel }}</span>
        <span class="st-next">×{{ game.tapMultiplier.toFixed(2) }}</span>
        <span class="st-cost" :class="{ maxed: game.tapMulMaxed }">
          {{
            upgradingTap === "mul"
              ? "…"
              : game.tapMulMaxed
                ? tx("upgrades.max")
                : "🪙 " + formatCoins(game.nextTapCost)
          }}
        </span>
      </button>
      <button
        type="button"
        class="stat-card"
        :disabled="game.tapCapMaxed || !canUpgradeCap || !!upgradingTap"
        :title="tx('upgrades.moreTaps')"
        @click="upgradeTap('cap')"
      >
        <span class="st-icon">🔋</span>
        <span class="st-label">{{ tx("stats.caps") }}</span>
        <span class="st-lvl">Lvl {{ game.tapCapLevel }}</span>
        <span class="st-next">{{ game.tapsMax }} / {{ tx("upgrades.round") }}</span>
        <span class="st-cost" :class="{ maxed: game.tapCapMaxed }">
          {{
            upgradingTap === "cap"
              ? "…"
              : game.tapCapMaxed
                ? tx("upgrades.max")
                : "🪙 " + formatCoins(game.nextCapCost)
          }}
        </span>
      </button>
      <button
        type="button"
        class="stat-card"
        :disabled="!canUpgradeOffline || !!upgradingTap"
        :title="tx('upgrades.offline')"
        @click="upgradeTap('offline')"
      >
        <span class="st-icon">💤</span>
        <span class="st-label">{{ tx("stats.idle") }}</span>
        <span class="st-lvl">Lvl {{ game.offlineLevel }}</span>
        <span class="st-next">{{ game.maxOfflineHours }}h</span>
        <span class="st-cost" :class="{ maxed: game.maxOfflineHours >= 8 }">
          {{
            upgradingTap === "offline"
              ? "…"
              : game.maxOfflineHours >= 8
                ? tx("upgrades.max")
                : "🪙 " + formatCoins(game.nextOfflineCost)
          }}
        </span>
      </button>
    </div>

    <div class="card pet-card" :class="{ boosted: game.favoriteBoostActive }">
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
      <router-link to="/memory" class="qa-btn">
        <span class="qa-icon">🧠</span>
        <span class="qa-label">{{ tx("quick.memory") }}</span>
        <span class="qa-sub">1-20</span>
      </router-link>
      <router-link to="/drift" class="qa-btn">
        <span class="qa-icon">🏎️</span>
        <span class="qa-label">{{ tx("quick.drift") }}</span>
        <span class="qa-sub">{{ tx("quick.curves") }}</span>
      </router-link>
    </div>

    <div class="card equip-card">
      <div class="team-head">
        <h2 class="team-title">
          {{ tx("equipped.title") }}
          <span class="team-count">· {{ game.equippedCount }} / {{ game.equipSlots }}</span>
        </h2>
        <router-link to="/inventory" class="team-edit">
          {{ tx("team.edit") }} →
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
            :title="cell.info.name"
          >
            <div v-if="cell.id === game.favoriteAnimalId" class="farm-star">
              ⭐
            </div>
            <div v-if="cell.td && cell.td.badge" class="farm-tier">
              {{ cell.td.badge }}
            </div>
            <div class="farm-emoji">{{ cell.info.emoji }}</div>
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
          </router-link>
        </template>
        <button
          v-if="!game.slotsMaxed && slotInfo.next_cost != null"
          type="button"
          class="farm-cell slot-buy"
          :class="{ disabled: !canBuySlot || slotBuyBusy }"
          :disabled="!canBuySlot || slotBuyBusy"
          :title="tx('equipped.buySlot')"
          @click="buySlot"
        >
          <div class="farm-plus">＋</div>
          <div class="farm-meta coin-line">🪙 {{ formatCoins(slotInfo.next_cost) }}</div>
        </button>
      </div>
      <div class="equip-actions">
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

    <EggMachine />

    <router-link to="/boss-fight" class="card boss-path-link">
      <div class="bpl-icon">👑</div>
      <div class="bpl-body">
        <div class="bpl-title">{{ tx("bossPath.title") }}</div>
        <div class="bpl-sub">{{ tx("bossPath.sub", { total: game.bossPathMaxStage }) }}</div>
      </div>
      <div class="bpl-arrow">›</div>
    </router-link>

    <component
      :is="memoryEnded ? 'div' : 'router-link'"
      :to="memoryEnded ? undefined : '/memory'"
      class="card event-link"
      :class="{ 'event-ended': memoryEnded }"
    >
      <div class="ml-icon">🧠</div>
      <div class="bpl-body">
        <div class="ml-title">{{ tx("memoryLink.title") }}</div>
        <div class="bpl-sub">{{ tx("memoryLink.sub") }}</div>
        <div
          v-if="memoryEnded"
          class="bpl-event-status ended"
        >⏰ {{ tx("eventStatus.ended") }}</div>
        <div
          v-else-if="game.memoryEndsAt > 0"
          class="bpl-event-status"
        >⏳ {{ tx("eventStatus.endsIn", { time: fmtCountdown(memoryRemaining) }) }}</div>
      </div>
      <div class="bpl-arrow">{{ memoryEnded ? '🔒' : '›' }}</div>
    </component>

    <router-link to="/drift" class="card drift-link">
      <div class="dl-icon">🏎️</div>
      <div class="bpl-body">
        <div class="dl-title">{{ tx("driftLink.title") }}</div>
        <div class="bpl-sub">{{ tx("driftLink.sub") }}</div>
      </div>
      <div class="bpl-arrow">›</div>
    </router-link>

    <DailyRewardModal :open="dailyOpen" @close="dailyOpen = false" />
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
  border-radius: 16px;
  background: var(--card);
  border: 2px solid var(--border);
  box-shadow: 0 2px 0 var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}
.welcome-link:hover .welcome-avatar {
  border-color: var(--accent-soft);
}
.username {
  font-weight: 800;
  font-size: 18px;
  color: var(--heading);
}
.profile-hint {
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
  margin-left: 6px;
}
.boost-stack {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 6px;
}
.boost-chip {
  background: linear-gradient(135deg, #5fe3b3, #fbd35c);
  color: #2a3a14;
  font-weight: 800;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  box-shadow: 0 4px 14px rgba(46, 194, 114, 0.35);
}
.boost-chip.boss {
  background: linear-gradient(135deg, #ff7ba1, #fbd35c 48%, #5fe3b3);
  box-shadow: 0 4px 18px rgba(255, 123, 161, 0.35);
}

/* ── Hero-Banner: Einkommen + Tap-Budget ───────────────────────── */
.hero-banner {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 12px;
  background: linear-gradient(180deg, #fbcf4a, #f2a812);
  border-radius: 22px;
  padding: 13px 16px;
  margin-bottom: 12px;
  box-shadow: 0 4px 0 #cf8a08, 0 14px 30px rgba(242, 168, 18, 0.35);
  color: var(--accent-ink);
}
.hb-left { min-width: 0; }
.hb-right { text-align: right; flex-shrink: 0; }
.hb-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  opacity: 0.72;
}
.hb-value {
  font-size: 28px;
  font-weight: 800;
  line-height: 1.15;
  color: #45300a;
}
.hb-unit {
  font-size: 14px;
  opacity: 0.6;
  margin-left: 2px;
}
.hb-boost {
  font-size: 12px;
  background: #45300a;
  color: #ffd96b;
  padding: 2px 8px;
  border-radius: 999px;
  margin-left: 6px;
  vertical-align: middle;
}
.hb-budget {
  font-size: 24px;
  font-weight: 800;
  color: #45300a;
  line-height: 1.2;
}
.hb-budget .low { color: #a3470a; }
.hb-budget .zero { color: #c2201f; }
.hb-budget-max { opacity: 0.55; font-size: 17px; }
.hb-bonus {
  display: inline-block;
  margin-left: 6px;
  background: rgba(255, 255, 255, 0.55);
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 800;
  vertical-align: middle;
}
.hb-reset {
  font-size: 11px;
  font-weight: 700;
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}

/* ── Zoo-Szene ──────────────────────────────────────────────────── */
.scene-wrap {
  position: relative;
  margin-bottom: 28px;
}
.tap-tutorial {
  position: absolute;
  top: -28px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
}
.zoo-scene {
  position: relative;
  height: 250px;
  border-radius: 26px;
  overflow: hidden;
  background: linear-gradient(180deg, #6cc6ef 0%, #8fd6f4 52%, #8fd6f4 100%);
  border: 3px solid #fff;
  box-shadow: 0 4px 0 var(--border), 0 18px 40px rgba(120, 160, 60, 0.25);
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.zoo-scene:active .grass { filter: brightness(1.04); }
.zoo-scene.disabled {
  filter: grayscale(0.7) brightness(0.92);
  cursor: not-allowed;
}
.zoo-scene.boosted {
  box-shadow:
    0 0 0 3px rgba(46, 194, 114, 0.55),
    0 18px 40px rgba(46, 194, 114, 0.3);
}
.grass {
  position: absolute;
  left: -4%;
  right: -4%;
  bottom: -6px;
  height: 47%;
  background: linear-gradient(180deg, #6ecb52 0%, #51b441 100%);
  border-radius: 50% 50% 0 0 / 26% 26% 0 0;
  box-shadow: inset 0 6px 0 rgba(255, 255, 255, 0.22);
}
.sun {
  position: absolute;
  top: 18px;
  right: 22px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 35%, #ffd96b, #f4a912);
  box-shadow: 0 0 0 10px rgba(255, 217, 107, 0.25), 0 0 36px rgba(244, 169, 18, 0.7);
  animation: sunPulse 4s ease-in-out infinite;
}
.cloud {
  position: absolute;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 999px;
  animation: cloudDrift 26s linear infinite;
}
.cloud::after {
  content: "";
  position: absolute;
  bottom: 40%;
  left: 22%;
  width: 46%;
  height: 90%;
  background: inherit;
  border-radius: 50%;
}
.cloud.c1 { top: 26px; left: 8%; width: 64px; height: 20px; }
.cloud.c2 { top: 58px; left: 42%; width: 44px; height: 15px; animation-duration: 34s; animation-delay: -12s; opacity: 0.85; }
.cloud.c3 { top: 14px; left: 64%; width: 52px; height: 17px; animation-duration: 30s; animation-delay: -22s; opacity: 0.75; }
@keyframes cloudDrift {
  from { transform: translateX(-30px); }
  50%  { transform: translateX(40px); }
  to   { transform: translateX(-30px); }
}
@keyframes sunPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.07); }
}
.deco {
  position: absolute;
  pointer-events: none;
  filter: drop-shadow(0 3px 3px rgba(40, 80, 20, 0.3));
}
.deco.d1 { font-size: 34px; left: 4%; bottom: 30%; }
.deco.d2 { font-size: 16px; left: 56%; bottom: 6%; }
.deco.d3 { font-size: 16px; left: 22%; bottom: 9%; }
.deco.d4 { font-size: 26px; right: 3%; bottom: 26%; }
.fav-flag {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(58, 44, 23, 0.82);
  color: #ffe9ad;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 5px 10px;
  border-radius: 999px;
  z-index: 3;
}
.scene-boost {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.9);
  color: #1d9457;
  font-size: 12px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 999px;
  z-index: 3;
}
.scene-animal {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
  z-index: 2;
  animation: bob 2.6s ease-in-out infinite;
  pointer-events: none;
}
.scene-animal .sa-emoji {
  filter: drop-shadow(0 5px 4px rgba(30, 70, 15, 0.35));
}
.scene-animal .sa-emoji.flip {
  transform: scaleX(-1);
}
.scene-animal.fav {
  z-index: 3;
}
.sa-tier {
  position: absolute;
  top: -6px;
  right: -10px;
  font-size: 0.38em;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.3));
}
.sa-rate {
  margin-top: 7px;
  font-size: 11px;
  font-weight: 800;
  background: rgba(58, 44, 23, 0.82);
  color: #ffe9ad;
  padding: 3px 8px;
  border-radius: 999px;
  white-space: nowrap;
}
.scene-empty {
  position: absolute;
  left: 50%;
  bottom: 22%;
  transform: translateX(-50%);
  font-size: 56px;
  opacity: 0.45;
}
.scene-locked {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
  background: rgba(255, 248, 230, 0.35);
  z-index: 4;
}
.float {
  position: absolute;
  pointer-events: none;
  font-weight: 800;
  font-size: 17px;
  color: #fff;
  text-shadow: 0 2px 6px rgba(50, 90, 20, 0.6);
  animation: floatUp 0.9s ease-out forwards;
  z-index: 6;
}
@keyframes floatUp {
  0% {
    opacity: 1;
    transform: translate(-50%, 0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -70px) scale(1.25);
  }
}

/* ── TAP-Button ─────────────────────────────────────────────────── */
.tap-btn {
  position: absolute;
  left: 50%;
  bottom: -24px;
  transform: translateX(-50%);
  z-index: 5;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 3px solid #fff;
  border-radius: 22px;
  padding: 13px 28px;
  font-family: inherit;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--accent-ink);
  background: linear-gradient(180deg, #fbcf4a, #f0a312);
  box-shadow: 0 6px 0 #cf8a08, 0 18px 36px rgba(242, 168, 18, 0.5);
  cursor: pointer;
  white-space: nowrap;
  transition: transform 0.06s ease, box-shadow 0.06s ease;
}
.tap-btn:active {
  transform: translateX(-50%) translateY(4px);
  box-shadow: 0 2px 0 #cf8a08, 0 8px 16px rgba(242, 168, 18, 0.4);
}
.tap-btn[disabled] {
  opacity: 0.55;
  cursor: not-allowed;
  filter: grayscale(0.5);
}
.tap-hand {
  font-size: 24px;
  animation: handTap 1.4s ease-in-out infinite;
}
@keyframes handTap {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(4px) rotate(-8deg); }
}
.tap-note {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  margin: 0 4px 12px;
  text-align: center;
}
.tap-note.locked {
  color: var(--danger);
  font-weight: 700;
}

/* ── Stat-Karten (Mult / Taps / Idle) ───────────────────────────── */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}
.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  background: var(--card);
  border: 2px solid var(--border);
  border-radius: 20px;
  padding: 12px 6px 10px;
  cursor: pointer;
  font-family: inherit;
  box-shadow: 0 3px 0 var(--border), 0 10px 22px rgba(186, 140, 50, 0.10);
  transition: transform 0.07s ease, box-shadow 0.07s ease;
}
.stat-card:not([disabled]):hover {
  transform: translateY(-2px);
  border-color: var(--accent-soft);
}
.stat-card:not([disabled]):active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 var(--border);
}
.stat-card[disabled] {
  cursor: not-allowed;
  opacity: 0.75;
}
.st-icon {
  font-size: 24px;
  line-height: 1;
}
.st-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}
.st-lvl {
  font-size: 18px;
  font-weight: 800;
  color: var(--heading);
  line-height: 1.1;
}
.st-next {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
}
.st-cost {
  margin-top: 5px;
  background: linear-gradient(180deg, #6f5215, #57400e);
  color: #ffd96b;
  font-size: 12px;
  font-weight: 800;
  padding: 5px 12px;
  border-radius: 999px;
  box-shadow: 0 2px 0 #46330a;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.st-cost.maxed {
  background: linear-gradient(180deg, #34d399, #0ea974);
  color: #fff;
  box-shadow: 0 2px 0 #0b7e57;
}

/* ── Pet-Karte (Liebling) ───────────────────────────────────────── */
.pet-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pet-card.boosted {
  background: linear-gradient(135deg, rgba(46, 194, 114, 0.10), rgba(251, 211, 92, 0.16));
  border-color: rgba(46, 194, 114, 0.5);
}
.pet-top {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex-wrap: wrap;
}
.pet-emoji {
  font-size: 38px;
  line-height: 1;
  width: 62px;
  height: 62px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-2);
  border: 2px solid var(--border);
  border-radius: 18px;
  flex-shrink: 0;
}
.pet-body {
  flex: 1;
  min-width: 0;
  flex-basis: 140px;
}
.pet-title {
  font-weight: 800;
  color: var(--heading);
}
.pet-status {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 2px;
}
.pet-status.boost {
  color: #1d9457;
  font-weight: 800;
}
.pet-actions {
  display: flex;
  flex-direction: row;
  gap: 8px;
  flex-shrink: 0;
  width: 100%;
  margin-top: 4px;
}
.pet-actions .btn {
  flex: 1;
  min-width: 0;
  min-height: 40px;
  font-size: 14px;
  font-weight: 800;
  white-space: nowrap;
}

/* ── Quick-Actions ──────────────────────────────────────────────── */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 10px;
}
.qa-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 6px;
  background: var(--card-2);
  border: 2px solid var(--border);
  border-radius: 16px;
  text-decoration: none;
  color: inherit;
  transition: transform 0.08s ease, border-color 0.08s ease;
}
.qa-btn:hover {
  transform: translateY(-2px);
  border-color: var(--accent-soft);
}
.qa-icon {
  font-size: 24px;
  line-height: 1;
}
.qa-label {
  font-weight: 800;
  font-size: 12px;
  color: var(--heading);
}
.qa-sub {
  font-size: 10px;
  font-weight: 600;
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

/* ── Team / Ausgerüstet ─────────────────────────────────────────── */
.equip-card {
  position: relative;
}
.team-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.team-title {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}
.team-count {
  color: var(--heading);
}
.team-edit {
  font-size: 12px;
  font-weight: 800;
  color: var(--accent-deep);
  white-space: nowrap;
}
.team-edit:hover {
  text-decoration: underline;
}
.equip-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.equip-best-wrap {
  position: relative;
  flex: 1;
  display: flex;
}
.equip-best-wrap .equip-best-btn {
  flex: 1;
}
.equip-best-tutorial {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 6px;
}
.inventory-btn {
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 40px;
}
.farm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
  gap: 8px;
}
.farm-cell {
  position: relative;
  overflow: hidden;
  background: var(--card-2);
  border: 2px solid var(--border);
  border-radius: 18px;
  padding: 10px 4px 8px;
  text-align: center;
  aspect-ratio: 0.92;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-shadow: 0 2px 0 var(--border);
}
.farm-cell.empty {
  background: transparent;
  border-style: dashed;
  box-shadow: none;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: transform 0.1s ease, border-color 0.1s ease;
}
.farm-cell.empty:hover,
.farm-cell.empty:active {
  border-color: var(--accent);
  border-style: solid;
  transform: translateY(-2px);
}
.farm-cell.favorite {
  border-color: var(--accent);
}
.farm-cell.tiered {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--tier-color) 24%, #fff) 0%,
    color-mix(in srgb, var(--tier-color) 8%, #fff) 100%
  );
  border-color: color-mix(in srgb, var(--tier-color) 55%, transparent);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--tier-color) 25%, transparent);
}
.farm-tier {
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: 13px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25));
}
.farm-cell.boosted {
  border-color: var(--accent-2);
  box-shadow:
    0 0 0 1px var(--accent-2) inset,
    0 6px 20px rgba(46, 194, 114, 0.3);
}
.farm-emoji {
  font-size: 34px;
  line-height: 1;
  animation: bob 2.4s ease-in-out infinite;
  filter: drop-shadow(0 3px 3px rgba(110, 80, 20, 0.2));
}
.farm-rate {
  color: var(--accent-deep);
  font-size: 10px;
  font-weight: 800;
  margin-top: 5px;
  white-space: nowrap;
}
.farm-plus {
  font-size: 28px;
  opacity: 0.6;
  color: var(--accent-deep);
  line-height: 1;
}
.farm-meta {
  color: var(--muted);
  font-size: 10px;
  font-weight: 700;
  margin-top: 2px;
}
.farm-cell.slot-buy {
  background: rgba(251, 211, 92, 0.18);
  border: 2px dashed var(--accent);
  cursor: pointer;
  font: inherit;
  color: inherit;
  box-shadow: none;
}
.farm-cell.slot-buy:hover:not(.disabled) {
  border-style: solid;
  transform: translateY(-2px);
}
.farm-cell.slot-buy.disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.farm-cell.slot-buy .coin-line {
  font-weight: 800;
  color: var(--accent-deep);
  opacity: 1;
  font-size: 10px;
}
.farm-spark {
  position: absolute;
  top: 4px;
  left: 6px;
  font-size: 13px;
  animation: sparkle 1.8s linear infinite;
}
.farm-star {
  position: absolute;
  top: 4px;
  left: 6px;
  font-size: 12px;
}

/* ── Crafter / Fusion ───────────────────────────────────────────── */
.craft-job {
  margin: 6px 0 10px;
  padding: 10px 12px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(96, 165, 250, 0.10));
  border: 2px solid rgba(124, 58, 237, 0.25);
}
.craft-job.ready {
  background: linear-gradient(135deg, rgba(46, 194, 114, 0.12), rgba(251, 211, 92, 0.14));
  border-color: rgba(46, 194, 114, 0.5);
  animation: cardPulse 2s ease-in-out infinite;
}
@keyframes cardPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.012); }
}
.craft-job-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.craft-job-emoji { font-size: 32px; flex-shrink: 0; }
.craft-job-body { flex: 1; min-width: 0; }
.craft-job-title { font-weight: 800; font-size: 14px; color: var(--heading); }
.craft-job-time { font-size: 12px; color: var(--muted); font-weight: 700; }
.craft-job-bar {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: var(--surface-deep);
  overflow: hidden;
  border: 1px solid var(--border);
  margin-top: 4px;
}
.craft-job-bar span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #2ec272, #fbd35c);
  transition: width 0.3s ease;
}
.fusion-toggle {
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 800;
  min-height: 40px;
}
.btn.small {
  padding: 6px 10px;
  font-size: 12px;
}
.hint {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  margin: 0 0 8px;
}
.crafter-card,
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
  background: var(--surface-deep);
  border: 2px solid var(--border);
  border-radius: 14px;
  padding: 4px;
}
.fm-mode-btn {
  flex: 1;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 6px 10px;
  color: var(--muted);
  cursor: pointer;
  font-weight: 700;
}
.fm-mode-btn.active {
  background: var(--card);
  border-color: var(--border);
  color: var(--heading);
  box-shadow: 0 2px 0 var(--border);
}
.fusion-preview {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: var(--card-2);
  border: 2px dashed var(--border);
  border-radius: 18px;
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
  background: var(--surface-deep);
  border-color: var(--accent);
  transform: translateY(-1px);
}
.fusion-preview-emoji {
  font-size: 56px;
  line-height: 1;
  animation: bob 2.2s ease-in-out infinite;
  filter: drop-shadow(0 4px 8px rgba(110, 80, 20, 0.25));
}
.fusion-preview-label {
  font-weight: 800;
  font-size: 15px;
  color: var(--heading);
}
.fusion-machine {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 10px;
  align-items: stretch;
  margin-bottom: 12px;
}
.fm-slot {
  background: var(--card-2);
  border: 2px solid var(--border);
  border-radius: 18px;
  padding: 10px;
  min-height: 110px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.fm-slot-title {
  font-weight: 800;
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
  background: var(--card);
  padding: 4px 8px;
  border-radius: 12px;
  border: 2px solid var(--border);
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
  filter: drop-shadow(0 4px 8px rgba(110, 80, 20, 0.25));
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
  background: var(--card-2);
  border: 2px solid var(--border);
  border-radius: 12px;
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
  font-weight: 700;
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
.upgrading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}
.tier-chip {
  position: relative;
  --tier-color: #b8a888;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--tier-color) 26%, #fff) 0%,
    color-mix(in srgb, var(--tier-color) 8%, #fff) 100%
  );
  border: 2px solid color-mix(in srgb, var(--tier-color) 55%, transparent);
  border-radius: 14px;
  padding: 10px 6px;
  text-align: center;
  color: inherit;
  font: inherit;
  cursor: pointer;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--tier-color) 22%, transparent);
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
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}
.tier-name {
  font-weight: 800;
  font-size: 12px;
  text-transform: capitalize;
  margin-top: 4px;
  color: var(--heading);
}
.tier-meta {
  font-size: 10px;
  font-weight: 600;
  color: var(--text);
  opacity: 0.8;
  margin-top: 2px;
}
.tier-time {
  font-size: 11px;
  color: var(--accent-deep);
  font-weight: 800;
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}
.cr-ing-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.cr-qty-label {
  font-size: 10px;
  font-weight: 800;
  color: var(--danger);
  font-variant-numeric: tabular-nums;
}
.cr-qty-label.ok {
  color: #1d9457;
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
  filter: drop-shadow(0 0 12px rgba(244, 169, 18, 0.45));
  border-color: rgba(244, 169, 18, 0.45);
  animation: bob 2.4s ease-in-out infinite;
}
.fm-chip.cr-short {
  opacity: 0.45;
  border-color: var(--danger);
}

/* ── Boss-Pfad & Event-Links ────────────────────────────────────── */
.boss-path-link {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  text-decoration: none;
  color: inherit;
  background:
    radial-gradient(circle at 0% 0%, rgba(251, 211, 92, 0.35), transparent 55%),
    radial-gradient(circle at 100% 100%, rgba(167, 139, 250, 0.25), transparent 60%),
    var(--card);
  border: 2px solid rgba(244, 169, 18, 0.45);
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}
.boss-path-link:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: 0 12px 28px rgba(244, 169, 18, 0.25);
}
.bpl-icon {
  font-size: 36px;
  filter: drop-shadow(0 4px 8px rgba(110, 80, 20, 0.3));
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
  background: linear-gradient(90deg, #d98c00, #e8447a, #8b5cf6);
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
.bpl-event-status {
  margin-top: 6px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  background: rgba(14, 140, 200, 0.10);
  border: 1px solid rgba(14, 140, 200, 0.4);
  color: #0e7eb4;
  font-variant-numeric: tabular-nums;
}
.bpl-event-status.ended {
  background: rgba(239, 71, 111, 0.10);
  border-color: rgba(239, 71, 111, 0.5);
  color: #d92b56;
}
.event-link.event-ended {
  cursor: not-allowed;
  filter: grayscale(0.65);
  opacity: 0.7;
  border-color: rgba(239, 71, 111, 0.45);
}
.event-link.event-ended:hover {
  transform: none;
  box-shadow: none;
}
.bpl-arrow {
  font-size: 30px;
  color: var(--accent-deep);
  font-weight: 800;
  line-height: 1;
  flex-shrink: 0;
}
.event-link {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  text-decoration: none;
  color: inherit;
  background:
    radial-gradient(circle at 0% 0%, rgba(46, 194, 114, 0.18), transparent 55%),
    radial-gradient(circle at 100% 100%, rgba(72, 202, 228, 0.18), transparent 60%),
    var(--card);
  border: 2px solid rgba(46, 194, 114, 0.4);
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}
.event-link:hover {
  transform: translateY(-2px);
  border-color: #2ec272;
  box-shadow: 0 12px 28px rgba(46, 194, 114, 0.2);
}
.ml-icon {
  font-size: 36px;
  filter: drop-shadow(0 4px 8px rgba(110, 80, 20, 0.3));
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
  background: linear-gradient(90deg, #0ea974, #0e8cc8, #8b5cf6);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.drift-link {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  text-decoration: none;
  color: inherit;
  background:
    radial-gradient(circle at 0% 0%, rgba(126, 205, 240, 0.28), transparent 55%),
    var(--card);
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}
.drift-link:hover {
  transform: translateY(-2px);
  border-color: var(--sky);
  box-shadow: 0 12px 28px rgba(126, 205, 240, 0.3);
}
.dl-icon {
  font-size: 36px;
  filter: drop-shadow(0 4px 8px rgba(110, 80, 20, 0.3));
  flex-shrink: 0;
  animation: dlDrift 3.2s ease-in-out infinite;
}
@keyframes dlDrift {
  0%, 100% { transform: translateX(0) rotate(-4deg); }
  50% { transform: translateX(4px) rotate(6deg); }
}
.dl-title {
  font-weight: 800;
  font-size: 16px;
  background: linear-gradient(90deg, #0e8cc8, #e8447a, #d98c00);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* ── Tägliche Belohnung ─────────────────────────────────────────── */
.daily-banner {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 2px solid var(--border);
  border-radius: 18px;
  background: var(--card);
  box-shadow: var(--shadow-card);
  padding: 10px 14px;
  margin-bottom: 12px;
  cursor: pointer;
  text-align: left;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}
.daily-banner:active {
  transform: scale(0.98);
}
.daily-banner.ready {
  border-color: var(--accent);
  background:
    radial-gradient(circle at 0% 0%, rgba(251, 211, 92, 0.45), transparent 55%),
    var(--card);
  animation: dailyGlow 2.2s ease-in-out infinite;
}
@keyframes dailyGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(244, 169, 18, 0.35), var(--shadow-card); }
  50% { box-shadow: 0 0 0 6px rgba(244, 169, 18, 0.08), var(--shadow-card); }
}
.db-icon {
  font-size: 28px;
  flex-shrink: 0;
}
.daily-banner.ready .db-icon {
  animation: dbWiggle 1.4s ease-in-out infinite;
}
@keyframes dbWiggle {
  0%, 100% { transform: rotate(-6deg); }
  50% { transform: rotate(8deg) scale(1.08); }
}
.db-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.db-title {
  font-weight: 800;
  font-size: 14px;
  color: var(--heading);
}
.db-status {
  font-size: 12px;
  color: var(--muted);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.db-status.ready {
  color: var(--accent-deep);
  font-weight: 900;
}
.db-streak {
  flex-shrink: 0;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 900;
  color: var(--accent-deep);
  background: var(--card-2);
  border: 2px solid var(--accent-soft);
}
.db-arrow {
  font-size: 24px;
  color: var(--accent-deep);
  font-weight: 800;
  line-height: 1;
  flex-shrink: 0;
}

/* ── Geschenk-Dialog ────────────────────────────────────────────── */
.gift-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(74, 52, 12, 0.5);
  backdrop-filter: blur(3px);
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
@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.03);
  }
}
</style>
