import { reactive } from 'vue'
import { nextRetryDelay, isNetworkError } from '../connectionHealth'

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

// Health-Check → Session auffrischen → Spieldaten neu laden.
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
      await supabase.auth.getSession()
      if (!game.loading) await game.load()
    } else {
      reportSyncSuccess()
    }
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

export function initConnectionWatch() {
  if (initialized || typeof window === 'undefined') return
  initialized = true
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
