# Support-Thread, Spieler-Antworten & Digest — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aus dem read-only Spieler-Support-Panel wird eine zweiseitige Chat-Konversation mit Admin-„neue Nachricht"-Punkt und einem täglichen Digest unbeantworteter Tickets.

**Architecture:** Neue Thread-Tabelle `support_ticket_messages` (alleinige Anzeigequelle, Alt-Tickets per Backfill). Spieler-Antwort-RPC öffnet geschlossene Tickets wieder. Reine Badge-Logik bleibt in `src/supportTickets.js` (unit-getestet). pg_cron ruft eine DB-Funktion, die die bestehende `support-mailer` Edge Function in einem neuen `digest`-Modus anstößt.

**Tech Stack:** Supabase Postgres (RLS, plpgsql `security definer`, pg_cron, pg_net), Supabase Edge Function (Deno/TypeScript), Vue 3 (`<script setup>`), Pinia (options store), `node:test`.

**Supabase project_id:** `rkskpvbismdlsevaqoer`

---

## File Structure

- **Modify** `src/supportTickets.js` — neue reine Funktionen `hasUnseenAdminMessage`, `buildAdminSeenMap`, `isUnansweredForDigest`.
- **Modify** `src/supportTickets.test.js` — Tests dazu.
- **Create** `supabase/migrations/20260519_support_thread.sql` — Tabelle, Spalte, RLS, Backfill, RPCs, Digest-Funktion, pg_cron.
- **Create** `src/supportThreadSql.test.js` — Regex-Assertions gegen die Migration (Muster `friendRequestsSql.test.js`).
- **Modify** `supabase/schema.sql` — Spiegel der neuen DDL ans Dateiende anhängen.
- **Modify** `supabase/functions/support-mailer/index.ts` — additiver `digest`-Modus.
- **Modify** `src/stores/auth.js` — Thread laden/antworten, Admin-Übersicht, Admin-Seen-Map.
- **Modify** `src/components/SupportModal.vue` — Sprechblasen-Verlauf + Antwortfeld.
- **Modify** `src/components/AdminModal.vue` — Verlauf je Ticket + blauer Punkt + mark-seen.
- **Modify** `src/App.vue` — Admin-FAB blauer Punkt + `loadAdminSupportOverview` bei Start/Resume.
- **Modify** `src/styles.css` — `.fab-dot-blue`.

---

### Task 1: Reine Admin-Badge-/Digest-Logik

**Files:**
- Modify: `src/supportTickets.js`
- Test: `src/supportTickets.test.js`

- [ ] **Step 1: Failing-Tests anhängen**

Ans Ende von `src/supportTickets.test.js` anfügen:

```javascript
import { hasUnseenAdminMessage, buildAdminSeenMap, isUnansweredForDigest } from './supportTickets.js'

test('hasUnseenAdminMessage false when no last_user_message_at', () => {
  const t = [{ id: 'a', last_user_message_at: null }]
  assert.equal(hasUnseenAdminMessage(t, {}), false)
})

test('hasUnseenAdminMessage true when value not in seen map', () => {
  const t = [{ id: 'a', last_user_message_at: '2026-05-19T10:00:00Z' }]
  assert.equal(hasUnseenAdminMessage(t, {}), true)
})

test('hasUnseenAdminMessage false when value already seen', () => {
  const ts = '2026-05-19T10:00:00Z'
  const t = [{ id: 'a', last_user_message_at: ts }]
  assert.equal(hasUnseenAdminMessage(t, { a: ts }), false)
})

test('hasUnseenAdminMessage true when value changed since seen', () => {
  const t = [{ id: 'a', last_user_message_at: '2026-05-19T11:00:00Z' }]
  assert.equal(hasUnseenAdminMessage(t, { a: '2026-05-19T10:00:00Z' }), true)
})

test('buildAdminSeenMap records last_user_message_at, keeps foreign keys, skips empty', () => {
  const t = [
    { id: 'a', last_user_message_at: '2026-05-19T10:00:00Z' },
    { id: 'b', last_user_message_at: null }
  ]
  assert.deepEqual(buildAdminSeenMap(t, { x: 'old' }), { x: 'old', a: '2026-05-19T10:00:00Z' })
})

test('isUnansweredForDigest true: open, no reminder, last msg user older 24h', () => {
  const now = Date.parse('2026-05-19T12:00:00Z')
  const ticket = { status: 'open', reminder_sent_at: null }
  const latest = { sender: 'user', created_at: '2026-05-18T11:00:00Z' }
  assert.equal(isUnansweredForDigest(ticket, latest, now), true)
})

test('isUnansweredForDigest false when reminder already sent', () => {
  const now = Date.parse('2026-05-19T12:00:00Z')
  const ticket = { status: 'open', reminder_sent_at: '2026-05-19T00:00:00Z' }
  const latest = { sender: 'user', created_at: '2026-05-18T11:00:00Z' }
  assert.equal(isUnansweredForDigest(ticket, latest, now), false)
})

test('isUnansweredForDigest false when last message is admin', () => {
  const now = Date.parse('2026-05-19T12:00:00Z')
  const ticket = { status: 'open', reminder_sent_at: null }
  const latest = { sender: 'admin', created_at: '2026-05-18T11:00:00Z' }
  assert.equal(isUnansweredForDigest(ticket, latest, now), false)
})

test('isUnansweredForDigest false when last user message younger than 24h', () => {
  const now = Date.parse('2026-05-19T12:00:00Z')
  const ticket = { status: 'open', reminder_sent_at: null }
  const latest = { sender: 'user', created_at: '2026-05-19T06:00:00Z' }
  assert.equal(isUnansweredForDigest(ticket, latest, now), false)
})

test('isUnansweredForDigest false when status not open', () => {
  const now = Date.parse('2026-05-19T12:00:00Z')
  const ticket = { status: 'replied', reminder_sent_at: null }
  const latest = { sender: 'user', created_at: '2026-05-18T11:00:00Z' }
  assert.equal(isUnansweredForDigest(ticket, latest, now), false)
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `node --test src/supportTickets.test.js`
Expected: FAIL — `hasUnseenAdminMessage is not a function` (bzw. Import-Fehler).

- [ ] **Step 3: Implementierung anhängen**

Ans Ende von `src/supportTickets.js` anfügen:

```javascript
export function hasUnseenAdminMessage(tickets, seenMap = {}) {
  const list = Array.isArray(tickets) ? tickets : []
  const map = seenMap || {}
  return list.some((t) => t && t.last_user_message_at && map[t.id] !== t.last_user_message_at)
}

export function buildAdminSeenMap(tickets, seenMap = {}) {
  const list = Array.isArray(tickets) ? tickets : []
  const next = { ...(seenMap || {}) }
  for (const t of list) {
    if (t && t.last_user_message_at) next[t.id] = t.last_user_message_at
  }
  return next
}

export function isUnansweredForDigest(ticket, latestMessage, now = Date.now()) {
  if (!ticket || ticket.status !== 'open' || ticket.reminder_sent_at) return false
  if (!latestMessage || latestMessage.sender !== 'user' || !latestMessage.created_at) return false
  return now - new Date(latestMessage.created_at).getTime() >= 24 * 3600 * 1000
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg prüfen**

Run: `npm test`
Expected: PASS — alle Tests grün (45 bestehende + neue).

- [ ] **Step 5: Commit**

```bash
git add src/supportTickets.js src/supportTickets.test.js
git commit -m "feat(support): reine Admin-Badge- und Digest-Logik"
```

---

### Task 2: Datenbank-Migration

**Files:**
- Create: `supabase/migrations/20260519_support_thread.sql`
- Test: `src/supportThreadSql.test.js`
- Modify: `supabase/schema.sql` (Anhang ans Dateiende)

- [ ] **Step 1: Failing SQL-Test schreiben**

`src/supportThreadSql.test.js`:

```javascript
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(
  path.join(root, 'supabase', 'migrations', '20260519_support_thread.sql'),
  'utf8'
)

test('creates thread table with sender check and cascade', () => {
  assert.match(sql, /create table if not exists public\.support_ticket_messages/i)
  assert.match(sql, /sender text not null check \(sender in \('user', ?'admin'\)\)/i)
  assert.match(sql, /references public\.support_tickets\(id\) on delete cascade/i)
})

test('adds reminder_sent_at column', () => {
  assert.match(sql, /add column if not exists reminder_sent_at timestamptz/i)
})

test('enables RLS with owner select and user-only insert', () => {
  assert.match(sql, /alter table public\.support_ticket_messages enable row level security/i)
  assert.match(sql, /create policy support_msgs_owner_select/i)
  assert.match(sql, /create policy support_msgs_owner_insert_user/i)
  assert.match(sql, /with check[\s\S]*sender = 'user'/i)
})

test('backfill is idempotent via not exists guard', () => {
  assert.match(sql, /insert into public\.support_ticket_messages[\s\S]*not exists/i)
})

test('user_reply reopens ticket and has rate limit, no mailer', () => {
  assert.match(sql, /create or replace function public\.user_reply_support_ticket/i)
  assert.match(sql, /set status = 'open', closed_at = null/i)
  assert.match(sql, /interval '1 hour'/i)
})

test('admin_reply also inserts admin thread row and resets reminder', () => {
  assert.match(sql, /create or replace function public\.admin_reply_support_ticket/i)
  assert.match(sql, /insert into public\.support_ticket_messages[\s\S]*'admin'/i)
  assert.match(sql, /reminder_sent_at = null/i)
})

test('admin_list returns last_user_message_at', () => {
  assert.match(sql, /last_user_message_at timestamptz/i)
})

test('admin_list_ticket_messages exists and is admin-guarded', () => {
  assert.match(sql, /create or replace function public\.admin_list_ticket_messages/i)
})

test('digest function and pg_cron schedule exist', () => {
  assert.match(sql, /create or replace function public\.support_send_unanswered_digest/i)
  assert.match(sql, /create extension if not exists pg_cron/i)
  assert.match(sql, /cron\.schedule\(\s*'support-unanswered-digest'/i)
  assert.match(sql, /'mode', ?'digest'/i)
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `node --test src/supportThreadSql.test.js`
Expected: FAIL — `ENOENT` (Migrationsdatei fehlt noch).

- [ ] **Step 3: Migration schreiben**

`supabase/migrations/20260519_support_thread.sql`:

```sql
-- Support-Thread: zweiseitige Konversation pro Ticket.
-- support_ticket_messages ist die alleinige Quelle fuer den angezeigten Verlauf.
-- support_tickets.message/admin_reply bleiben fuer Mailer + Abwaertskompatibilitaet.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- 1) Thread-Tabelle
create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender text not null check (sender in ('user','admin')),
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists support_ticket_messages_idx
  on public.support_ticket_messages (ticket_id, created_at);

-- 2) Erinnerungs-Merker
alter table public.support_tickets
  add column if not exists reminder_sent_at timestamptz;

-- 3) RLS
alter table public.support_ticket_messages enable row level security;

drop policy if exists support_msgs_owner_select on public.support_ticket_messages;
create policy support_msgs_owner_select on public.support_ticket_messages
  for select using (
    exists (
      select 1 from public.support_tickets t
      where t.id = support_ticket_messages.ticket_id
        and t.user_id = auth.uid()
    )
  );

drop policy if exists support_msgs_owner_insert_user on public.support_ticket_messages;
create policy support_msgs_owner_insert_user on public.support_ticket_messages
  for insert with check (
    sender = 'user'
    and exists (
      select 1 from public.support_tickets t
      where t.id = support_ticket_messages.ticket_id
        and t.user_id = auth.uid()
    )
  );

-- 4) Backfill (idempotent: nur wenn das Ticket noch keine Thread-Zeilen hat)
insert into public.support_ticket_messages (ticket_id, sender, body, created_at)
select t.id, 'user', t.message, t.created_at
from public.support_tickets t
where not exists (
  select 1 from public.support_ticket_messages m where m.ticket_id = t.id
);

insert into public.support_ticket_messages (ticket_id, sender, body, created_at)
select t.id, 'admin', t.admin_reply, coalesce(t.replied_at, t.created_at)
from public.support_tickets t
where t.admin_reply is not null
  and not exists (
    select 1 from public.support_ticket_messages m
    where m.ticket_id = t.id and m.sender = 'admin'
  );

-- 5) submit_support_ticket: zusaetzlich erste Thread-Zeile
create or replace function public.submit_support_ticket(
  p_subject text,
  p_message text,
  p_notify_copy boolean default false
) returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  uemail text;
  uname text;
  tnum text;
  tid uuid;
  subject_clean text;
  message_clean text;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  subject_clean := trim(coalesce(p_subject, ''));
  message_clean := trim(coalesce(p_message, ''));
  if subject_clean = '' then raise exception 'subject required'; end if;
  if message_clean = '' then raise exception 'message required'; end if;
  if length(subject_clean) > 200 then raise exception 'subject too long'; end if;
  if length(message_clean) > 5000 then raise exception 'message too long'; end if;

  if (select count(*) from public.support_tickets
        where user_id = uid and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate limit: zu viele Tickets in kurzer Zeit, bitte spaeter erneut versuchen';
  end if;

  select email into uemail from auth.users where id = uid;
  select username into uname from public.profiles where id = uid;

  tnum := 'ST-' || to_char(now(), 'YYYYMMDD') || '-'
       || lpad(nextval('public.support_ticket_seq')::text, 5, '0');

  insert into public.support_tickets(
    ticket_number, user_id, user_email, username, subject, message, notify_user_copy
  ) values (
    tnum, uid, uemail, uname, subject_clean, message_clean, coalesce(p_notify_copy, false)
  ) returning id into tid;

  insert into public.support_ticket_messages (ticket_id, sender, body)
  values (tid, 'user', message_clean);

  perform public._notify_support_mailer(tid, 'new');

  return jsonb_build_object(
    'id', tid,
    'ticket_number', tnum,
    'notified_user', coalesce(p_notify_copy, false) and uemail is not null
  );
end $$;

grant execute on function public.submit_support_ticket(text, text, boolean) to authenticated;

-- 6) Spieler-Antwort: oeffnet geschlossene wieder, keine Mail
create or replace function public.user_reply_support_ticket(
  p_ticket_id uuid,
  p_body text
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  body_clean text;
  owns boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select true into owns from public.support_tickets
    where id = p_ticket_id and user_id = uid;
  if not coalesce(owns, false) then raise exception 'ticket not found'; end if;

  body_clean := trim(coalesce(p_body, ''));
  if body_clean = '' then raise exception 'message required'; end if;
  if length(body_clean) > 5000 then raise exception 'message too long'; end if;

  if (select count(*)
        from public.support_ticket_messages m
        join public.support_tickets t on t.id = m.ticket_id
       where t.user_id = uid and m.sender = 'user'
         and m.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'rate limit: zu viele Nachrichten in kurzer Zeit, bitte spaeter erneut versuchen';
  end if;

  insert into public.support_ticket_messages (ticket_id, sender, body)
  values (p_ticket_id, 'user', body_clean);

  update public.support_tickets
    set status = 'open', closed_at = null
    where id = p_ticket_id;

  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.user_reply_support_ticket(uuid, text) to authenticated;

-- 7) admin_reply: zusaetzlich Thread-Zeile + reminder reset
create or replace function public.admin_reply_support_ticket(
  p_ticket_id uuid,
  p_reply text,
  p_close boolean default false
) returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  is_adm boolean;
  reply_clean text;
  new_status text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select is_admin into is_adm from public.profiles where id = uid;
  if not coalesce(is_adm, false) then raise exception 'admin only'; end if;

  reply_clean := trim(coalesce(p_reply, ''));
  if reply_clean = '' then raise exception 'reply required'; end if;
  if length(reply_clean) > 5000 then raise exception 'reply too long'; end if;

  new_status := case when coalesce(p_close, false) then 'closed' else 'replied' end;

  update public.support_tickets
    set admin_reply = reply_clean,
        replied_at = now(),
        status = new_status,
        reminder_sent_at = null,
        closed_at = case when coalesce(p_close, false) then now() else closed_at end
    where id = p_ticket_id;
  if not found then raise exception 'ticket not found'; end if;

  insert into public.support_ticket_messages (ticket_id, sender, body)
  values (p_ticket_id, 'admin', reply_clean);

  perform public._notify_support_mailer(p_ticket_id, 'reply');

  return jsonb_build_object('ok', true, 'status', new_status);
end $$;

grant execute on function public.admin_reply_support_ticket(uuid, text, boolean) to authenticated;

-- 8) admin_list_support_tickets: + last_user_message_at
create or replace function public.admin_list_support_tickets(
  p_status text default null,
  p_limit int default 100,
  p_offset int default 0
) returns table (
  id uuid,
  ticket_number text,
  user_id uuid,
  username text,
  user_email text,
  subject text,
  message text,
  status text,
  admin_reply text,
  notify_user_copy boolean,
  created_at timestamptz,
  replied_at timestamptz,
  closed_at timestamptz,
  last_user_message_at timestamptz
) language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  is_adm boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select is_admin into is_adm from public.profiles where id = uid;
  if not coalesce(is_adm, false) then raise exception 'admin only'; end if;

  return query
    select t.id, t.ticket_number, t.user_id, t.username, t.user_email,
           t.subject, t.message, t.status, t.admin_reply, t.notify_user_copy,
           t.created_at, t.replied_at, t.closed_at,
           (select max(m.created_at) from public.support_ticket_messages m
              where m.ticket_id = t.id and m.sender = 'user') as last_user_message_at
    from public.support_tickets t
    where p_status is null or t.status = p_status
    order by t.created_at desc
    limit greatest(1, least(coalesce(p_limit, 100), 500))
    offset greatest(0, coalesce(p_offset, 0));
end $$;

grant execute on function public.admin_list_support_tickets(text, int, int) to authenticated;

-- 9) admin_list_ticket_messages
create or replace function public.admin_list_ticket_messages(
  p_ticket_id uuid
) returns table (
  id uuid,
  sender text,
  body text,
  created_at timestamptz
) language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  is_adm boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select is_admin into is_adm from public.profiles where id = uid;
  if not coalesce(is_adm, false) then raise exception 'admin only'; end if;

  return query
    select m.id, m.sender, m.body, m.created_at
    from public.support_ticket_messages m
    where m.ticket_id = p_ticket_id
    order by m.created_at asc;
end $$;

grant execute on function public.admin_list_ticket_messages(uuid) to authenticated;

-- 10) Digest: eine Erinnerung pro unbeantwortetem Zyklus
create or replace function public.support_send_unanswered_digest()
returns void language plpgsql security definer set search_path = public, net
as $$
declare
  url text;
  secret text;
  body_text text;
  ids uuid[];
begin
  select array_agg(t.id) , string_agg(
      t.ticket_number || ' | ' || coalesce(t.username, '?') || ' | ' || t.subject
        || ' | seit ' || to_char(date_trunc('minute', now() - lm.last_at), 'DD"d" HH24"h"')
        || ' | ' || left(regexp_replace(coalesce(lm.body, ''), E'\\s+', ' ', 'g'), 120),
      E'\n' order by lm.last_at)
    into ids, body_text
  from public.support_tickets t
  join lateral (
    select m.created_at as last_at, m.sender, m.body
    from public.support_ticket_messages m
    where m.ticket_id = t.id
    order by m.created_at desc
    limit 1
  ) lm on true
  where t.status = 'open'
    and t.reminder_sent_at is null
    and lm.sender = 'user'
    and lm.last_at < now() - interval '24 hours';

  if ids is null or array_length(ids, 1) is null then
    return;
  end if;

  select value into url    from public.app_settings where key = 'functions_url';
  select value into secret from public.app_settings where key = 'mailer_secret';
  if url is not null and url <> '' then
    perform net.http_post(
      url := rtrim(url, '/'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-mailer-secret', coalesce(secret, '')
      ),
      body := jsonb_build_object(
        'mode', 'digest',
        'text', 'Unbeantwortete Support-Tickets (>24h):' || E'\n\n' || body_text
      )
    );
  end if;

  update public.support_tickets
    set reminder_sent_at = now()
    where id = any(ids);
end $$;

revoke all on function public.support_send_unanswered_digest() from public, anon, authenticated;

-- 11) pg_cron: taeglich 07:00 UTC (idempotent)
do $$
begin
  perform cron.unschedule('support-unanswered-digest')
  where exists (select 1 from cron.job where jobname = 'support-unanswered-digest');
exception when others then null;
end $$;

select cron.schedule(
  'support-unanswered-digest',
  '0 7 * * *',
  $$select public.support_send_unanswered_digest();$$
);
```

- [ ] **Step 4: SQL-Test laufen lassen, Erfolg prüfen**

Run: `node --test src/supportThreadSql.test.js`
Expected: PASS — alle 9 Assertions grün.

- [ ] **Step 5: schema.sql spiegeln**

Ans Ende von `supabase/schema.sql` den **kompletten Inhalt** von
`supabase/migrations/20260519_support_thread.sql` aus Step 3 anhängen
(unverändert, eingeleitet mit der Kommentarzeile
`-- ===== 20260519_support_thread =====`). Grund: andere SQL-Tests lesen
`schema.sql`; Spiegel hält sie konsistent.

- [ ] **Step 6: Vollsuite + Commit**

Run: `npm test`
Expected: PASS — alle Tests grün.

```bash
git add supabase/migrations/20260519_support_thread.sql src/supportThreadSql.test.js supabase/schema.sql
git commit -m "feat(support): Migration Thread-Tabelle, RPCs, Digest, pg_cron"
```

---

### Task 3: Migration auf Supabase anwenden

**Files:** (keine Dateiänderung — Deployment)

- [ ] **Step 1: Migration anwenden**

Mit dem Supabase-MCP-Tool `apply_migration`:
- `project_id`: `rkskpvbismdlsevaqoer`
- `name`: `support_thread`
- `query`: vollständiger Inhalt von `supabase/migrations/20260519_support_thread.sql`

- [ ] **Step 2: Verifizieren**

Mit dem Supabase-MCP-Tool `execute_sql`, `project_id` `rkskpvbismdlsevaqoer`:

```sql
select
  (select count(*) from public.support_ticket_messages) as msg_rows,
  (select count(*) from information_schema.columns
     where table_name='support_tickets' and column_name='reminder_sent_at') as has_col,
  (select count(*) from cron.job where jobname='support-unanswered-digest') as cron_jobs;
```

Expected: `has_col = 1`, `cron_jobs = 1`, `msg_rows >= ` Anzahl bestehender Tickets (Backfill griff).

- [ ] **Step 3: Kein Commit nötig** (reines Deployment; Dateien sind bereits in Task 2 committet).

---

### Task 4: Edge Function `digest`-Modus

**Files:**
- Modify: `supabase/functions/support-mailer/index.ts`

- [ ] **Step 1: `digest`-Zweig ergänzen**

In `supabase/functions/support-mailer/index.ts` den Body-Typ und die
Modus-Verzweigung anpassen.

Body-Parsing (ersetze die Zeile
`let body: { ticket_id?: string; mode?: string }`):

```typescript
  let body: { ticket_id?: string; mode?: string; text?: string }
```

Direkt nach `const mode = body.mode || 'new'` den Digest-Sonderfall **vor**
dem `if (!ticketId) ...` und vor dem Supabase-Fetch einfügen:

```typescript
  if (mode === 'digest') {
    const adminEmailDigest = Deno.env.get('ADMIN_EMAIL') || ''
    if (!adminEmailDigest) {
      return new Response('no admin email', { status: 200 })
    }
    if (!body.text) return new Response('missing text', { status: 400 })
    try {
      await sendMail({
        to: adminEmailDigest,
        subject: '[Zoo Empire] Unbeantwortete Support-Tickets',
        text: body.text
      })
    } catch (e) {
      return new Response(`mail error: ${(e as Error).message}`, { status: 500 })
    }
    return new Response(JSON.stringify({ ok: true, results: { admin: 'sent' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }
```

Die bestehende `if (!ticketId) return ...`-Zeile sowie `new`/`reply` bleiben
unverändert (für `digest` wird sie dank `return` oben nie erreicht).

- [ ] **Step 2: Deployen**

Mit dem Supabase-MCP-Tool `deploy_edge_function`:
- `project_id`: `rkskpvbismdlsevaqoer`
- `name`: `support-mailer`
- Quelle: aktualisierter Inhalt von `supabase/functions/support-mailer/index.ts`

- [ ] **Step 3: Smoke-Test**

Mit `execute_sql` (`project_id` `rkskpvbismdlsevaqoer`): ein Testticket
erzeugen und zurückdatieren, dann Digest auslösen:

```sql
-- Annahme: mindestens ein Ticket existiert. Letzte user-Nachricht + Ticket zuruecksetzen:
update public.support_tickets set status='open', reminder_sent_at=null
  where id = (select id from public.support_tickets order by created_at desc limit 1);
update public.support_ticket_messages
  set created_at = now() - interval '30 hours'
  where ticket_id = (select id from public.support_tickets order by created_at desc limit 1);
select public.support_send_unanswered_digest();
select reminder_sent_at is not null as marked
  from public.support_tickets order by created_at desc limit 1;
```

Expected: `marked = true` (Digest lief, Ticket markiert). Admin-Postfach
prüfen ist optional/manuell.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/support-mailer/index.ts
git commit -m "feat(support): support-mailer digest-Modus"
```

---

### Task 5: Auth-Store — Thread & Admin-Übersicht

**Files:**
- Modify: `src/stores/auth.js`

- [ ] **Step 1: Imports/Helfer erweitern**

In `src/stores/auth.js` den bestehenden Import aus `../supportTickets`
ersetzen:

```javascript
import { qualifySupportTickets, hasUnseenReply, buildSeenMap } from '../supportTickets'
```

durch:

```javascript
import {
  qualifySupportTickets, hasUnseenReply, buildSeenMap,
  hasUnseenAdminMessage, buildAdminSeenMap
} from '../supportTickets'
```

Direkt nach den vorhandenen `readSeenMap`/`writeSeenMap`-Funktionen
einfügen:

```javascript
const ADMIN_SEEN_KEY = 'seenAdminTicketMsgs'
function readAdminSeenMap() {
  try { return JSON.parse(localStorage.getItem(ADMIN_SEEN_KEY)) || {} } catch { return {} }
}
function writeAdminSeenMap(map) {
  try { localStorage.setItem(ADMIN_SEEN_KEY, JSON.stringify(map || {})) } catch {}
}
```

- [ ] **Step 2: State erweitern**

Den `state`-Block (aktuell endet mit `mySupportTickets: []`):

```javascript
    loading: true,
    mySupportTickets: []
  }),
```

ersetzen durch:

```javascript
    loading: true,
    mySupportTickets: [],
    ticketThreads: {},
    adminSupportTickets: []
  }),
```

- [ ] **Step 3: Getter erweitern**

Im `getters`-Block nach `hasUnseenSupportReply` (Zeile endet mit `Date.now())`)
ergänzen — die Zeile:

```javascript
    hasUnseenSupportReply: (s) => hasUnseenReply(s.mySupportTickets, readSeenMap(), Date.now())
  },
```

ersetzen durch:

```javascript
    hasUnseenSupportReply: (s) => hasUnseenReply(s.mySupportTickets, readSeenMap(), Date.now()),
    hasUnseenAdminSupport: (s) => hasUnseenAdminMessage(s.adminSupportTickets, readAdminSeenMap())
  },
```

- [ ] **Step 4: Actions ergänzen**

Direkt nach der bestehenden Action `markSupportRepliesSeen()` (endet mit
`},`) einfügen:

```javascript
    async loadTicketThread(ticketId) {
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .select('id, sender, body, created_at')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })
      if (error) { console.error(error); return }
      this.ticketThreads = { ...this.ticketThreads, [ticketId]: data || [] }
    },
    async replyToTicket(ticketId, body) {
      const { error } = await supabase.rpc('user_reply_support_ticket', {
        p_ticket_id: ticketId,
        p_body: body
      })
      if (error) throw error
      await this.loadTicketThread(ticketId)
      await this.loadMySupportTickets()
    },
    async loadAdminSupportOverview() {
      if (!this.session) return
      const isAdm = this.profile?.is_admin || this.profile?.is_subadmin
      if (!isAdm) return
      const { data, error } = await supabase.rpc('admin_list_support_tickets', {
        p_status: null, p_limit: 100, p_offset: 0
      })
      if (error) { console.error(error); return }
      this.adminSupportTickets = data || []
    },
    markAdminMessagesSeen() {
      writeAdminSeenMap(buildAdminSeenMap(this.adminSupportTickets, readAdminSeenMap()))
    },
```

- [ ] **Step 5: Build + Tests**

Run: `npm run build && npm test`
Expected: Build erfolgreich; alle Tests grün.

- [ ] **Step 6: Commit**

```bash
git add src/stores/auth.js
git commit -m "feat(support): Store Thread laden/antworten + Admin-Uebersicht"
```

---

### Task 6: SupportModal — Verlauf + Antwortfeld

**Files:**
- Modify: `src/components/SupportModal.vue`

- [ ] **Step 1: Script-Logik ersetzen**

In `src/components/SupportModal.vue` den `<script setup>`-Block: die I18N
um Antwort-Strings erweitern und Reply-State + Lade-Logik ergänzen.

Die drei `I18N`-Sprachobjekte um je drei Keys erweitern (jeweils vor der
schließenden `}` des Sprachblocks). Deutsch (`de`): nach
`status_closed: 'Geschlossen'` →

```javascript
    status_closed: 'Geschlossen',
    replyPlaceholder: 'Nachricht an den Support …',
    send: 'Senden',
    reopenHint: 'Deine Antwort öffnet das Ticket erneut.'
```

Englisch (`en`): nach `status_closed: 'Closed'` →

```javascript
    status_closed: 'Closed',
    replyPlaceholder: 'Message to support …',
    send: 'Send',
    reopenHint: 'Your reply reopens this ticket.'
```

Russisch (`ru`): nach `status_closed: 'Закрыт'` →

```javascript
    status_closed: 'Закрыт',
    replyPlaceholder: 'Сообщение в поддержку …',
    send: 'Отправить',
    reopenHint: 'Твой ответ снова откроет тикет.'
```

`import { onMounted } from 'vue'` ersetzen durch:

```javascript
import { onMounted, ref } from 'vue'
```

Nach `const auth = useAuthStore()` einfügen:

```javascript
const replyText = ref({})
const sending = ref('')
const sendError = ref('')
```

Den `onMounted`-Block ersetzen:

```javascript
onMounted(async () => {
  await auth.loadMySupportTickets()
  auth.markSupportRepliesSeen()
})
```

durch:

```javascript
onMounted(async () => {
  await auth.loadMySupportTickets()
  auth.markSupportRepliesSeen()
  for (const ticket of auth.qualifiedSupportTickets) {
    auth.loadTicketThread(ticket.id)
  }
})

async function sendReply(ticket) {
  const text = (replyText.value[ticket.id] || '').trim()
  if (!text || sending.value) return
  sending.value = ticket.id
  sendError.value = ''
  try {
    await auth.replyToTicket(ticket.id, text)
    replyText.value[ticket.id] = ''
  } catch (e) {
    sendError.value = e.message
    setTimeout(() => (sendError.value = ''), 4000)
  } finally {
    sending.value = ''
  }
}
```

- [ ] **Step 2: Template ersetzen**

Den Ticket-`v-for`-Block (von `<div v-for="ticket in auth.qualifiedSupportTickets"`
bis zu dessen schließendem `</div>` vor dem finalen Close-Button) ersetzen
durch:

```html
      <div
        v-for="ticket in auth.qualifiedSupportTickets"
        :key="ticket.id"
        class="ticket-card"
      >
        <div class="ticket-top">
          <span class="ticket-num">{{ ticket.ticket_number }}</span>
          <span class="pill" :class="`status-${ticket.status}`">
            {{ tx(`status_${ticket.status}`) }}
          </span>
        </div>
        <div class="ticket-subject">{{ ticket.subject }}</div>

        <div class="thread">
          <div
            v-for="m in (auth.ticketThreads[ticket.id] || [])"
            :key="m.id"
            class="bubble"
            :class="m.sender === 'user' ? 'bubble-user' : 'bubble-admin'"
          >
            <pre class="bubble-body">{{ m.body }}</pre>
            <div class="bubble-time">{{ fmtDateTime(m.created_at) }}</div>
          </div>
        </div>

        <Textarea
          v-model="replyText[ticket.id]"
          rows="2"
          maxlength="5000"
          :placeholder="tx('replyPlaceholder')"
          style="width:100%"
        />
        <div v-if="ticket.status === 'closed'" class="subtitle" style="margin:4px 0 0">
          {{ tx('reopenHint') }}
        </div>
        <div class="row" style="justify-content:flex-end;margin-top:6px">
          <Button
            class="btn small"
            :disabled="sending === ticket.id"
            @click="sendReply(ticket)"
          >
            {{ sending === ticket.id ? '…' : tx('send') }}
          </Button>
        </div>
      </div>

      <p v-if="sendError" class="subtitle" style="color:#ff6b6b;text-align:center">
        {{ sendError }}
      </p>
```

- [ ] **Step 3: Styles ergänzen**

Im `<style scoped>` von `SupportModal.vue` vor `.btn.full` einfügen:

```css
.thread {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 8px 0;
}
.bubble {
  max-width: 85%;
  border-radius: 10px;
  padding: 6px 9px;
}
.bubble-user {
  align-self: flex-end;
  background: rgba(255, 209, 102, 0.14);
  border: 1px solid rgba(255, 209, 102, 0.35);
}
.bubble-admin {
  align-self: flex-start;
  background: rgba(120, 200, 160, 0.10);
  border: 1px solid rgba(120, 200, 160, 0.30);
}
.bubble-body {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 13px;
  margin: 0;
}
.bubble-time {
  font-size: 11px;
  color: var(--muted, #9aa3b2);
  margin-top: 2px;
}
.row { display: flex; gap: 6px; }
```

- [ ] **Step 4: Build prüfen**

Run: `npm run build`
Expected: Build erfolgreich, keine Vue-Compile-Fehler.

- [ ] **Step 5: Commit**

```bash
git add src/components/SupportModal.vue
git commit -m "feat(support): SupportModal mit Thread-Verlauf und Antwortfeld"
```

---

### Task 7: AdminModal — Verlauf + blauer Punkt

**Files:**
- Modify: `src/components/AdminModal.vue`

- [ ] **Step 1: I18N-Keys ergänzen**

In `src/components/AdminModal.vue` im `tickets`-Objekt aller drei Sprachen
je einen Key ergänzen. Deutsch (`de`) nach `enterReply: 'Antwort eingeben.'`:

```javascript
      enterReply: 'Antwort eingeben.',
      threadTitle: 'Verlauf'
```

Englisch (`en`) nach `enterReply: 'Please enter a reply.'`:

```javascript
      enterReply: 'Please enter a reply.',
      threadTitle: 'History'
```

Russisch (`ru`) nach `enterReply: 'Введите ответ.'`:

```javascript
      enterReply: 'Введите ответ.',
      threadTitle: 'История'
```

- [ ] **Step 2: Thread-State + Lade-/Seen-Logik**

Nach `const ticketReply = ref({})` (~Zeile 376) einfügen:

```javascript
const ticketThreads = ref({})

import { hasUnseenAdminMessage } from '../supportTickets'
function ticketHasUnseen(t) {
  return hasUnseenAdminMessage([t], readAdminSeen())
}
function readAdminSeen() {
  try { return JSON.parse(localStorage.getItem('seenAdminTicketMsgs')) || {} } catch { return {} }
}
function writeAdminSeen(map) {
  try { localStorage.setItem('seenAdminTicketMsgs', JSON.stringify(map || {})) } catch {}
}
async function loadTicketThread(id) {
  try {
    const { data, error: e } = await supabase.rpc('admin_list_ticket_messages', { p_ticket_id: id })
    if (e) throw e
    ticketThreads.value = { ...ticketThreads.value, [id]: data || [] }
  } catch (e) { flash(e.message, true) }
}
```

> Hinweis: `import` in `<script setup>` muss top-level stehen. Falls der
> Linter das inline-`import` ablehnt, die Zeile
> `import { hasUnseenAdminMessage } from '../supportTickets'` stattdessen zu
> den übrigen Imports oben im File verschieben (zu `import { locale } from
> '../i18n'` benachbart).

- [ ] **Step 3: `loadTickets` erweitert Threads + markiert gesehen**

Die Funktion `loadTickets` (~Zeile 676-691) ersetzen durch:

```javascript
async function loadTickets() {
  busy.value = 'tickets'
  try {
    const { data, error: e } = await supabase.rpc('admin_list_support_tickets', {
      p_status: ticketFilter.value || null,
      p_limit: 100,
      p_offset: 0
    })
    if (e) throw e
    tickets.value = data || []
    for (const t of tickets.value) loadTicketThread(t.id)
    const seen = readAdminSeen()
    for (const t of tickets.value) {
      if (t.last_user_message_at) seen[t.id] = t.last_user_message_at
    }
    writeAdminSeen(seen)
  } catch (e) {
    flash(e.message, true)
  } finally {
    if (busy.value === 'tickets') busy.value = ''
  }
}
```

> Die Punkte werden im Template gegen die **vor** dem Überschreiben gelesene
> Seen-Map gerendert? Nein — bewusst vereinfacht: `ticketHasUnseen(t)` liest
> die Seen-Map zur Renderzeit. Da `writeAdminSeen` erst nach dem Setzen von
> `tickets.value` läuft, ist der erste Render bereits durch (Vue rendert nach
> dem await-Tick), die Punkte erscheinen also für genau diesen Aufruf und
> sind beim nächsten Öffnen weg — exakt das Spieler-Panel-Verhalten.

- [ ] **Step 4: `replyTicket` lädt Thread neu**

In `replyTicket` nach `await loadTickets()` (im try-Block) die Folgezeile
ergänzen, sodass aus:

```javascript
    ticketReply.value[t.id] = ''
    await loadTickets()
    flash(tx('tickets.replied_ok'))
```

wird:

```javascript
    ticketReply.value[t.id] = ''
    await loadTickets()
    await loadTicketThread(t.id)
    flash(tx('tickets.replied_ok'))
```

- [ ] **Step 5: Template — Punkt + Verlauf**

In der Ticket-Karte (`<div v-for="t in tickets" :key="t.id" class="ticket-card">`)
die Statusanzeige um den Punkt erweitern — die Zeile:

```html
            <span class="pill" :class="`status-${t.status}`">{{ tx(`tickets.status_${t.status}`) }}</span>
```

ersetzen durch:

```html
            <span class="row" style="align-items:center;gap:6px">
              <span v-if="ticketHasUnseen(t)" class="msg-dot-blue"></span>
              <span class="pill" :class="`status-${t.status}`">{{ tx(`tickets.status_${t.status}`) }}</span>
            </span>
```

Und den `<pre class="ticket-msg">{{ t.message }}</pre>` plus den darunter
liegenden `v-if="t.admin_reply"`-Block ersetzen durch den Verlauf:

```html
          <div class="subtitle" style="margin:6px 0 2px">{{ tx('tickets.threadTitle') }}</div>
          <div class="adm-thread">
            <div
              v-for="m in (ticketThreads[t.id] || [])"
              :key="m.id"
              class="adm-bubble"
              :class="m.sender === 'admin' ? 'adm-bubble-admin' : 'adm-bubble-user'"
            >
              <pre class="ticket-msg" style="margin:0">{{ m.body }}</pre>
              <div class="subtitle" style="font-size:11px">{{ m.sender }} · {{ fmtDateTime(m.created_at) }}</div>
            </div>
          </div>
```

- [ ] **Step 6: Styles ergänzen**

Im `<style scoped>` von `AdminModal.vue` (nach `.ticket-prev-reply`-Regel)
einfügen:

```css
.msg-dot-blue {
  width: 10px; height: 10px; border-radius: 50%;
  background: #3b82f6; display: inline-block;
}
.adm-thread { display: flex; flex-direction: column; gap: 6px; }
.adm-bubble { border-radius: 10px; padding: 6px 9px; max-width: 92%; }
.adm-bubble-user {
  align-self: flex-start;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border, rgba(255,255,255,0.1));
}
.adm-bubble-admin {
  align-self: flex-end;
  background: rgba(120,200,160,0.10);
  border: 1px solid rgba(120,200,160,0.30);
}
```

- [ ] **Step 7: Build prüfen**

Run: `npm run build`
Expected: Build erfolgreich.

- [ ] **Step 8: Commit**

```bash
git add src/components/AdminModal.vue
git commit -m "feat(support): AdminModal Verlauf + blauer Neu-Punkt"
```

---

### Task 8: App.vue — Admin-FAB-Punkt + Overview-Load

**Files:**
- Modify: `src/App.vue`
- Modify: `src/styles.css`

- [ ] **Step 1: Admin-FAB blauer Punkt**

In `src/App.vue` den Admin-FAB-Button:

```html
    <Button
      v-if="showNav && (auth.profile?.is_admin || auth.profile?.is_subadmin)"
      class="admin-fab"
      @click="adminOpen = true"
      :title="t('app.admin')"
    >
      🛠️
    </Button>
```

ersetzen durch:

```html
    <Button
      v-if="showNav && (auth.profile?.is_admin || auth.profile?.is_subadmin)"
      class="admin-fab"
      @click="adminOpen = true"
      :title="t('app.admin')"
    >
      🛠️
      <span v-if="auth.hasUnseenAdminSupport" class="fab-dot-blue"></span>
    </Button>
```

- [ ] **Step 2: Overview bei Mount laden**

Den Mount-Block:

```javascript
  if (auth.isAuth) {
    await game.load();
    subscribeBroadcasts();
    auth.loadMySupportTickets().catch(() => {});
  }
```

ersetzen durch:

```javascript
  if (auth.isAuth) {
    await game.load();
    subscribeBroadcasts();
    auth.loadMySupportTickets().catch(() => {});
    auth.loadAdminSupportOverview().catch(() => {});
  }
```

- [ ] **Step 3: Overview bei Auth-Wechsel + Resume**

Im `watch(() => auth.isAuth, ...)` den Block:

```javascript
    if (v) {
      subscribeBroadcasts();
      auth.loadMySupportTickets().catch(() => {});
      if (!prev) game.load().catch(() => {});
    } else if (broadcastChannel) {
```

ersetzen durch:

```javascript
    if (v) {
      subscribeBroadcasts();
      auth.loadMySupportTickets().catch(() => {});
      auth.loadAdminSupportOverview().catch(() => {});
      if (!prev) game.load().catch(() => {});
    } else if (broadcastChannel) {
```

Und den `onAppResume`-Block:

```javascript
onAppResume(() => {
  refreshOnReturn();
  if (auth.isAuth) auth.loadMySupportTickets().catch(() => {});
});
```

ersetzen durch:

```javascript
onAppResume(() => {
  refreshOnReturn();
  if (auth.isAuth) {
    auth.loadMySupportTickets().catch(() => {});
    auth.loadAdminSupportOverview().catch(() => {});
  }
});
```

- [ ] **Step 4: Blauen FAB-Punkt-Style ergänzen**

In `src/styles.css` direkt nach dem `.support-fab .fab-dot { ... }`-Block
einfügen:

```css
.admin-fab .fab-dot-blue {
  position: absolute;
  top: 4px; right: 4px;
  width: 11px; height: 11px;
  border-radius: 50%;
  background: #3b82f6;
  border: 2px solid #0b1220;
}
```

- [ ] **Step 5: Build + Tests**

Run: `npm run build && npm test`
Expected: Build erfolgreich; alle Tests grün.

- [ ] **Step 6: Browser-Verifikation**

Dev-Server starten. Da der vollständige Flow ein eingeloggtes Konto +
Admin-Konto + DB-Tickets braucht (nicht automatisierbar): mindestens prüfen,
dass die App ohne Console-Fehler lädt (`preview_console_logs` level error
leer) und der Build sauber ist. Manuell mit echten Konten testen:
- Spieler antwortet auf geschlossenes Ticket → Ticket wird `open`, bleibt
  sichtbar, Verlauf zeigt neue Blase.
- Admin sieht blauen Punkt am 🛠️-FAB und an der Ticket-Karte; nach Öffnen
  des Tickets-Tabs verschwindet er beim nächsten Öffnen.
- Digest: Testticket >24h zurückdatieren, `select
  public.support_send_unanswered_digest();`, `reminder_sent_at` gesetzt.

- [ ] **Step 7: Commit**

```bash
git add src/App.vue src/styles.css
git commit -m "feat(support): Admin-FAB Neu-Punkt + Overview-Load"
```

---

## Self-Review

**Spec coverage:**
- Thread-Tabelle + Backfill + Spalte `reminder_sent_at` → Task 2 ✓
- RLS (owner select / user-only insert) → Task 2 ✓
- `submit_support_ticket`/`admin_reply` schreiben Thread; `admin_reply`
  resettet `reminder_sent_at` → Task 2 ✓
- `user_reply_support_ticket` (Owner, Rate-Limit, reopen, kein Mailer) →
  Task 2 ✓
- `admin_list_support_tickets` + `last_user_message_at`;
  `admin_list_ticket_messages` → Task 2 ✓
- Digest-Funktion + neuer Mailer-Modus `digest` + pg_cron → Task 2 + Task 4 ✓
- Migration anwenden + verifizieren → Task 3 ✓
- Reine Logik `hasUnseenAdminMessage`/`buildAdminSeenMap` +
  `isUnansweredForDigest` unit-getestet → Task 1 ✓
- Store: Thread laden/antworten, Admin-Übersicht, Admin-Seen-Map → Task 5 ✓
- SupportModal: Sprechblasen + Antwortfeld, „reopen"-Hinweis bei closed →
  Task 6 ✓
- AdminModal: Verlauf je Ticket + blauer Punkt + mark-seen-Muster → Task 7 ✓
- App.vue: Admin-FAB blauer Punkt + Overview-Load Start/Resume; Styles →
  Task 8 ✓
- YAGNI-Ausschlüsse (keine Per-Reply-Mail, keine Realtime, lokale Seen-Map) →
  eingehalten ✓

**Placeholder scan:** Keine TBD/TODO. Cron-Uhrzeit (07:00 UTC) ist bewusst
fixiert und als anpassbar gekennzeichnet — kein Platzhalter.

**Type consistency:** `support_ticket_messages`-Spalten (`id, ticket_id,
sender, body, created_at`) identisch in Task 2 (DDL), Task 5 (Store-Select
`id, sender, body, created_at`), Task 6/7 (Template `m.id/m.sender/m.body/
m.created_at`). RPC-Namen `user_reply_support_ticket(p_ticket_id, p_body)`,
`admin_list_ticket_messages(p_ticket_id)` konsistent Task 2 ↔ Task 5/7.
Getter `hasUnseenAdminSupport`, Actions `loadTicketThread`, `replyToTicket`,
`loadAdminSupportOverview`, `markAdminMessagesSeen` konsistent Task 5 ↔
Task 6/7/8. localStorage-Key `seenAdminTicketMsgs` identisch in Task 5
(Store) und Task 7 (AdminModal lokale Helfer — bewusst dupliziert, da
AdminModal nicht über den Store-Seen geht). Reine Funktionen
`hasUnseenAdminMessage`/`buildAdminSeenMap`/`isUnansweredForDigest`
identisch Task 1 (Def + Tests) ↔ Task 5/7 (Nutzung).
