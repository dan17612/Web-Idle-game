# Memory Online-Modus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a turn-based online multiplayer mode to the existing Memory minigame with a public room list, optional room password, and a host-configurable max of 2–4 players.

**Architecture:** Server-authoritative. All state lives in Postgres; all mutations go through SECURITY DEFINER RPCs dispatched by a new `memory-online` Edge Function (same pattern as `memory-game`). Clients subscribe to room/player rows via Supabase Realtime `postgres_changes` and re-fetch the visible state (which never includes the hidden board) through `mo_room_state`.

**Tech Stack:** Supabase Postgres (plpgsql, pgcrypto), Supabase Edge Functions (Deno), Supabase Realtime, Vue 3 + Pinia + PrimeVue 4, `node --test`.

**Supabase project id:** `rkskpvbismdlsevaqoer`

**Conventions to follow (from `supabase/migrations/20260515_memory_game.sql`):**
- RPCs: `language plpgsql volatile security definer set search_path = public`
- `revoke all ... from public, anon, authenticated; grant execute ... to service_role`
- Reuse existing `public.memory_build_board(p_pairs int)` → `jsonb` array of `{species, matched}` (already granted to service_role).
- Edge function mirrors `supabase/functions/memory-game/index.ts` (JWT auth, action dispatch, JSON+CORS).
- Tests mirror `src/friendRequestsSql.test.js` (read migration SQL, regex-assert logic) and `src/friendRequests.test.js` (pure JS unit tests).
- German UI strings use real ä ö ü ß. UI uses PrimeVue components; button hover gold `var(--accent)`.

---

## File Structure

- Create: `supabase/migrations/20260518_memory_online.sql` — all tables, RLS, grants, RPCs.
- Create: `supabase/functions/memory-online/index.ts` — Edge Function dispatcher.
- Create: `src/memoryOnline.js` — pure client helpers (testable, no Vue/Supabase).
- Create: `src/memoryOnline.test.js` — unit tests for `src/memoryOnline.js`.
- Create: `src/memoryOnlineSql.test.js` — SQL-content tests for the migration.
- Create: `src/views/MemoryOnlineView.vue` — lobby list, create dialog, waiting room, game.
- Modify: `src/router.js` — add `/memory-online` route.
- Modify: `src/views/MemoryGameView.vue` — add header button linking to online mode + i18n keys.

---

## Task 1: DB schema — tables, RLS, grants

**Files:**
- Create: `supabase/migrations/20260518_memory_online.sql`
- Create: `src/memoryOnlineSql.test.js`

- [ ] **Step 1: Write the failing SQL-content test**

Create `src/memoryOnlineSql.test.js`:

```javascript
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = path.join(root, 'supabase', 'migrations')
const sql = readdirSync(migrationsDir)
  .filter((name) => name.includes('memory_online'))
  .map((name) => readFileSync(path.join(migrationsDir, name), 'utf8'))
  .join('\n')

test('migration creates the online tables with constraints', () => {
  assert.match(sql, /create table if not exists public\.mem_online_rooms/)
  assert.match(sql, /create table if not exists public\.mem_online_players/)
  assert.match(sql, /create table if not exists public\.mem_online_stats/)
  assert.match(sql, /max_players int not null[^;]*check \(max_players between 2 and 4\)/)
  assert.match(sql, /board_pairs int not null[^;]*check \(board_pairs in \(8, ?12, ?18\)\)/)
  assert.match(sql, /status text not null default 'lobby'/)
})

test('migration enables RLS, blocks client writes, grants service_role', () => {
  assert.match(sql, /alter table public\.mem_online_rooms enable row level security/)
  assert.match(sql, /alter table public\.mem_online_players enable row level security/)
  assert.match(sql, /create policy "mem_online_rooms read" on public\.mem_online_rooms\s+for select using \(true\)/)
  assert.match(sql, /grant select, insert, update, delete on table public\.mem_online_rooms to service_role/)
  assert.doesNotMatch(sql, /grant (insert|update|delete)[^;]*to authenticated/)
})

test('migration enables pgcrypto for password hashing', () => {
  assert.match(sql, /create extension if not exists pgcrypto/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/memoryOnlineSql.test.js`
Expected: FAIL (migration file does not exist → `sql` is empty string, all assertions fail).

- [ ] **Step 3: Create the migration with schema only**

Create `supabase/migrations/20260518_memory_online.sql`:

```sql
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
```

> Note: `board` is technically readable via the `for select using (true)` policy. The client never queries `board` directly — it only ever calls `mo_room_state` (Task 4) which omits it. The Realtime subscription listens for change events as triggers to re-fetch via the RPC; it does not read column values from the payload. This matches the threat model (server-authoritative, board layout not exposed through the app's data path) used by the single-player `memory_game`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/memoryOnlineSql.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260518_memory_online.sql src/memoryOnlineSql.test.js
git commit -m "feat(memory-online): DB-Schema fuer Online-Memory-Raeume"
```

---

## Task 2: RPC `mo_create_room` + `mo_list_rooms`

**Files:**
- Modify: `supabase/migrations/20260518_memory_online.sql` (append)
- Modify: `src/memoryOnlineSql.test.js` (append)

- [ ] **Step 1: Add failing tests**

Append to `src/memoryOnlineSql.test.js`:

```javascript
test('mo_create_room hashes password with crypt and seats the host', () => {
  assert.match(sql, /create or replace function public\.mo_create_room/)
  assert.match(sql, /crypt\(p_password, gen_salt\('bf'\)\)/)
  assert.match(sql, /v_has_pw := \(p_password is not null and length\(p_password\) > 0\)/)
  assert.match(sql, /insert into public\.mem_online_players[\s\S]*is_host[\s\S]*true/)
})

test('mo_list_rooms exposes has_password but never password_hash, and cleans stale rooms', () => {
  assert.match(sql, /create or replace function public\.mo_list_rooms/)
  assert.match(sql, /delete from public\.mem_online_rooms\s+where status = 'lobby'\s+and created_at < now\(\) - interval '2 hours'/)
  assert.match(sql, /'has_password', r\.has_password/)
  assert.doesNotMatch(sql, /'password_hash'/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/memoryOnlineSql.test.js`
Expected: FAIL on the two new tests (functions not yet in SQL).

- [ ] **Step 3: Append the two RPCs to the migration**

Append to `supabase/migrations/20260518_memory_online.sql`:

```sql
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
```

> `mo_create_room` calls `mo_room_state` which is created in Task 4. Tasks apply to the same migration file and the live DB is migrated only once (Task 7, Step 6) after all RPCs exist, so forward references resolve. SQL-content tests do not execute SQL.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/memoryOnlineSql.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260518_memory_online.sql src/memoryOnlineSql.test.js
git commit -m "feat(memory-online): RPCs mo_create_room und mo_list_rooms"
```

---

## Task 3: RPC `mo_join_room` + `mo_leave_room`

**Files:**
- Modify: `supabase/migrations/20260518_memory_online.sql` (append)
- Modify: `src/memoryOnlineSql.test.js` (append)

- [ ] **Step 1: Add failing tests**

Append to `src/memoryOnlineSql.test.js`:

```javascript
test('mo_join_room verifies password via crypt and enforces capacity', () => {
  assert.match(sql, /create or replace function public\.mo_join_room/)
  assert.match(sql, /crypt\(p_password, v_room\.password_hash\) <> v_room\.password_hash/)
  assert.match(sql, /raise exception 'wrong password'/)
  assert.match(sql, /raise exception 'room full'/)
  assert.match(sql, /raise exception 'game already started'/)
})

test('mo_leave_room transfers host and deletes empty rooms', () => {
  assert.match(sql, /create or replace function public\.mo_leave_room/)
  assert.match(sql, /delete from public\.mem_online_rooms where id = p_room_id/)
  assert.match(sql, /set is_host = \(user_id = v_new_host\)/)
  assert.match(sql, /left_game = true/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/memoryOnlineSql.test.js`
Expected: FAIL on the two new tests.

- [ ] **Step 3: Append the two RPCs to the migration**

Append to `supabase/migrations/20260518_memory_online.sql`:

```sql
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
set search_path = public
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/memoryOnlineSql.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260518_memory_online.sql src/memoryOnlineSql.test.js
git commit -m "feat(memory-online): RPCs mo_join_room und mo_leave_room"
```

---

## Task 4: RPC `mo_room_state` + `mo_start_game`

**Files:**
- Modify: `supabase/migrations/20260518_memory_online.sql` (append)
- Modify: `src/memoryOnlineSql.test.js` (append)

- [ ] **Step 1: Add failing tests**

Append to `src/memoryOnlineSql.test.js`:

```javascript
test('mo_room_state omits the hidden board and exposes only revealed/matched cards', () => {
  assert.match(sql, /create or replace function public\.mo_room_state/)
  assert.match(sql, /'visible_cards', v_cards/)
  assert.match(sql, /v_idx = any\(v_room\.revealed\)/)
  assert.doesNotMatch(sql, /'board', v_room\.board/)
})

test('mo_start_game requires host and at least two players', () => {
  assert.match(sql, /create or replace function public\.mo_start_game/)
  assert.match(sql, /raise exception 'not host'/)
  assert.match(sql, /raise exception 'need 2 players'/)
  assert.match(sql, /public\.memory_build_board\(v_room\.board_pairs\)/)
  assert.match(sql, /turn_expires_at = now\(\) \+ interval '20 seconds'/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/memoryOnlineSql.test.js`
Expected: FAIL on the two new tests.

- [ ] **Step 3: Append the two RPCs to the migration**

Append to `supabase/migrations/20260518_memory_online.sql`:

```sql
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/memoryOnlineSql.test.js`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260518_memory_online.sql src/memoryOnlineSql.test.js
git commit -m "feat(memory-online): RPCs mo_room_state und mo_start_game"
```

---

## Task 5: RPC `mo_flip` (turn-based core logic)

**Files:**
- Modify: `supabase/migrations/20260518_memory_online.sql` (append)
- Modify: `src/memoryOnlineSql.test.js` (append)

- [ ] **Step 1: Add failing tests**

Append to `src/memoryOnlineSql.test.js`:

```javascript
test('mo_flip enforces turn ownership, version, and rotates on mismatch', () => {
  assert.match(sql, /create or replace function public\.mo_flip/)
  assert.match(sql, /raise exception 'not your turn'/)
  assert.match(sql, /raise exception 'state conflict'/)
  assert.match(sql, /v_sa = v_sb/)
  assert.match(sql, /turn_expires_at = now\(\) \+ interval '20 seconds'/)
})

test('mo_flip finishes the game and records stats when all pairs matched', () => {
  assert.match(sql, /v_matched_count = jsonb_array_length\(v_board\)/)
  assert.match(sql, /status = 'finished'/)
  assert.match(sql, /insert into public\.mem_online_stats/)
  assert.match(sql, /on conflict \(user_id\) do update/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/memoryOnlineSql.test.js`
Expected: FAIL on the two new tests.

- [ ] **Step 3: Append `mo_flip` to the migration**

Append to `supabase/migrations/20260518_memory_online.sql`:

```sql
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/memoryOnlineSql.test.js`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260518_memory_online.sql src/memoryOnlineSql.test.js
git commit -m "feat(memory-online): RPC mo_flip mit rundenbasierter Logik und Statistik"
```

---

## Task 6: RPC `mo_skip_turn`

**Files:**
- Modify: `supabase/migrations/20260518_memory_online.sql` (append)
- Modify: `src/memoryOnlineSql.test.js` (append)

- [ ] **Step 1: Add failing test**

Append to `src/memoryOnlineSql.test.js`:

```javascript
test('mo_skip_turn only advances after the timer expired and is idempotent via version', () => {
  assert.match(sql, /create or replace function public\.mo_skip_turn/)
  assert.match(sql, /turn_expires_at is not null and now\(\) < v_room\.turn_expires_at/)
  assert.match(sql, /version = p_seen_version/)
  assert.match(sql, /turn_player_id = v_next/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/memoryOnlineSql.test.js`
Expected: FAIL on the new test.

- [ ] **Step 3: Append `mo_skip_turn` to the migration**

Append to `supabase/migrations/20260518_memory_online.sql`:

```sql
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/memoryOnlineSql.test.js`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260518_memory_online.sql src/memoryOnlineSql.test.js
git commit -m "feat(memory-online): RPC mo_skip_turn mit Timer-Validierung"
```

---

## Task 7: Edge Function `memory-online` + deploy + apply migration

**Files:**
- Create: `supabase/functions/memory-online/index.ts`

- [ ] **Step 1: Create the Edge Function**

Create `supabase/functions/memory-online/index.ts`:

```typescript
// Edge Function: memory-online
// Serverautoritatives rundenbasiertes Online-Memory. Layout bleibt in der DB.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
}

function need(key: string): string {
  const value = Deno.env.get(key)
  if (!value) throw new Error(`missing env ${key}`)
  return value
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function getUser(req: Request, admin: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) throw new Response('missing authorization', { status: 401, headers: corsHeaders })
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) throw new Response('invalid authorization', { status: 401, headers: corsHeaders })
  return data.user
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const admin = createClient(
      need('SUPABASE_URL'),
      need('SUPABASE_SERVICE_ROLE_KEY'),
    )
    const user = await getUser(req, admin)

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const action = String(body.action || 'list_rooms')

    let rpc: string
    let args: Record<string, unknown>

    if (action === 'list_rooms') {
      rpc = 'mo_list_rooms'
      args = { p_user_id: user.id }
    } else if (action === 'create_room') {
      const name = String(body.name || '')
      const maxPlayers = Number(body.max_players)
      const boardPairs = Number(body.board_pairs)
      const password = body.password ? String(body.password) : null
      if (!name.trim()) return json({ error: 'name required' }, 400)
      if (![2, 3, 4].includes(maxPlayers)) return json({ error: 'invalid max_players' }, 400)
      if (![8, 12, 18].includes(boardPairs)) return json({ error: 'invalid board_pairs' }, 400)
      rpc = 'mo_create_room'
      args = {
        p_user_id: user.id, p_name: name, p_max_players: maxPlayers,
        p_board_pairs: boardPairs, p_password: password,
      }
    } else if (action === 'join_room') {
      const roomId = String(body.room_id || '')
      if (!roomId) return json({ error: 'room_id required' }, 400)
      rpc = 'mo_join_room'
      args = { p_user_id: user.id, p_room_id: roomId, p_password: body.password ? String(body.password) : null }
    } else if (action === 'leave_room') {
      rpc = 'mo_leave_room'
      args = { p_user_id: user.id, p_room_id: String(body.room_id || '') }
    } else if (action === 'start_game') {
      rpc = 'mo_start_game'
      args = { p_user_id: user.id, p_room_id: String(body.room_id || '') }
    } else if (action === 'room_state') {
      rpc = 'mo_room_state'
      args = { p_user_id: user.id, p_room_id: String(body.room_id || '') }
    } else if (action === 'flip') {
      const index = Number(body.index)
      if (!Number.isInteger(index) || index < 0) return json({ error: 'invalid index' }, 400)
      rpc = 'mo_flip'
      args = {
        p_user_id: user.id, p_room_id: String(body.room_id || ''),
        p_seen_version: String(body.version || ''), p_index: index,
      }
    } else if (action === 'skip_turn') {
      rpc = 'mo_skip_turn'
      args = {
        p_user_id: user.id, p_room_id: String(body.room_id || ''),
        p_seen_version: String(body.version || ''),
      }
    } else {
      return json({ error: 'unknown action' }, 400)
    }

    const { data, error } = await admin.rpc(rpc, args)
    if (error) return json({ error: error.message }, 400)
    return json(data)
  } catch (err) {
    if (err instanceof Response) return err
    const message = err instanceof Error ? err.message : String(err)
    return json({ error: message }, 500)
  }
})
```

- [ ] **Step 2: Run full test suite (no regressions)**

Run: `npm test`
Expected: PASS — all existing tests plus `src/memoryOnlineSql.test.js` (12 tests). No assertion is made about the `.ts` file (deployment is verified end-to-end in Task 11).

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/memory-online/index.ts
git commit -m "feat(memory-online): Edge Function memory-online"
```

- [ ] **Step 4: Apply the migration to the live project**

Use the Supabase MCP tool `mcp__39f9b29a-4fe7-4328-a4b5-61d3acecc78c__apply_migration` with:
- `project_id`: `rkskpvbismdlsevaqoer`
- `name`: `memory_online`
- `query`: full contents of `supabase/migrations/20260518_memory_online.sql`

Expected: success, no error. If it errors on a forward reference, re-run once (all functions now exist in the single applied script, so a single application succeeds).

- [ ] **Step 5: Deploy the Edge Function**

Use the Supabase MCP tool `mcp__39f9b29a-4fe7-4328-a4b5-61d3acecc78c__deploy_edge_function` with:
- `project_id`: `rkskpvbismdlsevaqoer`
- `name`: `memory-online`
- `files`: `[{ name: 'index.ts', content: <contents of supabase/functions/memory-online/index.ts> }]`

Expected: success.

- [ ] **Step 6: Smoke-test the deployed RPC path**

Use `mcp__39f9b29a-4fe7-4328-a4b5-61d3acecc78c__execute_sql` with project `rkskpvbismdlsevaqoer`:

```sql
select public.mo_list_rooms('00000000-0000-0000-0000-000000000000'::uuid);
```

Expected: returns `{"rooms": [], "server_now": ...}` (no exception → schema + function valid).

---

## Task 8: Pure client helpers `src/memoryOnline.js`

**Files:**
- Create: `src/memoryOnline.js`
- Create: `src/memoryOnline.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/memoryOnline.test.js`:

```javascript
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  boardColumns, isMyTurn, turnSecondsLeft, canStartGame, sortedPlayers,
} from './memoryOnline.js'

test('boardColumns scales with card count and caps at 6', () => {
  assert.equal(boardColumns(16), 4)
  assert.equal(boardColumns(24), 5)
  assert.equal(boardColumns(36), 6)
  assert.equal(boardColumns(0), 4)
})

test('isMyTurn compares turn_player_id with me', () => {
  assert.equal(isMyTurn({ turn_player_id: 'u1', me: 'u1' }), true)
  assert.equal(isMyTurn({ turn_player_id: 'u2', me: 'u1' }), false)
  assert.equal(isMyTurn(null), false)
})

test('turnSecondsLeft clamps to >= 0 using server clock skew', () => {
  const state = {
    turn_expires_at: new Date(Date.now() + 12000).toISOString(),
    server_now: new Date().toISOString(),
  }
  const left = turnSecondsLeft(state, Date.now())
  assert.ok(left >= 10 && left <= 13, `expected ~12, got ${left}`)
  assert.equal(turnSecondsLeft({ turn_expires_at: null }, Date.now()), 0)
})

test('canStartGame needs host + at least 2 players + lobby', () => {
  const base = { status: 'lobby', host_id: 'h', me: 'h',
    players: [{ user_id: 'h' }, { user_id: 'b' }] }
  assert.equal(canStartGame(base), true)
  assert.equal(canStartGame({ ...base, me: 'b' }), false)
  assert.equal(canStartGame({ ...base, players: [{ user_id: 'h' }] }), false)
  assert.equal(canStartGame({ ...base, status: 'playing' }), false)
})

test('sortedPlayers orders by seat ascending', () => {
  const out = sortedPlayers({ players: [{ seat: 3 }, { seat: 1 }, { seat: 2 }] })
  assert.deepEqual(out.map((p) => p.seat), [1, 2, 3])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/memoryOnline.test.js`
Expected: FAIL (`./memoryOnline.js` not found).

- [ ] **Step 3: Implement `src/memoryOnline.js`**

Create `src/memoryOnline.js`:

```javascript
export function boardColumns(cardCount) {
  const n = Number(cardCount) || 0
  if (n <= 0) return 4
  return Math.min(6, Math.ceil(Math.sqrt(n)))
}

export function isMyTurn(state) {
  if (!state) return false
  return !!state.turn_player_id && state.turn_player_id === state.me
}

export function turnSecondsLeft(state, nowMs) {
  if (!state || !state.turn_expires_at) return 0
  const skew = state.server_now ? Date.now() - new Date(state.server_now).getTime() : 0
  const expires = new Date(state.turn_expires_at).getTime()
  const remaining = expires - (nowMs - skew)
  return Math.max(0, Math.round(remaining / 1000))
}

export function canStartGame(state) {
  if (!state || state.status !== 'lobby') return false
  if (state.host_id !== state.me) return false
  return Array.isArray(state.players) && state.players.length >= 2
}

export function sortedPlayers(state) {
  const list = Array.isArray(state?.players) ? [...state.players] : []
  return list.sort((a, b) => (a.seat || 0) - (b.seat || 0))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/memoryOnline.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/memoryOnline.js src/memoryOnline.test.js
git commit -m "feat(memory-online): testbare Client-Helfer"
```

---

## Task 9: `MemoryOnlineView.vue` — lobby list + create dialog

**Files:**
- Create: `src/views/MemoryOnlineView.vue`
- Modify: `src/router.js`

- [ ] **Step 1: Add the route**

In `src/router.js`, directly after the `/memory` route line:

```javascript
  { path: '/memory', name: 'memory', component: () => import('./views/MemoryGameView.vue'), meta: { auth: true } },
  { path: '/memory-online', name: 'memory-online', component: () => import('./views/MemoryOnlineView.vue'), meta: { auth: true } },
```

- [ ] **Step 2: Create the view with lobby list + create dialog**

Create `src/views/MemoryOnlineView.vue`. Phases driven by a `phase` ref: `'lobby' | 'room'`. This step implements `'lobby'` (room list + create dialog + password-join dialog). Realtime + game are added in Tasks 10–11.

```vue
<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'
import { locale } from '../i18n'
import { useAppToast } from '../composables/useAppToast'

const router = useRouter()
const appToast = useAppToast()

const I18N = {
  de: {
    title: '🧠 Memory Online', back: 'Zurück', loading: 'Lade Räume...',
    refresh: 'Aktualisieren', create: 'Raum erstellen', noRooms: 'Keine offenen Räume. Erstelle einen!',
    join: 'Beitreten', players: 'Spieler', locked: 'Passwort',
    createTitle: 'Neuen Raum erstellen', roomName: 'Raumname', boardSize: 'Brettgröße',
    small: 'Klein (8 Paare)', medium: 'Mittel (12 Paare)', large: 'Groß (18 Paare)',
    maxPlayers: 'Max. Spieler', optionalPw: 'Passwort (optional)',
    cancel: 'Abbrechen', createBtn: 'Erstellen', pwTitle: 'Passwort eingeben',
    pwPlaceholder: 'Raum-Passwort', errName: 'Bitte einen Raumnamen eingeben',
  },
  en: {
    title: '🧠 Memory Online', back: 'Back', loading: 'Loading rooms...',
    refresh: 'Refresh', create: 'Create room', noRooms: 'No open rooms. Create one!',
    join: 'Join', players: 'Players', locked: 'Password',
    createTitle: 'Create a new room', roomName: 'Room name', boardSize: 'Board size',
    small: 'Small (8 pairs)', medium: 'Medium (12 pairs)', large: 'Large (18 pairs)',
    maxPlayers: 'Max players', optionalPw: 'Password (optional)',
    cancel: 'Cancel', createBtn: 'Create', pwTitle: 'Enter password',
    pwPlaceholder: 'Room password', errName: 'Please enter a room name',
  },
  ru: {
    title: '🧠 Memory Онлайн', back: 'Назад', loading: 'Загрузка комнат...',
    refresh: 'Обновить', create: 'Создать комнату', noRooms: 'Нет открытых комнат. Создай!',
    join: 'Войти', players: 'Игроки', locked: 'Пароль',
    createTitle: 'Создать комнату', roomName: 'Название', boardSize: 'Размер поля',
    small: 'Малое (8 пар)', medium: 'Среднее (12 пар)', large: 'Большое (18 пар)',
    maxPlayers: 'Макс. игроков', optionalPw: 'Пароль (необязательно)',
    cancel: 'Отмена', createBtn: 'Создать', pwTitle: 'Введите пароль',
    pwPlaceholder: 'Пароль комнаты', errName: 'Введите название комнаты',
  },
}
function tx(key) {
  const dict = I18N[locale.value] || I18N.en
  return dict[key] != null ? dict[key] : (I18N.en[key] || key)
}

const loading = ref(true)
const rooms = ref([])
const showCreate = ref(false)
const showPw = ref(false)
const pwRoom = ref(null)
const pwInput = ref('')
const busy = ref(false)
const form = ref({ name: '', board_pairs: 12, max_players: 4, password: '' })

const sizeOptions = [
  { label: () => tx('small'), value: 8 },
  { label: () => tx('medium'), value: 12 },
  { label: () => tx('large'), value: 18 },
]
const maxOptions = [2, 3, 4]

async function callOnline(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('memory-online', {
    body: { action, ...payload },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

async function loadRooms() {
  loading.value = true
  try {
    const res = await callOnline('list_rooms')
    rooms.value = Array.isArray(res?.rooms) ? res.rooms : []
  } catch (e) {
    appToast.err(e?.message || 'Fehler')
  } finally {
    loading.value = false
  }
}

async function submitCreate() {
  if (!form.value.name.trim()) { appToast.err(tx('errName')); return }
  busy.value = true
  try {
    const res = await callOnline('create_room', {
      name: form.value.name.trim(),
      board_pairs: form.value.board_pairs,
      max_players: form.value.max_players,
      password: form.value.password || null,
    })
    showCreate.value = false
    enterRoom(res)
  } catch (e) {
    appToast.err(e?.message || 'Fehler')
  } finally {
    busy.value = false
  }
}

function clickJoin(room) {
  if (room.has_password) { pwRoom.value = room; pwInput.value = ''; showPw.value = true; return }
  doJoin(room, null)
}

async function doJoin(room, password) {
  busy.value = true
  try {
    const res = await callOnline('join_room', { room_id: room.id, password })
    showPw.value = false
    enterRoom(res)
  } catch (e) {
    appToast.err(e?.message || 'Fehler')
  } finally {
    busy.value = false
  }
}

// Implemented in Task 10 (waiting room / realtime). Placeholder navigation
// is replaced there; until then store state for the next task to consume.
const roomState = ref(null)
function enterRoom(state) { roomState.value = state }

let poll = null
onMounted(() => {
  loadRooms()
  poll = setInterval(() => { if (!roomState.value) loadRooms() }, 5000)
})
onUnmounted(() => { if (poll) clearInterval(poll) })
</script>

<template>
  <div class="mo-view">
    <header class="mo-header">
      <Button class="btn small btn-ghost" @click="router.push('/memory')">
        <i class="pi pi-arrow-left"></i><span>{{ tx('back') }}</span>
      </Button>
      <h1 class="mo-title">{{ tx('title') }}</h1>
      <Button class="btn small btn-ghost" :disabled="loading" @click="loadRooms">
        <i class="pi pi-refresh"></i>
      </Button>
    </header>

    <div v-if="!roomState">
      <Button class="btn mo-create-btn" @click="showCreate = true">
        <i class="pi pi-plus"></i><span>{{ tx('create') }}</span>
      </Button>

      <div v-if="loading" class="card mo-state">
        <i class="pi pi-spin pi-spinner"></i><span>{{ tx('loading') }}</span>
      </div>
      <div v-else-if="!rooms.length" class="card mo-state">{{ tx('noRooms') }}</div>
      <ul v-else class="mo-room-list">
        <li v-for="r in rooms" :key="r.id" class="mo-room card">
          <div class="mo-room-main">
            <strong>{{ r.name }}</strong>
            <span class="mo-room-meta">
              👥 {{ r.player_count }}/{{ r.max_players }} · 🧠 {{ r.board_pairs }}
              <span v-if="r.has_password">· 🔒 {{ tx('locked') }}</span>
            </span>
          </div>
          <Button class="btn small" :disabled="busy" @click="clickJoin(r)">{{ tx('join') }}</Button>
        </li>
      </ul>
    </div>

    <Teleport to="body">
      <div v-if="showCreate" class="mo-backdrop" @click.self="showCreate = false">
        <div class="mo-dialog card">
          <h3>{{ tx('createTitle') }}</h3>
          <label class="mo-label">{{ tx('roomName') }}</label>
          <InputText v-model="form.name" maxlength="40" class="mo-input" />
          <label class="mo-label">{{ tx('boardSize') }}</label>
          <Select
            v-model="form.board_pairs"
            :options="sizeOptions.map((o) => ({ label: o.label(), value: o.value }))"
            optionLabel="label" optionValue="value" class="mo-input"
          />
          <label class="mo-label">{{ tx('maxPlayers') }}</label>
          <Select v-model="form.max_players" :options="maxOptions" class="mo-input" />
          <label class="mo-label">{{ tx('optionalPw') }}</label>
          <InputText v-model="form.password" type="password" class="mo-input" />
          <div class="mo-actions">
            <Button class="btn confirm-cancel" @click="showCreate = false">{{ tx('cancel') }}</Button>
            <Button class="btn" :disabled="busy" @click="submitCreate">{{ tx('createBtn') }}</Button>
          </div>
        </div>
      </div>

      <div v-if="showPw" class="mo-backdrop" @click.self="showPw = false">
        <div class="mo-dialog card">
          <h3>{{ tx('pwTitle') }}</h3>
          <InputText
            v-model="pwInput" type="password" class="mo-input"
            :placeholder="tx('pwPlaceholder')" @keyup.enter="doJoin(pwRoom, pwInput)"
          />
          <div class="mo-actions">
            <Button class="btn confirm-cancel" @click="showPw = false">{{ tx('cancel') }}</Button>
            <Button class="btn" :disabled="busy" @click="doJoin(pwRoom, pwInput)">{{ tx('join') }}</Button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.mo-view { display:flex; flex-direction:column; gap:12px; padding-bottom:18px; }
.mo-header { display:flex; align-items:center; gap:10px; }
.btn-ghost { background:rgba(255,255,255,0.06); color:var(--muted);
  display:inline-flex; align-items:center; gap:5px; flex-shrink:0; }
.mo-title { margin:0; flex:1; font-size:22px; font-weight:900; }
.mo-create-btn { width:100%; font-weight:900; margin-bottom:12px;
  display:inline-flex; align-items:center; justify-content:center; gap:6px; }
.mo-state { display:flex; align-items:center; justify-content:center; gap:10px;
  min-height:120px; color:var(--muted); font-weight:800; }
.mo-room-list { list-style:none; margin:0; padding:0; display:flex;
  flex-direction:column; gap:8px; }
.mo-room { display:flex; align-items:center; justify-content:space-between;
  gap:10px; padding:14px; }
.mo-room-main { display:flex; flex-direction:column; gap:3px; min-width:0; }
.mo-room-main strong { font-size:15px; font-weight:900; }
.mo-room-meta { color:var(--muted); font-size:12px; font-weight:700; }
.mo-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.7); display:flex;
  align-items:center; justify-content:center; z-index:1300; padding:16px;
  backdrop-filter:blur(4px); }
.mo-dialog { width:100%; max-width:360px; padding:22px; display:flex;
  flex-direction:column; gap:8px; }
.mo-dialog h3 { margin:0 0 6px; font-size:18px; font-weight:900; }
.mo-label { font-size:12px; font-weight:800; color:var(--muted); margin-top:6px; }
.mo-input { width:100%; }
.mo-actions { display:flex; gap:8px; margin-top:14px; }
.mo-actions .btn { flex:1; }
.confirm-cancel { background:rgba(255,255,255,0.08) !important;
  color:var(--muted) !important; border:1px solid var(--border) !important; }
</style>
```

- [ ] **Step 3: Verify in browser**

Start dev server with `preview_start` (project root, `npm run dev`). Navigate to `/#/memory-online`. Use `preview_snapshot` to confirm the lobby renders, `preview_click` the "Raum erstellen" button, `preview_snapshot` to confirm the dialog appears. Use `preview_console_logs` to confirm no errors. (Backend already deployed in Task 7 → creating a room should succeed and store state.)

- [ ] **Step 4: Commit**

```bash
git add src/views/MemoryOnlineView.vue src/router.js
git commit -m "feat(memory-online): Lobby-Liste und Raum-Erstellung"
```

---

## Task 10: Waiting room + Realtime subscription

**Files:**
- Modify: `src/views/MemoryOnlineView.vue`

- [ ] **Step 1: Add waiting-room rendering, realtime subscription, and helpers**

In `src/views/MemoryOnlineView.vue`:

1. Add to the `<script setup>` imports:

```javascript
import { canStartGame, sortedPlayers } from '../memoryOnline.js'
```

2. Replace the placeholder `enterRoom` / `roomState` block with:

```javascript
const roomState = ref(null)
let channel = null

function roomId() { return roomState.value?.room_id }

async function refreshRoom() {
  if (!roomId()) return
  try {
    roomState.value = await callOnline('room_state', { room_id: roomId() })
  } catch (e) {
    appToast.err(e?.message || 'Fehler')
  }
}

function subscribe(id) {
  if (channel) supabase.removeChannel(channel)
  channel = supabase
    .channel('mem_room_' + id)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'mem_online_rooms', filter: 'id=eq.' + id },
      () => refreshRoom())
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'mem_online_players', filter: 'room_id=eq.' + id },
      () => refreshRoom())
    .subscribe()
}

function enterRoom(state) {
  roomState.value = state
  if (roomId()) subscribe(roomId())
}

const canStart = () => canStartGame(roomState.value)
const playersList = () => sortedPlayers(roomState.value)

async function startGame() {
  busy.value = true
  try {
    roomState.value = await callOnline('start_game', { room_id: roomId() })
  } catch (e) {
    appToast.err(e?.message || 'Fehler')
  } finally {
    busy.value = false
  }
}

async function leaveRoom() {
  const id = roomId()
  if (channel) { supabase.removeChannel(channel); channel = null }
  roomState.value = null
  try { if (id) await callOnline('leave_room', { room_id: id }) } catch { /* ignore */ }
  loadRooms()
}
```

3. Update `onUnmounted` to also clean up the channel:

```javascript
onUnmounted(() => {
  if (poll) clearInterval(poll)
  if (channel) supabase.removeChannel(channel)
})
```

4. Add waiting-room i18n keys to all three locale objects (`de`, `en`, `ru`) — add inside each existing dict:

de:
```javascript
    waiting: 'Warteraum', start: 'Spiel starten', waitHost: 'Warte auf Host...',
    leave: 'Verlassen', host: 'Host', you: 'Du', needMore: 'Mindestens 2 Spieler nötig',
```
en:
```javascript
    waiting: 'Waiting room', start: 'Start game', waitHost: 'Waiting for host...',
    leave: 'Leave', host: 'Host', you: 'You', needMore: 'At least 2 players needed',
```
ru:
```javascript
    waiting: 'Комната ожидания', start: 'Начать игру', waitHost: 'Ждём хоста...',
    leave: 'Выйти', host: 'Хост', you: 'Ты', needMore: 'Нужно минимум 2 игрока',
```

5. In the `<template>`, replace `<div v-if="!roomState">` opening with `<div v-if="!roomState">` unchanged, and immediately AFTER its closing `</div>` (before the `<Teleport>`), add the waiting-room block:

```vue
    <div v-else-if="roomState.status === 'lobby'" class="mo-room-wrap card">
      <div class="mo-room-head">
        <h2>{{ roomState.name }}</h2>
        <Button class="btn small confirm-cancel" @click="leaveRoom">{{ tx('leave') }}</Button>
      </div>
      <ul class="mo-seat-list">
        <li v-for="p in playersList()" :key="p.user_id" class="mo-seat">
          <span>{{ p.display_name }}</span>
          <span class="mo-seat-tags">
            <b v-if="p.is_host">{{ tx('host') }}</b>
            <b v-if="p.user_id === roomState.me">{{ tx('you') }}</b>
          </span>
        </li>
      </ul>
      <Button v-if="canStart()" class="btn mo-start-btn" :disabled="busy" @click="startGame">
        {{ tx('start') }}
      </Button>
      <div v-else class="mo-wait-hint">
        {{ roomState.host_id === roomState.me ? tx('needMore') : tx('waitHost') }}
      </div>
    </div>
```

6. Add styles at the end of `<style scoped>`:

```css
.mo-room-wrap { display:flex; flex-direction:column; gap:12px; padding:18px; }
.mo-room-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.mo-room-head h2 { margin:0; font-size:18px; font-weight:900; }
.mo-seat-list { list-style:none; margin:0; padding:0; display:flex;
  flex-direction:column; gap:6px; }
.mo-seat { display:flex; align-items:center; justify-content:space-between;
  padding:10px 12px; border-radius:12px; background:rgba(255,255,255,0.05);
  border:1px solid var(--border); font-weight:800; }
.mo-seat-tags { display:flex; gap:6px; }
.mo-seat-tags b { font-size:11px; color:var(--accent); }
.mo-start-btn { width:100%; font-weight:900; }
.mo-wait-hint { text-align:center; color:var(--muted); font-weight:800;
  padding:10px; }
```

- [ ] **Step 2: Run full test suite (no regressions)**

Run: `npm test`
Expected: PASS (all existing + `memoryOnline*` tests).

- [ ] **Step 3: Verify in browser (two sessions)**

With `preview_start` running: open `/#/memory-online`, create a room → waiting room renders with you as host. In a second browser context (`preview_eval` opening a second tab or an incognito-style second login is out of scope; instead use `preview_snapshot` to confirm host sees "Mindestens 2 Spieler nötig" and the seat list shows one player). Confirm no console errors with `preview_console_logs`.

- [ ] **Step 4: Commit**

```bash
git add src/views/MemoryOnlineView.vue
git commit -m "feat(memory-online): Warteraum und Realtime-Sync"
```

---

## Task 11: In-game board + turn timer + finish screen

**Files:**
- Modify: `src/views/MemoryOnlineView.vue`

- [ ] **Step 1: Add game phase rendering, flip handling, turn timer**

In `src/views/MemoryOnlineView.vue`:

1. Add to imports:

```javascript
import { computed } from 'vue'
import { boardColumns, isMyTurn, turnSecondsLeft } from '../memoryOnline.js'
```

2. Add game state logic to `<script setup>` (after `leaveRoom`):

```javascript
const nowMs = ref(Date.now())
let clock = null

const cardCount = computed(() => Number(roomState.value?.card_count || 0))
const columns = computed(() => boardColumns(cardCount.value))
const cardMap = computed(() => {
  const m = {}
  for (const c of (roomState.value?.visible_cards || [])) m[c.index] = c
  return m
})
const myTurn = computed(() => isMyTurn(roomState.value))
const secondsLeft = computed(() => turnSecondsLeft(roomState.value, nowMs.value))
const turnName = computed(() => {
  const p = (roomState.value?.players || []).find(
    (x) => x.user_id === roomState.value?.turn_player_id)
  return p ? p.display_name : ''
})
const winnerName = computed(() => {
  const p = (roomState.value?.players || []).find(
    (x) => x.user_id === roomState.value?.winner_id)
  return p ? p.display_name : ''
})

async function flipCard(index) {
  if (busy.value || !myTurn.value) return
  if (cardMap.value[index]) return
  busy.value = true
  try {
    const res = await callOnline('flip', {
      room_id: roomId(), index, version: roomState.value.version,
    })
    roomState.value = res.state
  } catch (e) {
    appToast.err(e?.message || 'Fehler')
    refreshRoom()
  } finally {
    busy.value = false
  }
}

async function maybeSkip() {
  if (!roomState.value || roomState.value.status !== 'playing') return
  if (secondsLeft.value > 0) return
  if (myTurn.value) return
  try {
    await callOnline('skip_turn', {
      room_id: roomId(), version: roomState.value.version,
    })
  } catch { /* another client already skipped; realtime will refresh */ }
}
```

3. In `onMounted`, start a 1s clock that also drives auto-skip:

```javascript
onMounted(() => {
  loadRooms()
  poll = setInterval(() => { if (!roomState.value) loadRooms() }, 5000)
  clock = setInterval(() => {
    nowMs.value = Date.now()
    maybeSkip()
  }, 1000)
})
```

4. Update `onUnmounted`:

```javascript
onUnmounted(() => {
  if (poll) clearInterval(poll)
  if (clock) clearInterval(clock)
  if (channel) supabase.removeChannel(channel)
})
```

5. Add game/finish i18n keys to each locale dict:

de:
```javascript
    yourTurn: 'Du bist dran!', turnOf: '{n} ist dran', timeLeft: '{s}s',
    scores: 'Punkte', finished: 'Spiel beendet', winner: '🏆 Sieger: {n}',
    draw: 'Unentschieden', backToLobby: 'Zur Lobby',
```
en:
```javascript
    yourTurn: 'Your turn!', turnOf: "{n}'s turn", timeLeft: '{s}s',
    scores: 'Scores', finished: 'Game over', winner: '🏆 Winner: {n}',
    draw: 'Draw', backToLobby: 'Back to lobby',
```
ru:
```javascript
    yourTurn: 'Твой ход!', turnOf: 'Ход: {n}', timeLeft: '{s}с',
    scores: 'Очки', finished: 'Игра окончена', winner: '🏆 Победитель: {n}',
    draw: 'Ничья', backToLobby: 'В лобби',
```

6. Replace the `tx` function to support `{n}`/`{s}` interpolation:

```javascript
function tx(key, vars = {}) {
  const dict = I18N[locale.value] || I18N.en
  const raw = dict[key] != null ? dict[key] : (I18N.en[key] || key)
  return String(raw).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}
```

7. In the `<template>`, after the lobby waiting-room `<div v-else-if="roomState.status === 'lobby'">...</div>` and before `<Teleport>`, add:

```vue
    <div v-else-if="roomState && roomState.status === 'playing'" class="mo-game card">
      <div class="mo-game-head">
        <div class="mo-turn" :class="{ mine: myTurn }">
          {{ myTurn ? tx('yourTurn') : tx('turnOf', { n: turnName }) }}
          <span class="mo-timer">{{ tx('timeLeft', { s: secondsLeft }) }}</span>
        </div>
        <Button class="btn small confirm-cancel" @click="leaveRoom">{{ tx('leave') }}</Button>
      </div>
      <div class="mo-scores">
        <span v-for="p in playersList()" :key="p.user_id"
              :class="{ active: p.user_id === roomState.turn_player_id, left: p.left_game }">
          {{ p.display_name }}: <b>{{ p.score }}</b>
        </span>
      </div>
      <div class="memory-board"
           :style="{ gridTemplateColumns: 'repeat(' + columns + ', minmax(0, 1fr))' }">
        <button v-for="i in cardCount" :key="i - 1" class="memory-card"
                :class="{ flipped: !!cardMap[i - 1], matched: cardMap[i - 1]?.matched }"
                :disabled="busy || !myTurn || !!cardMap[i - 1]"
                @click="flipCard(i - 1)">
          <span class="card-inner">
            <span class="card-face card-back">❓</span>
            <span class="card-face card-front">{{ cardMap[i - 1]?.emoji || '' }}</span>
          </span>
        </button>
      </div>
    </div>

    <div v-else-if="roomState && roomState.status === 'finished'" class="mo-game card">
      <h2 class="mo-finish-title">{{ tx('finished') }}</h2>
      <p class="mo-finish-winner">
        {{ winnerName ? tx('winner', { n: winnerName }) : tx('draw') }}
      </p>
      <div class="mo-scores">
        <span v-for="p in playersList()" :key="p.user_id">
          {{ p.display_name }}: <b>{{ p.score }}</b>
        </span>
      </div>
      <Button class="btn mo-start-btn" @click="leaveRoom">{{ tx('backToLobby') }}</Button>
    </div>
```

8. Append card/board styles at the end of `<style scoped>` (mirrors `MemoryGameView.vue`):

```css
.mo-game { display:flex; flex-direction:column; gap:12px; padding:16px; }
.mo-game-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.mo-turn { font-weight:900; font-size:15px; color:var(--muted);
  display:flex; align-items:center; gap:8px; }
.mo-turn.mine { color:var(--accent); }
.mo-timer { font-variant-numeric:tabular-nums; font-size:13px;
  padding:2px 8px; border-radius:999px; background:rgba(255,255,255,0.08); }
.mo-scores { display:flex; flex-wrap:wrap; gap:10px; font-size:13px;
  font-weight:800; color:var(--muted); }
.mo-scores .active { color:var(--accent); }
.mo-scores .left { opacity:0.5; text-decoration:line-through; }
.memory-board { display:grid; gap:8px; padding:10px; border-radius:18px;
  background:linear-gradient(135deg,rgba(255,255,255,0.05),rgba(0,0,0,0.15)),#0d1528;
  border:1px solid var(--border); box-shadow:inset 0 0 28px rgba(0,0,0,0.35); }
.memory-card { aspect-ratio:1; border:none; padding:0; background:transparent;
  perspective:600px; cursor:pointer; }
.memory-card:disabled { cursor:default; }
.card-inner { position:relative; width:100%; height:100%; display:block;
  transform-style:preserve-3d; transition:transform 0.3s ease; }
.memory-card.flipped .card-inner { transform:rotateY(180deg); }
.card-face { position:absolute; inset:0; display:flex; align-items:center;
  justify-content:center; border-radius:12px; backface-visibility:hidden;
  font-size:clamp(20px,7vw,38px); }
.card-back { background:linear-gradient(145deg,#48cae4,#115b73);
  border:1px solid rgba(255,255,255,0.2); }
.card-front { background:linear-gradient(145deg,#ffd166,#9b5b12);
  border:1px solid rgba(255,255,255,0.28); transform:rotateY(180deg); }
.memory-card.matched .card-front { background:linear-gradient(145deg,#06d6a0,#0b6b55);
  box-shadow:0 0 0 2px rgba(6,214,160,0.45) inset; }
.mo-finish-title { margin:0; font-size:20px; font-weight:900; text-align:center; }
.mo-finish-winner { margin:4px 0 8px; text-align:center; font-weight:800;
  color:var(--accent); }
```

- [ ] **Step 2: Run full test suite (no regressions)**

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Verify in browser**

With `preview_start` running and the backend deployed (Task 7): create a room, confirm the waiting room shows. Since a true 2-player end-to-end needs two authenticated sessions, verify what is testable in one session: `preview_snapshot` the lobby and create flow, `preview_console_logs` shows no errors, `preview_network` confirms `memory-online` function calls return 200. Document explicitly that full 2-player turn flow requires a second logged-in client and was validated structurally (state-driven rendering) plus via the Task 7 SQL smoke test.

- [ ] **Step 4: Commit**

```bash
git add src/views/MemoryOnlineView.vue
git commit -m "feat(memory-online): Spielbrett, Zug-Timer und Endbildschirm"
```

---

## Task 12: Entry point from `MemoryGameView`

**Files:**
- Modify: `src/views/MemoryGameView.vue`

- [ ] **Step 1: Add online-mode i18n keys**

In `src/views/MemoryGameView.vue`, add to each of the `de`, `en`, `ru` dicts in the `I18N` object a new key:

- de: `online: '🌐 Online spielen',`
- en: `online: '🌐 Play online',`
- ru: `online: '🌐 Играть онлайн',`

- [ ] **Step 2: Add the entry button**

In `src/views/MemoryGameView.vue` `<template>`, inside `<header class="memory-header">`, immediately before the closing `</header>` (after the help button), add:

```vue
      <Button class="btn small btn-ghost" @click="router.push('/memory-online')">
        <span>{{ tx('online') }}</span>
      </Button>
```

- [ ] **Step 3: Verify in browser**

With `preview_start` running: navigate to `/#/memory`, `preview_snapshot` to confirm the "🌐 Online spielen" button is in the header, `preview_click` it, `preview_snapshot` confirms navigation to the online lobby. `preview_console_logs` shows no errors.

- [ ] **Step 4: Commit**

```bash
git add src/views/MemoryGameView.vue
git commit -m "feat(memory-online): Einstieg aus dem Memory-Pfad"
```

---

## Final Verification

- [ ] Run `npm test` → all tests pass (existing + `memoryOnlineSql` 12 + `memoryOnline` 5).
- [ ] Confirm migration applied (`mcp__...__list_migrations` shows `memory_online`).
- [ ] Confirm Edge Function deployed (`mcp__...__list_edge_functions` shows `memory-online`).
- [ ] `mcp__...__get_advisors` (type `security`) on project `rkskpvbismdlsevaqoer` → no new critical findings from the new tables/functions.
- [ ] Browser: `/#/memory` → online button → create room → waiting room renders, no console errors.
```
