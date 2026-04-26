-- Bosskampf-Belohnung: 10x Boost für 10 Minuten.

create table if not exists public.boss_boost_claims (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  claimed_at timestamptz not null default '1970-01-01 00:00:00+00'
);

alter table public.boss_boost_claims enable row level security;

drop policy if exists "boss_boost_claims self read" on public.boss_boost_claims;
create policy "boss_boost_claims self read" on public.boss_boost_claims
  for select using ((select auth.uid()) = user_id);

revoke all on table public.boss_boost_claims from anon;
grant select on table public.boss_boost_claims to authenticated;

create or replace function public.claim_boss_boost(p_score int default 0, p_target int default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  now_ts timestamptz := now();
  last_claim timestamptz;
  cur_until timestamptz;
  cur_mult numeric;
  new_until timestamptz;
  new_mult numeric;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if coalesce(p_target, 0) < 1000 or coalesce(p_score, 0) < coalesce(p_target, 0) then
    raise exception 'boss not defeated';
  end if;

  select claimed_at into last_claim
    from public.boss_boost_claims
    where user_id = uid;

  if last_claim is not null and last_claim > now_ts - interval '3 minutes' then
    raise exception 'boss boost cooldown';
  end if;

  insert into public.pets(owner_id) values (uid) on conflict (owner_id) do nothing;

  select boost_until, boost_multiplier into cur_until, cur_mult
    from public.pets
    where owner_id = uid;

  if cur_until > now_ts and cur_mult >= 10 then
    new_until := cur_until + interval '10 minutes';
    new_mult := cur_mult;
  else
    new_until := now_ts + interval '10 minutes';
    new_mult := 10;
  end if;

  update public.pets
    set boost_multiplier = new_mult,
        boost_until = new_until,
        last_fed_at = now_ts
    where owner_id = uid;

  insert into public.boss_boost_claims(user_id, claimed_at)
    values (uid, now_ts)
    on conflict (user_id) do update
      set claimed_at = excluded.claimed_at;

  return jsonb_build_object(
    'boost_multiplier', new_mult,
    'boost_until', new_until,
    'server_now', now_ts
  );
end $$;

grant execute on function public.claim_boss_boost(int, int) to authenticated;
