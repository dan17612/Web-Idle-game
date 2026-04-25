-- Support-Tickets v2: Mailversand läuft über Edge Function `support-mailer`.
-- DB-RPC postet via pg_net an die Function. SMTP-Zugangsdaten werden in der
-- Edge Function als Secrets gehalten, nicht in der DB.
--
-- Einmaliges Setup nötig:
-- 1) Konfiguration in Tabelle public.app_settings (Supabase Managed Postgres
--    erlaubt kein ALTER DATABASE, daher Tabelle statt GUC):
--      insert into public.app_settings(key, value) values
--        ('functions_url',  'https://<project-ref>.supabase.co/functions/v1/support-mailer'),
--        ('mailer_secret', '<langer-zufallswert>')
--      on conflict (key) do update set value = excluded.value, updated_at = now();
-- 2) In der Edge Function (Supabase UI -> Edge Functions -> Secrets):
--      MAILER_SECRET    = <gleicher Wert wie app_settings.mailer_secret>
--      RESEND_API_KEY   = re_xxx
--      SUPPORT_FROM     = 'Zoo Empire <support@deine-domain.de>'
--      ADMIN_EMAIL      = daniil@schiller.pw

create extension if not exists pg_net with schema extensions;

-- Tabelle erweitern (Antwort, Zeitstempel)
alter table public.support_tickets
  add column if not exists admin_reply text,
  add column if not exists replied_at timestamptz,
  add column if not exists closed_at timestamptz;

-- Settings-Tabelle (statt GUCs, weil ALTER DATABASE auf Supabase nicht erlaubt ist)
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
revoke all on table public.app_settings from public, anon, authenticated;

-- interne Helper-Funktion: ruft die Edge Function asynchron auf
create or replace function public._notify_support_mailer(p_ticket_id uuid, p_mode text)
returns void language plpgsql security definer set search_path = public, net
as $$
declare
  url text;
  secret text;
begin
  select value into url    from public.app_settings where key = 'functions_url';
  select value into secret from public.app_settings where key = 'mailer_secret';
  if url is null or url = '' then
    return;
  end if;
  perform net.http_post(
    url := rtrim(url, '/'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-mailer-secret', coalesce(secret, '')
    ),
    body := jsonb_build_object('ticket_id', p_ticket_id, 'mode', p_mode)
  );
end $$;

revoke all on function public._notify_support_mailer(uuid, text) from public, authenticated, anon;

-- submit_support_ticket: nur DB-Insert + Edge-Function-Trigger
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
    raise exception 'rate limit: zu viele Tickets in kurzer Zeit, bitte später erneut versuchen';
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

  perform public._notify_support_mailer(tid, 'new');

  return jsonb_build_object(
    'id', tid,
    'ticket_number', tnum,
    'notified_user', coalesce(p_notify_copy, false) and uemail is not null
  );
end $$;

grant execute on function public.submit_support_ticket(text, text, boolean) to authenticated;

-- Admin: Tickets auflisten
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
  closed_at timestamptz
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
           t.created_at, t.replied_at, t.closed_at
    from public.support_tickets t
    where p_status is null or t.status = p_status
    order by t.created_at desc
    limit greatest(1, least(coalesce(p_limit, 100), 500))
    offset greatest(0, coalesce(p_offset, 0));
end $$;

grant execute on function public.admin_list_support_tickets(text, int, int) to authenticated;

-- Admin: Ticket beantworten (löst Antwort-Mail an den Spieler aus)
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
        closed_at = case when coalesce(p_close, false) then now() else closed_at end
    where id = p_ticket_id;
  if not found then raise exception 'ticket not found'; end if;

  perform public._notify_support_mailer(p_ticket_id, 'reply');

  return jsonb_build_object('ok', true, 'status', new_status);
end $$;

grant execute on function public.admin_reply_support_ticket(uuid, text, boolean) to authenticated;

-- Admin: Status setzen (open/replied/closed)
create or replace function public.admin_set_support_ticket_status(
  p_ticket_id uuid,
  p_status text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  is_adm boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select is_admin into is_adm from public.profiles where id = uid;
  if not coalesce(is_adm, false) then raise exception 'admin only'; end if;
  if p_status not in ('open', 'replied', 'closed') then
    raise exception 'invalid status';
  end if;

  update public.support_tickets
    set status = p_status,
        closed_at = case when p_status = 'closed' then coalesce(closed_at, now()) else closed_at end
    where id = p_ticket_id;
  if not found then raise exception 'ticket not found'; end if;
  return jsonb_build_object('ok', true, 'status', p_status);
end $$;

grant execute on function public.admin_set_support_ticket_status(uuid, text) to authenticated;
