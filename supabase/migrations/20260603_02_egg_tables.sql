-- 20260603_02_egg_tables.sql
-- Egg catalog, drop pool, player inventory, incubation slot, trade linkage.

create table if not exists public.egg_types (
  egg_type           text primary key,
  name               text not null,
  emoji              text not null default '🥚',
  price_coins        bigint not null,
  enabled            boolean not null default true,
  shop_visible       boolean not null default true,
  shop_weight        int not null default 30,
  shop_stock_qty     int not null default 1,
  incubation_minutes int not null default 60
);

create table if not exists public.egg_drop_pool (
  egg_type text not null references public.egg_types(egg_type) on delete cascade,
  species  text not null references public.species_costs(species) on delete cascade,
  weight   int not null check (weight > 0),
  primary key (egg_type, species)
);

create table if not exists public.player_eggs (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users on delete cascade,
  egg_type    text not null references public.egg_types(egg_type),
  acquired_at timestamptz not null default now()
);
create index if not exists player_eggs_owner_idx on public.player_eggs(owner_id);

create table if not exists public.egg_incubations (
  user_id         uuid primary key references auth.users on delete cascade,
  egg_type        text not null references public.egg_types(egg_type),
  started_at      timestamptz not null default now(),
  ready_at        timestamptz not null,
  hatched_species text not null
);

create table if not exists public.trade_eggs (
  trade_id uuid not null references public.trades(id) on delete cascade,
  egg_id   uuid not null references public.player_eggs(id) on delete cascade,
  side     text not null check (side in ('requester','addressee')),
  primary key (trade_id, egg_id)
);
create index if not exists trade_eggs_egg_idx on public.trade_eggs(egg_id);

-- RLS
alter table public.egg_types       enable row level security;
alter table public.egg_drop_pool   enable row level security;
alter table public.player_eggs     enable row level security;
alter table public.egg_incubations enable row level security;
alter table public.trade_eggs      enable row level security;

drop policy if exists "read egg_types"      on public.egg_types;
drop policy if exists "read egg_drop_pool"  on public.egg_drop_pool;
drop policy if exists "own player_eggs"     on public.player_eggs;
drop policy if exists "own incubations"     on public.egg_incubations;
drop policy if exists "read trade_eggs"     on public.trade_eggs;

create policy "read egg_types"     on public.egg_types
  for select to authenticated using (true);
create policy "read egg_drop_pool" on public.egg_drop_pool
  for select to authenticated using (true);
create policy "own player_eggs"    on public.player_eggs
  for select to authenticated using (owner_id = auth.uid());
create policy "own incubations"    on public.egg_incubations
  for select to authenticated using (user_id = auth.uid());
create policy "read trade_eggs"    on public.trade_eggs
  for select to authenticated using (
    exists (select 1 from public.trades t
            where t.id = trade_eggs.trade_id
              and (t.requester_id = auth.uid() or t.addressee_id = auth.uid() or t.is_public))
  );

-- Initial Safari egg + drop pool (weights aligned to Task 1 rarity placement)
insert into public.egg_types
  (egg_type, name, emoji, price_coins, enabled, shop_visible, shop_weight, shop_stock_qty, incubation_minutes)
values
  ('safari', 'Safari-Ei', '🥚', 500000000, true, true, 30, 1, 60)
on conflict (egg_type) do nothing;

insert into public.egg_drop_pool (egg_type, species, weight) values
  ('safari','elephant',60),
  ('safari','zebra',25),
  ('safari','rhino',10),
  ('safari','giraffe',4),
  ('safari','hippo',1)
on conflict (egg_type, species) do nothing;

-- Realtime publication
do $$
begin
  begin
    alter publication supabase_realtime add table public.player_eggs;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.egg_incubations;
  exception when duplicate_object then null;
  end;
end $$;
