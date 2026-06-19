import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// Diese Tests verifizieren, dass BossFight.vue Server-Offset-aware ist und den
// autoStart-Timer nach onUnmounted aufraeumt. Beides war zuvor nicht der Fall:
//   - fightDurationMs nutzte rohes Date.now(), wodurch im Endless-Modus die
//     angezeigte Restzeit vor Kampfbeginn um serverOffset abweichen konnte.
//   - der 50ms-setTimeout im onMounted war ungetrackt und konnte
//     startBossFight() nach Unmount aufrufen.

test('BossFight.fightDurationMs nutzt Date.now() + game.serverOffset', async () => {
  const src = await readFile(new URL('./components/BossFight.vue', import.meta.url), 'utf8')
  assert.match(
    src,
    /Number\(props\.endlessEndsAt\)\s*-\s*\(Date\.now\(\)\s*\+\s*game\.serverOffset\)/
  )
  // sicherstellen, dass kein rohes Date.now() mehr in der Endless-Restzeit steht
  assert.doesNotMatch(
    src,
    /Number\(props\.endlessEndsAt\)\s*-\s*Date\.now\(\)\s*\)/
  )
})

test('BossFight trackt autoStart-Timer und cleart ihn beim Unmount', async () => {
  const src = await readFile(new URL('./components/BossFight.vue', import.meta.url), 'utf8')
  assert.match(src, /let\s+autoStartTimer\s*=\s*null/)
  assert.match(src, /autoStartTimer\s*=\s*setTimeout\(/)
  assert.match(src, /onUnmounted\(\(\)\s*=>\s*\{[\s\S]*?clearTimeout\(autoStartTimer\)[\s\S]*?\}\)/)
})
