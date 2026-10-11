-- Regelwerk: Nutzungsbedingungen + Datenschutz müssen von jedem Spieler
-- mindestens einmal akzeptiert werden. Neue Textfassung ⇒ neue Version ⇒
-- erneute Zustimmung. Jede Zustimmung bleibt als Nachweis erhalten.
-- Spec: docs/superpowers/specs/2026-10-11-regelwerk-zustimmung-design.md

-- ---------------------------------------------------------------------------
-- 1) Tabelle (nur über RPCs beschreibbar)
-- ---------------------------------------------------------------------------

create table if not exists public.legal_acceptances (
  user_id     uuid not null references auth.users(id) on delete cascade,
  version     text not null check (version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  accepted_at timestamptz not null default now(),
  primary key (user_id, version)
);
alter table public.legal_acceptances enable row level security;
revoke all on table public.legal_acceptances from anon, authenticated;
grant select on table public.legal_acceptances to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'legal_acceptances'
       and policyname = 'legal_acceptances_select_own'
  ) then
    create policy legal_acceptances_select_own on public.legal_acceptances
      for select using ((select auth.uid()) = user_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Aktuelle Version. Spiegel: LEGAL_VERSION in src/legal.js
--    (src/legalSql.test.js vergleicht beide).
-- ---------------------------------------------------------------------------

create or replace function public._legal_current_version()
returns text
language sql
immutable
set search_path = public
as $$
  select '2026-10-11'::text
$$;

-- ---------------------------------------------------------------------------
-- 3) Status und Zustimmung
-- ---------------------------------------------------------------------------

create or replace function public.legal_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_current text := public._legal_current_version();
  v_row public.legal_acceptances;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select * into v_row
    from public.legal_acceptances
   where user_id = uid
   order by accepted_at desc
   limit 1;

  return jsonb_build_object(
    'current_version', v_current,
    'accepted_version', v_row.version,
    'accepted_at', v_row.accepted_at,
    'needs_acceptance', not exists (
      select 1 from public.legal_acceptances
       where user_id = uid and version = v_current
    ),
    'server_now', now()
  );
end $$;

create or replace function public.legal_accept(p_version text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_version is distinct from public._legal_current_version() then
    raise exception 'legal version mismatch';
  end if;

  insert into public.legal_acceptances (user_id, version)
  values (uid, p_version)
  on conflict (user_id, version) do nothing;

  return public.legal_status();
end $$;

revoke execute on function public._legal_current_version() from anon, authenticated, public;
revoke execute on function public.legal_status() from anon, public;
revoke execute on function public.legal_accept(text) from anon, public;
grant execute on function public.legal_status() to authenticated;
grant execute on function public.legal_accept(text) to authenticated;
