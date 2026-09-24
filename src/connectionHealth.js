export const STALE_WARN_MS = 3 * 60 * 1000
export const RETRY_BASE_MS = 5_000
export const RETRY_MAX_MS = 30_000

// Reihenfolge: kein Netz schlägt Server-Problem schlägt veraltete Daten.
export function computeConnectionStatus({
  navigatorOnline,
  healthOk,
  authed,
  lastSyncAt,
  now,
  staleMs = STALE_WARN_MS
}) {
  if (!navigatorOnline) return 'offline'
  if (!healthOk) return 'server'
  if (authed && lastSyncAt > 0 && now - lastSyncAt > staleMs) return 'stale'
  return 'ok'
}

export function nextRetryDelay(failCount, base = RETRY_BASE_MS, max = RETRY_MAX_MS) {
  const n = Math.max(1, Math.floor(Number(failCount) || 1))
  return Math.min(max, base * 2 ** (n - 1))
}

// Verbindungsfehler (fetch abgebrochen/fehlgeschlagen) vs. Server-Antwort mit Fehler.
// Chrome: "Failed to fetch", WebKit/iOS: "Load failed", Firefox: "NetworkError…".
export function isNetworkError(e) {
  if (!e) return false
  if (e.name === 'AbortError' || e.name === 'TimeoutError' || e.name === 'TypeError') return true
  const msg = String(e.message || e)
  return /failed to fetch|load failed|networkerror|network request failed|fetch failed|timeouterror|aborterror|timed out/i.test(msg)
}

// Nach App-Rückkehr hängen Requests (Android-WebView friert Sockets ein) sonst
// ewig: `game.loading` bliebe true und jeder weitere Refresh würde übersprungen.
export const FETCH_TIMEOUT_MS = 15_000

export function createTimeoutFetch(fetchImpl, timeoutMs = FETCH_TIMEOUT_MS) {
  return (input, init = {}) => {
    const ctrl = new AbortController()
    const outer = init.signal
    const onOuterAbort = () => ctrl.abort(outer.reason)
    if (outer) {
      if (outer.aborted) ctrl.abort(outer.reason)
      else outer.addEventListener('abort', onOuterAbort, { once: true })
    }
    const timer = setTimeout(() => {
      const reason = typeof DOMException === 'function'
        ? new DOMException('Request timed out', 'TimeoutError')
        : undefined
      ctrl.abort(reason)
    }, timeoutMs)
    return Promise.resolve()
      .then(() => fetchImpl(input, { ...init, signal: ctrl.signal }))
      .finally(() => {
        clearTimeout(timer)
        if (outer) outer.removeEventListener('abort', onOuterAbort)
      })
  }
}

// supabase-js wirft bei Netzfehlern nicht, sondern liefert `{ error }` mit
// z. B. "TypeError: Failed to fetch". Erstes Fehlerobjekt als echten Error
// zurückgeben, damit Loader abbrechen statt Platzhalter-/Nullwerte zu setzen.
export function firstQueryError(results) {
  for (const r of results || []) {
    const err = r?.error
    if (!err) continue
    const e = new Error(String(err.message || err))
    e.cause = err
    return e
  }
  return null
}

// Schläfrige Realtime-Verbindung nach Rückkehr wecken: getrennt → neu
// verbinden; scheinbar offen → Heartbeat senden (tote Sockets fallen so auf
// und werden samt Kanälen neu aufgebaut).
export function wakeRealtime(realtime) {
  if (!realtime) return false
  try {
    const channels = typeof realtime.getChannels === 'function' ? realtime.getChannels() : []
    if (!channels.length) return false
    if (realtime.isConnected()) realtime.sendHeartbeat()
    else realtime.connect()
    return true
  } catch {
    return false
  }
}

// Wächter gegen „lädt/speichert unendlich": prüft regelmäßig per `probe`
// (z. B. supabase.auth.getSession – jede Anfrage braucht sie), ob der Client
// noch reagiert. Bleibt die Probe `stallMs` lang (nur sichtbare, online
// verbrachte Zeit zählt, via tick(elapsedMs)) hängen, wird `onStall` gerufen.
export const STALL_PROBE_INTERVAL_MS = 5_000
export const STALL_LIMIT_MS = 60_000

export function createStallWatchdog({ probe, onStall, stallMs = STALL_LIMIT_MS }) {
  let pendingId = 0
  let nextId = 0
  let stuckFor = 0
  return {
    tick(elapsedMs) {
      if (pendingId) {
        stuckFor += Math.max(0, Number(elapsedMs) || 0)
        if (stuckFor >= stallMs) {
          pendingId = 0
          stuckFor = 0
          onStall()
        }
        return
      }
      const id = ++nextId
      pendingId = id
      stuckFor = 0
      const done = () => {
        if (pendingId === id) { pendingId = 0; stuckFor = 0 }
      }
      Promise.resolve().then(probe).then(done, done)
    },
    get stuckFor() { return stuckFor },
    get probing() { return pendingId !== 0 }
  }
}
