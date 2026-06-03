-- 20260603_04_get_shop_with_eggs.sql
-- Extends shop rotation to include eggs:
--   _ensure_egg_stock(slot) seeds shop_egg_stock per rotation.
--   get_shop returns egg_stock + egg_meta + rarity in species_meta.

create or replace function public._ensure_egg_stock(p_slot_start timestamptz)
returns void language plpgsql security definer set search_path = public as $$
declare
  e record;
begin
  -- Only seed once per slot
  if exists (select 1 from public.shop_egg_stock where slot_start = p_slot_start) then
    return;
  end if;

  -- Each egg type has shop_weight / (shop_weight + 100) chance per slot.
  for e in select egg_type, shop_weight, shop_stock_qty
             from public.egg_types
            where enabled and shop_visible and shop_weight > 0 loop
    if random() < (e.shop_weight::numeric / (e.shop_weight + 100)) then
      insert into public.shop_egg_stock(egg_type, slot_start, qty)
        values (e.egg_type, p_slot_start, e.shop_stock_qty);
    else
      insert into public.shop_egg_stock(egg_type, slot_start, qty)
        values (e.egg_type, p_slot_start, 0);
    end if;
  end loop;
end $$;

create or replace function public.get_shop()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  state public.shop_state;
  uid uuid := auth.uid();
  merged jsonb; mine jsonb; species_meta jsonb;
  v_egg_stock jsonb := '{}'::jsonb;
  v_egg_meta jsonb := '{}'::jsonb;
  e record;
  remaining int;
  drops jsonb;
begin
  state := public._rotate_if_needed();
  perform public._ensure_egg_stock(state.updated_at);

  -- Existing species stock (random + forced merged)
  with combined as (
    select key as species, sum(value::int) as qty
      from (
        select key, value from jsonb_each_text(state.random_stock)
        union all
        select key, value from jsonb_each_text(state.forced_stock)
      ) t
     group by key having sum(value::int) > 0
  )
  select coalesce(jsonb_object_agg(species, qty), '{}') into merged from combined;

  if uid is not null then
    select coalesce(jsonb_object_agg(species, qty), '{}') into mine
      from public.shop_purchases
     where user_id = uid and slot_start = state.updated_at;
  else
    mine := '{}';
  end if;

  -- Species meta now also includes rarity
  select coalesce(jsonb_object_agg(species, jsonb_build_object(
    'craft_only',    coalesce(craft_only, false),
    'disappears_at', disappears_at,
    'rarity',        rarity
  )), '{}') into species_meta
  from public.species_costs;

  -- Egg stock + meta
  for e in
    select et.egg_type, et.name, et.emoji, et.price_coins,
           et.incubation_minutes, et.shop_stock_qty,
           coalesce(ses.qty, 0) as stock_qty,
           coalesce(sfe.forced_qty, 0) as forced_qty,
           coalesce(ep.bought, 0) as bought
      from public.egg_types et
      left join public.shop_egg_stock ses
        on ses.egg_type = et.egg_type and ses.slot_start = state.updated_at
      left join lateral (
        select sum(qty) as forced_qty from public.shop_forced_eggs
         where egg_type = et.egg_type and slot_start = state.updated_at
      ) sfe on true
      left join lateral (
        select count as bought from public.egg_purchases
         where egg_type = et.egg_type and slot_start = state.updated_at
           and user_id = uid
      ) ep on true
     where et.enabled and et.shop_visible
  loop
    remaining := greatest(0, (e.stock_qty + e.forced_qty) - e.bought);

    select coalesce(jsonb_agg(jsonb_build_object(
      'species', dp.species,
      'weight',  dp.weight,
      'rarity',  sc.rarity,
      'emoji',   sc.emoji,
      'name',    sc.name
    ) order by dp.weight desc), '[]'::jsonb)
    into drops
    from public.egg_drop_pool dp
    join public.species_costs sc on sc.species = dp.species
    where dp.egg_type = e.egg_type;

    v_egg_stock := v_egg_stock || jsonb_build_object(e.egg_type, remaining);
    v_egg_meta  := v_egg_meta  || jsonb_build_object(e.egg_type, jsonb_build_object(
      'name',               e.name,
      'emoji',              e.emoji,
      'price',              e.price_coins,
      'incubation_minutes', e.incubation_minutes,
      'stock_qty',          e.shop_stock_qty,
      'bought_qty',         e.bought,
      'drops',              drops
    ));
  end loop;

  return jsonb_build_object(
    'stock',        merged,
    'forced_stock', state.forced_stock,
    'my_purchases', coalesce(mine, '{}'),
    'species_meta', species_meta,
    'egg_stock',    v_egg_stock,
    'egg_meta',     v_egg_meta,
    'slot_start',   state.updated_at,
    'rotates_at',   state.rotates_at,
    'server_now',   now()
  );
end $$;
