// Prüft die Migration 20261014_wochenend_bonus.sql: Truhenlimits, Halloween-
// Code, Zucht-Ei im Shop (Spiegel breeding.js) und Wochenend-Bonus
// (Spiegel weekendBoost.js) samt einmaligem Hinweis.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  WEEKEND_WEAK_SPECIES, WEEKEND_WEAK_FACTOR, WEEKEND_RARE_RARITIES, WEEKEND_RARE_FACTOR, WEEKEND_TIME_ZONE
} from './weekendBoost.js'
import { SHOP_EGG_POWER, breedCost, breedMinutes, breedWeights, BREED_TIERS } from './breeding.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(
  path.join(root, 'supabase', 'migrations', '20261014_wochenend_bonus.sql'),
  'utf8'
)

function fnBody(name) {
  const start = sql.lastIndexOf(`create or replace function public.${name}(`)
  assert.ok(start >= 0, `${name} nicht gefunden`)
  const ende = sql.indexOf('$$;', start)
  return sql.slice(start, ende)
}

const quoted = (list) => list.map(s => `'${s}'`).join(', ')

test('Truhenlimits: normal 5, Ticket 10 pro Rotation', () => {
  assert.match(sql, /update public\.chest_config set daily_limit = 5 where id = 1;/)
  assert.match(sql, /update public\.ticket_config set chest_slot_limit = 10 where id = 1;/)
})

test('Halloween-Code bringt 3 Fledermäuse, einmal pro Spieler', () => {
  assert.match(sql, /'HALLOWEEN',\s*'\{"species": "bat", "tier": "normal", "qty": 3/)
  assert.match(sql, /where not exists \(select 1 from public\.promo_codes where lower\(code\) = 'halloween'\)/)
  const insert = sql.slice(sql.indexOf("select 'HALLOWEEN'"), sql.indexOf("where not exists (select 1 from public.promo_codes"))
  assert.match(insert, /\n\s*1,\n/)
})

test('Zucht-Ei im Shop spiegelt eine Verpaarung mit SHOP_EGG_POWER', () => {
  const pool = [...sql.matchAll(/\('breeding', '(\w+)',\s*(\d+)\)/g)]
    .map(m => ({ species: m[1], weight: Number(m[2]) }))
  const expected = breedWeights(SHOP_EGG_POWER)
  const tiers = BREED_TIERS.map(t => t[0])
  // Gewicht 0 lässt egg_drop_pool nicht zu, solche Arten fehlen im Pool.
  const want = tiers.map((species, i) => ({ species, weight: expected[i] })).filter(r => r.weight > 0)
  assert.deepEqual(pool, want)
  assert.match(sql, new RegExp(`price_coins\\s+= ${breedCost(SHOP_EGG_POWER)},`))
  assert.match(sql, new RegExp(`incubation_minutes = ${breedMinutes(SHOP_EGG_POWER)},`))
  assert.match(sql, /shop_visible\s+= true/)
  assert.match(sql, /where egg_type = 'breeding';/)
})

test('Wochenend-Faktoren decken sich mit weekendBoost.js', () => {
  const factor = fnBody('_weekend_factor')
  assert.ok(factor.includes(`p_species in (${quoted(WEEKEND_WEAK_SPECIES)}) then ${WEEKEND_WEAK_FACTOR}`))
  assert.ok(factor.includes(`p_rarity in (${quoted(WEEKEND_RARE_RARITIES)}) then ${WEEKEND_RARE_FACTOR}`))
  const active = fnBody('_weekend_boost_active')
  assert.ok(active.includes(`at time zone '${WEEKEND_TIME_ZONE}') in (6, 7)`))
})

test('Truhen und Rotationen ziehen mit Wochenend-Gewicht', () => {
  for (const fn of ['buy_chest', 'ticket_chest_open']) {
    const body = fnBody(fn)
    assert.match(body, /sum\(public\._weekend_weight\(species, rarity, weight\)\)/, fn)
    assert.match(body, /select species, public\._weekend_weight\(species, rarity, weight\) as weight/, fn)
    assert.match(body, /security definer set search_path = public/, fn)
  }
  for (const fn of ['_rotate_if_needed', '_ticket_rotate_if_needed']) {
    assert.match(fnBody(fn), /1\.0 \/ public\._weekend_weight\(sc\.species, sc\.rarity, sc\.weight, slot\)/, fn)
  }
})

test('Helfer sind ungrantet, alle Funktionen pinnen den search_path', () => {
  assert.match(sql, /revoke execute on function public\._weekend_boost_active\(timestamptz\) from anon, authenticated, public/)
  assert.match(sql, /revoke execute on function public\._weekend_factor\(text, text\) from anon, authenticated, public/)
  assert.match(sql, /revoke execute on function public\._weekend_weight\(text, text, numeric, timestamptz\) from anon, authenticated, public/)
  const fns = sql.match(/create or replace function public\.\w+/g) || []
  const pins = sql.match(/set search_path = public/g) || []
  assert.equal(pins.length, fns.length)
})

test('Hinweis-Tabelle: RLS, nur eigene Zeilen, Schreiben nur per RPC', () => {
  assert.match(sql, /create table if not exists public\.player_notices/)
  assert.match(sql, /primary key \(user_id, notice_key\)/)
  assert.match(sql, /alter table public\.player_notices enable row level security/)
  assert.match(sql, /revoke all on table public\.player_notices from anon, authenticated/)
  assert.match(sql, /for select using \(\(select auth\.uid\(\)\) = user_id\)/)
  assert.doesNotMatch(sql, /grant (insert|update|delete)[^;]*player_notices/)
})

test('RPCs sind definer und nur für angemeldete Spieler', () => {
  for (const fn of ['notice_ack', 'weekend_boost_status']) {
    const body = fnBody(fn)
    assert.match(body, /security definer/, fn)
    assert.match(body, /auth\.uid\(\)/, fn)
  }
  assert.match(sql, /p_key not in \('weekend_boost'\)/)
  assert.match(sql, /revoke execute on function public\.notice_ack\(text\) from anon, public/)
  assert.match(sql, /grant execute on function public\.notice_ack\(text\) to authenticated/)
  assert.match(sql, /revoke execute on function public\.weekend_boost_status\(\) from anon, public/)
  assert.match(sql, /grant execute on function public\.weekend_boost_status\(\) to authenticated/)
})
