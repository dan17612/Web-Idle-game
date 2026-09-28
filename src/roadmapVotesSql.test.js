import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(
  path.join(root, 'supabase', 'migrations', '20260928_roadmap_downvotes.sql'),
  'utf8'
)

test('votes get a direction column limited to +1/-1, existing votes stay upvotes', () => {
  assert.match(sql, /add column if not exists value smallint not null default 1/)
  assert.match(sql, /check \(value in \(-1, 1\)\)/)
})

test('view keeps old columns compatible and appends the new ones', () => {
  assert.match(sql, /create or replace view public\.roadmap_view\s+with \(security_invoker = on\)/)
  assert.match(sql, /coalesce\(\(select sum\(v\.value\)[^)]*\), 0\)::bigint as vote_count/)
  assert.match(sql, /v\.user_id = auth\.uid\(\) and v\.value = 1\s*\) as my_vote/)
  const cols = ['vote_count', 'my_vote', 'up_count', 'down_count', 'my_value']
  const idx = cols.map((c) => sql.indexOf(`as ${c}`))
  assert.ok(idx.every((i) => i > 0), 'all view columns present')
  assert.deepEqual([...idx].sort((a, b) => a - b), idx, 'new columns appended after the old ones')
})

test('vote_idea takes a direction, toggles on repeat and validates input', () => {
  assert.match(sql, /drop function if exists public\.vote_idea\(uuid\)/)
  assert.match(sql, /create or replace function public\.vote_idea\(p_idea_id uuid, p_value int default 1\)/)
  assert.match(sql, /p_value not in \(-1, 0, 1\) then\s+raise exception 'invalid vote'/)
  assert.match(sql, /if p_value = 0 or cur = p_value then\s+delete from public\.roadmap_votes/)
  assert.match(sql, /on conflict \(idea_id, user_id\)\s+do update set value = excluded\.value/)
  assert.match(sql, /for update/)
})

test('vote_idea answer keeps the legacy fields for older apps', () => {
  assert.match(sql, /'voted', mine = 1/)
  assert.match(sql, /'count', up_cnt - down_cnt/)
  assert.match(sql, /'score', up_cnt - down_cnt/)
  assert.match(sql, /'my_vote', mine/)
})

test('rpc pins search_path and is only callable by signed-in players', () => {
  assert.match(sql, /returns jsonb language plpgsql security definer set search_path = public/)
  for (const sig of [
    'vote_idea\\(uuid, int\\)',
    'submit_idea\\(text, text\\)',
    'delete_own_idea\\(uuid\\)',
    'admin_set_idea_status\\(uuid, text\\)',
    'admin_delete_idea\\(uuid\\)'
  ]) {
    assert.match(sql, new RegExp(`revoke all on function public\\.${sig} from public, anon`))
    assert.match(sql, new RegExp(`grant execute on function public\\.${sig} to authenticated`))
  }
})
