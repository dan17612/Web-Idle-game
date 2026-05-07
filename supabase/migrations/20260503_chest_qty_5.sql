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
  if p_qty is null or p_qty < 1 or p_qty > 5 then raise exception 'qty must be 1, 2 or 5'; end if;
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

create or replace function public.ticket_chest_open(p_qty int default 1)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.ticket_config;
  state public.ticket_shop_state;
  bought_slot int; total_cost bigint; new_tickets bigint;
  w_total int; r int; acc int; rec record;
  picked_species text; new_ids uuid[] := '{}'; new_species text[] := '{}';
  i int; new_animal public.animals%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_qty is null or p_qty < 1 or p_qty > 5 then raise exception 'qty must be 1, 2 or 5'; end if;
  select * into cfg from public.ticket_config where id = 1;
  if cfg is null then raise exception 'ticket config missing'; end if;
  state := public._ticket_rotate_if_needed();
  select count into bought_slot from public.ticket_chest_purchases
    where user_id = uid and slot_start = state.updated_at for update;
  bought_slot := coalesce(bought_slot, 0);
  if bought_slot + p_qty > cfg.chest_slot_limit then
    raise exception 'ticket chest limit reached (% / %)', bought_slot, cfg.chest_slot_limit;
  end if;
  total_cost := cfg.chest_price * p_qty;
  update public.profiles set tickets = tickets - total_cost
    where id = uid and tickets >= total_cost returning tickets into new_tickets;
  if new_tickets is null then raise exception 'insufficient tickets'; end if;
  insert into public.ticket_chest_purchases(user_id, slot_start, count) values (uid, state.updated_at, p_qty)
    on conflict (user_id, slot_start) do update set count = public.ticket_chest_purchases.count + p_qty;
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
    'tickets',     new_tickets,
    'qty',         p_qty,
    'species',     to_jsonb(new_species),
    'animal_ids',  to_jsonb(new_ids),
    'bought_slot', bought_slot + p_qty,
    'slot_limit',  cfg.chest_slot_limit,
    'price',       cfg.chest_price,
    'slot_start',  state.updated_at
  );
end $$;
