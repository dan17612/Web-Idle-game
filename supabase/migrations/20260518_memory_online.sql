-- Memory Online-Modus: serverautoritatives rundenbasiertes Mehrspieler-Memory.
-- Das verdeckte Layout liegt in mem_online_rooms.board und wird nie an Clients gesendet.

create extension if not exists pgcrypto;

create table if not exists public.mem_online_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  host_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  password_hash text,
  has_password boolean not null default false,
  max_players int not null check (max_players between 2 and 4),
  board_pairs int not null check (board_pairs in (8, 12, 18)),
  status text not null default 'lobby' check (status in ('lobby','playing','finished')),
  board jsonb not null default '[]'::jsonb,
  revealed int[] not null default '{}',
  turn_player_id uuid,
  turn_expires_at timestamptz,
  winner_id uuid,
  version uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.mem_online_rooms is
  'Serverautoritative Online-Memory-Raeume. board ist privat (nie an Clients).';

create index if not exists mem_online_rooms_lobby_idx
  on public.mem_online_rooms(status, created_at);

create table if not exists public.mem_online_players (
  room_id uuid not null references public.mem_online_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  seat int not null,
  display_name text not null,
  score int not null default 0 check (score >= 0),
  connected boolean not null default true,
  left_game boolean not null default false,
  is_host boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

comment on table public.mem_online_players is
  'Teilnehmer eines Online-Memory-Raumes mit Sitzplatz und Punktestand.';

create table if not exists public.mem_online_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  games_played int not null default 0 check (games_played >= 0),
  wins int not null default 0 check (wins >= 0),
  pairs_found int not null default 0 check (pairs_found >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.mem_online_stats is
  'Online-Memory-Statistik pro Spieler (Grundlage fuer spaetere Rangliste).';

alter table public.mem_online_rooms enable row level security;
alter table public.mem_online_players enable row level security;
alter table public.mem_online_stats enable row level security;

drop policy if exists "mem_online_rooms read" on public.mem_online_rooms;
create policy "mem_online_rooms read" on public.mem_online_rooms
  for select using (true);

drop policy if exists "mem_online_players read" on public.mem_online_players;
create policy "mem_online_players read" on public.mem_online_players
  for select using (true);

drop policy if exists "mem_online_stats read" on public.mem_online_stats;
create policy "mem_online_stats read" on public.mem_online_stats
  for select using (true);

revoke all on table public.mem_online_rooms from anon, authenticated;
revoke all on table public.mem_online_players from anon, authenticated;
revoke all on table public.mem_online_stats from anon, authenticated;

grant select on table public.mem_online_rooms to authenticated, anon;
grant select on table public.mem_online_players to authenticated, anon;
grant select on table public.mem_online_stats to authenticated, anon;

grant select, insert, update, delete on table public.mem_online_rooms to service_role;
grant select, insert, update, delete on table public.mem_online_players to service_role;
grant select, insert, update, delete on table public.mem_online_stats to service_role;
