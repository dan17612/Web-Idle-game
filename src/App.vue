<script setup>
import { onMounted, onUnmounted, computed, ref, watch } from "vue";
import { useAuthStore } from "./stores/auth";
import { useGameStore } from "./stores/game";
import { useRoute } from "vue-router";
import { SpeedInsights } from "@vercel/speed-insights/vue";
import { supabase } from "./supabase";
import { formatCoins } from "./animals";
import AdminModal from "./components/AdminModal.vue";

const adminOpen = ref(false);

const auth = useAuthStore();
const game = useGameStore();
const route = useRoute();

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
    if (document.visibilityState === "hidden" && auth.isAuth) game.persist();
  });
});

const showNav = computed(() => auth.isAuth && route.name !== "login");

const reloading = ref(false);
async function hardReload() {
  if (reloading.value) return;
  reloading.value = true;
  try {
    if (auth.isAuth) {
      try { await game.persist(); } catch {}
    }
    if ("caches" in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {}
    }
    if (navigator.serviceWorker) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.update()));
      } catch {}
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
        <button
          type="button"
          class="settings-link"
          title="Seite neu laden"
          :disabled="reloading"
          @click="hardReload"
        >
          {{ reloading ? "…" : "🔄" }}
        </button>
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

    <button
      v-if="showNav && auth.profile?.is_admin"
      class="admin-fab"
      @click="adminOpen = true"
      title="Admin"
    >
      🛠️
    </button>

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
</style>
