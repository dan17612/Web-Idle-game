<script setup>
import { onMounted, onUnmounted, computed, ref, watch } from "vue";
import { useAuthStore } from "./stores/auth";
import { useGameStore } from "./stores/game";
import { useRoute } from "vue-router";
import { SpeedInsights } from "@vercel/speed-insights/vue";
import { supabase } from "./supabase";
import { formatCoins, speciesInfo, tierInfo } from "./animals";
import AdminModal from "./components/AdminModal.vue";

const adminOpen = ref(false);

const auth = useAuthStore();
const game = useGameStore();
const route = useRoute();

const STALE_MS = 90_000; // 90s – danach Game-Daten neu laden

function refreshIfStale() {
  if (!auth.isAuth || game.loading) return;
  if (Date.now() - game.lastLoadedAt > STALE_MS) {
    game.load().catch(() => {});
  }
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
  (v) => {
    if (v) subscribeBroadcasts();
    else if (broadcastChannel) {
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

  let last = performance.now();
  setInterval(() => {
    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;
    if (auth.isAuth) game.tick(dt);
  }, 250);

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
      refreshIfStale();
    }
  });
});

// Bei Route-Wechsel prüfen ob Daten veraltet sind
watch(route, () => refreshIfStale());

const showNav = computed(() => auth.isAuth && route.name !== "login");

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
    <header v-if="showNav" class="top-bar">
      <div class="brand">🐾 Zoo Empire</div>
      <div class="top-right">
        <div class="balance">
          <span class="coin">🪙</span>
          <span class="amount">{{ formatCoins(game.displayCoins) }}</span>
        </div>
        <Button
          type="button"
          class="settings-link refresh-btn"
          title="Daten aktualisieren"
          :disabled="reloading"
          @click="softRefresh"
        >
          <i :class="['pi', 'pi-refresh', { 'pi-spin': reloading }]" />
        </Button>
        <router-link to="/settings" class="settings-link" title="Einstellungen"
          >⚙️</router-link
        >
      </div>
    </header>

    <main class="content" :class="{ 'no-nav': !showNav }">
      <div v-if="auth.loading" class="loader">Lädt…</div>
      <router-view v-else />
    </main>

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
        <div class="gift-title">Geschenk erhalten!</div>
        <div class="gift-sub">Ein Admin hat dir etwas geschickt.</div>
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
        <Button class="btn full" @click="game.pendingGiftToast = null">Danke!</Button>
      </div>
    </div>

    <nav v-if="showNav" class="bottom-nav">
      <router-link to="/shop" class="nav-item">
        <span class="ico">🛒</span><span>Shop</span>
      </router-link>
      <router-link to="/trade" class="nav-item">
        <span class="ico">🔄</span><span>Trade</span>
      </router-link>
      <router-link to="/" class="nav-fab" title="Farm">🏡</router-link>
      <router-link to="/friends" class="nav-item">
        <span class="ico">🤝</span><span>Freunde</span>
      </router-link>
      <router-link to="/leaderboard" class="nav-item">
        <span class="ico">🏆</span><span>Rang</span>
      </router-link>
    </nav>

    <Button
      v-if="showNav && auth.profile?.is_admin"
      class="admin-fab"
      @click="adminOpen = true"
      title="Admin"
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
</style>
