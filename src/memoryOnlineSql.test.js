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
