import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = path.join(root, 'supabase', 'migrations')
const sql = readdirSync(migrationsDir)
  .filter((name) => name.includes('memory_online'))
  .map((name) => readFileSync(path.join(migrationsDir, name), 'utf8'))
  .join('\n')
const featureSql = readFileSync(
  path.join(migrationsDir, '20260519_memory_online_features.sql'),
  'utf8',
)

test('migration creates the online tables with constraints', () => {
  assert.match(sql, /create table if not exists public\.mem_online_rooms/)
  assert.match(sql, /create table if not exists public\.mem_online_players/)
  assert.match(sql, /create table if not exists public\.mem_online_stats/)
  assert.match(sql, /max_players int not null[^;]*check \(max_players between 2 and 4\)/)
  assert.match(featureSql, /add constraint mem_online_rooms_board_pairs_chk\s+check \(board_pairs between 2 and 99\)/)
  assert.match(featureSql, /turn_seconds int not null default 20 check \(turn_seconds between 5 and 120\)/)
  assert.match(sql, /status text not null default 'lobby'/)
})

test('migration enables RLS, blocks client writes, grants service_role', () => {
  assert.match(sql, /alter table public\.mem_online_rooms enable row level security/)
  assert.match(sql, /alter table public\.mem_online_players enable row level security/)
  assert.match(sql, /create policy "mem_online_rooms read" on public\.mem_online_rooms\s+for select using \(true\)/)
  assert.match(sql, /grant select, insert, update, delete on table public\.mem_online_rooms to service_role/)
  assert.doesNotMatch(sql, /grant (insert|update|delete)[^;]*to authenticated/)
})

test('migration enables pgcrypto for password hashing', () => {
  assert.match(sql, /create extension if not exists pgcrypto/)
})

test('mo_create_room hashes password with crypt and seats the host', () => {
  assert.match(sql, /create or replace function public\.mo_create_room/)
  assert.match(featureSql, /drop function if exists public\.mo_create_room\(uuid, text, int, int, text\)/)
  assert.match(featureSql, /p_turn_seconds int default 20/)
  assert.match(sql, /crypt\(p_password, gen_salt\('bf'\)\)/)
  assert.match(sql, /v_has_pw := \(p_password is not null and length\(p_password\) > 0\)/)
  assert.match(featureSql, /if p_board_pairs < 2 or p_board_pairs > 99 then raise exception 'invalid board_pairs'/)
  assert.match(featureSql, /if p_turn_seconds < 5 or p_turn_seconds > 120 then raise exception 'invalid turn_seconds'/)
  assert.match(featureSql, /turn_seconds\)/)
  assert.match(sql, /insert into public\.mem_online_players[\s\S]*is_host[\s\S]*true/)
})

test('mo_build_board uses a dedicated 99-symbol emoji pool', () => {
  assert.match(featureSql, /create or replace function public\.mo_build_board\(p_pairs int\)/)
  assert.match(featureSql, /if p_pairs < 2 or p_pairs > 99 then raise exception 'invalid pairs'/)
  assert.match(featureSql, /v_symbols text\[\] := array\[/)
  const poolMatch = featureSql.match(/v_symbols text\[\] := array\[(?<pool>[\s\S]*?)\];/)
  assert.ok(poolMatch?.groups?.pool, 'emoji pool not found')
  const symbols = [...poolMatch.groups.pool.matchAll(/'([^']+)'/g)].map((m) => m[1])
  assert.ok(symbols.length >= 99, `expected at least 99 symbols, got ${symbols.length}`)
  assert.equal(new Set(symbols).size, symbols.length, 'emoji pool must be distinct')
  assert.match(featureSql, /jsonb_build_object\('emoji', v_symbol, 'matched', false\)/)
  assert.doesNotMatch(featureSql, /mo_build_board[\s\S]*species_costs/)
})

test('mo_list_rooms exposes has_password but never password_hash, and cleans stale rooms', () => {
  assert.match(sql, /create or replace function public\.mo_list_rooms/)
  assert.match(sql, /delete from public\.mem_online_rooms\s+where status = 'lobby'\s+and created_at < now\(\) - interval '2 hours'/)
  assert.match(sql, /'has_password', r\.has_password/)
  assert.doesNotMatch(sql, /'password_hash'/)
})

test('mo_join_room verifies password via crypt and enforces capacity', () => {
  assert.match(sql, /create or replace function public\.mo_join_room/)
  assert.match(sql, /crypt\(p_password, v_room\.password_hash\) <> v_room\.password_hash/)
  assert.match(sql, /raise exception 'wrong password'/)
  assert.match(sql, /raise exception 'room full'/)
  assert.match(sql, /raise exception 'game already started'/)
})

test('mo_leave_room transfers host and deletes empty rooms', () => {
  assert.match(sql, /create or replace function public\.mo_leave_room/)
  assert.match(sql, /delete from public\.mem_online_rooms where id = p_room_id/)
  assert.match(sql, /set is_host = \(user_id = v_new_host\)/)
  assert.match(sql, /left_game = true/)
})

test('mo_room_state omits the hidden board and exposes only revealed/matched cards', () => {
  assert.match(sql, /create or replace function public\.mo_room_state/)
  assert.match(sql, /'visible_cards', v_cards/)
  assert.match(sql, /v_idx = any\(v_room\.revealed\)/)
  assert.match(featureSql, /'emoji', coalesce\(v_cell->>'emoji', '❓'\)/)
  assert.doesNotMatch(sql, /'board', v_room\.board/)
})

test('mo_start_game requires host and at least two players', () => {
  assert.match(sql, /create or replace function public\.mo_start_game/)
  assert.match(sql, /raise exception 'not host'/)
  assert.match(sql, /raise exception 'need 2 players'/)
  assert.match(featureSql, /public\.mo_build_board\(v_room\.board_pairs\)/)
  assert.match(featureSql, /turn_expires_at = now\(\) \+ make_interval\(secs => v_room\.turn_seconds\)/)
})

test('mo_flip enforces turn ownership, version, and rotates on mismatch', () => {
  assert.match(sql, /create or replace function public\.mo_flip/)
  assert.match(sql, /raise exception 'not your turn'/)
  assert.match(sql, /raise exception 'state conflict'/)
  assert.match(featureSql, /v_ea = v_eb/)
  assert.match(featureSql, /turn_expires_at = now\(\) \+ make_interval\(secs => v_room\.turn_seconds\)/)
})

test('mo_flip finishes the game and records stats when all pairs matched', () => {
  assert.match(sql, /v_matched_count = jsonb_array_length\(v_board\)/)
  assert.match(sql, /status = 'finished'/)
  assert.match(sql, /insert into public\.mem_online_stats/)
  assert.match(sql, /on conflict \(user_id\) do update/)
})

test('rooms and players tables are added to the supabase_realtime publication', () => {
  assert.match(sql, /alter publication supabase_realtime add table public\.mem_online_rooms/)
  assert.match(sql, /alter publication supabase_realtime add table public\.mem_online_players/)
})

test('pgcrypto-using functions include extensions in search_path', () => {
  // pgcrypto lives in the "extensions" schema on Supabase; gen_salt/crypt
  // are unresolved unless extensions is on the function search_path.
  assert.match(sql, /function public\.mo_create_room[\s\S]*?set search_path = public, extensions[\s\S]*?as \$\$/)
  assert.match(sql, /function public\.mo_join_room[\s\S]*?set search_path = public, extensions[\s\S]*?as \$\$/)
})

test('mo_skip_turn only advances after the timer expired and is idempotent via version', () => {
  assert.match(sql, /create or replace function public\.mo_skip_turn/)
  assert.match(sql, /turn_expires_at is not null and now\(\) < v_room\.turn_expires_at/)
  assert.match(sql, /version = p_seen_version/)
  assert.match(sql, /turn_player_id = v_next/)
})
