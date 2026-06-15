import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('ShopView speciesList uses serverNow() for disappears comparison', async () => {
  const source = await readFile(new URL('./views/ShopView.vue', import.meta.url), 'utf8')

  assert.match(
    source,
    /const nowServer = serverNow\(\);[\s\S]*?const disappeared = disappearsAt > 0 && disappearsAt <= nowServer/,
    'disappeared check should use serverNow() to honor server clock offset',
  )
  assert.match(
    source,
    /const disappearsInMs = disappearsAt > 0 \? Math\.max\(0, disappearsAt - nowServer\)/,
    'disappearsInMs should also use serverNow()',
  )
  assert.doesNotMatch(
    source,
    /disappearsAt <= now\.value/,
    'raw client now.value must no longer be compared against server timestamps',
  )
  assert.doesNotMatch(
    source,
    /disappearsAt - now\.value/,
    'raw client now.value must no longer be used for the remaining-ms calculation',
  )
})

test('main.js guards auth-redirect console output behind DEV', async () => {
  const source = await readFile(new URL('./main.js', import.meta.url), 'utf8')

  assert.match(
    source,
    /if \(import\.meta\.env\?\.DEV\) console\.warn\('Supabase auth redirect error:'/,
  )
  assert.match(
    source,
    /if \(import\.meta\.env\?\.DEV\) console\.error\('setSession failed'/,
  )
  assert.match(
    source,
    /if \(import\.meta\.env\?\.DEV\) console\.warn\('Native app resume listener failed'/,
  )
})
