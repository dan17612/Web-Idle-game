import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { RAINBOW_STAR_GOAL, RAINBOW_PET, MAX_LEVEL } from './halloweenPuzzle.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(
  path.join(root, 'supabase', 'migrations', '20261009_halloween_regenbogen_fledermaus.sql'),
  'utf8'
)

function fnBody(name) {
  const start = sql.indexOf(`function public.${name}(`)
  assert.ok(start > -1, `${name} fehlt`)
  return sql.slice(start, sql.indexOf('$$;', start))
}

test('Ziel-Spiegel: alle Level mit drei Sternen', () => {
  const m = fnBody('_hpuzzle_rainbow_goal').match(/select (\d+) \* (\d+);/)
  assert.ok(m, 'Ziel nicht lesbar')
  assert.equal(Number(m[1]), MAX_LEVEL)
  assert.equal(Number(m[1]) * Number(m[2]), RAINBOW_STAR_GOAL)
})

test('Ohne drop-Statements, Spalte nur ergänzt', () => {
  const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
  assert.doesNotMatch(code, /\bdrop\b/i)
  assert.match(sql, /alter table public\.halloween_puzzle_progress\s+add column if not exists rainbow_claimed_at timestamptz;/)
})

test('Regenbogen-Fledermaus nur einmal und nur mit vollen Sternen', () => {
  const body = fnBody('complete_halloween_puzzle')
  const block = body.slice(body.indexOf('-- Regenbogen-Fledermaus'))
  assert.match(block, /if v_rainbow_at is null and v_total_stars >= public\._hpuzzle_rainbow_goal\(\)/)
  assert.match(block, new RegExp(`values \\(uid, '${RAINBOW_PET.species}', '${RAINBOW_PET.tier}', false\\)`))
  assert.match(block, /set rainbow_claimed_at = now\(\)/)
  // Sternesumme kommt aus der gerade gespeicherten Zeile, nicht vom Client.
  assert.match(body, /returning public\._stars_total\(stars\) into v_total_stars;/)
  assert.ok(body.indexOf('returning public._stars_total') < body.indexOf('-- Regenbogen-Fledermaus'))
  // Der Status wird unter der Zeilensperre gelesen.
  assert.match(body, /rainbow_claimed_at\s+into v_highest, v_stars, v_times, v_last, v_rainbow_at\s+from public\.halloween_puzzle_progress where user_id = uid for update;/)
})

test('Abschluss-RPC behält Gating und Plausibilität vor jeder Gutschrift', () => {
  const body = fnBody('complete_halloween_puzzle')
  const gate = body.indexOf("event_is_active('halloween_puzzle') then raise exception 'event ended'")
  assert.ok(gate > -1, 'kein Gating')
  for (const payout of ['update public.profiles', 'insert into public.animals']) {
    assert.ok(body.indexOf(payout) > gate, `${payout} vor dem Gating`)
  }
  assert.match(body, /p_level > v_highest \+ 1 then raise exception 'level locked'/)
  assert.match(body, /if v_secs \* 2 < v_pieces then raise exception 'too fast'/)
  assert.match(body, /v_last > now\(\) - make_interval\(secs => v_pieces \/ 2\.0\)/)
  assert.match(body, /v_run_stars := public\._hpuzzle_stars\(p_level, v_secs\)/)
  assert.match(body, /if v_run_stars = 3 then\s+v_coins := v_coins \+ v_base\.coins \/ 2;/)
  assert.match(body, /v_coins := greatest\(100, v_base\.coins \/ 20\);\s+v_tickets := 0;/)
  assert.match(body, /if v_first and v_base\.pet_species is not null/)
})

test('Antwort und Fortschritt kennen Ziel und Status', () => {
  const body = fnBody('complete_halloween_puzzle')
  for (const key of ['bonus_pet', 'total_stars', 'star_goal', 'rainbow_claimed']) {
    assert.match(body, new RegExp(`'${key}'`), key)
  }
  const progress = fnBody('get_halloween_puzzle_progress')
  assert.match(progress, /'star_goal', public\._hpuzzle_rainbow_goal\(\)/)
  assert.match(progress, /'rainbow_claimed', v_row\.rainbow_claimed_at is not null/)
  assert.doesNotMatch(progress, /event_is_active/)
})

test('search_path gepinnt, Grants nur für authenticated', () => {
  for (const fn of ['get_halloween_puzzle_progress', 'complete_halloween_puzzle']) {
    assert.match(fnBody(fn), /security definer set search_path = public/, fn)
  }
  assert.match(fnBody('_hpuzzle_rainbow_goal'), /immutable set search_path = public/)
  assert.match(sql, /revoke execute on function public\._hpuzzle_rainbow_goal\(\) from anon, authenticated, public;/)
  assert.match(sql, /grant execute on function public\.complete_halloween_puzzle\(int, int\) to authenticated;/)
  assert.match(sql, /revoke execute on function public\.complete_halloween_puzzle\(int, int\) from anon, public;/)
  assert.match(sql, /revoke execute on function public\.get_halloween_puzzle_progress\(\) from anon, public;/)
})
