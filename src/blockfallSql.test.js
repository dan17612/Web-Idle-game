import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { blockfallReward, MAX_LEVEL } from './blockfall.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(
  path.join(root, 'supabase', 'migrations', '20260924_blockfall.sql'),
  'utf8'
)

function fnBody(name) {
  const start = sql.indexOf(`function public.${name}(`)
  assert.ok(start > -1, `${name} fehlt`)
  return sql.slice(start, sql.indexOf('$$;', start))
}

test('Tabelle mit RLS und nur Self-Select', () => {
  assert.match(sql, /create table if not exists public\.blockfall_progress/)
  assert.match(sql, /alter table public\.blockfall_progress enable row level security/)
  assert.match(sql, /for select using \(\(select auth\.uid\(\)\) = user_id\)/)
  assert.doesNotMatch(sql, /policy[^;]*blockfall_progress[^;]*for (insert|update|delete|all)/)
  assert.match(sql, /revoke all on table public\.blockfall_progress from anon, public/)
})

test('Reward-Spiegel: SQL und JS liefern für jedes Level dasselbe', () => {
  const body = fnBody('_blockfall_reward')
  const coinsFactor = Number(body.match(/\((\d+) \* p_level \* p_level\)::bigint/)[1])
  const tickets = {}
  for (const m of body.matchAll(/when (\d+) then (\d+)/g)) tickets[Number(m[1])] = Number(m[2])
  for (let l = 1; l <= MAX_LEVEL; l++) {
    assert.deepEqual(
      { coins: coinsFactor * l * l, tickets: tickets[l] || 0 },
      blockfallReward(l),
      `Level ${l}`
    )
  }
})

test('Abschluss-RPC: Gating vor jeder Gutschrift', () => {
  const body = fnBody('complete_blockfall_level')
  const gate = body.indexOf("event_is_active('blockfall_game') then raise exception 'event ended'")
  const payout = body.indexOf('update public.profiles')
  assert.ok(gate > -1, 'kein Gating')
  assert.ok(payout > gate, 'Gating steht nach der Auszahlung')
  assert.match(body, /p_level > v_highest \+ 1 then raise exception 'level locked'/)
  assert.match(body, /p_level < 1 or p_level > 30/)
  assert.match(body, /p_stars < 1 or p_stars > 3/)
  assert.match(body, /interval '5 seconds'/)
})

test('Erstabschluss- und Wiederholungsformel wie Drift/Parkour', () => {
  const body = fnBody('complete_blockfall_level')
  assert.match(body, /if p_stars = 3 then\s+v_coins := v_coins \+ v_base\.coins \/ 2;/)
  assert.match(body, /v_coins := greatest\(100, v_base\.coins \/ 20\);\s+v_tickets := 0;/)
})

test('Fortschritt bleibt ungegatet', () => {
  assert.doesNotMatch(fnBody('get_blockfall_progress'), /event_is_active/)
})

test('RPCs sind security definer mit gepinntem search_path', () => {
  for (const fn of ['get_blockfall_progress', 'complete_blockfall_level', 'get_blockfall_leaderboard', 'get_overall_leaderboard']) {
    assert.match(fnBody(fn), /security definer set search_path = public/, fn)
  }
  assert.match(fnBody('_blockfall_reward'), /set search_path = public/)
})

test('Grants nur für authenticated, anon bleibt außen vor', () => {
  assert.match(sql, /grant execute on function public\.complete_blockfall_level\(int, int\) to authenticated;/)
  assert.match(sql, /revoke execute on function public\.complete_blockfall_level\(int, int\) from anon, public;/)
  assert.match(sql, /revoke execute on function public\.get_blockfall_progress\(\) from anon, public;/)
  assert.match(sql, /revoke execute on function public\._blockfall_reward\(int\) from anon, authenticated, public;/)
  assert.doesNotMatch(sql, /grant execute on function public\.complete_blockfall_level[^;]*anon/)
})

test('Zeitplan-Eintrag mit Countdown, überschreibt keine Admin-Änderungen', () => {
  assert.match(sql, /\('blockfall_game', null, '2026-10-24[^']*', true, true\)\s+on conflict \(key\) do nothing/)
})

test('Gesamtwertung enthält alle zehn Disziplinen', () => {
  const body = fnBody('get_overall_leaderboard')
  for (const key of ['rate', 'coins', 'boss_path', 'boss_endless', 'memory', 'merge', 'wordle', 'drift', 'parkour', 'blockfall']) {
    assert.match(body, new RegExp(`select '${key}'`), key)
  }
})
