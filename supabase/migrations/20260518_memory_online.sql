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

-- Raum anlegen: Host bekommt Sitz 1. Passwort wird mit bcrypt gehasht.
create or replace function public.mo_create_room(
  p_user_id uuid,
  p_name text,
  p_max_players int,
  p_board_pairs int,
  p_password text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_room public.mem_online_rooms%rowtype;
  v_name text;
  v_has_pw boolean;
begin
  if p_user_id is null then raise exception 'missing user'; end if;
  v_name := nullif(btrim(coalesce(p_name, '')), '');
  if v_name is null then raise exception 'name required'; end if;
  if char_length(v_name) > 40 then v_name := left(v_name, 40); end if;
  if p_max_players < 2 or p_max_players > 4 then raise exception 'invalid max_players'; end if;
  if p_board_pairs not in (8, 12, 18) then raise exception 'invalid board_pairs'; end if;

  v_has_pw := (p_password is not null and length(p_password) > 0);

  insert into public.mem_online_rooms
    (code, host_id, name, password_hash, has_password, max_players, board_pairs, status)
  values (
    upper(substr(md5(gen_random_uuid()::text), 1, 6)),
    p_user_id, v_name,
    case when v_has_pw then crypt(p_password, gen_salt('bf')) else null end,
    v_has_pw, p_max_players, p_board_pairs, 'lobby'
  )
  returning * into v_room;

  insert into public.mem_online_players
    (room_id, user_id, seat, display_name, is_host)
  select v_room.id, p_user_id, 1,
         coalesce(nullif(pr.username, ''), 'Spieler'), true
  from public.profiles pr where pr.id = p_user_id;

  return public.mo_room_state(p_user_id, v_room.id);
end $$;

revoke all on function public.mo_create_room(uuid, text, int, int, text) from public, anon, authenticated;
grant execute on function public.mo_create_room(uuid, text, int, int, text) to service_role;

-- Offene Lobby-Raeume; raeumt verwaiste Lobby-Raeume (>2h) auf.
create or replace function public.mo_list_rooms(p_user_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_rooms jsonb;
begin
  delete from public.mem_online_rooms
   where status = 'lobby'
     and created_at < now() - interval '2 hours';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'name', r.name,
    'has_password', r.has_password,
    'max_players', r.max_players,
    'board_pairs', r.board_pairs,
    'player_count', (select count(*) from public.mem_online_players p where p.room_id = r.id)
  ) order by r.created_at desc), '[]'::jsonb) into v_rooms
  from public.mem_online_rooms r
  where r.status = 'lobby'
    and (select count(*) from public.mem_online_players p where p.room_id = r.id) < r.max_players;

  return jsonb_build_object('rooms', v_rooms, 'server_now', now());
end $$;

revoke all on function public.mo_list_rooms(uuid) from public, anon, authenticated;
grant execute on function public.mo_list_rooms(uuid) to service_role;
