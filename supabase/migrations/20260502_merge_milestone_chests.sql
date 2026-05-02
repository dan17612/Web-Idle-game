-- Merge-Meilensteine: Tickets bleiben Tickets, Truhen öffnen echte Tiere.

insert into public.merge_milestones (fusion_goal, title, reward, sort_order)
values
  (100, 'Erste Herde', '{"coins": 5000, "tickets": 5, "chests": 1}'::jsonb, 10),
  (500, 'Stall voller Zahlen', '{"coins": 25000, "tickets": 12, "chests": 2, "species": "rabbit", "tier": "normal", "qty": 1}'::jsonb, 20),
  (1000, 'Weltweite Fusionswelle', '{"coins": 75000, "tickets": 20, "chests": 3, "species": "panda", "tier": "normal", "qty": 1}'::jsonb, 30),
  (2500, 'Boss-Event-Energie', '{"coins": 150000, "tickets": 35, "chests": 4, "species": "dragon", "tier": "normal", "qty": 1}'::jsonb, 40),
  (5000, 'Mythischer Durchbruch', '{"coins": 300000, "tickets": 60, "chests": 5, "species": "phoenix", "tier": "gold", "qty": 1}'::jsonb, 50)
on conflict (fusion_goal) do update
  set title = excluded.title,
      reward = excluded.reward,
      sort_order = excluded.sort_order,
      is_active = true;

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
