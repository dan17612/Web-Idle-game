import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// Diese Tests verifizieren, dass MemoryOnlineView.vue und memoryOnline.js keine
// hartkodierten 'Fehler'-Strings mehr im Error-Handling haben. Vor diesem Fix
// sahen Russen/Engländer 'Fehler' als Toast-Nachricht, wenn:
//   - die Edge-Function memory-online ohne nutzbare Fehlerdetails fehlschlug
//     (pickFnError-Fallback)
//   - der Edge-Function-Aufruf einen Error ohne message warf
//     (`e?.message || 'Fehler'` an 7 Stellen)
//
// Analog zu PR #79, der das gleiche Pattern in MemoryGameView.vue gefixt hat.

test('memoryOnline.pickFnError gibt leeren String als Fallback statt hartkodiertem Fehler', async () => {
  const src = await readFile(new URL('./memoryOnline.js', import.meta.url), 'utf8')
  // Keine 'Fehler' / "Fehler" mehr im Return-Pfad (nur noch im erklärenden Kommentar)
  const codeOnly = src.split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n')
  assert.doesNotMatch(codeOnly, /return\s+['"]Fehler['"]/)
  assert.match(src, /return\s+['"]['"]/)
})

test('MemoryOnlineView nutzt tx("error") statt hartkodiertem "Fehler" im Catch', async () => {
  const src = await readFile(new URL('./views/MemoryOnlineView.vue', import.meta.url), 'utf8')

  // 'error'-Key existiert in allen drei Locales des lokalen I18N-Objekts
  assert.match(src, /error:\s*'Fehler'/)
  assert.match(src, /error:\s*'Error'/)
  assert.match(src, /error:\s*'Ошибка'/)

  // Alle Catch-Handler nutzen den lokalisierten Fallback
  assert.match(src, /e\?\.message\s*\|\|\s*tx\(['"]error['"]\)/)

  // Keine ungeschützten || 'Fehler' Stellen mehr (Dict-Eintrag wird vor dem
  // Strippen gefiltert, damit der Test nicht versehentlich darauf matched)
  const stripped = src.replace(/error:\s*'Fehler'/g, '')
  assert.doesNotMatch(stripped, /\|\|\s*['"]Fehler['"]/)
})
