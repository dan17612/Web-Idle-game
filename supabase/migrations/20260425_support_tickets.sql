-- Support-Tickets: Spieler stellen Anfragen aus den Einstellungen.
-- - Ticket wird in support_tickets gespeichert mit eindeutiger Ticketnummer.
-- - Admin (daniil@schiller.pw) bekommt jede Anfrage per E-Mail.
-- - Spieler bekommt optional (Häkchen) eine Bestätigungs-E-Mail mit Ticketnummer.
--
-- E-Mail-Versand läuft über Resend (https://resend.com) via pg_net.
-- Einmaliges Setup auf der DB nötig:
--   alter database postgres set app.resend_api_key = 're_xxx_dein_api_key';
--   alter database postgres set app.support_from = 'Zoo Empire <support@deine-domain.de>';
--   alter database postgres set app.support_admin = 'daniil@schiller.pw';

create extension if not exists pg_net with schema extensions;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  username text,
  subject text not null,
  message text not null,
  notify_user_copy boolean not null default false,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists support_tickets_user_idx on public.support_tickets (user_id, created_at desc);

alter table public.support_tickets enable row level security;

drop policy if exists support_tickets_owner_select on public.support_tickets;
create policy support_tickets_owner_select on public.support_tickets
  for select using (auth.uid() = user_id);

create sequence if not exists public.support_ticket_seq;

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
  resend_key text;
  from_addr text;
  admin_addr text;
  subject_clean text;
  message_clean text;
  payload_admin jsonb;
  payload_user jsonb;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  subject_clean := trim(coalesce(p_subject, ''));
  message_clean := trim(coalesce(p_message, ''));
  if subject_clean = '' then raise exception 'subject required'; end if;
  if message_clean = '' then raise exception 'message required'; end if;
  if length(subject_clean) > 200 then raise exception 'subject too long'; end if;
  if length(message_clean) > 5000 then raise exception 'message too long'; end if;

  -- Rate-Limit: max. 5 Tickets pro Stunde pro Nutzer
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

  begin resend_key  := nullif(current_setting('app.resend_api_key', true), ''); exception when others then resend_key  := null; end;
  begin from_addr   := nullif(current_setting('app.support_from',  true), ''); exception when others then from_addr   := null; end;
  begin admin_addr  := nullif(current_setting('app.support_admin', true), ''); exception when others then admin_addr  := null; end;

  if from_addr  is null then from_addr  := 'Zoo Empire <onboarding@resend.dev>'; end if;
  if admin_addr is null then admin_addr := 'daniil@schiller.pw'; end if;

  if resend_key is not null then
    payload_admin := jsonb_build_object(
      'from', from_addr,
      'to', jsonb_build_array(admin_addr),
      'reply_to', coalesce(uemail, admin_addr),
      'subject', '[' || tnum || '] ' || subject_clean,
      'text',
        'Neues Support-Ticket: ' || tnum || E'\n' ||
        'Spieler: ' || coalesce(uname, '?') || ' <' || coalesce(uemail, '?') || '>' || E'\n' ||
        'User-ID: ' || uid::text || E'\n\n' ||
        'Betreff: ' || subject_clean || E'\n\n' ||
        'Nachricht:' || E'\n' || message_clean
    );
    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || resend_key,
        'Content-Type', 'application/json'
      ),
      body := payload_admin
    );

    if coalesce(p_notify_copy, false) and uemail is not null then
      payload_user := jsonb_build_object(
        'from', from_addr,
        'to', jsonb_build_array(uemail),
        'subject', 'Dein Support-Ticket ' || tnum,
        'text',
          'Hallo ' || coalesce(uname, '') || E',\n\n' ||
          'wir haben dein Support-Ticket ' || tnum || ' erhalten und melden uns so bald wie möglich.' || E'\n\n' ||
          'Betreff: ' || subject_clean || E'\n\n' ||
          'Deine Nachricht:' || E'\n' || message_clean || E'\n\n' ||
          '— Zoo Empire'
      );
      perform net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || resend_key,
          'Content-Type', 'application/json'
        ),
        body := payload_user
      );
    end if;
  end if;

  return jsonb_build_object(
    'id', tid,
    'ticket_number', tnum,
    'notified_user', coalesce(p_notify_copy, false) and uemail is not null and resend_key is not null
  );
end $$;

grant execute on function public.submit_support_ticket(text, text, boolean) to authenticated;
