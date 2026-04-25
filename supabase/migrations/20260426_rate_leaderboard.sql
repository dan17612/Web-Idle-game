-- Rate-Leaderboard: Top-Spieler nach Münzen pro Sekunde (Basisrate ohne Boost).
-- Berechnet aus equipped Tieren, die nicht gerade upgraden.
create or replace function public.get_rate_leaderboard(p_limit int default 50)
returns table (
  username text,
  coins bigint,
  avatar_emoji text,
  rate_per_sec numeric
) language sql security definer set search_path = public as $$
  with rates as (
    select
      a.owner_id,
      coalesce(sum(sc.rate * coalesce(td.multiplier, 1)), 0) as rate
    from public.animals a
    join public.species_costs sc on sc.species = a.species
    left join public.tier_defs td on td.tier = a.tier
    where a.equipped = true
      and (a.upgrade_ready_at is null or a.upgrade_ready_at <= now())
    group by a.owner_id
  )
  select
    p.username,
    p.coins,
    p.avatar_emoji,
    coalesce(r.rate, 0) as rate_per_sec
  from public.profiles p
  left join rates r on r.owner_id = p.id
  where coalesce(p.is_banned, false) = false
  order by coalesce(r.rate, 0) desc, p.coins desc
  limit greatest(1, least(p_limit, 100));
$$;

grant execute on function public.get_rate_leaderboard(int) to authenticated, anon;
