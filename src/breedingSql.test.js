// Hält den Reward-Spiegel der Zucht dicht: Gewichtstabelle, Kosten und
// Brutzeit leben in SQL und in src/breeding.js. Der Test liest die Migration
// und vergleicht beide Seiten über den ganzen Wertebereich.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { breedWeights, breedCost, breedMinutes, BREED_TIERS, RARITY_SCORE, TIER_BONUS } from './breeding.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(
  path.join(root, 'supabase', 'migrations', '20260919_zucht.sql'),
  'utf8'
)

function sqlWeightRows() {
  const body = sql.slice(sql.indexOf('function public._breed_weights'))
  return [...body.matchAll(/(?:<=\s*(\d+)\s*then|else)\s*array\[([\d,\s]+)\]/g)]
    .map(m => ({
      upTo: m[1] === undefined ? 12 : Number(m[1]),
      w: m[2].split(',').map(x => Number(x.trim()))
    }))
}

test('die Gewichtstabelle lässt sich aus der Migration lesen', () => {
  const rows = sqlWeightRows()
  assert.equal(rows.length, 5, `erwartet 5 Zeilen, gefunden ${rows.length}`)
  for (const row of rows) assert.equal(row.w.length, 5)
})

test('SQL-Gewichte decken sich mit breedWeights für jede Zuchtkraft', () => {
  const rows = sqlWeightRows()
  for (let p = 0; p <= 12; p += 0.5) {
    const row = rows.find(r => Math.floor(p) <= r.upTo) || rows[rows.length - 1]
    assert.deepEqual(row.w, breedWeights(p), `Zuchtkraft ${p} weicht ab`)
  }
})

test('jede SQL-Zeile summiert auf 100', () => {
  for (const row of sqlWeightRows()) {
    const sum = row.w.reduce((a, b) => a + b, 0)
    assert.equal(sum, 100, `Zeile bis ${row.upTo} summiert auf ${sum}`)
  }
})

test('Kostenformel steht in beiden Sprachen gleich', () => {
  const m = sql.match(/floor\((\d+) \* \(least\(12, greatest\(0, p_power\)\) \+ 1\) \^ 2\)/)
  assert.ok(m, 'Kostenformel nicht gefunden')
  const faktor = Number(m[1])
  for (let p = 0; p <= 12; p++) {
    assert.equal(Math.floor(faktor * (p + 1) ** 2), breedCost(p), `Kosten bei ${p}`)
  }
})

test('Brutzeit steht in beiden Sprachen gleich', () => {
  const m = sql.match(/round\((\d+) \+ least\(12, greatest\(0, p_power\)\) \* (\d+)\)/)
  assert.ok(m, 'Zeitformel nicht gefunden')
  const [, basis, faktor] = m.map(Number)
  for (let p = 0; p <= 12; p++) {
    assert.equal(Math.round(basis + p * faktor), breedMinutes(p), `Zeit bei ${p}`)
  }
})

test('die Stufen-Arten stimmen mit BREED_TIERS überein', () => {
  const body = sql.slice(sql.indexOf('function public._breed_tier_species'))
  BREED_TIERS.forEach((arten, i) => {
    const m = body.match(new RegExp(`when ${i + 1} then array\\[([^\\]]+)\\]`))
    assert.ok(m, `Stufe ${i + 1} fehlt in SQL`)
    const ausSql = m[1].split(',').map(x => x.trim().replace(/'/g, ''))
    assert.deepEqual(ausSql, arten, `Stufe ${i + 1} weicht ab`)
  })
})

test('Seltenheits- und Stufenwerte stimmen überein', () => {
  const body = sql.slice(sql.indexOf('function public._breed_power'))
  for (const [rarity, score] of Object.entries(RARITY_SCORE)) {
    if (score === 0) continue
    assert.match(body, new RegExp(`when '${rarity}'\\s+then ${score}`), `${rarity} weicht ab`)
  }
  for (const [tier, bonus] of Object.entries(TIER_BONUS)) {
    if (bonus === 0) continue
    assert.match(body, new RegExp(`when '${tier}'\\s+then ${bonus}`), `Stufe ${tier} weicht ab`)
  }
})

test('breed_animals prüft Ereignis, Besitz, Abklingzeit und Guthaben', () => {
  const fn = sql.slice(sql.indexOf('function public.breed_animals'))
  assert.match(fn, /event_is_active\('breeding_game'\) then raise exception 'event ended'/)
  assert.match(fn, /p_a = p_b then raise exception 'need two different animals'/)
  assert.match(fn, /owner_id <> uid or b\.owner_id <> uid/)
  assert.match(fn, /breeding_until[^;]*> now\(\)[\s\S]{0,120}raise exception 'animal still breeding'/)
  assert.match(fn, /coins >= v_cost/)
  assert.match(fn, /raise exception 'insufficient coins'/)
})

test('die Auszahlung steht hinter jeder Prüfung', () => {
  const fn = sql.slice(sql.indexOf('function public.breed_animals'))
  const gate = fn.indexOf('event_is_active')
  const abbuchung = fn.indexOf('update public.profiles')
  const ei = fn.indexOf('insert into public.player_eggs')
  assert.ok(gate < abbuchung, 'Gating steht nach der Abbuchung')
  assert.ok(abbuchung < ei, 'Ei entsteht vor der Abbuchung')
})

test('das Zucht-Ergebnis steht beim Verpaaren fest, nicht beim Brüten', () => {
  const inc = sql.slice(sql.indexOf('function public.start_incubation'))
  assert.match(inc, /if egg\.bred_species is not null then/)
  assert.match(inc, /picked_species := egg\.bred_species/)
  assert.match(inc, /minutes := coalesce\(egg\.bred_minutes, et\.incubation_minutes\)/)
})

test('Helfer bleiben intern, RPCs nur für authenticated', () => {
  for (const helfer of ['_breed_power', '_breed_cost', '_breed_minutes',
                        '_breed_weights', '_breed_tier_species', '_breed_roll']) {
    assert.match(sql, new RegExp(`revoke execute on function public\\.${helfer}\\([^)]*\\) from anon, authenticated, public`),
      `${helfer} ist nicht gesperrt`)
    assert.doesNotMatch(sql, new RegExp(`grant execute on function public\\.${helfer}`),
      `${helfer} wird gegrantet`)
  }
  assert.match(sql, /grant execute on function public\.breed_animals\(uuid, uuid\) to authenticated/)
  assert.match(sql, /revoke execute on function public\.breed_animals\(uuid, uuid\) from anon, public/)
})

test('alle RPCs pinnen den search_path', () => {
  const fns = sql.match(/create or replace function public\.\w+/g) || []
  const pins = sql.match(/set search_path = public/g) || []
  assert.equal(pins.length, fns.length, `${fns.length} Funktionen, ${pins.length} gepinnt`)
})

test('das Zucht-Ei ist nicht kaufbar und das Ereignis angelegt', () => {
  assert.match(sql, /'breeding', 'Zucht-Ei'/)
  assert.match(sql, /shop_visible = false/)
  assert.match(sql, /values \('breeding_game', null, null, true\)/)
})
