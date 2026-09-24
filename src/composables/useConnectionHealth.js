import { reactive } from 'vue'
import {
  nextRetryDelay, isNetworkError, wakeRealtime,
  createStallWatchdog, STALL_PROBE_INTERVAL_MS
} from '../connectionHealth'
import { fireAppReconnected } from './useAppResume'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const HEALTH_TIMEOUT_MS = 6_000

const state = reactive({
  navigatorOnline: typeof navigator === 'undefined' || navigator.onLine !== false,
  healthOk: true,
  lastSyncAt: 0,
  failCount: 0,
  checking: false
})

let retryTimer = null
let initialized = false

function clearRetry() {
  if (retryTimer) {
    clearTimeout(retryTimer)
    retryTimer = null
  }
}

function scheduleRetry() {
  clearRetry()
  retryTimer = setTimeout(() => {
    retryTimer = null
    // Im Hintergrund kein Netzverkehr — beim nächsten Resume wird ohnehin geprüft.
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      scheduleRetry()
      return
    }
    reconnect()
  }, nextRetryDelay(state.failCount))
}

export function reportSyncSuccess() {
  state.lastSyncAt = Date.now()
  state.healthOk = true
  state.failCount = 0
  clearRetry()
}

export function reportSyncFailure(e) {
  if (!isNetworkError(e)) return
  state.healthOk = false
  state.failCount += 1
  scheduleRetry()
}

async function pingSupabase() {
  if (!SUPABASE_URL) return true
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), HEALTH_TIMEOUT_MS)
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: SUPABASE_KEY || '' },
      cache: 'no-store',
      signal: ctrl.signal
    })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

// Health-Check → Session auffrischen → Realtime wecken → Spieldaten neu laden
// → Views benachrichtigen (onAppReconnected).
// Stores werden dynamisch importiert, um einen statischen Zyklus
// (game.js → useConnectionHealth → game.js) zu vermeiden.
export async function reconnect() {
  if (state.checking) return false
  state.checking = true
  try {
    const ok = await pingSupabase()
    if (!ok) {
      state.navigatorOnline = typeof navigator === 'undefined' || navigator.onLine !== false
      state.healthOk = false
      state.failCount += 1
      scheduleRetry()
      return false
    }
    // Erfolgreicher Ping beweist Konnektivität — unabhängig von navigator.onLine.
    state.navigatorOnline = true
    state.healthOk = true
    const [{ supabase }, { useAuthStore }, { useGameStore }] = await Promise.all([
      import('../supabase'),
      import('../stores/auth'),
      import('../stores/game')
    ])
    const auth = useAuthStore()
    const game = useGameStore()
    if (auth.isAuth) {
      // getSession() frischt ein im Hintergrund abgelaufenes Token auf.
      await supabase.auth.getSession()
      wakeRealtime(supabase.realtime)
      if (!game.loading) await game.load()
    } else {
      reportSyncSuccess()
    }
    fireAppReconnected()
    return true
  } catch (e) {
    if (isNetworkError(e)) state.healthOk = false
    state.failCount += 1
    scheduleRetry()
    return false
  } finally {
    state.checking = false
  }
}

const WATCHDOG_RELOAD_KEY = 'watchdogReloadAt'
const WATCHDOG_RELOAD_COOLDOWN_MS = 3 * 60 * 1000

// Letzte Rettung: Hängt der Supabase-Client fest (jede Anfrage wartet ewig),
// hilft nur ein Neuladen der App. Schleifen-Schutz über sessionStorage.
function reloadAfterStall() {
  console.warn('[Watchdog] Supabase-Client reagiert nicht mehr – lade App neu')
  try {
    const last = Number(sessionStorage.getItem(WATCHDOG_RELOAD_KEY) || 0)
    if (Date.now() - last < WATCHDOG_RELOAD_COOLDOWN_MS) return
    sessionStorage.setItem(WATCHDOG_RELOAD_KEY, String(Date.now()))
  } catch {}
  window.location.reload()
}

function startStallWatchdog() {
  const watchdog = createStallWatchdog({
    probe: async () => {
      const { supabase } = await import('../supabase')
      await supabase.auth.getSession()
    },
    onStall: reloadAfterStall
  })
  let last = Date.now()
  setInterval(() => {
    const now = Date.now()
    // Hintergrund-/Offline-Zeit zählt nicht als „hängt"; gedrosselte Timer
    // nach der Rückkehr werden auf zwei Intervalle gedeckelt.
    const elapsed = Math.min(now - last, STALL_PROBE_INTERVAL_MS * 2)
    last = now
    if (document.visibilityState !== 'visible') return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    watchdog.tick(elapsed)
  }, STALL_PROBE_INTERVAL_MS)
}

export function initConnectionWatch() {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  startStallWatchdog()
  window.addEventListener('online', () => {
    state.navigatorOnline = true
    reconnect()
  })
  window.addEventListener('offline', () => {
    state.navigatorOnline = false
  })
}

export function useConnectionHealth() {
  return { state, reconnect }
}
