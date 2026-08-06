import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('equipBestAnimals uses Promise.allSettled and reloads on partial failure', async () => {
  const src = await readFile(new URL('./stores/game.js', import.meta.url), 'utf8')

  const fnMatch = src.match(/async equipBestAnimals\(\)\s*\{[\s\S]*?\n\s{4}\},/)
  assert.ok(fnMatch, 'equipBestAnimals function block found')
  const body = fnMatch[0]

  assert.match(body, /Promise\.allSettled\(toUnequip\.map/, 'unequip uses Promise.allSettled')
  assert.match(body, /Promise\.allSettled\(toEquip\.map/, 'equip uses Promise.allSettled')
  assert.doesNotMatch(body, /await Promise\.all\(/, 'no more Promise.all in this function')
  assert.match(body, /failures\.length > 0/, 'aggregates failures')
  assert.match(body, /this\.load\(\)/, 'reloads state when something failed')
  assert.match(body, /throw failures\[0\]\.reason/, 'rethrows so caller can react')
})

test('loadProfile retries once on transient supabase errors', async () => {
  const src = await readFile(new URL('./stores/auth.js', import.meta.url), 'utf8')

  const fnMatch = src.match(/async loadProfile\(\)\s*\{[\s\S]*?\n\s{4}\},/)
  assert.ok(fnMatch, 'loadProfile function block found')
  const body = fnMatch[0]

  assert.match(body, /for \(let attempt = 0; attempt < 2; attempt\+\+\)/, 'has retry loop with 2 attempts')
  assert.match(body, /if \(!error\) break/, 'breaks on success')
  assert.match(body, /setTimeout\(r, 400\)/, 'waits 400ms between attempts')
  assert.match(body, /import\.meta\.env\?\.DEV/, 'production console is DEV-guarded')
  assert.doesNotMatch(body, /console\.error\(error\)/, 'no unguarded console.error remains')
})

test('GameView caps the floats array to defend against runaway state', async () => {
  const src = await readFile(new URL('./views/GameView.vue', import.meta.url), 'utf8')

  assert.match(src, /floats\.value\.length > 50/, 'caps floats.value at 50 entries')
  assert.match(src, /floats\.value\.splice\(0, floats\.value\.length - 50\)/, 'drops oldest entries when over the cap')
})
