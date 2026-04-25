-- Tier-Downgrade: ein nicht-normales Tier (gold/diamond/epic/rainbow) zurueck in
-- required_qty normale Tiere derselben Spezies aufspalten. Dauert 1 Minute.

create or replace function public.start_tier_downgrade(p_animal_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  a public.animals%rowtype;
  td public.tier_defs%rowtype;
  species_key text;
  ready timestamptz;
  i int;
  new_id uuid;
  new_ids uuid[] := '{}';
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select * into a from public.animals
    where id = p_animal_id and owner_id = uid
    for update;
  if not found then raise exception 'not your animal'; end if;
  if a.equipped then raise exception 'animal is equipped'; end if;
  if coalesce(a.tier, 'normal') = 'normal' then
    raise exception 'only higher tiers can be split';
  end if;
  if a.upgrade_ready_at is not null and a.upgrade_ready_at > now() then
    raise exception 'animal is currently upgrading';
  end if;

  select * into td from public.tier_defs where tier = a.tier;
  if not found or td.required_qty <= 0 then raise exception 'invalid tier'; end if;

  species_key := a.species;
  delete from public.animals where id = p_animal_id and owner_id = uid;

  ready := now() + make_interval(mins => 1);
  for i in 1..td.required_qty loop
    insert into public.animals(owner_id, species, equipped, tier, upgrade_ready_at)
      values (uid, species_key, false, 'normal', ready)
      returning id into new_id;
    new_ids := array_append(new_ids, new_id);
  end loop;

  return jsonb_build_object('ids', new_ids, 'ready_at', ready, 'count', td.required_qty);
end $$;

grant execute on function public.start_tier_downgrade(uuid) to authenticated;

-- Tiere aus einer abgeschlossenen Split-Aktion haben upgrade_ready_at != null
-- (wenn auch in der Vergangenheit). start_tier_upgrade muss solche Tiere
-- akzeptieren, damit sie wieder fusioniert werden koennen.
create or replace function public.start_tier_upgrade(p_animal_ids uuid[], p_target_tier text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); td public.tier_defs%rowtype;
  species_key text; cnt int; new_id uuid; ready timestamptz;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into td from public.tier_defs where tier = p_target_tier;
  if not found or td.required_qty <= 0 then raise exception 'invalid target tier'; end if;
  p_animal_ids := coalesce(p_animal_ids, '{}');
  cnt := cardinality(p_animal_ids);
  if cnt <> td.required_qty then raise exception 'wrong number of animals (need %)', td.required_qty; end if;
  select count(distinct species) into cnt from public.animals
    where id = any(p_animal_ids) and owner_id = uid
      and equipped = false and tier = 'normal'
      and (upgrade_ready_at is null or upgrade_ready_at <= now());
  if cnt <> 1 then raise exception 'animals must be yours, unequipped, normal tier and same species'; end if;
  select species into species_key from public.animals where id = p_animal_ids[1];
  delete from public.animals where id = any(p_animal_ids) and owner_id = uid;
  ready := now() + make_interval(mins => td.upgrade_minutes);
  insert into public.animals(owner_id, species, equipped, tier, upgrade_ready_at)
    values (uid, species_key, false, p_target_tier, ready) returning id into new_id;
  return jsonb_build_object('id', new_id, 'ready_at', ready, 'tier', p_target_tier);
end $$;
grant execute on function public.start_tier_upgrade(uuid[], text) to authenticated;
