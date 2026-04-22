-- ====================================================================
-- Zoo Empire — Supabase Schema
-- Generiert vom Live-DB-Stand: 2026-04-22
-- Ersetzt alle vorherigen Versionen vollständig.
-- ====================================================================

-- =====================================================================
-- TABLES
-- =====================================================================

-- profiles (favorite_animal_id kommt nach animals per ALTER)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (char_length(username) between 3 and 24),
  coins bigint not null default 100 check (coins >= 0),
  last_collected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  is_admin boolean not null default false,
  equip_slots int not null default 1 check (equip_slots between 1 and 20),
  taps_slot timestamptz not null default '1970-01-01 00:00:00+00',
  taps_used int not null default 0,
  avatar_emoji text,
  tap_level int not null default 1,
  tap_cap_level int not null default 1,
  offline_level int not null default 1 check (offline_level between 1 and 13),
  newbie_gift_claimed boolean not null default false
);

alter table public.profiles enable row level security;

-- animals
create table if not exists public.animals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  species text not null,
  level int not null default 1,
  acquired_at timestamptz not null default now(),
  equipped boolean not null default false,
  tier text not null default 'normal',
  upgrade_ready_at timestamptz
);

alter table public.animals enable row level security;

-- zirkuläre FK (profiles ↔ animals)
alter table public.profiles
  add column if not exists favorite_animal_id uuid references public.animals(id) on delete set null;

-- transactions
create table if not exists public.transactions (
  id bigserial primary key,
  from_user uuid references public.profiles(id) on delete set null,
  to_user uuid references public.profiles(id) on delete set null,
  amount bigint not null check (amount > 0),
  kind text not null check (kind in ('send', 'trade', 'public_trade')),
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

-- trade_offers (altes Ein-Tier-System, weiterhin aktiv)
create table if not exists public.trade_offers (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  animal_id uuid not null references public.animals(id) on delete cascade,
  species text not null,
  price bigint not null check (price >= 0),
  to_user uuid references public.profiles(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'sold', 'cancelled')),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  wanted_species text
);

alter table public.trade_offers enable row level security;

-- species_costs
create table if not exists public.species_costs (
  species text primary key,
  cost bigint not null check (cost > 0),
  enabled boolean not null default true,
  weight int not null default 10 check (weight > 0),
  name text,
  emoji text,
  rate numeric
);

alter table public.species_costs enable row level security;

-- shop_state (Singleton id=1)
create table if not exists public.shop_state (
  id int primary key check (id = 1),
  rotates_at timestamptz not null default (now() + interval '4 hours'),
  updated_at timestamptz not null default now(),
  random_stock jsonb not null default '{}',
  forced_stock jsonb not null default '{}'
);

alter table public.shop_state enable row level security;

-- shop_purchases
create table if not exists public.shop_purchases (
  user_id uuid not null references auth.users on delete cascade,
  slot_start timestamptz not null,
  species text not null,
  qty int not null default 0,
  primary key (user_id, slot_start, species)
);

alter table public.shop_purchases enable row level security;

-- friendships
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendship_pair_unique unique (requester_id, addressee_id)
);

alter table public.friendships enable row level security;

-- pets
create table if not exists public.pets (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  pet_type text not null default 'dog',
  boost_multiplier numeric not null default 1,
  boost_until timestamptz not null default '1970-01-01 00:00:00+00',
  last_fed_at timestamptz
);

alter table public.pets enable row level security;

-- food_costs
create table if not exists public.food_costs (
  food text primary key,
  emoji text not null,
  name text not null,
  cost bigint not null,
  multiplier numeric not null,
  duration_min int not null
);

alter table public.food_costs enable row level security;

-- tier_defs
create table if not exists public.tier_defs (
  tier text primary key,
  multiplier numeric not null,
  required_qty int not null,
  upgrade_minutes int not null,
  "order" int not null
);

alter table public.tier_defs enable row level security;

-- trades (neues Multi-Tier-Handelssystem)
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid references public.profiles(id) on delete cascade,
  requester_animals uuid[] not null default '{}',
  addressee_animals uuid[] not null default '{}',
  requester_coins bigint not null default 0 check (requester_coins >= 0),
  addressee_coins bigint not null default 0 check (addressee_coins >= 0),
  note text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  is_public boolean not null default false,
  wanted_species text,
  wanted_tier text,
  expires_at timestamptz
);

alter table public.trades enable row level security;

-- trade_hides
create table if not exists public.trade_hides (
  user_id uuid not null references auth.users on delete cascade,
  trade_id uuid not null references public.trades(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (user_id, trade_id)
);

alter table public.trade_hides enable row level security;

-- broadcasts
create table if not exists public.broadcasts (
  id bigserial primary key,
  message text not null,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

alter table public.broadcasts enable row level security;

-- species_index
create table if not exists public.species_index (
  user_id uuid not null references public.profiles(id) on delete cascade,
  species text not null,
  tier text not null default 'normal',
  first_at timestamptz not null default now(),
  count int not null default 1,
  primary key (user_id, species, tier)
);

alter table public.species_index enable row level security;

-- pending_gifts
create table if not exists public.pending_gifts (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users on delete cascade,
  created_by uuid references auth.users on delete set null,
  coins bigint not null default 0 check (coins >= 0),
  species text references public.species_costs(species),
  tier text,
  qty int not null default 1 check (qty between 1 and 50),
  note text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

alter table public.pending_gifts enable row level security;

-- chest_config (Singleton id=1)
create table if not exists public.chest_config (
  id int primary key check (id = 1),
  price bigint not null default 500000,
  daily_limit int not null default 5
);

alter table public.chest_config enable row level security;

-- chest_purchases
create table if not exists public.chest_purchases (
  user_id uuid not null references auth.users on delete cascade,
  slot_start timestamptz not null,
  count int not null default 0,
  primary key (user_id, slot_start)
);

alter table public.chest_purchases enable row level security;

-- =====================================================================
-- INDEXES
-- =====================================================================

create index if not exists animals_owner_idx on public.animals(owner_id);
create index if not exists animals_equipped_idx on public.animals(owner_id, equipped);
create index if not exists tx_from_idx on public.transactions(from_user);
create index if not exists tx_to_idx on public.transactions(to_user);
create index if not exists offers_status_idx on public.trade_offers(status);
create index if not exists offers_seller_idx on public.trade_offers(seller_id);
create unique index if not exists profiles_username_lower_unique on public.profiles(lower(username));
create index if not exists idx_shop_purchases_slot on public.shop_purchases(slot_start);
create index if not exists friendships_req_idx on public.friendships(requester_id);
create index if not exists friendships_add_idx on public.friendships(addressee_id);
create index if not exists trades_requester_idx on public.trades(requester_id);
create index if not exists trades_addressee_idx on public.trades(addressee_id);
create index if not exists trades_status_idx on public.trades(status);
create index if not exists species_index_user_idx on public.species_index(user_id);
create index if not exists species_index_tier_idx on public.species_index(tier);
create index if not exists pending_gifts_recipient_idx on public.pending_gifts(recipient_id) where claimed_at is null;
create index if not exists profiles_favorite_animal_id_idx on public.profiles(favorite_animal_id);
create index if not exists trade_offers_animal_id_idx on public.trade_offers(animal_id);
create index if not exists trade_offers_to_user_idx on public.trade_offers(to_user);
create index if not exists broadcasts_created_by_idx on public.broadcasts(created_by);
create index if not exists trade_hides_trade_id_idx on public.trade_hides(trade_id);
create index if not exists pending_gifts_created_by_idx on public.pending_gifts(created_by);
create index if not exists pending_gifts_species_idx on public.pending_gifts(species);

-- =====================================================================
-- RLS POLICIES
-- =====================================================================

drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read" on public.profiles for select using (true);

drop policy if exists "animals public read" on public.animals;
create policy "animals public read" on public.animals for select using (true);

drop policy if exists "tx self read" on public.transactions;
create policy "tx self read" on public.transactions for select
  using ((select auth.uid()) = from_user or (select auth.uid()) = to_user);

drop policy if exists "offers public read" on public.trade_offers;
create policy "offers public read" on public.trade_offers for select using (true);

drop policy if exists "species_costs public read" on public.species_costs;
create policy "species_costs public read" on public.species_costs for select using (true);

drop policy if exists "shop_state public read" on public.shop_state;
create policy "shop_state public read" on public.shop_state for select using (true);

drop policy if exists "shop_purchases_self_read" on public.shop_purchases;
create policy "shop_purchases_self_read" on public.shop_purchases for select
  using (user_id = (select auth.uid()));

drop policy if exists "friends self read" on public.friendships;
create policy "friends self read" on public.friendships for select
  using ((select auth.uid()) = requester_id or (select auth.uid()) = addressee_id);

drop policy if exists "pets self read" on public.pets;
create policy "pets self read" on public.pets for select using ((select auth.uid()) = owner_id);

drop policy if exists "food_costs public read" on public.food_costs;
create policy "food_costs public read" on public.food_costs for select using (true);

drop policy if exists "tier_defs_read" on public.tier_defs;
create policy "tier_defs_read" on public.tier_defs for select using (true);

drop policy if exists "trades participants read" on public.trades;
create policy "trades participants read" on public.trades for select using (
  (select auth.uid()) = requester_id
  or (select auth.uid()) = addressee_id
  or (is_public = true and status = 'pending')
);

drop policy if exists "hides owner all" on public.trade_hides;
create policy "hides owner all" on public.trade_hides for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "broadcasts_auth_read" on public.broadcasts;
create policy "broadcasts_auth_read" on public.broadcasts for select
  using ((select auth.uid()) is not null);

drop policy if exists "idx self read" on public.species_index;
create policy "idx self read" on public.species_index for select using ((select auth.uid()) = user_id);

drop policy if exists "idx public read" on public.species_index;

drop policy if exists "gifts recipient read" on public.pending_gifts;
create policy "gifts recipient read" on public.pending_gifts for select
  using ((select auth.uid()) = recipient_id);

drop policy if exists "chest cfg read" on public.chest_config;
create policy "chest cfg read" on public.chest_config for select using (true);

drop policy if exists "chest own read" on public.chest_purchases;
create policy "chest own read" on public.chest_purchases for select using ((select auth.uid()) = user_id);

-- =====================================================================
-- VIEWS
-- =====================================================================

create or replace view public.animals_public as
  select id, owner_id, species, tier, equipped from public.animals;
alter view public.animals_public set (security_invoker = on);
grant select on public.animals_public to authenticated;

drop view if exists public.friends_view;
create view public.friends_view as
  select f.id as friendship_id, f.status, f.created_at, f.responded_at,
    case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end as friend_id,
    case when f.requester_id = auth.uid() then pa.username else pr.username end as friend_username,
    case when f.requester_id = auth.uid() then pa.coins else pr.coins end as friend_coins,
    case when f.requester_id = auth.uid() then pa.avatar_emoji else pr.avatar_emoji end as friend_avatar,
    case when f.requester_id = auth.uid() then 'outgoing'::text else 'incoming'::text end as direction
  from public.friendships f
  join public.profiles pr on pr.id = f.requester_id
  join public.profiles pa on pa.id = f.addressee_id
  where f.requester_id = auth.uid() or f.addressee_id = auth.uid();
alter view public.friends_view set (security_invoker = on);
grant select on public.friends_view to authenticated;

create or replace view public.trade_offers_with_names as
  select o.id, o.seller_id, o.animal_id, o.species, o.price, o.status,
    o.created_at, o.closed_at, o.to_user, o.wanted_species,
    ps.username as seller_username,
    pt.username as to_username
  from public.trade_offers o
  join public.profiles ps on ps.id = o.seller_id
  left join public.profiles pt on pt.id = o.to_user;
alter view public.trade_offers_with_names set (security_invoker = on);
grant select on public.trade_offers_with_names to authenticated;

create or replace view public.trades_view as
  select t.id, t.requester_id, t.addressee_id, t.is_public,
    t.requester_animals, t.addressee_animals,
    t.requester_coins, t.addressee_coins,
    t.note, t.status, t.created_at, t.closed_at, t.expires_at,
    t.wanted_species, t.wanted_tier,
    pr.username as requester_username,
    pa.username as addressee_username,
    (select coalesce(jsonb_agg(
       jsonb_build_object('id', a.id, 'species', a.species, 'tier', a.tier)
       order by a.acquired_at), '[]'::jsonb)
     from public.animals a where a.id = any(t.requester_animals)) as requester_animal_details,
    (select coalesce(jsonb_agg(
       jsonb_build_object('id', a.id, 'species', a.species, 'tier', a.tier)
       order by a.acquired_at), '[]'::jsonb)
     from public.animals a where a.id = any(t.addressee_animals)) as addressee_animal_details
  from public.trades t
  join public.profiles pr on pr.id = t.requester_id
  left join public.profiles pa on pa.id = t.addressee_id;
alter view public.trades_view set (security_invoker = on);
grant select on public.trades_view to authenticated;

-- =====================================================================
-- FUNCTIONS — private helpers
-- =====================================================================

create or replace function public._current_slot()
returns timestamptz language sql stable parallel safe set search_path = public as $$
  select to_timestamp(floor(extract(epoch from now()) / 300) * 300);
$$;

create or replace function public._offline_hours(p_level int)
returns numeric language sql immutable set search_path = public as $$
  select least(8, 2 + (greatest(coalesce(p_level, 1), 1) - 1) * 0.5)::numeric;
$$;

create or replace function public._next_offline_cost(p_level int)
returns bigint language sql immutable set search_path = public as $$
  select floor(500 * power(2.5, greatest(coalesce(p_level, 1), 1) - 1))::bigint;
$$;

create or replace function public._slot_cost(p_slot int)
returns bigint language sql immutable set search_path = public as $$
  select case
    when p_slot <= 1 then 0
    when p_slot = 2  then 2500
    when p_slot = 3  then 15000
    when p_slot = 4  then 80000
    when p_slot = 5  then 400000
    when p_slot = 6  then 2000000
    when p_slot = 7  then 10000000
    when p_slot = 8  then 50000000
    when p_slot = 9  then 250000000
    when p_slot = 10 then 1000000000
    else null
  end::bigint;
$$;

create or replace function public._stock_qty(state public.shop_state, p_species text)
returns int language sql immutable set search_path = public as $$
  select coalesce((state.random_stock->>p_species)::int, 0)
       + coalesce((state.forced_stock->>p_species)::int, 0);
$$;

create or replace function public._rotate_if_needed()
returns public.shop_state language plpgsql security definer set search_path = public as $$
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
      where sc.enabled
      order by power(
        greatest(
          (abs(('x' || substr(md5(sc.species || extract(epoch from slot)::text), 1, 8))::bit(32)::int) % 1000000 + 1) / 1000001.0,
          1e-9
        ),
        1.0 / sc.weight
      ) desc
      limit 5
    ) s;
    update public.shop_state
      set random_stock = new_rand,
          rotates_at   = next_slot,
          updated_at   = slot
      where id = 1
      returning * into state;
  end if;
  return state;
end $$;

create or replace function public._touch_species_index()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.species_index(user_id, species, tier, count)
      values (new.owner_id, new.species, coalesce(new.tier, 'normal'), 1)
      on conflict (user_id, species, tier) do update set count = public.species_index.count + 1;
    return new;
  elsif tg_op = 'UPDATE' then
    if coalesce(new.tier, 'normal') is distinct from coalesce(old.tier, 'normal')
       or new.owner_id is distinct from old.owner_id then
      insert into public.species_index(user_id, species, tier, count)
        values (new.owner_id, new.species, coalesce(new.tier, 'normal'), 1)
        on conflict (user_id, species, tier) do update set count = public.species_index.count + 1;
    end if;
    return new;
  end if;
  return new;
end $$;

-- =====================================================================
-- FUNCTIONS — public RPCs
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  u text;
begin
  u := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  if exists (select 1 from public.profiles where username = u) then
    u := u || substr(replace(new.id::text, '-', ''), 1, 4);
  end if;
  insert into public.profiles (id, username) values (new.id, u);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- tap
create or replace function public.get_tap_status(p_max int default 10)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  slot timestamptz := public._current_slot();
  next_slot timestamptz := slot + interval '5 minutes';
  used int; cap_lvl int; max_taps int;
  b_mul numeric; b_until timestamptz;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  update public.profiles set taps_slot = slot, taps_used = 0
    where id = uid and taps_slot < slot;
  select taps_used, tap_cap_level into used, cap_lvl from public.profiles where id = uid;
  used := coalesce(used, 0);
  cap_lvl := coalesce(cap_lvl, 1);
  max_taps := greatest(coalesce(p_max, 10), 10 + (cap_lvl - 1) * 5);
  select boost_multiplier, boost_until into b_mul, b_until from public.pets where owner_id = uid;
  return jsonb_build_object(
    'taps_used', used, 'taps_max', max_taps,
    'next_reset', next_slot, 'server_now', now(),
    'boost_multiplier', coalesce(b_mul, 1),
    'boost_until', b_until
  );
end $$;
grant execute on function public.get_tap_status(int) to authenticated;

create or replace function public.tap_earn(p_max int default 10)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  slot timestamptz := public._current_slot();
  next_slot timestamptz := slot + interval '5 minutes';
  base_rate numeric := 0; fav_rate numeric := 0;
  fav_id uuid; boost numeric := 1;
  rate numeric; tap_mul numeric; tap_lvl int; cap_lvl int; max_taps int;
  earn bigint; new_used int; new_coins bigint;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  update public.profiles set taps_slot = slot, taps_used = 0
    where id = uid and taps_slot < slot;
  select favorite_animal_id, tap_level, tap_cap_level
    into fav_id, tap_lvl, cap_lvl
    from public.profiles where id = uid;
  tap_lvl := coalesce(tap_lvl, 1);
  cap_lvl := coalesce(cap_lvl, 1);
  tap_mul := 1 + (tap_lvl - 1) * 0.25;
  max_taps := greatest(coalesce(p_max, 10), 10 + (cap_lvl - 1) * 5);
  select coalesce(sum(sc.cost / 50.0 * coalesce(td.multiplier, 1)), 0) into base_rate
    from public.animals a
    join public.species_costs sc on sc.species = a.species
    left join public.tier_defs td on td.tier = a.tier
    where a.owner_id = uid and a.equipped = true
      and (a.upgrade_ready_at is null or a.upgrade_ready_at <= now())
      and a.id <> coalesce(fav_id, '00000000-0000-0000-0000-000000000000'::uuid);
  if fav_id is not null then
    select coalesce(sc.cost / 50.0 * coalesce(td.multiplier, 1), 0) into fav_rate
      from public.animals a
      join public.species_costs sc on sc.species = a.species
      left join public.tier_defs td on td.tier = a.tier
      where a.id = fav_id and a.owner_id = uid and a.equipped = true
        and (a.upgrade_ready_at is null or a.upgrade_ready_at <= now());
    fav_rate := coalesce(fav_rate, 0);
  end if;
  select case when boost_until > now() then boost_multiplier else 1 end into boost
    from public.pets where owner_id = uid;
  boost := coalesce(boost, 1);
  rate := (base_rate + fav_rate * boost) * tap_mul;
  earn := greatest(1, floor(rate)::bigint);
  update public.profiles
    set taps_used = taps_used + 1, coins = coins + earn
    where id = uid and taps_used < max_taps
    returning taps_used, coins into new_used, new_coins;
  if new_used is null then raise exception 'tap limit reached'; end if;
  return jsonb_build_object(
    'coins', new_coins, 'earned', earn,
    'taps_used', new_used, 'taps_max', max_taps,
    'next_reset', next_slot, 'server_now', now()
  );
end $$;
grant execute on function public.tap_earn(int) to authenticated;

create or replace function public.upgrade_tap(p_kind text default 'mul')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cur_mul int; cur_cap int;
  cost bigint; new_coins bigint; new_level int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_kind not in ('mul', 'cap') then raise exception 'invalid upgrade kind'; end if;
  select tap_level, tap_cap_level into cur_mul, cur_cap from public.profiles where id = uid;
  cur_mul := coalesce(cur_mul, 1);
  cur_cap := coalesce(cur_cap, 1);
  if p_kind = 'mul' then
    if cur_mul >= 25 then raise exception 'tap max level reached'; end if;
    cost := (100 * power(3, cur_mul - 1))::bigint;
    update public.profiles
      set coins = coins - cost, tap_level = cur_mul + 1
      where id = uid and coins >= cost
      returning coins, tap_level into new_coins, new_level;
    if new_coins is null then raise exception 'insufficient coins'; end if;
    return jsonb_build_object(
      'coins', new_coins, 'kind', 'mul',
      'tap_level', new_level, 'tap_cap_level', cur_cap,
      'next_cost', (100 * power(3, new_level - 1))::bigint
    );
  else
    if cur_cap >= 20 then raise exception 'tap cap max level reached'; end if;
    cost := (150 * power(3, cur_cap - 1))::bigint;
    update public.profiles
      set coins = coins - cost, tap_cap_level = cur_cap + 1
      where id = uid and coins >= cost
      returning coins, tap_cap_level into new_coins, new_level;
    if new_coins is null then raise exception 'insufficient coins'; end if;
    return jsonb_build_object(
      'coins', new_coins, 'kind', 'cap',
      'tap_level', cur_mul, 'tap_cap_level', new_level,
      'next_cost', (150 * power(3, new_level - 1))::bigint,
      'taps_max', 10 + (new_level - 1) * 5
    );
  end if;
end $$;
grant execute on function public.upgrade_tap(text) to authenticated;

-- offline
create or replace function public.collect_offline(p_coins bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  elapsed_sec float; max_rate bigint; max_earn bigint;
  cap_sec float; lvl int; new_balance bigint;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_coins <= 0 then
    return jsonb_build_object('coins', (select coins from public.profiles where id = uid));
  end if;
  select offline_level into lvl from public.profiles where id = uid;
  cap_sec := public._offline_hours(lvl) * 3600;
  select extract(epoch from (now() - last_collected_at)) into elapsed_sec
    from public.profiles where id = uid;
  elapsed_sec := least(elapsed_sec, cap_sec);
  select coalesce(sum(sc.cost / 50), 0) into max_rate
    from public.animals a
    join public.species_costs sc on sc.species = a.species
    where a.owner_id = uid and a.equipped = true;
  max_earn := ceil(max_rate * elapsed_sec);
  p_coins := least(p_coins, (max_earn * 1.2)::bigint + 1);
  update public.profiles
     set coins = coins + p_coins, last_collected_at = now()
   where id = uid
   returning coins into new_balance;
  return jsonb_build_object('coins', new_balance);
end $$;
grant execute on function public.collect_offline(bigint) to authenticated;

create or replace function public.upgrade_offline()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cur int; cost bigint; new_balance bigint;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select offline_level into cur from public.profiles where id = uid for update;
  if cur is null then cur := 1; end if;
  if public._offline_hours(cur) >= 8 then raise exception 'offline max level erreicht'; end if;
  cost := public._next_offline_cost(cur);
  update public.profiles
     set coins = coins - cost, offline_level = cur + 1
   where id = uid and coins >= cost
   returning coins into new_balance;
  if new_balance is null then raise exception 'nicht genug Muenzen'; end if;
  return jsonb_build_object(
    'coins', new_balance, 'offline_level', cur + 1,
    'max_offline_hours', public._offline_hours(cur + 1),
    'next_cost', case when public._offline_hours(cur + 1) >= 8 then null
                      else public._next_offline_cost(cur + 1) end
  );
end $$;
grant execute on function public.upgrade_offline() to authenticated;

-- shop
create or replace function public.get_shop()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  state public.shop_state;
  uid uuid := auth.uid();
  merged jsonb; mine jsonb;
begin
  state := public._rotate_if_needed();
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
  return jsonb_build_object(
    'stock',        merged,
    'forced_stock', state.forced_stock,
    'my_purchases', coalesce(mine, '{}'),
    'slot_start',   state.updated_at,
    'rotates_at',   state.rotates_at,
    'server_now',   now()
  );
end $$;
grant execute on function public.get_shop() to anon, authenticated;

create or replace function public.buy_animal(p_species text, p_cost bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  real_cost bigint; new_animal public.animals%rowtype;
  new_balance bigint; state public.shop_state;
  rand_qty int; force_qty int; mine_qty int; catalog_qty int;
  slots int; equipped_cnt int; auto_equip boolean; current_fav uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select cost into real_cost from public.species_costs where species = p_species;
  if real_cost is null then raise exception 'unknown species'; end if;
  state := public._rotate_if_needed();
  rand_qty  := coalesce((state.random_stock->>p_species)::int, 0);
  force_qty := coalesce((state.forced_stock->>p_species)::int, 0);
  catalog_qty := rand_qty + force_qty;
  if catalog_qty <= 0 then raise exception 'species not available'; end if;
  select qty into mine_qty from public.shop_purchases
    where user_id = uid and slot_start = state.updated_at and species = p_species;
  mine_qty := coalesce(mine_qty, 0);
  if mine_qty >= catalog_qty then raise exception 'already bought your share this slot'; end if;
  update public.profiles set coins = coins - real_cost
    where id = uid and coins >= real_cost returning coins into new_balance;
  if new_balance is null then raise exception 'insufficient coins'; end if;
  insert into public.shop_purchases(user_id, slot_start, species, qty)
    values (uid, state.updated_at, p_species, 1)
    on conflict (user_id, slot_start, species) do update set qty = public.shop_purchases.qty + 1;
  select equip_slots, favorite_animal_id into slots, current_fav from public.profiles where id = uid;
  select count(*) into equipped_cnt from public.animals where owner_id = uid and equipped = true;
  auto_equip := equipped_cnt < slots;
  insert into public.animals(owner_id, species, equipped) values (uid, p_species, auto_equip)
    returning * into new_animal;
  if current_fav is null then
    update public.profiles set favorite_animal_id = new_animal.id where id = uid;
  end if;
  return jsonb_build_object('coins', new_balance, 'animal', to_jsonb(new_animal));
end $$;
grant execute on function public.buy_animal(text, bigint) to authenticated;

-- chest
create or replace function public.get_chest_status()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  cfg public.chest_config; state public.shop_state; bought int;
begin
  select * into cfg from public.chest_config where id = 1;
  state := public._rotate_if_needed();
  select count into bought from public.chest_purchases
    where user_id = auth.uid() and slot_start = state.updated_at;
  return jsonb_build_object(
    'price', cfg.price, 'slot_limit', cfg.daily_limit,
    'bought_slot', coalesce(bought, 0), 'slot_start', state.updated_at
  );
end $$;
grant execute on function public.get_chest_status() to authenticated;

create or replace function public.buy_chest(p_qty int default 1)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.chest_config; state public.shop_state;
  bought_slot int; total_cost bigint; balance bigint;
  w_total int; r int; acc int; rec record;
  picked_species text; new_ids uuid[] := '{}'; new_species text[] := '{}';
  i int; new_animal public.animals%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_qty is null or p_qty < 1 or p_qty > 3 then raise exception 'qty must be 1, 2 or 3'; end if;
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
    'coins', balance, 'qty', p_qty,
    'species', to_jsonb(new_species), 'animal_ids', to_jsonb(new_ids),
    'bought_slot', bought_slot + p_qty, 'slot_limit', cfg.daily_limit,
    'price', cfg.price, 'slot_start', state.updated_at
  );
end $$;
grant execute on function public.buy_chest(int) to authenticated;

-- equip slots
create or replace function public.buy_equip_slot()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); slots int; cost bigint; new_balance bigint;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select equip_slots into slots from public.profiles where id = uid for update;
  cost := public._slot_cost(slots + 1);
  if cost is null then raise exception 'max slots reached'; end if;
  update public.profiles set coins = coins - cost, equip_slots = equip_slots + 1
    where id = uid and coins >= cost returning coins, equip_slots into new_balance, slots;
  if new_balance is null then raise exception 'insufficient coins'; end if;
  return jsonb_build_object('coins', new_balance, 'equip_slots', slots, 'cost', cost);
end $$;
grant execute on function public.buy_equip_slot() to authenticated;

create or replace function public.get_next_slot_cost()
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'current_slots', (select equip_slots from public.profiles where id = auth.uid()),
    'next_slot',     (select equip_slots + 1 from public.profiles where id = auth.uid()),
    'next_cost',     public._slot_cost((select equip_slots + 1 from public.profiles where id = auth.uid()))
  );
$$;
grant execute on function public.get_next_slot_cost() to authenticated;

-- animals
create or replace function public.equip_animal(p_animal_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); slots int; equipped_cnt int; animal public.animals%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into animal from public.animals where id = p_animal_id and owner_id = uid;
  if not found then raise exception 'animal not found'; end if;
  if animal.equipped then return jsonb_build_object('ok', true); end if;
  select equip_slots into slots from public.profiles where id = uid;
  select count(*) into equipped_cnt from public.animals where owner_id = uid and equipped = true;
  if equipped_cnt >= slots then raise exception 'no free equip slots'; end if;
  update public.animals set equipped = true where id = p_animal_id;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.equip_animal(uuid) to authenticated;

create or replace function public.unequip_animal(p_animal_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  update public.animals set equipped = false where id = p_animal_id and owner_id = uid;
  if not found then raise exception 'animal not found'; end if;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.unequip_animal(uuid) to authenticated;

create or replace function public.set_favorite_animal(p_animal_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); ok boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_animal_id is null then
    update public.profiles set favorite_animal_id = null where id = uid;
    return jsonb_build_object('favorite_animal_id', null);
  end if;
  select exists(select 1 from public.animals where id = p_animal_id and owner_id = uid) into ok;
  if not ok then raise exception 'not your animal'; end if;
  update public.profiles set favorite_animal_id = p_animal_id where id = uid;
  return jsonb_build_object('favorite_animal_id', p_animal_id);
end $$;
grant execute on function public.set_favorite_animal(uuid) to authenticated;

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
      and equipped = false and tier = 'normal' and upgrade_ready_at is null;
  if cnt <> 1 then raise exception 'animals must be yours, unequipped, normal tier and same species'; end if;
  select species into species_key from public.animals where id = p_animal_ids[1];
  delete from public.animals where id = any(p_animal_ids) and owner_id = uid;
  ready := now() + make_interval(mins => td.upgrade_minutes);
  insert into public.animals(owner_id, species, equipped, tier, upgrade_ready_at)
    values (uid, species_key, false, p_target_tier, ready) returning id into new_id;
  return jsonb_build_object('id', new_id, 'ready_at', ready, 'tier', p_target_tier);
end $$;
grant execute on function public.start_tier_upgrade(uuid[], text) to authenticated;

-- pets / food
create or replace function public.feed_pet(p_food text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); f public.food_costs%rowtype;
  new_coins bigint; cur_until timestamptz; cur_mult numeric;
  new_until timestamptz; new_mult numeric;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into f from public.food_costs where food = p_food;
  if not found then raise exception 'unknown food'; end if;
  update public.profiles set coins = coins - f.cost
    where id = uid and coins >= f.cost returning coins into new_coins;
  if new_coins is null then raise exception 'insufficient coins'; end if;
  insert into public.pets(owner_id) values (uid) on conflict (owner_id) do nothing;
  select boost_until, boost_multiplier into cur_until, cur_mult from public.pets where owner_id = uid;
  if cur_until > now() and cur_mult >= f.multiplier then
    new_until := cur_until + make_interval(mins => f.duration_min);
    new_mult  := cur_mult;
  else
    new_until := now() + make_interval(mins => f.duration_min);
    new_mult  := f.multiplier;
  end if;
  update public.pets set boost_multiplier = new_mult, boost_until = new_until, last_fed_at = now()
    where owner_id = uid;
  return jsonb_build_object(
    'coins', new_coins, 'boost_multiplier', new_mult,
    'boost_until', new_until, 'server_now', now()
  );
end $$;
grant execute on function public.feed_pet(text) to authenticated;

-- coins
create or replace function public.send_coins(p_recipient text, p_amount bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); recipient uuid; sender_balance bigint;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_amount <= 0 then raise exception 'amount must be positive'; end if;
  select id into recipient from public.profiles where lower(username) = lower(p_recipient);
  if recipient is null then raise exception 'recipient not found'; end if;
  if recipient = uid then raise exception 'cannot send to yourself'; end if;
  update public.profiles set coins = coins - p_amount
    where id = uid and coins >= p_amount returning coins into sender_balance;
  if sender_balance is null then raise exception 'insufficient coins'; end if;
  update public.profiles set coins = coins + p_amount where id = recipient;
  insert into public.transactions(from_user, to_user, amount, kind) values (uid, recipient, p_amount, 'send');
  return jsonb_build_object('sender_balance', sender_balance);
end $$;
grant execute on function public.send_coins(text, bigint) to authenticated;

-- trades (neues System)
create or replace function public.propose_trade(
  p_addressee text,
  p_requester_animals uuid[],
  p_requester_coins bigint,
  p_addressee_animals uuid[],
  p_addressee_coins bigint,
  p_note text default null,
  p_wanted_species text default null,
  p_wanted_tier text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); target uuid; new_id uuid;
  miss_count int; is_pub boolean := false;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_addressee is null or trim(p_addressee) = '' then
    is_pub := true; target := null;
  else
    select id into target from public.profiles where lower(username) = lower(p_addressee);
    if target is null then raise exception 'recipient not found'; end if;
    if target = uid then raise exception 'cannot trade with yourself'; end if;
  end if;
  p_requester_animals := coalesce(p_requester_animals, '{}');
  p_addressee_animals := coalesce(p_addressee_animals, '{}');
  p_requester_coins   := coalesce(p_requester_coins, 0);
  p_addressee_coins   := coalesce(p_addressee_coins, 0);
  if p_requester_coins < 0 or p_addressee_coins < 0 then raise exception 'coins must be non-negative'; end if;
  if cardinality(p_requester_animals) + cardinality(p_addressee_animals) + p_requester_coins + p_addressee_coins = 0
     and p_wanted_species is null then
    raise exception 'trade must contain something';
  end if;
  if cardinality(p_requester_animals) > 0 then
    select count(*) into miss_count from unnest(p_requester_animals) aid
      where not exists (
        select 1 from public.animals
        where id = aid
          and owner_id = uid
          and equipped = false
          and (upgrade_ready_at is null or upgrade_ready_at <= now())
      );
    if miss_count > 0 then raise exception 'some offered animals are not yours, equipped or upgrading'; end if;
  end if;
  if is_pub then
    if cardinality(p_addressee_animals) > 0 then raise exception 'public trades cannot request specific animal IDs'; end if;
  else
    if cardinality(p_addressee_animals) > 0 then
      select count(*) into miss_count from unnest(p_addressee_animals) aid
        where not exists (
          select 1 from public.animals
          where id = aid
            and owner_id = target
            and equipped = false
            and (upgrade_ready_at is null or upgrade_ready_at <= now())
        );
      if miss_count > 0 then raise exception 'some requested animals are not owned by addressee or are equipped'; end if;
    end if;
  end if;
  insert into public.trades(
    requester_id, addressee_id, is_public,
    requester_animals, addressee_animals,
    requester_coins, addressee_coins, note,
    wanted_species, wanted_tier, expires_at
  ) values (
    uid, target, is_pub,
    p_requester_animals, p_addressee_animals,
    p_requester_coins, p_addressee_coins, nullif(p_note, ''),
    nullif(p_wanted_species, ''), nullif(coalesce(p_wanted_tier, 'normal'), ''),
    now() + interval '7 days'
  ) returning id into new_id;
  return jsonb_build_object('trade_id', new_id, 'public', is_pub);
end $$;
grant execute on function public.propose_trade(text, uuid[], bigint, uuid[], bigint, text, text, text) to authenticated;

create or replace function public.accept_trade(p_trade_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); t public.trades%rowtype;
  req_bal bigint; add_bal bigint; miss_count int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into t from public.trades where id = p_trade_id for update;
  if not found then raise exception 'trade not found'; end if;
  if t.status <> 'pending' then raise exception 'trade not pending'; end if;
  if t.addressee_id <> uid then raise exception 'only addressee can accept'; end if;
  if cardinality(t.requester_animals) > 0 then
    select count(*) into miss_count from unnest(t.requester_animals) aid
      where not exists (
        select 1 from public.animals
        where id = aid
          and owner_id = t.requester_id
          and equipped = false
          and (upgrade_ready_at is null or upgrade_ready_at <= now())
      );
    if miss_count > 0 then raise exception 'requester no longer owns all offered animals'; end if;
  end if;
  if cardinality(t.addressee_animals) > 0 then
    select count(*) into miss_count from unnest(t.addressee_animals) aid
      where not exists (
        select 1 from public.animals
        where id = aid
          and owner_id = t.addressee_id
          and equipped = false
          and (upgrade_ready_at is null or upgrade_ready_at <= now())
      );
    if miss_count > 0 then raise exception 'you no longer own all requested animals'; end if;
  end if;
  if t.requester_coins > 0 then
    update public.profiles set coins = coins - t.requester_coins
      where id = t.requester_id and coins >= t.requester_coins returning coins into req_bal;
    if req_bal is null then raise exception 'requester has insufficient coins'; end if;
  end if;
  if t.addressee_coins > 0 then
    update public.profiles set coins = coins - t.addressee_coins
      where id = t.addressee_id and coins >= t.addressee_coins returning coins into add_bal;
    if add_bal is null then
      if t.requester_coins > 0 then
        update public.profiles set coins = coins + t.requester_coins where id = t.requester_id;
      end if;
      raise exception 'you have insufficient coins';
    end if;
  end if;
  if t.requester_coins > 0 then update public.profiles set coins = coins + t.requester_coins where id = t.addressee_id; end if;
  if t.addressee_coins > 0 then update public.profiles set coins = coins + t.addressee_coins where id = t.requester_id; end if;
  if cardinality(t.requester_animals) > 0 then
    update public.animals set owner_id = t.addressee_id, equipped = false where id = any(t.requester_animals);
  end if;
  if cardinality(t.addressee_animals) > 0 then
    update public.animals set owner_id = t.requester_id, equipped = false where id = any(t.addressee_animals);
  end if;
  update public.trades set status = 'accepted', closed_at = now() where id = t.id;
  insert into public.transactions(from_user, to_user, amount, kind, meta)
    values (uid, t.requester_id, greatest(t.addressee_coins, 1), 'trade',
            jsonb_build_object('trade_id', t.id,
              'requester_animals', t.requester_animals, 'addressee_animals', t.addressee_animals,
              'requester_coins', t.requester_coins, 'addressee_coins', t.addressee_coins));
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.accept_trade(uuid) to authenticated;

create or replace function public.decline_trade(p_trade_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); t public.trades%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  update public.trades set status = 'declined', closed_at = now()
    where id = p_trade_id and addressee_id = uid and status = 'pending' returning * into t;
  if not found then raise exception 'trade not found or not pending'; end if;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.decline_trade(uuid) to authenticated;

create or replace function public.cancel_trade(p_trade_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); t public.trades%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  update public.trades set status = 'cancelled', closed_at = now()
    where id = p_trade_id and requester_id = uid and status = 'pending' returning * into t;
  if not found then raise exception 'trade not found or not pending'; end if;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.cancel_trade(uuid) to authenticated;

create or replace function public.accept_public_trade(p_trade_id uuid, p_my_animals uuid[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); t public.trades%rowtype;
  req_bal bigint; add_bal bigint; miss_count int; match_count int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into t from public.trades where id = p_trade_id for update;
  if not found then raise exception 'trade not found'; end if;
  if t.status <> 'pending' then raise exception 'trade not pending'; end if;
  if not t.is_public then raise exception 'not a public trade'; end if;
  if t.requester_id = uid then raise exception 'cannot accept your own trade'; end if;
  p_my_animals := coalesce(p_my_animals, '{}');
  if cardinality(p_my_animals) > 0 then
    select count(*) into miss_count from unnest(p_my_animals) aid
      where not exists (
        select 1 from public.animals
        where id = aid
          and owner_id = uid
          and equipped = false
          and (upgrade_ready_at is null or upgrade_ready_at <= now())
      );
    if miss_count > 0 then raise exception 'some of your animals are not available'; end if;
  end if;
  if t.wanted_species is not null then
    select count(*) into match_count from public.animals
      where id = any(p_my_animals) and owner_id = uid
        and species = t.wanted_species and tier = coalesce(t.wanted_tier, 'normal');
    if match_count < 1 then
      raise exception 'you must include at least one % (%)', t.wanted_species, coalesce(t.wanted_tier, 'normal');
    end if;
  end if;
  if cardinality(t.requester_animals) > 0 then
    select count(*) into miss_count from unnest(t.requester_animals) aid
      where not exists (
        select 1 from public.animals
        where id = aid
          and owner_id = t.requester_id
          and equipped = false
          and (upgrade_ready_at is null or upgrade_ready_at <= now())
      );
    if miss_count > 0 then raise exception 'requester no longer owns all offered animals'; end if;
  end if;
  if t.requester_coins > 0 then
    update public.profiles set coins = coins - t.requester_coins
      where id = t.requester_id and coins >= t.requester_coins returning coins into req_bal;
    if req_bal is null then raise exception 'requester has insufficient coins'; end if;
  end if;
  if t.addressee_coins > 0 then
    update public.profiles set coins = coins - t.addressee_coins
      where id = uid and coins >= t.addressee_coins returning coins into add_bal;
    if add_bal is null then
      if t.requester_coins > 0 then update public.profiles set coins = coins + t.requester_coins where id = t.requester_id; end if;
      raise exception 'you have insufficient coins';
    end if;
  end if;
  if t.requester_coins > 0 then update public.profiles set coins = coins + t.requester_coins where id = uid; end if;
  if t.addressee_coins > 0 then update public.profiles set coins = coins + t.addressee_coins where id = t.requester_id; end if;
  if cardinality(t.requester_animals) > 0 then
    update public.animals set owner_id = uid, equipped = false where id = any(t.requester_animals);
  end if;
  if cardinality(p_my_animals) > 0 then
    update public.animals set owner_id = t.requester_id, equipped = false where id = any(p_my_animals);
  end if;
  update public.trades set status = 'accepted', closed_at = now(), addressee_id = uid, addressee_animals = p_my_animals where id = t.id;
  insert into public.transactions(from_user, to_user, amount, kind, meta)
    values (uid, t.requester_id, greatest(t.addressee_coins, 1), 'public_trade', jsonb_build_object('trade_id', t.id));
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.accept_public_trade(uuid, uuid[]) to authenticated;

create or replace function public.expire_old_trades()
returns int language sql security definer set search_path = public as $$
  with upd as (
    update public.trades set status = 'expired', closed_at = now()
     where status = 'pending' and expires_at is not null and expires_at < now()
     returning 1
  ) select count(*)::int from upd;
$$;
grant execute on function public.expire_old_trades() to authenticated;

create or replace function public.hide_trade(p_trade_id uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.trade_hides(user_id, trade_id) values (auth.uid(), p_trade_id)
    on conflict do nothing;
$$;
grant execute on function public.hide_trade(uuid) to authenticated;

create or replace function public.unhide_trade(p_trade_id uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.trade_hides where user_id = auth.uid() and trade_id = p_trade_id;
$$;
grant execute on function public.unhide_trade(uuid) to authenticated;

-- old single-animal trade system (legacy)
create or replace function public.create_trade_offer(
  p_animal_id uuid, p_price bigint, p_to_username text, p_wanted_species text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); animal public.animals%rowtype;
  target uuid := null; offer_id uuid;
  want text := nullif(p_wanted_species, '');
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_price < 0 then raise exception 'price cannot be negative'; end if;
  select * into animal from public.animals where id = p_animal_id and owner_id = uid;
  if not found then raise exception 'animal not found'; end if;
  if animal.equipped then raise exception 'animal is equipped'; end if;
  if want is not null and not exists(select 1 from public.species_costs where species = want) then
    raise exception 'unknown wanted species';
  end if;
  if exists (select 1 from public.trade_offers where animal_id = p_animal_id and status = 'open') then
    raise exception 'animal is already listed';
  end if;
  if p_to_username is not null and p_to_username <> '' then
    select id into target from public.profiles where lower(username) = lower(p_to_username);
    if target is null then raise exception 'recipient not found'; end if;
    if target = uid then raise exception 'cannot target yourself'; end if;
  end if;
  insert into public.trade_offers(seller_id, animal_id, species, price, to_user, wanted_species)
    values (uid, p_animal_id, animal.species, p_price, target, want) returning id into offer_id;
  return jsonb_build_object('offer_id', offer_id);
end $$;
grant execute on function public.create_trade_offer(uuid, bigint, text, text) to authenticated;

create or replace function public.accept_trade_offer(p_offer_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); offer public.trade_offers%rowtype;
  buyer_balance bigint; give_animal uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into offer from public.trade_offers where id = p_offer_id for update;
  if not found then raise exception 'offer not found'; end if;
  if offer.status <> 'open' then raise exception 'offer not available'; end if;
  if offer.seller_id = uid then raise exception 'cannot buy your own offer'; end if;
  if offer.to_user is not null and offer.to_user <> uid then
    raise exception 'offer is reserved for another player';
  end if;
  if offer.wanted_species is not null then
    select id into give_animal from public.animals
      where owner_id = uid and species = offer.wanted_species and equipped = false
      order by acquired_at asc limit 1 for update;
    if give_animal is null then raise exception 'you need a % to trade (unequipped)', offer.wanted_species; end if;
  end if;
  if offer.price > 0 then
    update public.profiles set coins = coins - offer.price
      where id = uid and coins >= offer.price returning coins into buyer_balance;
    if buyer_balance is null then raise exception 'insufficient coins'; end if;
    update public.profiles set coins = coins + offer.price where id = offer.seller_id;
  else
    select coins into buyer_balance from public.profiles where id = uid;
  end if;
  update public.animals set owner_id = uid, equipped = false where id = offer.animal_id;
  if give_animal is not null then
    update public.animals set owner_id = offer.seller_id, equipped = false where id = give_animal;
  end if;
  update public.trade_offers set status = 'sold', closed_at = now() where id = offer.id;
  if offer.price > 0 then
    insert into public.transactions(from_user, to_user, amount, kind, meta)
      values (uid, offer.seller_id, offer.price, 'trade',
              jsonb_build_object('animal_id', offer.animal_id, 'species', offer.species,
                'given_species', offer.wanted_species, 'given_animal_id', give_animal));
  end if;
  return jsonb_build_object('coins', buyer_balance);
end $$;
grant execute on function public.accept_trade_offer(uuid) to authenticated;

create or replace function public.cancel_trade_offer(p_offer_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  update public.trade_offers set status = 'cancelled', closed_at = now()
    where id = p_offer_id and seller_id = uid and status = 'open';
  if not found then raise exception 'offer not found or already closed'; end if;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.cancel_trade_offer(uuid) to authenticated;

-- friends
create or replace function public.friend_request(p_username text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); target uuid;
  existing public.friendships%rowtype; new_row public.friendships%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select id into target from public.profiles where lower(username) = lower(p_username);
  if target is null then raise exception 'user not found'; end if;
  if target = uid then raise exception 'cannot friend yourself'; end if;
  select * into existing from public.friendships
    where (requester_id = uid and addressee_id = target)
       or (requester_id = target and addressee_id = uid) limit 1;
  if existing.id is not null then
    if existing.addressee_id = uid and existing.status = 'pending' then
      update public.friendships set status = 'accepted', responded_at = now()
        where id = existing.id returning * into new_row;
      return jsonb_build_object('status', 'accepted', 'id', new_row.id);
    end if;
    return jsonb_build_object('status', existing.status, 'id', existing.id);
  end if;
  insert into public.friendships(requester_id, addressee_id) values (uid, target) returning * into new_row;
  return jsonb_build_object('status', 'pending', 'id', new_row.id);
end $$;
grant execute on function public.friend_request(text) to authenticated;

create or replace function public.friend_respond(p_id uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); row public.friendships%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into row from public.friendships where id = p_id;
  if not found then raise exception 'request not found'; end if;
  if row.addressee_id <> uid then raise exception 'not your request'; end if;
  if row.status <> 'pending' then raise exception 'already responded'; end if;
  update public.friendships set status = case when p_accept then 'accepted' else 'declined' end,
    responded_at = now() where id = p_id;
  return jsonb_build_object('status', case when p_accept then 'accepted' else 'declined' end);
end $$;
grant execute on function public.friend_respond(uuid, boolean) to authenticated;

create or replace function public.friend_remove(p_friend_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  delete from public.friendships
    where (requester_id = uid and addressee_id = p_friend_id)
       or (requester_id = p_friend_id and addressee_id = uid);
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.friend_remove(uuid) to authenticated;

-- gifts
create or replace function public.claim_newbie_gift()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); already boolean;
  pick_species text; new_animal public.animals%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select newbie_gift_claimed into already from public.profiles where id = uid for update;
  if coalesce(already, false) then raise exception 'newbie gift already claimed'; end if;
  select species into pick_species from public.species_costs
   where enabled
     and (lower(species) in ('bunny', 'hase', 'rabbit')
          or lower(name) like '%hase%' or lower(name) like '%bunny%' or lower(name) like '%rabbit%')
   order by cost asc limit 1;
  if pick_species is null then
    select species into pick_species from public.species_costs where enabled order by cost asc limit 1;
  end if;
  if pick_species is null then raise exception 'no species available'; end if;
  insert into public.animals(owner_id, species) values (uid, pick_species) returning * into new_animal;
  update public.profiles set newbie_gift_claimed = true where id = uid;
  return jsonb_build_object('species', pick_species, 'animal_id', new_animal.id, 'bonus_taps', 50);
end $$;
grant execute on function public.claim_newbie_gift() to authenticated;

create or replace function public.claim_pending_gifts()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); g record;
  total_coins bigint := 0; claimed jsonb := '[]'::jsonb; i int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  for g in select * from public.pending_gifts
    where recipient_id = uid and claimed_at is null order by created_at for update
  loop
    if g.coins > 0 then
      update public.profiles set coins = coins + g.coins where id = uid;
      total_coins := total_coins + g.coins;
    end if;
    if g.species is not null then
      for i in 1..g.qty loop
        insert into public.animals(owner_id, species, tier) values (uid, g.species, coalesce(g.tier, 'normal'));
      end loop;
    end if;
    update public.pending_gifts set claimed_at = now() where id = g.id;
    claimed := claimed || jsonb_build_object('id', g.id, 'coins', g.coins, 'species', g.species,
      'tier', g.tier, 'qty', g.qty, 'note', g.note);
  end loop;
  return jsonb_build_object('coins', total_coins, 'gifts', claimed);
end $$;
grant execute on function public.claim_pending_gifts() to authenticated;

-- profile utils
create or replace function public.set_avatar(p_emoji text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); cleaned text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  cleaned := nullif(trim(p_emoji), '');
  if cleaned is not null and char_length(cleaned) > 8 then raise exception 'avatar too long'; end if;
  update public.profiles set avatar_emoji = cleaned where id = uid;
  return jsonb_build_object('avatar_emoji', cleaned);
end $$;
grant execute on function public.set_avatar(text) to authenticated;

create or replace function public.change_username(p_new text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); clean text; taken boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  clean := trim(coalesce(p_new, ''));
  if length(clean) < 3 or length(clean) > 20 then raise exception 'username must be 3-20 chars'; end if;
  if clean !~ '^[A-Za-z0-9_.-]+$' then raise exception 'invalid characters'; end if;
  select exists(select 1 from public.profiles where lower(username) = lower(clean) and id <> uid) into taken;
  if taken then raise exception 'username taken'; end if;
  update public.profiles set username = clean where id = uid;
  return jsonb_build_object('username', clean);
end $$;
grant execute on function public.change_username(text) to authenticated;

-- admin
create or replace function public.admin_upsert_species(
  p_species text, p_name text, p_emoji text, p_cost bigint, p_rate numeric,
  p_weight int default 100, p_enabled boolean default true
) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); is_adm boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select is_admin into is_adm from public.profiles where id = uid;
  if not coalesce(is_adm, false) then raise exception 'admin only'; end if;
  if p_species is null or trim(p_species) = '' then raise exception 'species key required'; end if;
  insert into public.species_costs(species, name, emoji, cost, rate, weight, enabled)
    values (p_species, p_name, p_emoji, p_cost, p_rate, p_weight, p_enabled)
    on conflict (species) do update set
      name    = coalesce(excluded.name,    public.species_costs.name),
      emoji   = coalesce(excluded.emoji,   public.species_costs.emoji),
      cost    = coalesce(excluded.cost,    public.species_costs.cost),
      rate    = coalesce(excluded.rate,    public.species_costs.rate),
      weight  = coalesce(excluded.weight,  public.species_costs.weight),
      enabled = coalesce(excluded.enabled, public.species_costs.enabled);
  return jsonb_build_object('ok', true, 'species', p_species);
end $$;
grant execute on function public.admin_upsert_species(text, text, text, bigint, numeric, int, boolean) to authenticated;

create or replace function public.admin_delete_species(p_species text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); is_adm boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select is_admin into is_adm from public.profiles where id = uid;
  if not coalesce(is_adm, false) then raise exception 'admin only'; end if;
  delete from public.species_costs where species = p_species;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.admin_delete_species(text) to authenticated;

create or replace function public.admin_set_species_enabled(p_species text, p_enabled boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); is_admin bool;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select p.is_admin into is_admin from public.profiles p where p.id = uid;
  if not coalesce(is_admin, false) then raise exception 'admin only'; end if;
  update public.species_costs set enabled = p_enabled where species = p_species;
  if not found then raise exception 'unknown species'; end if;
  return jsonb_build_object('species', p_species, 'enabled', p_enabled);
end $$;
grant execute on function public.admin_set_species_enabled(text, boolean) to authenticated;

create or replace function public.admin_set_species_weight(p_species text, p_weight int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); is_admin bool;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select p.is_admin into is_admin from public.profiles p where p.id = uid;
  if not coalesce(is_admin, false) then raise exception 'admin only'; end if;
  if p_weight <= 0 then raise exception 'weight must be > 0'; end if;
  update public.species_costs set weight = p_weight where species = p_species;
  if not found then raise exception 'unknown species'; end if;
  return jsonb_build_object('species', p_species, 'weight', p_weight);
end $$;
grant execute on function public.admin_set_species_weight(text, int) to authenticated;

create or replace function public.admin_force_add(p_species text, p_qty int default 1)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); is_admin bool;
  state public.shop_state; current_qty int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select p.is_admin into is_admin from public.profiles p where p.id = uid;
  if not coalesce(is_admin, false) then raise exception 'admin only'; end if;
  if p_qty is null or p_qty < 1 then raise exception 'qty must be >= 1'; end if;
  if not exists (select 1 from public.species_costs where species = p_species) then raise exception 'unknown species'; end if;
  current_qty := coalesce((select (forced_stock->>p_species)::int from public.shop_state where id = 1), 0);
  update public.shop_state
    set forced_stock = jsonb_set(forced_stock, array[p_species], to_jsonb(current_qty + p_qty))
    where id = 1 returning * into state;
  return jsonb_build_object('forced_stock', state.forced_stock, 'species', p_species, 'qty', current_qty + p_qty);
end $$;
grant execute on function public.admin_force_add(text, int) to authenticated;

create or replace function public.admin_force_remove(p_species text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); is_admin bool; state public.shop_state;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select p.is_admin into is_admin from public.profiles p where p.id = uid;
  if not coalesce(is_admin, false) then raise exception 'admin only'; end if;
  update public.shop_state
    set forced_stock = forced_stock - p_species, random_stock = random_stock - p_species
    where id = 1 returning * into state;
  return jsonb_build_object('forced_stock', state.forced_stock, 'random_stock', state.random_stock);
end $$;
grant execute on function public.admin_force_remove(text) to authenticated;

create or replace function public.admin_force_rotation()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); is_admin bool; state public.shop_state;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select p.is_admin into is_admin from public.profiles p where p.id = uid;
  if not coalesce(is_admin, false) then raise exception 'admin only'; end if;
  update public.shop_state set updated_at = 'epoch' where id = 1;
  state := public._rotate_if_needed();
  return jsonb_build_object('random_stock', state.random_stock, 'forced_stock', state.forced_stock, 'rotates_at', state.rotates_at);
end $$;
grant execute on function public.admin_force_rotation() to authenticated;

create or replace function public.admin_broadcast(p_message text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); is_adm boolean; clean text; row_id bigint;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select is_admin into is_adm from public.profiles where id = uid;
  if not coalesce(is_adm, false) then raise exception 'admin only'; end if;
  clean := trim(coalesce(p_message, ''));
  if length(clean) = 0 or length(clean) > 280 then raise exception 'message must be 1-280 chars'; end if;
  insert into public.broadcasts(message, created_by) values (clean, uid) returning id into row_id;
  return jsonb_build_object('id', row_id, 'message', clean);
end $$;
grant execute on function public.admin_broadcast(text) to authenticated;

create or replace function public.admin_queue_gift(
  p_username text, p_coins bigint default 0, p_species text default null,
  p_tier text default 'normal', p_qty int default 1, p_note text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); admin_flag boolean; rcpt uuid; gift_id uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select is_admin into admin_flag from public.profiles where id = uid;
  if not coalesce(admin_flag, false) then raise exception 'admin only'; end if;
  if coalesce(p_coins, 0) < 0 then raise exception 'coins must be >= 0'; end if;
  if coalesce(p_qty, 1) < 1 or p_qty > 50 then raise exception 'qty 1..50'; end if;
  if p_species is null and coalesce(p_coins, 0) = 0 then raise exception 'either coins or species required'; end if;
  select id into rcpt from public.profiles where username ilike p_username limit 1;
  if rcpt is null then raise exception 'recipient not found'; end if;
  if p_species is not null and not exists (select 1 from public.species_costs where species = p_species) then
    raise exception 'unknown species';
  end if;
  insert into public.pending_gifts(recipient_id, created_by, coins, species, tier, qty, note)
    values (rcpt, uid, coalesce(p_coins, 0), p_species, coalesce(p_tier, 'normal'), coalesce(p_qty, 1), p_note)
    returning id into gift_id;
  return jsonb_build_object('gift_id', gift_id, 'recipient', p_username);
end $$;
grant execute on function public.admin_queue_gift(text, bigint, text, text, int, text) to authenticated;

create or replace function public.admin_queue_gift_bulk(
  p_usernames text, p_coins bigint default 0, p_species text default null,
  p_tier text default 'normal', p_qty int default 1, p_note text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); admin_flag boolean;
  is_all boolean := false; rcpt uuid; sent int := 0;
  missed text[] := '{}'; ids uuid[];
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select is_admin into admin_flag from public.profiles where id = uid;
  if not coalesce(admin_flag, false) then raise exception 'admin only'; end if;
  if coalesce(p_coins, 0) < 0 then raise exception 'coins must be >= 0'; end if;
  if coalesce(p_qty, 1) < 1 or p_qty > 50 then raise exception 'qty 1..50'; end if;
  if p_species is null and coalesce(p_coins, 0) = 0 then raise exception 'either coins or species required'; end if;
  if p_species is not null and not exists (select 1 from public.species_costs where species = p_species) then
    raise exception 'unknown species';
  end if;
  if lower(trim(p_usernames)) = '@all' then
    is_all := true;
    select array_agg(id) into ids from public.profiles;
  else
    select array_agg(p.id) into ids
      from (select distinct btrim(u) as name from unnest(string_to_array(p_usernames, ',')) u where btrim(u) <> '') x
      left join public.profiles p on p.username ilike x.name;
    select array_agg(x.name) into missed
      from (select distinct btrim(u) as name from unnest(string_to_array(p_usernames, ',')) u where btrim(u) <> '') x
      where not exists (select 1 from public.profiles p where p.username ilike x.name);
    ids := array_remove(ids, null);
  end if;
  if ids is null or cardinality(ids) = 0 then raise exception 'no recipients found'; end if;
  insert into public.pending_gifts(recipient_id, created_by, coins, species, tier, qty, note)
    select r, uid, coalesce(p_coins, 0), p_species, coalesce(p_tier, 'normal'), coalesce(p_qty, 1), p_note
      from unnest(ids) r;
  get diagnostics sent = row_count;
  return jsonb_build_object('sent', sent, 'all', is_all, 'missed', coalesce(missed, '{}'));
end $$;
grant execute on function public.admin_queue_gift_bulk(text, bigint, text, text, int, text) to authenticated;

-- =====================================================================
-- TRIGGERS
-- =====================================================================

create trigger animals_species_index_ins
  after insert on public.animals
  for each row execute function public._touch_species_index();

create trigger animals_species_index_upd
  after update on public.animals
  for each row execute function public._touch_species_index();

-- =====================================================================
-- SEED DATA
-- =====================================================================

insert into public.tier_defs(tier, multiplier, required_qty, upgrade_minutes, "order") values
  ('normal',  1,   0,  0,  0),
  ('gold',    2,   3,  5,  1),
  ('diamond', 4,   6,  8,  2),
  ('epic',    7,   9,  12, 3),
  ('rainbow', 10,  12, 15, 4)
on conflict (tier) do update set
  multiplier     = excluded.multiplier,
  required_qty   = excluded.required_qty,
  upgrade_minutes = excluded.upgrade_minutes,
  "order"        = excluded."order";

insert into public.chest_config(id, price, daily_limit) values (1, 150, 5)
  on conflict (id) do update set price = excluded.price, daily_limit = excluded.daily_limit;

insert into public.food_costs(food, emoji, name, cost, multiplier, duration_min) values
  ('bread',        '🥖', 'Brot',           100,     1.5, 1),
  ('kibble',       '🦴', 'Trockenfutter',   500,     2,   1),
  ('fish',         '🐟', 'Frischer Fisch',  5000,    2,   5),
  ('steak',        '🥩', 'Saftiges Steak',  50000,   3,   5),
  ('magic_fruit',  '🍎', 'Zauberfrucht',    500000,  4,   10),
  ('golden_treat', '🍖', 'Goldener Snack',  5000000, 5,   30)
on conflict (food) do update set
  emoji = excluded.emoji, name = excluded.name, cost = excluded.cost,
  multiplier = excluded.multiplier, duration_min = excluded.duration_min;

insert into public.species_costs(species, name, emoji, cost, rate, weight, enabled) values
  ('chick',    'Küken',    '🐤', 50,         1,      100, true),
  ('chicken',  'Huhn',     '🐔', 250,        2,      100, true),
  ('rabbit',   'Hase',     '🐰', 1200,       8,      60,  true),
  ('pig',      'Schwein',  '🐷', 6000,       35,     30,  true),
  ('sheep',    'Schaf',    '🐑', 30000,      160,    30,  true),
  ('cow',      'Kuh',      '🐮', 150000,     800,    12,  true),
  ('horse',    'Pferd',    '🐴', 750000,     3800,   5,   true),
  ('scorpion', 'Skorpion', '🦂', 820000,     4200,   5,   true),
  ('panda',    'Panda',    '🐼', 4000000,    18000,  5,   true),
  ('tiger',    'Tiger',    '🐯', 20000000,   85000,  2,   true),
  ('lion',     'Löwe',     '🦁', 40000000,   170000, 1,   true),
  ('peacock',  'Peacock',  '🦚', 80000000,   380000, 1,   true),
  ('dragon',   'Drache',   '🐲', 100000000,  420000, 1,   true)
on conflict (species) do update set
  name = excluded.name, emoji = excluded.emoji, cost = excluded.cost,
  rate = excluded.rate, weight = excluded.weight, enabled = excluded.enabled;

insert into public.shop_state(id, rotates_at, updated_at, random_stock, forced_stock)
  values (1, now() + interval '5 minutes', 'epoch', '{}', '{}')
  on conflict (id) do nothing;
