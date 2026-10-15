// Prüft 20261015_zucht_ei_boost.sql: Zucht-Eier merken sich ihre Zuchtkraft,
// Altbestand wird aus der Brutzeit zurückgerechnet (Spiegel breedMinutes),
// breed_animals behält alle Prüfungen.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { breedMinutes, SHOP_EGG_WEIGHTS, BREED_TIERS } from './breeding.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(
  path.join(root, 'supabase', 'migrations', '20261015_zucht_ei_boost.sql'),
  'utf8'
)

const shopSql = readFileSync(
  path.join(root, 'supabase', 'migrations', '20261015_shop_zucht_ei_alle_arten.sql'),
  'utf8'
)

const breed = sql.slice(sql.indexOf('create or replace function public.breed_animals('))

test('player_eggs bekommt bred_power ohne drop', () => {
  assert.match(sql, /alter table public\.player_eggs add column if not exists bred_power numeric;/)
  assert.doesNotMatch(sql, /\bdrop\b/i)
})

test('Rückrechnung aus bred_minutes trifft jede halbe Zuchtkraft', () => {
  assert.match(sql, /round\(\(bred_minutes - 30\) \/ 15\.0 \* 2\) \/ 2/)
  assert.match(sql, /where bred_species is not null\s+and bred_minutes is not null\s+and bred_power is null/)
  for (let p = 0; p <= 12; p += 0.5) {
    const back = Math.min(12, Math.max(0, Math.round((breedMinutes(p) - 30) / 15 * 2) / 2))
    assert.equal(back, p, `Zuchtkraft ${p} wird zu ${back}`)
  }
})

test('breed_animals speichert die Zuchtkraft am Ei', () => {
  assert.match(breed, /insert into public\.player_eggs\(owner_id, egg_type, bred_species, bred_minutes, bred_power\)/)
  assert.match(breed, /values \(uid, 'breeding', v_species, v_minutes, v_power\)/)
})

test('breed_animals behält Prüfungen und Reihenfolge', () => {
  assert.match(breed, /security definer set search_path = public/)
  assert.match(breed, /event_is_active\('breeding_game'\) then raise exception 'event ended'/)
  assert.match(breed, /owner_id <> uid or b\.owner_id <> uid/)
  assert.match(breed, /raise exception 'animal still breeding'/)
  assert.match(breed, /coins >= v_cost/)
  assert.ok(breed.indexOf('update public.profiles') < breed.indexOf('insert into public.player_eggs'))
})

test('Grants: nur authenticated', () => {
  assert.match(sql, /grant execute on function public\.breed_animals\(uuid, uuid\) to authenticated;/)
  assert.match(sql, /revoke execute on function public\.breed_animals\(uuid, uuid\) from anon, public;/)
})

test('Shop-Zucht-Ei: alle Zucht-Arten, Pool spiegelt SHOP_EGG_WEIGHTS', () => {
  const pool = Object.fromEntries([...shopSql.matchAll(/\('breeding', '(\w+)',\s*(\d+)\)/g)]
    .map(m => [m[1], Number(m[2])]))
  assert.deepEqual(pool, SHOP_EGG_WEIGHTS)
  assert.deepEqual(Object.keys(pool).sort(), BREED_TIERS.flat().sort(), 'jede Zucht-Art im Shop-Pool')
  assert.match(shopSql, /on conflict \(egg_type, species\) do update set weight = excluded\.weight;/)
})

test('Shop-Zucht-Ei: seltenste Art 0,5 %, alle Gewichte positiv', () => {
  const total = Object.values(SHOP_EGG_WEIGHTS).reduce((a, b) => a + b, 0)
  assert.equal(total, 200)
  assert.equal(SHOP_EGG_WEIGHTS.brachiosaurus / total, 0.005)
  for (const [sp, w] of Object.entries(SHOP_EGG_WEIGHTS)) {
    assert.ok(Number.isInteger(w) && w > 0, `${sp}: ${w}`)
  }
})
