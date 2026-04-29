<script setup>
import { onMounted, onUnmounted, computed, ref, watch } from "vue";
import { useAuthStore } from "./stores/auth";
import { useGameStore } from "./stores/game";
import { useRoute } from "vue-router";
import { SpeedInsights } from "@vercel/speed-insights/vue";
import { supabase } from "./supabase";
import { formatCoins, speciesInfo, tierInfo } from "./animals";
import AdminModal from "./components/AdminModal.vue";
import TutorialBubble from "./components/TutorialBubble.vue";
import { t } from "./i18n";

const adminOpen = ref(false);

function formatDuration(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

const auth = useAuthStore();
const game = useGameStore();
const route = useRoute();

const STALE_MS = 90_000; // 90s – Route-Wechsel: nur neu laden, wenn lange nicht aktualisiert.
const RETURN_THROTTLE_MS = 4_000; // Tab/Fokus-Rückkehr: max alle 4s erneut laden.

function refreshIfStale() {
  if (!auth.isAuth || game.loading) return;
  if (Date.now() - game.lastLoadedAt > STALE_MS) {
    game.load().catch(() => {});
  }
}

function refreshOnReturn() {
  if (!auth.isAuth || game.loading) return;
  if (Date.now() - game.lastLoadedAt < RETURN_THROTTLE_MS) return;
  game.load().catch(() => {});
}

const broadcast = ref(null);
let broadcastTimer = null;
let broadcastChannel = null;

function showBroadcast(msg) {
  broadcast.value = { id: Date.now(), text: msg };
  if (broadcastTimer) clearTimeout(broadcastTimer);
  broadcastTimer = setTimeout(() => {
    broadcast.value = null;
  }, 6000);
}

function subscribeBroadcasts() {
  if (broadcastChannel) {
    supabase.removeChannel(broadcastChannel);
    broadcastChannel = null;
  }
  if (!auth.isAuth) return;
  broadcastChannel = supabase
    .channel("broadcasts")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "broadcasts" },
      (payload) => {
        const msg = payload.new?.message;
        if (msg) showBroadcast(msg);
      },
    )
    .subscribe();
}

watch(
  () => auth.isAuth,
  (v, prev) => {
    if (v) {
      subscribeBroadcasts();
      if (!prev) game.load().catch(() => {});
    } else if (broadcastChannel) {
      supabase.removeChannel(broadcastChannel);
      broadcastChannel = null;
    }
  },
);

onUnmounted(() => {
  if (broadcastTimer) clearTimeout(broadcastTimer);
  if (broadcastChannel) supabase.removeChannel(broadcastChannel);
});

onMounted(async () => {
  if (auth.isAuth) {
    await game.load();
    subscribeBroadcasts();
  }

  // Game-Tick: 500ms reicht fuer Tickcoin-Animation, halbiert den Re-render-Overhead
  // gegenueber 250ms (alte Geraete spuerbar fluessiger).
  let last = performance.now();
  setInterval(() => {
    if (document.visibilityState !== "visible") return;
    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;
    if (auth.isAuth) game.tick(dt);
  }, 500);

  setInterval(() => {
    if (auth.isAuth) game.persist();
  }, 15000);
  window.addEventListener("beforeunload", () => {
    if (auth.isAuth) game.persist();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && auth.isAuth) {
      game.persist();
    } else if (document.visibilityState === "visible") {
      refreshOnReturn();
    }
  });
  window.addEventListener("focus", refreshOnReturn);
  window.addEventListener("pageshow", (e) => {
    // bfcache-Wiederherstellung (mobile Safari, Firefox): Daten sind dann garantiert alt.
    if (e.persisted) refreshOnReturn();
  });
});

// Bei Route-Wechsel prüfen ob Daten veraltet sind
watch(route, () => refreshIfStale());

const showNav = computed(() => auth.isAuth && route.name !== "login");
const tutorialDimActive = computed(() => {
  if (!auth.isAuth) return false;
  const s = game.tutorialStep;
  if (s >= 5) return false;
  // Schritt 0 = Tap, 2 = Equip Best (nur auf Home), 3 = Shop-Nav, 4 = Truhe (nur im Shop)
  if (s === 0 || s === 2) return route.path === '/';
  if (s === 3) return route.path !== '/shop';
  if (s === 4) return route.path === '/shop';
  return false;
});

const reloading = ref(false);

async function softRefresh() {
  if (reloading.value) return;
  reloading.value = true;
  try {
    if (auth.isAuth) await game.load();
  } catch {
    // Soft-Refresh fehlgeschlagen → Hard-Reload als Fallback
    await hardReload();
  } finally {
    reloading.value = false;
  }
}

async function hardReload() {
  try {
    if (auth.isAuth) { try { await game.persist(); } catch {} }
    if ("caches" in window) {
      try { await Promise.all((await caches.keys()).map((k) => caches.delete(k))); } catch {}
    }
    if (navigator.serviceWorker) {
      try { await Promise.all((await navigator.serviceWorker.getRegistrations()).map((r) => r.update())); } catch {}
    }
  } finally {
    const url = new URL(window.location.href);
    url.searchParams.set("_r", Date.now().toString());
    window.location.replace(url.toString());
  }
}
</script>

<template>
  <div class="app-shell">
    <Toast position="top-center" />
    <header v-if="showNav" class="top-bar">
      <div class="brand">
        <span class="brand-logo">🐾</span>
        <span class="brand-text">Zoo Empire</span>
      </div>
      <div class="top-right">
        <div class="balance">
          <span class="coin">🪙</span>
          <span class="amount">{{ formatCoins(game.displayCoins) }}</span>
        </div>
        <router-link to="/tickets" class="balance tickets-balance" :title="t('app.nav.tickets')">
          <span class="coin">🎟️</span>
          <span class="amount">{{ formatCoins(game.tickets) }}</span>
        </router-link>
        <Button
          type="button"
          class="settings-link refresh-btn"
          :title="t('app.refreshData')"
          :disabled="reloading"
          @click="softRefresh"
        >
          <i :class="['pi', 'pi-refresh', { 'pi-spin': reloading }]" />
        </Button>
        <router-link to="/settings" class="settings-link" :title="t('app.settings')"
          >⚙️</router-link
        >
      </div>
    </header>

    <main class="content" :class="{ 'no-nav': !showNav }">
      <div v-if="auth.loading" class="loader">{{ t('common.loading') }}</div>
      <router-view v-else />
    </main>

    <div v-if="tutorialDimActive" class="tutorial-dim"></div>

    <transition name="broadcast-fade">
      <div v-if="broadcast" class="broadcast-toast" :key="broadcast.id">
        <div class="broadcast-icon">📢</div>
        <div class="broadcast-text">{{ broadcast.text }}</div>
      </div>
    </transition>

    <div
      v-if="game.pendingGiftToast && game.pendingGiftToast.length"
      class="gift-modal"
      @click.self="game.pendingGiftToast = null"
    >
      <div class="gift-dialog">
        <div class="gift-burst">🎁</div>
        <div class="gift-title">{{ t('app.giftReceivedTitle') }}</div>
        <div class="gift-sub">{{ t('app.giftReceivedSub') }}</div>
        <div class="gift-list">
          <div v-for="g in game.pendingGiftToast" :key="g.id" class="gift-item">
            <div class="gift-line">
              <span v-if="g.coins > 0" class="gift-coins">🪙 {{ formatCoins(g.coins) }}</span>
              <span v-if="g.species" class="gift-pet">
                {{ speciesInfo(g.species).emoji }} ×{{ g.qty }}
                <span v-if="g.tier && g.tier !== 'normal'" class="gift-tier">
                  {{ tierInfo(g.tier).badge }} {{ g.tier }}
                </span>
              </span>
            </div>
            <div v-if="g.note" class="gift-note">„{{ g.note }}"</div>
          </div>
        </div>
        <Button class="btn full" @click="game.pendingGiftToast = null">{{ t('app.giftThanks') }}</Button>
      </div>
    </div>

    <div
      v-if="game.pendingOfflineEarnings"
      class="offline-modal"
      @click.self="game.claimOfflineEarnings()"
    >
      <div class="offline-dialog">
        <div class="offline-title">{{ t('app.welcomeBack') }}</div>
        <div class="offline-sub">{{ t('app.youEarnedOffline') }}</div>
        <div class="offline-amount">
          <span class="offline-plus">+</span>
          <span class="offline-coins">{{ formatCoins(game.pendingOfflineEarnings.coins) }}</span>
          <span class="offline-coin-icon">🪙</span>
        </div>
        <div class="offline-meta">
          ({{ formatDuration(game.pendingOfflineEarnings.elapsedSec) }}
          {{ t('app.offlineAt') }} +{{ formatCoins(Math.floor(game.pendingOfflineEarnings.rate)) }}/s<template
            v-if="game.pendingOfflineEarnings.capped"
          >, {{ t('app.offlineCappedAt', { hours: Math.round(game.pendingOfflineEarnings.capSec / 3600) }) }}</template>)
        </div>
        <Button class="btn full" @click="game.claimOfflineEarnings()">
          {{ t('app.collect') }}
        </Button>
      </div>
    </div>

    <nav v-if="showNav" class="bottom-nav" :class="{ 'tut-lift': tutorialDimActive && game.tutorialStep === 3 }">
      <router-link
        to="/shop"
        class="nav-item nav-shop"
        :class="{ 'tut-highlight': game.tutorialStep === 3 && route.path !== '/shop' }"
      >
        <TutorialBubble
          v-if="game.tutorialStep === 3 && route.path !== '/shop'"
          class="shop-tutorial"
          :text="t('tutorial.shop')"
          finger="👇"
        />
        <span class="ico">🛒</span><span>{{ t('app.nav.shop') }}</span>
      </router-link>
      <router-link to="/trade" class="nav-item">
        <span class="ico">🔄</span><span>{{ t('app.nav.trade') }}</span>
      </router-link>
      <router-link to="/" class="nav-fab" :title="t('app.nav.home')">🏡</router-link>
      <router-link to="/friends" class="nav-item">
        <span class="ico">🤝</span><span>{{ t('app.nav.friends') }}</span>
      </router-link>
      <router-link to="/leaderboard" class="nav-item">
        <span class="ico">🏆</span><span>{{ t('app.nav.rank') }}</span>
      </router-link>
    </nav>

    <Button
      v-if="showNav && (auth.profile?.is_admin || auth.profile?.is_subadmin)"
      class="admin-fab"
      @click="adminOpen = true"
      :title="t('app.admin')"
    >
      🛠️
    </Button>

    <AdminModal v-if="adminOpen" @close="adminOpen = false" />
    <SpeedInsights />
  </div>
</template>

<style scoped>
.broadcast-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(135deg, #ffd166, #06d6a0);
  color: #0b1220;
  padding: 20px 28px;
  border-radius: 18px;
  font-weight: 700;
  font-size: 16px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.6),
    0 0 0 4px rgba(255, 255, 255, 0.15);
  z-index: 9999;
  max-width: min(90vw, 420px);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.broadcast-icon {
  font-size: 32px;
}
.broadcast-text {
  white-space: pre-wrap;
  word-wrap: break-word;
}
.broadcast-fade-enter-active,
.broadcast-fade-leave-active {
  transition:
    opacity 0.3s,
    transform 0.3s;
}
.broadcast-fade-enter-from {
  opacity: 0;
  transform: translate(-50%, -60%) scale(0.9);
}
.broadcast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -40%) scale(0.95);
}
.gift-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
  padding: 20px;
}
.gift-dialog {
  background: linear-gradient(135deg, #3a1d5c, #1d3a5c);
  border: 2px solid var(--accent);
  border-radius: 18px;
  padding: 24px;
  max-width: min(90vw, 420px);
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  animation: gift-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.gift-burst {
  font-size: 72px;
  animation: gift-bounce 1.2s ease-in-out infinite;
  filter: drop-shadow(0 0 20px rgba(255, 209, 102, 0.6));
  margin-bottom: 6px;
}
.nav-shop { position: relative; }
.bottom-nav.tut-lift { z-index: 760; }
.shop-tutorial {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 6px;
}
.tickets-balance {
  text-decoration: none;
  color: inherit;
  transition: transform 0.15s;
}
.tickets-balance:hover { transform: scale(1.05); }
.gift-title { font-weight: 800; font-size: 22px; color: var(--accent); }
.gift-sub { color: var(--muted); font-size: 13px; margin-bottom: 14px; }
.gift-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
.gift-item {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
}
.gift-line { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; font-size: 18px; font-weight: 700; }
.gift-coins { color: var(--accent); }
.gift-pet { display: inline-flex; align-items: center; gap: 6px; }
.gift-tier { font-size: 12px; color: var(--muted); }
.gift-note {
  font-style: italic;
  color: #fff;
  margin-top: 6px;
  font-size: 14px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}
@keyframes gift-in {
  0% { opacity: 0; transform: scale(0.6); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes gift-bounce {
  0%, 100% { transform: translateY(0) rotate(-5deg); }
  50% { transform: translateY(-10px) rotate(5deg); }
}

.offline-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
  padding: 20px;
}
.offline-dialog {
  background: linear-gradient(135deg, #3a1d5c, #1d3a5c);
  border: 2px solid var(--accent);
  border-radius: 18px;
  padding: 28px 24px 22px;
  max-width: min(90vw, 420px);
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  animation: gift-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.offline-title {
  font-weight: 800;
  font-size: 26px;
  color: var(--accent);
  letter-spacing: 0.5px;
}
.offline-sub {
  color: var(--muted);
  font-size: 13px;
  margin-top: 6px;
  margin-bottom: 18px;
}
.offline-amount {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 12px 0 10px;
  font-weight: 800;
  font-size: 44px;
  color: var(--accent);
  text-shadow: 0 4px 14px rgba(255, 209, 102, 0.35);
}
.offline-plus { font-size: 36px; }
.offline-coin-icon { font-size: 38px; filter: drop-shadow(0 0 12px rgba(255, 209, 102, 0.5)); }
.offline-meta {
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 18px;
}
</style>
