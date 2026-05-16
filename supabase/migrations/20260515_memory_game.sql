-- Memory-Minispiel: serverautoritatives Level-Spiel mit Tier-Emojis aus species_costs.
-- Verdecktes Layout liegt in memory_player_states.board und wird nie an den Client gesendet.

create table if not exists public.memory_level_configs (
  level int primary key check (level > 0),
  pairs int not null check (pairs >= 2),
  move_limit int not null check (move_limit > 0),
  chest_qty int not null default 1 check (chest_qty > 0),
  reward_species text references public.species_costs(species) on update cascade on delete set null,
  reward_tier text not null default 'normal',
  reward_qty int not null default 0 check (reward_qty >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.memory_level_configs is
  'Konfiguration der Memory-Level: Paaranzahl, Zuglimit, Truhen- und Tier-Belohnung.';

create table if not exists public.memory_player_states (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  level int not null default 1 check (level > 0),
  highest_level int not null default 0 check (highest_level >= 0),
  total_pairs bigint not null default 0 check (total_pairs >= 0),
  total_levels_cleared int not null default 0 check (total_levels_cleared >= 0),
  version uuid not null default gen_random_uuid(),
  board jsonb not null default '[]'::jsonb,
  revealed int[] not null default '{}',
  moves_used int not null default 0 check (moves_used >= 0),
  level_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.memory_player_states is
  'Serverautoritativer Spielstand des Memory-Minispiels. board ist privat.';

create index if not exists memory_player_states_lb_idx
  on public.memory_player_states(highest_level desc, total_pairs desc);

create table if not exists public.memory_level_rewards (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  level int not null,
  kind text not null check (kind in ('chest','animal')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);

comment on table public.memory_level_rewards is
  'Offene Memory-Belohnungen (Truhen/Tiere) pro Spieler, Muster wie boss_path_rewards.';

create index if not exists memory_level_rewards_open_idx
  on public.memory_level_rewards(user_id) where consumed_at is null;

insert into public.event_schedule (key, starts_at, ends_at, enabled)
values ('memory_game', null, '2026-06-30 23:59:59+00', true)
on conflict (key) do nothing;

alter table public.memory_level_configs enable row level security;
alter table public.memory_player_states enable row level security;
alter table public.memory_level_rewards enable row level security;

drop policy if exists "memory_level_configs read" on public.memory_level_configs;
create policy "memory_level_configs read" on public.memory_level_configs
  for select using (true);

drop policy if exists "memory_level_configs admin write" on public.memory_level_configs;
create policy "memory_level_configs admin write" on public.memory_level_configs
  for all using (public._admin_role() = 'admin')
  with check (public._admin_role() = 'admin');

drop policy if exists "memory_player_states self read" on public.memory_player_states;
create policy "memory_player_states self read" on public.memory_player_states
  for select using ((select auth.uid()) = user_id);

drop policy if exists "memory_level_rewards self read" on public.memory_level_rewards;
create policy "memory_level_rewards self read" on public.memory_level_rewards
  for select using ((select auth.uid()) = user_id);

revoke all on table public.memory_level_configs from anon;
revoke all on table public.memory_player_states from anon;
revoke all on table public.memory_level_rewards from anon;

grant select on table public.memory_level_configs to authenticated;
grant select on table public.memory_player_states to authenticated;
grant select on table public.memory_level_rewards to authenticated;

grant select, insert, update, delete on table public.memory_level_configs to service_role;
grant select, insert, update, delete on table public.memory_player_states to service_role;
grant select, insert, update, delete on table public.memory_level_rewards to service_role;

create or replace function public.touch_memory_level_configs_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists memory_level_configs_touch on public.memory_level_configs;
create trigger memory_level_configs_touch
  before update on public.memory_level_configs
  for each row execute function public.touch_memory_level_configs_updated_at();

insert into public.memory_level_configs
  (level, pairs, move_limit, chest_qty, reward_species, reward_tier, reward_qty)
values
  (1,  6,  20, 1, null,      'normal', 0),
  (2,  6,  20, 1, null,      'normal', 0),
  (3,  7,  22, 1, null,      'normal', 0),
  (4,  7,  22, 1, null,      'normal', 0),
  (5,  8,  24, 2, 'rabbit',  'normal', 1),
  (6,  8,  24, 2, null,      'normal', 0),
  (7,  9,  26, 2, null,      'normal', 0),
  (8,  9,  26, 2, null,      'normal', 0),
  (9,  10, 28, 2, null,      'normal', 0),
  (10, 10, 28, 3, 'panda',   'gold',   1),
  (11, 11, 30, 3, null,      'normal', 0),
  (12, 11, 30, 3, null,      'normal', 0),
  (13, 12, 32, 3, null,      'normal', 0),
  (14, 12, 32, 3, null,      'normal', 0),
  (15, 13, 34, 4, 'tiger',   'gold',   1),
  (16, 13, 34, 4, null,      'normal', 0),
  (17, 14, 36, 4, null,      'normal', 0),
  (18, 14, 36, 4, null,      'normal', 0),
  (19, 15, 38, 5, null,      'normal', 0),
  (20, 15, 38, 5, 'dragon',  'gold',   1)
on conflict (level) do update
  set pairs = excluded.pairs,
      move_limit = excluded.move_limit,
      chest_qty = excluded.chest_qty,
      reward_species = excluded.reward_species,
      reward_tier = excluded.reward_tier,
      reward_qty = excluded.reward_qty;

-- Erzeugt ein verdecktes Layout fuer p_pairs Paare aus zufaelligen,
-- gewichteten Arten. board = jsonb-Array [{species, matched}], gemischt.
create or replace function public.memory_build_board(p_pairs int)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_species text[];
  v_board jsonb := '[]'::jsonb;
  v_s text;
begin
  if p_pairs < 2 then raise exception 'invalid pairs'; end if;

  select array_agg(species) into v_species
  from (
    select species from public.species_costs
     where enabled and weight > 0
     order by random()
     limit p_pairs
  ) s;

  if v_species is null or array_length(v_species, 1) < p_pairs then
    select array_agg(species) into v_species
    from (
      select species from public.species_costs
       where enabled
       order by random()
       limit p_pairs
    ) s2;
  end if;
  if v_species is null or array_length(v_species, 1) < 1 then
    raise exception 'no species available';
  end if;

  for i in 1..p_pairs loop
    v_s := v_species[1 + ((i - 1) % array_length(v_species, 1))];
    v_board := v_board
      || jsonb_build_object('species', v_s, 'matched', false)
      || jsonb_build_object('species', v_s, 'matched', false);
  end loop;

  return (
    select coalesce(jsonb_agg(elem order by random()), '[]'::jsonb)
    from jsonb_array_elements(v_board) elem
  );
end $$;

revoke all on function public.memory_build_board(int) from public, anon, authenticated;
grant execute on function public.memory_build_board(int) to service_role;

-- Liefert den Spielstand OHNE verdecktes Layout: nur gematchte + aktuell
-- aufgedeckte Karten (mit Species/Emoji), Level-Configs und server_now.
create or replace function public.get_memory_state(p_user_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_st public.memory_player_states%rowtype;
  v_cfg public.memory_level_configs%rowtype;
  v_cards jsonb := '[]'::jsonb;
  v_configs jsonb;
  v_idx int;
  v_cell jsonb;
  v_species text;
  v_meta record;
begin
  if p_user_id is null then raise exception 'missing user'; end if;

  select * into v_st from public.memory_player_states where user_id = p_user_id;
  if not found then
    select * into v_cfg from public.memory_level_configs where level = 1;
    if not found then raise exception 'no level config'; end if;
    insert into public.memory_player_states(user_id, level, board, level_started_at)
    values (p_user_id, 1, public.memory_build_board(v_cfg.pairs), now())
    returning * into v_st;
  end if;

  select * into v_cfg from public.memory_level_configs where level = v_st.level;
  if not found then
    select * into v_cfg from public.memory_level_configs
     order by level desc limit 1;
  end if;

  for v_idx in 0 .. (jsonb_array_length(v_st.board) - 1) loop
    v_cell := v_st.board -> v_idx;
    if (v_cell->>'matched')::boolean = true
       or v_idx = any(v_st.revealed) then
      v_species := v_cell->>'species';
      select name, emoji into v_meta
        from public.species_costs where species = v_species;
      v_cards := v_cards || jsonb_build_object(
        'index', v_idx,
        'species', v_species,
        'name', coalesce(v_meta.name, v_species),
        'emoji', coalesce(v_meta.emoji, '🐾'),
        'matched', (v_cell->>'matched')::boolean
      );
    end if;
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
    'level', level, 'pairs', pairs, 'move_limit', move_limit,
    'chest_qty', chest_qty, 'reward_species', reward_species,
    'reward_tier', reward_tier, 'reward_qty', reward_qty
  ) order by level), '[]'::jsonb) into v_configs
  from public.memory_level_configs;

  return jsonb_build_object(
    'level', v_st.level,
    'highest_level', v_st.highest_level,
    'total_pairs', v_st.total_pairs,
    'total_levels_cleared', v_st.total_levels_cleared,
    'version', v_st.version,
    'moves_used', v_st.moves_used,
    'pairs', v_cfg.pairs,
    'move_limit', v_cfg.move_limit,
    'card_count', jsonb_array_length(v_st.board),
    'visible_cards', v_cards,
    'configs', v_configs,
    'event_active', public.event_is_active('memory_game'),
    'server_now', now()
  );
end $$;

revoke all on function public.get_memory_state(uuid) from public, anon, authenticated;
grant execute on function public.get_memory_state(uuid) to service_role;

-- Deckt Karte p_index auf. Erste Karte des Versuchs -> nur aufdecken.
-- Zweite Karte -> Versuch zaehlen, Match pruefen. Bei Zuglimit ohne
-- Loesung: gleiches Level neu mischen (kein Fortschritt).
create or replace function public.memory_flip(
  p_user_id uuid,
  p_seen_version uuid,
  p_index int
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_st public.memory_player_states%rowtype;
  v_cfg public.memory_level_configs%rowtype;
  v_board jsonb;
  v_a int;
  v_b int;
  v_sa text;
  v_sb text;
  v_matched boolean := false;
  v_cleared boolean := false;
  v_failed boolean := false;
  v_matched_count int;
begin
  if p_user_id is null then raise exception 'missing user'; end if;
  if not public.event_is_active('memory_game') then
    raise exception 'event ended';
  end if;

  select * into v_st from public.memory_player_states
   where user_id = p_user_id and version = p_seen_version
   for update;
  if not found then raise exception 'state conflict'; end if;

  select * into v_cfg from public.memory_level_configs where level = v_st.level;
  if not found then raise exception 'no level config'; end if;

  v_board := v_st.board;
  if p_index < 0 or p_index >= jsonb_array_length(v_board) then
    raise exception 'invalid index';
  end if;
  if (v_board -> p_index ->> 'matched')::boolean = true then
    raise exception 'already matched';
  end if;
  if p_index = any(v_st.revealed) then
    raise exception 'already revealed';
  end if;
  if array_length(v_st.revealed, 1) >= 2 then
    v_st.revealed := '{}';
  end if;

  if coalesce(array_length(v_st.revealed, 1), 0) = 0 then
    update public.memory_player_states
       set revealed = array[p_index],
           version = gen_random_uuid(),
           updated_at = now()
     where user_id = p_user_id
     returning * into v_st;
  else
    v_a := v_st.revealed[1];
    v_b := p_index;
    v_sa := v_board -> v_a ->> 'species';
    v_sb := v_board -> v_b ->> 'species';

    if v_sa = v_sb then
      v_matched := true;
      v_board := jsonb_set(v_board, array[v_a::text, 'matched'], 'true'::jsonb);
      v_board := jsonb_set(v_board, array[v_b::text, 'matched'], 'true'::jsonb);
    end if;

    select count(*) into v_matched_count
      from jsonb_array_elements(v_board) e
     where (e->>'matched')::boolean = true;
    v_cleared := (v_matched_count = jsonb_array_length(v_board));

    if not v_cleared
       and (v_st.moves_used + 1) >= v_cfg.move_limit then
      v_failed := true;
    end if;

    if v_failed then
      update public.memory_player_states
         set board = public.memory_build_board(v_cfg.pairs),
             revealed = '{}',
             moves_used = 0,
             level_started_at = now(),
             version = gen_random_uuid(),
             updated_at = now()
       where user_id = p_user_id
       returning * into v_st;
    else
      update public.memory_player_states
         set board = v_board,
             revealed = case when v_matched then '{}'::int[] else array[v_a, v_b] end,
             moves_used = v_st.moves_used + 1,
             total_pairs = total_pairs + case when v_matched then 1 else 0 end,
             version = gen_random_uuid(),
             updated_at = now()
       where user_id = p_user_id
       returning * into v_st;
    end if;
  end if;

  return jsonb_build_object(
    'turn', jsonb_build_object(
      'matched', v_matched,
      'cleared', v_cleared,
      'failed', v_failed,
      'flipped_index', p_index
    ),
    'state', public.get_memory_state(p_user_id)
  );
end $$;

revoke all on function public.memory_flip(uuid, uuid, int) from public, anon, authenticated;
grant execute on function public.memory_flip(uuid, uuid, int) to service_role;

-- Schliesst ein vollstaendig geloestes Level ab: Truhen-Reward (immer) +
-- Tier-Reward (falls reward_species gesetzt) in memory_level_rewards,
-- level + 1, naechstes Brett mischen.
create or replace function public.memory_complete_level(p_user_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_st public.memory_player_states%rowtype;
  v_cfg public.memory_level_configs%rowtype;
  v_next_cfg public.memory_level_configs%rowtype;
  v_matched_count int;
  v_chest_id bigint;
  v_animal_id bigint;
  v_next_level int;
  v_max_level int;
begin
  if p_user_id is null then raise exception 'missing user'; end if;
  if not public.event_is_active('memory_game') then
    raise exception 'event ended';
  end if;

  select * into v_st from public.memory_player_states
   where user_id = p_user_id for update;
  if not found then raise exception 'no state'; end if;

  select * into v_cfg from public.memory_level_configs where level = v_st.level;
  if not found then raise exception 'no level config'; end if;

  select count(*) into v_matched_count
    from jsonb_array_elements(v_st.board) e
   where (e->>'matched')::boolean = true;
  if v_matched_count <> jsonb_array_length(v_st.board)
     or jsonb_array_length(v_st.board) = 0 then
    raise exception 'level not cleared';
  end if;

  insert into public.memory_level_rewards(user_id, level, kind, payload)
  values (p_user_id, v_st.level, 'chest',
          jsonb_build_object('chest_qty', v_cfg.chest_qty))
  returning id into v_chest_id;

  if v_cfg.reward_species is not null and v_cfg.reward_qty > 0 then
    insert into public.memory_level_rewards(user_id, level, kind, payload)
    values (p_user_id, v_st.level, 'animal',
            jsonb_build_object(
              'species', v_cfg.reward_species,
              'tier', v_cfg.reward_tier,
              'qty', v_cfg.reward_qty))
    returning id into v_animal_id;
  end if;

  select coalesce(max(level), 0) into v_max_level
    from public.memory_level_configs;
  v_next_level := least(v_st.level + 1, v_max_level);

  select * into v_next_cfg from public.memory_level_configs
   where level = v_next_level;

  update public.memory_player_states
     set level = v_next_level,
         highest_level = greatest(highest_level, v_st.level),
         total_levels_cleared = total_levels_cleared + 1,
         board = public.memory_build_board(v_next_cfg.pairs),
         revealed = '{}',
         moves_used = 0,
         level_started_at = now(),
         version = gen_random_uuid(),
         updated_at = now()
   where user_id = p_user_id
   returning * into v_st;

  return jsonb_build_object(
    'completed_level', v_cfg.level,
    'chest_reward_id', v_chest_id,
    'animal_reward_id', v_animal_id,
    'state', public.get_memory_state(p_user_id)
  );
end $$;

revoke all on function public.memory_complete_level(uuid) from public, anon, authenticated;
grant execute on function public.memory_complete_level(uuid) to service_role;

-- Aktuelles Level neu mischen (kein Fortschritt).
create or replace function public.memory_reset_level(p_user_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_st public.memory_player_states%rowtype;
  v_cfg public.memory_level_configs%rowtype;
begin
  if p_user_id is null then raise exception 'missing user'; end if;
  if not public.event_is_active('memory_game') then
    raise exception 'event ended';
  end if;

  select * into v_st from public.memory_player_states
   where user_id = p_user_id for update;
  if not found then raise exception 'no state'; end if;

  select * into v_cfg from public.memory_level_configs where level = v_st.level;
  if not found then raise exception 'no level config'; end if;

  update public.memory_player_states
     set board = public.memory_build_board(v_cfg.pairs),
         revealed = '{}',
         moves_used = 0,
         level_started_at = now(),
         version = gen_random_uuid(),
         updated_at = now()
   where user_id = p_user_id;

  return jsonb_build_object('state', public.get_memory_state(p_user_id));
end $$;

revoke all on function public.memory_reset_level(uuid) from public, anon, authenticated;
grant execute on function public.memory_reset_level(uuid) to service_role;

-- Loest einen offenen Reward ein: 'chest' -> gewichteter Zufall aus
-- species_costs (wie open_boss_chest), 'animal' -> garantierte Art/Stufe.
create or replace function public.memory_open_chest(
  p_user_id uuid,
  p_reward_id bigint
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_rew record;
  v_qty int;
  v_w_total int;
  v_r int;
  v_acc int;
  v_rec record;
  v_picked text;
  v_ids uuid[] := '{}';
  v_species text[] := '{}';
  v_tier text;
  v_new public.animals%rowtype;
  i int;
begin
  if p_user_id is null then raise exception 'missing user'; end if;

  select * into v_rew from public.memory_level_rewards
   where id = p_reward_id and user_id = p_user_id for update;
  if not found then raise exception 'reward not found'; end if;
  if v_rew.consumed_at is not null then raise exception 'already opened'; end if;

  if v_rew.kind = 'animal' then
    v_picked := v_rew.payload->>'species';
    v_tier := coalesce(nullif(v_rew.payload->>'tier',''), 'normal');
    v_qty := greatest(1, coalesce((v_rew.payload->>'qty')::int, 1));
    if not exists (select 1 from public.species_costs where species = v_picked) then
      raise exception 'unknown reward species';
    end if;
    for i in 1..least(v_qty, 50) loop
      insert into public.animals(owner_id, species, tier, equipped)
      values (p_user_id, v_picked, v_tier, false)
      returning * into v_new;
      v_ids := v_ids || v_new.id;
      v_species := v_species || v_picked;
    end loop;
  else
    v_qty := greatest(1, coalesce((v_rew.payload->>'chest_qty')::int, 1));
    select coalesce(sum(weight), 0) into v_w_total
      from public.species_costs where enabled and weight > 0;
    if v_w_total <= 0 then raise exception 'no species available'; end if;

    for i in 1..v_qty loop
      v_r := 1 + floor(random() * v_w_total)::int;
      v_acc := 0;
      v_picked := null;
      for v_rec in
        select species, weight from public.species_costs
         where enabled and weight > 0 order by species
      loop
        v_acc := v_acc + v_rec.weight;
        if v_r <= v_acc then v_picked := v_rec.species; exit; end if;
      end loop;
      if v_picked is null then
        select species into v_picked from public.species_costs
         where enabled and weight > 0 order by species limit 1;
      end if;
      insert into public.animals(owner_id, species, equipped)
      values (p_user_id, v_picked, false)
      returning * into v_new;
      v_ids := v_ids || v_new.id;
      v_species := v_species || v_picked;
    end loop;
  end if;

  update public.memory_level_rewards
     set consumed_at = now() where id = p_reward_id;

  return jsonb_build_object(
    'reward_id', p_reward_id,
    'kind', v_rew.kind,
    'qty', coalesce(array_length(v_ids, 1), 0),
    'species', to_jsonb(v_species),
    'animal_ids', to_jsonb(v_ids)
  );
end $$;

revoke all on function public.memory_open_chest(uuid, bigint) from public, anon, authenticated;
grant execute on function public.memory_open_chest(uuid, bigint) to service_role;

create or replace function public.get_memory_leaderboard(p_limit int default 50)
returns table (
  username text,
  avatar_emoji text,
  highest_level int,
  total_pairs bigint,
  total_levels_cleared int
) language sql security definer set search_path = public as $$
  select p.username, p.avatar_emoji,
         m.highest_level, m.total_pairs, m.total_levels_cleared
  from public.memory_player_states m
  join public.profiles p on p.id = m.user_id
  where coalesce(p.is_banned, false) = false
    and (m.highest_level > 0 or m.total_pairs > 0)
  order by m.highest_level desc, m.total_pairs desc
  limit greatest(1, least(p_limit, 100));
$$;

grant execute on function public.get_memory_leaderboard(int) to authenticated, anon;
