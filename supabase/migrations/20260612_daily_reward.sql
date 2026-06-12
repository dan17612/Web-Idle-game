-- Tägliche Belohnung: Streak-basierte Rewards (Coins + Tickets) im 7-Tage-Zyklus.
-- Woche multipliziert die Coins (max x10). Verpasster Tag setzt den Streak zurück.

alter table public.profiles
  add column if not exists daily_streak int not null default 0,
  add column if not exists daily_last_claim date;

-- Basis-Belohnung pro Zyklustag (1..7).
create or replace function public._daily_reward_base(p_cycle int)
returns table (coins bigint, tickets bigint)
language sql immutable set search_path = public as $$
  select
    (case p_cycle
       when 1 then 1000
       when 2 then 2000
       when 3 then 3000
       when 4 then 4000
       when 5 then 6000
       when 6 then 8000
       else 15000
     end)::bigint,
    (case p_cycle
       when 3 then 1
       when 5 then 2
       when 7 then 5
       else 0
     end)::bigint;
$$;

create or replace function public.get_daily_reward_status()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_last date;
  v_streak int;
  v_can boolean;
  v_next_streak int;
  v_week int;
  v_mult int;
  v_days jsonb := '[]'::jsonb;
  v_day_streak int;
  v_base record;
  d int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select daily_last_claim, daily_streak into v_last, v_streak
    from public.profiles where id = uid;
  v_streak := coalesce(v_streak, 0);
  v_can := (v_last is distinct from v_today);
  v_next_streak := case
    when v_last = v_today then v_streak
    when v_last = v_today - 1 then v_streak + 1
    else 1
  end;
  v_week := ((v_next_streak - 1) / 7) + 1;
  v_mult := least(v_week, 10);
  for d in 1..7 loop
    v_day_streak := (v_week - 1) * 7 + d;
    select * into v_base from public._daily_reward_base(d);
    v_days := v_days || jsonb_build_object(
      'day', d,
      'streak', v_day_streak,
      'coins', v_base.coins * v_mult,
      'tickets', v_base.tickets,
      'claimed', case when v_last = v_today
                   then v_day_streak <= v_next_streak
                   else v_day_streak < v_next_streak end,
      'is_next', v_can and v_day_streak = v_next_streak
    );
  end loop;
  return jsonb_build_object(
    'can_claim', v_can,
    'streak', case when v_last >= v_today - 1 then v_streak else 0 end,
    'next_streak', v_next_streak,
    'week', v_week,
    'multiplier', v_mult,
    'days', v_days,
    'next_claim_at', ((v_today + 1)::timestamp at time zone 'utc'),
    'server_now', now()
  );
end $$;
grant execute on function public.get_daily_reward_status() to authenticated;

create or replace function public.claim_daily_reward()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_last date;
  v_streak int;
  v_new_streak int;
  v_cycle int;
  v_week int;
  v_mult int;
  v_base record;
  v_coins bigint;
  v_tickets bigint;
  new_coins bigint;
  new_tickets bigint;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select daily_last_claim, daily_streak into v_last, v_streak
    from public.profiles where id = uid for update;
  if v_last = v_today then raise exception 'daily reward already claimed'; end if;
  v_new_streak := case when v_last = v_today - 1 then coalesce(v_streak, 0) + 1 else 1 end;
  v_cycle := ((v_new_streak - 1) % 7) + 1;
  v_week := ((v_new_streak - 1) / 7) + 1;
  v_mult := least(v_week, 10);
  select * into v_base from public._daily_reward_base(v_cycle);
  v_coins := v_base.coins * v_mult;
  v_tickets := v_base.tickets;
  update public.profiles
     set coins = coins + v_coins,
         tickets = tickets + v_tickets,
         daily_streak = v_new_streak,
         daily_last_claim = v_today
   where id = uid and daily_last_claim is distinct from v_today
   returning coins, tickets into new_coins, new_tickets;
  if new_coins is null then raise exception 'daily reward already claimed'; end if;
  return jsonb_build_object(
    'streak', v_new_streak,
    'cycle_day', v_cycle,
    'week', v_week,
    'multiplier', v_mult,
    'coins_added', v_coins,
    'tickets_added', v_tickets,
    'coins', new_coins,
    'tickets', new_tickets,
    'next_claim_at', ((v_today + 1)::timestamp at time zone 'utc'),
    'server_now', now()
  );
end $$;
grant execute on function public.claim_daily_reward() to authenticated;

-- anon darf die RPCs gar nicht erst aufrufen.
revoke execute on function public.get_daily_reward_status() from anon, public;
revoke execute on function public.claim_daily_reward() from anon, public;
