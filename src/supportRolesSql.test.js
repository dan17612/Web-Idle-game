import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(
  path.join(root, 'supabase', 'migrations', '20260928_support_rollen_und_absender.sql'),
  'utf8'
)

test('messages remember which admin answered', () => {
  assert.match(sql, /add column if not exists sender_id uuid references auth\.users on delete set null/)
  assert.match(sql, /add column if not exists sender_name text/)
  assert.match(sql, /sender_role in \('admin', 'subadmin'\)/)
  assert.match(sql, /insert into public\.support_ticket_messages \(ticket_id, sender, body, sender_id, sender_name, sender_role\)\s+values \(p_ticket_id, 'admin', reply_clean, uid, uname, role\)/)
  assert.match(sql, /select m\.id, m\.sender, m\.body, m\.created_at, m\.sender_name, m\.sender_role/)
})

test('ticket rpcs accept admins and sub-admins', () => {
  for (const fn of ['admin_reply_support_ticket', 'admin_list_support_tickets', 'admin_list_ticket_messages']) {
    const body = sql.split(`create or replace function public.${fn}(`)[1].split('end $$;')[0]
    assert.match(body, /_admin_role\(\)/, fn)
    assert.doesNotMatch(body, /select is_admin into/, fn)
    assert.match(body, /security definer set search_path = public/, fn)
  }
})

test('shop, gifts, broadcast, promo and roadmap admin are admin-only', () => {
  for (const fn of [
    'admin_broadcast', 'admin_force_add', 'admin_force_remove', 'admin_force_rotation',
    'admin_set_species_enabled', 'admin_set_species_weight', 'admin_queue_gift',
    'admin_queue_gift_bulk', 'admin_list_promo_codes', 'admin_set_idea_status', 'admin_delete_idea'
  ]) {
    assert.match(sql, new RegExp(`'${fn}\\(`), fn)
  }
  assert.match(sql, /new_guard constant text := 'if role is distinct from ''admin'' then raise exception ''admin only''; end if;'/)
  assert.match(sql, /raise exception 'guard not found in %'/)
})

test('ban and user search stay open for sub-admins', () => {
  const list = sql.split('foreach fn in array array[')[1].split('] loop')[0]
  assert.doesNotMatch(list, /admin_set_user_ban|admin_list_users|admin_set_support_ticket_status/)
})

test('ticket rpcs are not callable by anon', () => {
  for (const sig of ['admin_reply_support_ticket\\(uuid, text, boolean\\)', 'admin_list_support_tickets\\(text, int, int\\)', 'admin_list_ticket_messages\\(uuid\\)']) {
    assert.match(sql, new RegExp(`revoke all on function public\\.${sig} from public, anon`))
    assert.match(sql, new RegExp(`grant execute on function public\\.${sig} to authenticated`))
  }
})
