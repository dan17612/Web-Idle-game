import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  isHalloweenSeason, normalizeHalloweenPref, halloweenDecorActive,
  DECOR_ITEMS, countDecor
} from './halloween.js'

const at = (y, m, d) => new Date(y, m - 1, d, 12)

test('Saison: 1. Oktober bis 8. November', () => {
  assert.equal(isHalloweenSeason(at(2026, 9, 30)), false)
  assert.equal(isHalloweenSeason(at(2026, 10, 1)), true)
  assert.equal(isHalloweenSeason(at(2026, 10, 31)), true)
  assert.equal(isHalloweenSeason(at(2026, 11, 8)), true)
  assert.equal(isHalloweenSeason(at(2026, 11, 9)), false)
  assert.equal(isHalloweenSeason(at(2027, 10, 15)), true, 'jedes Jahr wieder')
  assert.equal(isHalloweenSeason('kein Datum'), false)
})

test('Präferenz: an ist Standard, nur "off" schaltet ab', () => {
  assert.equal(normalizeHalloweenPref(null), 'on')
  assert.equal(normalizeHalloweenPref('quatsch'), 'on')
  assert.equal(normalizeHalloweenPref('off'), 'off')
  assert.equal(halloweenDecorActive(null, at(2026, 10, 8)), true)
  assert.equal(halloweenDecorActive('off', at(2026, 10, 8)), false)
  assert.equal(halloweenDecorActive('on', at(2026, 12, 24)), false)
})

test('Deko: deutlich mehr Kürbisse als Skelette', () => {
  const pumpkins = countDecor(DECOR_ITEMS, 'pumpkin')
  const skulls = countDecor(DECOR_ITEMS, 'skull')
  assert.ok(skulls <= 1, `${skulls} Totenköpfe`)
  assert.ok(pumpkins >= skulls * 3 && pumpkins > skulls, `${pumpkins} Kürbisse vs. ${skulls} Totenköpfe`)
})

test('Deko: jedes Element hat Art, Modus und passende Position', () => {
  const kinds = new Set(['bat', 'ghost', 'leaf', 'pumpkin', 'skull', 'candy'])
  for (const item of DECOR_ITEMS) {
    assert.ok(kinds.has(item.kind), item.kind)
    assert.ok(item.size > 0)
    if (item.mode === 'fly') assert.ok(item.top >= 0 && item.top <= 100 && item.dur > 0)
    else if (item.mode === 'fall') assert.ok(item.left >= 0 && item.left <= 100 && item.dur > 0)
    else {
      assert.equal(item.mode, 'side')
      assert.ok(['left', 'right'].includes(item.side))
    }
  }
})

test('Auch die Kürbis-Deko in App und Startseite überwiegt die Skelette', () => {
  // Zählt die Deko-Emoji in den Vorlagen, die nur in der Saison sichtbar sind.
  const files = ['src/App.vue', 'src/views/GameView.vue', 'src/components/HalloweenDecor.vue']
  let pumpkins = 0
  let skulls = 0
  for (const file of files) {
    const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
    const template = src.slice(src.indexOf('<template>'), src.lastIndexOf('</template>'))
    pumpkins += (template.match(/🎃/g) || []).length
    skulls += (template.match(/💀|☠/g) || []).length
  }
  assert.ok(pumpkins >= 5, `nur ${pumpkins} Kürbisse in den Vorlagen`)
  assert.ok(pumpkins > skulls * 3, `${pumpkins} Kürbisse vs. ${skulls} Skelette`)
})
