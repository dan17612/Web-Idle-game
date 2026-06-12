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
  return /failed to fetch|load failed|networkerror|network request failed|fetch failed/i.test(msg)
}
