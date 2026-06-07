import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// Production-Console-Logs muessen hinter `import.meta.env?.DEV` versteckt sein.
// Pattern wird in mehreren offenen PRs (z.B. #71, #81) eingefuehrt — diese Datei
// deckt die uebrigen Stellen ab: stores/auth.js, useAppResume.js (catch-Zweig),
// main.js SW-Register-Catch.

test('stores/auth.js dev-guards all console.error calls', async () => {
  const src = await readFile(new URL('./stores/auth.js', import.meta.url), 'utf8')
  const lines = src.split('\n')
  const offending = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.includes('console.error')) continue
    if (line.includes('import.meta.env?.DEV')) continue
    offending.push(`${i + 1}: ${line.trim()}`)
  }
  assert.equal(
    offending.length, 0,
    'unguarded console.error in auth.js:\n' + offending.join('\n')
  )
})

test('useAppResume.js guards the catch-branch console.error', async () => {
  const src = await readFile(new URL('./composables/useAppResume.js', import.meta.url), 'utf8')
  assert.match(src, /import\.meta\.env\?\.DEV.*console\.error\('onAppResume callback failed'/s)
})

test('main.js guards the service-worker register console.warn', async () => {
  const src = await readFile(new URL('./main.js', import.meta.url), 'utf8')
  assert.match(src, /import\.meta\.env\?\.DEV.*console\.warn\('SW register failed'/s)
})

test('RoadmapView.statusLabel coerces null/undefined safely', async () => {
  const src = await readFile(new URL('./views/RoadmapView.vue', import.meta.url), 'utf8')
  // Suche nach defensivem String-Cast: `String(s || ...)` oder vergleichbar
  assert.match(src, /function statusLabel\(s\)\s*\{[^}]*String\(s\s*\|\|/s)
})
