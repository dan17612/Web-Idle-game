import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { FOUNTAIN_REWARD } from './world.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(
  path.join(root, 'supabase', 'migrations', '20260803_world_lobby.sql'),
  'utf8'
)

test('welt-migration legt alle drei tabellen mit RLS an', () => {
  assert.match(sql, /create table if not exists public\.world_state/)
  assert.match(sql, /create table if not exists public\.world_items/)
  assert.match(sql, /create table if not exists public\.world_purchases/)
  const rls = sql.match(/enable row level security/g) || []
  assert.equal(rls.length, 3)
  assert.match(sql, /primary key \(user_id, item_id\)/)
})

test('bauplatz kommt aus einer sequenz und ist eindeutig', () => {
  assert.match(sql, /create sequence if not exists public\.world_plot_seq/)
  assert.match(sql, /plot int not null unique default nextval\('public\.world_plot_seq'\)/)
})

test('world_enter verbrennt keine plot-nummern bei bestandsspielern', () => {
  assert.match(sql, /update public\.world_state set last_seen = now\(\) where user_id = uid;\s*if not found then\s*insert into public\.world_state/)
})

test('tabellen sind nur lesbar, schreiben laeuft ueber RPCs', () => {
  const revokes = sql.match(/revoke all on table public\.world_\w+ from anon, authenticated/g) || []
  assert.equal(revokes.length, 3)
  const grants = sql.match(/grant select on table public\.world_\w+ to authenticated/g) || []
  assert.equal(grants.length, 3)
  assert.doesNotMatch(sql, /grant (insert|update|delete)/)
})

test('kaeufe sind nur fuer den eigenen spieler sichtbar', () => {
  assert.match(sql, /"world_purchases self read"[\s\S]*?\(\(select auth\.uid\(\)\) = user_id\)/)
})

test('kauf-RPC prueft katalog, doppelkauf und guthaben mit zeilensperre', () => {
  assert.match(sql, /where id = p_item_id and enabled;/)
  assert.match(sql, /if v_item\.cost <= 0 then raise exception 'item is free'/)
  assert.match(sql, /raise exception 'already owned'/)
  assert.match(sql, /select coins into v_coins from public\.profiles where id = uid for update/)
  assert.match(sql, /if v_coins < v_item\.cost then raise exception 'not enough coins'/)
})

test('equip prueft besitz, gratis-items sind fuer alle', () => {
  assert.match(sql, /if v_item\.cost > 0 and not exists \(/)
  assert.match(sql, /raise exception 'not owned'/)
  assert.match(sql, /if p_kind <> 'car' then raise exception 'item required'/)
})

test('leine erlaubt nur ausgeruestete eigene tiere', () => {
  assert.match(sql, /where owner_id = uid and species = p_species and equipped/)
})

test('brunnen zahlt einmal pro UTC-tag und spiegelt die client-konstanten', () => {
  assert.match(sql, /if v_last is not null and v_last >= current_date/)
  assert.match(sql, new RegExp(`coins = coins \\+ ${FOUNTAIN_REWARD.coins}, tickets = tickets \\+ ${FOUNTAIN_REWARD.tickets}\\b`))
  assert.match(sql, new RegExp(`'coins_added', ${FOUNTAIN_REWARD.coins}, 'tickets_added', ${FOUNTAIN_REWARD.tickets}\\b`))
})

test('positions-RPC clampt auf den weltkreis-server-spiegel', () => {
  assert.match(sql, /greatest\(-95, least\(95, coalesce\(p_x, 0\)\)\)/)
  assert.match(sql, /greatest\(-95, least\(95, coalesce\(p_z, 0\)\)\)/)
})

test('spielerliste blendet gebannte aus und limitiert', () => {
  assert.match(sql, /coalesce\(pr\.is_banned, false\) = false/)
  assert.match(sql, /least\(greatest\(coalesce\(p_limit, 60\), 1\), 120\)/)
  assert.match(sql, /order by acquired_at limit 8/)
})

test('alle RPCs pinnen search_path und sperren anon aus', () => {
  const pinned = sql.match(/security definer set search_path = public/g) || []
  assert.equal(pinned.length, 7)
  const revoked = sql.match(/revoke execute on function public\.world_\w+\([^)]*\) from anon, public/g) || []
  assert.equal(revoked.length, 7)
  const granted = sql.match(/grant execute on function public\.world_\w+\([^)]*\) to authenticated/g) || []
  assert.equal(granted.length, 7)
})
