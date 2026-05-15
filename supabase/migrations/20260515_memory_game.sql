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
  (1,  6,  10, 1, null,      'normal', 0),
  (2,  6,  9,  1, null,      'normal', 0),
  (3,  7,  11, 1, null,      'normal', 0),
  (4,  7,  10, 1, null,      'normal', 0),
  (5,  8,  12, 2, 'rabbit',  'normal', 1),
  (6,  8,  11, 2, null,      'normal', 0),
  (7,  9,  13, 2, null,      'normal', 0),
  (8,  9,  12, 2, null,      'normal', 0),
  (9,  10, 14, 2, null,      'normal', 0),
  (10, 10, 13, 3, 'panda',   'gold',   1),
  (11, 11, 15, 3, null,      'normal', 0),
  (12, 11, 14, 3, null,      'normal', 0),
  (13, 12, 16, 3, null,      'normal', 0),
  (14, 12, 15, 3, null,      'normal', 0),
  (15, 13, 17, 4, 'tiger',   'gold',   1),
  (16, 13, 16, 4, null,      'normal', 0),
  (17, 14, 18, 4, null,      'normal', 0),
  (18, 14, 17, 4, null,      'normal', 0),
  (19, 15, 19, 5, null,      'normal', 0),
  (20, 15, 18, 5, 'dragon',  'gold',   1)
on conflict (level) do update
  set pairs = excluded.pairs,
      move_limit = excluded.move_limit,
      chest_qty = excluded.chest_qty,
      reward_species = excluded.reward_species,
      reward_tier = excluded.reward_tier,
      reward_qty = excluded.reward_qty;
