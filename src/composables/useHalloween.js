import { ref, computed, watch } from 'vue'
import {
  HALLOWEEN_STORAGE_KEY, HALLOWEEN_CLASS,
  normalizeHalloweenPref, isHalloweenSeason
} from '../halloween'

function readPref() {
  try { return normalizeHalloweenPref(localStorage.getItem(HALLOWEEN_STORAGE_KEY)) } catch { return 'on' }
}

// Das Datum reicht stündlich: Die Saison wechselt höchstens um Mitternacht.
const today = ref(new Date())
if (typeof window !== 'undefined') {
  setInterval(() => {
    if (document.visibilityState !== 'visible') return
    today.value = new Date()
  }, 60 * 60 * 1000)
}

export const halloweenPreference = ref(readPref())
export const halloweenSeason = computed(() => isHalloweenSeason(today.value))
export const halloweenDecor = computed(() => halloweenSeason.value && halloweenPreference.value === 'on')

function applyToDom(on) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle(HALLOWEEN_CLASS, on)
}

applyToDom(halloweenDecor.value)
watch(halloweenDecor, applyToDom)

export function setHalloweenPreference(on) {
  const pref = on ? 'on' : 'off'
  halloweenPreference.value = pref
  try { localStorage.setItem(HALLOWEEN_STORAGE_KEY, pref) } catch {}
}
