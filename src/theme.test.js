import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  THEME_OPTIONS, THEME_STORAGE_KEY, THEME_COLORS, DARK_CLASS,
  normalizeThemePref, resolveTheme,
} from './theme.js'
import { setLocale, t } from './i18n.js'

test('normalizeThemePref fällt bei Unbekanntem auf system zurück', () => {
  assert.equal(normalizeThemePref('dark'), 'dark')
  assert.equal(normalizeThemePref('light'), 'light')
  assert.equal(normalizeThemePref('system'), 'system')
  assert.equal(normalizeThemePref(null), 'system')
  assert.equal(normalizeThemePref('purple'), 'system')
})

test('resolveTheme folgt bei system der OS-Einstellung', () => {
  assert.equal(resolveTheme('system', true), 'dark')
  assert.equal(resolveTheme('system', false), 'light')
  assert.equal(resolveTheme('dark', false), 'dark')
  assert.equal(resolveTheme('light', true), 'light')
  assert.equal(resolveTheme(undefined, true), 'dark')
})

test('Theme-Farben passen zu --bg in styles.css', async () => {
  const css = await readFile(new URL('./styles.css', import.meta.url), 'utf8')
  const light = css.match(/:root\s*\{[^}]*--bg:\s*(#[0-9a-f]{6})/i)
  const dark = css.match(/html\.app-dark\s*\{[^}]*--bg:\s*(#[0-9a-f]{6})/i)
  assert.ok(light && dark, 'Token-Blöcke gefunden')
  assert.equal(light[1].toLowerCase(), THEME_COLORS.light)
  assert.equal(dark[1].toLowerCase(), THEME_COLORS.dark)
  assert.equal(DARK_CLASS, 'app-dark')
})

test('index.html setzt das Schema vor dem ersten Paint mit demselben Key', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
  assert.ok(html.includes(`'${THEME_STORAGE_KEY}'`), 'Storage-Key gespiegelt')
  assert.ok(html.includes(`'${DARK_CLASS}'`), 'Dark-Klasse gespiegelt')
  assert.ok(html.includes(THEME_COLORS.dark), 'Dark-Theme-Color gespiegelt')
  // Pre-Paint-Script muss vor dem App-Bundle laufen.
  assert.ok(html.indexOf(DARK_CLASS) < html.indexOf('/src/main.js'))
})

test('PrimeVue nutzt dieselbe Dark-Klasse', async () => {
  const main = await readFile(new URL('./main.js', import.meta.url), 'utf8')
  assert.match(main, /darkModeSelector:\s*['"]\.app-dark['"]/)
})

test('Settings bieten die Theme-Auswahl in allen Sprachen', async () => {
  const view = await readFile(new URL('./views/SettingsView.vue', import.meta.url), 'utf8')
  assert.match(view, /settings\.themeTitle/)
  assert.match(view, /setThemePreference/)
  for (const locale of ['de', 'en', 'ru']) {
    setLocale(locale)
    for (const key of ['themeTitle', 'themeHint', 'themeSaved']) {
      assert.notEqual(t(`settings.${key}`), `settings.${key}`, `${locale}: ${key}`)
    }
    for (const opt of THEME_OPTIONS) {
      assert.notEqual(t(`themes.${opt}`), `themes.${opt}`, `${locale}: themes.${opt}`)
    }
  }
  setLocale('de')
})
