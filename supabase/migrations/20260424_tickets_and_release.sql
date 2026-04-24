-- =============================================================================
-- Tickets, Release-System und Ticket-Shop (2026-04-24)
-- =============================================================================

-- 1) Tickets-Spalte
alter table public.profiles
  add column if not exists tickets bigint not null default 0
    check (tickets >= 0);

-- 2) Ticket-Config (Singleton id=1)
create table if not exists public.ticket_config (
  id int primary key check (id = 1),
  chest_price bigint not null default 50000 check (chest_price > 0),
  chest_slot_limit int not null default 5 check (chest_slot_limit > 0),
  release_divisor int not null default 2 check (release_divisor > 0),
  buy_divisor int not null default 2 check (buy_divisor > 0)
);

insert into public.ticket_config(id) values (1) on conflict do nothing;

alter table public.ticket_config enable row level security;

drop policy if exists "ticket_config read" on public.ticket_config;
create policy "ticket_config read" on public.ticket_config for select using (true);

-- 3) Ticket-Shop-State (Singleton id=1) — 3 zufällige Spezies, rotiert alle 5 min
create table if not exists public.ticket_shop_state (
  id int primary key check (id = 1),
  rotates_at timestamptz not null default (now() + interval '5 minutes'),
  updated_at timestamptz not null default 'epoch',
  random_species jsonb not null default '[]'
);

insert into public.ticket_shop_state(id) values (1) on conflict do nothing;

alter table public.ticket_shop_state enable row level security;

drop policy if exists "ticket_shop_state read" on public.ticket_shop_state;
create policy "ticket_shop_state read" on public.ticket_shop_state for select using (true);

-- 4) Ticket-Shop-Käufe (max 1 pro Spezies pro Rotation)
create table if not exists public.ticket_shop_purchases (
  user_id uuid not null references auth.users on delete cascade,
  slot_start timestamptz not null,
  species text not null,
  primary key (user_id, slot_start, species)
);

alter table public.ticket_shop_purchases enable row level security;

drop policy if exists "ticket_shop_purchases self read" on public.ticket_shop_purchases;
create policy "ticket_shop_purchases self read" on public.ticket_shop_purchases for select
  using ((select auth.uid()) = user_id);

-- 5) Ticket-Truhen-Käufe (5x pro Rotation)
create table if not exists public.ticket_chest_purchases (
  user_id uuid not null references auth.users on delete cascade,
  slot_start timestamptz not null,
  count int not null default 0,
  primary key (user_id, slot_start)
);

alter table public.ticket_chest_purchases enable row level security;

drop policy if exists "ticket_chest_purchases self read" on public.ticket_chest_purchases;
create policy "ticket_chest_purchases self read" on public.ticket_chest_purchases for select
  using ((select auth.uid()) = user_id);

-- 6) Ticket-Shop Rotation helper
create or replace function public._ticket_rotate_if_needed()
returns public.ticket_shop_state language plpgsql security definer set search_path = public as $$
declare
  slot      timestamptz := public._current_slot();
  next_slot timestamptz := slot + interval '5 minutes';
  state     public.ticket_shop_state;
  new_rand  jsonb;
begin
  select * into state from public.ticket_shop_state where id = 1 for update;
  if state.updated_at < slot then
    select coalesce(jsonb_agg(species), '[]'::jsonb) into new_rand
    from (
      select sc.species
      from public.species_costs sc
      where sc.enabled and sc.weight > 0
      order by power(
        greatest(
          (abs(('x' || substr(md5(sc.species || 'ticket' || extract(epoch from slot)::text), 1, 8))::bit(32)::int) % 1000000 + 1) / 1000001.0,
          1e-9
        ),
        1.0 / sc.weight
      ) desc
      limit 3
    ) s;
    update public.ticket_shop_state
      set random_species = new_rand,
          rotates_at     = next_slot,
          updated_at     = slot
      where id = 1
      returning * into state;
  end if;
  return state;
end $$;

-- 7) get_ticket_shop
create or replace function public.get_ticket_shop()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.ticket_config;
  state public.ticket_shop_state;
  tickets_bal bigint := 0;
  chest_bought int := 0;
  my_purchases jsonb := '[]'::jsonb;
begin
  select * into cfg from public.ticket_config where id = 1;
  state := public._ticket_rotate_if_needed();
  if uid is not null then
    select tickets into tickets_bal from public.profiles where id = uid;
    select count into chest_bought from public.ticket_chest_purchases
      where user_id = uid and slot_start = state.updated_at;
    select coalesce(jsonb_agg(species), '[]'::jsonb) into my_purchases
      from public.ticket_shop_purchases
      where user_id = uid and slot_start = state.updated_at;
  end if;
  return jsonb_build_object(
    'tickets',          coalesce(tickets_bal, 0),
    'species',          state.random_species,
    'my_purchases',     coalesce(my_purchases, '[]'::jsonb),
    'slot_start',       state.updated_at,
    'rotates_at',       state.rotates_at,
    'server_now',       now(),
    'chest_price',      cfg.chest_price,
    'chest_slot_limit', cfg.chest_slot_limit,
    'chest_bought',     coalesce(chest_bought, 0),
    'buy_divisor',      cfg.buy_divisor,
    'release_divisor',  cfg.release_divisor
  );
end $$;
grant execute on function public.get_ticket_shop() to anon, authenticated;

-- 8) release_animal — entfernt Tier, gibt Tickets (species.cost / release_divisor)
create or replace function public.release_animal(p_animal_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  a public.animals%rowtype;
  cfg public.ticket_config;
  sc public.species_costs%rowtype;
  gained bigint;
  new_tickets bigint;
  cur_fav uuid;
  next_fav uuid;
  tier_mul numeric;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into cfg from public.ticket_config where id = 1;
  if cfg is null then raise exception 'ticket config missing'; end if;
  select * into a from public.animals where id = p_animal_id and owner_id = uid for update;
  if a.id is null then raise exception 'animal not found'; end if;
  if a.upgrade_ready_at is not null and a.upgrade_ready_at > now() then
    raise exception 'animal is upgrading';
  end if;
  select * into sc from public.species_costs where species = a.species;
  if sc.species is null then raise exception 'unknown species'; end if;
  -- Tier-Multiplikator (Gold/Diamond/Epic/Rainbow sind mehr Tickets wert)
  select coalesce(multiplier, 1) into tier_mul from public.tier_defs where tier = coalesce(a.tier, 'normal');
  gained := floor(sc.cost * coalesce(tier_mul, 1) / cfg.release_divisor)::bigint;
  if gained < 1 then gained := 1; end if;

  -- Favorit ggf. umsetzen
  select favorite_animal_id into cur_fav from public.profiles where id = uid;
  if cur_fav = a.id then
    select id into next_fav from public.animals
      where owner_id = uid and id <> a.id
      order by equipped desc, acquired_at asc limit 1;
    update public.profiles set favorite_animal_id = next_fav where id = uid;
  end if;

  delete from public.animals where id = a.id;
  update public.profiles set tickets = tickets + gained
    where id = uid returning tickets into new_tickets;

  return jsonb_build_object(
    'tickets', new_tickets,
    'gained',  gained,
    'species', a.species,
    'tier',    coalesce(a.tier, 'normal')
  );
end $$;
grant execute on function public.release_animal(uuid) to authenticated;

-- 9) ticket_shop_buy — 1x pro Spezies pro Rotation
create or replace function public.ticket_shop_buy(p_species text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.ticket_config;
  state public.ticket_shop_state;
  sc public.species_costs%rowtype;
  cost bigint;
  new_tickets bigint;
  slots int; equipped_cnt int; auto_equip boolean; current_fav uuid;
  new_animal public.animals%rowtype;
  available boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into cfg from public.ticket_config where id = 1;
  state := public._ticket_rotate_if_needed();
  select exists(
    select 1 from jsonb_array_elements_text(state.random_species) as v(species)
      where v.species = p_species
  ) into available;
  if not available then raise exception 'species not in ticket shop'; end if;
  select * into sc from public.species_costs where species = p_species and enabled;
  if sc.species is null then raise exception 'unknown species'; end if;
  cost := greatest(floor(sc.cost / cfg.buy_divisor)::bigint, 1);
  if exists(select 1 from public.ticket_shop_purchases
    where user_id = uid and slot_start = state.updated_at and species = p_species) then
    raise exception 'already bought this rotation';
  end if;
  update public.profiles set tickets = tickets - cost
    where id = uid and tickets >= cost returning tickets into new_tickets;
  if new_tickets is null then raise exception 'insufficient tickets'; end if;
  insert into public.ticket_shop_purchases(user_id, slot_start, species)
    values (uid, state.updated_at, p_species);
  select equip_slots, favorite_animal_id into slots, current_fav from public.profiles where id = uid;
  select count(*) into equipped_cnt from public.animals where owner_id = uid and equipped = true;
  auto_equip := equipped_cnt < slots;
  insert into public.animals(owner_id, species, equipped) values (uid, p_species, auto_equip)
    returning * into new_animal;
  if current_fav is null then
    update public.profiles set favorite_animal_id = new_animal.id where id = uid;
  end if;
  return jsonb_build_object(
    'tickets', new_tickets,
    'cost',    cost,
    'animal',  to_jsonb(new_animal)
  );
end $$;
grant execute on function public.ticket_shop_buy(text) to authenticated;

-- 10) ticket_chest_open — 5x pro Rotation, fester Ticket-Preis, zufällige Spezies (gewichtet)
create or replace function public.ticket_chest_open(p_qty int default 1)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.ticket_config;
  state public.ticket_shop_state;
  bought_slot int; total_cost bigint; new_tickets bigint;
  w_total int; r int; acc int; rec record;
  picked_species text; new_ids uuid[] := '{}'; new_species text[] := '{}';
  i int; new_animal public.animals%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_qty is null or p_qty < 1 or p_qty > 3 then raise exception 'qty must be 1, 2 or 3'; end if;
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
    r := 1 + floor(random() * w_total)::int;
    acc := 0; picked_species := null;
    for rec in select species, weight from public.species_costs where enabled and weight > 0 order by species loop
      acc := acc + rec.weight;
      if r <= acc then picked_species := rec.species; exit; end if;
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
