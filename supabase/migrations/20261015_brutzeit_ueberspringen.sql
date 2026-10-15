-- Brutzeit überspringen: Guthaben pro Spieler, einlösen in der Eier-Maschine,
-- verschenken über das Admin-Menü.
-- Spec: docs/superpowers/specs/2026-10-15-brutzeit-ueberspringen-design.md

create table if not exists public.egg_skip_tokens (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  qty        int not null default 0 check (qty >= 0),
  updated_at timestamptz not null default now()
);

alter table public.egg_skip_tokens enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies
                  where schemaname = 'public' and tablename = 'egg_skip_tokens'
                    and policyname = 'egg_skip_tokens own read') then
    create policy "egg_skip_tokens own read" on public.egg_skip_tokens
      for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

revoke all on public.egg_skip_tokens from anon, public;
revoke insert, update, delete on public.egg_skip_tokens from authenticated;
grant select on public.egg_skip_tokens to authenticated;

-- ---------------------------------------------------------------------------
-- Einlösen: laufenden Brutplatz sofort fertig machen.
-- ---------------------------------------------------------------------------
create or replace function public.egg_skip_use(p_slot int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_qty int;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select qty into v_qty from public.egg_skip_tokens where user_id = uid for update;
  if coalesce(v_qty, 0) < 1 then raise exception 'no egg skips'; end if;

  update public.egg_incubations
     set ready_at = now()
   where user_id = uid and slot = p_slot and ready_at > now();
  if not found then raise exception 'nothing to skip'; end if;

  update public.egg_skip_tokens
     set qty = qty - 1, updated_at = now()
   where user_id = uid
   returning qty into v_qty;

  return jsonb_build_object('slot', p_slot, 'egg_skips', v_qty, 'server_now', now());
end $$;

-- ---------------------------------------------------------------------------
-- Admin: Überspringen verschenken (@all, @online oder Namen mit Komma).
-- ---------------------------------------------------------------------------
create or replace function public.admin_gift_egg_skips(p_usernames text, p_qty int default 1)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  role text := public._admin_role();
  is_all boolean := false;
  is_online boolean := false;
  sent int := 0;
  missed text[] := '{}';
  ids uuid[];
  online_cutoff timestamptz := now() - interval '5 minutes';
  selector text := lower(trim(coalesce(p_usernames, '')));
begin
  if role is distinct from 'admin' then raise exception 'admin only'; end if;
  if p_qty is null or p_qty < 1 or p_qty > 10 then raise exception 'qty 1..10'; end if;

  if selector = '@all' then
    is_all := true;
    select array_agg(id) into ids from public.profiles;
  elsif selector = '@online' then
    is_online := true;
    select array_agg(id) into ids
      from public.profiles
     where last_collected_at >= online_cutoff;
  else
    select array_agg(p.id) into ids
      from (select distinct btrim(u) as name from unnest(string_to_array(p_usernames, ',')) u where btrim(u) <> '') x
      left join public.profiles p on p.username ilike x.name;
    select array_agg(x.name) into missed
      from (select distinct btrim(u) as name from unnest(string_to_array(p_usernames, ',')) u where btrim(u) <> '') x
     where not exists (select 1 from public.profiles p where p.username ilike x.name);
    ids := array_remove(ids, null);
  end if;
  if ids is null or cardinality(ids) = 0 then raise exception 'no recipients found'; end if;

  insert into public.egg_skip_tokens (user_id, qty, updated_at)
  select distinct r, p_qty, now() from unnest(ids) r
  on conflict (user_id) do update
     set qty = public.egg_skip_tokens.qty + excluded.qty,
         updated_at = now();
  get diagnostics sent = row_count;

  return jsonb_build_object(
    'sent', sent,
    'all', is_all,
    'online', is_online,
    'missed', coalesce(missed, '{}')
  );
end $$;

-- ---------------------------------------------------------------------------
-- Status der Eier-Maschine liefert zusätzlich das Guthaben.
-- ---------------------------------------------------------------------------
create or replace function public.get_incubation_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  first_inc public.egg_incubations;
  v_slots jsonb;
  v_skips int;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'slot', i.slot,
           'egg_type', i.egg_type,
           'started_at', i.started_at,
           'ready_at', i.ready_at,
           'ready_now', (now() >= i.ready_at)
         ) order by i.slot), '[]'::jsonb)
    into v_slots
    from public.egg_incubations i
   where i.user_id = uid;

  select coalesce((select qty from public.egg_skip_tokens where user_id = uid), 0)
    into v_skips;

  select * into first_inc from public.egg_incubations
   where user_id = uid order by ready_at, slot limit 1;

  if first_inc is null then
    return jsonb_build_object('active', false, 'slots', v_slots,
                              'max_slots', 2, 'egg_skips', v_skips,
                              'server_now', now());
  end if;
  return jsonb_build_object(
    'active', true,
    'slot', first_inc.slot,
    'egg_type', first_inc.egg_type,
    'started_at', first_inc.started_at,
    'ready_at', first_inc.ready_at,
    'ready_now', (now() >= first_inc.ready_at),
    'slots', v_slots,
    'max_slots', 2,
    'egg_skips', v_skips,
    'server_now', now()
  );
end $$;

grant execute on function public.egg_skip_use(int) to authenticated;
grant execute on function public.admin_gift_egg_skips(text, int) to authenticated;
grant execute on function public.get_incubation_status() to authenticated;
revoke execute on function public.egg_skip_use(int) from anon, public;
revoke execute on function public.admin_gift_egg_skips(text, int) from anon, public;
revoke execute on function public.get_incubation_status() from anon, public;
