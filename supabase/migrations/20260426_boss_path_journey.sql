-- Boss-Pfad: Reise durch 15 Etappen, jede mit Boss + Truhe + Boost als Belohnung.

create table if not exists public.boss_path_progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_stage int not null default 1,
  highest_stage int not null default 0,
  total_victories int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.boss_path_progress enable row level security;
drop policy if exists "boss_path_progress self read" on public.boss_path_progress;
create policy "boss_path_progress self read" on public.boss_path_progress
  for select using ((select auth.uid()) = user_id);

revoke all on table public.boss_path_progress from anon;
grant select on table public.boss_path_progress to authenticated;

create table if not exists public.boss_path_rewards (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  stage int not null,
  kind text not null check (kind in ('chest','boost')),
  payload jsonb not null default '{}'::jsonb,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists boss_path_rewards_user_idx
  on public.boss_path_rewards(user_id, consumed_at);

alter table public.boss_path_rewards enable row level security;
drop policy if exists "boss_path_rewards self read" on public.boss_path_rewards;
create policy "boss_path_rewards self read" on public.boss_path_rewards
  for select using ((select auth.uid()) = user_id);

revoke all on table public.boss_path_rewards from anon;
grant select on table public.boss_path_rewards to authenticated;

create or replace function public.boss_path_stage_config(p_stage int)
returns jsonb language plpgsql immutable set search_path = public as $$
begin
  return case p_stage
    when 1  then jsonb_build_object('species','chick','name','Wiesen-Küken','terrain','meadow','hp',900,'time_seconds',180,'chest_coins',500,'boost_mult',2,'boost_minutes',3)
    when 2  then jsonb_build_object('species','chicken','name','Hofhuhn','terrain','meadow','hp',1300,'time_seconds',180,'chest_coins',1500,'boost_mult',2,'boost_minutes',4)
    when 3  then jsonb_build_object('species','rabbit','name','Wald-Hase','terrain','forest','hp',1800,'time_seconds',180,'chest_coins',5000,'boost_mult',3,'boost_minutes',5)
    when 4  then jsonb_build_object('species','pig','name','Wildschwein','terrain','farm','hp',2400,'time_seconds',180,'chest_coins',15000,'boost_mult',3,'boost_minutes',5)
    when 5  then jsonb_build_object('species','sheep','name','Sturm-Schaf','terrain','plains','hp',3000,'time_seconds',180,'chest_coins',40000,'boost_mult',3,'boost_minutes',6)
    when 6  then jsonb_build_object('species','cow','name','Donner-Stier','terrain','plains','hp',3600,'time_seconds',180,'chest_coins',100000,'boost_mult',4,'boost_minutes',6)
    when 7  then jsonb_build_object('species','horse','name','Schatten-Pferd','terrain','mountain_low','hp',4400,'time_seconds',180,'chest_coins',300000,'boost_mult',5,'boost_minutes',7)
    when 8  then jsonb_build_object('species','scorpion','name','Sand-Skorpion','terrain','desert','hp',5400,'time_seconds',180,'chest_coins',600000,'boost_mult',5,'boost_minutes',7)
    when 9  then jsonb_build_object('species','panda','name','Bambus-Panda','terrain','bamboo','hp',6500,'time_seconds',180,'chest_coins',1500000,'boost_mult',6,'boost_minutes',8)
    when 10 then jsonb_build_object('species','tiger','name','Säbelzahn-Tiger','terrain','jungle','hp',8000,'time_seconds',180,'chest_coins',4000000,'boost_mult',7,'boost_minutes',8)
    when 11 then jsonb_build_object('species','lion','name','Kronen-Löwe','terrain','savanna','hp',9500,'time_seconds',180,'chest_coins',10000000,'boost_mult',8,'boost_minutes',10)
    when 12 then jsonb_build_object('species','trex','name','Urzeit-T-Rex','terrain','volcano','hp',11500,'time_seconds',180,'chest_coins',25000000,'boost_mult',9,'boost_minutes',10)
    when 13 then jsonb_build_object('species','peacock','name','Sternen-Pfau','terrain','peak','hp',13500,'time_seconds',180,'chest_coins',50000000,'boost_mult',10,'boost_minutes',10)
    when 14 then jsonb_build_object('species','jormungandr','name','Tiefsee-Jörmungandr','terrain','abyss','hp',16000,'time_seconds',180,'chest_coins',100000000,'boost_mult',10,'boost_minutes',15)
    when 15 then jsonb_build_object('species','dragon','name','Drachenkönig','terrain','dragon_lair','hp',20000,'time_seconds',180,'chest_coins',250000000,'boost_mult',15,'boost_minutes',30)
    else null
  end;
end $$;

grant execute on function public.boss_path_stage_config(int) to authenticated;

create or replace function public.get_boss_path()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  prog record;
  rewards_arr jsonb;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.boss_path_progress(user_id) values (uid)
    on conflict (user_id) do nothing;
  select * into prog from public.boss_path_progress where user_id = uid;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'stage', stage,
    'kind', kind,
    'payload', payload,
    'created_at', created_at
  ) order by created_at desc), '[]'::jsonb) into rewards_arr
  from public.boss_path_rewards
  where user_id = uid and consumed_at is null;

  return jsonb_build_object(
    'current_stage', prog.current_stage,
    'highest_stage', prog.highest_stage,
    'total_victories', prog.total_victories,
    'rewards', rewards_arr,
    'max_stage', 15,
    'server_now', now()
  );
end $$;

grant execute on function public.get_boss_path() to authenticated;

create or replace function public.complete_boss_stage(p_stage int, p_score int, p_target int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg jsonb;
  prog record;
  reward_chest_id bigint;
  reward_boost_id bigint;
  expected_hp int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.boss_path_progress(user_id) values (uid) on conflict (user_id) do nothing;
  select * into prog from public.boss_path_progress where user_id = uid;

  if p_stage <> prog.current_stage then
    raise exception 'wrong stage';
  end if;
  if p_stage > 15 then raise exception 'no more stages'; end if;

  cfg := public.boss_path_stage_config(p_stage);
  if cfg is null then raise exception 'invalid stage'; end if;

  expected_hp := (cfg->>'hp')::int;
  if coalesce(p_score, 0) < expected_hp or coalesce(p_target, 0) < expected_hp then
    raise exception 'boss not defeated';
  end if;

  insert into public.boss_path_rewards(user_id, stage, kind, payload)
    values (uid, p_stage, 'chest', jsonb_build_object(
      'coins', (cfg->>'chest_coins')::bigint,
      'species', cfg->>'species',
      'boss_name', cfg->>'name'
    )) returning id into reward_chest_id;

  insert into public.boss_path_rewards(user_id, stage, kind, payload)
    values (uid, p_stage, 'boost', jsonb_build_object(
      'multiplier', (cfg->>'boost_mult')::numeric,
      'duration_minutes', (cfg->>'boost_minutes')::int,
      'boss_name', cfg->>'name'
    )) returning id into reward_boost_id;

  update public.boss_path_progress
    set current_stage = p_stage + 1,
        highest_stage = greatest(highest_stage, p_stage),
        total_victories = total_victories + 1,
        updated_at = now()
    where user_id = uid;

  return jsonb_build_object(
    'stage', p_stage,
    'next_stage', p_stage + 1,
    'reward_chest_id', reward_chest_id,
    'reward_boost_id', reward_boost_id,
    'chest', jsonb_build_object('coins', (cfg->>'chest_coins')::bigint),
    'boost', jsonb_build_object(
      'multiplier', (cfg->>'boost_mult')::numeric,
      'duration_minutes', (cfg->>'boost_minutes')::int
    )
  );
end $$;

grant execute on function public.complete_boss_stage(int,int,int) to authenticated;

create or replace function public.open_boss_chest(p_reward_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  rew record;
  add_coins bigint;
  new_coins bigint;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into rew from public.boss_path_rewards
    where id = p_reward_id and user_id = uid for update;
  if not found then raise exception 'reward not found'; end if;
  if rew.consumed_at is not null then raise exception 'already opened'; end if;
  if rew.kind <> 'chest' then raise exception 'not a chest'; end if;

  add_coins := coalesce((rew.payload->>'coins')::bigint, 0);

  update public.profiles
    set coins = coalesce(coins,0) + add_coins
    where id = uid
    returning coins into new_coins;

  update public.boss_path_rewards
    set consumed_at = now()
    where id = p_reward_id;

  return jsonb_build_object(
    'coins_added', add_coins,
    'coins', new_coins,
    'reward_id', p_reward_id
  );
end $$;

grant execute on function public.open_boss_chest(bigint) to authenticated;

create or replace function public.activate_boss_reward(p_reward_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  rew record;
  now_ts timestamptz := now();
  cur_until timestamptz;
  cur_mult numeric;
  new_until timestamptz;
  new_mult numeric;
  mult numeric;
  duration_min int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into rew from public.boss_path_rewards
    where id = p_reward_id and user_id = uid for update;
  if not found then raise exception 'reward not found'; end if;
  if rew.consumed_at is not null then raise exception 'already used'; end if;
  if rew.kind <> 'boost' then raise exception 'not a boost'; end if;

  mult := coalesce((rew.payload->>'multiplier')::numeric, 2);
  duration_min := coalesce((rew.payload->>'duration_minutes')::int, 5);

  insert into public.pets(owner_id) values (uid) on conflict (owner_id) do nothing;

  select boost_until, boost_multiplier into cur_until, cur_mult
    from public.pets where owner_id = uid;

  if cur_until > now_ts and cur_mult >= mult then
    new_until := cur_until + (duration_min || ' minutes')::interval;
    new_mult := cur_mult;
  else
    new_until := now_ts + (duration_min || ' minutes')::interval;
    new_mult := mult;
  end if;

  update public.pets
    set boost_multiplier = new_mult,
        boost_until = new_until,
        last_fed_at = now_ts
    where owner_id = uid;

  update public.boss_path_rewards
    set consumed_at = now()
    where id = p_reward_id;

  return jsonb_build_object(
    'boost_multiplier', new_mult,
    'boost_until', new_until,
    'server_now', now_ts,
    'reward_id', p_reward_id
  );
end $$;

grant execute on function public.activate_boss_reward(bigint) to authenticated;
