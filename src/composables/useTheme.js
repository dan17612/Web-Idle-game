import { ref, computed, watch } from 'vue'
import {
  THEME_STORAGE_KEY, THEME_COLORS, DARK_CLASS,
  normalizeThemePref, resolveTheme,
} from '../theme'

function readPref() {
  try { return normalizeThemePref(localStorage.getItem(THEME_STORAGE_KEY)) } catch { return 'system' }
}

const media = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null

const systemDark = ref(!!media?.matches)
const onSystemChange = (e) => { systemDark.value = e.matches }
if (media?.addEventListener) media.addEventListener('change', onSystemChange)
else media?.addListener?.(onSystemChange) // Safari < 14

export const themePreference = ref(readPref())
export const resolvedTheme = computed(() => resolveTheme(themePreference.value, systemDark.value))

function applyToDom(theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.toggle(DARK_CLASS, theme === 'dark')
  root.style.colorScheme = theme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLORS[theme])
}

applyToDom(resolvedTheme.value)
watch(resolvedTheme, applyToDom)

export function setThemePreference(value) {
  const pref = normalizeThemePref(value)
  themePreference.value = pref
  try { localStorage.setItem(THEME_STORAGE_KEY, pref) } catch {}
}
