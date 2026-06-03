-- 20260603_05_trade_eggs.sql
-- Extend propose_trade / accept_trade / accept_public_trade / trades_view for eggs.
-- Eggs are tracked via the trade_eggs join table (created in Task 2).

-- 1) New trades column for public wanted eggs
alter table public.trades
  add column if not exists wanted_eggs jsonb not null default '[]'::jsonb;

-- 2) propose_trade: 3 new optional params (requester eggs, addressee eggs, wanted eggs)
create or replace function public.propose_trade(
  p_addressee         text,
  p_requester_animals uuid[],
  p_requester_coins   bigint,
  p_addressee_animals uuid[],
  p_addressee_coins   bigint,
  p_note              text   default null,
  p_wanted_species    text   default null,
  p_wanted_tier       text   default null,
  p_wanted_qty        int    default 0,
  p_wanted_animals    jsonb  default '[]'::jsonb,
  p_requester_eggs    uuid[] default '{}',
  p_addressee_eggs    uuid[] default '{}',
  p_wanted_eggs       jsonb  default '[]'::jsonb
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); target uuid; new_id uuid;
  miss_count int; is_pub boolean := false;
  wanted_items jsonb := '[]'::jsonb;
  wanted_egg_items jsonb := '[]'::jsonb;
  first_wanted jsonb;
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
  p_requester_eggs    := coalesce(p_requester_eggs, '{}');
  p_addressee_eggs    := coalesce(p_addressee_eggs, '{}');
  p_requester_coins   := coalesce(p_requester_coins, 0);
  p_addressee_coins   := coalesce(p_addressee_coins, 0);
  p_wanted_qty        := greatest(coalesce(p_wanted_qty, 0), 0);
  p_wanted_animals    := coalesce(p_wanted_animals, '[]'::jsonb);
  p_wanted_eggs       := coalesce(p_wanted_eggs, '[]'::jsonb);

  -- Normalize wanted_animals
  select coalesce(jsonb_agg(jsonb_build_object(
    'species', item->>'species',
    'tier',    coalesce(nullif(item->>'tier', ''), 'normal'),
    'qty',     greatest(coalesce((item->>'qty')::int, 0), 0)
  )), '[]'::jsonb) into wanted_items
  from jsonb_array_elements(
    case when jsonb_typeof(p_wanted_animals) = 'array' then p_wanted_animals else '[]'::jsonb end
  ) item
  where coalesce(item->>'species', '') <> ''
    and greatest(coalesce((item->>'qty')::int, 0), 0) > 0;

  if jsonb_array_length(wanted_items) = 0
     and p_wanted_species is not null and trim(p_wanted_species) <> ''
     and p_wanted_qty > 0 then
    wanted_items := jsonb_build_array(jsonb_build_object(
      'species', p_wanted_species,
      'tier',    coalesce(nullif(p_wanted_tier, ''), 'normal'),
      'qty',     p_wanted_qty
    ));
  end if;
  first_wanted := wanted_items->0;
  p_wanted_species := first_wanted->>'species';
  p_wanted_tier    := coalesce(first_wanted->>'tier', 'normal');
  p_wanted_qty     := coalesce((first_wanted->>'qty')::int, 0);

  -- Normalize wanted_eggs: [{ egg_type, qty }, ...]
  select coalesce(jsonb_agg(jsonb_build_object(
    'egg_type', item->>'egg_type',
    'qty',      greatest(coalesce((item->>'qty')::int, 0), 0)
  )), '[]'::jsonb) into wanted_egg_items
  from jsonb_array_elements(
    case when jsonb_typeof(p_wanted_eggs) = 'array' then p_wanted_eggs else '[]'::jsonb end
  ) item
  where coalesce(item->>'egg_type', '') <> ''
    and greatest(coalesce((item->>'qty')::int, 0), 0) > 0;

  if p_requester_coins < 0 or p_addressee_coins < 0 then
    raise exception 'coins must be non-negative';
  end if;

  if cardinality(p_requester_animals) + cardinality(p_addressee_animals)
     + cardinality(p_requester_eggs) + cardinality(p_addressee_eggs)
     + p_requester_coins + p_addressee_coins = 0
     and jsonb_array_length(wanted_items) = 0
     and jsonb_array_length(wanted_egg_items) = 0 then
    raise exception 'trade must contain something';
  end if;

  -- Validate requester's animals
  if cardinality(p_requester_animals) > 0 then
    select count(*) into miss_count from unnest(p_requester_animals) aid
      where not exists (
        select 1 from public.animals
         where id = aid and owner_id = uid and equipped = false
           and (upgrade_ready_at is null or upgrade_ready_at <= now())
      );
    if miss_count > 0 then
      raise exception 'some offered animals are not yours, equipped or upgrading';
    end if;
  end if;

  -- Validate requester's eggs
  if cardinality(p_requester_eggs) > 0 then
    select count(*) into miss_count from unnest(p_requester_eggs) eid
      where not exists (
        select 1 from public.player_eggs where id = eid and owner_id = uid
      );
    if miss_count > 0 then raise exception 'some offered eggs are not yours'; end if;

    if exists (select 1 from public.trade_eggs te
               join public.trades t2 on t2.id = te.trade_id
               where te.egg_id = any(p_requester_eggs) and t2.status = 'pending') then
      raise exception 'some offered eggs are already in another pending trade';
    end if;
  end if;

  if is_pub then
    if cardinality(p_addressee_animals) > 0 then
      raise exception 'public trades cannot request specific animal IDs';
    end if;
    if cardinality(p_addressee_eggs) > 0 then
      raise exception 'public trades cannot request specific egg IDs';
    end if;
  else
    if cardinality(p_addressee_animals) > 0 then
      select count(*) into miss_count from unnest(p_addressee_animals) aid
        where not exists (
          select 1 from public.animals
           where id = aid and owner_id = target and equipped = false
             and (upgrade_ready_at is null or upgrade_ready_at <= now())
        );
      if miss_count > 0 then
        raise exception 'some requested animals are not owned by addressee or are equipped';
      end if;
    end if;
    if cardinality(p_addressee_eggs) > 0 then
      select count(*) into miss_count from unnest(p_addressee_eggs) eid
        where not exists (
          select 1 from public.player_eggs where id = eid and owner_id = target
        );
      if miss_count > 0 then
        raise exception 'some requested eggs are not owned by addressee';
      end if;
      if exists (select 1 from public.trade_eggs te
                 join public.trades t2 on t2.id = te.trade_id
                 where te.egg_id = any(p_addressee_eggs) and t2.status = 'pending') then
        raise exception 'some requested eggs are already in another pending trade';
      end if;
    end if;
  end if;

  insert into public.trades(
    requester_id, addressee_id, is_public,
    requester_animals, addressee_animals,
    requester_coins, addressee_coins, note,
    wanted_species, wanted_tier, wanted_qty, wanted_animals, wanted_eggs, expires_at
  ) values (
    uid, target, is_pub,
    p_requester_animals, p_addressee_animals,
    p_requester_coins, p_addressee_coins, nullif(p_note, ''),
    nullif(p_wanted_species, ''), nullif(coalesce(p_wanted_tier, 'normal'), ''),
    p_wanted_qty, wanted_items, wanted_egg_items,
    now() + interval '7 days'
  ) returning id into new_id;

  if cardinality(p_requester_eggs) > 0 then
    insert into public.trade_eggs(trade_id, egg_id, side)
      select new_id, eid, 'requester' from unnest(p_requester_eggs) eid;
  end if;
  if cardinality(p_addressee_eggs) > 0 then
    insert into public.trade_eggs(trade_id, egg_id, side)
      select new_id, eid, 'addressee' from unnest(p_addressee_eggs) eid;
  end if;

  return jsonb_build_object('trade_id', new_id, 'public', is_pub);
end $$;

-- 3) accept_trade: also transfer egg ownership
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

  -- Validate animals still owned
  if cardinality(t.requester_animals) > 0 then
    select count(*) into miss_count from unnest(t.requester_animals) aid
      where not exists (
        select 1 from public.animals
         where id = aid and owner_id = t.requester_id and equipped = false
           and (upgrade_ready_at is null or upgrade_ready_at <= now())
      );
    if miss_count > 0 then raise exception 'requester no longer owns all offered animals'; end if;
  end if;
  if cardinality(t.addressee_animals) > 0 then
    select count(*) into miss_count from unnest(t.addressee_animals) aid
      where not exists (
        select 1 from public.animals
         where id = aid and owner_id = t.addressee_id and equipped = false
           and (upgrade_ready_at is null or upgrade_ready_at <= now())
      );
    if miss_count > 0 then raise exception 'you no longer own all requested animals'; end if;
  end if;

  -- Validate eggs still owned (and not in incubation)
  if exists (select 1 from public.trade_eggs te
             left join public.player_eggs pe on pe.id = te.egg_id
             where te.trade_id = t.id and te.side = 'requester'
               and (pe.id is null or pe.owner_id <> t.requester_id)) then
    raise exception 'requester no longer owns all offered eggs';
  end if;
  if exists (select 1 from public.trade_eggs te
             left join public.player_eggs pe on pe.id = te.egg_id
             where te.trade_id = t.id and te.side = 'addressee'
               and (pe.id is null or pe.owner_id <> t.addressee_id)) then
    raise exception 'you no longer own all requested eggs';
  end if;

  -- Coin transfers
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
  if t.requester_coins > 0 then
    update public.profiles set coins = coins + t.requester_coins where id = t.addressee_id;
  end if;
  if t.addressee_coins > 0 then
    update public.profiles set coins = coins + t.addressee_coins where id = t.requester_id;
  end if;

  -- Animal transfer
  if cardinality(t.requester_animals) > 0 then
    update public.animals set owner_id = t.addressee_id, equipped = false
      where id = any(t.requester_animals);
  end if;
  if cardinality(t.addressee_animals) > 0 then
    update public.animals set owner_id = t.requester_id, equipped = false
      where id = any(t.addressee_animals);
  end if;

  -- Egg transfer
  update public.player_eggs set owner_id = t.addressee_id
    where id in (select egg_id from public.trade_eggs
                  where trade_id = t.id and side = 'requester');
  update public.player_eggs set owner_id = t.requester_id
    where id in (select egg_id from public.trade_eggs
                  where trade_id = t.id and side = 'addressee');

  update public.trades set status = 'accepted', closed_at = now() where id = t.id;

  insert into public.transactions(from_user, to_user, amount, kind, meta)
    values (uid, t.requester_id, greatest(t.addressee_coins, 1), 'trade',
            jsonb_build_object('trade_id', t.id,
              'requester_animals', t.requester_animals,
              'addressee_animals', t.addressee_animals,
              'requester_coins', t.requester_coins,
              'addressee_coins', t.addressee_coins));

  return jsonb_build_object('ok', true);
end $$;

-- 4) accept_public_trade: new p_my_eggs param + validate against wanted_eggs
create or replace function public.accept_public_trade(
  p_trade_id uuid,
  p_my_animals uuid[],
  p_my_eggs uuid[] default '{}'
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); t public.trades%rowtype;
  req_bal bigint; add_bal bigint; miss_count int; match_count int;
  wanted jsonb; wanted_total int := 0;
  wanted_egg jsonb; egg_match_count int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into t from public.trades where id = p_trade_id for update;
  if not found then raise exception 'trade not found'; end if;
  if t.status <> 'pending' then raise exception 'trade not pending'; end if;
  if not t.is_public then raise exception 'not a public trade'; end if;
  if t.requester_id = uid then raise exception 'cannot accept your own trade'; end if;

  p_my_animals := coalesce(p_my_animals, '{}');
  p_my_eggs    := coalesce(p_my_eggs, '{}');

  -- Validate animal ownership
  if cardinality(p_my_animals) > 0 then
    select count(*) into miss_count from unnest(p_my_animals) aid
      where not exists (
        select 1 from public.animals
         where id = aid and owner_id = uid and equipped = false
           and (upgrade_ready_at is null or upgrade_ready_at <= now())
      );
    if miss_count > 0 then raise exception 'some of your animals are not available'; end if;
  end if;

  -- Validate egg ownership + not in pending trade
  if cardinality(p_my_eggs) > 0 then
    select count(*) into miss_count from unnest(p_my_eggs) eid
      where not exists (select 1 from public.player_eggs where id = eid and owner_id = uid);
    if miss_count > 0 then raise exception 'some of your eggs are not available'; end if;

    if exists (select 1 from public.trade_eggs te
               join public.trades t2 on t2.id = te.trade_id
               where te.egg_id = any(p_my_eggs) and t2.status = 'pending') then
      raise exception 'some of your eggs are already in another pending trade';
    end if;
  end if;

  -- Wanted animals
  if jsonb_array_length(coalesce(t.wanted_animals, '[]'::jsonb)) > 0 then
    select coalesce(sum(greatest(coalesce((item->>'qty')::int, 0), 0)), 0)::int into wanted_total
      from jsonb_array_elements(t.wanted_animals) item;
    if cardinality(p_my_animals) <> wanted_total then
      raise exception 'you must include exactly the requested animals';
    end if;
    for wanted in select * from jsonb_array_elements(t.wanted_animals) loop
      select count(*) into match_count from public.animals
        where id = any(p_my_animals) and owner_id = uid
          and species = wanted->>'species'
          and coalesce(tier, 'normal') = coalesce(nullif(wanted->>'tier', ''), 'normal');
      if match_count <> greatest(coalesce((wanted->>'qty')::int, 1), 1) then
        raise exception 'you must include exactly % % (%)',
          greatest(coalesce((wanted->>'qty')::int, 1), 1),
          wanted->>'species', coalesce(nullif(wanted->>'tier', ''), 'normal');
      end if;
    end loop;
  elsif t.wanted_species is not null then
    if cardinality(p_my_animals) <> greatest(coalesce(t.wanted_qty, 1), 1) then
      raise exception 'you must include exactly the requested animals';
    end if;
    select count(*) into match_count from public.animals
      where id = any(p_my_animals) and owner_id = uid
        and species = t.wanted_species
        and coalesce(tier, 'normal') = coalesce(t.wanted_tier, 'normal');
    if match_count <> greatest(coalesce(t.wanted_qty, 1), 1) then
      raise exception 'you must include exactly % % (%)',
        greatest(coalesce(t.wanted_qty, 1), 1), t.wanted_species,
        coalesce(t.wanted_tier, 'normal');
    end if;
  elsif cardinality(p_my_animals) > 0 then
    raise exception 'this trade does not request animals';
  end if;

  -- Wanted eggs
  if jsonb_array_length(coalesce(t.wanted_eggs, '[]'::jsonb)) > 0 then
    select coalesce(sum(greatest(coalesce((item->>'qty')::int, 0), 0)), 0)::int into wanted_total
      from jsonb_array_elements(t.wanted_eggs) item;
    if cardinality(p_my_eggs) <> wanted_total then
      raise exception 'you must include exactly the requested eggs';
    end if;
    for wanted_egg in select * from jsonb_array_elements(t.wanted_eggs) loop
      select count(*) into egg_match_count from public.player_eggs
        where id = any(p_my_eggs) and owner_id = uid
          and egg_type = wanted_egg->>'egg_type';
      if egg_match_count <> greatest(coalesce((wanted_egg->>'qty')::int, 1), 1) then
        raise exception 'you must include exactly % % eggs',
          greatest(coalesce((wanted_egg->>'qty')::int, 1), 1),
          wanted_egg->>'egg_type';
      end if;
    end loop;
  elsif cardinality(p_my_eggs) > 0 then
    raise exception 'this trade does not request eggs';
  end if;

  -- Validate requester's animals/eggs still present
  if cardinality(t.requester_animals) > 0 then
    select count(*) into miss_count from unnest(t.requester_animals) aid
      where not exists (
        select 1 from public.animals
         where id = aid and owner_id = t.requester_id and equipped = false
           and (upgrade_ready_at is null or upgrade_ready_at <= now())
      );
    if miss_count > 0 then raise exception 'requester no longer owns all offered animals'; end if;
  end if;
  if exists (select 1 from public.trade_eggs te
             left join public.player_eggs pe on pe.id = te.egg_id
             where te.trade_id = t.id and te.side = 'requester'
               and (pe.id is null or pe.owner_id <> t.requester_id)) then
    raise exception 'requester no longer owns all offered eggs';
  end if;

  -- Coin transfers
  if t.requester_coins > 0 then
    update public.profiles set coins = coins - t.requester_coins
      where id = t.requester_id and coins >= t.requester_coins returning coins into req_bal;
    if req_bal is null then raise exception 'requester has insufficient coins'; end if;
  end if;
  if t.addressee_coins > 0 then
    update public.profiles set coins = coins - t.addressee_coins
      where id = uid and coins >= t.addressee_coins returning coins into add_bal;
    if add_bal is null then
      if t.requester_coins > 0 then
        update public.profiles set coins = coins + t.requester_coins where id = t.requester_id;
      end if;
      raise exception 'you have insufficient coins';
    end if;
  end if;
  if t.requester_coins > 0 then
    update public.profiles set coins = coins + t.requester_coins where id = uid;
  end if;
  if t.addressee_coins > 0 then
    update public.profiles set coins = coins + t.addressee_coins where id = t.requester_id;
  end if;

  -- Animal transfer
  if cardinality(t.requester_animals) > 0 then
    update public.animals set owner_id = uid, equipped = false
      where id = any(t.requester_animals);
  end if;
  if cardinality(p_my_animals) > 0 then
    update public.animals set owner_id = t.requester_id, equipped = false
      where id = any(p_my_animals);
  end if;

  -- Egg transfer (requester's offered eggs → caller, caller's offered eggs → requester)
  update public.player_eggs set owner_id = uid
    where id in (select egg_id from public.trade_eggs
                  where trade_id = t.id and side = 'requester');
  if cardinality(p_my_eggs) > 0 then
    update public.player_eggs set owner_id = t.requester_id where id = any(p_my_eggs);
    insert into public.trade_eggs(trade_id, egg_id, side)
      select t.id, eid, 'addressee' from unnest(p_my_eggs) eid
      on conflict (trade_id, egg_id) do nothing;
  end if;

  update public.trades
     set status = 'accepted', closed_at = now(),
         addressee_id = uid, addressee_animals = p_my_animals
   where id = t.id;

  insert into public.transactions(from_user, to_user, amount, kind, meta)
    values (uid, t.requester_id, greatest(t.addressee_coins, 1), 'public_trade',
            jsonb_build_object('trade_id', t.id));

  return jsonb_build_object('ok', true);
end $$;

-- 5) Rebuild trades_view with egg details
create or replace view public.trades_view as
select
  t.id,
  t.requester_id,
  t.addressee_id,
  t.is_public,
  t.requester_animals,
  t.addressee_animals,
  t.requester_coins,
  t.addressee_coins,
  t.note,
  t.status,
  t.created_at,
  t.closed_at,
  t.expires_at,
  t.wanted_species,
  t.wanted_tier,
  t.wanted_qty,
  t.wanted_animals,
  t.wanted_eggs,
  pr.username as requester_username,
  pa.username as addressee_username,
  (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'species', a.species, 'tier', a.tier)
                             order by a.acquired_at), '[]'::jsonb)
     from public.animals a where a.id = any(t.requester_animals)) as requester_animal_details,
  (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'species', a.species, 'tier', a.tier)
                             order by a.acquired_at), '[]'::jsonb)
     from public.animals a where a.id = any(t.addressee_animals)) as addressee_animal_details,
  (select coalesce(jsonb_agg(jsonb_build_object('id', pe.id, 'egg_type', pe.egg_type,
                                                'name', et.name, 'emoji', et.emoji)
                             order by pe.acquired_at), '[]'::jsonb)
     from public.trade_eggs te
     join public.player_eggs pe on pe.id = te.egg_id
     join public.egg_types   et on et.egg_type = pe.egg_type
     where te.trade_id = t.id and te.side = 'requester') as requester_egg_details,
  (select coalesce(jsonb_agg(jsonb_build_object('id', pe.id, 'egg_type', pe.egg_type,
                                                'name', et.name, 'emoji', et.emoji)
                             order by pe.acquired_at), '[]'::jsonb)
     from public.trade_eggs te
     join public.player_eggs pe on pe.id = te.egg_id
     join public.egg_types   et on et.egg_type = pe.egg_type
     where te.trade_id = t.id and te.side = 'addressee') as addressee_egg_details
  from public.trades t
  join public.profiles pr on pr.id = t.requester_id
  left join public.profiles pa on pa.id = t.addressee_id;
