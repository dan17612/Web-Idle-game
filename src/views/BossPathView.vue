<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useGameStore } from "../stores/game";
import { speciesInfo, formatCoins, tierInfo } from "../animals";
import { locale } from "../i18n";
import BossFight from "../components/BossFight.vue";
import { useReturnRefresh } from "../composables/useReturnRefresh";

const game = useGameStore();
const router = useRouter();

const I18N = {
  de: {
    title: "🗺️ Boss-Pfad",
    sub: "Eine Reise durch Wiesen, Berge und Vulkane. Jeder Sieg bringt Truhen und aktivierbare Boosts.",
    backHome: "Zurück",
    progress: "Fortschritt",
    stages: "Etappen",
    victories: "Siege",
    locked: "Gesperrt",
    current: "Aktuell",
    cleared: "Geschafft",
    fight: "Kämpfen",
    fightAgain: "Erneut",
    rewardsTitle: "🎁 Deine Belohnungen",
    rewardsEmpty: "Keine offenen Belohnungen. Besiege einen Boss um Belohnungen zu sammeln.",
    chest: "Truhe",
    boost: "Boost",
    open: "Öffnen",
    activate: "Aktivieren",
    coins: "Münzen",
    minutes: "min",
    multiplier: "Multiplikator",
    duration: "Dauer",
    stageLabel: "Etappe {n}",
    bossDefeated: "Boss besiegt!",
    rewardChestEarned: "Truhe mit {qty} zufälligen Tieren",
    rewardBoostEarned: "{mult}× Boost für {min} Min erhalten",
    rewardPetEarned: "{qty}× {tier} {animal} erhalten",
    chestQty: "{qty} Tier(e)",
    petReward: "{qty}× {tier} {animal}",
    chestOpenedTitle: "Truhe geöffnet!",
    chestOpenedSub: "Du hast erhalten:",
    awesome: "Super!",
    continue: "Weiter",
    error: "Aktion fehlgeschlagen",
    pathComplete: "🏆 Pfad abgeschlossen! Alle Bosse besiegt.",
    bossActiveBoost: "Aktiver Boost: ×{mult} · {time}",
    confirmFight: "Bereit?",
    cancel: "Abbrechen",
    loading: "Lade Boss-Pfad…",
    retry: "Erneut versuchen"
  },
  en: {
    title: "🗺️ Boss path",
    sub: "A journey through meadows, mountains and volcanoes. Each victory drops chests and activatable boosts.",
    backHome: "Back",
    progress: "Progress",
    stages: "Stages",
    victories: "Victories",
    locked: "Locked",
    current: "Current",
    cleared: "Cleared",
    fight: "Fight",
    fightAgain: "Replay",
    rewardsTitle: "🎁 Your rewards",
    rewardsEmpty: "No pending rewards. Defeat a boss to collect rewards.",
    chest: "Chest",
    boost: "Boost",
    open: "Open",
    activate: "Activate",
    coins: "coins",
    minutes: "min",
    multiplier: "Multiplier",
    duration: "Duration",
    stageLabel: "Stage {n}",
    bossDefeated: "Boss defeated!",
    rewardChestEarned: "Chest with {qty} random animals",
    rewardBoostEarned: "{mult}× boost for {min} min earned",
    rewardPetEarned: "{qty}× {tier} {animal} earned",
    chestQty: "{qty} animal(s)",
    petReward: "{qty}× {tier} {animal}",
    chestOpenedTitle: "Chest opened!",
    chestOpenedSub: "You received:",
    awesome: "Awesome!",
    continue: "Continue",
    error: "Action failed",
    pathComplete: "🏆 Path complete! All bosses defeated.",
    bossActiveBoost: "Active boost: ×{mult} · {time}",
    confirmFight: "Ready?",
    cancel: "Cancel",
    loading: "Loading boss path…",
    retry: "Retry"
  },
  ru: {
    title: "🗺️ Путь босса",
    sub: "Путешествие по лугам, горам и вулканам. Каждая победа даёт сундуки и активируемые бусты.",
    backHome: "Назад",
    progress: "Прогресс",
    stages: "Этапы",
    victories: "Победы",
    locked: "Закрыто",
    current: "Текущий",
    cleared: "Пройдено",
    fight: "В бой",
    fightAgain: "Снова",
    rewardsTitle: "🎁 Твои награды",
    rewardsEmpty: "Нет наград. Победи босса, чтобы получить награды.",
    chest: "Сундук",
    boost: "Буст",
    open: "Открыть",
    activate: "Активировать",
    coins: "монет",
    minutes: "мин",
    multiplier: "Множитель",
    duration: "Длительность",
    stageLabel: "Этап {n}",
    bossDefeated: "Босс побеждён!",
    rewardChestEarned: "Сундук с {qty} случайными животными",
    rewardBoostEarned: "Получен ×{mult} буст на {min} мин",
    rewardPetEarned: "Получено: {qty}× {tier} {animal}",
    chestQty: "{qty} животных",
    petReward: "{qty}× {tier} {animal}",
    chestOpenedTitle: "Сундук открыт!",
    chestOpenedSub: "Ты получил:",
    awesome: "Супер!",
    continue: "Дальше",
    error: "Ошибка действия",
    pathComplete: "🏆 Путь завершён! Все боссы повержены.",
    bossActiveBoost: "Активный буст: ×{mult} · {time}",
    confirmFight: "Готов?",
    cancel: "Отмена",
    loading: "Загрузка пути…",
    retry: "Повторить"
  }
};

function tx(key, vars = {}) {
  const dict = I18N[locale.value] || I18N.en;
  const text = String(dict[key] ?? I18N.en[key] ?? key);
  return text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

function chestQtyForStage(stage) {
  if (stage <= 5) return 1;
  if (stage <= 10) return 2;
  if (stage <= 14) return 3;
  return 5;
}

function stagePetDefaults(stage) {
  return stage === 15
    ? { petSpecies: "dragon", petTier: "gold", petQty: 1 }
    : { petSpecies: null, petTier: "normal", petQty: 0 };
}

const DEFAULT_STAGES = [
  { stage: 1,  species: "chick",       name: "Wiesen-Küken",        terrain: "meadow",       hp: 900,    time_seconds: 180, boostMult: 2,  boostMinutes: 3 },
  { stage: 2,  species: "chicken",     name: "Hofhuhn",             terrain: "meadow",       hp: 1300,   time_seconds: 180, boostMult: 2,  boostMinutes: 4 },
  { stage: 3,  species: "rabbit",      name: "Wald-Hase",           terrain: "forest",       hp: 1800,   time_seconds: 180, boostMult: 3,  boostMinutes: 5 },
  { stage: 4,  species: "pig",         name: "Wildschwein",         terrain: "farm",         hp: 2400,   time_seconds: 180, boostMult: 3,  boostMinutes: 5 },
  { stage: 5,  species: "sheep",       name: "Sturm-Schaf",         terrain: "plains",       hp: 3000,   time_seconds: 180, boostMult: 3,  boostMinutes: 6 },
  { stage: 6,  species: "cow",         name: "Donner-Stier",        terrain: "plains",       hp: 3600,   time_seconds: 180, boostMult: 4,  boostMinutes: 6 },
  { stage: 7,  species: "horse",       name: "Schatten-Pferd",      terrain: "mountain_low", hp: 4400,   time_seconds: 180, boostMult: 5,  boostMinutes: 7 },
  { stage: 8,  species: "scorpion",    name: "Sand-Skorpion",       terrain: "desert",       hp: 5400,   time_seconds: 180, boostMult: 5,  boostMinutes: 7 },
  { stage: 9,  species: "panda",       name: "Bambus-Panda",        terrain: "bamboo",       hp: 6500,   time_seconds: 180, boostMult: 6,  boostMinutes: 8 },
  { stage: 10, species: "tiger",       name: "Säbelzahn-Tiger",     terrain: "jungle",       hp: 8000,   time_seconds: 180, boostMult: 7,  boostMinutes: 8 },
  { stage: 11, species: "lion",        name: "Kronen-Löwe",         terrain: "savanna",      hp: 9500,   time_seconds: 180, boostMult: 8,  boostMinutes: 10 },
  { stage: 12, species: "trex",        name: "Urzeit-T-Rex",        terrain: "volcano",      hp: 11500,  time_seconds: 180, boostMult: 9,  boostMinutes: 10 },
  { stage: 13, species: "peacock",     name: "Sternen-Pfau",        terrain: "peak",         hp: 13500,  time_seconds: 180, boostMult: 10, boostMinutes: 10 },
  { stage: 14, species: "jormungandr", name: "Tiefsee-Jörmungandr", terrain: "abyss",        hp: 16000,  time_seconds: 180, boostMult: 10, boostMinutes: 15 },
  { stage: 15, species: "dragon",      name: "Drachenkönig",        terrain: "dragon_lair",  hp: 20000,  time_seconds: 180, boostMult: 15, boostMinutes: 30 }
].map((s) => ({ ...stagePetDefaults(s.stage), ...s, chestQty: chestQtyForStage(s.stage) }));

function normalizeStageConfig(raw) {
  const stage = Number(raw?.stage || 0);
  const fallback = DEFAULT_STAGES.find((s) => s.stage === stage) || {};
  const species = raw?.species || fallback.species || "chick";
  return {
    ...fallback,
    ...raw,
    stage,
    species,
    name: raw?.name || fallback.name || speciesInfo(species).name,
    terrain: raw?.terrain || fallback.terrain || "meadow",
    hp: Number(raw?.hp ?? fallback.hp ?? 1000),
    time_seconds: Number(raw?.time_seconds ?? raw?.timeSeconds ?? fallback.time_seconds ?? 180),
    chestQty: Number(raw?.chest_qty ?? raw?.chestQty ?? fallback.chestQty ?? chestQtyForStage(stage)),
    boostMult: Number(raw?.boost_mult ?? raw?.boostMult ?? fallback.boostMult ?? 1),
    boostMinutes: Number(raw?.boost_minutes ?? raw?.boostMinutes ?? fallback.boostMinutes ?? 0),
    petSpecies: raw?.pet_species ?? raw?.petSpecies ?? fallback.petSpecies ?? null,
    petTier: raw?.pet_tier ?? raw?.petTier ?? fallback.petTier ?? "normal",
    petQty: Number(raw?.pet_qty ?? raw?.petQty ?? fallback.petQty ?? 0)
  };
}

const TERRAIN_BG = {
  meadow:        "linear-gradient(180deg, #6dd47e 0%, #4cae5b 100%)",
  forest:        "linear-gradient(180deg, #2d6a3e 0%, #1c4d2a 100%)",
  farm:          "linear-gradient(180deg, #c8a94a 0%, #8a6d2c 100%)",
  plains:        "linear-gradient(180deg, #b6cf69 0%, #71924a 100%)",
  mountain_low:  "linear-gradient(180deg, #6b7c98 0%, #3d4a66 100%)",
  desert:        "linear-gradient(180deg, #f0c870 0%, #b3833f 100%)",
  bamboo:        "linear-gradient(180deg, #4f8a4d 0%, #2c5e2a 100%)",
  jungle:        "linear-gradient(180deg, #3a7250 0%, #18452f 100%)",
  savanna:       "linear-gradient(180deg, #d8a55c 0%, #966b30 100%)",
  volcano:       "linear-gradient(180deg, #7a2820 0%, #3a0d0a 100%)",
  peak:          "linear-gradient(180deg, #7d8eaa 0%, #2f3c5d 100%)",
  abyss:         "linear-gradient(180deg, #1a3a6a 0%, #051528 100%)",
  dragon_lair:   "linear-gradient(180deg, #4a0e2a 0%, #1a0210 100%)"
};

const TERRAIN_DECOR = {
  meadow:        ["🌼", "🌱", "🦋"],
  forest:        ["🌲", "🍄", "🌿"],
  farm:          ["🌾", "🌽", "🚜"],
  plains:        ["🌾", "☁️", "🦗"],
  mountain_low:  ["⛰️", "🪨", "❄️"],
  desert:        ["🌵", "☀️", "🦎"],
  bamboo:        ["🎋", "🌿", "🥬"],
  jungle:        ["🌴", "🐦", "🍌"],
  savanna:       ["🌳", "☀️", "🦓"],
  volcano:       ["🌋", "🔥", "💨"],
  peak:          ["🏔️", "❄️", "✨"],
  abyss:         ["🌊", "🐚", "💧"],
  dragon_lair:   ["🔥", "💀", "👑"]
};

const pathState = ref({
  current_stage: 1,
  highest_stage: 0,
  total_victories: 0,
  rewards: [],
  stages: DEFAULT_STAGES,
  max_stage: 15
});
const loaded = ref(false);
const loading = ref(false);
const error = ref("");
const fightOpen = ref(false);
const fightStage = ref(null);
const victoryInfo = ref(null);
const chestOpening = ref(false);
const chestReveal = ref(null);
const tickNow = ref(Date.now());
let tickTimer = null;

useReturnRefresh(() => refreshPath());

onMounted(async () => {
  tickTimer = setInterval(() => { tickNow.value = Date.now(); }, 500);
  await refreshPath();
});

onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer);
});

async function refreshPath() {
  loading.value = true;
  error.value = "";
  try {
    const data = await game.loadBossPath();
    if (!data) throw new Error(tx("error"));
    const stages = Array.isArray(data.stages) && data.stages.length
      ? data.stages.map(normalizeStageConfig)
      : DEFAULT_STAGES;
    pathState.value = {
      current_stage: Number(data.current_stage || 1),
      highest_stage: Number(data.highest_stage || 0),
      total_victories: Number(data.total_victories || 0),
      rewards: Array.isArray(data.rewards) ? data.rewards : [],
      stages,
      max_stage: Number(data.max_stage || stages.length || 15)
    };
    loaded.value = true;
  } catch (e) {
    error.value = e?.message || tx("error");
  } finally {
    loading.value = false;
  }
}

const stageList = computed(() =>
  (pathState.value.stages?.length ? pathState.value.stages : DEFAULT_STAGES).map((s) => {
    const info = speciesInfo(s.species);
    const status = s.stage < pathState.value.current_stage
      ? "cleared"
      : s.stage === pathState.value.current_stage
      ? "current"
      : "locked";
    return {
      ...s,
      info,
      status,
      side: s.stage % 2 === 0 ? "right" : "left"
    };
  })
);

const completed = computed(() => pathState.value.current_stage > pathState.value.max_stage);
const progressPct = computed(() => {
  const max = Math.max(1, pathState.value.max_stage);
  const done = Math.min(max, Math.max(0, pathState.value.current_stage - 1));
  return Math.round((done / max) * 100);
});

const chestRewards = computed(() => pathState.value.rewards.filter((r) => r.kind === "chest"));
const boostRewards = computed(() => pathState.value.rewards.filter((r) => r.kind === "boost"));

const activeBoostText = computed(() => {
  if (!game.boostActive) return null;
  const remain = Math.max(0, game.petBoostUntil - (Date.now() + game.serverOffset));
  const m = Math.floor(remain / 60000);
  const s = Math.floor((remain % 60000) / 1000);
  return tx("bossActiveBoost", {
    mult: game.petBoostMultiplier,
    time: `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  });
});

void tickNow;

function openFight(stage) {
  if (stage.status !== "current") return;
  fightStage.value = stage;
  victoryInfo.value = null;
  fightOpen.value = true;
}

function closeFight() {
  fightOpen.value = false;
  fightStage.value = null;
}

async function onVictory({ score, target, stage }) {
  try {
    const result = await game.completeBossStage(stage, score, target);
    victoryInfo.value = {
      stage,
      chestQty: Number(result?.chest?.chest_qty || 0),
      boostMult: Number(result?.boost?.multiplier || 0),
      boostMin: Number(result?.boost?.duration_minutes || 0),
      petSpecies: result?.pet_reward?.species || null,
      petTier: result?.pet_reward?.tier || "normal",
      petQty: Number(result?.pet_reward?.qty || 0)
    };
    await refreshPath();
  } catch (e) {
    error.value = e?.message || tx("error");
  }
}

async function openChest(reward) {
  if (chestOpening.value) return;
  chestOpening.value = true;
  chestReveal.value = { phase: "shake", species: [] };
  try {
    const data = await game.openBossPathChest(reward.id);
    const species = Array.isArray(data?.species) ? data.species : [];
    await new Promise((r) => setTimeout(r, 800));
    chestReveal.value = { phase: "open", species };
    await new Promise((r) => setTimeout(r, 500));
    chestReveal.value = { phase: "reveal", species };
    await refreshPath();
  } catch (e) {
    error.value = e?.message || tx("error");
    chestReveal.value = null;
  } finally {
    chestOpening.value = false;
  }
}

function closeChestReveal() {
  chestReveal.value = null;
}

async function activateBoost(reward) {
  try {
    await game.activateBossPathReward(reward.id);
    await refreshPath();
  } catch (e) {
    error.value = e?.message || tx("error");
  }
}

function backHome() {
  router.push("/");
}

function rewardChestPayload(r) {
  return {
    qty: Number(r.payload?.chest_qty || 1),
    bossName: r.payload?.boss_name
  };
}
function rewardBoostPayload(r) {
  return {
    mult: Number(r.payload?.multiplier || 0),
    min: Number(r.payload?.duration_minutes || 0)
  };
}

function tierRewardLabel(tier) {
  const key = tier || "normal";
  const labels = {
    de: { normal: "Normal", gold: "Gold", diamond: "Diamond", epic: "Epic", rainbow: "Rainbow" },
    en: { normal: "Normal", gold: "Gold", diamond: "Diamond", epic: "Epic", rainbow: "Rainbow" },
    ru: { normal: "Обычный", gold: "Золотой", diamond: "Алмазный", epic: "Эпический", rainbow: "Радужный" }
  };
  return labels[locale.value]?.[key] || labels.en[key] || key;
}

function petRewardPayload(reward) {
  if (!reward?.petSpecies || Number(reward?.petQty || 0) <= 0) return null;
  const info = speciesInfo(reward.petSpecies);
  const tier = tierRewardLabel(reward.petTier);
  return {
    emoji: info.emoji,
    animal: info.name,
    tier,
    tierBadge: tierInfo(reward.petTier).badge,
    qty: Number(reward.petQty || 0)
  };
}

function formatPetReward(reward, key = "petReward") {
  const pet = petRewardPayload(reward);
  if (!pet) return "";
  return `${pet.tierBadge || ""} ${tx(key, { ...pet, animal: `${pet.emoji} ${pet.animal}` })}`.trim();
}

const victoryPetReward = computed(() => petRewardPayload(victoryInfo.value));
</script>

<template>
  <div class="boss-path-view">
    <header class="bp-header">
      <Button class="btn small btn-ghost back-btn" @click="backHome">
        <i class="pi pi-arrow-left"></i>
        <span>{{ tx("backHome") }}</span>
      </Button>
      <div class="bp-title-block">
        <h1 class="bp-title">{{ tx("title") }}</h1>
        <p class="bp-sub">{{ tx("sub") }}</p>
      </div>
    </header>

    <div v-if="!loaded && loading" class="bp-loading">
      <i class="pi pi-spin pi-spinner"></i>
      <span>{{ tx("loading") }}</span>
    </div>

    <div v-else-if="!loaded && error" class="bp-load-error">
      <div class="bp-load-error-msg">{{ error }}</div>
      <Button class="btn small" @click="refreshPath">{{ tx("retry") }}</Button>
    </div>

    <template v-else>
    <div class="bp-stats">
      <div class="bp-stat">
        <div class="bp-stat-value">{{ Math.min(pathState.current_stage - 1, pathState.max_stage) }}/{{ pathState.max_stage }}</div>
        <div class="bp-stat-label">{{ tx("stages") }}</div>
      </div>
      <div class="bp-stat">
        <div class="bp-stat-value">🏆 {{ pathState.total_victories }}</div>
        <div class="bp-stat-label">{{ tx("victories") }}</div>
      </div>
      <div class="bp-stat bp-stat-progress">
        <div class="bp-progress-bar"><span :style="{ width: progressPct + '%' }"></span></div>
        <div class="bp-stat-label">{{ tx("progress") }} · {{ progressPct }}%</div>
      </div>
    </div>

    <div v-if="activeBoostText" class="bp-boost-live">{{ activeBoostText }}</div>

    <section class="bp-rewards card">
      <h3 class="bp-rewards-title">{{ tx("rewardsTitle") }}</h3>
      <div v-if="!pathState.rewards.length" class="bp-rewards-empty">
        {{ tx("rewardsEmpty") }}
      </div>
      <div v-else class="bp-rewards-grid">
        <div v-for="r in chestRewards" :key="r.id" class="bp-reward chest">
          <div class="bp-reward-icon">🎁</div>
          <div class="bp-reward-body">
            <div class="bp-reward-title">{{ tx("chest") }} · {{ tx("stageLabel", { n: r.stage }) }}</div>
            <div class="bp-reward-meta">{{ tx("chestQty", { qty: rewardChestPayload(r).qty }) }} 🐾</div>
          </div>
          <Button class="btn small bp-reward-btn" :disabled="chestOpening" @click="openChest(r)">{{ tx("open") }}</Button>
        </div>
        <div v-for="r in boostRewards" :key="r.id" class="bp-reward boost">
          <div class="bp-reward-icon">⚡</div>
          <div class="bp-reward-body">
            <div class="bp-reward-title">{{ tx("boost") }} · {{ tx("stageLabel", { n: r.stage }) }}</div>
            <div class="bp-reward-meta">×{{ rewardBoostPayload(r).mult }} · {{ rewardBoostPayload(r).min }} {{ tx("minutes") }}</div>
          </div>
          <Button class="btn small bp-reward-btn" @click="activateBoost(r)">{{ tx("activate") }}</Button>
        </div>
      </div>
    </section>

    <div v-if="completed" class="bp-complete">{{ tx("pathComplete") }}</div>

    <section class="bp-path">
      <div
        v-for="(stage, idx) in stageList"
        :key="stage.stage"
        class="bp-stage"
        :class="['stage-' + stage.status, 'side-' + stage.side]"
        :style="{ background: TERRAIN_BG[stage.terrain] }"
      >
        <span
          v-for="(d, di) in TERRAIN_DECOR[stage.terrain] || []"
          :key="di"
          class="bp-decor"
          :class="'decor-' + di"
        >{{ d }}</span>

        <div v-if="idx > 0" class="bp-trail" :class="'side-' + stage.side"></div>

        <div class="bp-stage-card">
          <div class="bp-stage-num">{{ tx("stageLabel", { n: stage.stage }) }}</div>
          <div class="bp-stage-boss">
            <div class="bp-boss-circle" :class="'st-' + stage.status">
              <span class="bp-boss-emoji">{{ stage.info.emoji }}</span>
              <span v-if="stage.status === 'cleared'" class="bp-status-badge cleared">✓</span>
              <span v-else-if="stage.status === 'locked'" class="bp-status-badge locked">🔒</span>
              <span v-else class="bp-status-badge current">⚔️</span>
            </div>
          </div>
          <div class="bp-stage-name">{{ stage.name }}</div>
          <div class="bp-stage-rewards">
            <span>🎁 {{ tx("chestQty", { qty: stage.chestQty }) }}</span>
            <span>⚡ ×{{ stage.boostMult }} · {{ stage.boostMinutes }}{{ tx("minutes") }}</span>
            <span v-if="formatPetReward(stage)">🎖️ {{ formatPetReward(stage) }}</span>
          </div>
          <Button
            v-if="stage.status === 'current'"
            class="btn bp-fight-btn"
            @click="openFight(stage)"
          >
            ⚔️ {{ tx("fight") }}
          </Button>
          <div v-else-if="stage.status === 'locked'" class="bp-locked-hint">
            🔒 {{ tx("locked") }}
          </div>
          <div v-else class="bp-cleared-hint">
            🏆 {{ tx("cleared") }}
          </div>
        </div>
      </div>
    </section>
    </template>

    <div v-if="loaded && error" class="bp-error">{{ error }}</div>

    <Teleport to="body">
      <div
        v-if="chestReveal"
        class="chest-modal"
        @click.self="chestReveal.phase === 'reveal' && closeChestReveal()"
      >
        <div class="chest-stage">
          <div
            class="chest-box"
            :class="{
              shake: chestReveal.phase === 'shake',
              opening: chestReveal.phase === 'open',
              gone: chestReveal.phase === 'reveal'
            }"
          >🎁</div>
          <div v-if="chestReveal.phase === 'shake' || chestReveal.phase === 'open'" class="chest-glow"></div>
          <div v-if="chestReveal.phase === 'reveal'" class="chest-reveal">
            <div
              v-for="(sp, i) in chestReveal.species"
              :key="i"
              class="reveal-animal"
              :style="{ animationDelay: (i * 0.25) + 's' }"
            >
              {{ speciesInfo(sp).emoji || "❓" }}
              <div class="reveal-name">{{ speciesInfo(sp).name }}</div>
            </div>
          </div>
        </div>
        <Button v-if="chestReveal.phase === 'reveal'" class="btn" @click="closeChestReveal">{{ tx("continue") }}</Button>
      </div>

      <div v-if="fightOpen" class="bp-modal-overlay" @click.self="closeFight">
        <div class="bp-modal">
          <div v-if="!victoryInfo">
            <BossFight
              :stage-config="fightStage"
              :auto-start="false"
              @victory="onVictory"
              @exit="closeFight"
              @timeout="() => null"
            />
          </div>
          <div v-else class="bp-victory">
            <div class="bp-victory-burst">🏆</div>
            <div class="bp-victory-title">{{ tx("bossDefeated") }}</div>
            <div class="bp-victory-rewards">
              <div class="bp-victory-row chest">
                🎁 {{ tx("rewardChestEarned", { qty: victoryInfo.chestQty }) }}
              </div>
              <div class="bp-victory-row boost">
                ⚡ {{ tx("rewardBoostEarned", { mult: victoryInfo.boostMult, min: victoryInfo.boostMin }) }}
              </div>
              <div v-if="victoryPetReward" class="bp-pet-reward">
                <div class="bp-pet-reward-stage">
                  <div class="bp-pet-glow"></div>
                  <div class="bp-pet-gift">🎁</div>
                  <div class="bp-pet-prize">
                    <div class="bp-pet-emoji">{{ victoryPetReward.emoji }}</div>
                    <div class="bp-pet-name">
                      <span v-if="victoryPetReward.tierBadge">{{ victoryPetReward.tierBadge }}</span>
                      {{ victoryPetReward.tier }} {{ victoryPetReward.animal }}
                    </div>
                    <div v-if="victoryPetReward.qty > 1" class="bp-pet-count">
                      ×{{ victoryPetReward.qty }}
                    </div>
                  </div>
                </div>
                <div class="bp-pet-caption">{{ formatPetReward(victoryInfo, "rewardPetEarned") }}</div>
              </div>
            </div>
            <Button class="btn full" @click="closeFight">{{ tx("continue") }}</Button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.boss-path-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 24px;
}
.bp-header {
  display: flex;
  align-items: center;
  gap: 10px;
}
.bp-title-block { flex: 1; min-width: 0; }
.bp-title {
  font-size: 22px;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(90deg, #ffd166, #ff476f, #a855f7);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.bp-sub {
  margin: 2px 0 0;
  color: var(--muted);
  font-size: 13px;
}
.btn-ghost {
  background: rgba(255,255,255,0.06);
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.back-btn { flex-shrink: 0; }

.bp-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px;
}
.bp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.bp-stat-value {
  font-size: 20px;
  font-weight: 800;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.bp-stat-label {
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.bp-stat-progress {
  grid-column: span 1;
}
.bp-progress-bar {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: rgba(0,0,0,0.3);
  overflow: hidden;
  border: 1px solid var(--border);
  margin-bottom: 4px;
}
.bp-progress-bar span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #06d6a0, #ffd166, #ff476f);
  background-size: 200% 100%;
  transition: width 0.3s ease;
  animation: progressShimmer 3s linear infinite;
}
@keyframes progressShimmer {
  from { background-position: 0 0; }
  to { background-position: 200% 0; }
}

.bp-boost-live {
  background: rgba(6, 214, 160, 0.16);
  color: var(--accent-2);
  border: 1px solid rgba(6, 214, 160, 0.35);
  border-radius: 12px;
  padding: 10px;
  text-align: center;
  font-weight: 800;
  font-size: 13px;
}

.bp-rewards {
  padding: 14px;
}
.bp-rewards-title {
  margin: 0 0 10px;
  font-size: 16px;
  font-weight: 800;
}
.bp-rewards-empty {
  color: var(--muted);
  font-size: 13px;
  text-align: center;
  padding: 8px;
}
.bp-rewards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}
.bp-reward {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: linear-gradient(135deg, #1d294f, #131b3a);
}
.bp-reward.chest {
  background: linear-gradient(135deg, rgba(255, 209, 102, 0.18), rgba(255, 71, 126, 0.12));
  border-color: rgba(255, 209, 102, 0.4);
}
.bp-reward.boost {
  background: linear-gradient(135deg, rgba(6, 214, 160, 0.15), rgba(99, 242, 255, 0.1));
  border-color: rgba(6, 214, 160, 0.4);
}
.bp-reward-icon {
  font-size: 28px;
  filter: drop-shadow(0 3px 5px rgba(0,0,0,0.4));
  flex-shrink: 0;
}
.bp-reward-body {
  flex: 1;
  min-width: 0;
}
.bp-reward-title {
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bp-reward-meta {
  font-size: 12px;
  color: var(--muted);
  font-weight: 700;
}
.bp-reward-btn { flex-shrink: 0; }

.bp-complete {
  text-align: center;
  padding: 14px;
  border-radius: 14px;
  background: linear-gradient(90deg, rgba(255, 209, 102, 0.2), rgba(168, 85, 247, 0.2));
  border: 1px solid rgba(255, 209, 102, 0.5);
  font-weight: 800;
  font-size: 16px;
}

.bp-path {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid var(--border);
  position: relative;
}
.bp-stage {
  position: relative;
  min-height: 220px;
  padding: 22px 16px;
  overflow: hidden;
  display: flex;
  align-items: center;
}
.bp-stage.side-left { justify-content: flex-start; }
.bp-stage.side-right { justify-content: flex-end; }
.bp-stage.stage-locked { filter: grayscale(0.5) brightness(0.7); }

.bp-decor {
  position: absolute;
  font-size: 28px;
  opacity: 0.55;
  pointer-events: none;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
}
.bp-decor.decor-0 { top: 10%; left: 8%; transform: rotate(-12deg); }
.bp-decor.decor-1 { top: 60%; right: 12%; font-size: 22px; }
.bp-decor.decor-2 { bottom: 12%; left: 38%; font-size: 24px; transform: rotate(8deg); }

.bp-trail {
  position: absolute;
  top: -60px;
  width: 6px;
  height: 70px;
  background: repeating-linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.7) 0 8px,
    transparent 8px 16px
  );
  border-radius: 4px;
  z-index: 1;
}
.bp-trail.side-left { left: 24%; }
.bp-trail.side-right { right: 24%; }

.bp-stage-card {
  position: relative;
  z-index: 2;
  width: min(280px, 70%);
  background: rgba(10, 14, 30, 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 16px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  box-shadow: 0 14px 30px rgba(0,0,0,0.45);
}
.stage-current .bp-stage-card {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(255, 209, 102, 0.25), 0 14px 30px rgba(0,0,0,0.55);
  animation: cardPulse 2.4s ease-in-out infinite;
}
@keyframes cardPulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(255, 209, 102, 0.18), 0 14px 30px rgba(0,0,0,0.55); }
  50% { box-shadow: 0 0 0 8px rgba(255, 209, 102, 0.05), 0 14px 30px rgba(0,0,0,0.55); }
}
.bp-stage-num {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 800;
}
.bp-stage-boss {
  position: relative;
}
.bp-boss-circle {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 50px;
  background: radial-gradient(circle at 40% 30%, rgba(255,255,255,0.2), rgba(0,0,0,0.4));
  border: 2px solid rgba(255,255,255,0.25);
  position: relative;
}
.bp-boss-circle.st-current {
  border-color: var(--accent);
  box-shadow: 0 0 24px rgba(255, 209, 102, 0.5);
  animation: bossFloat 2.8s ease-in-out infinite;
}
.bp-boss-circle.st-cleared {
  border-color: var(--accent-2);
  background: radial-gradient(circle at 40% 30%, rgba(6, 214, 160, 0.4), rgba(0,0,0,0.3));
}
@keyframes bossFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
.bp-boss-emoji {
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.6));
}
.bp-status-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 900;
  border: 2px solid #0a0e1e;
}
.bp-status-badge.cleared { background: var(--accent-2); color: #0a0e1e; }
.bp-status-badge.locked { background: rgba(0,0,0,0.6); color: var(--muted); }
.bp-status-badge.current { background: var(--accent); color: #0a0e1e; }

.bp-stage-name {
  font-size: 16px;
  font-weight: 800;
  text-align: center;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}
.bp-stage-rewards {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  color: var(--muted);
  font-weight: 700;
  text-align: center;
}
.bp-fight-btn {
  width: 100%;
  font-weight: 800;
  margin-top: 4px;
}
.bp-locked-hint, .bp-cleared-hint {
  font-size: 12px;
  color: var(--muted);
  font-weight: 700;
}

.bp-error {
  text-align: center;
  padding: 10px;
  border-radius: 10px;
  background: rgba(239, 71, 111, 0.12);
  border: 1px solid rgba(239, 71, 111, 0.4);
  color: var(--danger);
  font-weight: 700;
  font-size: 13px;
}

.bp-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 32px 12px;
  color: var(--muted);
  font-weight: 700;
  font-size: 14px;
}
.bp-loading .pi-spinner { font-size: 22px; color: var(--accent); }

.bp-load-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 12px;
  border-radius: 14px;
  background: rgba(239, 71, 111, 0.12);
  border: 1px solid rgba(239, 71, 111, 0.4);
}
.bp-load-error-msg {
  color: var(--danger);
  font-weight: 800;
  font-size: 14px;
  text-align: center;
}

.bp-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.78);
  backdrop-filter: blur(6px);
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  overflow-y: auto;
}
.bp-modal {
  width: 100%;
  max-width: 540px;
  margin: auto;
}

.bp-victory {
  background: linear-gradient(135deg, #1a1f3d, #0a0e1e);
  border: 1px solid rgba(255, 209, 102, 0.5);
  border-radius: 16px;
  padding: 26px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 14px;
  animation: victoryPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes victoryPop {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}
.bp-victory-burst {
  font-size: 64px;
  filter: drop-shadow(0 6px 14px rgba(255, 209, 102, 0.6));
  animation: victorySpin 1.2s ease-out;
}
@keyframes victorySpin {
  from { transform: rotate(-180deg) scale(0); }
  to { transform: rotate(0) scale(1); }
}
.bp-victory-title {
  font-size: 22px;
  font-weight: 900;
  background: linear-gradient(90deg, #ffd166, #ff476f);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.bp-victory-rewards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bp-victory-row {
  padding: 10px;
  border-radius: 10px;
  font-weight: 800;
  font-size: 13px;
}
.bp-victory-row.chest {
  background: rgba(255, 209, 102, 0.18);
  border: 1px solid rgba(255, 209, 102, 0.4);
  color: var(--accent);
}
.bp-victory-row.boost {
  background: rgba(6, 214, 160, 0.15);
  border: 1px solid rgba(6, 214, 160, 0.4);
  color: var(--accent-2);
}
.bp-pet-reward {
  border-radius: 14px;
  border: 1px solid rgba(168, 85, 247, 0.45);
  background:
    radial-gradient(circle at 50% 18%, rgba(255, 209, 102, 0.2), transparent 48%),
    linear-gradient(135deg, rgba(168, 85, 247, 0.18), rgba(255, 209, 102, 0.12));
  padding: 12px;
  overflow: hidden;
}
.bp-pet-reward-stage {
  position: relative;
  width: 100%;
  height: 150px;
  display: grid;
  place-items: center;
}
.bp-pet-glow {
  position: absolute;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 209, 102, 0.56), transparent 68%);
  animation: glow-pulse 1s ease-in-out infinite;
}
.bp-pet-gift {
  position: absolute;
  font-size: 82px;
  filter: drop-shadow(0 0 28px rgba(255, 209, 102, 0.58));
  animation:
    chest-shake 0.55s ease-in-out 0s 2,
    chest-pop 0.45s ease-out 1.1s forwards;
  z-index: 2;
}
.bp-pet-prize {
  position: relative;
  z-index: 3;
  opacity: 0;
  transform: translateY(40px) scale(0.4);
  animation: reveal-pop 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) 1.35s forwards;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.bp-pet-emoji {
  font-size: 74px;
  line-height: 1;
  filter: drop-shadow(0 0 18px rgba(255, 209, 102, 0.8));
}
.bp-pet-name {
  color: #fff;
  font-size: 13px;
  font-weight: 900;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
}
.bp-pet-count {
  position: absolute;
  top: 4px;
  right: -20px;
  min-width: 28px;
  padding: 3px 7px;
  border-radius: 999px;
  background: var(--accent);
  color: #1b1300;
  font-size: 12px;
  font-weight: 900;
}
.bp-pet-caption {
  color: #d8b4fe;
  font-size: 13px;
  font-weight: 900;
  margin-top: -4px;
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

@media (max-width: 520px) {
  .bp-stats { grid-template-columns: 1fr 1fr; }
  .bp-stat-progress { grid-column: span 2; }
  .bp-stage { min-height: 200px; padding: 18px 12px; }
  .bp-stage-card { width: min(260px, 88%); }
  .bp-boss-circle { width: 72px; height: 72px; font-size: 42px; }
  .bp-decor { font-size: 22px; }
  .bp-decor.decor-1 { font-size: 18px; }
  .bp-decor.decor-2 { font-size: 20px; }
  .bp-rewards-grid { grid-template-columns: 1fr; }
}
</style>
