-- 20260924_futter_seltenheit.sql
-- Futter bekommt Seltenheit + Rotations-Chance (wie Tiere).
-- Spec: docs/superpowers/specs/2026-09-24-futter-seltenheit-design.md

alter table public.food_costs
  add column if not exists rarity text not null default 'common',
  add column if not exists shop_chance numeric not null default 1,
  add column if not exists enabled boolean not null default true;

alter table public.food_costs drop constraint if exists food_costs_rarity_check;
alter table public.food_costs add constraint food_costs_rarity_check
  check (rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary'));
alter table public.food_costs drop constraint if exists food_costs_shop_chance_check;
alter table public.food_costs add constraint food_costs_shop_chance_check
  check (shop_chance >= 0 and shop_chance <= 1);

update public.food_costs set rarity = 'common',    shop_chance = 0.85 where food in ('bread', 'kibble');
update public.food_costs set rarity = 'uncommon',  shop_chance = 0.60 where food in ('fish', 'steak');
update public.food_costs set rarity = 'rare',      shop_chance = 0.40 where food in ('magic_fruit', 'golden_treat');
update public.food_costs set rarity = 'epic',      shop_chance = 0.22 where food in ('bubble_tea', 'dragon_feast');
update public.food_costs set rarity = 'legendary', shop_chance = 0.10 where food in ('cosmic_cookie');

-- Deterministischer Wurf in [0, 1) pro Futter und Rotations-Slot.
create or replace function public._food_roll(p_food text, p_slot timestamptz)
returns numeric language sql immutable set search_path = public as $$
  select ((('x' || substr(md5('food:' || p_food || ':' || extract(epoch from p_slot)::bigint::text), 1, 8))::bit(32)::bigint) % 1000000) / 1000000.0
$$;

create or replace function public._available_foods(p_slot timestamptz)
returns text[] language plpgsql stable security definer set search_path = public as $$
declare
  v_foods text[];
begin
  select coalesce(array_agg(f.food order by f.cost), '{}') into v_foods
    from public.food_costs f
   where f.enabled and public._food_roll(f.food, p_slot) < f.shop_chance;
  if cardinality(v_foods) = 0 then
    select array[f.food] into v_foods
      from public.food_costs f
     where f.enabled
     order by f.cost
     limit 1;
  end if;
  return coalesce(v_foods, '{}');
end $$;

revoke execute on function public._food_roll(text, timestamptz) from anon, authenticated, public;
revoke execute on function public._available_foods(timestamptz) from anon, authenticated, public;

-- Füttern nur, wenn das Futter im aktuellen Slot im Angebot ist.
create or replace function public.feed_pet(p_food text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  f public.food_costs%rowtype;
  new_coins bigint;
  cur_until timestamptz;
  cur_mult numeric;
  new_until timestamptz;
  new_mult numeric;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into f from public.food_costs where food = p_food;
  if not found then raise exception 'unknown food'; end if;
  if not (p_food = any(public._available_foods(public._current_slot()))) then
    raise exception 'food not available';
  end if;

  update public.profiles
    set coins = coins - f.cost
    where id = uid and coins >= f.cost
    returning coins into new_coins;
  if new_coins is null then raise exception 'insufficient coins'; end if;

  insert into public.pets (owner_id) values (uid) on conflict (owner_id) do nothing;
  select boost_until, boost_multiplier into cur_until, cur_mult from public.pets where owner_id = uid;

  if cur_until > now() and cur_mult >= f.multiplier then
    new_until := cur_until + make_interval(mins => f.duration_min);
    new_mult  := cur_mult;
  else
    new_until := now() + make_interval(mins => f.duration_min);
    new_mult  := f.multiplier;
  end if;

  update public.pets
    set boost_multiplier = new_mult,
        boost_until      = new_until,
        last_fed_at      = now()
    where owner_id = uid;

  return jsonb_build_object(
    'coins', new_coins,
    'boost_multiplier', new_mult,
    'boost_until', new_until,
    'server_now', now()
  );
end $$;

revoke execute on function public.feed_pet(text) from anon, public;
grant execute on function public.feed_pet(text) to authenticated;

-- get_shop: zusätzlich food_available (Rest unverändert).
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
  select coalesce(jsonb_object_agg(species, jsonb_build_object(
    'craft_only',    coalesce(craft_only, false),
    'disappears_at', disappears_at,
    'rarity',        rarity
  )), '{}') into species_meta
  from public.species_costs;
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
    'stock',          merged,
    'forced_stock',   state.forced_stock,
    'my_purchases',   coalesce(mine, '{}'),
    'species_meta',   species_meta,
    'egg_stock',      v_egg_stock,
    'egg_meta',       v_egg_meta,
    'food_available', to_jsonb(public._available_foods(state.updated_at)),
    'slot_start',     state.updated_at,
    'rotates_at',     state.rotates_at,
    'server_now',     now()
  );
end $$;
