import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { AUTOMATION_RULES } from './automationCheck.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(
  path.join(root, 'supabase', 'migrations', '20261006_autoklicker_erkennung.sql'),
  'utf8'
)

function fnBody(name) {
  const start = sql.indexOf(`create or replace function public.${name}(`)
  assert.ok(start >= 0, `function ${name} missing`)
  const end = sql.indexOf('$$;', start)
  return sql.slice(start, end)
}

test('three internal tables with RLS and no client access', () => {
  for (const t of ['automation_slots', 'automation_signals', 'automation_checks']) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${t}`))
    assert.match(sql, new RegExp(`alter table public\\.${t} enable row level security`))
    assert.match(sql, new RegExp(`revoke all on table public\\.${t} from anon, authenticated`))
  }
  assert.doesNotMatch(sql, /create policy/)
  assert.doesNotMatch(sql, /grant (select|insert|update|delete)[^;]*on table/)
  assert.match(sql, /primary key \(user_id, slot_start\)/)
})

test('only one open check per player, 4-digit code', () => {
  assert.match(sql, /create unique index if not exists automation_checks_one_open\s+on public\.automation_checks \(user_id\) where solved_at is null/)
  assert.match(sql, /code\s+text not null check \(code ~ '\^\[0-9\]\{4\}\$'\)/)
  assert.match(sql, /reason in \('dauerlauf', 'takt', 'klickmuster'\)/)
  assert.match(fnBody('_automation_new_code'), /gen_random_uuid\(\)/)
  assert.match(fnBody('_automation_new_code'), /% 10000\)::text,\s*4, '0'/)
})

test('rules mirror AUTOMATION_RULES in src/automationCheck.js', () => {
  const body = fnBody('_automation_rules')
  const pairs = [...body.matchAll(/'([a-z_]+)',\s*([0-9.]+)/g)]
  const fromSql = Object.fromEntries(pairs.map(([, k, v]) => [k, Number(v)]))
  assert.deepEqual(fromSql, { ...AUTOMATION_RULES })
})

test('every function pins search_path, definer where it touches data', () => {
  const fns = [...sql.matchAll(/create or replace function public\.([a-z_]+)\(/g)].map((m) => m[1])
  assert.ok(fns.length >= 12)
  for (const name of fns) {
    assert.match(fnBody(name), /set search_path = public/, `${name} search_path`)
  }
  for (const name of ['_automation_guard', '_automation_open_ticket', '_automation_flag', '_automation_track',
    '_automation_trg_purchase', '_automation_trg_tap', 'automation_status', 'automation_verify', 'automation_report']) {
    assert.match(fnBody(name), /security definer/, `${name} definer`)
  }
})

test('helpers are revoked, client RPCs only for authenticated', () => {
  for (const name of ['_automation_rules\\(\\)', '_automation_new_code\\(\\)', '_automation_guard\\(uuid\\)',
    '_automation_describe\\(text, jsonb\\)', '_automation_open_ticket\\(uuid, text, jsonb\\)',
    '_automation_flag\\(uuid, text, jsonb\\)', '_automation_track\\(uuid, text\\)',
    '_automation_trg_purchase\\(\\)', '_automation_trg_tap\\(\\)']) {
    assert.match(sql, new RegExp(`revoke all on function public\\.${name} from public, anon, authenticated`))
  }
  for (const name of ['automation_status\\(\\)', 'automation_verify\\(text\\)', 'automation_report\\(text, jsonb\\)']) {
    assert.match(sql, new RegExp(`revoke all on function public\\.${name} from public, anon;`))
    assert.match(sql, new RegExp(`grant execute on function public\\.${name} to authenticated;`))
  }
  assert.doesNotMatch(sql, /to anon/)
})

test('triggers track taps, chests, ticket chests and shop buys', () => {
  assert.match(sql, /after insert or update on public\.chest_purchases[\s\S]*?_automation_trg_purchase\('chest'\)/)
  assert.match(sql, /after insert or update on public\.ticket_chest_purchases[\s\S]*?_automation_trg_purchase\('ticket_chest'\)/)
  assert.match(sql, /after insert or update on public\.shop_purchases[\s\S]*?_automation_trg_purchase\('shop'\)/)
  assert.match(sql, /after update of taps_used on public\.profiles\s+for each row\s+when \(new\.taps_used > old\.taps_used\)/)
})

test('guard blocks every tracked action while a check is open', () => {
  assert.match(fnBody('_automation_guard'), /solved_at is null[\s\S]*raise exception 'automation_check_required'/)
  const track = fnBody('_automation_track')
  assert.ok(track.indexOf('_automation_guard(p_uid)') < track.indexOf('insert into public.automation_slots'))
})

test('rules only run once per slot and ignore data before the last solved check', () => {
  const track = fnBody('_automation_track')
  assert.match(track, /on conflict \(user_id, slot_start\) do nothing\s+returning true into v_inserted/)
  assert.match(track, /if v_inserted is null then[\s\S]*?return;\s+end if;/)
  assert.match(track, /coalesce\(max\(solved_at\), '-infinity'::timestamptz\)/)
  assert.match(track, /v_active >= \(r->>'run_min_slots'\)::int/)
  assert.match(track, /stddev_samp\(gap\)/)
  assert.match(track, /v_span = \(\(r->>'takt_slots'\)::int - 1\) \* \(r->>'slot_minutes'\)::int \* 60/)
  assert.match(track, /v_sd < \(r->>'takt_max_sd_s'\)::numeric/)
})

test('verify rotates the code after max attempts and logs the solve in the ticket', () => {
  const v = fnBody('automation_verify')
  assert.match(v, /for update/)
  assert.match(v, /regexp_replace\(coalesce\(p_code, ''\), '\[\^0-9\]', '', 'g'\)/)
  assert.match(v, /if v\.attempts \+ 1 >= v_max then[\s\S]*code = public\._automation_new_code\(\)/)
  assert.match(v, /set solved_at = now\(\)/)
  assert.match(v, /'🤖 Auto-Erkennung'/)
})

test('click reports are re-checked, throttled and need repeats', () => {
  const r = fnBody('automation_report')
  assert.match(r, /p_kind is distinct from 'click_pattern'/)
  assert.match(r, /v_n < \(r->>'click_window'\)::int/)
  assert.match(r, /v_spread > \(r->>'click_max_spread_px'\)::numeric/)
  assert.match(r, /greatest\(\(r->>'click_min_sd_ms'\)::numeric, \(r->>'click_rel_sd'\)::numeric \* v_mean\)/)
  assert.match(r, /click_report_cooldown_s/)
  assert.match(r, /v_count >= \(r->>'click_reports_needed'\)::int/)
})

test('ticket goes to the admin queue and is reused while open', () => {
  const t = fnBody('_automation_open_ticket')
  assert.match(t, /t\.status <> 'closed'/)
  assert.match(t, /'🤖 Erneut erkannt'/)
  assert.match(t, /nextval\('public\.support_ticket_seq'\)/)
  assert.match(t, /'🤖 Automatisierung erkannt: '/)
  assert.match(t, /values \(v_ticket, 'user', v_body\)/)
  assert.match(t, /_notify_support_mailer\(v_ticket, 'new'\)[\s\S]*exception when others/)
})

test('no automatic ban', () => {
  assert.doesNotMatch(sql, /is_banned\s*=\s*true/)
  assert.doesNotMatch(sql, /banned_until/)
  assert.doesNotMatch(sql, /admin_set_user_ban\(/)
})
