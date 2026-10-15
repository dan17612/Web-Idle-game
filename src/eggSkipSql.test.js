// Prüft 20261015_brutzeit_ueberspringen.sql: Guthaben-Tabelle nur lesbar,
// Einlösen und Verschenken nur über RPCs mit gepinntem search_path.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(
  path.join(root, 'supabase', 'migrations', '20261015_brutzeit_ueberspringen.sql'),
  'utf8'
)

function fnBody(name) {
  const start = sql.indexOf(`create or replace function public.${name}(`)
  assert.ok(start >= 0, `${name} nicht gefunden`)
  return sql.slice(start, sql.indexOf('end $$;', start))
}

test('Guthaben-Tabelle: RLS an, nur Select auf die eigene Zeile', () => {
  assert.match(sql, /qty\s+int not null default 0 check \(qty >= 0\)/)
  assert.match(sql, /alter table public\.egg_skip_tokens enable row level security;/)
  assert.match(sql, /for select to authenticated using \(user_id = auth\.uid\(\)\)/)
  const policies = [...sql.matchAll(/create policy "[^"]+" on public\.egg_skip_tokens\s+for (\w+)/g)].map(m => m[1])
  assert.deepEqual(policies, ['select'], 'nur eine Select-Policy')
  assert.match(sql, /revoke insert, update, delete on public\.egg_skip_tokens from authenticated;/)
  assert.match(sql, /revoke all on public\.egg_skip_tokens from anon, public;/)
})

test('keine drop-Statements (MCP-Bestätigung)', () => {
  assert.doesNotMatch(sql, /\bdrop\b/i)
})

test('alle Funktionen: security definer mit gepinntem search_path', () => {
  for (const name of ['egg_skip_use', 'admin_gift_egg_skips', 'get_incubation_status']) {
    assert.match(fnBody(name), /security definer\s+set search_path = public/, name)
  }
})

test('egg_skip_use: sperrt, prüft Guthaben und nur laufende eigene Plätze', () => {
  const fn = fnBody('egg_skip_use')
  assert.match(fn, /where user_id = uid for update/)
  assert.match(fn, /if coalesce\(v_qty, 0\) < 1 then raise exception 'no egg skips'/)
  assert.match(fn, /where user_id = uid and slot = p_slot and ready_at > now\(\)/)
  assert.match(fn, /if not found then raise exception 'nothing to skip'/)
  assert.ok(fn.indexOf("'nothing to skip'") < fn.indexOf('qty = qty - 1'), 'erst Brutplatz, dann abbuchen')
})

test('admin_gift_egg_skips: nur Admins, 1..10, addiert', () => {
  const fn = fnBody('admin_gift_egg_skips')
  assert.match(fn, /if role is distinct from 'admin' then raise exception 'admin only'/)
  assert.match(fn, /p_qty < 1 or p_qty > 10 then raise exception 'qty 1\.\.10'/)
  assert.match(fn, /selector = '@all'/)
  assert.match(fn, /selector = '@online'/)
  assert.match(fn, /set qty = public\.egg_skip_tokens\.qty \+ excluded\.qty/)
})

test('get_incubation_status liefert egg_skips in beiden Zweigen', () => {
  const fn = fnBody('get_incubation_status')
  assert.equal((fn.match(/'egg_skips', v_skips/g) || []).length, 2)
})

test('Grants nur für authenticated', () => {
  for (const sig of ['egg_skip_use\\(int\\)', 'admin_gift_egg_skips\\(text, int\\)', 'get_incubation_status\\(\\)']) {
    assert.match(sql, new RegExp(`grant execute on function public\\.${sig} to authenticated;`))
    assert.match(sql, new RegExp(`revoke execute on function public\\.${sig} from anon, public;`))
  }
})
