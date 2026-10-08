import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MAX_LEVEL, CHAPTERS, GRIDS, levelConfig, starsForTime, puzzleReward } from './halloweenPuzzle.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(
  path.join(root, 'supabase', 'migrations', '20261008_halloween_puzzle.sql'),
  'utf8'
)

function fnBody(name) {
  const start = sql.indexOf(`function public.${name}(`)
  assert.ok(start > -1, `${name} fehlt`)
  return sql.slice(start, sql.indexOf('$$;', start))
}

function sqlArray(body) {
  const m = body.match(/\(array\[([\d,\s]+)\]\)/)
  assert.ok(m, 'array[...] fehlt')
  return m[1].split(',').map((s) => Number(s.trim()))
}

test('Tabelle mit RLS und nur Self-Select', () => {
  assert.match(sql, /create table if not exists public\.halloween_puzzle_progress/)
  assert.match(sql, /alter table public\.halloween_puzzle_progress enable row level security/)
  assert.match(sql, /for select using \(\(select auth\.uid\(\)\) = user_id\)/)
  assert.doesNotMatch(sql, /policy[^;]*halloween_puzzle_progress[^;]*for (insert|update|delete|all)/)
  assert.match(sql, /revoke all on table public\.halloween_puzzle_progress from anon, public/)
  assert.match(sql, /check \(highest_level between 0 and 24\)/)
})

test('Raster-Spiegel: Teile pro Level wie GRIDS', () => {
  const pieces = sqlArray(fnBody('_hpuzzle_pieces'))
  assert.equal(pieces.length, MAX_LEVEL)
  pieces.forEach((n, i) => assert.equal(n, GRIDS[i][0] * GRIDS[i][1], `Level ${i + 1}`))
})

test('Sterne-Spiegel: Sekunden pro Teil und Grenzen wie starsForTime', () => {
  const body = fnBody('_hpuzzle_stars')
  assert.deepEqual(sqlArray(body), CHAPTERS.map((c) => c.secPerPiece))
  assert.match(body, /\(p_level - 1\) \/ 6 \+ 1/)
  // SQL-Formel in JS nachbauen und Level für Level an den Grenzen vergleichen.
  const pieces = sqlArray(fnBody('_hpuzzle_pieces'))
  const secs = sqlArray(body)
  const sqlStars = (l, s) => {
    const base = pieces[l - 1] * secs[Math.floor((l - 1) / 6)]
    if (s <= base) return 3
    if (s <= 2 * base) return 2
    return 1
  }
  for (let l = 1; l <= MAX_LEVEL; l++) {
    const { star3, star2 } = levelConfig(l)
    for (const s of [1, star3 - 1, star3, star3 + 1, star2, star2 + 1, star2 * 3]) {
      assert.equal(sqlStars(l, s), starsForTime(l, s), `Level ${l}, ${s} s`)
    }
  }
})

test('Reward-Spiegel: SQL und JS liefern für jedes Level dasselbe', () => {
  const body = fnBody('_hpuzzle_reward')
  const coinsFactor = Number(body.match(/\((\d+) \* p_level \* p_level\)::bigint/)[1])
  const [ticketCase, speciesCase, tierCase] = body.split('\n').filter((l) => l.includes('case p_level'))
  const parse = (line, re) => Object.fromEntries([...line.matchAll(re)].map((m) => [Number(m[1]), m[2]]))
  const tickets = parse(ticketCase, /when (\d+) then (\d+)/g)
  const species = parse(speciesCase, /when (\d+) then '(\w+)'/g)
  const tiers = parse(tierCase, /when (\d+) then '(\w+)'/g)
  for (let l = 1; l <= MAX_LEVEL; l++) {
    assert.deepEqual(
      {
        coins: coinsFactor * l * l,
        tickets: Number(tickets[l] || 0),
        pet: species[l] ? { species: species[l], tier: tiers[l] } : null
      },
      puzzleReward(l),
      `Level ${l}`
    )
  }
})

test('Abschluss-RPC: Gating und Plausibilität vor jeder Gutschrift', () => {
  const body = fnBody('complete_halloween_puzzle')
  const gate = body.indexOf("event_is_active('halloween_puzzle') then raise exception 'event ended'")
  const payout = body.indexOf('update public.profiles')
  const petInsert = body.indexOf('insert into public.animals')
  assert.ok(gate > -1, 'kein Gating')
  assert.ok(payout > gate && petInsert > gate, 'Gating steht nach der Auszahlung')
  assert.match(body, /p_level > v_highest \+ 1 then raise exception 'level locked'/)
  assert.match(body, /p_level < 1 or p_level > 24/)
  assert.match(body, /if v_secs \* 2 < v_pieces then raise exception 'too fast'/)
  assert.match(body, /v_last > now\(\) - make_interval\(secs => v_pieces \/ 2\.0\)/)
  assert.match(body, /for update/)
  // Sterne kommen vom Server, nicht vom Client.
  assert.match(body, /v_run_stars := public\._hpuzzle_stars\(p_level, v_secs\)/)
  assert.doesNotMatch(body, /p_stars/)
})

test('Erstabschluss- und Wiederholungsformel wie BlockFall, Tier nur beim Erstabschluss', () => {
  const body = fnBody('complete_halloween_puzzle')
  assert.match(body, /if v_run_stars = 3 then\s+v_coins := v_coins \+ v_base\.coins \/ 2;/)
  assert.match(body, /v_coins := greatest\(100, v_base\.coins \/ 20\);\s+v_tickets := 0;/)
  assert.match(body, /if v_first and v_base\.pet_species is not null/)
})

test('Fortschritt bleibt ungegatet', () => {
  assert.doesNotMatch(fnBody('get_halloween_puzzle_progress'), /event_is_active/)
})

test('RPCs sind security definer mit gepinntem search_path', () => {
  for (const fn of ['get_halloween_puzzle_progress', 'complete_halloween_puzzle', 'get_halloween_puzzle_leaderboard', 'get_overall_leaderboard']) {
    assert.match(fnBody(fn), /security definer set search_path = public/, fn)
  }
  for (const fn of ['_hpuzzle_pieces', '_hpuzzle_stars', '_hpuzzle_reward']) {
    assert.match(fnBody(fn), /immutable set search_path = public/, fn)
  }
})

test('Grants nur für authenticated, Helfer für niemanden', () => {
  assert.match(sql, /grant execute on function public\.complete_halloween_puzzle\(int, int\) to authenticated;/)
  assert.match(sql, /revoke execute on function public\.complete_halloween_puzzle\(int, int\) from anon, public;/)
  assert.match(sql, /revoke execute on function public\.get_halloween_puzzle_progress\(\) from anon, public;/)
  for (const sig of ['_hpuzzle_pieces\\(int\\)', '_hpuzzle_stars\\(int, int\\)', '_hpuzzle_reward\\(int\\)']) {
    assert.match(sql, new RegExp(`revoke execute on function public\\.${sig} from anon, authenticated, public;`), sig)
  }
  assert.doesNotMatch(sql, /grant execute on function public\.complete_halloween_puzzle[^;]*anon/)
})

test('Fledermaus: nicht in Truhen, nicht im Shop, Limited Edition', () => {
  const row = sql.match(/\('bat', 'Fledermaus', '🦇', (\d+), (\d+), ([\d.]+), (\w+), (\w+), (\w+), '(\w+)'\)/)
  assert.ok(row, 'Fledermaus fehlt')
  const [, cost, rate, , enabled, shopVisible, craftOnly] = row
  assert.equal(enabled, 'false', 'enabled = true würde sie in Truhen werfen')
  assert.equal(shopVisible, 'false')
  assert.equal(craftOnly, 'false')
  // Gleiche Amortisation wie die Shop-Tiere in der Nähe (Kosten/Rate >= 200).
  assert.ok(Number(cost) / Number(rate) >= 200)
  assert.match(sql, /on conflict \(species\) do nothing/)
})

test('Zeitplan-Eintrag mit Countdown, überschreibt keine Admin-Änderungen', () => {
  assert.match(sql, /\('halloween_puzzle', null, '2026-11-08[^']*', true, true\)\s+on conflict \(key\) do nothing/)
})

test('Gesamtwertung enthält alle elf Disziplinen', () => {
  const body = fnBody('get_overall_leaderboard')
  for (const key of ['rate', 'coins', 'boss_path', 'boss_endless', 'memory', 'merge', 'wordle', 'drift', 'parkour', 'blockfall', 'halloween']) {
    assert.match(body, new RegExp(`select '${key}'`), key)
  }
})
