import { onMounted, onUnmounted, watch } from "vue"
import { useGameStore } from "../stores/game"
import { useAuthStore } from "../stores/auth"
import { onAppResume } from "./useAppResume"

const RETURN_THROTTLE_MS = 4_000

export function useReturnRefresh(loader) {
  const game = useGameStore()
  const auth = useAuthStore()
  let lastRun = 0
  let running = false

  async function run() {
    if (!auth.isAuth) return
    if (running) return
    if (Date.now() - lastRun < RETURN_THROTTLE_MS) return
    running = true
    lastRun = Date.now()
    try { await loader() } catch {}
    finally { running = false }
  }

  let stopGameWatch = null

  onMounted(() => {
    lastRun = Date.now()
    // View-Loader nochmal ausführen, sobald der zentrale game.load() durch ist
    stopGameWatch = watch(() => game.lastLoadedAt, (v, prev) => {
      if (prev && v && v !== prev) run()
    })
  })

  // App-Rückkehr (Web + Capacitor) – throttled in run() selbst
  onAppResume(() => { run() })

  onUnmounted(() => {
    if (stopGameWatch) stopGameWatch()
  })

  return { refresh: run }
}
