import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(
  path.join(root, 'supabase', 'migrations', '20260919_event_hub_und_emoji.sql'),
  'utf8'
)

test('Zeitplan-Einträge sind idempotent und decken alle vier Ereignisse ab', () => {
  assert.match(sql, /insert into public\.event_schedule \(key, starts_at, ends_at, enabled\)/)
  for (const key of ['drift_game', 'parkour_game', 'wordle_game', 'world_lobby']) {
    assert.match(sql, new RegExp(`'${key}'`), `${key} fehlt im Zeitplan`)
  }
  assert.match(sql, /on conflict \(key\) do update/)
})

test('Drift und Parkour sind beendet, Wordle und Welt laufen weiter', () => {
  assert.match(sql, /\('drift_game',\s+null, '2026-09-19[^']*', true\)/)
  assert.match(sql, /\('parkour_game',\s+null, '2026-09-19[^']*', true\)/)
  assert.match(sql, /\('wordle_game',\s+null, null, true\)/)
  assert.match(sql, /\('world_lobby',\s+null, null, true\)/)
})

test('beide Abschluss-RPCs prüfen event_is_active', () => {
  assert.match(sql, /event_is_active\('drift_game'\) then raise exception 'event ended'/)
  assert.match(sql, /event_is_active\('parkour_game'\) then raise exception 'event ended'/)
})

test('die Prüfung steht vor jeder Gutschrift', () => {
  for (const fn of ['complete_drift_level', 'complete_parkour_level']) {
    const body = sql.slice(sql.indexOf(`function public.${fn}(`))
    const gate = body.indexOf('event_is_active')
    const payout = body.indexOf('update public.profiles')
    assert.ok(gate > -1, `${fn}: kein Gating`)
    assert.ok(payout > -1, `${fn}: keine Auszahlung gefunden`)
    assert.ok(gate < payout, `${fn}: Gating steht nach der Auszahlung`)
  }
})

test('RPCs bleiben security definer mit gepinntem search_path', () => {
  const defs = sql.match(/security definer set search_path = public/g) || []
  assert.equal(defs.length, 2)
})

test('Grants nur für authenticated, anon und public bleiben außen vor', () => {
  for (const fn of ['complete_drift_level', 'complete_parkour_level']) {
    assert.match(sql, new RegExp(`grant execute on function public\\.${fn}\\(int, int\\) to authenticated`))
    assert.match(sql, new RegExp(`revoke execute on function public\\.${fn}\\(int, int\\) from anon, public`))
  }
  assert.doesNotMatch(sql, /grant execute on function public\.complete_(drift|parkour)_level[^;]*to anon/)
})

test('Fortschritts-RPCs bleiben ungegatet, damit Sterne sichtbar bleiben', () => {
  assert.doesNotMatch(sql, /create or replace function public\.get_(drift|parkour)_progress/)
})

test('Emoji-Korrekturen setzen nur Einzel-Codepoint-Zeichen', () => {
  assert.match(sql, /update public\.species_costs set emoji = '🦅'/)
  assert.match(sql, /when 'pirate'\s+then '🦜'/)
  const replacements = sql.match(/then '(.)'/gu) || []
  assert.ok(replacements.length >= 4, 'zu wenige Ersetzungen gefunden')
  for (const r of replacements) {
    const emoji = r.slice(r.indexOf("'") + 1, r.lastIndexOf("'"))
    assert.equal([...emoji].length, 1, `Ersetzung ist keine Einzel-Codepoint-Emoji: ${emoji}`)
  }
})
