import { ref, watch } from "vue"

const STORAGE_KEY = "animationsEnabled"

function readInitial() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === null) return true
    return v !== "0"
  } catch {
    return true
  }
}

export const animationsEnabled = ref(readInitial())

function applyToDom(on) {
  if (typeof document === "undefined") return
  document.body.classList.toggle("no-anim", !on)
}

applyToDom(animationsEnabled.value)

watch(animationsEnabled, (v) => {
  try { localStorage.setItem(STORAGE_KEY, v ? "1" : "0") } catch {}
  applyToDom(v)
})

export function useAnimations() {
  return { animationsEnabled }
}
