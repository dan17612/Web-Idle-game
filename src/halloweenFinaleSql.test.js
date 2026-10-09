import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MAX_LEVEL, GRIDS, CHAPTERS, RAINBOW_STAR_GOAL, puzzleReward } from './halloweenPuzzle.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(
  path.join(root, 'supabase', 'migrations', '20261009_z_halloween_finale_level25.sql'),
  'utf8'
)

function fnBody(name) {
  const start = sql.indexOf(`function public.${name}(`)
  assert.ok(start > -1, `${name} fehlt`)
  return sql.slice(start, sql.indexOf('$$;', start))
}

const EFFECTIVE = 'public._hpuzzle_effective_level(highest_level, finale_cleared_at)'

test('Ohne drop-Statements, Finale über eigene Spalte', () => {
  const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
  assert.doesNotMatch(code, /\bdrop\b/i)
  assert.match(sql, /alter table public\.halloween_puzzle_progress\s+add column if not exists finale_cleared_at timestamptz;/)
  assert.match(fnBody('_hpuzzle_effective_level'),
    /coalesce\(p_highest, 0\) \+ case when p_finale_at is null then 0 else 1 end/)
})

test('Level 25 in allen Spiegel-Formeln', () => {
  assert.equal(MAX_LEVEL, 25)
  const pieces = fnBody('_hpuzzle_pieces').match(/\(array\[([\d,\s]+)\]\)/)[1].split(',').map(Number)
  assert.equal(pieces.length, 25)
  assert.equal(pieces[24], GRIDS[24][0] * GRIDS[24][1])
  const secs = fnBody('_hpuzzle_stars').match(/\(array\[([\d,\s]+)\]\)/)[1].split(',').map(Number)
  assert.deepEqual(secs, CHAPTERS.map((c) => c.secPerPiece))
  assert.match(fnBody('_hpuzzle_reward'), new RegExp(`when 25 then ${puzzleReward(25).tickets} else 0`))
  assert.match(fnBody('_hpuzzle_rainbow_goal'), new RegExp(`select 25 \\* 3;`))
  assert.equal(RAINBOW_STAR_GOAL, 75)
})

test('Abschluss: effektives Level für Sperre, highest_level bleibt im Check-Bereich', () => {
  const body = fnBody('complete_halloween_puzzle')
  assert.match(body, /p_level < 1 or p_level > 25/)
  assert.ok(body.includes(`select ${EFFECTIVE},`), 'Sperre nutzt nicht das effektive Level')
  assert.match(body, /p_level > v_highest \+ 1 then raise exception 'level locked'/)
  assert.match(body, /v_first := \(p_level = v_highest \+ 1\);/)
  assert.match(body, /highest_level = greatest\(highest_level, least\(p_level, 24\)\)/)
  assert.match(body, /finale_cleared_at = case when p_level = 25 then coalesce\(finale_cleared_at, now\(\)\)\s+else finale_cleared_at end/)
  // Gating, Mindestzeit und Regenbogen-Logik bleiben erhalten.
  const gate = body.indexOf("event_is_active('halloween_puzzle') then raise exception 'event ended'")
  assert.ok(gate > -1 && body.indexOf('update public.profiles') > gate)
  assert.match(body, /if v_secs \* 2 < v_pieces then raise exception 'too fast'/)
  assert.match(body, /if v_rainbow_at is null and v_total_stars >= public\._hpuzzle_rainbow_goal\(\)/)
})

test('Fortschritt und Bestenlisten zeigen das effektive Level', () => {
  const progress = fnBody('get_halloween_puzzle_progress')
  assert.match(progress, /'highest_level', public\._hpuzzle_effective_level\(v_row\.highest_level, v_row\.finale_cleared_at\)/)
  assert.match(progress, /'max_level', 25/)
  const lb = fnBody('get_halloween_puzzle_leaderboard')
  assert.match(lb, /order by public\._hpuzzle_effective_level\(h\.highest_level, h\.finale_cleared_at\) desc/)
  const overall = fnBody('get_overall_leaderboard')
  assert.match(overall, /select 'halloween'[\s\S]*_hpuzzle_effective_level\(h\.highest_level, h\.finale_cleared_at\)::numeric/)
  for (const key of ['rate', 'coins', 'boss_path', 'boss_endless', 'memory', 'merge', 'wordle', 'drift', 'parkour', 'blockfall', 'halloween']) {
    assert.match(overall, new RegExp(`select '${key}'`), key)
  }
})

test('search_path gepinnt, Helfer für niemanden, RPCs nur für authenticated', () => {
  for (const fn of ['get_halloween_puzzle_progress', 'complete_halloween_puzzle', 'get_halloween_puzzle_leaderboard', 'get_overall_leaderboard']) {
    assert.match(fnBody(fn), /security definer set search_path = public/, fn)
  }
  for (const [fn, sig] of [
    ['_hpuzzle_effective_level', 'int, timestamptz'], ['_hpuzzle_pieces', 'int'], ['_hpuzzle_stars', 'int, int'],
    ['_hpuzzle_reward', 'int'], ['_hpuzzle_rainbow_goal', '']
  ]) {
    assert.match(fnBody(fn), /immutable set search_path = public/, fn)
    assert.ok(sql.includes(`revoke execute on function public.${fn}(${sig}) from anon, authenticated, public;`), fn)
  }
  assert.match(sql, /revoke execute on function public\.complete_halloween_puzzle\(int, int\) from anon, public;/)
  assert.doesNotMatch(sql, /grant execute on function public\.complete_halloween_puzzle[^;]*anon/)
})
