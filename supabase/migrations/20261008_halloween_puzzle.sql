-- Halloween: Kürbis-Puzzle als Ereignis mit 24 Leveln im Pfad, dazu die
-- Fledermaus als neue, nur hier erhältliche Tierart.
-- Spec: docs/superpowers/specs/2026-10-08-halloween-update-design.md
--
-- Gleiche Mechanik wie Drift/Parkour/BlockFall: Erstabschluss zahlt volle
-- Belohnung (Coins, Tickets an Meilensteinen, +50 % bei drei Sternen, Level 12
-- und 24 zusätzlich eine Fledermaus), Wiederholungen nur einen kleinen Bonus.
-- Anders als dort meldet der Client keine Sterne, sondern die Legezeit — die
-- Sterne rechnet der Server selbst aus.
--
-- Achtung Reward-Spiegel: _hpuzzle_pieces, _hpuzzle_stars und _hpuzzle_reward
-- leben doppelt, hier und in src/halloweenPuzzle.js (GRIDS, starsForTime,
-- puzzleReward). src/halloweenPuzzleSql.test.js vergleicht beide Level für Level.

-- 1) Fledermaus: enabled = false hält sie aus Truhen und Shop-Rotation,
--    shop_visible = false zusätzlich aus dem Shop-Frontend. Keine
--    Beschaffbarkeit in _market_model ⇒ die Börse wertet sie als Limited
--    Edition. do nothing, damit spätere Admin-Anpassungen bleiben.
insert into public.species_costs
  (species, name, emoji, cost, rate, weight, enabled, shop_visible, craft_only, rarity)
values
  ('bat', 'Fledermaus', '🦇', 30000000, 120000, 0.1, false, false, false, 'epic')
on conflict (species) do nothing;

-- 2) Fortschritt. Schreiben nur über die RPCs unten.
create table if not exists public.halloween_puzzle_progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  highest_level int not null default 0 check (highest_level between 0 and 24),
  stars jsonb not null default '{}'::jsonb,
  best_times jsonb not null default '{}'::jsonb,
  total_finishes int not null default 0,
  last_finish_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.halloween_puzzle_progress enable row level security;
drop policy if exists "halloween_puzzle_progress self read" on public.halloween_puzzle_progress;
create policy "halloween_puzzle_progress self read" on public.halloween_puzzle_progress
  for select using ((select auth.uid()) = user_id);

revoke all on table public.halloween_puzzle_progress from anon, public;
grant select on table public.halloween_puzzle_progress to authenticated;

-- 3) Teile pro Level (Spalten × Reihen aus GRIDS).
create or replace function public._hpuzzle_pieces(p_level int)
returns int language sql immutable set search_path = public as $$
  select (array[9, 12, 16, 20, 20, 25,
                20, 25, 30, 30, 36, 36,
                30, 30, 36, 42, 42, 48,
                30, 36, 42, 42, 49, 56])[p_level];
$$;
revoke execute on function public._hpuzzle_pieces(int) from anon, authenticated, public;

-- 4) Sterne aus der Legezeit: Sekunden pro Teil je Kapitel 3/4/5/7.
--    ≤ Teile × s = drei Sterne, ≤ doppelt so lang = zwei, sonst einer.
create or replace function public._hpuzzle_stars(p_level int, p_seconds int)
returns int language sql immutable set search_path = public as $$
  select case
    when p_seconds <= public._hpuzzle_pieces(p_level) * (array[3, 4, 5, 7])[(p_level - 1) / 6 + 1] then 3
    when p_seconds <= 2 * public._hpuzzle_pieces(p_level) * (array[3, 4, 5, 7])[(p_level - 1) / 6 + 1] then 2
    else 1
  end;
$$;
revoke execute on function public._hpuzzle_stars(int, int) from anon, authenticated, public;

-- 5) Belohnung pro Level: Coins quadratisch, Tickets auf 6/12/18/24,
--    Fledermaus auf 12 (normal) und 24 (Gold).
create or replace function public._hpuzzle_reward(p_level int)
returns table (coins bigint, tickets bigint, pet_species text, pet_tier text)
language sql immutable set search_path = public as $$
  select
    (1000 * p_level * p_level)::bigint,
    (case p_level when 6 then 2 when 12 then 3 when 18 then 4 when 24 then 6 else 0 end)::bigint,
    (case p_level when 12 then 'bat' when 24 then 'bat' else null end)::text,
    (case p_level when 12 then 'normal' when 24 then 'gold' else null end)::text;
$$;
revoke execute on function public._hpuzzle_reward(int) from anon, authenticated, public;

-- 6) Zeitplan: läuft über Halloween bis Anfang November, mit Countdown.
insert into public.event_schedule (key, starts_at, ends_at, enabled, show_countdown)
values ('halloween_puzzle', null, '2026-11-08 22:59:59+00', true, true)
on conflict (key) do nothing;

-- 7) Fortschritt lesen — ungegatet, damit Sterne nach dem Ereignis sichtbar bleiben.
create or replace function public.get_halloween_puzzle_progress()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_row public.halloween_puzzle_progress%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into v_row from public.halloween_puzzle_progress where user_id = uid;
  return jsonb_build_object(
    'highest_level', coalesce(v_row.highest_level, 0),
    'stars', coalesce(v_row.stars, '{}'::jsonb),
    'best_times', coalesce(v_row.best_times, '{}'::jsonb),
    'total_finishes', coalesce(v_row.total_finishes, 0),
    'max_level', 24,
    'server_now', now()
  );
end $$;

-- 8) Level abschließen. p_seconds = aktive Legezeit laut Client.
create or replace function public.complete_halloween_puzzle(p_level int, p_seconds int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_highest int;
  v_stars jsonb;
  v_times jsonb;
  v_last timestamptz;
  v_pieces int;
  v_secs int;
  v_run_stars int;
  v_prev_stars int;
  v_prev_time int;
  v_first boolean;
  v_base record;
  v_coins bigint;
  v_tickets bigint;
  v_pet_id uuid;
  new_coins bigint;
  new_tickets bigint;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not public.event_is_active('halloween_puzzle') then raise exception 'event ended'; end if;
  if p_level is null or p_level < 1 or p_level > 24 then
    raise exception 'invalid level';
  end if;
  if p_seconds is null or p_seconds < 1 then
    raise exception 'invalid time';
  end if;

  v_pieces := public._hpuzzle_pieces(p_level);
  v_secs := least(p_seconds, 86400);
  -- Schneller als eine halbe Sekunde pro Teil legt niemand ein Puzzle.
  if v_secs * 2 < v_pieces then raise exception 'too fast'; end if;

  insert into public.halloween_puzzle_progress (user_id)
  values (uid)
  on conflict (user_id) do nothing;

  select highest_level, stars, best_times, last_finish_at
    into v_highest, v_stars, v_times, v_last
    from public.halloween_puzzle_progress where user_id = uid for update;

  if p_level > v_highest + 1 then raise exception 'level locked'; end if;
  -- Zwischen zwei Abschlüssen liegt mindestens die Mindest-Legezeit. Ehrliche
  -- Spieler stoßen nie daran (die Uhr startet erst nach dem letzten Abschluss),
  -- Skripte können die Wiederholungs-Belohnung so nicht im Sekundentakt farmen.
  if v_last is not null and v_last > now() - make_interval(secs => v_pieces / 2.0) then
    raise exception 'too fast';
  end if;

  v_run_stars := public._hpuzzle_stars(p_level, v_secs);
  v_first := (p_level = v_highest + 1);
  select * into v_base from public._hpuzzle_reward(p_level);
  if v_first then
    v_coins := v_base.coins;
    if v_run_stars = 3 then
      v_coins := v_coins + v_base.coins / 2;
    end if;
    v_tickets := v_base.tickets;
  else
    v_coins := greatest(100, v_base.coins / 20);
    v_tickets := 0;
  end if;

  v_prev_stars := coalesce((v_stars ->> p_level::text)::int, 0);
  v_prev_time := (v_times ->> p_level::text)::int;

  update public.halloween_puzzle_progress
     set highest_level = greatest(highest_level, p_level),
         stars = jsonb_set(stars, array[p_level::text],
                           to_jsonb(greatest(v_prev_stars, v_run_stars))),
         best_times = jsonb_set(best_times, array[p_level::text],
                                to_jsonb(least(coalesce(v_prev_time, v_secs), v_secs))),
         total_finishes = total_finishes + 1,
         last_finish_at = now(),
         updated_at = now()
   where user_id = uid;

  -- Fledermaus nur beim Erstabschluss.
  if v_first and v_base.pet_species is not null
     and exists (select 1 from public.species_costs where species = v_base.pet_species) then
    insert into public.animals (owner_id, species, tier, equipped)
    values (uid, v_base.pet_species, coalesce(v_base.pet_tier, 'normal'), false)
    returning id into v_pet_id;
  end if;

  update public.profiles
     set coins = coins + v_coins,
         tickets = tickets + v_tickets
   where id = uid
   returning coins, tickets into new_coins, new_tickets;

  return jsonb_build_object(
    'level', p_level,
    'first_clear', v_first,
    'seconds', v_secs,
    'run_stars', v_run_stars,
    'stars', greatest(v_prev_stars, v_run_stars),
    'best_time', least(coalesce(v_prev_time, v_secs), v_secs),
    'coins_added', v_coins,
    'tickets_added', v_tickets,
    'pet', case when v_pet_id is null then null
                else jsonb_build_object('id', v_pet_id, 'species', v_base.pet_species,
                                        'tier', coalesce(v_base.pet_tier, 'normal')) end,
    'coins', new_coins,
    'tickets', new_tickets,
    'highest_level', greatest(v_highest, p_level),
    'server_now', now()
  );
end $$;

grant execute on function public.get_halloween_puzzle_progress() to authenticated;
grant execute on function public.complete_halloween_puzzle(int, int) to authenticated;
revoke execute on function public.get_halloween_puzzle_progress() from anon, public;
revoke execute on function public.complete_halloween_puzzle(int, int) from anon, public;

-- 9) Einzel-Bestenliste (öffentlich lesbar wie die übrigen).
create or replace function public.get_halloween_puzzle_leaderboard(p_limit int default 50)
returns table (
  username text,
  avatar_emoji text,
  highest_level int,
  stars int,
  total_finishes int
) language sql stable security definer set search_path = public as $$
  select p.username, p.avatar_emoji, h.highest_level,
         public._stars_total(h.stars), h.total_finishes
  from public.halloween_puzzle_progress h
  join public.profiles p on p.id = h.user_id
  where coalesce(p.is_banned, false) = false
    and h.highest_level > 0
  order by h.highest_level desc, public._stars_total(h.stars) desc, h.total_finishes desc
  limit greatest(1, least(p_limit, 100));
$$;
grant execute on function public.get_halloween_puzzle_leaderboard(int) to authenticated, anon;

-- 10) Gesamtwertung: Kürbis-Puzzle als elfte Disziplin. Body sonst unverändert
--     aus 20260924_blockfall.sql übernommen.
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

    union all
    select 'halloween', h.user_id,
           row_number() over (order by h.highest_level desc, public._stars_total(h.stars) desc),
           h.highest_level::numeric
      from public.halloween_puzzle_progress h
      join active p on p.id = h.user_id
     where h.highest_level > 0
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
