-- Pfad-Truhen geben jetzt zufällige Tiere wie die Shop-Truhe.

delete from public.boss_path_rewards;

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
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.boss_path_progress(user_id) values (uid) on conflict (user_id) do nothing;
  select * into prog from public.boss_path_progress where user_id = uid;

  if p_stage <> prog.current_stage then raise exception 'wrong stage'; end if;
  if p_stage > 15 then raise exception 'no more stages'; end if;

  cfg := public.boss_path_stage_config(p_stage);
  if cfg is null then raise exception 'invalid stage'; end if;

  expected_hp := (cfg->>'hp')::int;
  if coalesce(p_score, 0) < expected_hp or coalesce(p_target, 0) < expected_hp then
    raise exception 'boss not defeated';
  end if;

  chest_qty := case
    when p_stage <= 5 then 1
    when p_stage <= 10 then 2
    when p_stage <= 14 then 3
    else 5
  end;

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
    'boost', jsonb_build_object('multiplier', (cfg->>'boost_mult')::numeric, 'duration_minutes', (cfg->>'boost_minutes')::int)
  );
end $$;

grant execute on function public.complete_boss_stage(int,int,int) to authenticated;

create or replace function public.open_boss_chest(p_reward_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  rew record;
  qty int;
  w_total int;
  r int;
  acc int;
  rec record;
  picked_species text;
  new_ids uuid[] := '{}';
  new_species text[] := '{}';
  i int;
  new_animal public.animals%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into rew from public.boss_path_rewards where id = p_reward_id and user_id = uid for update;
  if not found then raise exception 'reward not found'; end if;
  if rew.consumed_at is not null then raise exception 'already opened'; end if;
  if rew.kind <> 'chest' then raise exception 'not a chest'; end if;

  qty := greatest(1, coalesce((rew.payload->>'chest_qty')::int, 1));

  select coalesce(sum(weight), 0) into w_total
    from public.species_costs where enabled and weight > 0;
  if w_total <= 0 then raise exception 'no species available'; end if;

  for i in 1..qty loop
    r := 1 + floor(random() * w_total)::int;
    acc := 0;
    picked_species := null;
    for rec in
      select species, weight from public.species_costs
        where enabled and weight > 0 order by species
    loop
      acc := acc + rec.weight;
      if r <= acc then picked_species := rec.species; exit; end if;
    end loop;
    if picked_species is null then
      select species into picked_species from public.species_costs
        where enabled and weight > 0 order by species limit 1;
    end if;
    insert into public.animals(owner_id, species) values (uid, picked_species)
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
