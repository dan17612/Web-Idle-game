-- Autoklicker-Erkennung: Aktivität pro 5-Minuten-Slot zählen, zu genaue Muster
-- erkennen, dann Code-Abfrage (4 Ziffern) + automatisches Support-Ticket.
-- Keine automatische Sperre: Bis der Code eingegeben ist, lehnt der Server nur
-- Taps, Truhen und Shop-Käufe ab.
-- Spec: docs/superpowers/specs/2026-10-06-autoklicker-erkennung-design.md

-- ---------------------------------------------------------------------------
-- 1) Tabellen (nur über RPCs/Trigger erreichbar)
-- ---------------------------------------------------------------------------

create table if not exists public.automation_slots (
  user_id    uuid not null references auth.users(id) on delete cascade,
  slot_start timestamptz not null,
  first_at   timestamptz not null default now(),
  last_at    timestamptz not null default now(),
  actions    int not null default 1,
  primary key (user_id, slot_start)
);
alter table public.automation_slots enable row level security;
revoke all on table public.automation_slots from anon, authenticated;

create table if not exists public.automation_signals (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null,
  details    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists automation_signals_user_idx
  on public.automation_signals (user_id, kind, created_at desc);
alter table public.automation_signals enable row level security;
revoke all on table public.automation_signals from anon, authenticated;

create table if not exists public.automation_checks (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  reason      text not null check (reason in ('dauerlauf', 'takt', 'klickmuster')),
  details     jsonb not null default '{}'::jsonb,
  code        text not null check (code ~ '^[0-9]{4}$'),
  attempts    int not null default 0,
  wrong_total int not null default 0,
  ticket_id   uuid references public.support_tickets(id) on delete set null,
  created_at  timestamptz not null default now(),
  solved_at   timestamptz
);
create unique index if not exists automation_checks_one_open
  on public.automation_checks (user_id) where solved_at is null;
create index if not exists automation_checks_user_idx
  on public.automation_checks (user_id, created_at desc);
alter table public.automation_checks enable row level security;
revoke all on table public.automation_checks from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Schwellen. Spiegel: AUTOMATION_RULES in src/automationCheck.js
--    (src/automationSql.test.js vergleicht beide).
-- ---------------------------------------------------------------------------

create or replace function public._automation_rules()
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_build_object(
    'slot_minutes', 5,
    'run_window_slots', 96,
    'run_min_slots', 94,
    'takt_slots', 25,
    'takt_max_sd_s', 1.0,
    'click_window', 30,
    'click_max_spread_px', 1.5,
    'click_min_sd_ms', 8,
    'click_rel_sd', 0.04,
    'click_max_gap_ms', 5000,
    'click_reports_needed', 3,
    'click_report_window_h', 2,
    'click_report_cooldown_s', 60,
    'max_attempts', 5
  )
$$;

-- ---------------------------------------------------------------------------
-- 3) Helfer
-- ---------------------------------------------------------------------------

-- Zufälliger 4-stelliger Code (gen_random_uuid ist kryptografisch zufällig).
create or replace function public._automation_new_code()
returns text
language sql
volatile
set search_path = public
as $$
  select lpad(
    ((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint) % 10000)::text,
    4, '0'
  )
$$;

-- Wirft, solange eine Prüfung offen ist. Blockt damit Taps, Truhen und
-- Shop-Käufe (über die Tracking-Trigger). Keine Sperre des Accounts.
create or replace function public._automation_guard(p_uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_uid is not null and exists (
    select 1 from public.automation_checks
     where user_id = p_uid and solved_at is null
  ) then
    raise exception 'automation_check_required'
      using hint = 'call automation_status() and automation_verify(p_code)';
  end if;
end $$;

-- Lesbare Beschreibung für Ticket und Admin.
create or replace function public._automation_describe(p_reason text, p_details jsonb)
returns text
language sql
immutable
set search_path = public
as $$
  select case p_reason
    when 'dauerlauf' then format(
      'Dauerlauf: in %s von %s Shop-Rotationen (je 5 Min., letzte %s Std.) wurden Truhen/Taps/Käufe ausgelöst.',
      p_details->>'active_slots', p_details->>'window_slots', p_details->>'hours')
    when 'takt' then format(
      'Takt: %s Rotationen am Stück, erste Aktion jeweils im Abstand Ø %s s mit Streuung σ %s s (Mensch: meist > 10 s).',
      p_details->>'slots', p_details->>'mean_s', p_details->>'sd_s')
    when 'klickmuster' then format(
      'Klickmuster: %s auffällige Klickserien in %s Std. – zuletzt %s Klicks auf derselben Stelle (Streuung %s px), Abstand Ø %s ms, σ %s ms.',
      p_details->>'reports', p_details->>'window_h',
      p_details->'last'->>'n', p_details->'last'->>'spread_px',
      p_details->'last'->>'mean_ms', p_details->'last'->>'sd_ms')
    else coalesce(p_reason, '?')
  end
$$;

-- Ticket für das Admin-Team: offenes Auto-Ticket weiterführen, sonst neu.
-- Erste Nachricht als sender='user', damit Admin-Punkt und Admin-Mail wie bei
-- normalen Tickets auslösen.
create or replace function public._automation_open_ticket(p_uid uuid, p_reason text, p_details jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket uuid;
  v_email  text;
  v_name   text;
  v_num    text;
  v_body   text;
begin
  v_body := '🤖 Automatisch erstellt – Verdacht auf Automatisierung (Autoklicker/Makro).' || E'\n'
         || public._automation_describe(p_reason, p_details) || E'\n'
         || 'Erkannt: ' || to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC' || E'\n'
         || 'Der Spieler muss einen 4-stelligen Code eingeben, um weiterzuspielen. '
         || 'Es wurde keine Sperre verhängt – ein Admin entscheidet.';

  select c.ticket_id into v_ticket
    from public.automation_checks c
    join public.support_tickets t on t.id = c.ticket_id
   where c.user_id = p_uid and t.status <> 'closed'
   order by c.created_at desc
   limit 1;

  if v_ticket is not null then
    insert into public.support_ticket_messages (ticket_id, sender, body)
    values (v_ticket, 'user', replace(v_body, '🤖 Automatisch erstellt', '🤖 Erneut erkannt'));
    update public.support_tickets
       set status = 'open', closed_at = null
     where id = v_ticket;
    return v_ticket;
  end if;

  select email into v_email from auth.users where id = p_uid;
  select username into v_name from public.profiles where id = p_uid;
  v_num := 'ST-' || to_char(now(), 'YYYYMMDD') || '-'
        || lpad(nextval('public.support_ticket_seq')::text, 5, '0');

  insert into public.support_tickets (
    ticket_number, user_id, user_email, username, subject, message, notify_user_copy
  ) values (
    v_num, p_uid, v_email, v_name,
    left('🤖 Automatisierung erkannt: ' || coalesce(v_name, 'Spieler'), 200),
    v_body, false
  ) returning id into v_ticket;

  insert into public.support_ticket_messages (ticket_id, sender, body)
  values (v_ticket, 'user', v_body);

  begin
    perform public._notify_support_mailer(v_ticket, 'new');
  exception when others then
    null; -- Mail ist Best-Effort, die Prüfung muss trotzdem greifen.
  end;

  return v_ticket;
end $$;

-- Prüfung anlegen (oder offene zurückgeben).
create or replace function public._automation_flag(p_uid uuid, p_reason text, p_details jsonb)
returns public.automation_checks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_check  public.automation_checks;
  v_ticket uuid;
begin
  select * into v_check from public.automation_checks
   where user_id = p_uid and solved_at is null;
  if found then return v_check; end if;

  v_ticket := public._automation_open_ticket(p_uid, p_reason, coalesce(p_details, '{}'::jsonb));

  insert into public.automation_checks (user_id, reason, details, code, ticket_id)
  values (p_uid, p_reason, coalesce(p_details, '{}'::jsonb), public._automation_new_code(), v_ticket)
  on conflict do nothing
  returning * into v_check;

  if v_check.id is null then
    select * into v_check from public.automation_checks
     where user_id = p_uid and solved_at is null;
  end if;
  return v_check;
end $$;

-- Aktion zählen + Regeln prüfen (nur bei der ersten Aktion eines neuen Slots).
create or replace function public._automation_track(p_uid uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r          jsonb := public._automation_rules();
  v_slot     timestamptz := public._current_slot();
  v_inserted boolean;
  v_since    timestamptz;
  v_active   int;
  v_n        int;
  v_span     numeric;
  v_mean     numeric;
  v_sd       numeric;
begin
  if p_uid is null then return; end if;
  perform public._automation_guard(p_uid);

  insert into public.automation_slots (user_id, slot_start)
  values (p_uid, v_slot)
  on conflict (user_id, slot_start) do nothing
  returning true into v_inserted;

  if v_inserted is null then
    update public.automation_slots
       set last_at = now(), actions = actions + 1
     where user_id = p_uid and slot_start = v_slot;
    return;
  end if;

  -- Aufräumen (pro Spieler höchstens 1× pro Slot).
  delete from public.automation_slots
   where user_id = p_uid and slot_start < now() - interval '2 days';
  delete from public.automation_signals
   where user_id = p_uid and created_at < now() - interval '30 days';

  -- Nur Daten nach der letzten gelösten Prüfung zählen.
  select coalesce(max(solved_at), '-infinity'::timestamptz) into v_since
    from public.automation_checks where user_id = p_uid;

  -- Regel 1: Dauerlauf (z. B. 8 h lang jede Rotation genutzt).
  select count(*) into v_active
    from public.automation_slots
   where user_id = p_uid
     and slot_start >= v_since
     and slot_start > v_slot - make_interval(mins => (r->>'slot_minutes')::int * (r->>'run_window_slots')::int);

  if v_active >= (r->>'run_min_slots')::int then
    perform public._automation_flag(p_uid, 'dauerlauf', jsonb_build_object(
      'active_slots', v_active,
      'window_slots', (r->>'run_window_slots')::int,
      'hours', (r->>'slot_minutes')::int * (r->>'run_window_slots')::int / 60,
      'kind', p_kind
    ));
    return;
  end if;

  -- Regel 2: Takt (erste Aktion pro Slot in exakt gleichem Abstand).
  select count(*),
         extract(epoch from max(slot_start) - min(slot_start)),
         avg(gap),
         stddev_samp(gap)
    into v_n, v_span, v_mean, v_sd
    from (
      select slot_start,
             extract(epoch from first_at - lag(first_at) over (order by slot_start)) as gap
        from (
          select slot_start, first_at
            from public.automation_slots
           where user_id = p_uid and slot_start >= v_since
           order by slot_start desc
           limit (r->>'takt_slots')::int
        ) last_slots
    ) gaps;

  if v_n = (r->>'takt_slots')::int
     and v_span = ((r->>'takt_slots')::int - 1) * (r->>'slot_minutes')::int * 60
     and v_sd is not null
     and v_sd < (r->>'takt_max_sd_s')::numeric then
    perform public._automation_flag(p_uid, 'takt', jsonb_build_object(
      'slots', v_n,
      'mean_s', round(v_mean, 2),
      'sd_s', round(v_sd, 3),
      'kind', p_kind
    ));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4) Tracking-Trigger (bestehende RPCs bleiben unverändert)
-- ---------------------------------------------------------------------------

create or replace function public._automation_trg_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._automation_track(new.user_id, tg_argv[0]);
  return null;
end $$;

create or replace function public._automation_trg_tap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._automation_track(new.id, 'tap');
  return null;
end $$;

drop trigger if exists automation_track_chest on public.chest_purchases;
create trigger automation_track_chest
  after insert or update on public.chest_purchases
  for each row execute function public._automation_trg_purchase('chest');

drop trigger if exists automation_track_ticket_chest on public.ticket_chest_purchases;
create trigger automation_track_ticket_chest
  after insert or update on public.ticket_chest_purchases
  for each row execute function public._automation_trg_purchase('ticket_chest');

drop trigger if exists automation_track_shop on public.shop_purchases;
create trigger automation_track_shop
  after insert or update on public.shop_purchases
  for each row execute function public._automation_trg_purchase('shop');

drop trigger if exists automation_track_tap on public.profiles;
create trigger automation_track_tap
  after update of taps_used on public.profiles
  for each row
  when (new.taps_used > old.taps_used)
  execute function public._automation_trg_tap();

-- ---------------------------------------------------------------------------
-- 5) RPCs für den Client
-- ---------------------------------------------------------------------------

create or replace function public.automation_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid   uuid := auth.uid();
  v     public.automation_checks;
  v_num text;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select * into v from public.automation_checks
   where user_id = uid and solved_at is null;
  if not found then
    return jsonb_build_object('pending', false, 'server_now', now());
  end if;

  select ticket_number into v_num from public.support_tickets where id = v.ticket_id;

  return jsonb_build_object(
    'pending', true,
    'id', v.id,
    'code', v.code,
    'reason', v.reason,
    'details', v.details,
    'ticket_number', v_num,
    'attempts', v.attempts,
    'max_attempts', (public._automation_rules()->>'max_attempts')::int,
    'created_at', v.created_at,
    'server_now', now()
  );
end $$;

create or replace function public.automation_verify(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid     uuid := auth.uid();
  v       public.automation_checks;
  v_max   int := (public._automation_rules()->>'max_attempts')::int;
  v_input text := regexp_replace(coalesce(p_code, ''), '[^0-9]', '', 'g');
  v_secs  int;
  v_took  text;
  v_rotated boolean := false;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select * into v from public.automation_checks
   where user_id = uid and solved_at is null
   for update;
  if not found then
    return jsonb_build_object('ok', true, 'pending', false, 'server_now', now());
  end if;

  if v_input = v.code then
    update public.automation_checks set solved_at = now() where id = v.id;

    v_secs := greatest(0, extract(epoch from now() - v.created_at)::int);
    v_took := case
      when v_secs < 120 then v_secs || ' s'
      when v_secs < 7200 then (v_secs / 60) || ' min'
      else round(v_secs / 3600.0, 1) || ' h'
    end;

    if v.ticket_id is not null then
      insert into public.support_ticket_messages (ticket_id, sender, body, sender_name)
      values (
        v.ticket_id, 'admin',
        format('✅ Code korrekt eingegeben nach %s (Fehlversuche: %s). Der Spieler spielt weiter.',
               v_took, v.wrong_total),
        '🤖 Auto-Erkennung'
      );
    end if;

    return jsonb_build_object('ok', true, 'pending', false, 'server_now', now());
  end if;

  if v.attempts + 1 >= v_max then
    update public.automation_checks
       set attempts = 0,
           wrong_total = wrong_total + 1,
           code = public._automation_new_code()
     where id = v.id;
    v_rotated := true;
  else
    update public.automation_checks
       set attempts = attempts + 1,
           wrong_total = wrong_total + 1
     where id = v.id;
  end if;

  return public.automation_status()
      || jsonb_build_object('ok', false, 'rotated', v_rotated);
end $$;

-- Selbstmeldung des Clients (zu genaues Klickmuster). Kann nur den eigenen
-- Account treffen; Schwellen werden hier nochmals geprüft.
create or replace function public.automation_report(p_kind text, p_details jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid      uuid := auth.uid();
  r        jsonb := public._automation_rules();
  v_n      int;
  v_mean   numeric;
  v_sd     numeric;
  v_spread numeric;
  v_last   jsonb;
  v_since  timestamptz;
  v_count  int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_kind is distinct from 'click_pattern' then raise exception 'unknown kind'; end if;

  if exists (select 1 from public.automation_checks where user_id = uid and solved_at is null) then
    return public.automation_status();
  end if;

  begin
    v_n      := (p_details->>'n')::int;
    v_mean   := (p_details->>'mean_ms')::numeric;
    v_sd     := (p_details->>'sd_ms')::numeric;
    v_spread := (p_details->>'spread_px')::numeric;
  exception when others then
    return public.automation_status();
  end;

  if v_n is null or v_mean is null or v_sd is null or v_spread is null
     or v_n < (r->>'click_window')::int
     or v_spread < 0 or v_spread > (r->>'click_max_spread_px')::numeric
     or v_mean <= 0 or v_mean > (r->>'click_max_gap_ms')::numeric
     or v_sd < 0
     or v_sd > greatest((r->>'click_min_sd_ms')::numeric, (r->>'click_rel_sd')::numeric * v_mean) then
    return public.automation_status();
  end if;

  if exists (
    select 1 from public.automation_signals
     where user_id = uid and kind = 'click_pattern'
       and created_at > now() - make_interval(secs => (r->>'click_report_cooldown_s')::int)
  ) then
    return public.automation_status();
  end if;

  v_last := jsonb_build_object(
    'n', v_n,
    'mean_ms', round(v_mean, 1),
    'sd_ms', round(v_sd, 2),
    'spread_px', round(v_spread, 2)
  );
  insert into public.automation_signals (user_id, kind, details)
  values (uid, 'click_pattern', v_last);

  select coalesce(max(solved_at), '-infinity'::timestamptz) into v_since
    from public.automation_checks where user_id = uid;

  select count(*) into v_count
    from public.automation_signals
   where user_id = uid and kind = 'click_pattern'
     and created_at > greatest(v_since, now() - make_interval(hours => (r->>'click_report_window_h')::int));

  if v_count >= (r->>'click_reports_needed')::int then
    perform public._automation_flag(uid, 'klickmuster', jsonb_build_object(
      'reports', v_count,
      'window_h', (r->>'click_report_window_h')::int,
      'last', v_last
    ));
  end if;

  return public.automation_status();
end $$;

-- ---------------------------------------------------------------------------
-- 6) Rechte
-- ---------------------------------------------------------------------------

revoke all on function public._automation_rules() from public, anon, authenticated;
revoke all on function public._automation_new_code() from public, anon, authenticated;
revoke all on function public._automation_guard(uuid) from public, anon, authenticated;
revoke all on function public._automation_describe(text, jsonb) from public, anon, authenticated;
revoke all on function public._automation_open_ticket(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public._automation_flag(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public._automation_track(uuid, text) from public, anon, authenticated;
revoke all on function public._automation_trg_purchase() from public, anon, authenticated;
revoke all on function public._automation_trg_tap() from public, anon, authenticated;

revoke all on function public.automation_status() from public, anon;
revoke all on function public.automation_verify(text) from public, anon;
revoke all on function public.automation_report(text, jsonb) from public, anon;
grant execute on function public.automation_status() to authenticated;
grant execute on function public.automation_verify(text) to authenticated;
grant execute on function public.automation_report(text, jsonb) to authenticated;
