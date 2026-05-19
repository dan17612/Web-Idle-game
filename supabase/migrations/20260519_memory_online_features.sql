-- Memory Online: freie Brettgröße, eigener Symbolpool und konfigurierbare Zugzeit.

alter table public.mem_online_rooms
  add column if not exists turn_seconds int not null default 20 check (turn_seconds between 5 and 120);

do $$
declare
  v_name text;
begin
  for v_name in
    select conname
    from pg_constraint
    where conrelid = 'public.mem_online_rooms'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%board_pairs%'
  loop
    execute format('alter table public.mem_online_rooms drop constraint %I', v_name);
  end loop;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.mem_online_rooms'::regclass
      and conname = 'mem_online_rooms_board_pairs_chk'
  ) then
    alter table public.mem_online_rooms
      add constraint mem_online_rooms_board_pairs_chk
      check (board_pairs between 2 and 99);
  end if;
end $$;

-- Laufende Spiele mit altem Brett-Format (species statt emoji) sauber
-- beenden: sonst lieferte mo_room_state nur ❓ und mo_flip könnte wegen
-- null-Emojis kein Paar mehr erkennen. Lobby-Räume haben ein leeres Brett
-- und sind nicht betroffen.
update public.mem_online_rooms
   set status = 'finished',
       turn_player_id = null,
       turn_expires_at = null,
       revealed = '{}',
       version = gen_random_uuid(),
       updated_at = now()
 where status = 'playing'
   and jsonb_array_length(board) > 0
   and not (board -> 0 ? 'emoji');

create or replace function public.mo_build_board(p_pairs int)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_symbols text[] := array[
    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆',
    '🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🪰','🪲','🦟','🦗','🕷️','🦂','🐢',
    '🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓',
    '🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌',
    '🐕','🐩','🦮','🐈','🐈‍⬛','🐓','🦃','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁',
    '🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🥑','🍆','🥕','🌽',
    '⚽','🏀','🏈','⚾','🎾','🎲','🎯','🎸','🎧','📚','💡','🔑','⏰','🧭','🚀','🌙','⭐','🔥','💎','🎁'
  ];
  v_pick text[];
  v_board jsonb := '[]'::jsonb;
  v_symbol text;
begin
  if p_pairs < 2 or p_pairs > 99 then raise exception 'invalid pairs'; end if;
  if array_length(v_symbols, 1) < 99 then raise exception 'symbol pool too small'; end if;

  select array_agg(symbol) into v_pick
  from (
    select symbol
    from unnest(v_symbols) as symbol
    order by random()
    limit p_pairs
  ) picked;

  foreach v_symbol in array v_pick loop
    v_board := v_board
      || jsonb_build_object('emoji', v_symbol, 'matched', false)
      || jsonb_build_object('emoji', v_symbol, 'matched', false);
  end loop;

  return (
    select coalesce(jsonb_agg(elem order by random()), '[]'::jsonb)
    from jsonb_array_elements(v_board) elem
  );
end $$;

revoke all on function public.mo_build_board(int) from public, anon, authenticated;
grant execute on function public.mo_build_board(int) to service_role;

drop function if exists public.mo_create_room(uuid, text, int, int, text);

create or replace function public.mo_create_room(
  p_user_id uuid,
  p_name text,
  p_max_players int,
  p_board_pairs int,
  p_password text default null,
  p_turn_seconds int default 20
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
  if p_board_pairs < 2 or p_board_pairs > 99 then raise exception 'invalid board_pairs'; end if;
  if p_turn_seconds < 5 or p_turn_seconds > 120 then raise exception 'invalid turn_seconds'; end if;

  v_has_pw := (p_password is not null and length(p_password) > 0);

  insert into public.mem_online_rooms
    (code, host_id, name, password_hash, has_password, max_players, board_pairs, turn_seconds, status)
  values (
    upper(substr(md5(gen_random_uuid()::text), 1, 6)),
    p_user_id, v_name,
    case when v_has_pw then crypt(p_password, gen_salt('bf')) else null end,
    v_has_pw, p_max_players, p_board_pairs, p_turn_seconds, 'lobby'
  )
  returning * into v_room;

  insert into public.mem_online_players
    (room_id, user_id, seat, display_name, is_host)
  select v_room.id, p_user_id, 1,
         coalesce(nullif(pr.username, ''), 'Spieler'), true
  from public.profiles pr where pr.id = p_user_id;

  return public.mo_room_state(p_user_id, v_room.id);
end $$;

revoke all on function public.mo_create_room(uuid, text, int, int, text, int) from public, anon, authenticated;
grant execute on function public.mo_create_room(uuid, text, int, int, text, int) to service_role;

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
      v_cards := v_cards || jsonb_build_object(
        'index', v_idx,
        'emoji', coalesce(v_cell->>'emoji', '❓'),
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
    'turn_seconds', v_room.turn_seconds,
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
         board = public.mo_build_board(v_room.board_pairs),
         revealed = '{}',
         turn_player_id = v_first,
         turn_expires_at = now() + make_interval(secs => v_room.turn_seconds),
         winner_id = null,
         version = gen_random_uuid(),
         updated_at = now()
   where id = p_room_id;

  return public.mo_room_state(p_user_id, p_room_id);
end $$;

revoke all on function public.mo_start_game(uuid, uuid) from public, anon, authenticated;
grant execute on function public.mo_start_game(uuid, uuid) to service_role;

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
  v_ea text;
  v_eb text;
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
    v_ea := v_board -> v_a ->> 'emoji';
    v_eb := v_board -> v_b ->> 'emoji';

    if v_ea = v_eb then
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
             turn_expires_at = now() + make_interval(secs => v_room.turn_seconds),
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
             turn_expires_at = now() + make_interval(secs => v_room.turn_seconds),
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
         turn_expires_at = now() + make_interval(secs => v_room.turn_seconds),
         version = gen_random_uuid(),
         updated_at = now()
   where id = p_room_id;

  return public.mo_room_state(p_user_id, p_room_id);
end $$;

revoke all on function public.mo_skip_turn(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.mo_skip_turn(uuid, uuid, uuid) to service_role;
