import { onMounted, onUnmounted } from 'vue'

// Globaler Dispatcher. Listener-Registrierung passiert beim Bootstrap in main.js.
const callbacks = new Set()

let lastFireAt = 0
const MIN_INTERVAL_MS = 750

export function fireAppResume(source = 'manual') {
  const now = Date.now()
  if (now - lastFireAt < MIN_INTERVAL_MS) return
  lastFireAt = now
  if (typeof console !== 'undefined') console.log('[AppResume]', source)
  for (const cb of callbacks) {
    try { cb(source) } catch (e) { console.error('onAppResume callback failed', e) }
  }
}

export function onAppResume(cb) {
  onMounted(() => callbacks.add(cb))
  onUnmounted(() => callbacks.delete(cb))
}

// Zweite Stufe: feuert, nachdem die Verbindung nach einer Rückkehr (oder nach
// einem Netzausfall) wieder steht und game.load() durch ist. Views laden ihre
// eigenen Daten erst dann — sonst laufen sie ins noch tote Netz und zeigen
// nur Platzhalter.
const reconnectCallbacks = new Set()

export function fireAppReconnected() {
  for (const cb of reconnectCallbacks) {
    try { cb() } catch (e) { console.error('onAppReconnected callback failed', e) }
  }
}

export function onAppReconnected(cb) {
  onMounted(() => reconnectCallbacks.add(cb))
  onUnmounted(() => reconnectCallbacks.delete(cb))
}
