-- Zucht-Ereignis: zwei eigene Tiere ergeben ein Ei mit vorbestimmtem Ergebnis.
--
-- Setzt auf dem vorhandenen Eier-System auf, statt ein zweites danebenzustellen:
-- Die Zucht legt ein player_eggs mit bred_species an, start_incubation
-- übernimmt den Wert, statt zu würfeln, und claim_hatched bleibt unverändert.
-- Damit gibt es genau eine Stelle, an der gewürfelt wird, und niemand kann das
-- Ergebnis durch wiederholtes Einlegen neu ziehen.
--
-- Achtung Reward-Spiegel: _breed_power, _breed_cost, _breed_minutes und die
-- Gewichtstabelle leben doppelt, hier und in src/breeding.js.
-- src/breedingSql.test.js vergleicht beide Seiten.

-- 1) Schema
alter table public.player_eggs
  add column if not exists bred_species text references public.species_costs(species),
  add column if not exists bred_minutes int;

alter table public.animals
  add column if not exists breeding_until timestamptz;

create index if not exists animals_breeding_idx
  on public.animals(owner_id) where breeding_until is not null;

insert into public.egg_types
  (egg_type, name, emoji, price_coins, enabled, shop_visible, shop_weight, shop_stock_qty, incubation_minutes)
values
  ('breeding', 'Zucht-Ei', '🐣', 0, true, false, 0, 0, 60)
on conflict (egg_type) do update
  set name = excluded.name,
      emoji = excluded.emoji,
      shop_visible = false,
      shop_weight = 0,
      shop_stock_qty = 0;

insert into public.event_schedule (key, starts_at, ends_at, enabled)
values ('breeding_game', null, null, true)
on conflict (key) do nothing;

-- 2) Formeln (Spiegel zu src/breeding.js)
create or replace function public._breed_power(p_species text, p_tier text)
returns numeric language sql stable set search_path = public as $$
  select coalesce(
    (select case sc.rarity
              when 'uncommon'  then 1
              when 'rare'      then 2
              when 'epic'      then 3
              when 'legendary' then 4
              else 0 end
       from public.species_costs sc where sc.species = p_species), 0)
  + case coalesce(p_tier, 'normal')
      when 'gold'    then 0.5
      when 'diamond' then 1
      when 'epic'    then 1.5
      when 'rainbow' then 2
      else 0 end;
$$;

create or replace function public._breed_cost(p_power numeric)
returns bigint language sql immutable set search_path = public as $$
  select floor(50000000 * (least(12, greatest(0, p_power)) + 1) ^ 2)::bigint;
$$;

create or replace function public._breed_minutes(p_power numeric)
returns int language sql immutable set search_path = public as $$
  select round(30 + least(12, greatest(0, p_power)) * 15)::int;
$$;

-- Gewichte je Stufe: Zeile summiert immer auf 100, also direkt Prozent.
create or replace function public._breed_weights(p_power numeric)
returns int[] language sql immutable set search_path = public as $$
  select case
    when floor(least(12, greatest(0, p_power))) <= 2  then array[82, 16,  2,  0, 0]
    when floor(least(12, greatest(0, p_power))) <= 5  then array[56, 30, 12,  2, 0]
    when floor(least(12, greatest(0, p_power))) <= 8  then array[32, 33, 26,  8, 1]
    when floor(least(12, greatest(0, p_power))) <= 10 then array[14, 26, 36, 22, 2]
    else array[5, 15, 33, 44, 3]
  end;
$$;

-- Die acht Arten, die es aus keiner anderen Quelle gibt, nach Stufe.
create or replace function public._breed_tier_species(p_tier int)
returns text[] language sql immutable set search_path = public as $$
  select case p_tier
    when 1 then array['flamingo', 'scorpion']
    when 2 then array['owl']
    when 3 then array['bear', 'unicorn']
    when 4 then array['phoenix', 'kraken']
    when 5 then array['worldturtle']
    else array[]::text[]
  end;
$$;

create or replace function public._breed_roll(p_power numeric)
returns text language plpgsql volatile set search_path = public as $$
declare
  w int[] := public._breed_weights(p_power);
  roll int := 1 + floor(random() * 100)::int;
  acc int := 0;
  i int;
  arten text[];
begin
  for i in 1..5 loop
    acc := acc + w[i];
    if roll <= acc then
      arten := public._breed_tier_species(i);
      if array_length(arten, 1) is null then continue; end if;
      return arten[1 + floor(random() * array_length(arten, 1))::int];
    end if;
  end loop;
  -- Sollte die Summe je unter 100 rutschen: auf die unterste Stufe zurückfallen.
  return (public._breed_tier_species(1))[1];
end $$;

-- 3) Verpaaren
create or replace function public.breed_animals(p_a uuid, p_b uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  a public.animals;
  b public.animals;
  v_power numeric;
  v_cost bigint;
  v_minutes int;
  v_species text;
  v_egg_id uuid;
  v_coins bigint;
  v_ready timestamptz;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not public.event_is_active('breeding_game') then raise exception 'event ended'; end if;
  if p_a is null or p_b is null or p_a = p_b then raise exception 'need two different animals'; end if;

  select * into a from public.animals where id = p_a for update;
  select * into b from public.animals where id = p_b for update;
  if a is null or b is null or a.owner_id <> uid or b.owner_id <> uid then
    raise exception 'animal not found';
  end if;
  if coalesce(a.breeding_until, 'epoch'::timestamptz) > now()
     or coalesce(b.breeding_until, 'epoch'::timestamptz) > now() then
    raise exception 'animal still breeding';
  end if;
  if a.upgrade_ready_at is not null and a.upgrade_ready_at > now() then
    raise exception 'animal is upgrading';
  end if;
  if b.upgrade_ready_at is not null and b.upgrade_ready_at > now() then
    raise exception 'animal is upgrading';
  end if;

  v_power := least(12, public._breed_power(a.species, a.tier) + public._breed_power(b.species, b.tier));
  v_cost := public._breed_cost(v_power);
  v_minutes := public._breed_minutes(v_power);
  v_species := public._breed_roll(v_power);
  v_ready := now() + (v_minutes || ' minutes')::interval;

  update public.profiles set coins = coins - v_cost
   where id = uid and coins >= v_cost
   returning coins into v_coins;
  if v_coins is null then raise exception 'insufficient coins'; end if;

  insert into public.player_eggs(owner_id, egg_type, bred_species, bred_minutes)
  values (uid, 'breeding', v_species, v_minutes)
  returning id into v_egg_id;

  update public.animals set breeding_until = v_ready where id in (p_a, p_b);

  return jsonb_build_object(
    'egg_id', v_egg_id,
    'power', v_power,
    'cost', v_cost,
    'incubation_minutes', v_minutes,
    'breeding_until', v_ready,
    'coins', v_coins,
    'server_now', now()
  );
end $$;

-- 4) Status für die Oberfläche: Zuchtkraft und Abklingzeit je eigenem Tier.
create or replace function public.get_breeding_status()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_animals jsonb;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', x.id,
           'species', x.species,
           'tier', x.tier,
           'power', public._breed_power(x.species, x.tier),
           'breeding_until', x.breeding_until,
           'busy', coalesce(x.breeding_until, 'epoch'::timestamptz) > now()
         ) order by public._breed_power(x.species, x.tier) desc, x.species), '[]'::jsonb)
    into v_animals
    from public.animals x
   where x.owner_id = uid
     and (x.upgrade_ready_at is null or x.upgrade_ready_at <= now());

  return jsonb_build_object(
    'animals', v_animals,
    'event_active', public.event_is_active('breeding_game'),
    'server_now', now()
  );
end $$;

-- 5) start_incubation ehrt das vorbestimmte Ergebnis eines Zucht-Eis.
create or replace function public.start_incubation(p_egg_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  egg public.player_eggs;
  et public.egg_types;
  w_total int; r int; acc int; rec record;
  picked_species text;
  minutes int;
  ready_ts timestamptz;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select * into egg from public.player_eggs where id = p_egg_id for update;
  if egg is null or egg.owner_id <> uid then raise exception 'egg not found'; end if;

  if exists (select 1 from public.trade_eggs te
             join public.trades t on t.id = te.trade_id
             where te.egg_id = p_egg_id and t.status = 'pending') then
    raise exception 'egg is in an open trade';
  end if;

  if exists (select 1 from public.egg_incubations where user_id = uid) then
    raise exception 'incubator slot is busy';
  end if;

  select * into et from public.egg_types where egg_type = egg.egg_type;
  if et is null then raise exception 'unknown egg type'; end if;

  minutes := coalesce(egg.bred_minutes, et.incubation_minutes);

  if egg.bred_species is not null then
    -- Zucht-Ei: Das Ergebnis stand schon beim Verpaaren fest.
    picked_species := egg.bred_species;
  else
    select coalesce(sum(weight), 0) into w_total
      from public.egg_drop_pool where egg_type = egg.egg_type;
    if w_total <= 0 then raise exception 'no drop pool for egg'; end if;

    r := 1 + floor(random() * w_total)::int;
    acc := 0; picked_species := null;
    for rec in select species, weight from public.egg_drop_pool
               where egg_type = egg.egg_type order by species loop
      acc := acc + rec.weight;
      if r <= acc then picked_species := rec.species; exit; end if;
    end loop;
    if picked_species is null then
      select species into picked_species from public.egg_drop_pool
        where egg_type = egg.egg_type order by species limit 1;
    end if;
  end if;

  ready_ts := now() + (minutes || ' minutes')::interval;

  delete from public.player_eggs where id = p_egg_id;
  insert into public.egg_incubations(user_id, egg_type, started_at, ready_at, hatched_species)
    values (uid, egg.egg_type, now(), ready_ts, picked_species);

  return jsonb_build_object(
    'egg_type', egg.egg_type,
    'ready_at', ready_ts,
    'incubation_minutes', minutes
  );
end $$;

-- 6) Grants. Helfer bleiben intern, damit die Gewichtstabelle kein Orakel wird.
grant execute on function public.breed_animals(uuid, uuid) to authenticated;
grant execute on function public.get_breeding_status() to authenticated;
grant execute on function public.start_incubation(uuid) to authenticated;
revoke execute on function public.breed_animals(uuid, uuid) from anon, public;
revoke execute on function public.get_breeding_status() from anon, public;
revoke execute on function public._breed_power(text, text) from anon, authenticated, public;
revoke execute on function public._breed_cost(numeric) from anon, authenticated, public;
revoke execute on function public._breed_minutes(numeric) from anon, authenticated, public;
revoke execute on function public._breed_weights(numeric) from anon, authenticated, public;
revoke execute on function public._breed_tier_species(int) from anon, authenticated, public;
revoke execute on function public._breed_roll(numeric) from anon, authenticated, public;
