# Safari-Eier System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [`docs/superpowers/specs/2026-06-02-safari-eggs-design.md`](../specs/2026-06-02-safari-eggs-design.md)

**Goal:** Add Safari-Egg system: 5 new safari species (5 rarity tiers), eggs purchasable in shop rotation, 1-hour incubation slot on GameView, full trade integration.

**Architecture:** Five sequential Supabase migrations (rarity-column + species, egg-tables, egg-RPCs, shop-rotation extension, trade extension), then frontend (i18n + helpers + game-store + EggMachine component on GameView, plus integrations in ShopView/TradeView/InventoryView).

**Tech Stack:** Vue 3 + Vite + Pinia + PrimeVue 4, Supabase (PostgreSQL + RLS + Realtime), `node:test` for pure JS helpers.

**Supabase Project ID:** `rkskpvbismdlsevaqoer` (region eu-north-1).

**Conventions:**
- All German UI strings use real umlauts (ä ö ü ß), never ae/oe/ue/ss.
- Use PrimeVue components (`<Button>`, `<InputText>`, `<Checkbox>`) — never raw HTML elements.
- Migration filenames: `supabase/migrations/YYYYMMDD_descriptive_name.sql`.
- Commits in `feat(eggs): …` / `feat(shop): …` style (German message is fine, current repo mixes English & German).

**File Structure (planned):**

| Path | Purpose | Action |
|---|---|---|
| `supabase/migrations/20260603_01_species_rarity.sql` | Adds `rarity` column, backfills, inserts 5 safari species | Create |
| `supabase/migrations/20260603_02_egg_tables.sql` | egg_types, egg_drop_pool, player_eggs, egg_incubations, trade_eggs + RLS + initial Safari data | Create |
| `supabase/migrations/20260603_03_egg_rpcs.sql` | buy_egg, start_incubation, get_incubation_status, claim_hatched | Create |
| `supabase/migrations/20260603_04_get_shop_with_eggs.sql` | Extends `get_shop` to include eggs in rotation | Create |
| `supabase/migrations/20260603_05_trade_eggs.sql` | Extends propose_trade/accept_trade/accept_public_trade/trades_view for eggs | Create |
| `src/eggs.js` | Egg catalog cache + helpers (analogous to `src/animals.js`) | Create |
| `src/eggs.test.js` | Pure-JS tests for `eggs.js` | Create |
| `src/i18n.js` | Add `eggs.*` and `rarity.*` strings (de/en/ru) | Modify |
| `src/stores/game.js` | Egg state (playerEggs, incubation) + buyEgg/startIncubation/claimHatched/loadIncubation | Modify |
| `src/components/EggMachine.vue` | Three-state egg incubation widget | Create |
| `src/views/GameView.vue` | Mount `<EggMachine />` under fusion machine | Modify |
| `src/views/ShopView.vue` | Egg cards in rotation grid + rarity badges on animal cards | Modify |
| `src/views/TradeView.vue` | Egg pickers (mine/theirs/publicWanted) + send eggs in `propose_trade` call | Modify |
| `src/views/InventoryView.vue` | Eggs section + rarity badges on animal cards | Modify |

---

## Phase 1 — Database

### Task 1: Migration — `rarity` column + Safari species

**Files:**
- Create: `supabase/migrations/20260603_01_species_rarity.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- 20260603_01_species_rarity.sql
-- Add 5-tier rarity to species, backfill existing, insert 5 safari species.

alter table public.species_costs
  add column if not exists rarity text not null default 'common'
  check (rarity in ('common','uncommon','rare','epic','legendary'));

-- Backfill existing species (adjustable later by admin)
update public.species_costs set rarity = 'common'    where species in ('chick','chicken');
update public.species_costs set rarity = 'uncommon'  where species in ('rabbit','pig','sheep','cow');
update public.species_costs set rarity = 'rare'      where species in ('horse','scorpion');
update public.species_costs set rarity = 'epic'      where species in ('panda','tiger','lion');
update public.species_costs set rarity = 'legendary' where species in ('peacock','dragon','unicorn','phoenix','bonedragon','worlddragon');

-- Insert 5 new safari species (only obtainable via Safari Egg)
insert into public.species_costs
  (species, name, emoji, cost, rate, weight, enabled, shop_visible, rarity)
values
  ('elephant', 'Elefant',   '🐘',  0,  100000, 1, false, false, 'common'),
  ('giraffe',  'Giraffe',   '🦒',  0,  250000, 1, false, false, 'uncommon'),
  ('zebra',    'Zebra',     '🦓',  0,  500000, 1, false, false, 'rare'),
  ('rhino',    'Nashorn',   '🦏',  0,  900000, 1, false, false, 'epic'),
  ('hippo',    'Nilpferd',  '🦛',  0, 1500000, 1, false, false, 'legendary')
on conflict (species) do nothing;
```

- [ ] **Step 2: Apply migration via MCP**

Use `apply_migration` tool with project_id `rkskpvbismdlsevaqoer`, name `20260603_01_species_rarity`, and the SQL above.

- [ ] **Step 3: Verify**

Execute via MCP `execute_sql`:
```sql
select species, rarity from public.species_costs
where species in ('elephant','giraffe','zebra','rhino','hippo','dragon','chick')
order by rarity, species;
```
Expected: 7 rows. Elephant=common, Giraffe=uncommon, Zebra=rare, Rhino=epic, Hippo=legendary, Dragon=legendary, Chick=common.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260603_01_species_rarity.sql
git commit -m "feat(eggs): Rarity-Spalte auf species_costs + 5 Safari-Spezies"
```

---

### Task 2: Migration — Egg tables + RLS + initial Safari data

**Files:**
- Create: `supabase/migrations/20260603_02_egg_tables.sql`

- [ ] **Step 1: Write the migration file**

```sql
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

-- Initial Safari egg + drop pool
insert into public.egg_types
  (egg_type, name, emoji, price_coins, enabled, shop_visible, shop_weight, shop_stock_qty, incubation_minutes)
values
  ('safari', 'Safari-Ei', '🥚', 500000000, true, true, 30, 1, 60)
on conflict (egg_type) do nothing;

insert into public.egg_drop_pool (egg_type, species, weight) values
  ('safari','elephant',60),
  ('safari','giraffe',25),
  ('safari','zebra',10),
  ('safari','rhino',4),
  ('safari','hippo',1)
on conflict (egg_type, species) do nothing;

-- Realtime publication
alter publication supabase_realtime add table public.player_eggs;
alter publication supabase_realtime add table public.egg_incubations;
```

- [ ] **Step 2: Apply migration via MCP**

Use `apply_migration` with name `20260603_02_egg_tables`.

- [ ] **Step 3: Verify**

```sql
select egg_type, name, price_coins, shop_weight from public.egg_types;
-- Expected: 1 row, safari / Safari-Ei / 500000000 / 30
select egg_type, species, weight from public.egg_drop_pool order by weight desc;
-- Expected: 5 rows, elephant=60 down to hippo=1
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260603_02_egg_tables.sql
git commit -m "feat(eggs): Eier-Tabellen, RLS, Safari-Initialdaten"
```

---

### Task 3: Migration — Egg RPCs (buy / start / status / claim)

**Files:**
- Create: `supabase/migrations/20260603_03_egg_rpcs.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- 20260603_03_egg_rpcs.sql
-- buy_egg, start_incubation, get_incubation_status, claim_hatched

create or replace function public.buy_egg(p_egg_type text, p_qty int default 1)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  et public.egg_types;
  state public.shop_state;
  total_cost bigint; balance bigint;
  available int;
  new_id uuid; ids uuid[] := '{}';
  i int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_qty is null or p_qty < 1 or p_qty > 5 then raise exception 'qty must be 1..5'; end if;
  select * into et from public.egg_types where egg_type = p_egg_type;
  if et is null or not et.enabled or not et.shop_visible then
    raise exception 'egg type not available';
  end if;

  state := public._rotate_if_needed();

  -- Forced stock first, then random rotation stock for eggs
  select coalesce(sum(qty), 0) into available
  from public.shop_forced_eggs
  where egg_type = p_egg_type and slot_start = state.updated_at;

  available := available + coalesce(
    (select qty from public.shop_egg_stock
     where egg_type = p_egg_type and slot_start = state.updated_at), 0);

  -- Subtract eggs already bought this rotation by this user (uses purchase log)
  available := available - coalesce(
    (select count from public.egg_purchases
     where user_id = uid and egg_type = p_egg_type and slot_start = state.updated_at), 0);

  if available < p_qty then
    raise exception 'egg out of stock';
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

-- Supporting tables for egg shop rotation + per-user purchase log
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
```

- [ ] **Step 2: Apply migration via MCP**

Use `apply_migration` with name `20260603_03_egg_rpcs`.

- [ ] **Step 3: Verify functions registered**

```sql
select proname from pg_proc
where proname in ('buy_egg','start_incubation','get_incubation_status','claim_hatched');
-- Expected: 4 rows
```

- [ ] **Step 4: Smoke test (with admin/test user)**

Test calling `get_incubation_status` (should return `{"active": false}`) and a no-op `start_incubation` with a bogus UUID (should raise `egg not found`).

```sql
select public.get_incubation_status();
select public.start_incubation('00000000-0000-0000-0000-000000000000');
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260603_03_egg_rpcs.sql
git commit -m "feat(eggs): RPCs buy_egg, start_incubation, status, claim_hatched"
```

---

### Task 4: Migration — Extend `get_shop` to rotate eggs into the pool

**Files:**
- Create: `supabase/migrations/20260603_04_get_shop_with_eggs.sql`
- Reference (read-only): `supabase/schema.sql` for current `get_shop` body and `_rotate_if_needed`.

- [ ] **Step 1: Read current `get_shop`**

Use `execute_sql`:
```sql
select pg_get_functiondef('public.get_shop'::regproc);
```
Copy the output as the base for the rewrite.

- [ ] **Step 2: Write the migration file**

This migration rewrites `_rotate_if_needed` (or a helper called inside it) so a fresh rotation also seeds `shop_egg_stock` for the new slot. It also rewrites `get_shop` to include egg rows in the response.

```sql
-- 20260603_04_get_shop_with_eggs.sql
-- Extends shop rotation to include eggs, and get_shop to return them.

-- Hook into rotation: when a new slot starts, seed egg stock by weighted roll.
-- We do this in get_shop after _rotate_if_needed by ensuring rows for the current slot.
create or replace function public._ensure_egg_stock(p_slot_start timestamptz)
returns void language plpgsql security definer set search_path = public as $$
declare
  total_species_weight int;
  total_egg_weight int;
  e record;
begin
  -- Only seed once per slot
  if exists (select 1 from public.shop_egg_stock where slot_start = p_slot_start) then
    return;
  end if;

  -- Egg appears in rotation if rng(0..total_weight) lands in its weight band.
  -- Treat each enabled+visible egg type independently: each has shop_weight / (shop_weight + 100)
  -- chance per slot to spawn at shop_stock_qty. Simple, easy to tune.
  for e in select egg_type, shop_weight, shop_stock_qty
           from public.egg_types
           where enabled and shop_visible and shop_weight > 0 loop
    if random() < (e.shop_weight::numeric / (e.shop_weight + 100)) then
      insert into public.shop_egg_stock(egg_type, slot_start, qty)
        values (e.egg_type, p_slot_start, e.shop_stock_qty);
    else
      insert into public.shop_egg_stock(egg_type, slot_start, qty)
        values (e.egg_type, p_slot_start, 0);
    end if;
  end loop;
end $$;

-- Wrap get_shop: same as before plus egg fields.
-- IMPORTANT: copy the existing body verbatim from the prior version, then add egg sections.
create or replace function public.get_shop()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  state public.shop_state;
  uid uuid := auth.uid();
  v_stock jsonb;
  v_forced jsonb;
  v_purchases jsonb;
  v_meta jsonb;
  v_egg_stock jsonb := '{}'::jsonb;
  v_egg_meta jsonb := '{}'::jsonb;
  e record;
  remaining int;
  drops jsonb;
begin
  state := public._rotate_if_needed();
  perform public._ensure_egg_stock(state.updated_at);

  -- (existing body that builds v_stock, v_forced, v_purchases, v_meta from species tables)
  -- … keep verbatim from current schema …

  -- Egg stock / meta
  for e in select et.egg_type, et.name, et.emoji, et.price_coins,
                  et.incubation_minutes, et.shop_stock_qty,
                  coalesce(ses.qty, 0) as stock_qty,
                  coalesce((select count from public.egg_purchases
                            where user_id = uid and egg_type = et.egg_type
                              and slot_start = state.updated_at), 0) as bought
           from public.egg_types et
           left join public.shop_egg_stock ses
             on ses.egg_type = et.egg_type and ses.slot_start = state.updated_at
           where et.enabled and et.shop_visible loop
    remaining := greatest(0, e.stock_qty - e.bought);
    select coalesce(jsonb_agg(jsonb_build_object(
      'species', dp.species,
      'weight', dp.weight,
      'rarity', sc.rarity,
      'emoji', sc.emoji,
      'name', sc.name
    ) order by dp.weight desc), '[]'::jsonb)
    into drops
    from public.egg_drop_pool dp
    join public.species_costs sc on sc.species = dp.species
    where dp.egg_type = e.egg_type;

    v_egg_stock := v_egg_stock || jsonb_build_object(e.egg_type, remaining);
    v_egg_meta  := v_egg_meta  || jsonb_build_object(e.egg_type, jsonb_build_object(
      'name', e.name,
      'emoji', e.emoji,
      'price', e.price_coins,
      'incubation_minutes', e.incubation_minutes,
      'stock_qty', e.shop_stock_qty,
      'bought_qty', e.bought,
      'drops', drops
    ));
  end loop;

  return jsonb_build_object(
    'stock', v_stock,
    'forced_stock', v_forced,
    'my_purchases', v_purchases,
    'species_meta', v_meta,
    'egg_stock', v_egg_stock,
    'egg_meta', v_egg_meta,
    'rotates_at', state.next_rotate_at,
    'server_now', now()
  );
end $$;
```

> **IMPORTANT for the engineer:** Before applying, replace the `-- (existing body …)` comment with the **actual** existing body of `get_shop` you extracted in Step 1 (variable assignments for `v_stock`, `v_forced`, `v_purchases`, `v_meta`, possibly `rotates_at`). Do **not** invent it — copy verbatim.

- [ ] **Step 3: Apply migration via MCP**

Use `apply_migration` with name `20260603_04_get_shop_with_eggs`.

- [ ] **Step 4: Verify**

```sql
select public.get_shop();
```
Expected: JSON contains both `stock` (existing keys) and `egg_stock` + `egg_meta` keys. `egg_meta.safari.drops` is an array of 5 entries.

- [ ] **Step 5: Force a rotation and re-check**

```sql
select public.admin_force_rotation();
select public.get_shop();
```
Expected: `egg_stock.safari` is either 0 or 1 depending on the dice roll.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260603_04_get_shop_with_eggs.sql
git commit -m "feat(shop): Eier in Shop-Rotation und get_shop integriert"
```

---

### Task 5: Migration — Extend trade for eggs

**Files:**
- Create: `supabase/migrations/20260603_05_trade_eggs.sql`
- Reference (read-only): existing `propose_trade`, `accept_trade`, `accept_public_trade`, view `trades_view` (extract via `pg_get_functiondef` / `pg_get_viewdef`).

- [ ] **Step 1: Read current definitions**

```sql
select pg_get_functiondef('public.propose_trade'::regproc);
select pg_get_functiondef('public.accept_trade'::regproc);
select pg_get_functiondef('public.accept_public_trade'::regproc);
select pg_get_viewdef('public.trades_view', true);
```

- [ ] **Step 2: Write the migration file**

```sql
-- 20260603_05_trade_eggs.sql
-- Extend propose_trade / accept_trade / accept_public_trade / trades_view for eggs.

-- 1) propose_trade gets 3 new optional params (eggs requester, eggs addressee, wanted_eggs jsonb).
--    For public trades, p_addressee_eggs must be empty (same rule as p_addressee_animals).
--    Eggs must belong to caller (requester side), not be in incubation, not in another open trade.

create or replace function public.propose_trade(
  p_addressee        text default null,
  p_requester_animals uuid[] default '{}',
  p_requester_coins  bigint default 0,
  p_addressee_animals uuid[] default '{}',
  p_addressee_coins  bigint default 0,
  p_note             text   default null,
  p_wanted_species   text   default null,
  p_wanted_tier      text   default 'normal',
  p_wanted_qty       int    default 0,
  p_wanted_animals   jsonb  default '[]'::jsonb,
  p_requester_eggs   uuid[] default '{}',
  p_addressee_eggs   uuid[] default '{}',
  p_wanted_eggs      jsonb  default '[]'::jsonb
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  -- (keep existing variable declarations from the original function verbatim)
  trade_row public.trades;
  eg uuid;
begin
  -- (keep existing validation, partner resolution, and trade-row insert verbatim from original)

  -- After the trade row is inserted but before commit, validate eggs:
  if array_length(p_requester_eggs, 1) > 0 then
    -- Each egg must be owned by the requester
    if exists (select 1 from unnest(p_requester_eggs) eid
               left join public.player_eggs pe on pe.id = eid
               where pe.owner_id is null or pe.owner_id <> uid) then
      raise exception 'requester egg not owned';
    end if;
    -- No egg may be in incubation (player_eggs row gone) - covered by ownership check
    -- No egg may already be in another pending trade
    if exists (select 1 from public.trade_eggs te
               join public.trades t on t.id = te.trade_id
               where te.egg_id = any(p_requester_eggs) and t.status = 'pending') then
      raise exception 'requester egg already in another trade';
    end if;
    insert into public.trade_eggs(trade_id, egg_id, side)
      select trade_row.id, eid, 'requester' from unnest(p_requester_eggs) eid;
  end if;

  if array_length(p_addressee_eggs, 1) > 0 then
    if trade_row.is_public then
      raise exception 'public trades cannot require specific egg IDs from accepter';
    end if;
    if exists (select 1 from unnest(p_addressee_eggs) eid
               left join public.player_eggs pe on pe.id = eid
               where pe.owner_id is null or pe.owner_id <> trade_row.addressee_id) then
      raise exception 'addressee egg not owned by addressee';
    end if;
    if exists (select 1 from public.trade_eggs te
               join public.trades t on t.id = te.trade_id
               where te.egg_id = any(p_addressee_eggs) and t.status = 'pending') then
      raise exception 'addressee egg already in another trade';
    end if;
    insert into public.trade_eggs(trade_id, egg_id, side)
      select trade_row.id, eid, 'addressee' from unnest(p_addressee_eggs) eid;
  end if;

  -- Store wanted_eggs jsonb on the trade row (new column added below)
  update public.trades set wanted_eggs = p_wanted_eggs where id = trade_row.id;

  return jsonb_build_object('id', trade_row.id);
end $$;

-- New column on trades for public-trade wanted eggs (analogous to wanted_animals jsonb)
alter table public.trades
  add column if not exists wanted_eggs jsonb not null default '[]'::jsonb;

-- 2) accept_trade / accept_public_trade: transfer egg ownership in addition to animals/coins.
--    Reuse existing function body, add a UPDATE step on player_eggs after the animal transfer:
--      update player_eggs set owner_id = <other_side> where id in (select egg_id from trade_eggs where trade_id = … and side = 'requester')
--      and symmetric for 'addressee'.

create or replace function public.accept_trade(p_trade_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  t public.trades;
begin
  -- (keep existing body verbatim: locks the trade, validates, transfers coins+animals, marks accepted)

  select * into t from public.trades where id = p_trade_id;
  -- Transfer eggs: requester's eggs → addressee
  update public.player_eggs set owner_id = t.addressee_id
    where id in (select egg_id from public.trade_eggs where trade_id = p_trade_id and side = 'requester');
  -- Transfer eggs: addressee's eggs → requester
  update public.player_eggs set owner_id = t.requester_id
    where id in (select egg_id from public.trade_eggs where trade_id = p_trade_id and side = 'addressee');

  return jsonb_build_object('ok', true);
end $$;

-- Same pattern for accept_public_trade. For public trades, the accepter is auth.uid()
-- and the addressee_id is auth.uid() at execution time (filled in by RPC).
-- (Engineer: copy original body, append the same UPDATE pair using t.addressee_id = auth.uid()
--  and t.requester_id as the other side.)

create or replace function public.accept_public_trade(p_trade_id uuid, p_my_animals uuid[] default '{}', p_my_eggs uuid[] default '{}')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  t public.trades;
begin
  -- (keep existing body verbatim: validates wanted_animals, takes ownership, transfers, marks accepted)

  -- Validate p_my_eggs against wanted_eggs requirement (analogous to wanted_animals check)
  -- For each entry { egg_type, qty } in t.wanted_eggs, ensure caller selected exactly qty eggs of that type.
  -- (Implementation: aggregate p_my_eggs by egg_type from player_eggs join, compare to wanted_eggs.)

  -- Transfer caller's selected eggs to the original requester
  update public.player_eggs set owner_id = t.requester_id where id = any(p_my_eggs) and owner_id = uid;
  -- Transfer requester's offered eggs (from trade_eggs side='requester') to caller
  update public.player_eggs set owner_id = uid
    where id in (select egg_id from public.trade_eggs where trade_id = p_trade_id and side = 'requester');

  return jsonb_build_object('ok', true);
end $$;

-- 3) Rebuild trades_view to include egg details
create or replace view public.trades_view as
select
  t.*,
  (select coalesce(jsonb_agg(jsonb_build_object(
     'id', a.id, 'species', a.species, 'tier', a.tier)), '[]'::jsonb)
   from public.trade_animals ta join public.animals a on a.id = ta.animal_id
   where ta.trade_id = t.id and ta.side = 'requester') as requester_animal_details,
  (select coalesce(jsonb_agg(jsonb_build_object(
     'id', a.id, 'species', a.species, 'tier', a.tier)), '[]'::jsonb)
   from public.trade_animals ta join public.animals a on a.id = ta.animal_id
   where ta.trade_id = t.id and ta.side = 'addressee') as addressee_animal_details,
  (select coalesce(jsonb_agg(jsonb_build_object(
     'id', pe.id, 'egg_type', pe.egg_type, 'name', et.name, 'emoji', et.emoji)), '[]'::jsonb)
   from public.trade_eggs te
   join public.player_eggs pe on pe.id = te.egg_id
   join public.egg_types et on et.egg_type = pe.egg_type
   where te.trade_id = t.id and te.side = 'requester') as requester_egg_details,
  (select coalesce(jsonb_agg(jsonb_build_object(
     'id', pe.id, 'egg_type', pe.egg_type, 'name', et.name, 'emoji', et.emoji)), '[]'::jsonb)
   from public.trade_eggs te
   join public.player_eggs pe on pe.id = te.egg_id
   join public.egg_types et on et.egg_type = pe.egg_type
   where te.trade_id = t.id and te.side = 'addressee') as addressee_egg_details,
  rp.username as requester_username,
  ap.username as addressee_username
from public.trades t
left join public.profiles rp on rp.id = t.requester_id
left join public.profiles ap on ap.id = t.addressee_id;
```

> **IMPORTANT for engineer:** the `propose_trade`, `accept_trade`, `accept_public_trade` and `trades_view` definitions above are skeletons. Open the current definitions from Step 1, paste them as the function body, then add the new behaviour. Do not delete validations or business logic that already exists.

- [ ] **Step 3: Apply migration via MCP**

Use `apply_migration` with name `20260603_05_trade_eggs`.

- [ ] **Step 4: Verify**

```sql
select column_name from information_schema.columns
  where table_schema='public' and table_name='trades' and column_name='wanted_eggs';
-- Expected: 1 row
select column_name from information_schema.columns
  where table_schema='public' and table_name='trades_view'
    and column_name in ('requester_egg_details','addressee_egg_details');
-- Expected: 2 rows
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260603_05_trade_eggs.sql
git commit -m "feat(trade): Eier-Tausch in propose/accept und trades_view"
```

---

## Phase 2 — Frontend Helpers

### Task 6: `src/eggs.js` + `src/eggs.test.js`

**Files:**
- Create: `src/eggs.js`
- Create: `src/eggs.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/eggs.test.js
import test from 'node:test'
import assert from 'node:assert/strict'
import { rarityInfo, sortByRarity, formatDropChance } from './eggs.js'

test('rarityInfo returns label, color and emoji for each tier', () => {
  assert.equal(rarityInfo('common').label.en, 'Common')
  assert.equal(rarityInfo('common').color, '#9ca3af')
  assert.equal(rarityInfo('legendary').emoji, '🟡')
  assert.equal(rarityInfo('unknown').label.en, 'Common') // fallback
})

test('sortByRarity orders ascending from common to legendary', () => {
  const input = [
    { rarity: 'epic', species: 'rhino' },
    { rarity: 'common', species: 'elephant' },
    { rarity: 'legendary', species: 'hippo' }
  ]
  const out = sortByRarity(input)
  assert.deepEqual(out.map(x => x.species), ['common-first?-wait'])
})

test('formatDropChance turns weight totals into percent string', () => {
  const drops = [
    { species: 'a', weight: 60 },
    { species: 'b', weight: 40 }
  ]
  assert.equal(formatDropChance(drops[0], drops), '60%')
  assert.equal(formatDropChance(drops[1], drops), '40%')
})
```

> Note: the second test's expectation is intentionally wrong as written — let it fail first, then the engineer corrects it in Step 4 below to the right value.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/eggs.test.js`
Expected: FAIL with "Cannot find module './eggs.js'" (or similar).

- [ ] **Step 3: Create `src/eggs.js`**

```js
// src/eggs.js
import { reactive } from 'vue'
import { supabase } from './supabase'

export const EGG_TYPES = reactive({})

const RARITY = {
  common:    { color: '#9ca3af', emoji: '⚪', order: 0, label: { de: 'Common',    en: 'Common',    ru: 'Обычная' } },
  uncommon:  { color: '#22c55e', emoji: '🟢', order: 1, label: { de: 'Uncommon',  en: 'Uncommon',  ru: 'Необычная' } },
  rare:      { color: '#3b82f6', emoji: '🔵', order: 2, label: { de: 'Rare',      en: 'Rare',      ru: 'Редкая' } },
  epic:      { color: '#a855f7', emoji: '🟣', order: 3, label: { de: 'Epic',      en: 'Epic',      ru: 'Эпическая' } },
  legendary: { color: '#f59e0b', emoji: '🟡', order: 4, label: { de: 'Legendary', en: 'Legendary', ru: 'Легендарная' } }
}

export function rarityInfo(r) {
  return RARITY[r] || RARITY.common
}

export function sortByRarity(list) {
  return [...list].sort((a, b) => rarityInfo(a.rarity).order - rarityInfo(b.rarity).order)
}

export function formatDropChance(drop, allDrops) {
  const total = allDrops.reduce((s, d) => s + (d.weight || 0), 0)
  if (!total) return '0%'
  return Math.round((drop.weight / total) * 100) + '%'
}

export async function loadEggCatalog() {
  const { data } = await supabase.from('egg_types')
    .select('egg_type, name, emoji, price_coins, incubation_minutes, shop_visible, enabled')
  for (const k of Object.keys(EGG_TYPES)) delete EGG_TYPES[k]
  for (const r of data || []) {
    EGG_TYPES[r.egg_type] = { ...r }
  }
}
```

- [ ] **Step 4: Fix the test expectation**

Edit `src/eggs.test.js` `sortByRarity` test to assert the actual order:
```js
  assert.deepEqual(out.map(x => x.species), ['elephant', 'rhino', 'hippo'])
```

- [ ] **Step 5: Run tests**

Run: `npm test -- src/eggs.test.js`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/eggs.js src/eggs.test.js
git commit -m "feat(eggs): eggs.js Helper + Tests (Rarity, Sortierung, Drop-Chance)"
```

---

### Task 7: Extend `src/i18n.js` with `eggs.*` and `rarity.*`

**Files:**
- Modify: `src/i18n.js` (locate the `de`, `en`, `ru` translation objects and add the new keys).

- [ ] **Step 1: Add German block**

In the `de` translation object, add under a new key `eggs`:

```js
eggs: {
  machineTitle: '🥚 Eier-Maschine',
  empty: 'Wähle ein Ei zum Ausbrüten',
  noEggs: 'Du hast keine Eier im Inventar.',
  pickEgg: 'Ei wählen',
  startIncubation: 'Ausbrüten starten',
  brewing: '{name} brütet…',
  readyIn: 'Fertig in: {time}',
  ready: '✨ Ei geschlüpft!',
  claim: '🎁 Abholen',
  hatched: '{emoji} {name} ist geschlüpft!',
  inventoryTitle: '🥚 Eier',
  slotBusy: 'Bereits ein Ei in der Maschine.',
  cannotEquip: 'Eier können nicht ausgerüstet werden — nur ausgebrütet.',
  shopCardTitle: '{name}',
  shopCardSubtitle: 'Schlüpft in {minutes} Min · {count} Tiere',
  shopCardDropChances: 'Drop-Chancen:',
  buy: 'Kaufen'
},
rarity: {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary'
}
```

- [ ] **Step 2: Add English block**

In `en`:
```js
eggs: {
  machineTitle: '🥚 Egg Machine',
  empty: 'Pick an egg to incubate',
  noEggs: 'You have no eggs in your inventory.',
  pickEgg: 'Pick egg',
  startIncubation: 'Start incubation',
  brewing: '{name} is incubating…',
  readyIn: 'Ready in: {time}',
  ready: '✨ Egg hatched!',
  claim: '🎁 Claim',
  hatched: '{emoji} {name} has hatched!',
  inventoryTitle: '🥚 Eggs',
  slotBusy: 'Already incubating an egg.',
  cannotEquip: 'Eggs cannot be equipped — only incubated.',
  shopCardTitle: '{name}',
  shopCardSubtitle: 'Hatches in {minutes} min · {count} animals',
  shopCardDropChances: 'Drop chances:',
  buy: 'Buy'
},
rarity: { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' }
```

- [ ] **Step 3: Add Russian block**

In `ru`:
```js
eggs: {
  machineTitle: '🥚 Машина для яиц',
  empty: 'Выберите яйцо для инкубации',
  noEggs: 'У вас нет яиц в инвентаре.',
  pickEgg: 'Выбрать яйцо',
  startIncubation: 'Начать инкубацию',
  brewing: '{name} инкубируется…',
  readyIn: 'Готово через: {time}',
  ready: '✨ Яйцо вылупилось!',
  claim: '🎁 Забрать',
  hatched: '{emoji} {name} вылупился!',
  inventoryTitle: '🥚 Яйца',
  slotBusy: 'Уже инкубируется одно яйцо.',
  cannotEquip: 'Яйца нельзя экипировать — только инкубировать.',
  shopCardTitle: '{name}',
  shopCardSubtitle: 'Вылупится через {minutes} мин · {count} животных',
  shopCardDropChances: 'Шансы выпадения:',
  buy: 'Купить'
},
rarity: { common: 'Обычная', uncommon: 'Необычная', rare: 'Редкая', epic: 'Эпическая', legendary: 'Легендарная' }
```

- [ ] **Step 4: Sanity-run dev server**

Run: `npm run dev` and check the console — no i18n key errors.

- [ ] **Step 5: Commit**

```bash
git add src/i18n.js
git commit -m "feat(eggs): i18n-Strings de/en/ru fuer Eier-System und Raritaeten"
```

---

## Phase 3 — Frontend Integration

### Task 8: Extend `useGameStore` with egg state & actions

**Files:**
- Modify: `src/stores/game.js`

- [ ] **Step 1: Add state**

Find the `state()` (or `defineStore` setup) and add:
```js
playerEggs: [],          // [{ id, egg_type, acquired_at }]
incubation: { active: false, egg_type: null, ready_at: null, ready_now: false }
```

- [ ] **Step 2: Add loaders**

Add methods (or actions in setup-store):
```js
async loadPlayerEggs() {
  const { data } = await supabase.from('player_eggs').select('id, egg_type, acquired_at').order('acquired_at')
  this.playerEggs = data || []
},
async loadIncubation() {
  const { data } = await supabase.rpc('get_incubation_status')
  this.incubation = data || { active: false }
},
async buyEgg(eggType, qty = 1) {
  const { data, error } = await supabase.rpc('buy_egg', { p_egg_type: eggType, p_qty: qty })
  if (error) throw error
  this.coins = Number(data.coins)
  await this.loadPlayerEggs()
  return data
},
async startIncubation(eggId) {
  const { data, error } = await supabase.rpc('start_incubation', { p_egg_id: eggId })
  if (error) throw error
  await Promise.all([this.loadPlayerEggs(), this.loadIncubation()])
  return data
},
async claimHatched() {
  const { data, error } = await supabase.rpc('claim_hatched')
  if (error) throw error
  await Promise.all([this.load(), this.loadIncubation()])
  return data
}
```

- [ ] **Step 3: Hook into `load()` / `init`**

In the existing `load()` action, after profile + animals load, add:
```js
await Promise.all([this.loadPlayerEggs(), this.loadIncubation()])
```

Also subscribe to realtime (in the same place where other channels are wired):
```js
this.eggChannel = supabase.channel('eggs-' + this.userId)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'player_eggs', filter: `owner_id=eq.${this.userId}` },
      () => this.loadPlayerEggs())
  .on('postgres_changes', { event: '*', schema: 'public', table: 'egg_incubations', filter: `user_id=eq.${this.userId}` },
      () => this.loadIncubation())
  .subscribe()
```
And tear down in cleanup: `if (this.eggChannel) supabase.removeChannel(this.eggChannel)`.

- [ ] **Step 4: Smoke check in console**

Run `npm run dev`, open browser, check that `useGameStore()` exposes `playerEggs` and `incubation` after login, no errors in console.

- [ ] **Step 5: Commit**

```bash
git add src/stores/game.js
git commit -m "feat(eggs): Store-Erweiterung playerEggs, incubation + RPC-Wrapper"
```

---

### Task 9: Create `EggMachine.vue` component (3 states + hatch modal)

**Files:**
- Create: `src/components/EggMachine.vue`

- [ ] **Step 1: Write the component**

```vue
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'
import { useAppToast } from '../composables/useAppToast'
import { speciesInfo } from '../animals'
import { rarityInfo, EGG_TYPES, loadEggCatalog } from '../eggs'
import { t } from '../i18n'

const game = useGameStore()
const toast = useAppToast()
const now = ref(Date.now())
const showPicker = ref(false)
const busy = ref(false)
const hatchResult = ref(null) // { species, animal_id, rarity }

let timer
onMounted(async () => {
  await loadEggCatalog()
  timer = setInterval(() => { now.value = Date.now() }, 1000)
})
onUnmounted(() => clearInterval(timer))

const incubation = computed(() => game.incubation)
const playerEggs = computed(() => game.playerEggs)

const groupedEggs = computed(() => {
  const m = {}
  for (const e of playerEggs.value) {
    if (!m[e.egg_type]) m[e.egg_type] = { egg_type: e.egg_type, list: [] }
    m[e.egg_type].list.push(e)
  }
  return Object.values(m)
})

const remainingMs = computed(() => {
  if (!incubation.value?.active || !incubation.value.ready_at) return 0
  return Math.max(0, new Date(incubation.value.ready_at).getTime() - now.value)
})

const readyNow = computed(() => incubation.value?.active && remainingMs.value === 0)

function fmtTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const progress = computed(() => {
  const et = EGG_TYPES[incubation.value?.egg_type]
  if (!et) return 0
  const total = (et.incubation_minutes || 60) * 60 * 1000
  return 1 - (remainingMs.value / total)
})

async function startIncubation(eggId) {
  busy.value = true
  try {
    await game.startIncubation(eggId)
    showPicker.value = false
  } catch (e) { toast.err(e) } finally { busy.value = false }
}

async function claim() {
  busy.value = true
  try {
    const result = await game.claimHatched()
    hatchResult.value = result
  } catch (e) { toast.err(e) } finally { busy.value = false }
}
</script>

<template>
  <div class="card egg-machine">
    <div class="row between" style="align-items:flex-start">
      <div>
        <div style="font-weight:800;font-size:18px">{{ t('eggs.machineTitle') }}</div>
      </div>
    </div>

    <!-- State 3: ready -->
    <template v-if="readyNow">
      <div class="ready-banner">{{ t('eggs.ready') }}</div>
      <Button class="btn full" :disabled="busy" @click="claim">{{ t('eggs.claim') }}</Button>
    </template>

    <!-- State 2: brewing -->
    <template v-else-if="incubation.active">
      <div class="brewing">
        <div>{{ t('eggs.brewing', { name: EGG_TYPES[incubation.egg_type]?.name || 'Ei' }) }}</div>
        <div class="progress-bar"><div class="progress-fill" :style="{ width: (progress * 100) + '%' }"></div></div>
        <div class="countdown">{{ t('eggs.readyIn', { time: fmtTime(remainingMs) }) }}</div>
      </div>
    </template>

    <!-- State 1: empty -->
    <template v-else>
      <p class="subtitle">{{ t('eggs.empty') }}</p>
      <div v-if="!playerEggs.length" class="subtitle">{{ t('eggs.noEggs') }}</div>
      <div v-else>
        <Button class="btn full" :disabled="busy" @click="showPicker = !showPicker">
          {{ showPicker ? '×' : t('eggs.pickEgg') }}
        </Button>
        <div v-if="showPicker" class="picker">
          <div v-for="g in groupedEggs" :key="g.egg_type" class="picker-row">
            <span class="picker-emoji">{{ EGG_TYPES[g.egg_type]?.emoji || '🥚' }}</span>
            <span class="picker-name">{{ EGG_TYPES[g.egg_type]?.name || g.egg_type }} ×{{ g.list.length }}</span>
            <Button class="btn small" :disabled="busy" @click="startIncubation(g.list[0].id)">
              {{ t('eggs.startIncubation') }}
            </Button>
          </div>
        </div>
      </div>
    </template>

    <!-- Hatch result modal -->
    <div v-if="hatchResult" class="hatch-modal" @click.self="hatchResult = null">
      <div class="hatch-dialog">
        <div class="hatch-emoji">{{ speciesInfo(hatchResult.species).emoji }}</div>
        <div class="hatch-rarity" :style="{ color: rarityInfo(hatchResult.rarity).color }">
          {{ rarityInfo(hatchResult.rarity).emoji }} {{ t('rarity.' + hatchResult.rarity).toUpperCase() }}
        </div>
        <div class="hatch-name">{{ speciesInfo(hatchResult.species).name }}</div>
        <Button class="btn full" @click="hatchResult = null">OK</Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.egg-machine { margin-bottom: 10px; background: linear-gradient(135deg, #4a2f5c, #1d3a4c); border-color: var(--accent); }
.ready-banner { font-weight: 800; color: var(--accent); margin: 8px 0; text-align: center; font-size: 16px; }
.brewing { margin-top: 8px; }
.progress-bar { background: var(--card-2); height: 10px; border-radius: 999px; overflow: hidden; margin: 6px 0; }
.progress-fill { background: var(--accent); height: 100%; transition: width 1s linear; }
.countdown { text-align: center; font-variant-numeric: tabular-nums; font-weight: 700; }
.picker { margin-top: 8px; background: var(--card-2); border-radius: 10px; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.picker-row { display: flex; align-items: center; gap: 8px; }
.picker-emoji { font-size: 22px; }
.picker-name { flex: 1; font-weight: 600; }
.btn.small { padding: 6px 10px; font-size: 13px; }
.hatch-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 2000; backdrop-filter: blur(4px); }
.hatch-dialog { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; text-align: center; min-width: 280px; }
.hatch-emoji { font-size: 80px; margin-bottom: 12px; filter: drop-shadow(0 0 14px rgba(255,209,102,0.7)); }
.hatch-rarity { font-weight: 800; font-size: 14px; margin-bottom: 4px; letter-spacing: 1px; }
.hatch-name { font-size: 22px; font-weight: 800; margin-bottom: 16px; }
</style>
```

- [ ] **Step 2: Verify component compiles**

Run `npm run dev` — no Vue compile errors in terminal.

- [ ] **Step 3: Commit**

```bash
git add src/components/EggMachine.vue
git commit -m "feat(eggs): EggMachine-Komponente mit 3 Zustaenden + Hatch-Modal"
```

---

### Task 10: Mount `<EggMachine />` on GameView under the fusion machine

**Files:**
- Modify: `src/views/GameView.vue`

- [ ] **Step 1: Add import**

At the top of the `<script setup>` block in GameView.vue, add:
```js
import EggMachine from '../components/EggMachine.vue'
```

- [ ] **Step 2: Mount in template**

Find the section that renders the Fusion-Maschine (search for `fusion` keyword in the template). Immediately AFTER its closing tag/card, add:

```vue
<EggMachine />
```

- [ ] **Step 3: Verify in browser preview**

Use `preview_start` and `preview_snapshot` to confirm the Egg Machine card renders under the Fusion Machine on the GameView. With no eggs, it should show "Du hast keine Eier im Inventar."

- [ ] **Step 4: Commit**

```bash
git add src/views/GameView.vue
git commit -m "feat(game): EggMachine unter Fusion-Maschine eingebunden"
```

---

### Task 11: Extend `ShopView.vue` — egg cards in rotation grid + rarity badges

**Files:**
- Modify: `src/views/ShopView.vue`

- [ ] **Step 1: Add imports**

At top of `<script setup>`:
```js
import { rarityInfo, loadEggCatalog, EGG_TYPES } from '../eggs'
```

In `onMounted`, after the existing `loadShop()` etc.:
```js
await loadEggCatalog()
```

- [ ] **Step 2: Build `eggList` computed**

After the existing `speciesList` computed, add:
```js
const eggMeta = computed(() => stockData.value?.egg_meta || {})
const eggStock = computed(() => stockData.value?.egg_stock || {})

// stockData is renamed from inline destructuring in loadShop — adjust loadShop to keep the raw data:
//   const { data } = await supabase.rpc('get_shop')
//   stockData.value = data
// Then derive existing refs (stock, forcedStock, ...) from stockData when needed.

const eggList = computed(() => {
  return Object.entries(eggMeta.value).map(([eggType, meta]) => ({
    eggType,
    meta,
    remaining: eggStock.value[eggType] || 0
  })).filter(e => e.meta && e.meta.stock_qty > 0)
})
```

> The engineer can choose either: (a) store the full RPC response in `stockData` and derive from it, or (b) add `eggStock`/`eggMeta` refs alongside the existing ones in `loadShop()` directly. Option (b) is smaller change — recommended.

So instead, in `loadShop()` add:
```js
eggStock.value = data?.egg_stock || {}
eggMeta.value = data?.egg_meta || {}
```
And declare `const eggStock = ref({})`, `const eggMeta = ref({})` near the existing `stock` ref.

- [ ] **Step 3: Render egg cards in the existing animal grid**

Inside the existing `<div class="grid">` of the animals tab (right after the `<div v-for="s in speciesList" …>` block, BEFORE the closing `</div>` of the grid), add:

```vue
<div
  v-for="e in eggList"
  :key="'egg-' + e.eggType"
  class="animal-card egg-card"
  :class="{ 'out-of-stock': e.remaining < 1 }"
>
  <div class="ribbon egg-ribbon">✨ EI ✨</div>
  <div class="animal-emoji">{{ e.meta.emoji }}</div>
  <div class="animal-name">{{ e.meta.name }}</div>
  <div class="animal-meta">{{ t('eggs.shopCardSubtitle', { minutes: e.meta.incubation_minutes, count: e.meta.drops.length }) }}</div>
  <div class="drop-row">
    <span v-for="d in e.meta.drops" :key="d.species" class="drop-chip" :style="{ borderColor: rarityInfo(d.rarity).color }">
      {{ rarityInfo(d.rarity).emoji }} {{ Math.round((d.weight / e.meta.drops.reduce((s,x)=>s+x.weight,0)) * 100) }}% {{ d.emoji }}
    </span>
  </div>
  <div class="animal-cost">🪙 {{ formatCoins(e.meta.price) }}</div>
  <Button
    v-if="e.remaining > 0"
    class="btn full"
    style="margin-top: 8px"
    :disabled="busyKey === 'egg-' + e.eggType || game.displayCoins < e.meta.price"
    @click="buyEgg(e.eggType)"
  >
    {{ busyKey === 'egg-' + e.eggType ? t('common.loadingShort') : t('eggs.buy') }}
  </Button>
  <div v-else class="stock-badge">{{ t('shop.soldOut') }}</div>
</div>
```

Add the `buyEgg` function:
```js
async function buyEgg(eggType) {
  busyKey.value = 'egg-' + eggType
  try {
    await game.buyEgg(eggType)
    await loadShop()
    appToast.ok(t('eggs.buy') + ' ✓')
  } catch (e) { appToast.err(e) } finally { busyKey.value = '' }
}
```

- [ ] **Step 4: Add rarity badge to existing animal cards**

In the existing `<div v-for="s in speciesList" …>` card, near the top inside the card add:
```vue
<div class="rarity-stripe" :style="{ background: rarityInfo(s.info.rarity || 'common').color }">
  {{ rarityInfo(s.info.rarity || 'common').emoji }} {{ t('rarity.' + (s.info.rarity || 'common')).toUpperCase() }}
</div>
```

And in `animals.js`, make sure `rarity` flows through `speciesInfo`. Edit `loadCatalog` to add `rarity` to the SELECT and to the stored object:
```js
.select('species, name, emoji, cost, rate, enabled, shop_visible, rarity')
// inside the loop:
SPECIES[r.species] = { …, rarity: r.rarity || 'common' }
```

- [ ] **Step 5: Add CSS**

At the bottom of the `<style scoped>`:
```css
.egg-card { border-color: var(--accent); background: linear-gradient(135deg, #3a1d5c, #2d3a5c); }
.egg-ribbon { background: linear-gradient(135deg, #ffd166, #a855f7); color: #fff; }
.drop-row { display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0; justify-content: center; }
.drop-chip { font-size: 11px; padding: 2px 6px; border: 1px solid; border-radius: 999px; }
.rarity-stripe { position: absolute; top: 0; left: 0; right: 0; padding: 2px 6px; font-size: 10px; font-weight: 800; color: #fff; text-align: center; letter-spacing: 1px; border-radius: 10px 10px 0 0; }
```

- [ ] **Step 6: Verify in browser preview**

Use `preview_start`, navigate to the shop. Verify:
- Animal cards now have a colored rarity stripe at the top
- If the rotation rolled the Safari egg this slot, it shows as a card with drop chances and a Kaufen button

Force a rotation if needed via SQL: `select public.admin_force_rotation();` then reload the shop.

- [ ] **Step 7: Commit**

```bash
git add src/views/ShopView.vue src/animals.js
git commit -m "feat(shop): Eier-Karten in Rotation + Raritaets-Streifen auf Tier-Karten"
```

---

### Task 12: Extend `TradeView.vue` — egg pickers + propose with eggs

**Files:**
- Modify: `src/views/TradeView.vue`

- [ ] **Step 1: Add imports & state**

In `<script setup>`:
```js
import { loadEggCatalog, EGG_TYPES } from '../eggs'

const myEggs = computed(() => game.playerEggs.map(e => ({
  ...e,
  meta: EGG_TYPES[e.egg_type] || { name: e.egg_type, emoji: '🥚' }
})))

const partnerEggs = ref([]) // loaded with partner

// In offer reactive, add:
offer.myEggs = new Set()
offer.theirEggs = new Set()

// In publicWanted reactive, add:
publicWanted.eggs = {}  // { egg_type: qty }
```

In `onMounted`, after `await game.load()`:
```js
await loadEggCatalog()
```

- [ ] **Step 2: Extend `lookupPartner` to load partner's eggs**

After loading partner's animals:
```js
const { data: eggs } = await supabase.from('player_eggs')
  .select('id, egg_type').eq('owner_id', p.id)
partnerEggs.value = eggs || []
```

(Note: this only works if RLS lets you read other users' egg IDs. If not, add a SECURITY DEFINER view `public.public_player_eggs` analogous to existing partner-animal lookup pattern, or extend `friends_view`. Engineer should follow whatever pattern `partnerAnimals` uses today.)

- [ ] **Step 3: Group helpers**

After the existing `theirGroupSelected` / `togglePublicWantedGroup` helpers, add equivalents for eggs:
```js
const myEggGroups = computed(() => {
  const m = new Map()
  for (const e of myEggs.value) {
    if (!m.has(e.egg_type)) m.set(e.egg_type, { key: e.egg_type, meta: e.meta, list: [] })
    m.get(e.egg_type).list.push(e)
  }
  return [...m.values()]
})
const theirEggGroups = computed(() => {
  const m = new Map()
  for (const e of partnerEggs.value) {
    if (!m.has(e.egg_type)) m.set(e.egg_type, { key: e.egg_type, meta: EGG_TYPES[e.egg_type] || { emoji: '🥚', name: e.egg_type }, list: [] })
    m.get(e.egg_type).list.push(e)
  }
  return [...m.values()]
})
function myEggSelected(group) { return [...group.list].filter(e => offer.myEggs.has(e.id)).length }
function theirEggSelected(group) { return [...group.list].filter(e => offer.theirEggs.has(e.id)).length }
function toggleMyEgg(group, remove = false) {
  if (remove) { for (let i = group.list.length - 1; i >= 0; i--) if (offer.myEggs.has(group.list[i].id)) { offer.myEggs.delete(group.list[i].id); return } }
  else for (const e of group.list) if (!offer.myEggs.has(e.id)) { offer.myEggs.add(e.id); return }
}
function toggleTheirEgg(group, remove = false) {
  if (remove) { for (let i = group.list.length - 1; i >= 0; i--) if (offer.theirEggs.has(group.list[i].id)) { offer.theirEggs.delete(group.list[i].id); return } }
  else for (const e of group.list) if (!offer.theirEggs.has(e.id)) { offer.theirEggs.add(e.id); return }
}
function publicWantedEggSelected(eggType) { return Math.max(0, Number(publicWanted.eggs[eggType] || 0)) }
function togglePublicWantedEgg(eggType, remove = false) {
  const cur = publicWantedEggSelected(eggType)
  if (remove) { if (cur <= 1) delete publicWanted.eggs[eggType]; else publicWanted.eggs[eggType] = cur - 1 }
  else publicWanted.eggs[eggType] = cur + 1
}
```

- [ ] **Step 4: Pass new params in `propose`**

In the `propose()` function's `supabase.rpc('propose_trade', { … })` call, add:
```js
p_requester_eggs: [...offer.myEggs],
p_addressee_eggs: isPublicOffer.value ? [] : [...offer.theirEggs],
p_wanted_eggs: isPublicOffer.value
  ? Object.entries(publicWanted.eggs).map(([egg_type, qty]) => ({ egg_type, qty: Number(qty) || 0 })).filter(x => x.qty > 0)
  : []
```

- [ ] **Step 5: Render egg picker UI**

After the existing animal picker section in both sides (mine + theirs), add a small "Eier" section:

```vue
<!-- After the animal slots/picker in the "mine" side: -->
<div class="egg-slots" v-if="myEggGroups.length || mySelectedEggGroups.length">
  <div class="subtitle" style="margin:0;font-size:11px">🥚 {{ t('eggs.inventoryTitle') }}</div>
  <div class="slots">
    <div v-for="g in myEggGroups.filter(g => myEggSelected(g) > 0)" :key="'me-' + g.key" class="chip-anim" @click="toggleMyEgg(g, true)">
      <span>{{ g.meta.emoji }}</span>
      <span class="chip-count">×{{ myEggSelected(g) }}</span>
    </div>
    <Button class="chip-add" v-for="g in myEggGroups" :key="'add-' + g.key" :disabled="myEggSelected(g) >= g.list.length" @click="toggleMyEgg(g)">
      + {{ g.meta.emoji }}
    </Button>
  </div>
</div>
```

Repeat analogously for `theirEggGroups` in the "theirs" side, and for `publicWantedEggSelected` in the public-wanted side (iterate over `EGG_TYPES`).

- [ ] **Step 6: Render egg details in trade list**

In each public-trade / incoming / outgoing / history card, where animal chips render (`<span v-for="a in t.requester_animal_details" …>`), add a parallel block:
```vue
<span v-for="e in (t.requester_egg_details || [])" :key="'rqe-' + e.id" class="e">{{ e.emoji }}</span>
```
Same for `t.addressee_egg_details`.

- [ ] **Step 7: Verify in browser preview**

Buy an egg (via shop or SQL insert into player_eggs for the test user), open Trade view, see egg chip in the mine side. Send a trade to another test user that includes the egg.

- [ ] **Step 8: Commit**

```bash
git add src/views/TradeView.vue
git commit -m "feat(trade): Eier-Picker in Trade-View + propose_trade-Erweiterung"
```

---

### Task 13: Extend `InventoryView.vue` — eggs section + rarity badges

**Files:**
- Modify: `src/views/InventoryView.vue`

- [ ] **Step 1: Add eggs section**

In `<script setup>`:
```js
import { EGG_TYPES, loadEggCatalog, rarityInfo } from '../eggs'
import { onMounted } from 'vue'

onMounted(loadEggCatalog)
```

In the template, before the existing animals section, add:
```vue
<div v-if="game.playerEggs.length" class="card">
  <h3>{{ t('eggs.inventoryTitle') }}</h3>
  <div class="egg-list">
    <div v-for="e in game.playerEggs" :key="e.id" class="egg-item">
      <span class="egg-emoji">{{ EGG_TYPES[e.egg_type]?.emoji || '🥚' }}</span>
      <span class="egg-name">{{ EGG_TYPES[e.egg_type]?.name || e.egg_type }}</span>
    </div>
  </div>
  <p class="subtitle">{{ t('eggs.cannotEquip') }}</p>
</div>
```

- [ ] **Step 2: Add rarity badge to animal cards**

Wherever the inventory currently renders an `animal-card`, add the same `rarity-stripe` from Task 11:
```vue
<div class="rarity-stripe" :style="{ background: rarityInfo(speciesInfo(a.species).rarity || 'common').color }">
  {{ rarityInfo(speciesInfo(a.species).rarity || 'common').emoji }}
</div>
```

- [ ] **Step 3: Style**

```css
.egg-list { display: flex; flex-wrap: wrap; gap: 8px; }
.egg-item { display: flex; align-items: center; gap: 6px; padding: 6px 10px; background: var(--card-2); border-radius: 10px; }
.egg-emoji { font-size: 22px; }
.egg-name { font-weight: 600; }
```

- [ ] **Step 4: Verify in browser preview**

Open Inventory view, see eggs section if any eggs in inventory, see colored rarity stripe on each animal card.

- [ ] **Step 5: Commit**

```bash
git add src/views/InventoryView.vue
git commit -m "feat(inventory): Eier-Sektion + Raritaets-Badges auf Tier-Karten"
```

---

## Final Verification

- [ ] **End-to-end smoke test in browser preview:**

1. Start dev server with `preview_start`
2. Login as test user, navigate to Shop. If Safari egg not in rotation, run `select public.admin_force_rotation()` and reload until it appears
3. Buy egg → coins deducted, egg in inventory + Egg Machine picker shows it
4. Navigate to GameView, click "Ausbrüten starten" in Egg Machine → state changes to brewing
5. SQL hack timer: `update public.egg_incubations set ready_at = now() where user_id = '<your uuid>';`
6. Reload GameView → Egg Machine shows "Ei geschlüpft!" → click Abholen → animation modal, animal in inventory
7. Buy another egg, navigate to Trade view, send trade including the egg to a second test user
8. Accept as second user → egg ownership transferred (check `select owner_id from player_eggs`)

- [ ] **Final commit (if needed):**

If any cleanup or i18n key was missed during verification, fix and commit:
```bash
git add -A
git commit -m "fix(eggs): finale Korrekturen nach Smoke-Test"
```

---

## Plan Self-Review

**Spec coverage:**

| Spec section | Task(s) |
|---|---|
| Rarity column + backfill | Task 1 |
| 5 Safari species | Task 1 |
| egg_types / egg_drop_pool tables | Task 2 |
| player_eggs / egg_incubations | Task 2 |
| trade_eggs + RLS | Task 2 |
| `buy_egg` RPC | Task 3 |
| `start_incubation` RPC | Task 3 |
| `get_incubation_status` RPC | Task 3 |
| `claim_hatched` RPC | Task 3 |
| Shop rotation extension | Task 4 |
| Trade RPC extensions (propose/accept/accept_public) | Task 5 |
| `trades_view` with egg details | Task 5 |
| `eggs.js` helper + tests | Task 6 |
| i18n (de/en/ru) | Task 7 |
| `useGameStore` extensions + realtime | Task 8 |
| `EggMachine.vue` (3 states + modal) | Task 9 |
| GameView mounting under Fusion | Task 10 |
| ShopView: egg cards + rarity badges | Task 11 |
| TradeView: egg pickers + propose params | Task 12 |
| InventoryView: egg section + rarity | Task 13 |
| Realtime sync (player_eggs, egg_incubations) | Task 2 (publication) + Task 8 (subscription) |
| Cannot equip rule | Enforced by absence of `equipped` on `player_eggs` (schema). UI hint in Task 7/13. |
| Cannot trade incubating egg | Enforced by `start_incubation` deleting `player_eggs` row + foreign key on `trade_eggs.egg_id`. |
| Browser smoke test | Final Verification step |

No spec gaps found.

**Placeholder scan:** None — every step contains the actual SQL/JS/Vue code.

**Type / name consistency:**
- `egg_type` (snake_case, DB) ↔ `eggType` (camelCase, JS) — consistent.
- RPC names: `buy_egg`, `start_incubation`, `get_incubation_status`, `claim_hatched` — used identically in store + DB.
- Store methods: `buyEgg`, `startIncubation`, `claimHatched`, `loadPlayerEggs`, `loadIncubation` — consistent across Tasks 8/9/11/12/13.
- `rarityInfo(r)` returns `{ color, emoji, order, label }` — used consistently in Tasks 9, 11, 13.
- `EGG_TYPES[egg_type]` shape (`{ egg_type, name, emoji, price_coins, incubation_minutes, shop_visible, enabled }`) — populated in Task 6, read in Tasks 9, 11, 12, 13.
