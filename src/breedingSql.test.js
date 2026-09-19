// Hält den Reward-Spiegel der Zucht dicht: Gewichtstabelle, Kosten und
// Brutzeit leben in SQL und in src/breeding.js. Der Test liest die Migrationen
// und vergleicht beide Seiten über den ganzen Wertebereich.
//
// Die Zucht liegt inzwischen in zwei Dateien: 20260919_zucht.sql legt das
// Feature an, 20260920_zucht_arten.sql tauscht Arten und Gewichte aus. Geprüft
// wird immer die jüngste Definition einer Funktion — genau das, was die
// Datenbank nach beiden Migrationen hat.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { breedWeights, breedCost, breedMinutes, BREED_TIERS, RARITY_SCORE, TIER_BONUS } from './breeding.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const lies = (datei) =>
  readFileSync(path.join(root, 'supabase', 'migrations', datei), 'utf8')

const sql = lies('20260919_zucht.sql')
const arten = lies('20260920_zucht_arten.sql')
const alles = [sql, arten].join('\n')

// Körper der jüngsten Definition einer Funktion, bis zum abschließenden $$;
function fnBody(name, quelle = alles) {
  const start = quelle.lastIndexOf(`create or replace function public.${name}(`)
  assert.ok(start >= 0, `${name} nicht gefunden`)
  const ende = quelle.indexOf('$$;', start)
  assert.ok(ende > start, `${name} nicht abgeschlossen`)
  return quelle.slice(start, ende)
}

function sqlWeightRows() {
  const body = fnBody('_breed_weights')
  return [...body.matchAll(/(?:when\s+(\d+)\s+then|else)\s*array\[([\d,\s]+)\]/g)]
    .map(m => ({
      power: m[1] === undefined ? 12 : Number(m[1]),
      w: m[2].split(',').map(x => Number(x.trim()))
    }))
}

test('die Gewichtstabelle lässt sich aus der Migration lesen', () => {
  const rows = sqlWeightRows()
  assert.equal(rows.length, 13, `erwartet 13 Zeilen, gefunden ${rows.length}`)
  for (const row of rows) assert.equal(row.w.length, 4, `Zeile ${row.power}`)
})

test('SQL-Gewichte decken sich mit breedWeights für jede Zuchtkraft', () => {
  const rows = sqlWeightRows()
  for (let p = 0; p <= 12; p += 0.5) {
    const row = rows.find(r => r.power === Math.floor(p))
    assert.ok(row, `Zuchtkraft ${p} fehlt in SQL`)
    assert.deepEqual(row.w, breedWeights(p), `Zuchtkraft ${p} weicht ab`)
  }
})

test('jede SQL-Zeile summiert auf 100', () => {
  for (const row of sqlWeightRows()) {
    const sum = row.w.reduce((a, b) => a + b, 0)
    assert.equal(sum, 100, `Zeile ${row.power} summiert auf ${sum}`)
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
  const body = fnBody('_breed_tier_species')
  BREED_TIERS.forEach((stufe, i) => {
    const m = body.match(new RegExp(`when ${i + 1} then array\\[([^\\]]+)\\]`))
    assert.ok(m, `Stufe ${i + 1} fehlt in SQL`)
    const ausSql = m[1].split(',').map(x => x.trim().replace(/'/g, ''))
    assert.deepEqual(ausSql, stufe, `Stufe ${i + 1} weicht ab`)
  })
  assert.doesNotMatch(body, new RegExp(`when ${BREED_TIERS.length + 1} then array\\['`),
    'SQL kennt eine Stufe mehr als BREED_TIERS')
})

test('der Würfel läuft über genau so viele Stufen wie BREED_TIERS', () => {
  assert.match(fnBody('_breed_roll'), new RegExp(`for i in 1\\.\\.${BREED_TIERS.length} loop`))
})

test('Seltenheits- und Stufenwerte stimmen überein', () => {
  const body = fnBody('_breed_power')
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
    assert.doesNotMatch(alles, new RegExp(`grant execute on function public\\.${helfer}`),
      `${helfer} wird gegrantet`)
  }
  assert.match(sql, /grant execute on function public\.breed_animals\(uuid, uuid\) to authenticated/)
  assert.match(sql, /revoke execute on function public\.breed_animals\(uuid, uuid\) from anon, public/)
})

test('neu ersetzte Helfer bleiben auch nach der Nachbesserung gesperrt', () => {
  for (const helfer of ['_breed_tier_species', '_breed_weights', '_breed_roll']) {
    assert.match(arten, new RegExp(`revoke execute on function public\\.${helfer}\\([^)]*\\) from anon, authenticated, public`),
      `${helfer} ist in der Nachbesserung nicht gesperrt`)
  }
})

test('alle RPCs pinnen den search_path', () => {
  for (const datei of [sql, arten]) {
    const fns = datei.match(/create or replace function public\.\w+/g) || []
    const pins = datei.match(/set search_path = public/g) || []
    assert.equal(pins.length, fns.length, `${fns.length} Funktionen, ${pins.length} gepinnt`)
  }
})

test('das Zucht-Ei ist nicht kaufbar und das Ereignis angelegt', () => {
  assert.match(sql, /'breeding', 'Zucht-Ei'/)
  assert.match(sql, /shop_visible = false/)
  assert.match(sql, /values \('breeding_game', null, null, true\)/)
})

// --- Die vier Zucht-Arten -------------------------------------------------

function artenZeilen() {
  const block = arten.slice(arten.indexOf('insert into public.species_costs'),
                            arten.indexOf('on conflict (species)'))
  return [...block.matchAll(/\('(\w+)',\s*'([^']*)',\s*'([^']*)',\s*(\d+),\s*(\d+),\s*([\d.]+),\s*(\w+),\s*(\w+),\s*(\w+),\s*'(\w+)'\)/g)]
    .map(m => ({
      species: m[1], name: m[2], emoji: m[3],
      cost: Number(m[4]), rate: Number(m[5]), weight: Number(m[6]),
      enabled: m[7] === 'true', shop_visible: m[8] === 'true',
      craft_only: m[9] === 'true', rarity: m[10]
    }))
}

test('die Migration legt genau die Arten aus BREED_TIERS an', () => {
  const zeilen = artenZeilen()
  assert.equal(zeilen.length, 4, `erwartet 4 Arten, gefunden ${zeilen.length}`)
  assert.deepEqual(zeilen.map(z => z.species), BREED_TIERS.flat())
})

// Die Truhe zieht aus "enabled and weight > 0 and not craft_only", der Shop
// über buy_animal aus craft_only. species_costs erzwingt weight > 0, deshalb
// hängt der Ausschluss an enabled und craft_only, nicht am Gewicht.
test('keine Zucht-Art ist kaufbar, sichtbar oder in der Truhe', () => {
  for (const z of artenZeilen()) {
    assert.ok(!z.enabled, `${z.species} steht in der Shop-Rotation`)
    assert.ok(!z.shop_visible, `${z.species} ist im Shop sichtbar`)
    assert.ok(z.craft_only, `${z.species} blockt buy_animal nicht`)
  }
})

// Der Kern der Balance-Vorgabe: genau ein Tier überholt das Spiel, und knapp.
test('nur die oberste Stufe schlägt das stärkste Tier des Spiels', () => {
  const BESTES_IM_SPIEL = 14_000_000 // Weltenschildkröte, Craft-Endgame
  const zeilen = artenZeilen()
  const oberste = zeilen.at(-1)

  for (const z of zeilen.slice(0, -1)) {
    assert.ok(z.rate < BESTES_IM_SPIEL,
      `${z.species} (${z.rate}) überholt das stärkste Tier`)
  }
  assert.ok(oberste.rate > BESTES_IM_SPIEL, 'die oberste Stufe lohnt sich nicht')
  assert.ok(oberste.rate <= BESTES_IM_SPIEL * 1.15,
    `${oberste.species} ist mit ${oberste.rate} mehr als 15% besser`)
})

test('kein Zucht-Tier unter der obersten Stufe schlägt das beste Shop-Tier', () => {
  const BESTES_IM_SHOP = 4_000_000 // Mammut
  for (const z of artenZeilen().slice(0, -1)) {
    assert.ok(z.rate < BESTES_IM_SHOP,
      `${z.species} (${z.rate}) überholt das Mammut`)
  }
})

test('Rate und Freilass-Wert steigen gemeinsam', () => {
  const zeilen = artenZeilen()
  for (let i = 1; i < zeilen.length; i++) {
    assert.ok(zeilen[i].rate > zeilen[i - 1].rate,
      `${zeilen[i].species} bringt nicht mehr als ${zeilen[i - 1].species}`)
    assert.ok(zeilen[i].cost > zeilen[i - 1].cost,
      `${zeilen[i].species} ist nicht teurer als ${zeilen[i - 1].species}`)
    const vorher = zeilen[i - 1].cost / zeilen[i - 1].rate
    const jetzt = zeilen[i].cost / zeilen[i].rate
    assert.ok(jetzt >= vorher,
      `${zeilen[i].species} amortisiert schneller als ${zeilen[i - 1].species}`)
  }
})

test('die Seltenheit passt zur Zuchtkraft-Leiter', () => {
  const zeilen = artenZeilen()
  for (let i = 1; i < zeilen.length; i++) {
    assert.ok(RARITY_SCORE[zeilen[i].rarity] >= RARITY_SCORE[zeilen[i - 1].rarity],
      `${zeilen[i].species} ist seltener eingestuft als die Stufe darüber`)
  }
})
