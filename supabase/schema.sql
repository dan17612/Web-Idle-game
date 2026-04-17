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
