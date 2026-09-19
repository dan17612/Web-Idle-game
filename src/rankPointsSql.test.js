// Haelt den Reward-Spiegel dicht: _rank_points in SQL und rankPoints in JS
// muessen fuer jeden Platz dasselbe liefern. Der Test uebersetzt die
// CASE-Zweige aus der Migration nach JS und vergleicht sie Platz fuer Platz —
// eine Balance-Aenderung auf nur einer Seite faellt damit sofort auf.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { rankPoints } from './rankPoints.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(
  path.join(root, 'supabase', 'migrations', '20260919_gesamt_rangliste.sql'),
  'utf8'
)

function sqlExprToJs(expr) {
  return expr
    .replace(/\bp_rank is null\b/g, 'r == null')
    .replace(/\bp_rank\b/g, 'r')
    .replace(/(?<![<>!=])=(?!=)/g, '===')
    .replace(/\bor\b/g, '||')
    .replace(/\band\b/g, '&&')
}

// Baut aus dem CASE der SQL-Funktion eine JS-Funktion nach.
function parseSqlRankPoints() {
  const body = sql.slice(
    sql.indexOf('function public._rank_points'),
    sql.indexOf('$$;', sql.indexOf('function public._rank_points'))
  )
  const arms = [...body.matchAll(/when\s+(.+?)\s+then\s+(.+?)\s*(?=when|else)/gs)]
    .map(m => ({ cond: sqlExprToJs(m[1]), value: sqlExprToJs(m[2]) }))
  const fallback = sqlExprToJs(body.match(/else\s+(.+?)\s*end/s)[1])

  assert.ok(arms.length >= 7, `zu wenige CASE-Zweige gefunden: ${arms.length}`)

  const code = arms.map(a => `if (${a.cond}) return ${a.value};`).join('\n') +
               `\nreturn ${fallback};`
  return new Function('r', code)
}

test('die CASE-Zweige lassen sich aus der Migration lesen', () => {
  const fn = parseSqlRankPoints()
  assert.equal(typeof fn, 'function')
  assert.equal(fn(1), 100)
})

test('SQL und JS liefern fuer jeden Platz denselben Wert', () => {
  const fromSql = parseSqlRankPoints()
  for (let r = 1; r <= 120; r++) {
    assert.equal(fromSql(r), rankPoints(r),
      `Platz ${r}: SQL ${fromSql(r)} gegen JS ${rankPoints(r)}`)
  }
})

test('beide behandeln fehlende Platzierung gleich', () => {
  const fromSql = parseSqlRankPoints()
  assert.equal(fromSql(null), 0)
  assert.equal(rankPoints(null), 0)
})

test('die Gesamtwertung deckt alle neun Disziplinen ab', () => {
  for (const key of ['rate', 'coins', 'boss_path', 'boss_endless', 'memory',
                     'merge', 'wordle', 'drift', 'parkour']) {
    assert.match(sql, new RegExp(`'${key}'[,\\s]`), `Disziplin ${key} fehlt`)
  }
  const unions = sql.match(/union all/g) || []
  assert.equal(unions.length, 8, 'neun Disziplinen brauchen acht union all')
})

test('Helferfunktionen bleiben intern, Bestenlisten sind lesbar', () => {
  assert.match(sql, /revoke execute on function public\._rank_points\(int\) from anon, authenticated, public/)
  assert.match(sql, /revoke execute on function public\._stars_total\(jsonb\) from anon, authenticated, public/)
  assert.doesNotMatch(sql, /grant execute on function public\._rank_points/)
  for (const fn of ['get_overall_leaderboard', 'get_drift_leaderboard', 'get_parkour_leaderboard']) {
    assert.match(sql, new RegExp(`grant execute on function public\\.${fn}\\(int\\) to authenticated, anon`))
  }
})

test('alle RPCs pinnen den search_path und laufen als security definer', () => {
  const definers = sql.match(/language sql stable security definer set search_path = public/g) || []
  assert.equal(definers.length, 3)
  const immutables = sql.match(/language sql immutable set search_path = public/g) || []
  assert.equal(immutables.length, 2)
})

test('gebannte Konten fliegen aus jeder Wertung', () => {
  const guards = sql.match(/coalesce\((p\.)?is_banned, false\) = false/g) || []
  assert.ok(guards.length >= 3, `zu wenige Bann-Filter: ${guards.length}`)
})

test('Platzierungen jenseits 100 bringen nichts und werden nicht aggregiert', () => {
  assert.match(sql, /where rnk <= 100/)
  assert.match(sql, /where pts > 0/)
})
