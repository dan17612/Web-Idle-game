import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// Diese Tests verifizieren, dass Toast/Status-Timer in Views/Components nicht
// als "fire-and-forget" setTimeout angelegt sind, sondern getrackt und beim
// Unmount gecleart werden. Ohne Cleanup würde
//   1) eine schnelle zweite Aktion durch den Timer der ersten verkürzt
//      (Stale-Toast-Race) und
//   2) der Timer beim Verlassen der Seite weiterlaufen und auf eine
//      unmounted Component schreiben.

test('TicketsView trackt Release-/Shop-Toast-Timer und cleart sie beim Unmount', async () => {
  const src = await readFile(new URL('./views/TicketsView.vue', import.meta.url), 'utf8')

  // Helper-Funktionen ersetzen die alten unkontrollierten setTimeouts
  assert.match(src, /scheduleReleaseToastClear\(\)/)
  assert.match(src, /scheduleShopToastClear\(\)/)

  // Vorheriger Timer wird vor neuem setTimeout gecleart
  assert.match(
    src,
    /releaseToastTimer\s*=\s*null[\s\S]*?function\s+scheduleReleaseToastClear[\s\S]*?clearTimeout\(releaseToastTimer\)[\s\S]*?setTimeout/
  )
  assert.match(
    src,
    /shopToastTimer\s*=\s*null[\s\S]*?function\s+scheduleShopToastClear[\s\S]*?clearTimeout\(shopToastTimer\)[\s\S]*?setTimeout/
  )

  // onUnmounted cleart beide Timer
  assert.match(src, /onUnmounted\(\(\) => \{[\s\S]*?clearTimeout\(releaseToastTimer\)[\s\S]*?\}\)/)
  assert.match(src, /onUnmounted\(\(\) => \{[\s\S]*?clearTimeout\(shopToastTimer\)[\s\S]*?\}\)/)

  // Keine ungetrackten setTimeouts mehr für die Toast-Variablen
  assert.doesNotMatch(src, /setTimeout\(\s*\(\)\s*=>\s*\(releaseSuccess\.value\s*=\s*""\)/)
  assert.doesNotMatch(src, /setTimeout\(\s*\(\)\s*=>\s*\(releaseError\.value\s*=\s*""\)/)
  assert.doesNotMatch(src, /setTimeout\(\s*\(\)\s*=>\s*\(shopSuccess\.value\s*=\s*""\)/)
  assert.doesNotMatch(src, /setTimeout\(\s*\(\)\s*=>\s*\(shopError\.value\s*=\s*""\)/)
})

test('SettingsView trackt flash()-Timer und cleart ihn beim Unmount', async () => {
  const src = await readFile(new URL('./views/SettingsView.vue', import.meta.url), 'utf8')

  // Vorheriger Timer wird gecleart, neuer aufgesetzt
  assert.match(src, /flashTimer\s*=\s*null/)
  assert.match(src, /if\s*\(flashTimer\)\s*clearTimeout\(flashTimer\)/)
  assert.match(src, /flashTimer\s*=\s*setTimeout\(/)

  // onUnmounted cleart den Timer
  assert.match(src, /onUnmounted\(\(\)\s*=>\s*\{[\s\S]*?clearTimeout\(flashTimer\)[\s\S]*?\}\)/)

  // onUnmounted ist auch importiert
  assert.match(src, /import\s*\{[^}]*onUnmounted[^}]*\}\s*from\s*['"]vue['"]/)
})

test('SupportModal trackt sendError-Timer und cleart ihn beim Unmount', async () => {
  const src = await readFile(new URL('./components/SupportModal.vue', import.meta.url), 'utf8')

  assert.match(src, /sendErrorTimer\s*=\s*null/)
  assert.match(src, /sendErrorTimer\s*=\s*setTimeout\(/)
  assert.match(src, /onUnmounted\(\(\)\s*=>\s*\{[\s\S]*?clearTimeout\(sendErrorTimer\)[\s\S]*?\}\)/)
  assert.match(src, /import\s*\{[^}]*onUnmounted[^}]*\}\s*from\s*['"]vue['"]/)
})
