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
