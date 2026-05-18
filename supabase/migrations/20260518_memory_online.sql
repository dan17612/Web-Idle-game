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
set search_path = public, extensions
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

-- Beitreten: Passwort pruefen, Kapazitaet pruefen, freien Sitz vergeben.
create or replace function public.mo_join_room(
  p_user_id uuid,
  p_room_id uuid,
  p_password text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_room public.mem_online_rooms%rowtype;
  v_count int;
  v_seat int;
  v_exists boolean;
begin
  if p_user_id is null then raise exception 'missing user'; end if;

  select * into v_room from public.mem_online_rooms
   where id = p_room_id for update;
  if not found then raise exception 'room not found'; end if;
  if v_room.status <> 'lobby' then raise exception 'game already started'; end if;

  select exists(
    select 1 from public.mem_online_players
     where room_id = p_room_id and user_id = p_user_id
  ) into v_exists;

  if not v_exists then
    if v_room.has_password then
      if p_password is null or length(p_password) = 0
         or crypt(p_password, v_room.password_hash) <> v_room.password_hash then
        raise exception 'wrong password';
      end if;
    end if;

    select count(*) into v_count from public.mem_online_players
     where room_id = p_room_id;
    if v_count >= v_room.max_players then raise exception 'room full'; end if;

    select coalesce(max(seat), 0) + 1 into v_seat
      from public.mem_online_players where room_id = p_room_id;

    insert into public.mem_online_players
      (room_id, user_id, seat, display_name, is_host)
    select p_room_id, p_user_id, v_seat,
           coalesce(nullif(pr.username, ''), 'Spieler'), false
    from public.profiles pr where pr.id = p_user_id;

    update public.mem_online_rooms
       set version = gen_random_uuid(), updated_at = now()
     where id = p_room_id;
  end if;

  return public.mo_room_state(p_user_id, p_room_id);
end $$;

revoke all on function public.mo_join_room(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.mo_join_room(uuid, uuid, text) to service_role;

-- Verlassen: im Spiel -> als verlassen markieren; in Lobby -> Sitz entfernen.
-- Host-Wechsel auf naechsten verbleibenden Spieler; leerer Raum wird geloescht.
create or replace function public.mo_leave_room(
  p_user_id uuid,
  p_room_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_room public.mem_online_rooms%rowtype;
  v_was_host boolean;
  v_remaining int;
  v_new_host uuid;
  v_active int;
begin
  if p_user_id is null then raise exception 'missing user'; end if;

  select * into v_room from public.mem_online_rooms
   where id = p_room_id for update;
  if not found then return jsonb_build_object('left', true); end if;

  select is_host into v_was_host from public.mem_online_players
   where room_id = p_room_id and user_id = p_user_id;

  if v_room.status = 'playing' then
    update public.mem_online_players
       set left_game = true, connected = false
     where room_id = p_room_id and user_id = p_user_id;

    select count(*) into v_active from public.mem_online_players
     where room_id = p_room_id and left_game = false;
    if v_active <= 1 and v_room.status = 'playing' then
      update public.mem_online_rooms
         set status = 'finished', turn_player_id = null,
             turn_expires_at = null, version = gen_random_uuid(),
             updated_at = now()
       where id = p_room_id;
    end if;
  else
    delete from public.mem_online_players
     where room_id = p_room_id and user_id = p_user_id;
  end if;

  select count(*) into v_remaining from public.mem_online_players
   where room_id = p_room_id;

  if v_remaining = 0 then
    delete from public.mem_online_rooms where id = p_room_id;
    return jsonb_build_object('left', true);
  end if;

  if coalesce(v_was_host, false) then
    select user_id into v_new_host from public.mem_online_players
     where room_id = p_room_id and left_game = false
     order by seat limit 1;
    if v_new_host is null then
      select user_id into v_new_host from public.mem_online_players
       where room_id = p_room_id order by seat limit 1;
    end if;
    update public.mem_online_players set is_host = (user_id = v_new_host)
     where room_id = p_room_id;
    update public.mem_online_rooms
       set host_id = v_new_host, version = gen_random_uuid(), updated_at = now()
     where id = p_room_id;
  else
    update public.mem_online_rooms
       set version = gen_random_uuid(), updated_at = now()
     where id = p_room_id;
  end if;

  return jsonb_build_object('left', true);
end $$;

revoke all on function public.mo_leave_room(uuid, uuid) from public, anon, authenticated;
grant execute on function public.mo_leave_room(uuid, uuid) to service_role;

-- Sichtbarer Zustand OHNE verdecktes Layout. Liefert nur gematchte +
-- aktuell aufgedeckte Karten mit Emoji, plus Spieler/Punkte/Turn-Info.
create or replace function public.mo_room_state(
  p_user_id uuid,
  p_room_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_room public.mem_online_rooms%rowtype;
  v_cards jsonb := '[]'::jsonb;
  v_players jsonb;
  v_idx int;
  v_cell jsonb;
  v_species text;
  v_meta record;
begin
  if p_user_id is null then raise exception 'missing user'; end if;

  select * into v_room from public.mem_online_rooms where id = p_room_id;
  if not found then raise exception 'room not found'; end if;

  if not exists (
    select 1 from public.mem_online_players
     where room_id = p_room_id and user_id = p_user_id
  ) then
    raise exception 'not a member';
  end if;

  for v_idx in 0 .. (jsonb_array_length(v_room.board) - 1) loop
    v_cell := v_room.board -> v_idx;
    if (v_cell->>'matched')::boolean = true
       or v_idx = any(v_room.revealed) then
      v_species := v_cell->>'species';
      select name, emoji into v_meta
        from public.species_costs where species = v_species;
      v_cards := v_cards || jsonb_build_object(
        'index', v_idx,
        'emoji', coalesce(v_meta.emoji, '🐾'),
        'matched', (v_cell->>'matched')::boolean
      );
    end if;
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', user_id, 'seat', seat, 'display_name', display_name,
    'score', score, 'is_host', is_host, 'left_game', left_game,
    'connected', connected
  ) order by seat), '[]'::jsonb) into v_players
  from public.mem_online_players where room_id = p_room_id;

  return jsonb_build_object(
    'room_id', v_room.id,
    'name', v_room.name,
    'status', v_room.status,
    'max_players', v_room.max_players,
    'board_pairs', v_room.board_pairs,
    'card_count', jsonb_array_length(v_room.board),
    'visible_cards', v_cards,
    'players', v_players,
    'host_id', v_room.host_id,
    'turn_player_id', v_room.turn_player_id,
    'turn_expires_at', v_room.turn_expires_at,
    'winner_id', v_room.winner_id,
    'version', v_room.version,
    'me', p_user_id,
    'server_now', now()
  );
end $$;

revoke all on function public.mo_room_state(uuid, uuid) from public, anon, authenticated;
grant execute on function public.mo_room_state(uuid, uuid) to service_role;

-- Host startet das Spiel: Brett mischen, Status playing, erster Sitz dran.
create or replace function public.mo_start_game(
  p_user_id uuid,
  p_room_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_room public.mem_online_rooms%rowtype;
  v_count int;
  v_first uuid;
begin
  if p_user_id is null then raise exception 'missing user'; end if;

  select * into v_room from public.mem_online_rooms
   where id = p_room_id for update;
  if not found then raise exception 'room not found'; end if;
  if v_room.host_id <> p_user_id then raise exception 'not host'; end if;
  if v_room.status <> 'lobby' then raise exception 'game already started'; end if;

  select count(*) into v_count from public.mem_online_players
   where room_id = p_room_id;
  if v_count < 2 then raise exception 'need 2 players'; end if;

  select user_id into v_first from public.mem_online_players
   where room_id = p_room_id order by seat limit 1;

  update public.mem_online_rooms
     set status = 'playing',
         board = public.memory_build_board(v_room.board_pairs),
         revealed = '{}',
         turn_player_id = v_first,
         turn_expires_at = now() + interval '20 seconds',
         winner_id = null,
         version = gen_random_uuid(),
         updated_at = now()
   where id = p_room_id;

  return public.mo_room_state(p_user_id, p_room_id);
end $$;

revoke all on function public.mo_start_game(uuid, uuid) from public, anon, authenticated;
grant execute on function public.mo_start_game(uuid, uuid) to service_role;

-- Karte aufdecken (rundenbasiert). Erste Karte -> nur aufdecken.
-- Zweite Karte -> Match: +1 Punkt, gleicher Spieler bleibt dran.
-- Kein Match: beide kurz sichtbar, naechster Sitz ist dran.
-- Letztes Paar -> Spiel beendet, Sieger ermittelt, Statistik gebucht.
create or replace function public.mo_flip(
  p_user_id uuid,
  p_room_id uuid,
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
  v_room public.mem_online_rooms%rowtype;
  v_board jsonb;
  v_a int;
  v_b int;
  v_sa text;
  v_sb text;
  v_matched boolean := false;
  v_finished boolean := false;
  v_matched_count int;
  v_next uuid;
  v_winner uuid;
  v_pl record;
begin
  if p_user_id is null then raise exception 'missing user'; end if;

  select * into v_room from public.mem_online_rooms
   where id = p_room_id and version = p_seen_version for update;
  if not found then raise exception 'state conflict'; end if;
  if v_room.status <> 'playing' then raise exception 'not playing'; end if;
  if v_room.turn_player_id <> p_user_id then raise exception 'not your turn'; end if;

  v_board := v_room.board;
  if p_index < 0 or p_index >= jsonb_array_length(v_board) then
    raise exception 'invalid index';
  end if;
  if (v_board -> p_index ->> 'matched')::boolean = true then
    raise exception 'already matched';
  end if;
  if p_index = any(v_room.revealed) then
    raise exception 'already revealed';
  end if;
  if array_length(v_room.revealed, 1) >= 2 then
    v_room.revealed := '{}';
  end if;

  if coalesce(array_length(v_room.revealed, 1), 0) = 0 then
    update public.mem_online_rooms
       set revealed = array[p_index],
           version = gen_random_uuid(),
           updated_at = now()
     where id = p_room_id;
  else
    v_a := v_room.revealed[1];
    v_b := p_index;
    v_sa := v_board -> v_a ->> 'species';
    v_sb := v_board -> v_b ->> 'species';

    if v_sa = v_sb then
      v_matched := true;
      v_board := jsonb_set(v_board, array[v_a::text, 'matched'], 'true'::jsonb);
      v_board := jsonb_set(v_board, array[v_b::text, 'matched'], 'true'::jsonb);

      update public.mem_online_players
         set score = score + 1
       where room_id = p_room_id and user_id = p_user_id;
    end if;

    select count(*) into v_matched_count
      from jsonb_array_elements(v_board) e
     where (e->>'matched')::boolean = true;
    v_finished := (v_matched_count = jsonb_array_length(v_board));

    if v_finished then
      select user_id into v_winner from public.mem_online_players
       where room_id = p_room_id
       order by score desc, seat asc limit 1;

      update public.mem_online_rooms
         set board = v_board, revealed = '{}',
             status = 'finished', turn_player_id = null,
             turn_expires_at = null, winner_id = v_winner,
             version = gen_random_uuid(), updated_at = now()
       where id = p_room_id;

      for v_pl in
        select user_id, score from public.mem_online_players
         where room_id = p_room_id
      loop
        insert into public.mem_online_stats
          (user_id, games_played, wins, pairs_found)
        values (
          v_pl.user_id, 1,
          case when v_pl.user_id = v_winner then 1 else 0 end,
          v_pl.score
        )
        on conflict (user_id) do update
          set games_played = public.mem_online_stats.games_played + 1,
              wins = public.mem_online_stats.wins
                     + case when v_pl.user_id = v_winner then 1 else 0 end,
              pairs_found = public.mem_online_stats.pairs_found + v_pl.score,
              updated_at = now();
      end loop;
    elsif v_matched then
      update public.mem_online_rooms
         set board = v_board, revealed = '{}',
             turn_expires_at = now() + interval '20 seconds',
             version = gen_random_uuid(), updated_at = now()
       where id = p_room_id;
    else
      select user_id into v_next from public.mem_online_players
       where room_id = p_room_id and left_game = false
         and seat > (select seat from public.mem_online_players
                      where room_id = p_room_id and user_id = p_user_id)
       order by seat asc limit 1;
      if v_next is null then
        select user_id into v_next from public.mem_online_players
         where room_id = p_room_id and left_game = false
         order by seat asc limit 1;
      end if;

      update public.mem_online_rooms
         set revealed = array[v_a, v_b],
             turn_player_id = v_next,
             turn_expires_at = now() + interval '20 seconds',
             version = gen_random_uuid(), updated_at = now()
       where id = p_room_id;
    end if;
  end if;

  return jsonb_build_object(
    'turn', jsonb_build_object('matched', v_matched, 'finished', v_finished),
    'state', public.mo_room_state(p_user_id, p_room_id)
  );
end $$;

revoke all on function public.mo_flip(uuid, uuid, uuid, int) from public, anon, authenticated;
grant execute on function public.mo_flip(uuid, uuid, uuid, int) to service_role;

-- Zug ueberspringen, wenn der Zug-Timer abgelaufen ist. Idempotent ueber
-- version: ein veralteter Aufruf trifft die Zeile nicht mehr.
create or replace function public.mo_skip_turn(
  p_user_id uuid,
  p_room_id uuid,
  p_seen_version uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_room public.mem_online_rooms%rowtype;
  v_cur_seat int;
  v_next uuid;
begin
  if p_user_id is null then raise exception 'missing user'; end if;

  select * into v_room from public.mem_online_rooms
   where id = p_room_id and version = p_seen_version for update;
  if not found then raise exception 'state conflict'; end if;
  if v_room.status <> 'playing' then raise exception 'not playing'; end if;
  if v_room.turn_expires_at is not null and now() < v_room.turn_expires_at then
    raise exception 'turn not expired';
  end if;

  select seat into v_cur_seat from public.mem_online_players
   where room_id = p_room_id and user_id = v_room.turn_player_id;

  select user_id into v_next from public.mem_online_players
   where room_id = p_room_id and left_game = false and seat > coalesce(v_cur_seat, 0)
   order by seat asc limit 1;
  if v_next is null then
    select user_id into v_next from public.mem_online_players
     where room_id = p_room_id and left_game = false
     order by seat asc limit 1;
  end if;

  update public.mem_online_rooms
     set revealed = '{}',
         turn_player_id = v_next,
         turn_expires_at = now() + interval '20 seconds',
         version = gen_random_uuid(),
         updated_at = now()
   where id = p_room_id;

  return public.mo_room_state(p_user_id, p_room_id);
end $$;

revoke all on function public.mo_skip_turn(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.mo_skip_turn(uuid, uuid, uuid) to service_role;

-- Realtime: Raum- und Spielerzeilen in die supabase_realtime Publication
-- aufnehmen, damit postgres_changes-Events ausgeliefert werden.
do $$
begin
  alter publication supabase_realtime add table public.mem_online_rooms;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.mem_online_players;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
