-- =============================================================================
-- Fix: Trade validations should allow finished upgrades
-- =============================================================================
-- Root cause:
-- Trade RPCs used `upgrade_ready_at is null` to decide if an animal is tradable.
-- Tier-upgraded animals keep a timestamp, so finished upgrades (<= now()) were
-- incorrectly treated as "still upgrading".
--
-- Result:
-- Rainbow (and other upgraded) animals could be blocked with:
-- "some offered animals are not yours, equipped or upgrading"
--
-- Fix:
-- Treat animal as tradable when upgrade is finished:
--   upgrade_ready_at is null OR upgrade_ready_at <= now()

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
