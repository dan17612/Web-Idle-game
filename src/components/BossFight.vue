<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { SPECIES, formatCoins, speciesInfo } from "../animals";
import { locale } from "../i18n";
import { useGameStore } from "../stores/game";

const game = useGameStore();

const I18N = {
  de: {
    title: "👑 Bosskampf",
    hint: "Schiebe benachbarte Tiere und bilde Reihen aus 3 oder mehr gleichen Tieren. Jeder Treffer macht Schaden am Boss.",
    start: "Boss starten",
    restart: "Neu starten",
    reward: "Belohnung: 10x Boost für 10 Minuten",
    target: "Boss-Leben",
    score: "Punkte",
    time: "Zeit",
    noRoster: "Noch keine Tiere für den Bosskampf verfügbar.",
    chooseTile: "Wähle ein Tierfeld oder schiebe es.",
    noMatch: "Kein Treffer - versuch eine andere Reihe.",
    shuffled: "Keine Züge mehr - das Brett wurde gemischt.",
    victory: "Boss besiegt! 10x Boost läuft für 10 Minuten.",
    cooldown: "Boss-Boost läuft noch. Die nächste Belohnung gibt es später.",
    timeout: "Zeit abgelaufen. Starte den Boss erneut.",
    claiming: "Boost wird aktiviert...",
    combo: "Combo x{combo}",
    points: "+{points} Punkte",
    boosted: "Boss-Boost aktiv",
  },
  en: {
    title: "👑 Boss fight",
    hint: "Slide neighboring animals and build rows of 3 or more matching animals. Every match damages the boss.",
    start: "Start boss",
    restart: "Restart",
    reward: "Reward: 10x boost for 10 minutes",
    target: "Boss health",
    score: "Score",
    time: "Time",
    noRoster: "No animals available for the boss fight yet.",
    chooseTile: "Choose an animal tile or slide it.",
    noMatch: "No match - try another row.",
    shuffled: "No moves left - board shuffled.",
    victory: "Boss defeated! 10x boost runs for 10 minutes.",
    cooldown: "Boss boost is still running. The next reward comes later.",
    timeout: "Time is up. Start the boss again.",
    claiming: "Activating boost...",
    combo: "Combo x{combo}",
    points: "+{points} points",
    boosted: "Boss boost active",
  },
  ru: {
    title: "👑 Бой с боссом",
    hint: "Сдвигай соседних животных и собирай ряды из 3 или больше одинаковых животных. Каждый матч наносит урон боссу.",
    start: "Начать босса",
    restart: "Начать заново",
    reward: "Награда: 10x буст на 10 минут",
    target: "Здоровье босса",
    score: "Очки",
    time: "Время",
    noRoster: "Пока нет животных для боя с боссом.",
    chooseTile: "Выбери клетку или сдвинь её.",
    noMatch: "Нет совпадения - попробуй другой ряд.",
    shuffled: "Ходов больше нет - поле перемешано.",
    victory: "Босс побеждён! 10x буст активен на 10 минут.",
    cooldown: "Босс-буст ещё активен. Следующая награда будет позже.",
    timeout: "Время вышло. Запусти босса снова.",
    claiming: "Буст активируется...",
    combo: "Комбо x{combo}",
    points: "+{points} очков",
    boosted: "Босс-буст активен",
  },
};

function tx(key, vars = {}) {
  const dict = I18N[locale.value] || I18N.en;
  const text = String(dict[key] ?? I18N.en[key] ?? key);
  return text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

const BOSS_BOARD_SIZE = 7;
const BOSS_FIGHT_MS = 3 * 60 * 1000;
const BOSS_MIN_ROSTER = 5;
const SWAP_ANIMATION_MS = 180;

const now = ref(Date.now());
const bossBoard = ref([]);
const bossSelected = ref(null);
const bossMatched = ref(new Set());
const bossActive = ref(false);
const bossBusy = ref(false);
const bossScore = ref(0);
const bossTarget = ref(0);
const bossEndsAt = ref(0);
const bossMessage = ref("");
const bossMessageKind = ref("");
const bossRunRoster = ref([]);
const bossDrag = ref(null);
const bossSwap = ref(null);
let bossCellId = 0;
let bossMessageTimer = null;
let clockTimer = null;

onMounted(() => {
  clockTimer = setInterval(() => {
    now.value = Date.now();
  }, 250);
});

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer);
  if (bossMessageTimer) clearTimeout(bossMessageTimer);
});

const bossRoster = computed(() => {
  const ownedKeys = Array.from(new Set(game.animals.map((a) => a.species).filter(Boolean)));
  const catalogKeys = Object.values(SPECIES)
    .filter((s) => s.enabled !== false && s.shop_visible !== false)
    .map((s) => s.key)
    .filter(Boolean);
  const keys = ownedKeys.length >= BOSS_MIN_ROSTER ? ownedKeys : catalogKeys;
  return Array.from(new Set(keys))
    .map((key) => ({ key, info: speciesInfo(key) }))
    .filter((entry) => entry.info?.emoji && entry.info.emoji !== "❓")
    .slice(0, 9);
});

const bossCanStart = computed(() => bossRoster.value.length >= 3);
const bossLeader = computed(() => bossRunRoster.value[0] || bossRoster.value[0] || null);
const bossCells = computed(() =>
  bossBoard.value.map((cell, index) => ({
    ...cell,
    index,
    info: speciesInfo(cell.species),
  })),
);
const bossRemaining = computed(() => {
  void now.value;
  if (!bossActive.value) return 0;
  return Math.max(0, bossEndsAt.value - (Date.now() + game.serverOffset));
});
const boostRemaining = computed(() => {
  void now.value;
  return Math.max(0, game.petBoostUntil - (Date.now() + game.serverOffset));
});
const bossHp = computed(() => Math.max(0, bossTarget.value - bossScore.value));
const bossHealthPercent = computed(() =>
  bossTarget.value > 0 ? Math.max(0, Math.min(100, (bossHp.value / bossTarget.value) * 100)) : 100,
);

watch(bossRemaining, (remaining) => {
  if (bossActive.value && remaining <= 0 && bossHp.value > 0) finishBossTimeout();
});

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fmtTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function showBossMessage(key, kind = "", vars = {}, sticky = false) {
  if (bossMessageTimer) clearTimeout(bossMessageTimer);
  bossMessage.value = tx(key, vars);
  bossMessageKind.value = kind;
  if (!sticky) {
    bossMessageTimer = setTimeout(() => {
      bossMessage.value = "";
      bossMessageKind.value = "";
    }, 2200);
  }
}

function shuffled(list) {
  return list
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}

function randomBossSpecies() {
  const roster = bossRunRoster.value.length ? bossRunRoster.value : bossRoster.value;
  return roster[Math.floor(Math.random() * roster.length)]?.key || "chick";
}

function wouldCreateBossLine(board, index, species) {
  const row = Math.floor(index / BOSS_BOARD_SIZE);
  const col = index % BOSS_BOARD_SIZE;
  if (col >= 2 && board[index - 1]?.species === species && board[index - 2]?.species === species) return true;
  if (
    row >= 2 &&
    board[index - BOSS_BOARD_SIZE]?.species === species &&
    board[index - BOSS_BOARD_SIZE * 2]?.species === species
  ) return true;
  return false;
}

function makeBossCell(board = [], index = 0) {
  let species = randomBossSpecies();
  for (let i = 0; i < 20; i++) {
    species = randomBossSpecies();
    if (!wouldCreateBossLine(board, index, species)) break;
  }
  return { id: ++bossCellId, species };
}

function createBossBoard() {
  let board = [];
  for (let attempt = 0; attempt < 30; attempt++) {
    board = [];
    for (let i = 0; i < BOSS_BOARD_SIZE * BOSS_BOARD_SIZE; i++) board.push(makeBossCell(board, i));
    if (hasBossMove(board)) return board;
  }
  return board;
}

function bossTargetPoints() {
  const rosterBonus = bossRoster.value.length * 80;
  const rateBonus = Math.min(800, Math.floor(Math.max(0, game.baseRate) * 15));
  return 1000 + rosterBonus + rateBonus;
}

function startBossFight() {
  if (!bossCanStart.value || bossBusy.value) {
    showBossMessage("noRoster", "error");
    return;
  }
  bossRunRoster.value = shuffled(bossRoster.value).slice(0, Math.min(7, bossRoster.value.length));
  bossScore.value = 0;
  bossTarget.value = bossTargetPoints();
  bossEndsAt.value = Date.now() + game.serverOffset + BOSS_FIGHT_MS;
  bossSelected.value = null;
  bossMatched.value = new Set();
  bossDrag.value = null;
  bossSwap.value = null;
  bossBoard.value = createBossBoard();
  bossActive.value = true;
  bossBusy.value = false;
  showBossMessage("chooseTile");
}

function bossDragTarget(index, dx, dy) {
  const threshold = 18;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return null;
  const row = Math.floor(index / BOSS_BOARD_SIZE);
  const col = index % BOSS_BOARD_SIZE;
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0 && col < BOSS_BOARD_SIZE - 1) return index + 1;
    if (dx < 0 && col > 0) return index - 1;
    return null;
  }
  if (dy > 0 && row < BOSS_BOARD_SIZE - 1) return index + BOSS_BOARD_SIZE;
  if (dy < 0 && row > 0) return index - BOSS_BOARD_SIZE;
  return null;
}

function startBossDrag(index, event) {
  if (!bossActive.value || bossBusy.value) return;
  bossDrag.value = { index, x: event.clientX, y: event.clientY, dx: 0, dy: 0 };
  event.currentTarget?.setPointerCapture?.(event.pointerId);
}

function moveBossDrag(event) {
  if (!bossDrag.value || bossBusy.value) return;
  bossDrag.value = {
    ...bossDrag.value,
    dx: event.clientX - bossDrag.value.x,
    dy: event.clientY - bossDrag.value.y,
  };
}

async function finishBossDrag(index, event) {
  const drag = bossDrag.value;
  if (!drag || !bossActive.value || bossBusy.value) return;
  bossDrag.value = null;
  const targetEl = event.currentTarget;
  if (targetEl?.hasPointerCapture?.(event.pointerId)) {
    targetEl.releasePointerCapture(event.pointerId);
  }
  const target = bossDragTarget(drag.index, event.clientX - drag.x, event.clientY - drag.y);
  if (target == null) {
    await pickBossCell(index);
    return;
  }
  bossSelected.value = null;
  await resolveBossSwap(drag.index, target);
}

function cancelBossDrag() {
  bossDrag.value = null;
}

function bossSwapTransform(index) {
  const swap = bossSwap.value;
  if (!swap) return "";
  const delta = swap.to - swap.from;
  if (index === swap.from) {
    if (delta === 1) return "translateX(calc(100% + var(--boss-gap)))";
    if (delta === -1) return "translateX(calc(-100% - var(--boss-gap)))";
    if (delta === BOSS_BOARD_SIZE) return "translateY(calc(100% + var(--boss-gap)))";
    if (delta === -BOSS_BOARD_SIZE) return "translateY(calc(-100% - var(--boss-gap)))";
  }
  if (index === swap.to) {
    if (delta === 1) return "translateX(calc(-100% - var(--boss-gap)))";
    if (delta === -1) return "translateX(calc(100% + var(--boss-gap)))";
    if (delta === BOSS_BOARD_SIZE) return "translateY(calc(-100% - var(--boss-gap)))";
    if (delta === -BOSS_BOARD_SIZE) return "translateY(calc(100% + var(--boss-gap)))";
  }
  return "";
}

function bossTileStyle(index) {
  const drag = bossDrag.value;
  if (drag?.index === index) {
    const dx = Math.max(-46, Math.min(46, drag.dx || 0));
    const dy = Math.max(-46, Math.min(46, drag.dy || 0));
    return {
      transform: `translate(${dx}px, ${dy}px) scale(1.04)`,
      transition: "none",
      zIndex: 3,
    };
  }
  const transform = bossSwapTransform(index);
  return transform ? { transform, zIndex: 2 } : null;
}

function areBossNeighbors(a, b) {
  const ar = Math.floor(a / BOSS_BOARD_SIZE);
  const ac = a % BOSS_BOARD_SIZE;
  const br = Math.floor(b / BOSS_BOARD_SIZE);
  const bc = b % BOSS_BOARD_SIZE;
  return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
}

async function pickBossCell(index) {
  if (!bossActive.value || bossBusy.value) return;
  if (bossSelected.value == null) {
    bossSelected.value = index;
    return;
  }
  if (bossSelected.value === index) {
    bossSelected.value = null;
    return;
  }
  if (!areBossNeighbors(bossSelected.value, index)) {
    bossSelected.value = index;
    return;
  }
  const from = bossSelected.value;
  bossSelected.value = null;
  await resolveBossSwap(from, index);
}

function swappedBossBoard(board, a, b) {
  const next = board.slice();
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

async function animateBossSwap(from, to) {
  bossSwap.value = { from, to };
  await wait(SWAP_ANIMATION_MS);
  bossBoard.value = swappedBossBoard(bossBoard.value, from, to);
  await nextTick();
  bossSwap.value = null;
  await wait(35);
}

async function resolveBossSwap(from, to) {
  if (!areBossNeighbors(from, to)) return;
  bossBusy.value = true;
  bossDrag.value = null;
  bossSelected.value = null;

  await animateBossSwap(from, to);
  const swapped = bossBoard.value.slice();

  if (findBossMatches(swapped).size === 0) {
    await animateBossSwap(from, to);
    showBossMessage("noMatch", "error");
    bossBusy.value = false;
    return;
  }

  const result = await settleBossBoard();
  if (result.points > 0) {
    bossScore.value += result.points;
    showBossMessage(
      result.combo > 1 ? "combo" : "points",
      "success",
      { combo: result.combo, points: result.points },
    );
  }

  if (bossHp.value <= 0) {
    await finishBossVictory();
  } else if (!hasBossMove(bossBoard.value)) {
    bossBoard.value = createBossBoard();
    showBossMessage("shuffled");
  }
  bossBusy.value = false;
}

async function settleBossBoard() {
  let points = 0;
  let combo = 0;
  let board = bossBoard.value.slice();

  while (true) {
    const matches = findBossMatches(board);
    if (matches.size === 0) break;
    combo += 1;
    bossMatched.value = matches;
    points += matches.size * 10 * combo;
    await wait(170);
    board = collapseBossBoard(board, matches);
    bossBoard.value = board;
    bossMatched.value = new Set();
    await wait(230);
  }

  return { points, combo };
}

function findBossMatches(board) {
  const matches = new Set();
  for (let row = 0; row < BOSS_BOARD_SIZE; row++) {
    let start = 0;
    while (start < BOSS_BOARD_SIZE) {
      const species = board[row * BOSS_BOARD_SIZE + start]?.species;
      let end = start + 1;
      while (end < BOSS_BOARD_SIZE && board[row * BOSS_BOARD_SIZE + end]?.species === species) end++;
      if (species && end - start >= 3) {
        for (let col = start; col < end; col++) matches.add(row * BOSS_BOARD_SIZE + col);
      }
      start = end;
    }
  }

  for (let col = 0; col < BOSS_BOARD_SIZE; col++) {
    let start = 0;
    while (start < BOSS_BOARD_SIZE) {
      const species = board[start * BOSS_BOARD_SIZE + col]?.species;
      let end = start + 1;
      while (end < BOSS_BOARD_SIZE && board[end * BOSS_BOARD_SIZE + col]?.species === species) end++;
      if (species && end - start >= 3) {
        for (let row = start; row < end; row++) matches.add(row * BOSS_BOARD_SIZE + col);
      }
      start = end;
    }
  }
  return matches;
}

function collapseBossBoard(board, matches) {
  const next = Array(BOSS_BOARD_SIZE * BOSS_BOARD_SIZE);
  for (let col = 0; col < BOSS_BOARD_SIZE; col++) {
    let writeRow = BOSS_BOARD_SIZE - 1;
    for (let row = BOSS_BOARD_SIZE - 1; row >= 0; row--) {
      const index = row * BOSS_BOARD_SIZE + col;
      if (matches.has(index)) continue;
      next[writeRow * BOSS_BOARD_SIZE + col] = board[index];
      writeRow--;
    }
    while (writeRow >= 0) {
      const index = writeRow * BOSS_BOARD_SIZE + col;
      next[index] = makeBossCell(next, index);
      writeRow--;
    }
  }
  return next;
}

function hasBossMove(board) {
  for (let i = 0; i < board.length; i++) {
    const row = Math.floor(i / BOSS_BOARD_SIZE);
    const col = i % BOSS_BOARD_SIZE;
    const neighbors = [];
    if (col < BOSS_BOARD_SIZE - 1) neighbors.push(i + 1);
    if (row < BOSS_BOARD_SIZE - 1) neighbors.push(i + BOSS_BOARD_SIZE);
    for (const n of neighbors) {
      if (findBossMatches(swappedBossBoard(board, i, n)).size > 0) return true;
    }
  }
  return false;
}

async function finishBossVictory() {
  bossActive.value = false;
  showBossMessage("claiming", "success", {}, true);
  try {
    await game.claimBossBoost(bossScore.value, bossTarget.value);
    showBossMessage("victory", "success", {}, true);
  } catch (e) {
    bossMessage.value = /cooldown/i.test(e.message || "") ? tx("cooldown") : e.message;
    bossMessageKind.value = "error";
  }
}

function finishBossTimeout() {
  bossActive.value = false;
  bossBusy.value = false;
  bossSelected.value = null;
  bossDrag.value = null;
  bossSwap.value = null;
  showBossMessage("timeout", "error", {}, true);
}
</script>

<template>
  <div class="card boss-card boss-arena">
    <div class="boss-head">
      <div class="boss-face">
        <span class="boss-crown">👑</span>
        <span>{{ bossLeader?.info.emoji || "🐾" }}</span>
      </div>
      <div class="boss-main">
        <div class="boss-title-row">
          <div>
            <div class="boss-title">{{ tx("title") }}</div>
            <div class="boss-sub">{{ tx("reward") }}</div>
          </div>
          <Button
            class="btn small"
            :disabled="bossBusy || !bossCanStart"
            @click="startBossFight"
          >
            {{ bossBoard.length ? tx("restart") : tx("start") }}
          </Button>
        </div>
        <div class="boss-health">
          <span :style="{ width: bossHealthPercent + '%' }"></span>
        </div>
        <div class="boss-stats">
          <span>{{ tx("target") }}: {{ formatCoins(bossHp) }}</span>
          <span>{{ tx("score") }}: {{ formatCoins(bossScore) }}</span>
          <span>{{ tx("time") }}: {{ bossActive ? fmtTime(bossRemaining) : "03:00" }}</span>
        </div>
      </div>
    </div>

    <p class="hint boss-hint">{{ tx("hint") }}</p>

    <div v-if="game.bossBoostActive" class="boss-reward-live">
      {{ tx("boosted") }} · ×{{ game.petBoostMultiplier }} · {{ fmtTime(boostRemaining) }}
    </div>

    <div
      v-if="bossMessage"
      class="boss-message"
      :class="bossMessageKind"
    >
      {{ bossMessage }}
    </div>

    <div v-if="!bossCanStart" class="hint boss-empty">
      {{ tx("noRoster") }}
    </div>

    <div v-else class="boss-board-wrap">
      <TransitionGroup
        v-if="bossBoard.length"
        name="boss-cell"
        tag="div"
        class="boss-board"
        :class="{ paused: !bossActive, busy: bossBusy }"
      >
        <Button
          v-for="cell in bossCells"
          :key="cell.id"
          class="boss-tile"
          :class="{
            selected: bossSelected === cell.index,
            matched: bossMatched.has(cell.index),
            dragging: bossDrag?.index === cell.index,
            swapping: !!bossSwap && (bossSwap.from === cell.index || bossSwap.to === cell.index),
          }"
          :style="bossTileStyle(cell.index)"
          :disabled="!bossActive || bossBusy"
          @pointerdown="startBossDrag(cell.index, $event)"
          @pointermove="moveBossDrag"
          @pointerup="finishBossDrag(cell.index, $event)"
          @pointercancel="cancelBossDrag"
        >
          <span class="boss-tile-emoji">{{ cell.info.emoji }}</span>
        </Button>
      </TransitionGroup>

      <Button
        v-else
        class="boss-start-btn"
        :disabled="!bossCanStart"
        @click="startBossFight"
      >
        <span class="boss-start-icon">👑</span>
        <span>{{ tx("start") }}</span>
      </Button>
    </div>
  </div>
</template>

<style scoped>
.boss-card {
  border-color: rgba(255, 209, 102, 0.2);
}
.boss-arena {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background:
    linear-gradient(135deg, rgba(255, 71, 126, 0.12), rgba(6, 214, 160, 0.08)),
    var(--card);
}
.boss-head {
  display: flex;
  gap: 12px;
  align-items: stretch;
}
.boss-face {
  position: relative;
  width: 82px;
  min-height: 82px;
  border-radius: 14px;
  background: radial-gradient(circle at 35% 30%, rgba(255, 209, 102, 0.28), rgba(255, 71, 126, 0.16) 52%, #162048);
  border: 1px solid rgba(255, 209, 102, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 46px;
  overflow: hidden;
}
.boss-crown {
  position: absolute;
  top: 3px;
  right: 5px;
  font-size: 20px;
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.45));
}
.boss-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.boss-title-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}
.boss-title {
  font-size: 18px;
  font-weight: 800;
}
.boss-sub {
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  margin-top: 2px;
}
.boss-health {
  height: 14px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  border-radius: 999px;
  overflow: hidden;
}
.boss-health span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #ef476f, #ff9f1c);
  transition: width 0.2s ease;
}
.boss-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.boss-hint {
  margin: 0;
}
.boss-reward-live,
.boss-message {
  border-radius: 12px;
  padding: 9px 10px;
  text-align: center;
  font-size: 12px;
  font-weight: 800;
}
.boss-reward-live {
  background: rgba(6, 214, 160, 0.16);
  color: var(--accent-2);
  border: 1px solid rgba(6, 214, 160, 0.35);
}
.boss-message {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border);
  color: var(--muted);
}
.boss-message.success {
  background: rgba(6, 214, 160, 0.14);
  border-color: rgba(6, 214, 160, 0.35);
  color: var(--accent-2);
}
.boss-message.error {
  background: rgba(239, 71, 111, 0.12);
  border-color: rgba(239, 71, 111, 0.35);
  color: var(--danger);
}
.boss-empty {
  text-align: center;
  padding: 12px;
}
.boss-board-wrap {
  display: flex;
  justify-content: center;
}
.boss-board {
  --boss-gap: 5px;
  position: relative;
  width: min(100%, 430px);
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--boss-gap);
  aspect-ratio: 1;
}
.boss-board.paused {
  opacity: 0.82;
}
.boss-board.busy .boss-tile {
  cursor: wait;
}
.boss-tile {
  min-width: 0;
  min-height: 0;
  padding: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, #22305a, #162048);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: clamp(22px, 8vw, 34px);
  line-height: 1;
  display: grid;
  place-items: center;
  cursor: grab;
  touch-action: none;
  user-select: none;
  transition:
    transform 0.18s cubic-bezier(0.2, 0.9, 0.2, 1),
    border-color 0.12s ease,
    background 0.12s ease,
    opacity 0.12s ease;
}
.boss-tile:active {
  cursor: grabbing;
}
.boss-tile:not(:disabled):hover,
.boss-tile.selected {
  border-color: var(--accent);
  background: linear-gradient(135deg, #314174, #1c2a58);
  transform: translateY(-1px);
}
.boss-tile.dragging {
  border-color: var(--accent-2);
  background: linear-gradient(135deg, #1f4d5c, #1c2a58);
}
.boss-tile.swapping {
  border-color: rgba(255, 209, 102, 0.65);
  box-shadow: 0 10px 26px rgba(255, 209, 102, 0.18);
}
.boss-tile.matched {
  background: linear-gradient(135deg, #ffd166, #06d6a0);
  color: #0b1220;
  transform: scale(0.88);
  opacity: 0.65;
}
.boss-tile-emoji {
  display: block;
  pointer-events: none;
  filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.35));
}
.boss-cell-move {
  transition: transform 0.24s cubic-bezier(0.2, 0.9, 0.2, 1);
}
.boss-cell-enter-active {
  animation: bossDrop 0.26s ease both;
}
.boss-cell-leave-active {
  position: absolute;
  pointer-events: none;
}
.boss-cell-leave-to {
  opacity: 0;
  transform: scale(0.55);
}
@keyframes bossDrop {
  from {
    opacity: 0;
    transform: translateY(-18px) scale(0.82);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.boss-start-btn {
  width: min(100%, 360px);
  min-height: 190px;
  border-radius: 14px;
  border: 1px dashed rgba(255, 209, 102, 0.45);
  background: linear-gradient(135deg, rgba(255, 209, 102, 0.14), rgba(255, 71, 126, 0.14));
  color: inherit;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  cursor: pointer;
}
.boss-start-icon {
  font-size: 52px;
  line-height: 1;
}
@media (max-width: 520px) {
  .boss-head {
    flex-direction: column;
  }
  .boss-face {
    width: 100%;
    min-height: 74px;
  }
  .boss-title-row {
    align-items: stretch;
    flex-direction: column;
  }
  .boss-stats {
    grid-template-columns: 1fr;
  }
  .boss-board {
    --boss-gap: 4px;
  }
  .boss-tile {
    border-radius: 8px;
  }
}
</style>
