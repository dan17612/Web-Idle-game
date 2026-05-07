<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { supabase } from "../supabase";
import { formatCoins, speciesInfo } from "../animals";
import { locale } from "../i18n";
import { useGameStore } from "../stores/game";
import { useAppToast } from "../composables/useAppToast";
import BossFight from "../components/BossFight.vue";
import { useReturnRefresh } from "../composables/useReturnRefresh";

const game = useGameStore();
const appToast = useAppToast();

const I18N = {
  de: {
    headline: "⏱️ Endlessboss",
    sub: "3 Minuten Schaden sammeln. Dein bester Run zählt für die Bestenliste.",
    rules: "Regeln",
    rule1: "🕒 3 Minuten pro Versuch",
    rule2: "💥 Schaden = Treffer im Match-3-Brett",
    rule3: "⏳ 1 Stunde Cooldown nach jedem Versuch",
    rule4: "🪙 1% des Schadens als Münzen-Belohnung",
    rule5: "🎁 Truhe ab 100k Schaden (3 Tiere ab 1M Schaden)",
    bestRun: "Dein Bestwert",
    none: "Noch kein Versuch",
    cooldownActive: "Cooldown läuft - nächster Versuch in {time}",
    eventEnded: "Endlessboss-Modus ist deaktiviert.",
    start: "⚔️ Versuch starten",
    starting: "Starte...",
    runActive: "Versuch läuft - viel Erfolg!",
    finishedTitle: "🏁 Versuch beendet",
    yourDamage: "Dein Schaden",
    coinsEarned: "+{coins} 🪙 erhalten",
    chestEarned: "🎁 Truhe mit {qty} Tier(en) erhalten",
    newBest: "🏆 Neuer Bestwert!",
    close: "Schließen",
    loading: "Lade...",
    leaderboardTitle: "🏆 Top 10",
    leaderboardEmpty: "Noch keine Einträge."
  },
  en: {
    headline: "⏱️ Endless Boss",
    sub: "Deal damage for 3 minutes. Your best run counts for the leaderboard.",
    rules: "Rules",
    rule1: "🕒 3 minutes per attempt",
    rule2: "💥 Damage = matches on the match-3 board",
    rule3: "⏳ 1 hour cooldown after each attempt",
    rule4: "🪙 1% of damage as coin reward",
    rule5: "🎁 Chest from 100k damage (3 animals from 1M damage)",
    bestRun: "Your best",
    none: "No attempts yet",
    cooldownActive: "Cooldown active - next attempt in {time}",
    eventEnded: "Endless boss mode is disabled.",
    start: "⚔️ Start attempt",
    starting: "Starting...",
    runActive: "Run active - good luck!",
    finishedTitle: "🏁 Run finished",
    yourDamage: "Your damage",
    coinsEarned: "+{coins} 🪙 earned",
    chestEarned: "🎁 Chest with {qty} animal(s)",
    newBest: "🏆 New best!",
    close: "Close",
    loading: "Loading...",
    leaderboardTitle: "🏆 Top 10",
    leaderboardEmpty: "No entries yet."
  },
  ru: {
    headline: "⏱️ Эндлесс-босс",
    sub: "Наноси урон 3 минуты. Лучший результат идёт в таблицу лидеров.",
    rules: "Правила",
    rule1: "🕒 3 минуты на попытку",
    rule2: "💥 Урон = совпадения на поле",
    rule3: "⏳ 1 час кулдаун после каждой попытки",
    rule4: "🪙 1% урона как награда монетами",
    rule5: "🎁 Сундук от 100k урона (3 животных от 1M)",
    bestRun: "Твой рекорд",
    none: "Попыток ещё нет",
    cooldownActive: "Кулдаун - следующая попытка через {time}",
    eventEnded: "Режим эндлесс-босса отключён.",
    start: "⚔️ Начать попытку",
    starting: "Запуск...",
    runActive: "Бой идёт - удачи!",
    finishedTitle: "🏁 Попытка завершена",
    yourDamage: "Твой урон",
    coinsEarned: "+{coins} 🪙 получено",
    chestEarned: "🎁 Сундук с {qty} жив.",
    newBest: "🏆 Новый рекорд!",
    close: "Закрыть",
    loading: "Загрузка...",
    leaderboardTitle: "🏆 Топ-10",
    leaderboardEmpty: "Пока пусто."
  }
};

function tx(key, vars = {}) {
  const dict = I18N[locale.value] || I18N.en;
  const text = String(dict[key] ?? I18N.en[key] ?? key);
  return text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

const status = ref(null);
const loading = ref(true);
const starting = ref(false);
const activeRun = ref(null);
const lastResult = ref(null);
const tickNow = ref(Date.now());
const leaderboard = ref([]);
let tickTimer = null;

const cooldownRemaining = computed(() => {
  void tickNow.value;
  if (!status.value?.cooldown_until) return 0;
  return Math.max(0, new Date(status.value.cooldown_until).getTime() - Date.now());
});
const eventActive = computed(() => status.value?.event_active !== false);
const canStart = computed(
  () => eventActive.value && !activeRun.value && cooldownRemaining.value <= 0
);
const endlessEndsAt = computed(() =>
  activeRun.value?.ends_at ? new Date(activeRun.value.ends_at).getTime() : 0
);

function fmt(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return `${h}h ${rest}m`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function loadStatus() {
  loading.value = true;
  try {
    const { data, error } = await supabase.rpc("boss_endless_status");
    if (error) throw error;
    status.value = data || null;
    activeRun.value = data?.active_run || null;
  } catch (e) {
    appToast.err(e?.message || "load failed");
  } finally {
    loading.value = false;
  }
}

async function loadLeaderboard() {
  try {
    const { data, error } = await supabase.rpc("get_boss_endless_leaderboard", { p_limit: 10 });
    if (error) throw error;
    leaderboard.value = data || [];
  } catch {
    leaderboard.value = [];
  }
}

async function startRun() {
  if (!canStart.value || starting.value) return;
  starting.value = true;
  try {
    const { data, error } = await supabase.rpc("boss_endless_start");
    if (error) throw error;
    activeRun.value = {
      id: data.id,
      started_at: data.started_at,
      ends_at: data.ends_at
    };
    lastResult.value = null;
    await loadStatus();
  } catch (e) {
    appToast.err(e?.message || "start failed");
  } finally {
    starting.value = false;
  }
}

async function onEndlessFinish({ damage, runId }) {
  if (!runId) return;
  try {
    const { data, error } = await supabase.rpc("boss_endless_finish", {
      p_run_id: runId,
      p_damage: Math.max(0, Math.floor(damage || 0))
    });
    if (error) throw error;
    const previousBest = Number(status.value?.best?.damage || 0);
    const newDamage = Number(data?.damage || 0);
    lastResult.value = {
      damage: newDamage,
      coins: Number(data?.coins_reward || 0),
      chest_qty: Number(data?.chest_qty || 0),
      chest_species: Array.isArray(data?.chest_species) ? data.chest_species : [],
      newBest: newDamage > previousBest
    };
    activeRun.value = null;
    if (Number(data?.coins) > 0) game.coins = Number(data.coins);
    await Promise.all([loadStatus(), loadLeaderboard(), game.load().catch(() => {})]);
  } catch (e) {
    appToast.err(e?.message || "finish failed");
    activeRun.value = null;
    await loadStatus();
  }
}

function dismissResult() {
  lastResult.value = null;
}

useReturnRefresh(() => Promise.all([loadStatus(), loadLeaderboard()]));

onMounted(async () => {
  tickTimer = setInterval(() => {
    if (document.visibilityState !== "visible") return;
    tickNow.value = Date.now();
  }, 1000);
  await Promise.all([loadStatus(), loadLeaderboard()]);
});

onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer);
});
</script>

<template>
  <div class="endless-view">
    <section class="card eb-hero" :class="{ inactive: !eventActive }">
      <div class="eb-hero-left">
        <div class="eb-hero-icon">⏱️</div>
        <div class="eb-hero-text">
          <div class="eb-hero-title">{{ tx("headline") }}</div>
          <div class="eb-hero-sub">{{ tx("sub") }}</div>
        </div>
      </div>
      <div class="eb-best">
        <div class="eb-best-label">{{ tx("bestRun") }}</div>
        <div class="eb-best-value">
          <template v-if="status?.best?.damage">💥 {{ formatCoins(status.best.damage) }}</template>
          <template v-else>{{ tx("none") }}</template>
        </div>
      </div>
    </section>

    <div v-if="loading" class="card eb-state">
      <i class="pi pi-spin pi-spinner"></i>
      <span>{{ tx("loading") }}</span>
    </div>

    <template v-else>
      <section v-if="!activeRun" class="card eb-rules">
        <div class="eb-rules-title">{{ tx("rules") }}</div>
        <ul>
          <li>{{ tx("rule1") }}</li>
          <li>{{ tx("rule2") }}</li>
          <li>{{ tx("rule3") }}</li>
          <li>{{ tx("rule4") }}</li>
          <li>{{ tx("rule5") }}</li>
        </ul>
        <div v-if="!eventActive" class="eb-warn">⏰ {{ tx("eventEnded") }}</div>
        <div v-else-if="cooldownRemaining > 0" class="eb-warn cooldown">
          ⏳ {{ tx("cooldownActive", { time: fmt(cooldownRemaining) }) }}
        </div>
        <Button
          class="btn full eb-start"
          :disabled="!canStart || starting"
          @click="startRun"
        >
          <template v-if="starting">{{ tx("starting") }}</template>
          <template v-else>{{ tx("start") }}</template>
        </Button>
      </section>

      <section v-else class="eb-fight">
        <div class="eb-active-banner">⚔️ {{ tx("runActive") }}</div>
        <BossFight
          :endless-mode="true"
          :endless-run-id="activeRun.id"
          :endless-ends-at="endlessEndsAt"
          :auto-start="true"
          @endless-finish="onEndlessFinish"
        />
      </section>

      <section class="card eb-leaderboard">
        <div class="eb-lb-title">{{ tx("leaderboardTitle") }}</div>
        <div v-if="!leaderboard.length" class="eb-lb-empty">{{ tx("leaderboardEmpty") }}</div>
        <div v-else class="eb-lb-list">
          <div
            v-for="(row, i) in leaderboard"
            :key="row.username + i"
            class="eb-lb-row"
          >
            <span class="eb-lb-rank">
              <template v-if="i === 0">🥇</template>
              <template v-else-if="i === 1">🥈</template>
              <template v-else-if="i === 2">🥉</template>
              <template v-else>{{ i + 1 }}</template>
            </span>
            <span class="eb-lb-avatar">{{ row.avatar_emoji || "👤" }}</span>
            <span class="eb-lb-name">{{ row.username }}</span>
            <span class="eb-lb-damage">💥 {{ formatCoins(row.damage) }}</span>
          </div>
        </div>
      </section>
    </template>

    <Teleport to="body">
      <div v-if="lastResult" class="eb-result-modal" @click.self="dismissResult">
        <div class="eb-result-card">
          <div class="eb-result-icon">{{ lastResult.newBest ? "🏆" : "🏁" }}</div>
          <div class="eb-result-title">{{ tx("finishedTitle") }}</div>
          <div v-if="lastResult.newBest" class="eb-result-best">{{ tx("newBest") }}</div>
          <div class="eb-result-damage">
            <span class="eb-result-label">{{ tx("yourDamage") }}</span>
            <span class="eb-result-value">💥 {{ formatCoins(lastResult.damage) }}</span>
          </div>
          <div v-if="lastResult.coins > 0" class="eb-result-reward">
            {{ tx("coinsEarned", { coins: formatCoins(lastResult.coins) }) }}
          </div>
          <div v-if="lastResult.chest_qty > 0" class="eb-result-reward">
            {{ tx("chestEarned", { qty: lastResult.chest_qty }) }}
            <div class="eb-result-species">
              <span
                v-for="(sp, i) in lastResult.chest_species"
                :key="sp + i"
                class="eb-result-pill"
              >{{ speciesInfo(sp).emoji || "🐾" }} {{ speciesInfo(sp).name }}</span>
            </div>
          </div>
          <Button class="btn full" @click="dismissResult">{{ tx("close") }}</Button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.endless-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.eb-hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  background:
    radial-gradient(circle at 0% 0%, rgba(168, 85, 247, 0.18), transparent 55%),
    radial-gradient(circle at 100% 100%, rgba(255, 209, 102, 0.15), transparent 60%),
    linear-gradient(135deg, #1a1f3e, #0d1230);
  border-color: rgba(168, 85, 247, 0.4);
}
.eb-hero.inactive {
  filter: grayscale(0.6);
  opacity: 0.85;
}
.eb-hero-left { display: flex; gap: 12px; min-width: 0; align-items: center; }
.eb-hero-icon {
  font-size: 38px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.45));
  flex-shrink: 0;
}
.eb-hero-text { min-width: 0; }
.eb-hero-title {
  font-weight: 900;
  font-size: 18px;
  background: linear-gradient(90deg, #ffd166, #a855f7);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.eb-hero-sub {
  margin-top: 2px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
}
.eb-best {
  flex-shrink: 0;
  text-align: right;
  padding-left: 8px;
  border-left: 1px solid var(--border);
}
.eb-best-label {
  color: var(--muted);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.eb-best-value {
  font-weight: 900;
  font-size: 18px;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.eb-state {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  padding: 24px;
  color: var(--muted);
  font-weight: 800;
}
.eb-rules {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.eb-rules-title {
  font-weight: 900;
  font-size: 15px;
}
.eb-rules ul {
  margin: 0;
  padding-left: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.eb-rules li {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}
.eb-warn {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(239, 71, 111, 0.16);
  border: 1px solid rgba(239, 71, 111, 0.45);
  color: #ef476f;
  font-weight: 800;
  font-size: 13px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.eb-warn.cooldown {
  background: rgba(72, 202, 228, 0.16);
  border-color: rgba(72, 202, 228, 0.45);
  color: #48cae4;
}
.eb-start {
  background: linear-gradient(135deg, #ffd166, #a855f7);
  color: #1a0b2e;
  font-weight: 900;
}
.eb-fight {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.eb-active-banner {
  text-align: center;
  font-weight: 900;
  font-size: 13px;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(6, 214, 160, 0.16);
  border: 1px solid rgba(6, 214, 160, 0.4);
  color: var(--accent-2);
}
.eb-leaderboard {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.eb-lb-title {
  font-weight: 900;
  font-size: 15px;
}
.eb-lb-empty {
  color: var(--muted);
  font-size: 13px;
  text-align: center;
  padding: 12px;
}
.eb-lb-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.eb-lb-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  font-size: 13px;
}
.eb-lb-rank {
  width: 26px;
  text-align: center;
  font-weight: 900;
}
.eb-lb-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #162048;
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}
.eb-lb-name {
  flex: 1;
  font-weight: 700;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.eb-lb-damage {
  font-weight: 900;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.eb-result-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
  backdrop-filter: blur(6px);
}
.eb-result-card {
  width: min(380px, 100%);
  background: linear-gradient(135deg, #1c2452, #0d1130);
  border: 2px solid rgba(255, 209, 102, 0.6);
  border-radius: 18px;
  padding: 22px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
}
.eb-result-icon {
  font-size: 56px;
  filter: drop-shadow(0 4px 12px rgba(255, 209, 102, 0.5));
}
.eb-result-title {
  font-weight: 900;
  font-size: 20px;
}
.eb-result-best {
  font-weight: 900;
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(255, 209, 102, 0.2);
  border: 1px solid rgba(255, 209, 102, 0.55);
  color: var(--accent);
  align-self: center;
}
.eb-result-damage {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
}
.eb-result-label {
  font-size: 11px;
  font-weight: 800;
  color: var(--muted);
  text-transform: uppercase;
}
.eb-result-value {
  font-size: 24px;
  font-weight: 900;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.eb-result-reward {
  font-size: 13px;
  font-weight: 800;
}
.eb-result-species {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
}
.eb-result-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border);
}
@media (max-width: 480px) {
  .eb-hero { flex-direction: column; align-items: stretch; gap: 8px; }
  .eb-best { text-align: left; padding: 8px 0 0; border-left: none; border-top: 1px solid var(--border); }
}
</style>
