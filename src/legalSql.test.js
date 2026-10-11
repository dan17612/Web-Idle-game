import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LEGAL_VERSION } from './legal.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(
  path.join(root, 'supabase', 'migrations', '20261011_regelwerk.sql'),
  'utf8'
)

test('acceptance table has RLS and only self-read access', () => {
  assert.match(sql, /create table if not exists public\.legal_acceptances/)
  assert.match(sql, /primary key \(user_id, version\)/)
  assert.match(sql, /alter table public\.legal_acceptances enable row level security/)
  assert.match(sql, /revoke all on table public\.legal_acceptances from anon, authenticated/)
  assert.match(sql, /for select using \(\(select auth\.uid\(\)\) = user_id\)/)
  assert.doesNotMatch(sql, /grant (insert|update|delete)[^;]*legal_acceptances/)
})

test('rpcs are pinned, definer and authenticated-only', () => {
  for (const fn of ['legal_status', 'legal_accept']) {
    const body = sql.split(`create or replace function public.${fn}(`)[1].split('end $$;')[0]
    assert.match(body, /security definer/, fn)
    assert.match(body, /set search_path = public/, fn)
    assert.match(body, /auth\.uid\(\)/, fn)
  }
  assert.match(sql, /revoke execute on function public\.legal_status\(\) from anon, public/)
  assert.match(sql, /revoke execute on function public\.legal_accept\(text\) from anon, public/)
  assert.match(sql, /grant execute on function public\.legal_accept\(text\) to authenticated/)
  assert.match(sql, /revoke execute on function public\._legal_current_version\(\) from anon, authenticated, public/)
})

test('only the current version can be accepted', () => {
  const body = sql.split('create or replace function public.legal_accept(')[1].split('end $$;')[0]
  assert.match(body, /p_version is distinct from public\._legal_current_version\(\)/)
  assert.match(body, /on conflict \(user_id, version\) do nothing/)
})

test('sql version mirrors LEGAL_VERSION in src/legal.js', () => {
  const m = sql.match(/_legal_current_version\(\)[\s\S]*?select '([0-9-]+)'::text/)
  assert.ok(m, 'version literal not found')
  assert.equal(m[1], LEGAL_VERSION)
})
