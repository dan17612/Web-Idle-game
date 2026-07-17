import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(
  path.join(root, 'supabase', 'migrations', '20260717_wordle_game.sql'),
  'utf8'
)

test('wordle migration creates all three tables with RLS', () => {
  assert.match(sql, /create table if not exists public\.wordle_words/)
  assert.match(sql, /create table if not exists public\.wordle_daily_games/)
  assert.match(sql, /create table if not exists public\.wordle_stats/)
  const rls = sql.match(/enable row level security/g) || []
  assert.equal(rls.length, 3)
  assert.match(sql, /primary key \(user_id, day\)/)
})

test('word list is locked away from clients', () => {
  assert.match(sql, /revoke all on table public\.wordle_words from anon, authenticated/)
  assert.doesNotMatch(sql, /grant select on table public\.wordle_words/)
})

test('game and stats tables are self-read only', () => {
  const selfRead = sql.match(/for select using \(\(select auth\.uid\(\)\) = user_id\)/g) || []
  assert.equal(selfRead.length, 2)
  assert.doesNotMatch(sql, /grant (insert|update|delete)[^;]*to authenticated/)
})

test('all words match the five-letter german pattern', () => {
  const block = sql.split('insert into public.wordle_words')[1].split('on conflict')[0]
  const words = [...block.matchAll(/\('([^']+)'\)/g)].map(m => m[1])
  assert.ok(words.length >= 300, `only ${words.length} words`)
  for (const w of words) {
    assert.match(w, /^[A-ZÄÖÜ]{5}$/u, `bad word ${w}`)
  }
  assert.equal(new Set(words).size, words.length, 'duplicate words')
})

test('solution picker derives the daily word from md5(day)', () => {
  assert.match(sql, /md5\(p_day::text \|\| '-zoo-wordle'\)/)
  assert.match(sql, /row_number\(\) over \(order by id\)/)
})

test('guess RPC validates input, locks the row and blocks finished games', () => {
  assert.match(sql, /if v_guess !~ '\^\[A-ZÄÖÜ\]\{5\}\$' then raise exception 'invalid guess'/)
  assert.match(sql, /for update/)
  assert.match(sql, /if v_game\.finished then raise exception 'already finished'/)
  assert.match(sql, /v_finished := v_solved or v_attempts >= 6/)
})

test('two-pass eval handles duplicates via remaining letters', () => {
  assert.match(sql, /v_rest := v_rest \|\| substr\(p_solution, i, 1\)/)
  assert.match(sql, /overlay\(v_rest placing '' from v_pos for 1\)/)
})

test('reward mirrors the client preview and caps the streak at x2', () => {
  assert.match(sql, /when 1 then 12000 when 2 then 9000 when 3 then 7000/)
  assert.match(sql, /when 4 then 5000 when 5 then 3500 else 2500/)
  assert.match(sql, /10 \+ least\(greatest\(p_streak, 1\) - 1, 10\)/)
  assert.match(sql, /when 1 then 3 when 2 then 2 when 3 then 1 when 4 then 1 else 0/)
})

test('streak resets on loss and continues only on consecutive wins', () => {
  assert.match(sql, /case when v_last_win = v_today - 1 then coalesce\(v_streak, 0\) \+ 1 else 1 end/)
  assert.match(sql, /current_streak = 0/)
  assert.match(sql, /best_streak = greatest\(best_streak, v_streak\)/)
})

test('leaderboard excludes banned players and ranks by streak', () => {
  assert.match(sql, /coalesce\(p\.is_banned, false\) = false/)
  assert.match(sql, /order by s\.current_streak desc, s\.best_streak desc, s\.wins desc/)
  assert.match(sql, /grant execute on function public\.get_wordle_leaderboard\(int\) to authenticated, anon/)
})

test('rpcs pin search_path and internal helpers are revoked', () => {
  const pinned = sql.match(/security definer set search_path = public/g) || []
  assert.ok(pinned.length >= 3, 'game RPCs + leaderboard must pin search_path')
  assert.match(sql, /revoke execute on function public\._wordle_solution\(date\) from anon, authenticated, public/)
  assert.match(sql, /revoke execute on function public\._wordle_eval\(text, text\) from anon, authenticated, public/)
  assert.match(sql, /revoke execute on function public\.wordle_guess\(text\) from anon, public/)
})
