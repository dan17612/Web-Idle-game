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

test('migration creates the online tables with constraints', () => {
  assert.match(sql, /create table if not exists public\.mem_online_rooms/)
  assert.match(sql, /create table if not exists public\.mem_online_players/)
  assert.match(sql, /create table if not exists public\.mem_online_stats/)
  assert.match(sql, /max_players int not null[^;]*check \(max_players between 2 and 4\)/)
  assert.match(sql, /board_pairs int not null[^;]*check \(board_pairs in \(8, ?12, ?18\)\)/)
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
  assert.match(sql, /crypt\(p_password, gen_salt\('bf'\)\)/)
  assert.match(sql, /v_has_pw := \(p_password is not null and length\(p_password\) > 0\)/)
  assert.match(sql, /insert into public\.mem_online_players[\s\S]*is_host[\s\S]*true/)
})

test('mo_list_rooms exposes has_password but never password_hash, and cleans stale rooms', () => {
  assert.match(sql, /create or replace function public\.mo_list_rooms/)
  assert.match(sql, /delete from public\.mem_online_rooms\s+where status = 'lobby'\s+and created_at < now\(\) - interval '2 hours'/)
  assert.match(sql, /'has_password', r\.has_password/)
  assert.doesNotMatch(sql, /'password_hash'/)
})
