-- Wochenend-Bonus, Truhenlimits, Zucht-Ei im Shop, Halloween-Code.
-- Spec: docs/superpowers/specs/2026-10-14-wochenend-bonus-und-truhenlimits-design.md

-- ---------------------------------------------------------------------------
-- 1) Truhenlimits pro 5-Min-Rotation: normal 5, Ticket 10
-- ---------------------------------------------------------------------------

update public.chest_config set daily_limit = 5 where id = 1;
update public.ticket_config set chest_slot_limit = 10 where id = 1;

-- ---------------------------------------------------------------------------
-- 2) Promo-Code HALLOWEEN: 3 Fledermäuse, 1× pro Spieler, bis Saisonende
-- ---------------------------------------------------------------------------

insert into public.promo_codes(code, rewards, max_uses_per_user, expires_at, note)
select 'HALLOWEEN',
       '{"species": "bat", "tier": "normal", "qty": 3, "note": "Halloween-Fledermäuse 🦇"}'::jsonb,
       1,
       '2026-11-09 00:00:00+01'::timestamptz,
       'Halloween 2026: 3 Fledermäuse'
 where not exists (select 1 from public.promo_codes where lower(code) = 'halloween');

-- ---------------------------------------------------------------------------
-- 3) Zucht-Ei im Shop wie das Safari-Ei.
--    Spiegel: SHOP_EGG_POWER = 3 in src/breeding.js
--    (Preis breedCost(3), Brutzeit breedMinutes(3), Pool breedWeights(3)).
--    Selbst verpaarte Eier tragen bred_species/bred_minutes und sind davon
--    nicht betroffen.
-- ---------------------------------------------------------------------------

insert into public.egg_drop_pool (egg_type, species, weight) values
  ('breeding', 'hedgehog', 67),
  ('breeding', 'leopard',  28),
  ('breeding', 'gorilla',   5)
on conflict (egg_type, species) do update set weight = excluded.weight;

update public.egg_types
   set price_coins        = 800000000,
       incubation_minutes = 75,
       shop_visible       = true,
       shop_weight        = 30,
       shop_stock_qty     = 1
 where egg_type = 'breeding';

-- ---------------------------------------------------------------------------
-- 4) Wochenend-Bonus: Sa + So (Europe/Berlin) seltene Tiere ×2,
--    Küken/Huhn/Hase ×0,5. Spiegel: src/weekendBoost.js
-- ---------------------------------------------------------------------------

create or replace function public._weekend_boost_active(p_ts timestamptz default now())
returns boolean
language sql
stable
set search_path = public
as $$
  select extract(isodow from p_ts at time zone 'Europe/Berlin') in (6, 7)
$$;

create or replace function public._weekend_factor(p_species text, p_rarity text)
returns numeric
language sql
immutable
set search_path = public
as $$
  select case
    when p_species in ('chick', 'chicken', 'rabbit') then 0.5
    when p_rarity in ('rare', 'epic', 'legendary') then 2
    else 1
  end::numeric
$$;

create or replace function public._weekend_weight(
  p_species text, p_rarity text, p_weight numeric, p_ts timestamptz default now()
)
returns numeric
language sql
stable
set search_path = public
as $$
  select case
    when public._weekend_boost_active(p_ts)
      then p_weight * public._weekend_factor(p_species, p_rarity)
    else p_weight
  end
$$;

revoke execute on function public._weekend_boost_active(timestamptz) from anon, authenticated, public;
revoke execute on function public._weekend_factor(text, text) from anon, authenticated, public;
revoke execute on function public._weekend_weight(text, text, numeric, timestamptz) from anon, authenticated, public;

-- 4a) Normale Truhe
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
  select coalesce(sum(public._weekend_weight(species, rarity, weight)), 0) into w_total
    from public.species_costs where enabled and weight > 0;
  if w_total <= 0 then raise exception 'no species available'; end if;
  for i in 1..p_qty loop
    r := random() * w_total;
    acc := 0; picked_species := null;
    for rec in select species, public._weekend_weight(species, rarity, weight) as weight
                 from public.species_costs where enabled and weight > 0 order by species loop
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
    'price', cfg.price, 'slot_start', state.updated_at,
    'weekend_boost', public._weekend_boost_active()
  );
end $$;
grant execute on function public.buy_chest(int) to authenticated;

-- 4b) Ticket-Truhe
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
  select coalesce(sum(public._weekend_weight(species, rarity, weight)), 0) into w_total
    from public.species_costs where enabled and weight > 0;
  if w_total <= 0 then raise exception 'no species available'; end if;
  for i in 1..p_qty loop
    r := random() * w_total;
    acc := 0; picked_species := null;
    for rec in select species, public._weekend_weight(species, rarity, weight) as weight
                 from public.species_costs where enabled and weight > 0 order by species loop
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
    'tickets',       new_tickets,
    'qty',           p_qty,
    'species',       to_jsonb(new_species),
    'animal_ids',    to_jsonb(new_ids),
    'bought_slot',   bought_slot + p_qty,
    'slot_limit',    cfg.chest_slot_limit,
    'price',         cfg.chest_price,
    'slot_start',    state.updated_at,
    'weekend_boost', public._weekend_boost_active()
  );
end $$;
grant execute on function public.ticket_chest_open(int) to authenticated;

-- 4c) Shop-Rotation (Ziehung nach Rotationsbeginn, nicht nach Aufrufzeit)
create or replace function public._rotate_if_needed()
returns public.shop_state
language plpgsql
security definer
set search_path = public
as $$
declare
  slot      timestamptz := public._current_slot();
  next_slot timestamptz := slot + interval '5 minutes';
  state     public.shop_state;
  new_rand  jsonb;
begin
  select * into state from public.shop_state where id = 1 for update;
  if state.updated_at < slot then
    select coalesce(jsonb_object_agg(species, 1), '{}'::jsonb) into new_rand
    from (
      select sc.species
        from public.species_costs sc
       where sc.enabled and sc.weight > 0
       order by power(
         greatest(
           (abs(('x' || substr(md5(sc.species || extract(epoch from slot)::text), 1, 8))::bit(32)::int) % 1000000 + 1) / 1000001.0,
           1e-9
         ),
         1.0 / public._weekend_weight(sc.species, sc.rarity, sc.weight, slot)
       ) desc
       limit 5
    ) s;
    update public.shop_state
       set random_stock = new_rand,
           forced_stock = '{}'::jsonb,
           rotates_at   = next_slot,
           updated_at   = slot
     where id = 1
     returning * into state;
  end if;
  return state;
end $$;

-- 4d) Ticket-Shop-Rotation
create or replace function public._ticket_rotate_if_needed()
returns public.ticket_shop_state
language plpgsql
security definer
set search_path = public
as $$
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
        1.0 / public._weekend_weight(sc.species, sc.rarity, sc.weight, slot)
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

-- ---------------------------------------------------------------------------
-- 5) Einmalige Hinweise pro Spieler (nur über RPC beschreibbar)
-- ---------------------------------------------------------------------------

create table if not exists public.player_notices (
  user_id    uuid not null references auth.users(id) on delete cascade,
  notice_key text not null check (notice_key ~ '^[a-z0-9_]{1,40}$'),
  seen_at    timestamptz not null default now(),
  primary key (user_id, notice_key)
);
alter table public.player_notices enable row level security;
revoke all on table public.player_notices from anon, authenticated;
grant select on table public.player_notices to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'player_notices'
       and policyname = 'player_notices_select_own'
  ) then
    create policy player_notices_select_own on public.player_notices
      for select using ((select auth.uid()) = user_id);
  end if;
end $$;

create or replace function public.notice_ack(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_seen timestamptz;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_key is null or p_key not in ('weekend_boost') then raise exception 'unknown notice'; end if;

  insert into public.player_notices(user_id, notice_key)
    values (uid, p_key)
    on conflict (user_id, notice_key) do nothing;

  select seen_at into v_seen from public.player_notices
   where user_id = uid and notice_key = p_key;

  return jsonb_build_object('key', p_key, 'seen_at', v_seen, 'server_now', now());
end $$;

revoke execute on function public.notice_ack(text) from anon, public;
grant execute on function public.notice_ack(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Status für Hinweis-Dialog und Banner
-- ---------------------------------------------------------------------------

create or replace function public.weekend_boost_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_local timestamp := now() at time zone 'Europe/Berlin';
  v_week timestamp := date_trunc('week', v_local);
  v_total numeric;
  v_rare numeric;
  v_total_we numeric;
  v_rare_we numeric;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select coalesce(sum(weight), 0),
         coalesce(sum(weight) filter (where rarity in ('rare', 'epic', 'legendary')), 0),
         coalesce(sum(weight * public._weekend_factor(species, rarity)), 0),
         coalesce(sum(weight * public._weekend_factor(species, rarity))
                    filter (where rarity in ('rare', 'epic', 'legendary')), 0)
    into v_total, v_rare, v_total_we, v_rare_we
    from public.species_costs
   where enabled and weight > 0;

  return jsonb_build_object(
    'active', public._weekend_boost_active(),
    'starts_at', (v_week + interval '5 days') at time zone 'Europe/Berlin',
    'ends_at', (v_week + interval '7 days') at time zone 'Europe/Berlin',
    'notice_seen', exists (
      select 1 from public.player_notices
       where user_id = uid and notice_key = 'weekend_boost'
    ),
    'rare_chance', case when v_total > 0 then round(100 * v_rare / v_total, 1) else 0 end,
    'rare_chance_weekend', case when v_total_we > 0 then round(100 * v_rare_we / v_total_we, 1) else 0 end,
    'server_now', now()
  );
end $$;

revoke execute on function public.weekend_boost_status() from anon, public;
grant execute on function public.weekend_boost_status() to authenticated;
