import { onMounted, onUnmounted, watch } from "vue"
import { useGameStore } from "../stores/game"
import { useAuthStore } from "../stores/auth"

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

  function onVisibility() {
    if (document.visibilityState === "visible") run()
  }
  function onPageshow(e) {
    if (e.persisted) run()
  }

  let stopGameWatch = null

  onMounted(() => {
    lastRun = Date.now()
    stopGameWatch = watch(() => game.lastLoadedAt, (v, prev) => {
      if (prev && v && v !== prev) run()
    })
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("focus", run)
    window.addEventListener("pageshow", onPageshow)
    window.addEventListener("online", run)
  })

  onUnmounted(() => {
    if (stopGameWatch) stopGameWatch()
    document.removeEventListener("visibilitychange", onVisibility)
    window.removeEventListener("focus", run)
    window.removeEventListener("pageshow", onPageshow)
    window.removeEventListener("online", run)
  })

  return { refresh: run }
}
