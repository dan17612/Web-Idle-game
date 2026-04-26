<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useGameStore } from "../stores/game";
import { speciesInfo, formatCoins } from "../animals";
import { locale } from "../i18n";
import BossFight from "../components/BossFight.vue";

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
    chestQty: "{qty} Tier(e)",
    chestOpenedTitle: "Truhe geöffnet!",
    chestOpenedSub: "Du hast erhalten:",
    awesome: "Super!",
    continue: "Weiter",
    error: "Aktion fehlgeschlagen",
    pathComplete: "🏆 Pfad abgeschlossen! Alle Bosse besiegt.",
    bossActiveBoost: "Aktiver Boost: ×{mult} · {time}",
    confirmFight: "Bereit?",
    cancel: "Abbrechen"
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
    chestQty: "{qty} animal(s)",
    chestOpenedTitle: "Chest opened!",
    chestOpenedSub: "You received:",
    awesome: "Awesome!",
    continue: "Continue",
    error: "Action failed",
    pathComplete: "🏆 Path complete! All bosses defeated.",
    bossActiveBoost: "Active boost: ×{mult} · {time}",
    confirmFight: "Ready?",
    cancel: "Cancel"
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
    chestQty: "{qty} животных",
    chestOpenedTitle: "Сундук открыт!",
    chestOpenedSub: "Ты получил:",
    awesome: "Супер!",
    continue: "Дальше",
    error: "Ошибка действия",
    pathComplete: "🏆 Путь завершён! Все боссы повержены.",
    bossActiveBoost: "Активный буст: ×{mult} · {time}",
    confirmFight: "Готов?",
    cancel: "Отмена"
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

const STAGES = [
  { stage: 1,  species: "chick",       name: "Wiesen-Küken",        terrain: "meadow",       hp: 900,    timeSeconds: 180, boostMult: 2,  boostMinutes: 3 },
  { stage: 2,  species: "chicken",     name: "Hofhuhn",             terrain: "meadow",       hp: 1300,   timeSeconds: 180, boostMult: 2,  boostMinutes: 4 },
  { stage: 3,  species: "rabbit",      name: "Wald-Hase",           terrain: "forest",       hp: 1800,   timeSeconds: 180, boostMult: 3,  boostMinutes: 5 },
  { stage: 4,  species: "pig",         name: "Wildschwein",         terrain: "farm",         hp: 2400,   timeSeconds: 180, boostMult: 3,  boostMinutes: 5 },
  { stage: 5,  species: "sheep",       name: "Sturm-Schaf",         terrain: "plains",       hp: 3000,   timeSeconds: 180, boostMult: 3,  boostMinutes: 6 },
  { stage: 6,  species: "cow",         name: "Donner-Stier",        terrain: "plains",       hp: 3600,   timeSeconds: 180, boostMult: 4,  boostMinutes: 6 },
  { stage: 7,  species: "horse",       name: "Schatten-Pferd",      terrain: "mountain_low", hp: 4400,   timeSeconds: 180, boostMult: 5,  boostMinutes: 7 },
  { stage: 8,  species: "scorpion",    name: "Sand-Skorpion",       terrain: "desert",       hp: 5400,   timeSeconds: 180, boostMult: 5,  boostMinutes: 7 },
  { stage: 9,  species: "panda",       name: "Bambus-Panda",        terrain: "bamboo",       hp: 6500,   timeSeconds: 180, boostMult: 6,  boostMinutes: 8 },
  { stage: 10, species: "tiger",       name: "Säbelzahn-Tiger",     terrain: "jungle",       hp: 8000,   timeSeconds: 180, boostMult: 7,  boostMinutes: 8 },
  { stage: 11, species: "lion",        name: "Kronen-Löwe",         terrain: "savanna",      hp: 9500,   timeSeconds: 180, boostMult: 8,  boostMinutes: 10 },
  { stage: 12, species: "trex",        name: "Urzeit-T-Rex",        terrain: "volcano",      hp: 11500,  timeSeconds: 180, boostMult: 9,  boostMinutes: 10 },
  { stage: 13, species: "peacock",     name: "Sternen-Pfau",        terrain: "peak",         hp: 13500,  timeSeconds: 180, boostMult: 10, boostMinutes: 10 },
  { stage: 14, species: "jormungandr", name: "Tiefsee-Jörmungandr", terrain: "abyss",        hp: 16000,  timeSeconds: 180, boostMult: 10, boostMinutes: 15 },
  { stage: 15, species: "dragon",      name: "Drachenkönig",        terrain: "dragon_lair",  hp: 20000,  timeSeconds: 180, boostMult: 15, boostMinutes: 30 }
].map((s) => ({ ...s, chestQty: chestQtyForStage(s.stage) }));

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

const pathState = ref({ current_stage: 1, highest_stage: 0, total_victories: 0, rewards: [], max_stage: 15 });
const loading = ref(false);
const error = ref("");
const fightOpen = ref(false);
const fightStage = ref(null);
const victoryInfo = ref(null);
const chestOpening = ref(false);
const chestReveal = ref(null);
const tickNow = ref(Date.now());
let tickTimer = null;

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
    if (data) {
      pathState.value = {
        current_stage: Number(data.current_stage || 1),
        highest_stage: Number(data.highest_stage || 0),
        total_victories: Number(data.total_victories || 0),
        rewards: Array.isArray(data.rewards) ? data.rewards : [],
        max_stage: Number(data.max_stage || 15)
      };
    }
  } catch (e) {
    error.value = e?.message || tx("error");
  } finally {
    loading.value = false;
  }
}

const stageList = computed(() =>
  STAGES.map((s) => {
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
      boostMin: Number(result?.boost?.duration_minutes || 0)
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
    await new Promise((r) => setTimeout(r, 600));
    chestReveal.value = { phase: "reveal", species: Array.isArray(data?.species) ? data.species : [] };
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

    <div v-if="error" class="bp-error">{{ error }}</div>

    <Teleport to="body">
      <div v-if="chestReveal" class="bp-modal-overlay" @click.self="closeChestReveal">
        <div class="bp-modal">
          <div class="bp-chest" :class="['phase-' + chestReveal.phase]">
            <div v-if="chestReveal.phase === 'shake'" class="chest-shake">
              <div class="chest-icon">🎁</div>
              <div class="chest-sparks">
                <span>✨</span><span>⭐</span><span>💫</span><span>✨</span>
              </div>
            </div>
            <div v-else class="chest-reveal-body">
              <div class="chest-burst">🎉</div>
              <div class="chest-title">{{ tx("chestOpenedTitle") }}</div>
              <div class="chest-sub">{{ tx("chestOpenedSub") }}</div>
              <div class="chest-pets">
                <div v-for="(sp, i) in chestReveal.species" :key="i" class="chest-pet">
                  <span class="cp-emoji">{{ speciesInfo(sp).emoji }}</span>
                  <span class="cp-name">{{ speciesInfo(sp).name }}</span>
                </div>
              </div>
              <Button class="btn full" @click="closeChestReveal">{{ tx("awesome") }}</Button>
            </div>
          </div>
        </div>
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

.bp-chest {
  background: linear-gradient(135deg, #2a1d0e, #14130a);
  border: 2px solid rgba(255, 209, 102, 0.55);
  border-radius: 16px;
  padding: 26px;
  box-shadow: 0 0 0 6px rgba(255, 209, 102, 0.18), 0 16px 36px rgba(0, 0, 0, 0.65);
}
.chest-shake {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 220px;
}
.chest-icon {
  font-size: 120px;
  filter: drop-shadow(0 8px 18px rgba(255, 209, 102, 0.5));
  animation: chestShake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite;
}
@keyframes chestShake {
  0%, 100% { transform: translate(0, 0) rotate(0); }
  20% { transform: translate(-3px, -1px) rotate(-5deg); }
  40% { transform: translate(3px, -2px) rotate(5deg); }
  60% { transform: translate(-2px, 1px) rotate(-3deg); }
  80% { transform: translate(2px, 0) rotate(3deg); }
}
.chest-sparks {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.chest-sparks span {
  position: absolute;
  font-size: 22px;
  opacity: 0;
  animation: sparkFly 1.4s ease-out infinite;
}
.chest-sparks span:nth-child(1) { top: 12%; left: 22%; animation-delay: 0s; }
.chest-sparks span:nth-child(2) { top: 18%; right: 18%; animation-delay: 0.3s; }
.chest-sparks span:nth-child(3) { bottom: 22%; left: 26%; animation-delay: 0.6s; }
.chest-sparks span:nth-child(4) { bottom: 16%; right: 24%; animation-delay: 0.9s; }
@keyframes sparkFly {
  0% { opacity: 0; transform: scale(0.4); }
  40% { opacity: 1; transform: scale(1.2); }
  100% { opacity: 0; transform: scale(0.6) translate(0, -20px); }
}
.chest-reveal-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: center;
  text-align: center;
  animation: victoryPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.chest-burst {
  font-size: 64px;
  filter: drop-shadow(0 6px 14px rgba(255, 209, 102, 0.6));
}
.chest-title {
  font-size: 22px;
  font-weight: 900;
  background: linear-gradient(90deg, #ffd166, #ff476f);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.chest-sub {
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}
.chest-pets {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
  width: 100%;
}
.chest-pet {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  border-radius: 10px;
  background: rgba(255, 209, 102, 0.12);
  border: 1px solid rgba(255, 209, 102, 0.35);
  animation: petPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.chest-pet:nth-child(1) { animation-delay: 0.05s; }
.chest-pet:nth-child(2) { animation-delay: 0.15s; }
.chest-pet:nth-child(3) { animation-delay: 0.25s; }
.chest-pet:nth-child(4) { animation-delay: 0.35s; }
.chest-pet:nth-child(5) { animation-delay: 0.45s; }
@keyframes petPop {
  from { opacity: 0; transform: scale(0.5) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.cp-emoji {
  font-size: 38px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
}
.cp-name {
  font-size: 12px;
  font-weight: 800;
  color: var(--accent);
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
