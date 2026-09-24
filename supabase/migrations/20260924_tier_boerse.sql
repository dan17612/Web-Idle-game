-- Zoo-Börse: Marktwert pro Tier (Art × Stufe) und Spieler-zu-Spieler-Handel
-- wie an einer Krypto-Börse. Spec: docs/superpowers/specs/2026-09-24-tier-boerse-design.md
--
-- Verkäufer stellen Angebote (Asks) ein, Käufer akzeptieren sie. Es gibt
-- keinen Kauf vom System. Alle Schreibzugriffe laufen über security-definer-RPCs.
--
-- Achtung Spiegel: Die Wertformel lebt doppelt, hier (_market_model,
-- _market_values) und in src/market.js. src/marketSql.test.js vergleicht die
-- Konstanten beider Seiten.
--
--   base   = max(cost, rate × 200, craftInput)           × max(1, required_qty)
--   K      = 1 − sqrt(holders / players)                  (Knappheit)
--   E      = beste Quelle (Truhe / Ei × 0,8 / Zucht × 0,6 / Craft × 0,5)
--            × 0,5 bei bald verschwindender Art, × (1 − 0,1 × order) je Stufe
--   model  = base × (1 + 3 × K × (1 − E))
--   value  = exp((1 − w)·ln(model) + w·ln(clamp(median7d, model/4, model×4)))
--            mit w = min(0,5; 0,1 × Anzahl Trades der letzten 7 Tage)

-- 0) Überweisungs-Log kennt den neuen Handelsweg
alter table public.transactions drop constraint if exists transactions_kind_check;
alter table public.transactions add constraint transactions_kind_check
  check (kind = any (array['send'::text, 'trade'::text, 'public_trade'::text, 'market'::text]));

-- 1) Tabellen
create table if not exists public.market_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  animal_id uuid not null references public.animals(id) on delete cascade,
  species text not null,
  tier text not null default 'normal',
  price bigint not null check (price >= 1 and price <= 1000000000000000),
  status text not null default 'open' check (status in ('open', 'sold', 'cancelled')),
  buyer_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create unique index if not exists market_listings_open_animal_uidx
  on public.market_listings (animal_id) where status = 'open';
create index if not exists market_listings_open_market_idx
  on public.market_listings (species, tier, price) where status = 'open';
create index if not exists market_listings_seller_idx
  on public.market_listings (seller_id, status);

alter table public.market_listings enable row level security;
drop policy if exists "market_listings self read" on public.market_listings;
create policy "market_listings self read" on public.market_listings
  for select using ((select auth.uid()) = seller_id);
revoke all on table public.market_listings from anon, authenticated;
grant select on table public.market_listings to authenticated;

create table if not exists public.market_fills (
  id bigserial primary key,
  listing_id uuid,
  species text not null,
  tier text not null default 'normal',
  price bigint not null check (price >= 1),
  seller_id uuid references public.profiles(id) on delete set null,
  buyer_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists market_fills_market_idx
  on public.market_fills (species, tier, created_at desc);
create index if not exists market_fills_created_idx
  on public.market_fills (created_at desc);

alter table public.market_fills enable row level security;
drop policy if exists "market_fills self read" on public.market_fills;
create policy "market_fills self read" on public.market_fills
  for select using ((select auth.uid()) = seller_id or (select auth.uid()) = buyer_id);
revoke all on table public.market_fills from anon, authenticated;
grant select on table public.market_fills to authenticated;
revoke all on sequence public.market_fills_id_seq from anon, authenticated;

create table if not exists public.market_snapshots (
  species text not null,
  tier text not null,
  bucket timestamptz not null,
  value bigint not null,
  supply int not null default 0,
  primary key (species, tier, bucket)
);

create index if not exists market_snapshots_bucket_idx
  on public.market_snapshots (bucket);

alter table public.market_snapshots enable row level security;
drop policy if exists "market_snapshots public read" on public.market_snapshots;
create policy "market_snapshots public read" on public.market_snapshots
  for select using (true);
revoke all on table public.market_snapshots from anon, authenticated;
grant select on table public.market_snapshots to authenticated;

-- 2) Formel (Spiegel zu src/market.js)

-- 10 % ⇒ 1 · 1 % ⇒ 0,67 · 0,1 % ⇒ 0,33 · ≤ 0,01 % ⇒ 0
create or replace function public._market_ease_from_chance(p numeric)
returns numeric language sql immutable set search_path = public as $$
  select case
    when p is null or p <= 0 then 0::numeric
    else least(1::numeric, greatest(0::numeric, (log(10::numeric, p) + 4) / 3))
  end;
$$;

-- Modellwert aller Märkte zum Zeitpunkt p_at. Besitz zählt nur Tiere mit
-- acquired_at <= p_at, damit derselbe Code den Kursverlauf rückwirkend füllt.
create or replace function public._market_model(p_at timestamptz default now())
returns table (
  species text, tier text, tier_order int, qty int,
  supply int, holders int, players int,
  base numeric, scarcity numeric, ease numeric, model numeric
)
language sql stable set search_path = public as $$
  with owned as (
    select a.species as sp, coalesce(a.tier, 'normal') as tr, a.owner_id
      from public.animals a
      join public.profiles p on p.id = a.owner_id
     where not coalesce(p.is_banned, false)
       and a.acquired_at <= p_at
  ),
  pl as (
    select greatest(1, count(distinct o.owner_id))::int as n from owned o
  ),
  held as (
    select o.sp, o.tr, count(*)::int as supply, count(distinct o.owner_id)::int as holders
      from owned o
     group by o.sp, o.tr
  ),
  chest as (
    select sum(sc.weight)::numeric as w
      from public.species_costs sc
     where sc.enabled and sc.weight > 0 and not coalesce(sc.craft_only, false)
  ),
  egg as (
    select d.species as sp, max(d.weight::numeric / nullif(t.total, 0)) as p
      from public.egg_drop_pool d
      join public.egg_types e on e.egg_type = d.egg_type and e.enabled
      join (
        select x.egg_type, sum(x.weight)::numeric as total
          from public.egg_drop_pool x
         group by x.egg_type
      ) t on t.egg_type = d.egg_type
     group by d.species
  ),
  breed as (
    select u.sp,
           max((public._breed_weights(6::numeric))[g.i]::numeric / 100
               / cardinality(public._breed_tier_species(g.i))) as p
      from generate_series(1, 4) as g(i)
      cross join lateral unnest(public._breed_tier_species(g.i)) as u(sp)
     where public.event_is_active('breeding_game')
     group by u.sp
  ),
  sp0 as (
    select sc.species as sp,
           greatest(1::numeric, sc.cost::numeric, sc.rate::numeric * 200) as base0,
           greatest(
             public._market_ease_from_chance(
               case when sc.enabled and sc.weight > 0 and not coalesce(sc.craft_only, false)
                    then sc.weight::numeric / nullif((select c.w from chest c), 0) end),
             0.8 * public._market_ease_from_chance(egg.p),
             0.6 * public._market_ease_from_chance(breed.p)
           ) as ease0,
           (sc.disappears_at is not null and sc.disappears_at > now()) as leaving
      from public.species_costs sc
      left join egg on egg.sp = sc.species
      left join breed on breed.sp = sc.species
  ),
  craft as (
    select r.output_species as sp, min(ing.input) as input, max(ing.ease) as ease
      from public.craft_recipes r
      cross join lateral (
        select sum(greatest(1, coalesce((i->>'qty')::int, 1))
                   * s0.base0
                   * greatest(1, coalesce(td.required_qty, 1))) as input,
               0.5 * min(s0.ease0) as ease
          from jsonb_array_elements(r.ingredients) as i
          join sp0 s0 on s0.sp = i->>'species'
          left join public.tier_defs td on td.tier = coalesce(nullif(i->>'tier', ''), 'normal')
      ) ing
     where r.enabled
     group by r.output_species
  ),
  spc as (
    select s0.sp,
           greatest(s0.base0, coalesce(c.input, 0)) as base,
           greatest(s0.ease0, coalesce(c.ease, 0))
             * case when s0.leaving then 0.5 else 1 end as ease
      from sp0 s0
      left join craft c on c.sp = s0.sp
  ),
  grid as (
    select spc.sp, td.tier as tr, td."order" as tier_order,
           greatest(1, td.required_qty) as qty,
           coalesce(h.supply, 0) as supply,
           coalesce(h.holders, 0) as holders,
           pl.n as players,
           spc.base,
           1 - sqrt(least(1::numeric, coalesce(h.holders, 0)::numeric / pl.n)) as scarcity,
           spc.ease * greatest(0::numeric, 1 - 0.1 * td."order") as ease
      from spc
      cross join public.tier_defs td
      cross join pl
      left join held h on h.sp = spc.sp and h.tr = td.tier
  )
  select g.sp, g.tr, g.tier_order, g.qty, g.supply, g.holders, g.players,
         g.base, g.scarcity, g.ease,
         g.base * g.qty * (1 + 3 * g.scarcity * (1 - least(1::numeric, g.ease))) as model
    from grid g;
$$;

-- Modellwert + Marktsignal aus echten Trades der letzten 7 Tage.
create or replace function public._market_values()
returns table (
  species text, tier text, tier_order int, qty int,
  supply int, holders int, players int,
  base numeric, scarcity numeric, ease numeric, model numeric,
  fills int, fill_median numeric, value bigint
)
language sql stable set search_path = public as $$
  with m as (
    select * from public._market_model(now())
  ),
  f as (
    select mf.species as sp, mf.tier as tr, count(*)::int as n,
           (percentile_cont(0.5) within group (order by mf.price))::numeric as med
      from public.market_fills mf
     where mf.created_at > now() - interval '7 days'
     group by mf.species, mf.tier
  )
  select m.species, m.tier, m.tier_order, m.qty, m.supply, m.holders, m.players,
         m.base, m.scarcity, m.ease, m.model,
         coalesce(f.n, 0), f.med,
         case
           when coalesce(f.n, 0) > 0 and f.med > 0 then
             round(exp(
               (1 - least(0.5, 0.1 * f.n)) * ln(greatest(m.model, 1))
               + least(0.5, 0.1 * f.n)
                 * ln(least(greatest(m.model, 1) * 4, greatest(greatest(m.model, 1) / 4, f.med)))
             ))::bigint
           else round(greatest(m.model, 1))::bigint
         end
    from m
    left join f on f.sp = m.species and f.tr = m.tier;
$$;

-- Angebot gültig? Tier gehört noch dem Verkäufer, ist frei und der
-- Verkäufer ist nicht gebannt.
create or replace function public._market_listing_ok(p_animal uuid, p_seller uuid)
returns boolean language sql stable set search_path = public as $$
  select exists (
    select 1
      from public.animals a
      join public.profiles p on p.id = a.owner_id
     where a.id = p_animal
       and a.owner_id = p_seller
       and not a.equipped
       and (a.upgrade_ready_at is null or a.upgrade_ready_at <= now())
       and (a.breeding_until is null or a.breeding_until <= now())
       and not coalesce(p.is_banned, false)
  );
$$;

-- Stündlicher Snapshot, lazy beim ersten market_overview() der Stunde.
create or replace function public._market_snapshot()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_bucket timestamptz := date_trunc('hour', now());
begin
  if exists (select 1 from public.market_snapshots where bucket = v_bucket) then
    return;
  end if;
  insert into public.market_snapshots (species, tier, bucket, value, supply)
  select v.species, v.tier, v_bucket, v.value, v.supply
    from public._market_values() v
   where v.supply > 0 or v.tier = 'normal'
  on conflict do nothing;
  delete from public.market_snapshots where bucket < now() - interval '35 days';
end $$;

-- 3) RPCs

create or replace function public.market_overview()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_now timestamptz := now();
  v_start timestamptz := date_trunc('hour', now()) - interval '7 days';
  v_players int;
  v_markets jsonb;
  v_mine jsonb;
  v_tape jsonb;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  perform public._market_snapshot();

  with mv as (
    select * from public._market_values()
  ),
  asks as (
    select l.species, l.tier, min(l.price) as best_ask, count(*)::int as n
      from public.market_listings l
     where l.status = 'open'
       and public._market_listing_ok(l.animal_id, l.seller_id)
     group by l.species, l.tier
  ),
  fl as (
    select mf.species, mf.tier, count(*)::int as n, sum(mf.price)::bigint as vol
      from public.market_fills mf
     where mf.created_at > v_now - interval '7 days'
     group by mf.species, mf.tier
  ),
  lf as (
    select distinct on (mf.species, mf.tier) mf.species, mf.tier, mf.price
      from public.market_fills mf
     order by mf.species, mf.tier, mf.created_at desc
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'species', v.species,
           'tier', v.tier,
           'order', v.tier_order,
           'qty', v.qty,
           'value', v.value,
           'model', round(v.model),
           'base', round(v.base),
           'scarcity', round(v.scarcity, 4),
           'ease', round(v.ease, 4),
           'supply', v.supply,
           'holders', v.holders,
           'prev_24h', prev.value,
           'last_price', lf.price,
           'fills_7d', coalesce(fl.n, 0),
           'volume_7d', coalesce(fl.vol, 0),
           'best_ask', a.best_ask,
           'asks', coalesce(a.n, 0),
           'spark', spark.vals
         ) order by v.value desc) filter (where v.supply > 0 or v.tier = 'normal' or a.n > 0), '[]'::jsonb),
         max(v.players)
    into v_markets, v_players
    from mv v
    left join asks a on a.species = v.species and a.tier = v.tier
    left join fl on fl.species = v.species and fl.tier = v.tier
    left join lf on lf.species = v.species and lf.tier = v.tier
    left join lateral (
      select s.value
        from public.market_snapshots s
       where s.species = v.species and s.tier = v.tier
         and s.bucket <= v_now - interval '24 hours'
       order by s.bucket desc
       limit 1
    ) prev on true
    left join lateral (
      select jsonb_agg(coalesce(x.value, v.value) order by g.i) as vals
        from generate_series(1, 28) as g(i)
        left join lateral (
          select s.value
            from public.market_snapshots s
           where s.species = v.species and s.tier = v.tier
             and s.bucket <= v_start + g.i * interval '6 hours'
           order by s.bucket desc
           limit 1
        ) x on true
    ) spark on true;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', l.id,
           'animal_id', l.animal_id,
           'species', l.species,
           'tier', l.tier,
           'price', l.price,
           'created_at', l.created_at,
           'valid', public._market_listing_ok(l.animal_id, l.seller_id)
         ) order by l.created_at desc), '[]'::jsonb)
    into v_mine
    from public.market_listings l
   where l.seller_id = uid and l.status = 'open';

  select coalesce(jsonb_agg(jsonb_build_object(
           'species', t.species, 'tier', t.tier, 'price', t.price, 't', t.created_at
         ) order by t.created_at desc), '[]'::jsonb)
    into v_tape
    from (
      select mf.species, mf.tier, mf.price, mf.created_at
        from public.market_fills mf
       order by mf.created_at desc
       limit 20
    ) t;

  return jsonb_build_object(
    'server_now', v_now,
    'players', coalesce(v_players, 1),
    'markets', v_markets,
    'mine', v_mine,
    'tape', v_tape
  );
end $$;

create or replace function public.market_book(p_species text, p_tier text default 'normal', p_range text default '7d')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_now timestamptz := now();
  v_from timestamptz;
  v_market jsonb;
  v_hist jsonb;
  v_fills jsonb;
  v_asks jsonb;
  v_prev bigint;
  v_last bigint;
  v_vol bigint;
  v_n int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  p_tier := coalesce(nullif(p_tier, ''), 'normal');
  if p_range is null or p_range not in ('24h', '7d', '30d') then p_range := '7d'; end if;
  v_from := v_now - case p_range
    when '24h' then interval '24 hours'
    when '7d' then interval '7 days'
    else interval '30 days'
  end;

  select to_jsonb(v) into v_market
    from public._market_values() v
   where v.species = p_species and v.tier = p_tier;
  if v_market is null then raise exception 'unknown market'; end if;

  select s.value into v_prev
    from public.market_snapshots s
   where s.species = p_species and s.tier = p_tier
     and s.bucket <= v_now - interval '24 hours'
   order by s.bucket desc limit 1;

  select mf.price into v_last
    from public.market_fills mf
   where mf.species = p_species and mf.tier = p_tier
   order by mf.created_at desc limit 1;

  select count(*)::int, coalesce(sum(mf.price), 0)::bigint into v_n, v_vol
    from public.market_fills mf
   where mf.species = p_species and mf.tier = p_tier
     and mf.created_at > v_now - interval '7 days';

  -- 30 Tage: nur das 6-h-Raster, sonst stündlich
  select coalesce(jsonb_agg(jsonb_build_object('t', h.bucket, 'v', h.value) order by h.bucket), '[]'::jsonb)
    into v_hist
    from (
      select s.bucket, s.value
        from public.market_snapshots s
       where s.species = p_species and s.tier = p_tier
         and s.bucket >= v_from
         and (p_range <> '30d' or extract(hour from s.bucket)::int % 6 = 0)
      union all
      select v_now, (v_market->>'value')::bigint
    ) h;

  select coalesce(jsonb_agg(jsonb_build_object('t', x.created_at, 'price', x.price) order by x.created_at desc), '[]'::jsonb)
    into v_fills
    from (
      select mf.created_at, mf.price
        from public.market_fills mf
       where mf.species = p_species and mf.tier = p_tier
       order by mf.created_at desc
       limit 40
    ) x;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', x.id, 'price', x.price, 'seller', x.username,
           'mine', x.seller_id = uid, 'created_at', x.created_at
         ) order by x.price, x.created_at), '[]'::jsonb)
    into v_asks
    from (
      select l.id, l.price, l.seller_id, l.created_at, p.username
        from public.market_listings l
        join public.profiles p on p.id = l.seller_id
       where l.species = p_species and l.tier = p_tier
         and l.status = 'open'
         and public._market_listing_ok(l.animal_id, l.seller_id)
       order by l.price, l.created_at
       limit 80
    ) x;

  return jsonb_build_object(
    'server_now', v_now,
    'range', p_range,
    'market', v_market || jsonb_build_object(
      'prev_24h', v_prev, 'last_price', v_last, 'fills_7d', v_n, 'volume_7d', v_vol
    ),
    'history', v_hist,
    'fills', v_fills,
    'asks', v_asks
  );
end $$;

create or replace function public.market_list(p_animal_ids uuid[], p_price bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_ids uuid[];
  v_n int;
  v_bad int;
  v_open int;
  v_new uuid[];
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_price is null or p_price < 1 or p_price > 1000000000000000 then
    raise exception 'invalid price';
  end if;
  select array_agg(distinct x) into v_ids
    from unnest(coalesce(p_animal_ids, '{}'::uuid[])) as x
   where x is not null;
  v_n := coalesce(cardinality(v_ids), 0);
  if v_n < 1 or v_n > 25 then raise exception 'choose 1-25 animals'; end if;
  if exists (select 1 from public.profiles where id = uid and coalesce(is_banned, false)) then
    raise exception 'account banned';
  end if;

  perform 1 from public.animals where id = any(v_ids) and owner_id = uid order by id for update;
  select count(*) into v_bad from unnest(v_ids) as aid
   where not public._market_listing_ok(aid, uid);
  if v_bad > 0 then
    raise exception 'some animals are not available (equipped, upgrading, breeding or not yours)';
  end if;

  -- Angebote früherer Besitzer (Tier wurde inzwischen getauscht) aufräumen
  update public.market_listings
     set status = 'cancelled', closed_at = now()
   where status = 'open' and animal_id = any(v_ids) and seller_id <> uid;
  if exists (select 1 from public.market_listings where status = 'open' and animal_id = any(v_ids)) then
    raise exception 'some animals are already listed';
  end if;

  select count(*) into v_open from public.market_listings where seller_id = uid and status = 'open';
  if v_open + v_n > 60 then raise exception 'too many open listings (max 60)'; end if;

  with ins as (
    insert into public.market_listings (seller_id, animal_id, species, tier, price)
    select uid, a.id, a.species, coalesce(a.tier, 'normal'), p_price
      from public.animals a
     where a.id = any(v_ids)
    returning id
  )
  select array_agg(id) into v_new from ins;

  return jsonb_build_object('listed', v_n, 'ids', to_jsonb(v_new), 'price', p_price, 'server_now', now());
end $$;

create or replace function public.market_cancel(p_listing_ids uuid[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_n int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  update public.market_listings
     set status = 'cancelled', closed_at = now()
   where id = any(coalesce(p_listing_ids, '{}'::uuid[]))
     and seller_id = uid and status = 'open';
  get diagnostics v_n = row_count;
  return jsonb_build_object('cancelled', v_n, 'server_now', now());
end $$;

create or replace function public.market_buy(p_listing_ids uuid[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_ids uuid[];
  v_n int;
  v_open int;
  v_total bigint;
  v_bal bigint;
  v_animals uuid[];
  v_sellers uuid[];
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select array_agg(distinct x) into v_ids
    from unnest(coalesce(p_listing_ids, '{}'::uuid[])) as x
   where x is not null;
  v_n := coalesce(cardinality(v_ids), 0);
  if v_n < 1 or v_n > 25 then raise exception 'choose 1-25 listings'; end if;
  if exists (select 1 from public.profiles where id = uid and coalesce(is_banned, false)) then
    raise exception 'account banned';
  end if;

  perform 1 from public.market_listings where id = any(v_ids) order by id for update;
  select count(*) into v_open from public.market_listings where id = any(v_ids) and status = 'open';
  if v_open <> v_n then raise exception 'listing no longer available'; end if;
  if exists (select 1 from public.market_listings where id = any(v_ids) and seller_id = uid) then
    raise exception 'cannot buy your own listing';
  end if;

  select array_agg(animal_id), array_agg(distinct seller_id), sum(price)
    into v_animals, v_sellers, v_total
    from public.market_listings where id = any(v_ids);

  perform 1 from public.animals where id = any(v_animals) order by id for update;
  if exists (
    select 1 from public.market_listings l
     where l.id = any(v_ids) and not public._market_listing_ok(l.animal_id, l.seller_id)
  ) then
    raise exception 'listing no longer available';
  end if;

  update public.profiles set coins = coins - v_total
   where id = uid and coins >= v_total
   returning coins into v_bal;
  if v_bal is null then raise exception 'insufficient coins'; end if;

  update public.profiles p set coins = p.coins + s.total
    from (
      select seller_id, sum(price)::bigint as total
        from public.market_listings
       where id = any(v_ids)
       group by seller_id
    ) s
   where p.id = s.seller_id;

  update public.animals set owner_id = uid, equipped = false where id = any(v_animals);

  -- War ein verkauftes Tier der Liebling, springt er auf ein anderes Tier
  update public.profiles p
     set favorite_animal_id = (
       select a.id from public.animals a
        where a.owner_id = p.id
        order by a.equipped desc, a.acquired_at asc
        limit 1
     )
   where p.id = any(v_sellers) and p.favorite_animal_id = any(v_animals);
  update public.profiles
     set favorite_animal_id = v_animals[1]
   where id = uid and favorite_animal_id is null;

  update public.market_listings
     set status = 'sold', buyer_id = uid, closed_at = now()
   where id = any(v_ids);

  insert into public.market_fills (listing_id, species, tier, price, seller_id, buyer_id)
  select l.id, l.species, l.tier, l.price, l.seller_id, uid
    from public.market_listings l where l.id = any(v_ids);

  insert into public.transactions (from_user, to_user, amount, kind, meta)
  select uid, l.seller_id, l.price, 'market',
         jsonb_build_object('listing_id', l.id, 'species', l.species, 'tier', l.tier)
    from public.market_listings l where l.id = any(v_ids);

  return jsonb_build_object(
    'coins', v_bal,
    'bought', v_n,
    'spent', v_total,
    'animal_ids', to_jsonb(v_animals),
    'server_now', now()
  );
end $$;

-- 4) Rechte: Helfer nur intern, RPCs nur für eingeloggte Spieler
revoke execute on function public._market_ease_from_chance(numeric) from anon, authenticated, public;
revoke execute on function public._market_model(timestamptz) from anon, authenticated, public;
revoke execute on function public._market_values() from anon, authenticated, public;
revoke execute on function public._market_listing_ok(uuid, uuid) from anon, authenticated, public;
revoke execute on function public._market_snapshot() from anon, authenticated, public;

grant execute on function public.market_overview() to authenticated;
grant execute on function public.market_book(text, text, text) to authenticated;
grant execute on function public.market_list(uuid[], bigint) to authenticated;
grant execute on function public.market_cancel(uuid[]) to authenticated;
grant execute on function public.market_buy(uuid[]) to authenticated;

revoke execute on function public.market_overview() from anon, public;
revoke execute on function public.market_book(text, text, text) from anon, public;
revoke execute on function public.market_list(uuid[], bigint) from anon, public;
revoke execute on function public.market_cancel(uuid[]) from anon, public;
revoke execute on function public.market_buy(uuid[]) from anon, public;

-- 5) Kursverlauf rückwirkend füllen: 14 Tage im 6-h-Raster, davor täglich.
do $$
declare
  v_base timestamptz := date_trunc('day', now())
    + floor(extract(hour from now()) / 6)::int * interval '6 hours';
  v_at timestamptz;
  k int;
begin
  for k in 1..56 loop
    v_at := v_base - k * interval '6 hours';
    insert into public.market_snapshots (species, tier, bucket, value, supply)
    select m.species, m.tier, v_at, round(greatest(m.model, 1))::bigint, m.supply
      from public._market_model(v_at) m
     where m.supply > 0 or m.tier = 'normal'
    on conflict do nothing;
  end loop;
  for k in 15..30 loop
    v_at := date_trunc('day', now()) - k * interval '1 day';
    insert into public.market_snapshots (species, tier, bucket, value, supply)
    select m.species, m.tier, v_at, round(greatest(m.model, 1))::bigint, m.supply
      from public._market_model(v_at) m
     where m.supply > 0 or m.tier = 'normal'
    on conflict do nothing;
  end loop;
end $$;
