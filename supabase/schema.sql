-- ====================================================================
-- Zoo Empire — Supabase Schema
-- Run this in the Supabase SQL Editor once to set up tables + RPCs.
-- ====================================================================

-- Profiles ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (char_length(username) between 3 and 24),
  coins bigint not null default 100 check (coins >= 0),
  last_collected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read"
  on public.profiles for select using (true);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create profile on signup ------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  u text;
begin
  u := coalesce(new.raw_user_meta_data->>'username',
                split_part(new.email, '@', 1));
  -- ensure unique
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

-- Animals ----------------------------------------------------------------
create table if not exists public.animals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  species text not null,
  level int not null default 1,
  acquired_at timestamptz not null default now()
);

create index if not exists animals_owner_idx on public.animals(owner_id);

alter table public.animals enable row level security;

drop policy if exists "animals public read" on public.animals;
create policy "animals public read"
  on public.animals for select using (true);
-- writes only through SECURITY DEFINER RPCs below.

-- Transactions (money sends, trades) -------------------------------------
create table if not exists public.transactions (
  id bigserial primary key,
  from_user uuid references public.profiles(id) on delete set null,
  to_user   uuid references public.profiles(id) on delete set null,
  amount bigint not null check (amount > 0),
  kind text not null check (kind in ('send','trade')),
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists tx_from_idx on public.transactions(from_user);
create index if not exists tx_to_idx on public.transactions(to_user);

alter table public.transactions enable row level security;

drop policy if exists "tx self read" on public.transactions;
create policy "tx self read"
  on public.transactions for select
  using (auth.uid() = from_user or auth.uid() = to_user);

-- Trade offers -----------------------------------------------------------
create table if not exists public.trade_offers (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  animal_id uuid not null references public.animals(id) on delete cascade,
  species text not null,
  price bigint not null check (price > 0),
  to_user uuid references public.profiles(id) on delete set null,
  status text not null default 'open' check (status in ('open','sold','cancelled')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists offers_status_idx on public.trade_offers(status);
create index if not exists offers_seller_idx on public.trade_offers(seller_id);

alter table public.trade_offers enable row level security;

drop policy if exists "offers public read" on public.trade_offers;
create policy "offers public read"
  on public.trade_offers for select using (true);

-- View with usernames for convenience ------------------------------------
create or replace view public.trade_offers_with_names as
select
  o.id, o.seller_id, o.animal_id, o.species, o.price, o.status,
  o.created_at, o.closed_at, o.to_user,
  ps.username as seller_username,
  pt.username as to_username
from public.trade_offers o
join public.profiles ps on ps.id = o.seller_id
left join public.profiles pt on pt.id = o.to_user;

alter view public.trade_offers_with_names set (security_invoker = on);

grant select on public.trade_offers_with_names to anon, authenticated;

-- RPC: buy_animal --------------------------------------------------------
create or replace function public.buy_animal(p_species text, p_cost bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  new_animal public.animals%rowtype;
  new_balance bigint;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_cost <= 0 then raise exception 'invalid cost'; end if;

  update public.profiles
    set coins = coins - p_cost
    where id = uid and coins >= p_cost
    returning coins into new_balance;

  if new_balance is null then raise exception 'insufficient coins'; end if;

  insert into public.animals(owner_id, species)
    values (uid, p_species)
    returning * into new_animal;

  return jsonb_build_object(
    'coins', new_balance,
    'animal', to_jsonb(new_animal)
  );
end $$;

grant execute on function public.buy_animal(text, bigint) to authenticated;

-- RPC: send_coins --------------------------------------------------------
create or replace function public.send_coins(p_recipient text, p_amount bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  recipient uuid;
  sender_balance bigint;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_amount <= 0 then raise exception 'amount must be positive'; end if;

  select id into recipient from public.profiles where username = p_recipient;
  if recipient is null then raise exception 'recipient not found'; end if;
  if recipient = uid then raise exception 'cannot send to yourself'; end if;

  update public.profiles
    set coins = coins - p_amount
    where id = uid and coins >= p_amount
    returning coins into sender_balance;

  if sender_balance is null then raise exception 'insufficient coins'; end if;

  update public.profiles set coins = coins + p_amount where id = recipient;

  insert into public.transactions(from_user, to_user, amount, kind)
    values (uid, recipient, p_amount, 'send');

  return jsonb_build_object('sender_balance', sender_balance);
end $$;

grant execute on function public.send_coins(text, bigint) to authenticated;

-- RPC: create_trade_offer ------------------------------------------------
create or replace function public.create_trade_offer(
  p_animal_id uuid, p_price bigint, p_to_username text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  animal public.animals%rowtype;
  target uuid := null;
  offer_id uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_price <= 0 then raise exception 'price must be positive'; end if;

  select * into animal from public.animals where id = p_animal_id and owner_id = uid;
  if not found then raise exception 'animal not found'; end if;

  if exists (select 1 from public.trade_offers where animal_id = p_animal_id and status = 'open') then
    raise exception 'animal is already listed';
  end if;

  if p_to_username is not null and p_to_username <> '' then
    select id into target from public.profiles where username = p_to_username;
    if target is null then raise exception 'recipient not found'; end if;
    if target = uid then raise exception 'cannot target yourself'; end if;
  end if;

  insert into public.trade_offers(seller_id, animal_id, species, price, to_user)
    values (uid, p_animal_id, animal.species, p_price, target)
    returning id into offer_id;

  return jsonb_build_object('offer_id', offer_id);
end $$;

grant execute on function public.create_trade_offer(uuid, bigint, text) to authenticated;

-- RPC: accept_trade_offer ------------------------------------------------
create or replace function public.accept_trade_offer(p_offer_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  offer public.trade_offers%rowtype;
  buyer_balance bigint;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select * into offer from public.trade_offers where id = p_offer_id for update;
  if not found then raise exception 'offer not found'; end if;
  if offer.status <> 'open' then raise exception 'offer not available'; end if;
  if offer.seller_id = uid then raise exception 'cannot buy your own offer'; end if;
  if offer.to_user is not null and offer.to_user <> uid then
    raise exception 'offer is reserved for another player';
  end if;

  update public.profiles
    set coins = coins - offer.price
    where id = uid and coins >= offer.price
    returning coins into buyer_balance;

  if buyer_balance is null then raise exception 'insufficient coins'; end if;

  update public.profiles set coins = coins + offer.price where id = offer.seller_id;
  update public.animals set owner_id = uid where id = offer.animal_id;
  update public.trade_offers set status = 'sold', closed_at = now() where id = offer.id;

  insert into public.transactions(from_user, to_user, amount, kind, meta)
    values (uid, offer.seller_id, offer.price, 'trade',
            jsonb_build_object('animal_id', offer.animal_id, 'species', offer.species));

  return jsonb_build_object('coins', buyer_balance);
end $$;

grant execute on function public.accept_trade_offer(uuid) to authenticated;

-- RPC: cancel_trade_offer ------------------------------------------------
create or replace function public.cancel_trade_offer(p_offer_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;

  update public.trade_offers
    set status = 'cancelled', closed_at = now()
    where id = p_offer_id and seller_id = uid and status = 'open';

  if not found then raise exception 'offer not found or already closed'; end if;
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.cancel_trade_offer(uuid) to authenticated;

-- ====================================================================
-- Shop Rotation & Admin Restock (Migration: shop_rotation)
-- ====================================================================

alter table public.profiles add column if not exists is_admin boolean not null default false;

create table if not exists public.shop_state (
  id int primary key default 1,
  available_species text[] not null default '{}',
  rotates_at timestamptz not null default now() + interval '4 hours',
  updated_at timestamptz not null default now(),
  constraint shop_state_single_row check (id = 1)
);
insert into public.shop_state (id) values (1) on conflict (id) do nothing;

alter table public.shop_state enable row level security;
drop policy if exists "shop_state public read" on public.shop_state;
create policy "shop_state public read" on public.shop_state for select using (true);

create or replace function public._rotate_shop_random(p_count int default 5)
returns public.shop_state language plpgsql security definer set search_path = public as $$
declare
  picked text[];
  result public.shop_state;
begin
  select array_agg(species) into picked
  from (
    select species from public.species_costs order by random() limit p_count
  ) s;
  update public.shop_state
    set available_species = coalesce(picked, '{}'),
        rotates_at = now() + interval '4 hours',
        updated_at = now()
    where id = 1
    returning * into result;
  return result;
end $$;

create or replace function public.get_shop()
returns jsonb language plpgsql security definer set search_path = public as $$
declare state public.shop_state;
begin
  select * into state from public.shop_state where id = 1;
  if state.rotates_at <= now() or coalesce(array_length(state.available_species, 1), 0) = 0 then
    state := public._rotate_shop_random(5);
  end if;
  return jsonb_build_object('available', state.available_species, 'rotates_at', state.rotates_at);
end $$;
grant execute on function public.get_shop() to anon, authenticated;

create or replace function public.admin_restock(
  p_species text[] default null,
  p_count int default 5
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  is_admin bool;
  state public.shop_state;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select p.is_admin into is_admin from public.profiles p where p.id = uid;
  if not coalesce(is_admin, false) then raise exception 'admin only'; end if;

  if p_species is not null and array_length(p_species, 1) > 0 then
    if exists (
      select 1 from unnest(p_species) s
      where not exists (select 1 from public.species_costs where species = s)
    ) then raise exception 'unknown species in list'; end if;
    update public.shop_state
      set available_species = p_species,
          rotates_at = now() + interval '4 hours',
          updated_at = now()
      where id = 1
      returning * into state;
  else
    state := public._rotate_shop_random(greatest(1, coalesce(p_count, 5)));
  end if;
  return jsonb_build_object('available', state.available_species, 'rotates_at', state.rotates_at);
end $$;
grant execute on function public.admin_restock(text[], int) to authenticated;

-- buy_animal: prüft jetzt auch die Shop-Rotation
create or replace function public.buy_animal(p_species text, p_cost bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  real_cost bigint;
  new_animal public.animals%rowtype;
  new_balance bigint;
  state public.shop_state;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select cost into real_cost from public.species_costs where species = p_species;
  if real_cost is null then raise exception 'unknown species'; end if;

  select * into state from public.shop_state where id = 1;
  if state.rotates_at <= now() then state := public._rotate_shop_random(5); end if;
  if not (p_species = any(state.available_species)) then
    raise exception 'species not in current shop rotation';
  end if;

  update public.profiles
    set coins = coins - real_cost
    where id = uid and coins >= real_cost
    returning coins into new_balance;
  if new_balance is null then raise exception 'insufficient coins'; end if;

  insert into public.animals(owner_id, species)
    values (uid, p_species) returning * into new_animal;

  return jsonb_build_object('coins', new_balance, 'animal', to_jsonb(new_animal));
end $$;

-- ====================================================================
-- 5-Minuten-Raster + Aktivieren/Deaktivieren + Forced Species
-- (Migration: shop_5min_grid_and_forced)
-- ====================================================================

alter table public.species_costs add column if not exists enabled boolean not null default true;
alter table public.shop_state   add column if not exists forced_species text[] not null default '{}';

-- Aktueller 5-Minuten-Slot (z.B. 12:20:00, 12:25:00 …)
create or replace function public._current_slot()
returns timestamptz language sql stable parallel safe set search_path = public as $$
  select to_timestamp(floor(extract(epoch from now()) / 300) * 300);
$$;

-- Slot-synchrone, deterministische Rotation
create or replace function public._rotate_if_needed()
returns public.shop_state language plpgsql security definer set search_path = public as $$
declare
  slot      timestamptz := public._current_slot();
  next_slot timestamptz := slot + interval '5 minutes';
  state     public.shop_state;
  picked    text[];
  forced    text[];
  needed    int;
begin
  select * into state from public.shop_state where id = 1 for update;
  if state.updated_at < slot then
    forced := coalesce(state.forced_species, '{}');
    needed := greatest(0, 5 - coalesce(array_length(forced, 1), 0));
    if needed > 0 then
      select array_agg(species) into picked
      from (
        select sc.species from public.species_costs sc
        where sc.enabled and not (sc.species = any(forced))
        order by md5(sc.species || extract(epoch from slot)::text)
        limit needed
      ) s;
    else picked := '{}'; end if;
    update public.shop_state
      set available_species = coalesce(forced,'{}') || coalesce(picked,'{}'),
          rotates_at = next_slot,
          updated_at = slot
      where id = 1
      returning * into state;
  end if;
  return state;
end $$;

create or replace function public.get_shop()
returns jsonb language plpgsql security definer set search_path = public as $$
declare state public.shop_state;
begin
  state := public._rotate_if_needed();
  return jsonb_build_object(
    'available',  state.available_species,
    'forced',     state.forced_species,
    'rotates_at', state.rotates_at,
    'server_now', now()
  );
end $$;
grant execute on function public.get_shop() to anon, authenticated;

-- buy_animal prüft aktuelle Rotation
create or replace function public.buy_animal(p_species text, p_cost bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  real_cost bigint;
  new_animal public.animals%rowtype;
  new_balance bigint;
  state public.shop_state;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select cost into real_cost from public.species_costs where species = p_species;
  if real_cost is null then raise exception 'unknown species'; end if;

  state := public._rotate_if_needed();
  if not (p_species = any(state.available_species)) then
    raise exception 'species not in current shop rotation';
  end if;

  update public.profiles set coins = coins - real_cost
    where id = uid and coins >= real_cost returning coins into new_balance;
  if new_balance is null then raise exception 'insufficient coins'; end if;

  insert into public.animals(owner_id, species) values (uid, p_species) returning * into new_animal;
  return jsonb_build_object('coins', new_balance, 'animal', to_jsonb(new_animal));
end $$;

-- Admin RPCs --------------------------------------------------------------
create or replace function public.admin_set_species_enabled(p_species text, p_enabled boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); is_admin bool;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select p.is_admin into is_admin from public.profiles p where p.id = uid;
  if not coalesce(is_admin,false) then raise exception 'admin only'; end if;
  update public.species_costs set enabled = p_enabled where species = p_species;
  if not found then raise exception 'unknown species'; end if;
  return jsonb_build_object('species', p_species, 'enabled', p_enabled);
end $$;
grant execute on function public.admin_set_species_enabled(text, boolean) to authenticated;

create or replace function public.admin_force_add(p_species text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); is_admin bool; state public.shop_state; slot timestamptz := public._current_slot();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select p.is_admin into is_admin from public.profiles p where p.id = uid;
  if not coalesce(is_admin,false) then raise exception 'admin only'; end if;
  if not exists(select 1 from public.species_costs where species = p_species) then
    raise exception 'unknown species'; end if;
  update public.shop_state
    set forced_species = case when p_species = any(forced_species) then forced_species else forced_species || array[p_species] end,
        available_species = case when p_species = any(available_species) then available_species else available_species || array[p_species] end,
        updated_at = slot
    where id = 1 returning * into state;
  return jsonb_build_object('forced', state.forced_species, 'available', state.available_species);
end $$;
grant execute on function public.admin_force_add(text) to authenticated;

create or replace function public.admin_force_remove(p_species text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); is_admin bool; state public.shop_state;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select p.is_admin into is_admin from public.profiles p where p.id = uid;
  if not coalesce(is_admin,false) then raise exception 'admin only'; end if;
  update public.shop_state
    set forced_species = array_remove(forced_species, p_species),
        available_species = array_remove(available_species, p_species)
    where id = 1 returning * into state;
  return jsonb_build_object('forced', state.forced_species, 'available', state.available_species);
end $$;
grant execute on function public.admin_force_remove(text) to authenticated;

create or replace function public.admin_force_rotation()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); is_admin bool; state public.shop_state;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select p.is_admin into is_admin from public.profiles p where p.id = uid;
  if not coalesce(is_admin,false) then raise exception 'admin only'; end if;
  update public.shop_state set updated_at = 'epoch' where id = 1;
  state := public._rotate_if_needed();
  return jsonb_build_object('available', state.available_species, 'forced', state.forced_species, 'rotates_at', state.rotates_at);
end $$;
grant execute on function public.admin_force_rotation() to authenticated;

drop function if exists public.admin_restock(text[], int);
drop function if exists public._rotate_shop_random(int);

-- ====================================================================
-- Gewichtete Rotation (Migration: species_weights)
-- Höhere weight = höhere Wahrscheinlichkeit im Shop zu erscheinen.
-- Auswahl per Efraimidis-Spirakis (deterministisch pro Slot).
-- ====================================================================

alter table public.species_costs
  add column if not exists weight int not null default 10 check (weight > 0);

update public.species_costs set weight = case
  when cost <=       500 then 100
  when cost <=      5000 then  60
  when cost <=     50000 then  30
  when cost <=    500000 then  12
  when cost <=   5000000 then   5
  when cost <=  50000000 then   2
  else                           1
end
where weight = 10;

create or replace function public._rotate_if_needed()
returns public.shop_state language plpgsql security definer set search_path = public as $$
declare
  slot      timestamptz := public._current_slot();
  next_slot timestamptz := slot + interval '5 minutes';
  state     public.shop_state;
  picked    text[];
  forced    text[];
  needed    int;
begin
  select * into state from public.shop_state where id = 1 for update;
  if state.updated_at < slot then
    forced := coalesce(state.forced_species, '{}');
    needed := greatest(0, 5 - coalesce(array_length(forced, 1), 0));
    if needed > 0 then
      select array_agg(species order by score desc) into picked
      from (
        select sc.species,
          power(
            greatest(
              (abs(('x' || substr(md5(sc.species || extract(epoch from slot)::text), 1, 8))::bit(32)::int) % 1000000 + 1) / 1000001.0,
              1e-9
            ),
            1.0 / sc.weight
          ) as score
        from public.species_costs sc
        where sc.enabled and not (sc.species = any(forced))
        order by score desc
        limit needed
      ) s;
    else picked := '{}'; end if;
    update public.shop_state
      set available_species = coalesce(forced,'{}') || coalesce(picked,'{}'),
          rotates_at = next_slot,
          updated_at = slot
      where id = 1
      returning * into state;
  end if;
  return state;
end $$;

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

-- ====================================================================
-- Fix (Migration: fix_buy_animal_array_comparison)
-- Vorherige Version verglich text mit text[] in einer OR-Klausel, was
-- in Postgres nicht erlaubt ist. Sauber umgeschrieben: Preis immer aus
-- species_costs holen, Verfügbarkeit über _rotate_if_needed() prüfen
-- (available_species enthält bereits die forced_species).
-- ====================================================================

create or replace function public.buy_animal(p_species text, p_cost bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid         uuid := auth.uid();
  real_cost   bigint;
  new_animal  public.animals%rowtype;
  new_balance bigint;
  state       public.shop_state;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select cost into real_cost from public.species_costs where species = p_species;
  if real_cost is null then raise exception 'unknown species'; end if;

  state := public._rotate_if_needed();
  if not (p_species = any(state.available_species)) then
    raise exception 'species not in current shop rotation';
  end if;

  update public.profiles
    set coins = coins - real_cost
    where id = uid and coins >= real_cost
    returning coins into new_balance;
  if new_balance is null then raise exception 'insufficient coins'; end if;

  insert into public.animals(owner_id, species)
    values (uid, p_species)
    returning * into new_animal;

  return jsonb_build_object('coins', new_balance, 'animal', to_jsonb(new_animal));
end $$;

-- ====================================================================
-- Freundes-System (Migration: friends_system)
-- ====================================================================

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendship_pair_unique unique (requester_id, addressee_id),
  constraint friendship_not_self check (requester_id <> addressee_id)
);
create index if not exists friendships_req_idx on public.friendships(requester_id);
create index if not exists friendships_add_idx on public.friendships(addressee_id);

alter table public.friendships enable row level security;
drop policy if exists "friends self read" on public.friendships;
create policy "friends self read" on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create or replace view public.friends_view as
  select f.id as friendship_id, f.status, f.created_at, f.responded_at,
    case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end as friend_id,
    case when f.requester_id = auth.uid() then pa.username else pr.username end as friend_username,
    case when f.requester_id = auth.uid() then pa.coins   else pr.coins   end as friend_coins,
    case when f.requester_id = auth.uid() then 'outgoing' else 'incoming' end as direction
  from public.friendships f
  join public.profiles pr on pr.id = f.requester_id
  join public.profiles pa on pa.id = f.addressee_id
  where f.requester_id = auth.uid() or f.addressee_id = auth.uid();
alter view public.friends_view set (security_invoker = on);
grant select on public.friends_view to authenticated;

create or replace function public.friend_request(p_username text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); target uuid; existing public.friendships%rowtype; new_row public.friendships%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select id into target from public.profiles where username = p_username;
  if target is null then raise exception 'user not found'; end if;
  if target = uid then raise exception 'cannot friend yourself'; end if;
  select * into existing from public.friendships
    where (requester_id = uid and addressee_id = target)
       or (requester_id = target and addressee_id = uid) limit 1;
  if existing.id is not null then
    if existing.addressee_id = uid and existing.status = 'pending' then
      update public.friendships set status='accepted', responded_at=now()
        where id = existing.id returning * into new_row;
      return jsonb_build_object('status','accepted','id',new_row.id);
    end if;
    return jsonb_build_object('status',existing.status,'id',existing.id);
  end if;
  insert into public.friendships(requester_id, addressee_id) values (uid, target) returning * into new_row;
  return jsonb_build_object('status','pending','id',new_row.id);
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
