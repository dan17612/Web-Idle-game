import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { EGG_SLOTS } from './eggSlots.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(
  path.join(root, 'supabase', 'migrations', '20260927_eier_zwei_brutplaetze.sql'),
  'utf8'
)
const fn = (name) => {
  const start = sql.indexOf(`function public.${name}(`)
  assert.ok(start >= 0, `${name} fehlt`)
  return sql.slice(start, sql.indexOf('end $$;', start))
}

test('Platzanzahl in SQL spiegelt EGG_SLOTS', () => {
  assert.equal(EGG_SLOTS, 2)
  assert.match(sql, new RegExp(`check \\(slot between 1 and ${EGG_SLOTS}\\)`))
  assert.match(fn('start_incubation'), new RegExp(`generate_series\\(1, ${EGG_SLOTS}\\)`))
  assert.match(fn('get_incubation_status'), new RegExp(`'max_slots', ${EGG_SLOTS}`))
})

test('ein Datensatz pro Spieler und Platz, RLS bleibt an', () => {
  assert.match(sql, /add column if not exists slot smallint not null default 1/)
  assert.match(sql, /primary key \(user_id, slot\)/)
  assert.match(sql, /alter table public\.egg_incubations enable row level security/)
  assert.doesNotMatch(sql, /grant (insert|update|delete)[^;]*egg_incubations/)
})

test('start_incubation serialisiert pro Spieler und behält Trade- & Zucht-Regeln', () => {
  const f = fn('start_incubation')
  const lock = f.indexOf('from public.profiles where id = uid for update')
  const pick = f.indexOf('generate_series')
  assert.ok(lock > 0 && lock < pick, 'Profil-Lock steht vor der Platzwahl')
  assert.match(f, /raise exception 'incubator slots are busy'/)
  assert.match(f, /egg is in an open trade/)
  assert.match(f, /if egg\.bred_species is not null then/)
  assert.match(f, /minutes := coalesce\(egg\.bred_minutes, et\.incubation_minutes\)/)
  // Ei wird erst verbraucht, wenn ein Platz frei ist.
  assert.ok(pick < f.indexOf('delete from public.player_eggs'))
  assert.match(f, /insert into public\.egg_incubations\(user_id, slot,/)
})

test('get_incubation_status bleibt für alte App-Versionen lesbar', () => {
  const f = fn('get_incubation_status')
  for (const key of ['active', 'egg_type', 'started_at', 'ready_at', 'ready_now', 'slots', 'server_now']) {
    assert.match(f, new RegExp(`'${key}'`), key)
  }
  assert.match(f, /order by ready_at, slot limit 1/)
})

test('claim_hatched: optionaler Platz, alte Null-Argument-Variante entfernt', () => {
  assert.match(sql, /drop function if exists public\.claim_hatched\(\);/)
  assert.ok(sql.indexOf('drop function if exists public.claim_hatched()') < sql.indexOf('function public.claim_hatched(p_slot'))
  const f = fn('claim_hatched')
  assert.match(f, /claim_hatched\(p_slot int default null\)/)
  assert.match(f, /ready_at <= now\(\)/)
  assert.match(f, /if now\(\) < inc\.ready_at then raise exception 'not ready yet'/)
  assert.match(f, /delete from public\.egg_incubations where user_id = uid and slot = inc\.slot/)
})

test('alle RPCs pinnen search_path und sperren anon aus', () => {
  for (const [name, args] of [['start_incubation', 'uuid'], ['get_incubation_status', ''], ['claim_hatched', 'int']]) {
    assert.match(fn(name), /security definer set search_path = public/, name)
    assert.match(sql, new RegExp(`grant execute on function public\\.${name}\\(${args}\\) to authenticated;`), name)
    assert.match(sql, new RegExp(`revoke execute on function public\\.${name}\\(${args}\\) from anon, public;`), name)
  }
})
