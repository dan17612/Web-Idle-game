import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// supabase-js ruft onAuthStateChange-Callbacks innerhalb seines Auth-Locks auf.
// Ein awaiteter Supabase-Aufruf darin wartet auf denselben Lock → Deadlock,
// danach hängt jede Anfrage (endloses Laden/Speichern).
const src = readFileSync(new URL('./stores/auth.js', import.meta.url), 'utf8')

function callbackBody() {
  const start = src.indexOf('onAuthStateChange(')
  assert.ok(start >= 0, 'onAuthStateChange nicht gefunden')
  let depth = 0
  for (let i = start + 'onAuthStateChange'.length; i < src.length; i++) {
    if (src[i] === '(') depth++
    else if (src[i] === ')' && --depth === 0) return src.slice(start, i + 1)
  }
  throw new Error('Callback-Ende nicht gefunden')
}

test('onAuthStateChange-Callback ist nicht async', () => {
  assert.doesNotMatch(callbackBody(), /onAuthStateChange\(\s*async\b/)
})

test('Supabase-Folgearbeit läuft per setTimeout außerhalb des Auth-Locks', () => {
  const body = callbackBody()
  assert.match(body, /setTimeout\(/)
  // Jeder await muss innerhalb des setTimeout-Callbacks stehen.
  const beforeTimeout = body.slice(0, body.indexOf('setTimeout('))
  assert.doesNotMatch(beforeTimeout, /\bawait\b/)
})
