-- Optionale garantierte Pet-Belohnungen pro Boss-Pfad-Etappe.
-- Beispiel: Stage 15 schenkt einen Gold-Drachen.

alter table public.boss_path_stage_configs
  add column if not exists pet_species text,
  add column if not exists pet_tier text not null default 'normal',
  add column if not exists pet_qty int not null default 0 check (pet_qty >= 0);

comment on column public.boss_path_stage_configs.pet_species is 'Optionale garantierte Pet-Spezies nach Sieg.';
comment on column public.boss_path_stage_configs.pet_tier is 'Tier der garantierten Pet-Belohnung, z.B. normal, gold, diamond.';
comment on column public.boss_path_stage_configs.pet_qty is 'Anzahl garantierter Pets nach Sieg; 0 deaktiviert diese Belohnung.';

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'boss_path_stage_configs_pet_qty_species_check'
  ) then
    alter table public.boss_path_stage_configs
      add constraint boss_path_stage_configs_pet_qty_species_check
      check (pet_qty = 0 or pet_species is not null);
  end if;
end $$;

update public.boss_path_stage_configs
   set pet_species = 'dragon',
       pet_tier = 'gold',
       pet_qty = 1
 where stage = 15
   and coalesce(pet_qty, 0) = 0
   and pet_species is null;

create or replace function public.boss_path_stage_config(p_stage int)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cfg public.boss_path_stage_configs%rowtype;
begin
  select * into cfg
    from public.boss_path_stage_configs
   where stage = p_stage;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'stage', cfg.stage,
    'species', cfg.species,
    'name', cfg.name,
    'terrain', cfg.terrain,
    'hp', cfg.hp,
    'time_seconds', cfg.time_seconds,
    'chest_qty', cfg.chest_qty,
    'boost_mult', cfg.boost_mult,
    'boost_minutes', cfg.boost_minutes,
    'pet_species', cfg.pet_species,
    'pet_tier', cfg.pet_tier,
    'pet_qty', cfg.pet_qty
  );
end $$;

grant execute on function public.boss_path_stage_config(int) to authenticated;

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
