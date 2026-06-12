-- Drift-Rennen Minispiel: 12 Level, Fortschritt + Sterne pro Level.
-- Erstabschluss zahlt volle Belohnung (Coins, alle 3 Level Tickets),
-- Wiederholungen nur einen kleinen Coin-Bonus.

create table if not exists public.drift_progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  highest_level int not null default 0 check (highest_level between 0 and 12),
  stars jsonb not null default '{}'::jsonb,
  total_finishes int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.drift_progress enable row level security;
drop policy if exists "drift_progress self read" on public.drift_progress;
create policy "drift_progress self read" on public.drift_progress
  for select using ((select auth.uid()) = user_id);

revoke all on table public.drift_progress from anon;
grant select on table public.drift_progress to authenticated;

-- Belohnung pro Level: Coins wachsen quadratisch, Tickets auf Level 3/6/9/12.
create or replace function public._drift_reward(p_level int)
returns table (coins bigint, tickets bigint)
language sql immutable set search_path = public as $$
  select
    (1500 * p_level * p_level)::bigint,
    (case p_level when 3 then 1 when 6 then 2 when 9 then 3 when 12 then 5 else 0 end)::bigint;
$$;

create or replace function public.get_drift_progress()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_row public.drift_progress%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into v_row from public.drift_progress where user_id = uid;
  return jsonb_build_object(
    'highest_level', coalesce(v_row.highest_level, 0),
    'stars', coalesce(v_row.stars, '{}'::jsonb),
    'total_finishes', coalesce(v_row.total_finishes, 0),
    'max_level', 12
  );
end $$;
grant execute on function public.get_drift_progress() to authenticated;

create or replace function public.complete_drift_level(p_level int, p_stars int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_highest int;
  v_stars jsonb;
  v_prev_stars int;
  v_first boolean;
  v_base record;
  v_coins bigint;
  v_tickets bigint;
  new_coins bigint;
  new_tickets bigint;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_level is null or p_level < 1 or p_level > 12 then
    raise exception 'invalid level';
  end if;
  if p_stars is null or p_stars < 1 or p_stars > 3 then
    raise exception 'invalid stars';
  end if;

  insert into public.drift_progress (user_id)
  values (uid)
  on conflict (user_id) do nothing;

  select highest_level, stars into v_highest, v_stars
    from public.drift_progress where user_id = uid for update;

  if p_level > v_highest + 1 then raise exception 'level locked'; end if;

  v_first := (p_level = v_highest + 1);
  select * into v_base from public._drift_reward(p_level);
  if v_first then
    v_coins := v_base.coins;
    if p_stars = 3 then
      v_coins := v_coins + v_base.coins / 2;
    end if;
    v_tickets := v_base.tickets;
  else
    v_coins := greatest(100, v_base.coins / 20);
    v_tickets := 0;
  end if;

  v_prev_stars := coalesce((v_stars ->> p_level::text)::int, 0);

  update public.drift_progress
     set highest_level = greatest(highest_level, p_level),
         stars = jsonb_set(stars, array[p_level::text],
                           to_jsonb(greatest(v_prev_stars, p_stars))),
         total_finishes = total_finishes + 1,
         updated_at = now()
   where user_id = uid;

  update public.profiles
     set coins = coins + v_coins,
         tickets = tickets + v_tickets
   where id = uid
   returning coins, tickets into new_coins, new_tickets;

  return jsonb_build_object(
    'level', p_level,
    'first_clear', v_first,
    'stars', greatest(v_prev_stars, p_stars),
    'coins_added', v_coins,
    'tickets_added', v_tickets,
    'coins', new_coins,
    'tickets', new_tickets,
    'highest_level', greatest(v_highest, p_level),
    'server_now', now()
  );
end $$;
grant execute on function public.complete_drift_level(int, int) to authenticated;

-- anon darf die RPCs gar nicht erst aufrufen.
revoke execute on function public.get_drift_progress() from anon, public;
revoke execute on function public.complete_drift_level(int, int) from anon, public;
