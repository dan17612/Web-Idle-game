-- Boss-Pfad-Etappen aus der Datenbank steuern.
-- Hier kannst du HP, Kampfzeit, Truhenmenge und Boost-Belohnung pro Etappe ändern.

create table if not exists public.boss_path_stage_configs (
  stage int primary key check (stage > 0),
  species text not null,
  name text not null,
  terrain text not null default 'meadow',
  hp int not null check (hp > 0),
  time_seconds int not null default 180 check (time_seconds > 0),
  chest_qty int not null default 1 check (chest_qty > 0),
  boost_mult numeric not null default 1 check (boost_mult >= 1),
  boost_minutes int not null default 0 check (boost_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.boss_path_stage_configs is
  'Konfiguration der Boss-Pfad-Etappen: Boss, Kampfzeit, HP und Belohnungen.';
comment on column public.boss_path_stage_configs.time_seconds is 'Kampfzeit in Sekunden.';
comment on column public.boss_path_stage_configs.chest_qty is 'Anzahl zufälliger Tiere in der Truhe.';
comment on column public.boss_path_stage_configs.boost_mult is 'Multiplikator des aktivierbaren Boosts.';
comment on column public.boss_path_stage_configs.boost_minutes is 'Dauer des aktivierbaren Boosts in Minuten.';

insert into public.boss_path_stage_configs
  (stage, species, name, terrain, hp, time_seconds, chest_qty, boost_mult, boost_minutes)
values
  (1,  'chick',       'Wiesen-Küken',        'meadow',       900,   180, 1, 2,  3),
  (2,  'chicken',     'Hofhuhn',             'meadow',       1300,  180, 1, 2,  4),
  (3,  'rabbit',      'Wald-Hase',           'forest',       1800,  180, 1, 3,  5),
  (4,  'pig',         'Wildschwein',         'farm',         2400,  180, 1, 3,  5),
  (5,  'sheep',       'Sturm-Schaf',         'plains',       3000,  180, 1, 3,  6),
  (6,  'cow',         'Donner-Stier',        'plains',       3600,  180, 2, 4,  6),
  (7,  'horse',       'Schatten-Pferd',      'mountain_low', 4400,  180, 2, 5,  7),
  (8,  'scorpion',    'Sand-Skorpion',       'desert',       5400,  180, 2, 5,  7),
  (9,  'panda',       'Bambus-Panda',        'bamboo',       6500,  180, 2, 6,  8),
  (10, 'tiger',       'Säbelzahn-Tiger',     'jungle',       8000,  180, 2, 7,  8),
  (11, 'lion',        'Kronen-Löwe',         'savanna',      9500,  180, 3, 8,  10),
  (12, 'trex',        'Urzeit-T-Rex',        'volcano',      11500, 180, 3, 9,  10),
  (13, 'peacock',     'Sternen-Pfau',        'peak',         13500, 180, 3, 10, 10),
  (14, 'jormungandr', 'Tiefsee-Jörmungandr', 'abyss',        16000, 180, 3, 10, 15),
  (15, 'dragon',      'Drachenkönig',        'dragon_lair',  20000, 180, 5, 15, 30)
on conflict (stage) do nothing;

create or replace function public.touch_boss_path_stage_configs_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists boss_path_stage_configs_touch_updated_at on public.boss_path_stage_configs;
create trigger boss_path_stage_configs_touch_updated_at
  before update on public.boss_path_stage_configs
  for each row execute function public.touch_boss_path_stage_configs_updated_at();

alter table public.boss_path_stage_configs enable row level security;

drop policy if exists "boss_path_stage_configs read" on public.boss_path_stage_configs;
create policy "boss_path_stage_configs read" on public.boss_path_stage_configs
  for select using (true);

drop policy if exists "boss_path_stage_configs admin write" on public.boss_path_stage_configs;
create policy "boss_path_stage_configs admin write" on public.boss_path_stage_configs
  for all
  using (public._admin_role() = 'admin')
  with check (public._admin_role() = 'admin');

revoke all on table public.boss_path_stage_configs from anon;
grant select, insert, update, delete on table public.boss_path_stage_configs to authenticated;

create or replace function public.boss_path_stage_config(p_stage int)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cfg public.boss_path_stage_configs%rowtype;
begin
  select * into cfg
    from public.boss_path_stage_configs
   where stage = p_stage;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'stage', cfg.stage,
    'species', cfg.species,
    'name', cfg.name,
    'terrain', cfg.terrain,
    'hp', cfg.hp,
    'time_seconds', cfg.time_seconds,
    'chest_qty', cfg.chest_qty,
    'boost_mult', cfg.boost_mult,
    'boost_minutes', cfg.boost_minutes
  );
end $$;

grant execute on function public.boss_path_stage_config(int) to authenticated;

create or replace function public.get_boss_path()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  prog record;
  rewards_arr jsonb;
  stages_arr jsonb;
  max_stage int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.boss_path_progress(user_id) values (uid)
    on conflict (user_id) do nothing;
  select * into prog from public.boss_path_progress where user_id = uid;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'stage', stage,
    'kind', kind,
    'payload', payload,
    'created_at', created_at
  ) order by created_at desc), '[]'::jsonb) into rewards_arr
  from public.boss_path_rewards
  where user_id = uid and consumed_at is null;

  select coalesce(jsonb_agg(public.boss_path_stage_config(stage) order by stage), '[]'::jsonb),
         coalesce(max(stage), 0)
    into stages_arr, max_stage
    from public.boss_path_stage_configs;

  return jsonb_build_object(
    'current_stage', prog.current_stage,
    'highest_stage', prog.highest_stage,
    'total_victories', prog.total_victories,
    'rewards', rewards_arr,
    'stages', stages_arr,
    'max_stage', max_stage,
    'server_now', now()
  );
end $$;

grant execute on function public.get_boss_path() to authenticated;

create or replace function public.complete_boss_stage(p_stage int, p_score int, p_target int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg jsonb;
  prog record;
  reward_chest_id bigint;
  reward_boost_id bigint;
  expected_hp int;
  chest_qty int;
  max_stage int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.boss_path_progress(user_id) values (uid) on conflict (user_id) do nothing;
  select * into prog from public.boss_path_progress where user_id = uid;

  select coalesce(max(stage), 0) into max_stage from public.boss_path_stage_configs;

  if p_stage <> prog.current_stage then raise exception 'wrong stage'; end if;
  if max_stage <= 0 or p_stage > max_stage then raise exception 'no more stages'; end if;

  cfg := public.boss_path_stage_config(p_stage);
  if cfg is null then raise exception 'invalid stage'; end if;

  expected_hp := (cfg->>'hp')::int;
  if coalesce(p_score, 0) < expected_hp or coalesce(p_target, 0) < expected_hp then
    raise exception 'boss not defeated';
  end if;

  chest_qty := greatest(1, coalesce((cfg->>'chest_qty')::int, 1));

  insert into public.boss_path_rewards(user_id, stage, kind, payload)
    values (uid, p_stage, 'chest', jsonb_build_object(
      'chest_qty', chest_qty,
      'boss_name', cfg->>'name'
    )) returning id into reward_chest_id;

  insert into public.boss_path_rewards(user_id, stage, kind, payload)
    values (uid, p_stage, 'boost', jsonb_build_object(
      'multiplier', (cfg->>'boost_mult')::numeric,
      'duration_minutes', (cfg->>'boost_minutes')::int,
      'boss_name', cfg->>'name'
    )) returning id into reward_boost_id;

  update public.boss_path_progress
    set current_stage = p_stage + 1,
        highest_stage = greatest(highest_stage, p_stage),
        total_victories = total_victories + 1,
        updated_at = now()
    where user_id = uid;

  return jsonb_build_object(
    'stage', p_stage,
    'next_stage', p_stage + 1,
    'reward_chest_id', reward_chest_id,
    'reward_boost_id', reward_boost_id,
    'chest', jsonb_build_object('chest_qty', chest_qty),
    'boost', jsonb_build_object(
      'multiplier', (cfg->>'boost_mult')::numeric,
      'duration_minutes', (cfg->>'boost_minutes')::int
    )
  );
end $$;

grant execute on function public.complete_boss_stage(int,int,int) to authenticated;

create or replace function public.open_boss_chest(p_reward_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  rew record;
  qty int;
  w_total int;
  r int;
  acc int;
  rec record;
  picked_species text;
  new_ids uuid[] := '{}';
  new_species text[] := '{}';
  i int;
  new_animal public.animals%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into rew from public.boss_path_rewards
    where id = p_reward_id and user_id = uid for update;
  if not found then raise exception 'reward not found'; end if;
  if rew.consumed_at is not null then raise exception 'already opened'; end if;
  if rew.kind <> 'chest' then raise exception 'not a chest'; end if;

  qty := greatest(1, coalesce((rew.payload->>'chest_qty')::int, 1));

  select coalesce(sum(weight), 0) into w_total
    from public.species_costs
   where enabled and weight > 0;
  if w_total <= 0 then raise exception 'no species available'; end if;

  for i in 1..qty loop
    r := 1 + floor(random() * w_total)::int;
    acc := 0;
    picked_species := null;

    for rec in
      select species, weight
        from public.species_costs
       where enabled and weight > 0
       order by species
    loop
      acc := acc + rec.weight;
      if r <= acc then
        picked_species := rec.species;
        exit;
      end if;
    end loop;

    if picked_species is null then
      select species into picked_species
        from public.species_costs
       where enabled and weight > 0
       order by species
       limit 1;
    end if;

    insert into public.animals(owner_id, species)
      values (uid, picked_species)
      returning * into new_animal;

    new_ids := new_ids || new_animal.id;
    new_species := new_species || picked_species;
  end loop;

  update public.boss_path_rewards
    set consumed_at = now()
    where id = p_reward_id;

  return jsonb_build_object(
    'qty', qty,
    'species', to_jsonb(new_species),
    'animal_ids', to_jsonb(new_ids),
    'reward_id', p_reward_id
  );
end $$;

grant execute on function public.open_boss_chest(bigint) to authenticated;
