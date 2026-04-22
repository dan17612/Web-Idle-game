-- =============================================================================
-- Sammelmigration: Gift-Constraint, Case-insensitive Lookups, Advisor-Fixes
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. trade_offers: 0-Coin-Geschenke erlauben
-- -----------------------------------------------------------------------------
alter table public.trade_offers
  drop constraint if exists trade_offers_price_check;

alter table public.trade_offers
  add constraint trade_offers_price_check
  check (price >= 0);

-- -----------------------------------------------------------------------------
-- 2. Case-insensitive Username-Lookups in RPCs
-- -----------------------------------------------------------------------------
create or replace function public.send_coins(p_recipient text, p_amount bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  recipient uuid;
  recipient_name text := nullif(trim(p_recipient), '');
  sender_balance bigint;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_amount <= 0 then raise exception 'amount must be positive'; end if;
  if recipient_name is null then raise exception 'recipient not found'; end if;

  select id into recipient
    from public.profiles
    where lower(username) = lower(recipient_name);
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


create or replace function public.friend_request(p_username text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  target uuid;
  normalized_username text := nullif(trim(p_username), '');
  existing public.friendships%rowtype;
  new_row public.friendships%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if normalized_username is null then raise exception 'user not found'; end if;

  select id into target
    from public.profiles
    where lower(username) = lower(normalized_username);
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

  insert into public.friendships(requester_id, addressee_id)
    values (uid, target)
    returning * into new_row;

  return jsonb_build_object('status','pending','id',new_row.id);
end $$;

grant execute on function public.friend_request(text) to authenticated;


create or replace function public.create_trade_offer(
  p_animal_id uuid,
  p_price bigint,
  p_to_username text,
  p_wanted_species text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  animal public.animals%rowtype;
  target uuid := null;
  offer_id uuid;
  to_name text := nullif(trim(p_to_username), '');
  want text := nullif(p_wanted_species, '');
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_price < 0 then raise exception 'price cannot be negative'; end if;

  select * into animal from public.animals where id = p_animal_id and owner_id = uid;
  if not found then raise exception 'animal not found'; end if;
  if animal.equipped then raise exception 'animal is equipped'; end if;

  if want is not null
     and not exists(select 1 from public.species_costs where species = want) then
    raise exception 'unknown wanted species';
  end if;

  if exists (select 1 from public.trade_offers where animal_id = p_animal_id and status = 'open') then
    raise exception 'animal is already listed';
  end if;

  if to_name is not null then
    select id into target
      from public.profiles
      where lower(username) = lower(to_name);
    if target is null then raise exception 'recipient not found'; end if;
    if target = uid then raise exception 'cannot target yourself'; end if;
  end if;

  insert into public.trade_offers(seller_id, animal_id, species, price, to_user, wanted_species)
    values (uid, p_animal_id, animal.species, p_price, target, want)
    returning id into offer_id;

  return jsonb_build_object('offer_id', offer_id);
end $$;

grant execute on function public.create_trade_offer(uuid, bigint, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Advisor-Fixes: search_path, doppelte Policies, RLS initplan, FK-Indexes
-- -----------------------------------------------------------------------------

-- search_path für IMMUTABLE Helper-Funktionen
create or replace function public._next_offline_cost(p_level integer)
returns bigint language sql immutable set search_path = public as $$
  select floor(500 * power(2.5, greatest(coalesce(p_level, 1), 1) - 1))::bigint;
$$;

create or replace function public._offline_hours(p_level integer)
returns numeric language sql immutable set search_path = public as $$
  select least(8, 2 + (greatest(coalesce(p_level, 1), 1) - 1) * 0.5)::numeric;
$$;

create or replace function public._slot_cost(p_slot integer)
returns bigint language sql immutable set search_path = public as $$
  select case
    when p_slot <= 1 then 0
    when p_slot = 2 then 2500
    when p_slot = 3 then 15000
    when p_slot = 4 then 80000
    when p_slot = 5 then 400000
    when p_slot = 6 then 2000000
    when p_slot = 7 then 10000000
    when p_slot = 8 then 50000000
    when p_slot = 9 then 250000000
    when p_slot = 10 then 1000000000
    else null
  end::bigint;
$$;

create or replace function public._stock_qty(state public.shop_state, p_species text)
returns integer language sql immutable set search_path = public as $$
  select coalesce((state.random_stock->>p_species)::int, 0)
       + coalesce((state.forced_stock->>p_species)::int, 0);
$$;

-- Doppelte SELECT-Policy auf species_costs entfernen
drop policy if exists "species_public_read" on public.species_costs;

-- idx public read auf species_index war Sicherheitslücke (alle User sichtbar)
drop policy if exists "idx public read" on public.species_index;

-- RLS: auth.uid() → (select auth.uid()) für bessere Performance (initplan)
drop policy if exists "broadcasts_auth_read" on public.broadcasts;
create policy "broadcasts_auth_read" on public.broadcasts
  for select using ((select auth.uid()) is not null);

drop policy if exists "chest own read" on public.chest_purchases;
create policy "chest own read" on public.chest_purchases
  for select using ((select auth.uid()) = user_id);

drop policy if exists "friends self read" on public.friendships;
create policy "friends self read" on public.friendships
  for select using (
    (select auth.uid()) = requester_id or (select auth.uid()) = addressee_id
  );

drop policy if exists "gifts recipient read" on public.pending_gifts;
create policy "gifts recipient read" on public.pending_gifts
  for select using ((select auth.uid()) = recipient_id);

drop policy if exists "pets self read" on public.pets;
create policy "pets self read" on public.pets
  for select using ((select auth.uid()) = owner_id);

drop policy if exists "shop_purchases_self_read" on public.shop_purchases;
create policy "shop_purchases_self_read" on public.shop_purchases
  for select using (user_id = (select auth.uid()));

drop policy if exists "idx self read" on public.species_index;
create policy "idx self read" on public.species_index
  for select using ((select auth.uid()) = user_id);

drop policy if exists "hides owner all" on public.trade_hides;
create policy "hides owner all" on public.trade_hides
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "trades participants read" on public.trades;
create policy "trades participants read" on public.trades
  for select using (
    (select auth.uid()) = requester_id
    or (select auth.uid()) = addressee_id
    or (is_public = true and status = 'pending')
  );

drop policy if exists "tx self read" on public.transactions;
create policy "tx self read" on public.transactions
  for select using (
    (select auth.uid()) = from_user or (select auth.uid()) = to_user
  );

-- Fehlende Indexes für Foreign Keys
create index if not exists profiles_favorite_animal_id_idx on public.profiles(favorite_animal_id);
create index if not exists trade_offers_animal_id_idx on public.trade_offers(animal_id);
create index if not exists trade_offers_to_user_idx on public.trade_offers(to_user);
create index if not exists broadcasts_created_by_idx on public.broadcasts(created_by);
create index if not exists trade_hides_trade_id_idx on public.trade_hides(trade_id);
create index if not exists pending_gifts_created_by_idx on public.pending_gifts(created_by);
create index if not exists pending_gifts_species_idx on public.pending_gifts(species);
