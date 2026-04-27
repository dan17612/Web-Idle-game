-- Tap-Upgrades: max 300 Stufen, Kosten fuer Cap = wie Multiplikator-Kosten.
-- Equip-Slots: 2 weitere Slots (bis 12).
-- Crafter: 15 Minuten Timer pro Crafting, max 1 aktiver Job pro User.

-- 1) _slot_cost auf 12 Slots erweitern (5x Wachstum von Slot 10 weg).
create or replace function public._slot_cost(p_slot int)
returns bigint language sql immutable set search_path = public as $$
  select case
    when p_slot <= 1 then 0
    when p_slot = 2  then 2500
    when p_slot = 3  then 15000
    when p_slot = 4  then 80000
    when p_slot = 5  then 400000
    when p_slot = 6  then 2000000
    when p_slot = 7  then 10000000
    when p_slot = 8  then 50000000
    when p_slot = 9  then 250000000
    when p_slot = 10 then 1000000000
    when p_slot = 11 then 5000000000
    when p_slot = 12 then 25000000000
    else null
  end::bigint;
$$;

-- profiles.equip_slots Check anpassen: bisher max 20 → bleibt, aber sicher stellen.
do $$
begin
  if exists (
    select 1 from pg_constraint
     where conrelid = 'public.profiles'::regclass
       and conname = 'profiles_equip_slots_check'
  ) then
    alter table public.profiles drop constraint profiles_equip_slots_check;
  end if;
end $$;

alter table public.profiles
  add constraint profiles_equip_slots_check
  check (equip_slots between 1 and 12);

-- 2) Tap-Upgrades: max 300 fuer beide, Cap-Kosten = Mul-Kosten.
create or replace function public.upgrade_tap(p_kind text default 'mul')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cur_mul int; cur_cap int;
  cost bigint; new_coins bigint; new_level int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_kind not in ('mul', 'cap') then raise exception 'invalid upgrade kind'; end if;
  select tap_level, tap_cap_level into cur_mul, cur_cap from public.profiles where id = uid;
  cur_mul := coalesce(cur_mul, 1);
  cur_cap := coalesce(cur_cap, 1);
  if p_kind = 'mul' then
    if cur_mul >= 300 then raise exception 'tap max level reached'; end if;
    cost := (100 * power(3, cur_mul - 1))::bigint;
    update public.profiles
      set coins = coins - cost, tap_level = cur_mul + 1
      where id = uid and coins >= cost
      returning coins, tap_level into new_coins, new_level;
    if new_coins is null then raise exception 'insufficient coins'; end if;
    return jsonb_build_object(
      'coins', new_coins, 'kind', 'mul',
      'tap_level', new_level, 'tap_cap_level', cur_cap,
      'next_cost', case when new_level >= 300 then null
                        else (100 * power(3, new_level - 1))::bigint end
    );
  else
    if cur_cap >= 300 then raise exception 'tap cap max level reached'; end if;
    cost := (100 * power(3, cur_cap - 1))::bigint;
    update public.profiles
      set coins = coins - cost, tap_cap_level = cur_cap + 1
      where id = uid and coins >= cost
      returning coins, tap_cap_level into new_coins, new_level;
    if new_coins is null then raise exception 'insufficient coins'; end if;
    return jsonb_build_object(
      'coins', new_coins, 'kind', 'cap',
      'tap_level', cur_mul, 'tap_cap_level', new_level,
      'next_cost', case when new_level >= 300 then null
                        else (100 * power(3, new_level - 1))::bigint end,
      'taps_max', 10 + (new_level - 1) * 5
    );
  end if;
end $$;
grant execute on function public.upgrade_tap(text) to authenticated;

-- 3) Crafter-Timer: ein aktiver Job pro User, 15 Minuten Dauer.
create table if not exists public.craft_jobs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  recipe_id uuid not null references public.craft_recipes(id) on delete cascade,
  output_species text not null,
  started_at timestamptz not null default now(),
  ready_at timestamptz not null
);

alter table public.craft_jobs enable row level security;
drop policy if exists "craft_jobs self read" on public.craft_jobs;
create policy "craft_jobs self read" on public.craft_jobs
  for select using ((select auth.uid()) = user_id);

revoke all on table public.craft_jobs from anon;
grant select on table public.craft_jobs to authenticated;

create or replace function public.craft_animal(p_recipe_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_recipe  public.craft_recipes%rowtype;
  v_ing     jsonb;
  v_species text;
  v_tier    text;
  v_qty     int;
  v_have    int;
  v_ready   timestamptz;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  if exists (select 1 from public.craft_jobs where user_id = v_uid) then
    raise exception 'craft job already active';
  end if;

  select * into v_recipe from public.craft_recipes where id = p_recipe_id and enabled = true;
  if not found then raise exception 'Rezept nicht gefunden oder deaktiviert'; end if;

  for v_ing in select * from jsonb_array_elements(v_recipe.ingredients) loop
    v_species := v_ing->>'species';
    v_tier    := coalesce(v_ing->>'tier', 'normal');
    v_qty     := (v_ing->>'qty')::int;

    select count(*) into v_have
    from public.animals
    where owner_id = v_uid
      and species = v_species
      and coalesce(tier, 'normal') = v_tier
      and equipped = false
      and (upgrade_ready_at is null or upgrade_ready_at <= now());

    if v_have < v_qty then
      raise exception 'Nicht genug % (Tier: %). Benoetigt: %, Vorhanden: %',
        v_species, v_tier, v_qty, v_have;
    end if;
  end loop;

  for v_ing in select * from jsonb_array_elements(v_recipe.ingredients) loop
    v_species := v_ing->>'species';
    v_tier    := coalesce(v_ing->>'tier', 'normal');
    v_qty     := (v_ing->>'qty')::int;

    delete from public.animals
    where id in (
      select id from public.animals
      where owner_id = v_uid
        and species = v_species
        and coalesce(tier, 'normal') = v_tier
        and equipped = false
        and (upgrade_ready_at is null or upgrade_ready_at <= now())
      order by acquired_at
      limit v_qty
    );
  end loop;

  v_ready := now() + interval '15 minutes';

  insert into public.craft_jobs(user_id, recipe_id, output_species, started_at, ready_at)
    values (v_uid, v_recipe.id, v_recipe.output_species, now(), v_ready);

  return jsonb_build_object(
    'active', true,
    'recipe_id', v_recipe.id,
    'output_species', v_recipe.output_species,
    'started_at', now(),
    'ready_at', v_ready,
    'server_now', now()
  );
end $$;

grant execute on function public.craft_animal(uuid) to authenticated;

create or replace function public.claim_craft_animal()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_job     public.craft_jobs%rowtype;
  v_new     public.animals%rowtype;
  v_slots   int;
  v_eq_cnt  int;
  v_cur_fav uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select * into v_job from public.craft_jobs where user_id = v_uid for update;
  if not found then raise exception 'kein aktiver Crafting-Job'; end if;
  if v_job.ready_at > now() then raise exception 'noch nicht fertig'; end if;

  select equip_slots, favorite_animal_id into v_slots, v_cur_fav
    from public.profiles where id = v_uid;
  select count(*) into v_eq_cnt from public.animals where owner_id = v_uid and equipped = true;

  insert into public.animals(owner_id, species, equipped)
    values (v_uid, v_job.output_species, v_eq_cnt < v_slots)
    returning * into v_new;

  if v_cur_fav is null then
    update public.profiles set favorite_animal_id = v_new.id where id = v_uid;
  end if;

  delete from public.craft_jobs where user_id = v_uid;

  return jsonb_build_object('animal', to_jsonb(v_new));
end $$;

grant execute on function public.claim_craft_animal() to authenticated;

create or replace function public.get_craft_status()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_job public.craft_jobs%rowtype;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_job from public.craft_jobs where user_id = v_uid;
  if not found then
    return jsonb_build_object('active', false, 'server_now', now());
  end if;
  return jsonb_build_object(
    'active', true,
    'recipe_id', v_job.recipe_id,
    'output_species', v_job.output_species,
    'started_at', v_job.started_at,
    'ready_at', v_job.ready_at,
    'ready', v_job.ready_at <= now(),
    'server_now', now()
  );
end $$;

grant execute on function public.get_craft_status() to authenticated;
