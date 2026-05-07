create or replace function public.get_boss_leaderboard(p_limit int default 50)
returns table (
  username text,
  avatar_emoji text,
  highest_stage int,
  total_victories int
) language sql security definer set search_path = public as $$
  select
    p.username,
    p.avatar_emoji,
    b.highest_stage,
    b.total_victories
  from public.boss_path_progress b
  join public.profiles p on p.id = b.user_id
  where coalesce(p.is_banned, false) = false
    and b.highest_stage > 0
  order by b.highest_stage desc, b.total_victories desc
  limit greatest(1, least(p_limit, 100));
$$;

grant execute on function public.get_boss_leaderboard(int) to authenticated, anon;
