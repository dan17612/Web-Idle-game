-- Event-Zeitplan, Merge-Bestenliste und Pro-Spieler-Meilensteine im Merge-Spiel.

-- 1) Globaler Zeitplan für zeitlich begrenzte Ereignisse (Boss-Pfad, Merge-Safari).
create table if not exists public.event_schedule (
  key text primary key check (length(key) between 1 and 64),
  starts_at timestamptz,
  ends_at timestamptz,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

comment on table public.event_schedule is
  'Start- und Endzeitpunkte für zeitlich begrenzte Ereignisse (z. B. Boss-Pfad, Merge-Safari).';

insert into public.event_schedule (key, starts_at, ends_at, enabled)
values
  ('boss_path', null, '2026-05-10 23:59:59+00', true),
  ('merge_game', null, '2026-05-10 23:59:59+00', true)
on conflict (key) do nothing;

create or replace function public.touch_event_schedule_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists event_schedule_touch_updated_at on public.event_schedule;
create trigger event_schedule_touch_updated_at
  before update on public.event_schedule
  for each row execute function public.touch_event_schedule_updated_at();

alter table public.event_schedule enable row level security;

drop policy if exists "event_schedule read" on public.event_schedule;
create policy "event_schedule read" on public.event_schedule
  for select using (true);

drop policy if exists "event_schedule admin write" on public.event_schedule;
create policy "event_schedule admin write" on public.event_schedule
  for all
  using (public._admin_role() = 'admin')
  with check (public._admin_role() = 'admin');

revoke all on table public.event_schedule from anon;
grant select on table public.event_schedule to anon, authenticated;
grant select, insert, update, delete on table public.event_schedule to service_role;

create or replace function public.get_event_schedule()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_object_agg(key, jsonb_build_object(
    'starts_at', starts_at,
    'ends_at', ends_at,
    'enabled', enabled
  )), '{}'::jsonb)
  from public.event_schedule;
$$;

grant execute on function public.get_event_schedule() to anon, authenticated;

-- 2) Helper: Event aktiv?
create or replace function public.event_is_active(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select enabled
       and (starts_at is null or starts_at <= now())
       and (ends_at is null or ends_at > now())
     from public.event_schedule
     where key = p_key),
    true);
$$;

grant execute on function public.event_is_active(text) to anon, authenticated;

-- 3) Merge-Bestenliste: nach höchstem Tier (Rank), dann Punkten, dann Fusionen.
create or replace function public.get_merge_leaderboard(p_limit int default 50)
returns table (
  username text,
  avatar_emoji text,
  score bigint,
  total_fusions bigint,
  highest_rank int,
  combo_best int
) language sql security definer set search_path = public as $$
  select
    p.username,
    p.avatar_emoji,
    m.score,
    m.total_fusions,
    m.highest_rank,
    m.combo_best
  from public.merge_player_states m
  join public.profiles p on p.id = m.user_id
  where coalesce(p.is_banned, false) = false
    and (m.score > 0 or m.total_fusions > 0 or m.highest_rank > 0)
  order by m.highest_rank desc, m.score desc, m.total_fusions desc
  limit greatest(1, least(p_limit, 100));
$$;

grant execute on function public.get_merge_leaderboard(int) to authenticated, anon;

-- 4) Per-Spieler-Meilensteine: Eligibility nun auf merge_player_states.total_fusions.
--    Globale Counter bleiben für Anzeigezwecke unverändert.

create or replace function public.merge_apply_turn(
  p_user_id uuid,
  p_seen_version uuid,
  p_board jsonb,
  p_score_delta bigint,
  p_fusions_count int,
  p_highest_rank int,
  p_combo int,
  p_spawn_rank int,
  p_mythic_species text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_state public.merge_player_states%rowtype;
  v_global public.merge_global_state%rowtype;
  v_claimable jsonb := '[]'::jsonb;
begin
  if p_user_id is null then
    raise exception 'missing user';
  end if;
  if jsonb_typeof(p_board) <> 'array' or jsonb_array_length(p_board) <> 16 then
    raise exception 'invalid board';
  end if;
  if coalesce(p_score_delta, 0) < 0
     or coalesce(p_fusions_count, 0) < 0
     or coalesce(p_highest_rank, 0) < 0
     or coalesce(p_combo, 0) < 0
     or coalesce(p_spawn_rank, 0) < 0 then
    raise exception 'invalid merge result';
  end if;
  if p_mythic_species is not null
     and not exists (select 1 from public.species_costs where species = p_mythic_species) then
    raise exception 'unknown mythic species';
  end if;
  if not public.event_is_active('merge_game') then
    raise exception 'event ended';
  end if;

  update public.merge_player_states
     set board = p_board,
         version = gen_random_uuid(),
         score = score + coalesce(p_score_delta, 0),
         total_fusions = total_fusions + coalesce(p_fusions_count, 0),
         highest_rank = greatest(highest_rank, coalesce(p_highest_rank, 0)),
         combo_best = greatest(combo_best, coalesce(p_combo, 0)),
         last_score_delta = coalesce(p_score_delta, 0),
         last_spawn_rank = coalesce(p_spawn_rank, 0),
         last_fusion_at = case when coalesce(p_fusions_count, 0) > 0 then v_now else last_fusion_at end,
         updated_at = v_now
   where user_id = p_user_id
     and version = p_seen_version
   returning * into v_state;

  if not found then
    raise exception 'state conflict';
  end if;

  update public.merge_global_state
     set total_fusions = total_fusions + coalesce(p_fusions_count, 0),
         highest_rank = greatest(highest_rank, coalesce(p_highest_rank, 0)),
         updated_at = v_now
   where id = 1
   returning * into v_global;

  if p_mythic_species is not null then
    update public.merge_global_state
       set mythic_total = mythic_total + 1,
           bonus_multiplier = greatest(bonus_multiplier, 2),
           bonus_until = greatest(bonus_until, v_now) + interval '10 minutes',
           last_mythic_species = p_mythic_species,
           updated_at = v_now
     where id = 1
     returning * into v_global;
  end if;

  -- Eligibility nun gegen den persönlichen Fortschritt, nicht den globalen.
  select coalesce(jsonb_agg(jsonb_build_object(
    'fusion_goal', m.fusion_goal,
    'title', m.title,
    'reward', m.reward
  ) order by m.fusion_goal), '[]'::jsonb)
    into v_claimable
    from public.merge_milestones m
   where m.is_active
     and m.fusion_goal <= v_state.total_fusions
     and not exists (
       select 1
         from public.merge_milestone_claims c
        where c.user_id = p_user_id
          and c.fusion_goal = m.fusion_goal
     );

  return jsonb_build_object(
    'state', to_jsonb(v_state),
    'global', to_jsonb(v_global),
    'claimable_milestones', v_claimable
  );
end $$;

revoke all on function public.merge_apply_turn(uuid, uuid, jsonb, bigint, int, int, int, int, text)
  from public, anon, authenticated;
grant execute on function public.merge_apply_turn(uuid, uuid, jsonb, bigint, int, int, int, int, text)
  to service_role;

create or replace function public.merge_claim_milestone(
  p_user_id uuid,
  p_fusion_goal bigint
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_player_total bigint;
  v_reward jsonb;
  v_coins bigint;
  v_tickets bigint;
  v_chests int;
  v_species text;
  v_tier text;
  v_qty int;
  v_i int;
  v_weight_total int;
  v_roll int;
  v_acc int;
  v_rec record;
  v_picked_species text;
  v_new_id uuid;
  v_animal_ids uuid[] := '{}';
  v_chest_animal_ids uuid[] := '{}';
  v_chest_species text[] := '{}';
  v_profile record;
begin
  if p_user_id is null then
    raise exception 'missing user';
  end if;
  if not public.event_is_active('merge_game') then
    raise exception 'event ended';
  end if;

  select total_fusions into v_player_total
    from public.merge_player_states
   where user_id = p_user_id
   for update;

  select reward into v_reward
    from public.merge_milestones
   where fusion_goal = p_fusion_goal
     and is_active;

  if v_reward is null then
    raise exception 'unknown milestone';
  end if;
  if coalesce(v_player_total, 0) < p_fusion_goal then
    raise exception 'milestone locked';
  end if;

  insert into public.merge_milestone_claims(user_id, fusion_goal, reward)
  values (p_user_id, p_fusion_goal, v_reward)
  on conflict (user_id, fusion_goal) do nothing;

  if not found then
    raise exception 'already claimed';
  end if;

  v_coins := coalesce((v_reward->>'coins')::bigint, 0);
  v_tickets := coalesce((v_reward->>'tickets')::bigint, 0);
  v_chests := least(25, greatest(0, coalesce((v_reward->>'chests')::int, 0)));

  if v_coins > 0 or v_tickets > 0 then
    update public.profiles
       set coins = coins + v_coins,
           tickets = tickets + v_tickets
     where id = p_user_id
     returning coins, tickets into v_profile;
  else
    select coins, tickets into v_profile
      from public.profiles
     where id = p_user_id;
  end if;

  v_species := nullif(v_reward->>'species', '');
  v_tier := coalesce(nullif(v_reward->>'tier', ''), 'normal');
  v_qty := greatest(0, coalesce((v_reward->>'qty')::int, 0));

  if v_species is not null and v_qty > 0 then
    if not exists (select 1 from public.species_costs where species = v_species) then
      raise exception 'unknown reward species';
    end if;
    for v_i in 1..least(v_qty, 50) loop
      insert into public.animals(owner_id, species, tier, equipped)
      values (p_user_id, v_species, v_tier, false)
      returning id into v_new_id;
      v_animal_ids := v_animal_ids || v_new_id;
    end loop;
  end if;

  if v_chests > 0 then
    select coalesce(sum(weight), 0) into v_weight_total
      from public.species_costs
     where enabled
       and weight > 0;

    if coalesce(v_weight_total, 0) <= 0 then
      raise exception 'no species available';
    end if;

    for v_i in 1..v_chests loop
      v_roll := 1 + floor(random() * v_weight_total)::int;
      v_acc := 0;
      v_picked_species := null;

      for v_rec in
        select species, weight
          from public.species_costs
         where enabled
           and weight > 0
         order by species
      loop
        v_acc := v_acc + v_rec.weight;
        if v_roll <= v_acc then
          v_picked_species := v_rec.species;
          exit;
        end if;
      end loop;

      if v_picked_species is null then
        select species into v_picked_species
          from public.species_costs
         where enabled
           and weight > 0
         order by species
         limit 1;
      end if;

      insert into public.animals(owner_id, species, equipped)
      values (p_user_id, v_picked_species, false)
      returning id into v_new_id;

      v_chest_animal_ids := v_chest_animal_ids || v_new_id;
      v_chest_species := v_chest_species || v_picked_species;
    end loop;
  end if;

  return jsonb_build_object(
    'fusion_goal', p_fusion_goal,
    'reward', v_reward,
    'coins', coalesce(v_profile.coins, 0),
    'tickets', coalesce(v_profile.tickets, 0),
    'chests', v_chests,
    'animal_ids', to_jsonb(v_animal_ids),
    'chest_animal_ids', to_jsonb(v_chest_animal_ids),
    'chest_species', to_jsonb(v_chest_species)
  );
end $$;

revoke all on function public.merge_claim_milestone(uuid, bigint)
  from public, anon, authenticated;
grant execute on function public.merge_claim_milestone(uuid, bigint)
  to service_role;

-- 5) Boss-Pfad: complete_boss_stage blockt nach Eventende (Pet-Reward bleibt erhalten).
create or replace function public.complete_boss_stage(p_stage int, p_score int, p_target int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg jsonb;
  prog record;
  reward_chest_id bigint;
  reward_boost_id bigint;
  expected_hp int;
  chest_qty int;
  max_stage int;
  pet_species text;
  pet_tier text;
  pet_qty int;
  pet_ids uuid[] := '{}';
  pet_reward jsonb := null;
  new_animal public.animals%rowtype;
  i int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not public.event_is_active('boss_path') then raise exception 'event ended'; end if;
  insert into public.boss_path_progress(user_id) values (uid) on conflict (user_id) do nothing;
  select * into prog from public.boss_path_progress where user_id = uid;

  select coalesce(max(stage), 0) into max_stage from public.boss_path_stage_configs;

  if p_stage <> prog.current_stage then raise exception 'wrong stage'; end if;
  if max_stage <= 0 or p_stage > max_stage then raise exception 'no more stages'; end if;

  cfg := public.boss_path_stage_config(p_stage);
  if cfg is null then raise exception 'invalid stage'; end if;

  expected_hp := (cfg->>'hp')::int;
  if coalesce(p_score, 0) < expected_hp or coalesce(p_target, 0) < expected_hp then
    raise exception 'boss not defeated';
  end if;

  chest_qty := greatest(1, coalesce((cfg->>'chest_qty')::int, 1));

  insert into public.boss_path_rewards(user_id, stage, kind, payload)
    values (uid, p_stage, 'chest', jsonb_build_object(
      'chest_qty', chest_qty,
      'boss_name', cfg->>'name'
    )) returning id into reward_chest_id;

  insert into public.boss_path_rewards(user_id, stage, kind, payload)
    values (uid, p_stage, 'boost', jsonb_build_object(
      'multiplier', (cfg->>'boost_mult')::numeric,
      'duration_minutes', (cfg->>'boost_minutes')::int,
      'boss_name', cfg->>'name'
    )) returning id into reward_boost_id;

  pet_species := nullif(cfg->>'pet_species', '');
  pet_tier := coalesce(nullif(cfg->>'pet_tier', ''), 'normal');
  pet_qty := greatest(0, coalesce((cfg->>'pet_qty')::int, 0));

  if pet_species is not null and pet_qty > 0 then
    if not exists (select 1 from public.species_costs where species = pet_species) then
      raise exception 'unknown pet reward species';
    end if;
    if not exists (select 1 from public.tier_defs where tier = pet_tier) then
      raise exception 'unknown pet reward tier';
    end if;

    for i in 1..pet_qty loop
      insert into public.animals(owner_id, species, tier, equipped)
        values (uid, pet_species, pet_tier, false)
        returning * into new_animal;
      pet_ids := pet_ids || new_animal.id;
    end loop;

    update public.profiles
       set favorite_animal_id = pet_ids[1]
     where id = uid
       and favorite_animal_id is null;

    pet_reward := jsonb_build_object(
      'species', pet_species,
      'tier', pet_tier,
      'qty', pet_qty,
      'animal_ids', to_jsonb(pet_ids)
    );
  end if;

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
    'chest', jsonb_build_object('chest_qty', chest_qty),
    'boost', jsonb_build_object(
      'multiplier', (cfg->>'boost_mult')::numeric,
      'duration_minutes', (cfg->>'boost_minutes')::int
    ),
    'pet_reward', pet_reward
  );
end $$;

grant execute on function public.complete_boss_stage(int,int,int) to authenticated;
