-- Endlessboss-Modus, Event-Versteck-Option und neue Spalten für species_costs
-- (craft_only / disappears_at), die der Admin pro Restock setzen kann.

-- 1) Event-Schedule kann Countdown verbergen (Spieler sieht dann nichts).
alter table public.event_schedule
  add column if not exists show_countdown boolean not null default true;

comment on column public.event_schedule.show_countdown is
  'Wenn false, blendet das Frontend Countdown und Ende-Banner komplett aus.';

create or replace function public.get_event_schedule()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_object_agg(key, jsonb_build_object(
    'starts_at', starts_at,
    'ends_at', ends_at,
    'enabled', enabled,
    'show_countdown', show_countdown
  )), '{}'::jsonb)
  from public.event_schedule;
$$;

grant execute on function public.get_event_schedule() to anon, authenticated;

-- Endlessboss-Event soll dauerhaft laufen, ohne Countdown.
insert into public.event_schedule (key, starts_at, ends_at, enabled, show_countdown)
values ('boss_endless', null, null, true, false)
on conflict (key) do nothing;

-- 2) species_costs: craft_only + disappears_at (unabhängig von enabled/shop_visible).
alter table public.species_costs
  add column if not exists craft_only boolean not null default false,
  add column if not exists disappears_at timestamptz;

comment on column public.species_costs.craft_only is
  'Wenn true, wird die Spezies im Shop mit "Nur craftbar" markiert (kein Kauf möglich).';
comment on column public.species_costs.disappears_at is
  'Wenn gesetzt und in Vergangenheit, ist die Spezies nicht mehr im Shop kaufbar.';

-- 3) buy_animal blockt nach Verschwindezeit oder bei craft_only=true.
create or replace function public.buy_animal(p_species text, p_cost bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  real_cost bigint; new_animal public.animals%rowtype;
  new_balance bigint; state public.shop_state;
  rand_qty int; force_qty int; mine_qty int; catalog_qty int;
  slots int; equipped_cnt int; auto_equip boolean; current_fav uuid;
  v_craft_only boolean; v_disappears_at timestamptz;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select cost, craft_only, disappears_at
    into real_cost, v_craft_only, v_disappears_at
    from public.species_costs where species = p_species;
  if real_cost is null then raise exception 'unknown species'; end if;
  if coalesce(v_craft_only, false) then raise exception 'species is craft only'; end if;
  if v_disappears_at is not null and v_disappears_at <= now() then
    raise exception 'species no longer available';
  end if;
  state := public._rotate_if_needed();
  rand_qty  := coalesce((state.random_stock->>p_species)::int, 0);
  force_qty := coalesce((state.forced_stock->>p_species)::int, 0);
  catalog_qty := rand_qty + force_qty;
  if catalog_qty <= 0 then raise exception 'species not available'; end if;
  select qty into mine_qty from public.shop_purchases
    where user_id = uid and slot_start = state.updated_at and species = p_species;
  mine_qty := coalesce(mine_qty, 0);
  if mine_qty >= catalog_qty then raise exception 'already bought your share this slot'; end if;
  update public.profiles set coins = coins - real_cost
    where id = uid and coins >= real_cost returning coins into new_balance;
  if new_balance is null then raise exception 'insufficient coins'; end if;
  insert into public.shop_purchases(user_id, slot_start, species, qty)
    values (uid, state.updated_at, p_species, 1)
    on conflict (user_id, slot_start, species) do update set qty = public.shop_purchases.qty + 1;
  select equip_slots, favorite_animal_id into slots, current_fav from public.profiles where id = uid;
  select count(*) into equipped_cnt from public.animals where owner_id = uid and equipped = true;
  auto_equip := equipped_cnt < slots;
  insert into public.animals(owner_id, species, equipped) values (uid, p_species, auto_equip)
    returning * into new_animal;
  if current_fav is null then
    update public.profiles set favorite_animal_id = new_animal.id where id = uid;
  end if;
  return jsonb_build_object('coins', new_balance, 'animal', to_jsonb(new_animal));
end $$;

grant execute on function public.buy_animal(text, bigint) to authenticated;

-- 4) get_shop liefert craft_only + disappears_at pro Spezies.
create or replace function public.get_shop()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  state public.shop_state;
  uid uuid := auth.uid();
  merged jsonb; mine jsonb; species_meta jsonb;
begin
  state := public._rotate_if_needed();
  with combined as (
    select key as species, sum(value::int) as qty
    from (
      select key, value from jsonb_each_text(state.random_stock)
      union all
      select key, value from jsonb_each_text(state.forced_stock)
    ) t
    group by key having sum(value::int) > 0
  )
  select coalesce(jsonb_object_agg(species, qty), '{}') into merged from combined;
  if uid is not null then
    select coalesce(jsonb_object_agg(species, qty), '{}') into mine
      from public.shop_purchases
      where user_id = uid and slot_start = state.updated_at;
  else
    mine := '{}';
  end if;
  select coalesce(jsonb_object_agg(species, jsonb_build_object(
    'craft_only', coalesce(craft_only, false),
    'disappears_at', disappears_at
  )), '{}') into species_meta
  from public.species_costs;
  return jsonb_build_object(
    'stock',        merged,
    'forced_stock', state.forced_stock,
    'my_purchases', coalesce(mine, '{}'),
    'species_meta', species_meta,
    'slot_start',   state.updated_at,
    'rotates_at',   state.rotates_at,
    'server_now',   now()
  );
end $$;

grant execute on function public.get_shop() to anon, authenticated;

-- 5) Admin RPC: craft_only + disappears_at setzen (z. B. zusammen mit Restock).
create or replace function public.admin_set_species_event(
  p_species text,
  p_craft_only boolean default null,
  p_disappears_at timestamptz default null,
  p_clear_disappears boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_row public.species_costs%rowtype;
begin
  v_role := public._admin_role();
  if v_role is null or v_role <> 'admin' then
    raise exception 'admin only';
  end if;
  update public.species_costs
     set craft_only = coalesce(p_craft_only, craft_only),
         disappears_at = case
           when p_clear_disappears then null
           when p_disappears_at is not null then p_disappears_at
           else disappears_at
         end
   where species = p_species
   returning * into v_row;
  if not found then raise exception 'unknown species'; end if;
  return jsonb_build_object(
    'species', v_row.species,
    'craft_only', v_row.craft_only,
    'disappears_at', v_row.disappears_at
  );
end $$;

revoke all on function public.admin_set_species_event(text, boolean, timestamptz, boolean)
  from public, anon, authenticated;
grant execute on function public.admin_set_species_event(text, boolean, timestamptz, boolean)
  to authenticated;

-- 6) Endlessboss-Tabellen.

-- Persistenter Run pro Spieler (1 aktiver Run + Historie).
create table if not exists public.boss_endless_runs (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  finished_at timestamptz,
  damage bigint not null default 0 check (damage >= 0),
  status text not null default 'active' check (status in ('active', 'finished', 'expired'))
);

comment on table public.boss_endless_runs is
  'Endlessboss-Runs: 3 Minuten Schaden sammeln, bestes Ergebnis pro Spieler zählt.';

create index if not exists boss_endless_runs_user_idx
  on public.boss_endless_runs(user_id, status, damage desc);
create index if not exists boss_endless_runs_lb_idx
  on public.boss_endless_runs(damage desc, finished_at desc) where status = 'finished';

alter table public.boss_endless_runs enable row level security;

drop policy if exists "boss_endless_runs self read" on public.boss_endless_runs;
create policy "boss_endless_runs self read" on public.boss_endless_runs
  for select using ((select auth.uid()) = user_id);

revoke all on table public.boss_endless_runs from anon;
grant select on table public.boss_endless_runs to authenticated;
grant select, insert, update, delete on table public.boss_endless_runs to service_role;

-- 7) RPCs

-- Status: aktueller Run (falls aktiv), bester Run, Cooldown.
create or replace function public.boss_endless_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_active record;
  v_best record;
  v_last_finish timestamptz;
  v_cooldown_seconds int := 3600;
  v_event_active boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  v_event_active := public.event_is_active('boss_endless');

  select * into v_active from public.boss_endless_runs
   where user_id = uid and status = 'active'
   order by id desc limit 1;

  if v_active.id is not null and v_active.ends_at <= now() then
    update public.boss_endless_runs
       set status = 'expired',
           finished_at = ends_at
     where id = v_active.id;
    v_active := null;
  end if;

  select * into v_best from public.boss_endless_runs
   where user_id = uid and status = 'finished'
   order by damage desc, finished_at desc limit 1;

  select greatest(coalesce(max(finished_at), to_timestamp(0)), to_timestamp(0))
    into v_last_finish
    from public.boss_endless_runs
   where user_id = uid and status in ('finished', 'expired');

  return jsonb_build_object(
    'event_active', v_event_active,
    'cooldown_seconds', v_cooldown_seconds,
    'cooldown_until', case when v_last_finish is null or v_last_finish = to_timestamp(0)
                       then null
                       else v_last_finish + (v_cooldown_seconds || ' seconds')::interval end,
    'active_run', case when v_active.id is null then null
                       else jsonb_build_object(
                         'id', v_active.id,
                         'started_at', v_active.started_at,
                         'ends_at', v_active.ends_at
                       ) end,
    'best', case when v_best.id is null then null
                 else jsonb_build_object(
                   'id', v_best.id,
                   'damage', v_best.damage,
                   'finished_at', v_best.finished_at
                 ) end,
    'server_now', now()
  );
end $$;

grant execute on function public.boss_endless_status() to authenticated;

-- Run starten: prüft Cooldown + Event aktiv.
create or replace function public.boss_endless_start()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_now timestamptz := now();
  v_active record;
  v_last_finish timestamptz;
  v_cooldown_seconds int := 3600;
  v_run_seconds int := 180;
  v_new_id bigint;
  v_ends_at timestamptz;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not public.event_is_active('boss_endless') then
    raise exception 'event ended';
  end if;

  -- Aktiven Run als expired markieren falls abgelaufen.
  update public.boss_endless_runs
     set status = 'expired', finished_at = ends_at
   where user_id = uid and status = 'active' and ends_at <= v_now;

  select * into v_active from public.boss_endless_runs
   where user_id = uid and status = 'active'
   order by id desc limit 1;

  if v_active.id is not null then
    raise exception 'run already active';
  end if;

  select max(finished_at) into v_last_finish
    from public.boss_endless_runs
   where user_id = uid and status in ('finished', 'expired');

  if v_last_finish is not null
     and v_last_finish + (v_cooldown_seconds || ' seconds')::interval > v_now then
    raise exception 'cooldown active';
  end if;

  v_ends_at := v_now + (v_run_seconds || ' seconds')::interval;
  insert into public.boss_endless_runs(user_id, started_at, ends_at)
  values (uid, v_now, v_ends_at)
  returning id into v_new_id;

  return jsonb_build_object(
    'id', v_new_id,
    'started_at', v_now,
    'ends_at', v_ends_at,
    'duration_seconds', v_run_seconds,
    'cooldown_seconds', v_cooldown_seconds,
    'server_now', v_now
  );
end $$;

grant execute on function public.boss_endless_start() to authenticated;

-- Run beenden: Damage speichern. Cap bei realistischem Maximum, plus
-- Münzen-Belohnung = 1% des Schadens, Truhe ab 100k Schaden.
create or replace function public.boss_endless_finish(p_run_id bigint, p_damage bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_now timestamptz := now();
  v_run public.boss_endless_runs%rowtype;
  v_damage bigint;
  v_max_damage bigint := 5000000000;  -- 5B Cap als Safety-Net
  v_coins_reward bigint;
  v_chest_threshold bigint := 100000;
  v_grants_chest boolean := false;
  v_chest_qty int := 1;
  v_weight_total int;
  v_roll int;
  v_acc int;
  v_rec record;
  v_picked_species text;
  v_new_id uuid;
  v_chest_animal_ids uuid[] := '{}';
  v_chest_species text[] := '{}';
  v_i int;
  v_profile record;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select * into v_run from public.boss_endless_runs
   where id = p_run_id and user_id = uid for update;
  if not found then raise exception 'run not found'; end if;
  if v_run.status <> 'active' then raise exception 'run not active'; end if;

  v_damage := greatest(0, least(coalesce(p_damage, 0), v_max_damage));

  update public.boss_endless_runs
     set damage = v_damage,
         status = 'finished',
         finished_at = least(v_now, v_run.ends_at)
   where id = v_run.id;

  v_coins_reward := greatest(0, v_damage / 100);
  v_grants_chest := v_damage >= v_chest_threshold;
  if v_damage >= 1000000 then v_chest_qty := 3;
  elsif v_damage >= v_chest_threshold then v_chest_qty := 1; end if;

  if v_coins_reward > 0 then
    update public.profiles
       set coins = coins + v_coins_reward
     where id = uid
     returning coins, tickets into v_profile;
  else
    select coins, tickets into v_profile from public.profiles where id = uid;
  end if;

  if v_grants_chest then
    select coalesce(sum(weight), 0) into v_weight_total
      from public.species_costs
     where enabled and weight > 0 and coalesce(craft_only, false) = false;
    if coalesce(v_weight_total, 0) > 0 then
      for v_i in 1..v_chest_qty loop
        v_roll := 1 + floor(random() * v_weight_total)::int;
        v_acc := 0;
        v_picked_species := null;
        for v_rec in
          select species, weight from public.species_costs
          where enabled and weight > 0 and coalesce(craft_only, false) = false
          order by species
        loop
          v_acc := v_acc + v_rec.weight;
          if v_roll <= v_acc then
            v_picked_species := v_rec.species;
            exit;
          end if;
        end loop;
        if v_picked_species is not null then
          insert into public.animals(owner_id, species, equipped)
          values (uid, v_picked_species, false)
          returning id into v_new_id;
          v_chest_animal_ids := v_chest_animal_ids || v_new_id;
          v_chest_species := v_chest_species || v_picked_species;
        end if;
      end loop;
    end if;
  end if;

  return jsonb_build_object(
    'id', v_run.id,
    'damage', v_damage,
    'coins_reward', v_coins_reward,
    'chest_granted', v_grants_chest,
    'chest_qty', case when v_grants_chest then v_chest_qty else 0 end,
    'chest_species', to_jsonb(v_chest_species),
    'chest_animal_ids', to_jsonb(v_chest_animal_ids),
    'coins', coalesce(v_profile.coins, 0)
  );
end $$;

grant execute on function public.boss_endless_finish(bigint, bigint) to authenticated;

-- Bestenliste Endlessboss.
create or replace function public.get_boss_endless_leaderboard(p_limit int default 50)
returns table (
  username text,
  avatar_emoji text,
  damage bigint,
  finished_at timestamptz
) language sql security definer set search_path = public as $$
  with best as (
    select user_id, max(damage) as damage
    from public.boss_endless_runs
    where status = 'finished'
    group by user_id
  ),
  top_runs as (
    select b.user_id, b.damage, max(r.finished_at) as finished_at
    from best b
    join public.boss_endless_runs r
      on r.user_id = b.user_id and r.damage = b.damage and r.status = 'finished'
    group by b.user_id, b.damage
  )
  select p.username, p.avatar_emoji, t.damage, t.finished_at
  from top_runs t
  join public.profiles p on p.id = t.user_id
  where coalesce(p.is_banned, false) = false
  order by t.damage desc, t.finished_at asc
  limit greatest(1, least(p_limit, 100));
$$;

grant execute on function public.get_boss_endless_leaderboard(int) to authenticated, anon;
