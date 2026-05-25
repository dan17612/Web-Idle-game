import { onMounted, onUnmounted } from 'vue'

// Globaler Dispatcher. Listener-Registrierung passiert beim Bootstrap in main.js.
const callbacks = new Set()

let lastFireAt = 0
const MIN_INTERVAL_MS = 750

export function fireAppResume(source = 'manual') {
  const now = Date.now()
  if (now - lastFireAt < MIN_INTERVAL_MS) return
  lastFireAt = now
  if (import.meta.env?.DEV && typeof console !== 'undefined') console.log('[AppResume]', source)
  for (const cb of callbacks) {
    try { cb(source) } catch (e) { console.error('onAppResume callback failed', e) }
  }
}

export function onAppResume(cb) {
  onMounted(() => callbacks.add(cb))
  onUnmounted(() => callbacks.delete(cb))
}
