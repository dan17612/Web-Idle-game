-- Merge-Mini-Game: 2048-ähnliches Tier-Event mit globalem Counter.
-- Bestehende Tierdaten aus species_costs bleiben die Quelle für Emoji,
-- Seltenheit, Rate und Belohnungs-Tiere.

create table if not exists public.merge_global_state (
  id int primary key default 1 check (id = 1),
  total_fusions bigint not null default 0 check (total_fusions >= 0),
  highest_rank int not null default 0 check (highest_rank >= 0),
  mythic_total bigint not null default 0 check (mythic_total >= 0),
  bonus_multiplier numeric not null default 1 check (bonus_multiplier >= 1),
  bonus_until timestamptz not null default '1970-01-01 00:00:00+00',
  last_mythic_species text references public.species_costs(species) on update cascade on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.merge_global_state is
  'Globaler Stand des Merge-Mini-Games: weltweite Fusionen, Rekorde und Bonus-Event.';

insert into public.merge_global_state (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.merge_player_states (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  board jsonb not null default '[]'::jsonb,
  version uuid not null default gen_random_uuid(),
  score bigint not null default 0 check (score >= 0),
  total_fusions bigint not null default 0 check (total_fusions >= 0),
  highest_rank int not null default 0 check (highest_rank >= 0),
  combo_best int not null default 0 check (combo_best >= 0),
  last_score_delta bigint not null default 0 check (last_score_delta >= 0),
  last_spawn_rank int not null default 0 check (last_spawn_rank >= 0),
  last_fusion_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.merge_player_states is
  'Persönlicher Brett- und Fortschrittsstand des Merge-Mini-Games.';

create index if not exists merge_player_states_score_idx
  on public.merge_player_states(score desc, total_fusions desc, highest_rank desc);

create table if not exists public.merge_milestones (
  fusion_goal bigint primary key check (fusion_goal > 0),
  title text not null,
  reward jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.merge_milestones is
  'Dynamische globale Meilensteine des Merge-Events mit Reward-Payload.';

insert into public.merge_milestones (fusion_goal, title, reward, sort_order)
values
  (100, 'Erste Herde', '{"coins": 5000, "tickets": 5}'::jsonb, 10),
  (500, 'Stall voller Zahlen', '{"coins": 25000, "tickets": 12, "species": "rabbit", "tier": "normal", "qty": 1}'::jsonb, 20),
  (1000, 'Weltweite Fusionswelle', '{"coins": 75000, "tickets": 20, "species": "panda", "tier": "normal", "qty": 1}'::jsonb, 30),
  (2500, 'Boss-Event-Energie', '{"coins": 150000, "tickets": 35, "species": "dragon", "tier": "normal", "qty": 1}'::jsonb, 40),
  (5000, 'Mythischer Durchbruch', '{"coins": 300000, "tickets": 60, "species": "phoenix", "tier": "gold", "qty": 1}'::jsonb, 50)
on conflict (fusion_goal) do update
  set title = excluded.title,
      reward = excluded.reward,
      sort_order = excluded.sort_order,
      is_active = true;

create table if not exists public.merge_milestone_claims (
  user_id uuid not null references public.profiles(id) on delete cascade,
  fusion_goal bigint not null references public.merge_milestones(fusion_goal) on delete cascade,
  reward jsonb not null default '{}'::jsonb,
  claimed_at timestamptz not null default now(),
  primary key (user_id, fusion_goal)
);

comment on table public.merge_milestone_claims is
  'Pro-Spieler-Claims für globale Merge-Meilensteine.';

create index if not exists merge_milestone_claims_goal_idx
  on public.merge_milestone_claims(fusion_goal);

alter table public.merge_global_state enable row level security;
alter table public.merge_player_states enable row level security;
alter table public.merge_milestones enable row level security;
alter table public.merge_milestone_claims enable row level security;

drop policy if exists "merge_global_state read" on public.merge_global_state;
create policy "merge_global_state read" on public.merge_global_state
  for select using ((select auth.uid()) is not null);

drop policy if exists "merge_player_states self read" on public.merge_player_states;
create policy "merge_player_states self read" on public.merge_player_states
  for select using ((select auth.uid()) = user_id);

drop policy if exists "merge_milestones read" on public.merge_milestones;
create policy "merge_milestones read" on public.merge_milestones
  for select using ((select auth.uid()) is not null);

drop policy if exists "merge_milestone_claims self read" on public.merge_milestone_claims;
create policy "merge_milestone_claims self read" on public.merge_milestone_claims
  for select using ((select auth.uid()) = user_id);

revoke all on table public.merge_global_state from anon;
revoke all on table public.merge_player_states from anon;
revoke all on table public.merge_milestones from anon;
revoke all on table public.merge_milestone_claims from anon;

grant select on table public.merge_global_state to authenticated;
grant select on table public.merge_player_states to authenticated;
grant select on table public.merge_milestones to authenticated;
grant select on table public.merge_milestone_claims to authenticated;

grant select, insert, update, delete on table public.merge_global_state to service_role;
grant select, insert, update, delete on table public.merge_player_states to service_role;
grant select, insert, update, delete on table public.merge_milestones to service_role;
grant select, insert, update, delete on table public.merge_milestone_claims to service_role;

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

  select coalesce(jsonb_agg(jsonb_build_object(
    'fusion_goal', m.fusion_goal,
    'title', m.title,
    'reward', m.reward
  ) order by m.fusion_goal), '[]'::jsonb)
    into v_claimable
    from public.merge_milestones m
   where m.is_active
     and m.fusion_goal <= v_global.total_fusions
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
  v_global_total bigint;
  v_reward jsonb;
  v_coins bigint;
  v_tickets bigint;
  v_species text;
  v_tier text;
  v_qty int;
  v_i int;
  v_new_id uuid;
  v_animal_ids uuid[] := '{}';
  v_profile record;
begin
  if p_user_id is null then
    raise exception 'missing user';
  end if;

  select total_fusions into v_global_total
    from public.merge_global_state
   where id = 1
   for update;

  select reward into v_reward
    from public.merge_milestones
   where fusion_goal = p_fusion_goal
     and is_active;

  if v_reward is null then
    raise exception 'unknown milestone';
  end if;
  if coalesce(v_global_total, 0) < p_fusion_goal then
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

  return jsonb_build_object(
    'fusion_goal', p_fusion_goal,
    'reward', v_reward,
    'coins', coalesce(v_profile.coins, 0),
    'tickets', coalesce(v_profile.tickets, 0),
    'animal_ids', to_jsonb(v_animal_ids)
  );
end $$;

revoke all on function public.merge_claim_milestone(uuid, bigint)
  from public, anon, authenticated;
grant execute on function public.merge_claim_milestone(uuid, bigint)
  to service_role;

do $$
begin
  alter publication supabase_realtime add table public.merge_global_state;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
