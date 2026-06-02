-- 20260603_03_egg_rpcs.sql
-- Supporting tables for egg shop rotation + RPCs:
--   buy_egg, start_incubation, get_incubation_status, claim_hatched.

create table if not exists public.shop_egg_stock (
  egg_type   text not null references public.egg_types(egg_type) on delete cascade,
  slot_start timestamptz not null,
  qty        int not null default 0,
  primary key (egg_type, slot_start)
);

create table if not exists public.shop_forced_eggs (
  id         uuid primary key default gen_random_uuid(),
  egg_type   text not null references public.egg_types(egg_type) on delete cascade,
  slot_start timestamptz not null,
  qty        int not null
);
create index if not exists shop_forced_eggs_slot_idx on public.shop_forced_eggs(slot_start);

create table if not exists public.egg_purchases (
  user_id    uuid not null references auth.users on delete cascade,
  egg_type   text not null references public.egg_types(egg_type) on delete cascade,
  slot_start timestamptz not null,
  count      int not null default 0,
  primary key (user_id, egg_type, slot_start)
);

alter table public.shop_egg_stock    enable row level security;
alter table public.shop_forced_eggs  enable row level security;
alter table public.egg_purchases     enable row level security;

drop policy if exists "read shop_egg_stock" on public.shop_egg_stock;
drop policy if exists "own egg_purchases"   on public.egg_purchases;

create policy "read shop_egg_stock" on public.shop_egg_stock
  for select to authenticated using (true);
create policy "own egg_purchases"   on public.egg_purchases
  for select to authenticated using (user_id = auth.uid());

-- ============================================================================
-- buy_egg: purchase 1..5 eggs of a given type. Reuses rotation slot stock.
-- ============================================================================
create or replace function public.buy_egg(p_egg_type text, p_qty int default 1)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  et public.egg_types;
  state public.shop_state;
  total_cost bigint;
  balance bigint;
  stock_qty int := 0;
  forced_qty int := 0;
  bought_qty int := 0;
  available int;
  new_id uuid;
  ids uuid[] := '{}';
  i int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_qty is null or p_qty < 1 or p_qty > 5 then raise exception 'qty must be 1..5'; end if;

  select * into et from public.egg_types where egg_type = p_egg_type;
  if et is null or not et.enabled or not et.shop_visible then
    raise exception 'egg type not available';
  end if;

  state := public._rotate_if_needed();

  select coalesce(qty, 0) into stock_qty
    from public.shop_egg_stock
   where egg_type = p_egg_type and slot_start = state.updated_at;

  select coalesce(sum(qty), 0) into forced_qty
    from public.shop_forced_eggs
   where egg_type = p_egg_type and slot_start = state.updated_at;

  select coalesce(count, 0) into bought_qty
    from public.egg_purchases
   where user_id = uid and egg_type = p_egg_type and slot_start = state.updated_at;

  available := (stock_qty + forced_qty) - bought_qty;
  if available < p_qty then
    raise exception 'egg out of stock (available % requested %)', available, p_qty;
  end if;

  total_cost := et.price_coins * p_qty;
  update public.profiles set coins = coins - total_cost
    where id = uid and coins >= total_cost returning coins into balance;
  if balance is null then raise exception 'insufficient coins'; end if;

  insert into public.egg_purchases(user_id, egg_type, slot_start, count)
    values (uid, p_egg_type, state.updated_at, p_qty)
    on conflict (user_id, egg_type, slot_start)
    do update set count = public.egg_purchases.count + p_qty;

  for i in 1..p_qty loop
    insert into public.player_eggs(owner_id, egg_type)
      values (uid, p_egg_type) returning id into new_id;
    ids := ids || new_id;
  end loop;

  return jsonb_build_object('coins', balance, 'egg_ids', to_jsonb(ids));
end $$;

-- ============================================================================
-- start_incubation: take one egg from inventory, roll species, begin 1h timer
-- ============================================================================
create or replace function public.start_incubation(p_egg_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  egg public.player_eggs;
  et public.egg_types;
  w_total int; r int; acc int; rec record;
  picked_species text;
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

  ready_ts := now() + (et.incubation_minutes || ' minutes')::interval;

  delete from public.player_eggs where id = p_egg_id;
  insert into public.egg_incubations(user_id, egg_type, started_at, ready_at, hatched_species)
    values (uid, egg.egg_type, now(), ready_ts, picked_species);

  return jsonb_build_object(
    'egg_type', egg.egg_type,
    'ready_at', ready_ts,
    'incubation_minutes', et.incubation_minutes
  );
end $$;

-- ============================================================================
-- get_incubation_status: lightweight status query for UI
-- ============================================================================
create or replace function public.get_incubation_status()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  inc public.egg_incubations;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into inc from public.egg_incubations where user_id = uid;
  if inc is null then
    return jsonb_build_object('active', false);
  end if;
  return jsonb_build_object(
    'active', true,
    'egg_type', inc.egg_type,
    'started_at', inc.started_at,
    'ready_at', inc.ready_at,
    'ready_now', (now() >= inc.ready_at)
  );
end $$;

-- ============================================================================
-- claim_hatched: finalize incubation, add animal to inventory
-- ============================================================================
create or replace function public.claim_hatched()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  inc public.egg_incubations;
  new_animal public.animals%rowtype;
  r text;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select * into inc from public.egg_incubations where user_id = uid for update;
  if inc is null then raise exception 'no active incubation'; end if;
  if now() < inc.ready_at then raise exception 'not ready yet'; end if;

  insert into public.animals(owner_id, species, tier)
    values (uid, inc.hatched_species, 'normal')
    returning * into new_animal;

  delete from public.egg_incubations where user_id = uid;

  select rarity into r from public.species_costs where species = inc.hatched_species;
  return jsonb_build_object(
    'species', inc.hatched_species,
    'animal_id', new_animal.id,
    'rarity', coalesce(r, 'common')
  );
end $$;
