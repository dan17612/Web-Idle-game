import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(
  path.join(root, 'supabase', 'migrations', '20260924_futter_seltenheit.sql'),
  'utf8'
)

test('food_costs bekommt Seltenheit, Chance und enabled mit Checks', () => {
  assert.match(sql, /add column if not exists rarity text not null default 'common'/)
  assert.match(sql, /add column if not exists shop_chance numeric not null default 1/)
  assert.match(sql, /add column if not exists enabled boolean not null default true/)
  assert.match(sql, /check \(rarity in \('common', 'uncommon', 'rare', 'epic', 'legendary'\)\)/)
  assert.match(sql, /check \(shop_chance >= 0 and shop_chance <= 1\)/)
})

test('seltenere Futter haben kleinere Chancen', () => {
  const chance = {}
  for (const m of sql.matchAll(/set rarity = '(\w+)',\s*shop_chance = ([\d.]+)/g)) chance[m[1]] = Number(m[2])
  const order = ['common', 'uncommon', 'rare', 'epic', 'legendary']
  for (let i = 1; i < order.length; i++) {
    assert.ok(chance[order[i]] < chance[order[i - 1]], `${order[i]} muss seltener sein als ${order[i - 1]}`)
  }
})

test('Wurf ist deterministisch pro Futter und Slot', () => {
  assert.match(sql, /md5\('food:' \|\| p_food \|\| ':' \|\| extract\(epoch from p_slot\)::bigint::text\)/)
})

test('leeres Angebot fällt auf das günstigste Futter zurück', () => {
  assert.match(sql, /if cardinality\(v_foods\) = 0 then[\s\S]*order by f\.cost[\s\S]*limit 1/)
})

test('Hilfsfunktionen sind für Clients gesperrt', () => {
  assert.match(sql, /revoke execute on function public\._food_roll\(text, timestamptz\) from anon, authenticated, public/)
  assert.match(sql, /revoke execute on function public\._available_foods\(timestamptz\) from anon, authenticated, public/)
})

test('alle Funktionen pinnen den search_path', () => {
  const fns = sql.match(/create or replace function[\s\S]*?\$\$/g) || []
  assert.equal(fns.length, 4)
  for (const f of fns) assert.match(f, /set search_path = public/)
})

test('feed_pet prüft das Angebot vor dem Abbuchen', () => {
  const body = sql.split('create or replace function public.feed_pet')[1].split('end $$;')[0]
  const check = body.indexOf("raise exception 'food not available'")
  const charge = body.indexOf('set coins = coins - f.cost')
  assert.ok(check > 0 && charge > check)
  assert.match(body, /_available_foods\(public\._current_slot\(\)\)/)
  assert.match(sql, /revoke execute on function public\.feed_pet\(text\) from anon, public/)
  assert.match(sql, /grant execute on function public\.feed_pet\(text\) to authenticated/)
})

test('get_shop liefert food_available für denselben Slot wie die Tiere', () => {
  assert.match(sql, /'food_available', to_jsonb\(public\._available_foods\(state\.updated_at\)\)/)
})
