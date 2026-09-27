// Farbschema (Hell / Dunkel im Discord-Look / System) — reine Logik.
// DOM-Anbindung: src/composables/useTheme.js, Pre-Paint-Spiegel: index.html.

export const THEME_STORAGE_KEY = 'zoo.theme'
export const THEME_OPTIONS = ['system', 'light', 'dark']
// Klasse auf <html>; PrimeVue nutzt sie als darkModeSelector.
export const DARK_CLASS = 'app-dark'
// Browser-/Statusleisten-Farbe = --bg des jeweiligen Schemas.
export const THEME_COLORS = { light: '#fdf2d9', dark: '#313338' }

export function normalizeThemePref(value) {
  return THEME_OPTIONS.includes(value) ? value : 'system'
}

export function resolveTheme(pref, systemPrefersDark) {
  const p = normalizeThemePref(pref)
  if (p === 'system') return systemPrefersDark ? 'dark' : 'light'
  return p
}
