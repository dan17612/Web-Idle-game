-- BlockFall: Fallende-Blöcke-Puzzle als Ereignis mit 30 Leveln im Pfad.
-- Spec: docs/superpowers/specs/2026-09-24-blockfall-design.md
--
-- Gleiche Mechanik wie Drift/Parkour: Erstabschluss zahlt volle Belohnung
-- (Coins, alle 5 Level Tickets, +50 % bei drei Sternen), Wiederholungen nur
-- einen kleinen Bonus.
--
-- Achtung Reward-Spiegel: _blockfall_reward lebt doppelt, hier und als
-- blockfallReward() in src/blockfall.js. src/blockfallSql.test.js vergleicht
-- beide Level für Level.

-- 1) Fortschritt. Schreiben nur über die RPCs unten.
create table if not exists public.blockfall_progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  highest_level int not null default 0 check (highest_level between 0 and 30),
  stars jsonb not null default '{}'::jsonb,
  total_finishes int not null default 0,
  last_finish_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.blockfall_progress enable row level security;
drop policy if exists "blockfall_progress self read" on public.blockfall_progress;
create policy "blockfall_progress self read" on public.blockfall_progress
  for select using ((select auth.uid()) = user_id);

revoke all on table public.blockfall_progress from anon, public;
grant select on table public.blockfall_progress to authenticated;

-- 2) Belohnung pro Level: Coins quadratisch, Tickets auf 5/10/15/20/25/30.
create or replace function public._blockfall_reward(p_level int)
returns table (coins bigint, tickets bigint)
language sql immutable set search_path = public as $$
  select
    (800 * p_level * p_level)::bigint,
    (case p_level when 5 then 1 when 10 then 2 when 15 then 2 when 20 then 3 when 25 then 3 when 30 then 5 else 0 end)::bigint;
$$;
revoke execute on function public._blockfall_reward(int) from anon, authenticated, public;

-- 3) Zeitplan: läuft vier Wochen, mit Countdown. do nothing, damit ein
--    erneutes Anwenden spätere Admin-Änderungen am Eintrag nicht überschreibt.
insert into public.event_schedule (key, starts_at, ends_at, enabled, show_countdown)
values ('blockfall_game', null, '2026-10-24 22:00:00+00', true, true)
on conflict (key) do nothing;

-- 4) Fortschritt lesen — ungegatet, damit Sterne nach dem Ereignis sichtbar bleiben.
create or replace function public.get_blockfall_progress()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_row public.blockfall_progress%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into v_row from public.blockfall_progress where user_id = uid;
  return jsonb_build_object(
    'highest_level', coalesce(v_row.highest_level, 0),
    'stars', coalesce(v_row.stars, '{}'::jsonb),
    'total_finishes', coalesce(v_row.total_finishes, 0),
    'max_level', 30,
    'server_now', now()
  );
end $$;

-- 5) Level abschließen.
create or replace function public.complete_blockfall_level(p_level int, p_stars int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_highest int;
  v_stars jsonb;
  v_last timestamptz;
  v_prev_stars int;
  v_first boolean;
  v_base record;
  v_coins bigint;
  v_tickets bigint;
  new_coins bigint;
  new_tickets bigint;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not public.event_is_active('blockfall_game') then raise exception 'event ended'; end if;
  if p_level is null or p_level < 1 or p_level > 30 then
    raise exception 'invalid level';
  end if;
  if p_stars is null or p_stars < 1 or p_stars > 3 then
    raise exception 'invalid stars';
  end if;

  insert into public.blockfall_progress (user_id)
  values (uid)
  on conflict (user_id) do nothing;

  select highest_level, stars, last_finish_at into v_highest, v_stars, v_last
    from public.blockfall_progress where user_id = uid for update;

  if p_level > v_highest + 1 then raise exception 'level locked'; end if;
  -- Kein Level ist in unter fünf Sekunden spielbar; schützt die
  -- Wiederholungs-Belohnung vor Skript-Farmen.
  if v_last is not null and v_last > now() - interval '5 seconds' then
    raise exception 'too fast';
  end if;

  v_first := (p_level = v_highest + 1);
  select * into v_base from public._blockfall_reward(p_level);
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

  update public.blockfall_progress
     set highest_level = greatest(highest_level, p_level),
         stars = jsonb_set(stars, array[p_level::text],
                           to_jsonb(greatest(v_prev_stars, p_stars))),
         total_finishes = total_finishes + 1,
         last_finish_at = now(),
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

grant execute on function public.get_blockfall_progress() to authenticated;
grant execute on function public.complete_blockfall_level(int, int) to authenticated;
revoke execute on function public.get_blockfall_progress() from anon, public;
revoke execute on function public.complete_blockfall_level(int, int) from anon, public;

-- 6) Einzel-Bestenliste (öffentlich lesbar wie die übrigen).
create or replace function public.get_blockfall_leaderboard(p_limit int default 50)
returns table (
  username text,
  avatar_emoji text,
  highest_level int,
  stars int,
  total_finishes int
) language sql stable security definer set search_path = public as $$
  select p.username, p.avatar_emoji, f.highest_level,
         public._stars_total(f.stars), f.total_finishes
  from public.blockfall_progress f
  join public.profiles p on p.id = f.user_id
  where coalesce(p.is_banned, false) = false
    and f.highest_level > 0
  order by f.highest_level desc, public._stars_total(f.stars) desc, f.total_finishes desc
  limit greatest(1, least(p_limit, 100));
$$;
grant execute on function public.get_blockfall_leaderboard(int) to authenticated, anon;

-- 7) Gesamtwertung: BlockFall als zehnte Disziplin. Body sonst unverändert
--    aus 20260919_gesamt_rangliste.sql übernommen.
create or replace function public.get_overall_leaderboard(p_limit int default 50)
returns table (
  username text,
  avatar_emoji text,
  total_points int,
  disciplines jsonb
) language sql stable security definer set search_path = public as $$
  with active as (
    select id, username, avatar_emoji, coins
    from public.profiles
    where coalesce(is_banned, false) = false
  ),
  rates as (
    select a.owner_id,
           coalesce(sum(sc.rate * coalesce(td.multiplier, 1)), 0) as rate
    from public.animals a
    join public.species_costs sc on sc.species = a.species
    left join public.tier_defs td on td.tier = a.tier
    where a.equipped = true
      and (a.upgrade_ready_at is null or a.upgrade_ready_at <= now())
    group by a.owner_id
  ),
  placements as (
    select 'rate' as disc, p.id as user_id,
           row_number() over (order by r.rate desc, p.coins desc) as rnk,
           r.rate as val
      from active p
      join rates r on r.owner_id = p.id
     where r.rate > 0

    union all
    select 'coins', p.id,
           row_number() over (order by p.coins desc),
           p.coins::numeric
      from active p
     where p.coins > 0

    union all
    select 'boss_path', b.user_id,
           row_number() over (order by b.highest_stage desc, b.total_victories desc),
           b.highest_stage::numeric
      from public.boss_path_progress b
      join active p on p.id = b.user_id
     where b.highest_stage > 0

    union all
    select 'boss_endless', t.user_id,
           row_number() over (order by t.damage desc),
           t.damage::numeric
      from (select user_id, max(damage) as damage
              from public.boss_endless_runs
             where status = 'finished'
             group by user_id) t
      join active p on p.id = t.user_id
     where t.damage > 0

    union all
    select 'memory', m.user_id,
           row_number() over (order by m.highest_level desc, m.total_pairs desc),
           m.highest_level::numeric
      from public.memory_player_states m
      join active p on p.id = m.user_id
     where m.highest_level > 0 or m.total_pairs > 0

    union all
    select 'merge', g.user_id,
           row_number() over (order by g.highest_rank desc, g.score desc, g.total_fusions desc),
           g.highest_rank::numeric
      from public.merge_player_states g
      join active p on p.id = g.user_id
     where g.highest_rank > 0 or g.score > 0 or g.total_fusions > 0

    -- Wordle wertet die beste Serie, nicht die laufende: die bricht bei einem
    -- ausgelassenen Tag auf null und wäre hier Tagesrauschen.
    union all
    select 'wordle', w.user_id,
           row_number() over (order by w.best_streak desc, w.wins desc),
           w.best_streak::numeric
      from public.wordle_stats w
      join active p on p.id = w.user_id
     where w.wins > 0

    union all
    select 'drift', d.user_id,
           row_number() over (order by d.highest_level desc, public._stars_total(d.stars) desc),
           d.highest_level::numeric
      from public.drift_progress d
      join active p on p.id = d.user_id
     where d.highest_level > 0

    union all
    select 'parkour', k.user_id,
           row_number() over (order by k.highest_level desc, public._stars_total(k.stars) desc),
           k.highest_level::numeric
      from public.parkour_progress k
      join active p on p.id = k.user_id
     where k.highest_level > 0

    union all
    select 'blockfall', f.user_id,
           row_number() over (order by f.highest_level desc, public._stars_total(f.stars) desc),
           f.highest_level::numeric
      from public.blockfall_progress f
      join active p on p.id = f.user_id
     where f.highest_level > 0
  ),
  scored as (
    select user_id, disc, rnk::int as rnk, val,
           public._rank_points(rnk::int) as pts
      from placements
     where rnk <= 100
  ),
  totals as (
    select user_id,
           sum(pts)::int as total_points,
           jsonb_agg(jsonb_build_object('key', disc, 'rank', rnk, 'points', pts, 'value', val)
                     order by pts desc, disc) as disciplines
      from scored
     where pts > 0
     group by user_id
  )
  select p.username, p.avatar_emoji, t.total_points, t.disciplines
    from totals t
    join active p on p.id = t.user_id
   order by t.total_points desc, p.username
   limit greatest(1, least(p_limit, 100));
$$;

grant execute on function public.get_overall_leaderboard(int) to authenticated, anon;
