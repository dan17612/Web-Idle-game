create or replace function public.accept_public_trade(p_trade_id uuid, p_my_animals uuid[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); t public.trades%rowtype;
  req_bal bigint; add_bal bigint; miss_count int; match_count int; wanted jsonb; wanted_total int := 0;
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
        raise exception 'you must include exactly % % (%)', greatest(coalesce((wanted->>'qty')::int, 1), 1), wanted->>'species', coalesce(nullif(wanted->>'tier', ''), 'normal');
      end if;
    end loop;
  elsif t.wanted_species is not null then
    if cardinality(p_my_animals) <> greatest(coalesce(t.wanted_qty, 1), 1) then
      raise exception 'you must include exactly the requested animals';
    end if;
    select count(*) into match_count from public.animals
      where id = any(p_my_animals) and owner_id = uid
        and species = t.wanted_species and coalesce(tier, 'normal') = coalesce(t.wanted_tier, 'normal');
    if match_count <> greatest(coalesce(t.wanted_qty, 1), 1) then
      raise exception 'you must include exactly % % (%)', greatest(coalesce(t.wanted_qty, 1), 1), t.wanted_species, coalesce(t.wanted_tier, 'normal');
    end if;
  elsif cardinality(p_my_animals) > 0 then
    raise exception 'this trade does not request animals';
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
