import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = path.join(root, 'supabase', 'migrations')
const dailySql = readFileSync(path.join(migrationsDir, '20260612_daily_reward.sql'), 'utf8')
const driftSql = readFileSync(path.join(migrationsDir, '20260612_drift_game.sql'), 'utf8')

test('daily reward migration adds streak columns and both RPCs', () => {
  assert.match(dailySql, /add column if not exists daily_streak int not null default 0/)
  assert.match(dailySql, /add column if not exists daily_last_claim date/)
  assert.match(dailySql, /create or replace function public\.get_daily_reward_status\(\)/)
  assert.match(dailySql, /create or replace function public\.claim_daily_reward\(\)/)
  assert.match(dailySql, /grant execute on function public\.get_daily_reward_status\(\) to authenticated/)
  assert.match(dailySql, /grant execute on function public\.claim_daily_reward\(\) to authenticated/)
})

test('daily reward claim is double-claim safe and streak-aware', () => {
  assert.match(dailySql, /for update/)
  assert.match(dailySql, /if v_last = v_today then raise exception 'daily reward already claimed'/)
  assert.match(dailySql, /where id = uid and daily_last_claim is distinct from v_today/)
  assert.match(dailySql, /case when v_last = v_today - 1 then coalesce\(v_streak, 0\) \+ 1 else 1 end/)
  assert.match(dailySql, /least\(v_week, 10\)/)
})

test('daily reward uses security definer with pinned search_path', () => {
  const matches = dailySql.match(/security definer set search_path = public/g) || []
  assert.ok(matches.length >= 2, 'both RPCs must pin search_path')
})

test('drift migration creates progress table with RLS and self-read policy', () => {
  assert.match(driftSql, /create table if not exists public\.drift_progress/)
  assert.match(driftSql, /highest_level int not null default 0 check \(highest_level between 0 and 12\)/)
  assert.match(driftSql, /alter table public\.drift_progress enable row level security/)
  assert.match(driftSql, /for select using \(\(select auth\.uid\(\)\) = user_id\)/)
  assert.match(driftSql, /revoke all on table public\.drift_progress from anon/)
  assert.doesNotMatch(driftSql, /grant (insert|update|delete)[^;]*to authenticated/)
})

test('drift completion validates input and locks levels server-side', () => {
  assert.match(driftSql, /if p_level is null or p_level < 1 or p_level > 12 then/)
  assert.match(driftSql, /if p_stars is null or p_stars < 1 or p_stars > 3 then/)
  assert.match(driftSql, /if p_level > v_highest \+ 1 then raise exception 'level locked'/)
  assert.match(driftSql, /for update/)
  assert.match(driftSql, /grant execute on function public\.complete_drift_level\(int, int\) to authenticated/)
})

test('drift rewards: full pay on first clear, small bonus on replay', () => {
  assert.match(driftSql, /1500 \* p_level \* p_level/)
  assert.match(driftSql, /v_first := \(p_level = v_highest \+ 1\)/)
  assert.match(driftSql, /greatest\(100, v_base\.coins \/ 20\)/)
  assert.match(driftSql, /when 3 then 1 when 6 then 2 when 9 then 3 when 12 then 5/)
})
