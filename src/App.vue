<script setup>
import { onMounted, onUnmounted, computed, ref, watch } from "vue";
import { Capacitor } from "@capacitor/core";
import { useAuthStore } from "./stores/auth";
import { useGameStore } from "./stores/game";
import { useRoute } from "vue-router";
import { SpeedInsights } from "@vercel/speed-insights/vue";
import { supabase } from "./supabase";
import { formatCoins, speciesInfo, tierInfo } from "./animals";
import AdminModal from "./components/AdminModal.vue";
import SupportModal from "./components/SupportModal.vue";
import TutorialBubble from "./components/TutorialBubble.vue";
import { t } from "./i18n";
import { onAppResume } from "./composables/useAppResume";

const adminOpen = ref(false);
const supportOpen = ref(false);

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
let tickTimer = null;
let persistTimer = null;
let staleCheckTimer = null;
let craftPollTimer = null;
let beforeUnloadHandler = null;
let visibilityHandler = null;

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
      auth.loadMySupportTickets().catch(() => {});
      auth.loadAdminSupportOverview().catch(() => {});
      if (!prev) game.load().catch(() => {});
    } else if (broadcastChannel) {
      supabase.removeChannel(broadcastChannel);
      broadcastChannel = null;
    }
  },
);

onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer);
  if (persistTimer) clearInterval(persistTimer);
  if (staleCheckTimer) clearInterval(staleCheckTimer);
  if (craftPollTimer) clearInterval(craftPollTimer);
  if (broadcastTimer) clearTimeout(broadcastTimer);
  if (broadcastChannel) supabase.removeChannel(broadcastChannel);
  if (beforeUnloadHandler) window.removeEventListener("beforeunload", beforeUnloadHandler);
  if (visibilityHandler) document.removeEventListener("visibilitychange", visibilityHandler);
});

onMounted(async () => {
  if (auth.isAuth) {
    await game.load();
    subscribeBroadcasts();
    auth.loadMySupportTickets().catch(() => {});
    auth.loadAdminSupportOverview().catch(() => {});
  }

  // Game-Tick: 500ms reicht fuer Tickcoin-Animation, halbiert den Re-render-Overhead
  // gegenueber 250ms (alte Geraete spuerbar fluessiger).
  let last = performance.now();
  tickTimer = setInterval(() => {
    if (document.visibilityState !== "visible") return;
    const now = performance.now();
    // Cap dt at 1s to prevent huge coin spikes when tab returns from hidden state.
    // Offline earnings for longer absences are handled separately by applyOffline().
    const dt = Math.min((now - last) / 1000, 1);
    last = now;
    try { if (auth.isAuth) game.tick(dt); } catch {}
  }, 500);

  persistTimer = setInterval(() => {
    if (auth.isAuth) game.persist();
  }, 15000);

  // Sicherheitsnetz: regelmäßig prüfen, ob Daten alt sind (auch wenn resume-Events ausfallen).
  staleCheckTimer = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (!auth.isAuth || game.loading) return;
    if (Date.now() - game.lastLoadedAt > STALE_MS) {
      game.load().catch(() => {});
    }
  }, 8000);

  // Craft-Status-Polling: alle 15s prüfen ob ein aktiver Craft-Job fertig ist,
  // damit der Nutzer sofort benachrichtigt wird ohne manuellen Reload.
  craftPollTimer = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (!auth.isAuth || !game.craftJob?.active) return;
    game.loadCraftStatus().catch(() => {});
  }, 15000);
  beforeUnloadHandler = () => {
    if (auth.isAuth) game.persist();
  };
  window.addEventListener("beforeunload", beforeUnloadHandler);
  visibilityHandler = () => {
    if (document.visibilityState === "hidden" && auth.isAuth) {
      game.persist();
    }
  };
  document.addEventListener("visibilitychange", visibilityHandler);
});

// App-Rückkehr: Web (visibility/focus/pageshow/online) + Capacitor (appStateChange/resume).
// Auf Android löst nur appStateChange beim Wiederöffnen aus dem Hintergrund zuverlässig aus.
onAppResume(() => {
  refreshOnReturn();
  if (auth.isAuth) {
    auth.loadMySupportTickets().catch(() => {});
    auth.loadAdminSupportOverview().catch(() => {});
  }
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
  if (reloading.value) return;
  reloading.value = true;
  // Persist als fire-and-forget — niemals den Reload blockieren, falls das Netz hängt
  if (auth.isAuth) { try { game.persist(); } catch {} }

  if (Capacitor.isNativePlatform()) {
    // In Capacitor: WebView neu laden. caches/SW gibt's hier nicht.
    window.location.reload();
    return;
  }

  // Web: Cache-Storage + Service-Worker entfernen, dann mit Cache-Bust neu laden.
  // Wir warten max. 1.5s auf das Aufräumen, dann reloaden wir trotzdem.
  const cleanup = (async () => {
    if ("caches" in window) {
      try { await Promise.all((await caches.keys()).map((k) => caches.delete(k))); } catch {}
    }
    if (navigator.serviceWorker) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      } catch {}
    }
  })();
  Promise.race([cleanup, new Promise((r) => setTimeout(r, 1500))]).finally(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("_r", Date.now().toString());
    window.location.replace(url.toString());
  });
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
        <transition name="save-fade">
          <span v-if="game.isSaving" class="save-indicator" :title="t('app.saving')">
            <i class="pi pi-spin pi-spinner save-spin" />
          </span>
        </transition>
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

    <transition name="craft-ready-fade">
      <router-link
        v-if="game.craftJobReady && route.path !== '/'"
        to="/"
        class="craft-ready-banner"
      >
        ⚗️ {{ t('app.craftReady') }}
      </router-link>
    </transition>

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
      <span v-if="auth.hasUnseenAdminSupport" class="fab-dot-blue"></span>
    </Button>

    <Button
      v-if="showNav && auth.qualifiedSupportTickets.length"
      class="support-fab"
      @click="supportOpen = true"
      :title="t('app.supportTickets')"
    >
      🎫
      <span v-if="auth.hasUnseenSupportReply" class="fab-dot"></span>
    </Button>

    <AdminModal v-if="adminOpen" @close="adminOpen = false" />
    <SupportModal v-if="supportOpen" @close="supportOpen = false" />
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

/* Save indicator */
.save-indicator {
  display: inline-flex;
  align-items: center;
  color: var(--muted);
  font-size: 13px;
  opacity: 0.7;
}
.save-spin { font-size: 12px; }
.save-fade-enter-active,
.save-fade-leave-active { transition: opacity 0.3s; }
.save-fade-enter-from,
.save-fade-leave-to { opacity: 0; }

/* Craft-ready banner */
.craft-ready-banner {
  position: fixed;
  bottom: 70px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  padding: 8px 18px;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(168, 85, 247, 0.5);
  z-index: 900;
  text-decoration: none;
  white-space: nowrap;
  animation: craft-pulse 2s ease-in-out infinite;
}
@keyframes craft-pulse {
  0%, 100% { box-shadow: 0 4px 20px rgba(168, 85, 247, 0.5); }
  50% { box-shadow: 0 4px 28px rgba(168, 85, 247, 0.85); }
}
.craft-ready-fade-enter-active,
.craft-ready-fade-leave-active { transition: opacity 0.4s, transform 0.4s; }
.craft-ready-fade-enter-from,
.craft-ready-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }
</style>
