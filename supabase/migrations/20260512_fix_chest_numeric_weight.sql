-- Fix: Truhen-Funktionen verwenden numeric statt int für weight-Variablen,
-- damit Tiere mit gebrochenen Gewichten (z.B. 0.5, 0.2) korrekt gezogen werden.

-- 1) buy_chest
create or replace function public.buy_chest(p_qty int default 1)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.chest_config; state public.shop_state;
  bought_slot int; total_cost bigint; balance bigint;
  w_total numeric; r numeric; acc numeric; rec record;
  picked_species text; new_ids uuid[] := '{}'; new_species text[] := '{}';
  i int; new_animal public.animals%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_qty is null or p_qty < 1 or p_qty > 5 then raise exception 'qty must be 1, 2 or 5'; end if;
  select * into cfg from public.chest_config where id = 1;
  if cfg is null then raise exception 'chest config missing'; end if;
  state := public._rotate_if_needed();
  select count into bought_slot from public.chest_purchases
    where user_id = uid and slot_start = state.updated_at for update;
  bought_slot := coalesce(bought_slot, 0);
  if bought_slot + p_qty > cfg.daily_limit then
    raise exception 'chest limit reached this rotation (% / %)', bought_slot, cfg.daily_limit;
  end if;
  total_cost := cfg.price * p_qty;
  update public.profiles set coins = coins - total_cost
    where id = uid and coins >= total_cost returning coins into balance;
  if balance is null then raise exception 'insufficient coins'; end if;
  insert into public.chest_purchases(user_id, slot_start, count) values (uid, state.updated_at, p_qty)
    on conflict (user_id, slot_start) do update set count = public.chest_purchases.count + p_qty;
  select coalesce(sum(weight), 0) into w_total from public.species_costs where enabled and weight > 0;
  if w_total <= 0 then raise exception 'no species available'; end if;
  for i in 1..p_qty loop
    r := random() * w_total;
    acc := 0; picked_species := null;
    for rec in select species, weight from public.species_costs where enabled and weight > 0 order by species loop
      acc := acc + rec.weight;
      if r < acc then picked_species := rec.species; exit; end if;
    end loop;
    if picked_species is null then
      select species into picked_species from public.species_costs where enabled and weight > 0 order by species limit 1;
    end if;
    insert into public.animals(owner_id, species) values (uid, picked_species) returning * into new_animal;
    new_ids := new_ids || new_animal.id;
    new_species := new_species || picked_species;
  end loop;
  return jsonb_build_object(
    'coins', balance, 'qty', p_qty,
    'species', to_jsonb(new_species), 'animal_ids', to_jsonb(new_ids),
    'bought_slot', bought_slot + p_qty, 'slot_limit', cfg.daily_limit,
    'price', cfg.price, 'slot_start', state.updated_at
  );
end $$;
grant execute on function public.buy_chest(int) to authenticated;

-- 2) ticket_chest_open
create or replace function public.ticket_chest_open(p_qty int default 1)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.ticket_config;
  state public.ticket_shop_state;
  bought_slot int; total_cost bigint; new_tickets bigint;
  w_total numeric; r numeric; acc numeric; rec record;
  picked_species text; new_ids uuid[] := '{}'; new_species text[] := '{}';
  i int; new_animal public.animals%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_qty is null or p_qty < 1 or p_qty > 5 then raise exception 'qty must be 1, 2 or 5'; end if;
  select * into cfg from public.ticket_config where id = 1;
  if cfg is null then raise exception 'ticket config missing'; end if;
  state := public._ticket_rotate_if_needed();
  select count into bought_slot from public.ticket_chest_purchases
    where user_id = uid and slot_start = state.updated_at for update;
  bought_slot := coalesce(bought_slot, 0);
  if bought_slot + p_qty > cfg.chest_slot_limit then
    raise exception 'ticket chest limit reached (% / %)', bought_slot, cfg.chest_slot_limit;
  end if;
  total_cost := cfg.chest_price * p_qty;
  update public.profiles set tickets = tickets - total_cost
    where id = uid and tickets >= total_cost returning tickets into new_tickets;
  if new_tickets is null then raise exception 'insufficient tickets'; end if;
  insert into public.ticket_chest_purchases(user_id, slot_start, count) values (uid, state.updated_at, p_qty)
    on conflict (user_id, slot_start) do update set count = public.ticket_chest_purchases.count + p_qty;
  select coalesce(sum(weight), 0) into w_total from public.species_costs where enabled and weight > 0;
  if w_total <= 0 then raise exception 'no species available'; end if;
  for i in 1..p_qty loop
    r := random() * w_total;
    acc := 0; picked_species := null;
    for rec in select species, weight from public.species_costs where enabled and weight > 0 order by species loop
      acc := acc + rec.weight;
      if r < acc then picked_species := rec.species; exit; end if;
    end loop;
    if picked_species is null then
      select species into picked_species from public.species_costs where enabled and weight > 0 order by species limit 1;
    end if;
    insert into public.animals(owner_id, species) values (uid, picked_species) returning * into new_animal;
    new_ids := new_ids || new_animal.id;
    new_species := new_species || picked_species;
  end loop;
  return jsonb_build_object(
    'tickets',     new_tickets,
    'qty',         p_qty,
    'species',     to_jsonb(new_species),
    'animal_ids',  to_jsonb(new_ids),
    'bought_slot', bought_slot + p_qty,
    'slot_limit',  cfg.chest_slot_limit,
    'price',       cfg.chest_price,
    'slot_start',  state.updated_at
  );
end $$;
grant execute on function public.ticket_chest_open(int) to authenticated;

-- 3) open_boss_chest
create or replace function public.open_boss_chest(p_reward_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  rew record;
  qty int;
  w_total numeric;
  r numeric;
  acc numeric;
  rec record;
  picked_species text;
  new_ids uuid[] := '{}';
  new_species text[] := '{}';
  i int;
  new_animal public.animals%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into rew from public.boss_path_rewards
    where id = p_reward_id and user_id = uid for update;
  if not found then raise exception 'reward not found'; end if;
  if rew.consumed_at is not null then raise exception 'already opened'; end if;
  if rew.kind <> 'chest' then raise exception 'not a chest'; end if;

  qty := greatest(1, coalesce((rew.payload->>'chest_qty')::int, 1));

  select coalesce(sum(weight), 0) into w_total
    from public.species_costs
   where enabled and weight > 0;
  if w_total <= 0 then raise exception 'no species available'; end if;

  for i in 1..qty loop
    r := random() * w_total;
    acc := 0;
    picked_species := null;

    for rec in
      select species, weight
        from public.species_costs
       where enabled and weight > 0
       order by species
    loop
      acc := acc + rec.weight;
      if r < acc then
        picked_species := rec.species;
        exit;
      end if;
    end loop;

    if picked_species is null then
      select species into picked_species
        from public.species_costs
       where enabled and weight > 0
       order by species
       limit 1;
    end if;

    insert into public.animals(owner_id, species)
      values (uid, picked_species)
      returning * into new_animal;

    new_ids := new_ids || new_animal.id;
    new_species := new_species || picked_species;
  end loop;

  update public.boss_path_rewards
    set consumed_at = now()
    where id = p_reward_id;

  return jsonb_build_object(
    'qty', qty,
    'species', to_jsonb(new_species),
    'animal_ids', to_jsonb(new_ids),
    'reward_id', p_reward_id
  );
end $$;
grant execute on function public.open_boss_chest(bigint) to authenticated;

-- 4) merge_claim_milestone
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
  v_weight_total numeric;
  v_roll numeric;
  v_acc numeric;
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
      v_roll := random() * v_weight_total;
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
        if v_roll < v_acc then
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

-- 5) boss_endless_finish
create or replace function public.boss_endless_finish(p_run_id bigint, p_damage bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_now timestamptz := now();
  v_run public.boss_endless_runs%rowtype;
  v_damage bigint;
  v_max_damage bigint := 5000000000;
  v_coins_reward bigint;
  v_chest_threshold bigint := 100000;
  v_grants_chest boolean := false;
  v_chest_qty int := 1;
  v_weight_total numeric;
  v_roll numeric;
  v_acc numeric;
  v_rec record;
  v_picked_species text;
  v_new_id uuid;
  v_chest_animal_ids uuid[] := '{}';
  v_chest_species text[] := '{}';
  v_i int;
  v_profile record;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select * into v_run from public.boss_endless_runs
   where id = p_run_id and user_id = uid for update;
  if not found then raise exception 'run not found'; end if;
  if v_run.status <> 'active' then raise exception 'run not active'; end if;

  v_damage := greatest(0, least(coalesce(p_damage, 0), v_max_damage));

  update public.boss_endless_runs
     set damage = v_damage,
         status = 'finished',
         finished_at = least(v_now, v_run.ends_at)
   where id = v_run.id;

  v_coins_reward := greatest(0, v_damage / 100);
  v_grants_chest := v_damage >= v_chest_threshold;
  if v_damage >= 1000000 then v_chest_qty := 3;
  elsif v_damage >= v_chest_threshold then v_chest_qty := 1; end if;

  if v_coins_reward > 0 then
    update public.profiles
       set coins = coins + v_coins_reward
     where id = uid
     returning coins, tickets into v_profile;
  else
    select coins, tickets into v_profile from public.profiles where id = uid;
  end if;

  if v_grants_chest then
    select coalesce(sum(weight), 0) into v_weight_total
      from public.species_costs
     where enabled and weight > 0 and coalesce(craft_only, false) = false;
    if coalesce(v_weight_total, 0) > 0 then
      for v_i in 1..v_chest_qty loop
        v_roll := random() * v_weight_total;
        v_acc := 0;
        v_picked_species := null;
        for v_rec in
          select species, weight from public.species_costs
          where enabled and weight > 0 and coalesce(craft_only, false) = false
          order by species
        loop
          v_acc := v_acc + v_rec.weight;
          if v_roll < v_acc then
            v_picked_species := v_rec.species;
            exit;
          end if;
        end loop;
        if v_picked_species is not null then
          insert into public.animals(owner_id, species, equipped)
          values (uid, v_picked_species, false)
          returning id into v_new_id;
          v_chest_animal_ids := v_chest_animal_ids || v_new_id;
          v_chest_species := v_chest_species || v_picked_species;
        end if;
      end loop;
    end if;
  end if;

  return jsonb_build_object(
    'id', v_run.id,
    'damage', v_damage,
    'coins_reward', v_coins_reward,
    'chest_granted', v_grants_chest,
    'chest_qty', case when v_grants_chest then v_chest_qty else 0 end,
    'chest_species', to_jsonb(v_chest_species),
    'chest_animal_ids', to_jsonb(v_chest_animal_ids),
    'coins', coalesce(v_profile.coins, 0)
  );
end $$;

grant execute on function public.boss_endless_finish(bigint, bigint) to authenticated;
