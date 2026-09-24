import { onMounted, onUnmounted, watch } from "vue"
import { useGameStore } from "../stores/game"
import { useAuthStore } from "../stores/auth"
import { onAppReconnected } from "./useAppResume"

const RETURN_THROTTLE_MS = 4_000

export function useReturnRefresh(loader) {
  const game = useGameStore()
  const auth = useAuthStore()
  let lastRun = 0
  let running = false
  let queued = false

  async function run() {
    if (!auth.isAuth) return
    // Läuft noch ein älterer (evtl. vor dem Hintergrund gestarteter, hängender)
    // Load, danach einmal frisch nachladen statt die Rückkehr zu verschlucken.
    if (running) {
      if (Date.now() - lastRun >= RETURN_THROTTLE_MS) queued = true
      return
    }
    if (Date.now() - lastRun < RETURN_THROTTLE_MS) return
    running = true
    lastRun = Date.now()
    try { await loader() } catch {}
    finally { running = false }
    if (queued) {
      queued = false
      lastRun = 0
      run()
    }
  }

  let stopGameWatch = null

  onMounted(() => {
    lastRun = Date.now()
    // View-Loader nochmal ausführen, sobald der zentrale game.load() durch ist
    stopGameWatch = watch(() => game.lastLoadedAt, (v, prev) => {
      if (prev && v && v !== prev) run()
    })
  })

  // App-Rückkehr (Web + Capacitor): erst nachdem die Verbindung wieder steht
  // (siehe reconnect() in useConnectionHealth) – throttled in run() selbst
  onAppReconnected(() => { run() })

  onUnmounted(() => {
    if (stopGameWatch) stopGameWatch()
  })

  return { refresh: run }
}
