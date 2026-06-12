<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
import { useAuthStore } from "../stores/auth"
import { useGameStore } from "../stores/game"
import { useConnectionHealth } from "../composables/useConnectionHealth"
import { computeConnectionStatus } from "../connectionHealth"
import { onAppResume } from "../composables/useAppResume"
import { useAppToast } from "../composables/useAppToast"
import { t } from "../i18n"

const auth = useAuthStore()
const game = useGameStore()
const toast = useAppToast()
const { state, reconnect } = useConnectionHealth()

const now = ref(Date.now())
let ticker = null

onMounted(() => {
  ticker = setInterval(() => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return
    now.value = Date.now()
  }, 5000)
})

onUnmounted(() => {
  if (ticker) clearInterval(ticker)
})

const status = computed(() =>
  computeConnectionStatus({
    navigatorOnline: state.navigatorOnline,
    healthOk: state.healthOk,
    authed: auth.isAuth,
    lastSyncAt: Math.max(state.lastSyncAt, game.lastLoadedAt),
    now: now.value
  })
)

// Stale-Hinweis unterdrücken, solange gerade frisch geladen wird (kein Flackern).
const visible = computed(() => {
  if (status.value === "ok") return false
  if (status.value === "stale" && game.loading) return false
  return true
})

const icon = computed(() => {
  if (status.value === "offline") return "📡"
  if (status.value === "server") return "🛰️"
  return "🕒"
})

const title = computed(() => {
  if (status.value === "offline") return t("connection.offlineTitle")
  if (status.value === "server") return t("connection.serverTitle")
  return t("connection.staleTitle")
})

const agoText = computed(() => {
  const last = Math.max(state.lastSyncAt, game.lastLoadedAt)
  if (!last) return ""
  const sec = Math.max(0, Math.floor((now.value - last) / 1000))
  if (sec < 30) return t("connection.lastSyncJustNow")
  const time = sec < 60 ? `${sec}s` : sec < 3600 ? `${Math.floor(sec / 60)} min` : `${Math.floor(sec / 3600)}h`
  return t("connection.lastSync", { time })
})

watch(status, (v, prev) => {
  if (prev && prev !== "ok" && v === "ok") {
    toast.ok(t("connection.restored"))
  }
})

onAppResume(() => {
  now.value = Date.now()
  if (status.value === "offline" || status.value === "server") reconnect()
})

async function onReconnect() {
  now.value = Date.now()
  const ok = await reconnect()
  now.value = Date.now()
  if (!ok) toast.warn(t("connection.stillOffline"))
}
</script>

<template>
  <transition name="conn-slide">
    <div v-if="visible" class="conn-banner" :class="`conn-${status}`" role="alert">
      <span class="conn-ico">{{ icon }}</span>
      <div class="conn-text">
        <div class="conn-title">{{ title }}</div>
        <div v-if="agoText" class="conn-sub">{{ agoText }}</div>
      </div>
      <Button class="conn-btn" :disabled="state.checking" @click="onReconnect">
        <i :class="['pi', state.checking ? 'pi-spinner pi-spin' : 'pi-refresh']" />
        <span>{{ state.checking ? t("connection.reconnecting") : t("connection.reconnect") }}</span>
      </Button>
    </div>
  </transition>
</template>

<style scoped>
.conn-banner {
  position: fixed;
  left: max(12px, calc((100% - 530px) / 2));
  right: max(12px, calc((100% - 530px) / 2));
  bottom: calc(96px + var(--safe-bot));
  z-index: 900;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--card);
  border: 2px solid var(--border);
  border-radius: 20px;
  box-shadow: 0 4px 0 var(--border), 0 16px 40px rgba(110, 80, 20, 0.25);
}
.conn-offline,
.conn-server {
  border-color: color-mix(in srgb, var(--danger) 45%, var(--border));
  box-shadow: 0 4px 0 color-mix(in srgb, var(--danger) 35%, var(--border)),
    0 16px 40px rgba(110, 80, 20, 0.25);
}
.conn-stale {
  border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
  box-shadow: 0 4px 0 color-mix(in srgb, var(--accent) 40%, var(--border)),
    0 16px 40px rgba(110, 80, 20, 0.25);
}
.conn-ico {
  font-size: 26px;
  line-height: 1;
  flex-shrink: 0;
}
.conn-text {
  flex: 1;
  min-width: 0;
}
.conn-title {
  font-weight: 800;
  font-size: 14px;
  color: var(--heading);
}
.conn-sub {
  font-size: 12px;
  color: var(--muted);
  margin-top: 1px;
}
:deep(.p-button).conn-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 14px;
  border: none;
  font-weight: 800;
  font-size: 13px;
  color: var(--accent-ink);
  background: linear-gradient(180deg, var(--accent-soft), var(--accent));
  box-shadow: 0 3px 0 var(--accent-deep);
  cursor: pointer;
}
:deep(.p-button).conn-btn:disabled {
  opacity: 0.7;
}
.conn-slide-enter-active,
.conn-slide-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}
.conn-slide-enter-from,
.conn-slide-leave-to {
  opacity: 0;
  transform: translateY(16px);
}
</style>
