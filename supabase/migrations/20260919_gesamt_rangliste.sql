-- Gesamt-Rangliste über alle Disziplinen.
--
-- Bisher standen sechs Bestenlisten nebeneinander, ohne Antwort darauf, wer
-- insgesamt vorne liegt. Jede Platzierung bringt jetzt Punkte, die Summe
-- ergibt die Rangfolge. Kein Minus: Ein verpasstes Ereignis bringt null
-- Punkte, zieht aber nichts ab.
--
-- Achtung Reward-Spiegel: _rank_points lebt doppelt, hier und als
-- rankPoints() in src/rankPoints.js. Bei Balance-Änderungen beide ändern;
-- src/rankPointsSql.test.js vergleicht sie Platz für Platz.

-- 1) Punkte je Platzierung.
create or replace function public._rank_points(p_rank int)
returns int language sql immutable set search_path = public as $$
  select case
    when p_rank is null or p_rank < 1 or p_rank > 100 then 0
    when p_rank = 1 then 100
    when p_rank = 2 then 80
    when p_rank = 3 then 65
    when p_rank <= 10 then 60 - (p_rank - 4) * 6
    when p_rank <= 25 then 20 - (p_rank - 11)
    when p_rank <= 50 then 5
    else 2
  end;
$$;

-- 2) Sternsumme aus dem stars-Objekt von Drift und Parkour.
create or replace function public._stars_total(p_stars jsonb)
returns int language sql immutable set search_path = public as $$
  select coalesce(sum(value::int), 0)::int
  from jsonb_each_text(case when jsonb_typeof(p_stars) = 'object'
                            then p_stars else '{}'::jsonb end);
$$;

-- 3) Fehlende Einzel-Bestenlisten. Ohne sie wären Drift und Parkour nicht
--    wertbar: drift_progress und parkour_progress sind self-read.
create or replace function public.get_drift_leaderboard(p_limit int default 50)
returns table (
  username text,
  avatar_emoji text,
  highest_level int,
  stars int,
  total_finishes int
) language sql stable security definer set search_path = public as $$
  select p.username, p.avatar_emoji, d.highest_level,
         public._stars_total(d.stars), d.total_finishes
  from public.drift_progress d
  join public.profiles p on p.id = d.user_id
  where coalesce(p.is_banned, false) = false
    and d.highest_level > 0
  order by d.highest_level desc, public._stars_total(d.stars) desc, d.total_finishes desc
  limit greatest(1, least(p_limit, 100));
$$;

create or replace function public.get_parkour_leaderboard(p_limit int default 50)
returns table (
  username text,
  avatar_emoji text,
  highest_level int,
  stars int,
  total_finishes int
) language sql stable security definer set search_path = public as $$
  select p.username, p.avatar_emoji, k.highest_level,
         public._stars_total(k.stars), k.total_finishes
  from public.parkour_progress k
  join public.profiles p on p.id = k.user_id
  where coalesce(p.is_banned, false) = false
    and k.highest_level > 0
  order by k.highest_level desc, public._stars_total(k.stars) desc, k.total_finishes desc
  limit greatest(1, least(p_limit, 100));
$$;

-- 4) Die Gesamtwertung. Liefert die Aufschlüsselung gleich mit, damit das
--    ⓘ in der Oberfläche ohne zweiten Server-Aufruf auskommt.
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
           row_number() over (order by r.rate desc, p.coins desc) as rnk
      from active p
      join rates r on r.owner_id = p.id
     where r.rate > 0

    union all
    select 'coins', p.id,
           row_number() over (order by p.coins desc)
      from active p
     where p.coins > 0

    union all
    select 'boss_path', b.user_id,
           row_number() over (order by b.highest_stage desc, b.total_victories desc)
      from public.boss_path_progress b
      join active p on p.id = b.user_id
     where b.highest_stage > 0

    union all
    select 'boss_endless', t.user_id,
           row_number() over (order by t.damage desc)
      from (select user_id, max(damage) as damage
              from public.boss_endless_runs
             where status = 'finished'
             group by user_id) t
      join active p on p.id = t.user_id
     where t.damage > 0

    union all
    select 'memory', m.user_id,
           row_number() over (order by m.highest_level desc, m.total_pairs desc)
      from public.memory_player_states m
      join active p on p.id = m.user_id
     where m.highest_level > 0 or m.total_pairs > 0

    union all
    select 'merge', g.user_id,
           row_number() over (order by g.highest_rank desc, g.score desc, g.total_fusions desc)
      from public.merge_player_states g
      join active p on p.id = g.user_id
     where g.highest_rank > 0 or g.score > 0 or g.total_fusions > 0

    -- Wordle wertet die beste Serie, nicht die laufende: die bricht bei einem
    -- ausgelassenen Tag auf null und wäre hier Tagesrauschen.
    union all
    select 'wordle', w.user_id,
           row_number() over (order by w.best_streak desc, w.wins desc)
      from public.wordle_stats w
      join active p on p.id = w.user_id
     where w.wins > 0

    union all
    select 'drift', d.user_id,
           row_number() over (order by d.highest_level desc, public._stars_total(d.stars) desc)
      from public.drift_progress d
      join active p on p.id = d.user_id
     where d.highest_level > 0

    union all
    select 'parkour', k.user_id,
           row_number() over (order by k.highest_level desc, public._stars_total(k.stars) desc)
      from public.parkour_progress k
      join active p on p.id = k.user_id
     where k.highest_level > 0
  ),
  scored as (
    select user_id, disc, rnk::int as rnk, public._rank_points(rnk::int) as pts
      from placements
     where rnk <= 100
  ),
  totals as (
    select user_id,
           sum(pts)::int as total_points,
           jsonb_agg(jsonb_build_object('key', disc, 'rank', rnk, 'points', pts)
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

-- Bestenlisten sind öffentlich lesbar wie die bestehenden; die Helfer bleiben
-- intern, damit niemand die Formel als Orakel benutzt.
grant execute on function public.get_overall_leaderboard(int) to authenticated, anon;
grant execute on function public.get_drift_leaderboard(int) to authenticated, anon;
grant execute on function public.get_parkour_leaderboard(int) to authenticated, anon;
revoke execute on function public._rank_points(int) from anon, authenticated, public;
revoke execute on function public._stars_total(jsonb) from anon, authenticated, public;
