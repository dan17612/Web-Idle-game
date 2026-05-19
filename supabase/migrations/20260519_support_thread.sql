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
-- Rueckgabetyp aendert sich (neue Spalte) -> erst droppen, dann neu anlegen.
drop function if exists public.admin_list_support_tickets(text, int, int);
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
