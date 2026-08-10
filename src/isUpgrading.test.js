import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// Diese Tests verifizieren, dass animals.isUpgrading() einen optionalen
// 'now'-Parameter akzeptiert und die kritischen Pinia-Getter ihn mit
// Server-Offset versorgen. Ohne Offset waren Tiere bei abweichender
// Client-Uhr noch 'upgrading', obwohl der Server sie bereits freigegeben
// hatte - mit Folge: ratePerSec/baseRate ignorieren das Tier weiterhin und
// equipBestAnimals laesst es im Inventar liegen.
//
// Wir testen ueber Source-Pattern (statt direkten Import), weil animals.js
// die Vue-/Supabase-Toolchain mitzieht und ausserhalb von Vite nicht
// ausgefuehrt werden kann.

test('isUpgrading akzeptiert optionalen now-Parameter (default Date.now())', async () => {
  const src = await readFile(new URL('./animals.js', import.meta.url), 'utf8')
  assert.match(
    src,
    /export function isUpgrading\(\s*a\s*,\s*now\s*=\s*Date\.now\(\)\s*\)/
  )
  // Vergleich gegen den Parameter, nicht gegen ein neues Date.now()
  assert.match(
    src,
    /return new Date\(a\.upgrade_ready_at\)\.getTime\(\)\s*>\s*now/
  )
})

test('game-store ratePerSec/baseRate/equipBestAnimals reichen serverOffset an isUpgrading durch', async () => {
  const src = await readFile(new URL('./stores/game.js', import.meta.url), 'utf8')

  // baseRate: Variable 'now' aus state.serverOffset, an isUpgrading durchgereicht
  assert.match(
    src,
    /baseRate\(state\)\s*\{[\s\S]*?const now\s*=\s*Date\.now\(\)\s*\+\s*state\.serverOffset[\s\S]*?isUpgrading\(a,\s*now\)/
  )

  // ratePerSec: gleiche Logik
  assert.match(
    src,
    /ratePerSec\(state\)\s*\{[\s\S]*?const now\s*=\s*Date\.now\(\)\s*\+\s*state\.serverOffset[\s\S]*?isUpgrading\(a,\s*now\)/
  )

  // favoriteBoostActive: ebenfalls
  assert.match(
    src,
    /favoriteBoostActive\(state\)\s*\{[\s\S]*?Date\.now\(\)\s*\+\s*state\.serverOffset[\s\S]*?isUpgrading\(fav,\s*now\)/
  )

  // rateForAnimal: inline mit state.serverOffset
  assert.match(
    src,
    /rateForAnimal\(state\)\s*\{[\s\S]*?isUpgrading\(a,\s*Date\.now\(\)\s*\+\s*state\.serverOffset\)/
  )

  // equipBestAnimals (Action): nutzt this.serverOffset
  assert.match(
    src,
    /equipBestAnimals\([^)]*\)\s*\{[\s\S]*?const now\s*=\s*Date\.now\(\)\s*\+\s*this\.serverOffset[\s\S]*?isUpgrading\(a,\s*now\)/
  )

  // Keine ungeschuetzten isUpgrading(a)-Aufrufe ohne Offset-Argument mehr im Store
  assert.doesNotMatch(src, /\bisUpgrading\(\s*a\s*\)/)
  assert.doesNotMatch(src, /\bisUpgrading\(\s*fav\s*\)/)
})

test('AdminModal disappearsAt rechnet Date.now() + game.serverOffset', async () => {
  const src = await readFile(new URL('./components/AdminModal.vue', import.meta.url), 'utf8')
  assert.match(src, /import\s*\{\s*useGameStore\s*\}\s*from\s*['"]\.\.\/stores\/game['"]/)
  assert.match(
    src,
    /new Date\(\s*Date\.now\(\)\s*\+\s*game\.serverOffset\s*\+\s*days\s*\*\s*86400000\s*\)\.toISOString\(\)/
  )
})

test('MemoryGameView trackt showFlash-Timer und nutzt tx("error") statt hartkodiertem "Fehler"', async () => {
  const src = await readFile(new URL('./views/MemoryGameView.vue', import.meta.url), 'utf8')

  // showFlash trackt einen Timer und clear'd alte vor neuem setTimeout
  assert.match(src, /let\s+flashTimer\s*=\s*null/)
  assert.match(src, /if\s*\(flashTimer\)\s*clearTimeout\(flashTimer\)/)
  assert.match(src, /flashTimer\s*=\s*setTimeout\(/)

  // onUnmounted cleart den Timer
  assert.match(
    src,
    /onUnmounted\(\(\)\s*=>\s*\{[\s\S]*?clearTimeout\(flashTimer\)[\s\S]*?\}\)/
  )

  // 'error'-Key existiert in allen drei Locales
  assert.match(src, /error:\s*'Fehler'/)
  assert.match(src, /error:\s*'Error'/)
  assert.match(src, /error:\s*'Ошибка'/)

  // tx('error') wird statt hartkodiertem 'Fehler' genutzt
  assert.match(src, /e\?\.message\s*\|\|\s*tx\(['"]error['"]\)/)
  // Keine ungeschuetzten || 'Fehler' Stellen mehr (ausser im de-Dictionary)
  const stripped = src.replace(/error:\s*'Fehler'/g, '')
  assert.doesNotMatch(stripped, /\|\|\s*['"]Fehler['"]/)
})
