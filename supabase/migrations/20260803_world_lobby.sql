-- Zoo-Welt: begehbare 3D-Lobby mit Multiplayer.
-- world_state hält Position, Bauplatz und ausgerüstete Kosmetik pro Spieler,
-- world_items ist der Kosmetik-Katalog, world_purchases die Käufe.
-- Alle Schreibzugriffe laufen über security-definer-RPCs; Realtime-Positionen
-- sind rein kosmetisch, Wirtschaft (Kauf, Brunnen) ist server-autoritativ.

create sequence if not exists public.world_plot_seq;
revoke all on sequence public.world_plot_seq from anon, authenticated;

create table if not exists public.world_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  x real not null default 0,
  z real not null default 10,
  plot int not null unique default nextval('public.world_plot_seq'),
  outfit text not null default 'basic',
  car text,
  farm_skin text not null default 'meadow',
  leash_species text,
  fountain_last_claim date,
  last_seen timestamptz not null default now()
);

create index if not exists world_state_last_seen_idx
  on public.world_state (last_seen desc);

alter table public.world_state enable row level security;
drop policy if exists "world_state public read" on public.world_state;
create policy "world_state public read" on public.world_state
  for select using (true);
revoke all on table public.world_state from anon, authenticated;
grant select on table public.world_state to authenticated;

create table if not exists public.world_items (
  id text primary key,
  kind text not null check (kind in ('outfit','car','farm_skin')),
  name text not null,
  emoji text not null,
  cost bigint not null default 0 check (cost >= 0),
  sort int not null default 0,
  enabled boolean not null default true,
  meta jsonb not null default '{}'::jsonb
);

alter table public.world_items enable row level security;
drop policy if exists "world_items public read" on public.world_items;
create policy "world_items public read" on public.world_items
  for select using (true);
revoke all on table public.world_items from anon, authenticated;
grant select on table public.world_items to authenticated;

create table if not exists public.world_purchases (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id text not null references public.world_items(id) on delete cascade,
  purchased_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.world_purchases enable row level security;
drop policy if exists "world_purchases self read" on public.world_purchases;
create policy "world_purchases self read" on public.world_purchases
  for select using ((select auth.uid()) = user_id);
revoke all on table public.world_purchases from anon, authenticated;
grant select on table public.world_purchases to authenticated;

-- Katalog: Items mit cost = 0 gelten als von allen besessen (Starter).
insert into public.world_items (id, kind, name, emoji, cost, sort, meta) values
  ('basic',     'outfit',    'Standard',       '🧍', 0,          10, '{"body":"#4da3ff","hat":"none"}'),
  ('farmer',    'outfit',    'Farmer',         '👒', 25000,      20, '{"body":"#7ac74f","hat":"straw"}'),
  ('sport',     'outfit',    'Sportlich',      '🧢', 100000,     30, '{"body":"#ff7043","hat":"cap"}'),
  ('ranger',    'outfit',    'Ranger',         '🦺', 500000,     40, '{"body":"#2ec272","hat":"ranger"}'),
  ('pirate',    'outfit',    'Pirat',          '🏴‍☠️', 2000000,    50, '{"body":"#37474f","hat":"pirate"}'),
  ('wizard',    'outfit',    'Zauberer',       '🧙', 10000000,   60, '{"body":"#8b5cf6","hat":"wizard"}'),
  ('royal',     'outfit',    'Königlich',      '👑', 50000000,   70, '{"body":"#f4a912","hat":"crown"}'),
  ('robot',     'outfit',    'Roboter',        '🤖', 250000000,  80, '{"body":"#90a4ae","hat":"antenna"}'),
  ('dino',      'outfit',    'Dino-Kostüm',    '🦖', 1000000000, 90, '{"body":"#43a047","hat":"dino"}'),
  ('kart_red',  'car',       'Rotes Kart',     '🏎️', 250000,     10, '{"color":"#e53935","speed":2.0}'),
  ('kart_blue', 'car',       'Blauer Flitzer', '🚗', 1000000,    20, '{"color":"#1e88e5","speed":2.2}'),
  ('jeep',      'car',       'Safari-Jeep',    '🚙', 10000000,   30, '{"color":"#8d6e63","speed":2.4}'),
  ('gold',      'car',       'Gold-Renner',    '🏆', 500000000,  40, '{"color":"#f4a912","speed":2.8}'),
  ('meadow',    'farm_skin', 'Blumenwiese',    '🌿', 0,          10, '{"ground":"#7ecb57","fence":"#a5713f","deco":["🌸","🌼"]}'),
  ('desert',    'farm_skin', 'Wüste',          '🏜️', 500000,     20, '{"ground":"#e8c77a","fence":"#b98a4e","deco":["🌵","🪨"]}'),
  ('snow',      'farm_skin', 'Winter',         '❄️', 2000000,    30, '{"ground":"#eef4f8","fence":"#9db3c8","deco":["⛄","🎄"]}'),
  ('jungle',    'farm_skin', 'Dschungel',      '🌴', 20000000,   40, '{"ground":"#3e9b4f","fence":"#6d4c41","deco":["🌴","🦜"]}'),
  ('candy',     'farm_skin', 'Zuckerland',     '🍭', 100000000,  50, '{"ground":"#f8c8dc","fence":"#e91e63","deco":["🍭","🍬"]}'),
  ('space',     'farm_skin', 'Weltraum',       '🌌', 1000000000, 60, '{"ground":"#3b3b5c","fence":"#7c4dff","deco":["🪐","⭐"]}')
on conflict (id) do update set
  kind = excluded.kind, name = excluded.name, emoji = excluded.emoji,
  cost = excluded.cost, sort = excluded.sort, meta = excluded.meta;

create or replace function public.world_enter()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_row public.world_state%rowtype;
  v_owned jsonb;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.world_state (user_id) values (uid)
  on conflict (user_id) do update set last_seen = now();
  select * into v_row from public.world_state where user_id = uid;
  select coalesce(jsonb_agg(item_id), '[]'::jsonb) into v_owned
    from public.world_purchases where user_id = uid;
  return jsonb_build_object(
    'x', v_row.x, 'z', v_row.z, 'plot', v_row.plot,
    'outfit', v_row.outfit, 'car', v_row.car,
    'farm_skin', v_row.farm_skin, 'leash_species', v_row.leash_species,
    'owned', v_owned,
    'fountain_available', coalesce(v_row.fountain_last_claim < current_date, true),
    'server_now', now()
  );
end $$;
grant execute on function public.world_enter() to authenticated;

create or replace function public.world_save_pos(p_x real, p_z real)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  update public.world_state
     set x = greatest(-95, least(95, coalesce(p_x, 0))),
         z = greatest(-95, least(95, coalesce(p_z, 0))),
         last_seen = now()
   where user_id = uid;
end $$;
grant execute on function public.world_save_pos(real, real) to authenticated;

create or replace function public.world_buy_item(p_item_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_item public.world_items%rowtype;
  v_coins bigint;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into v_item from public.world_items where id = p_item_id and enabled;
  if not found then raise exception 'unknown item'; end if;
  if v_item.cost <= 0 then raise exception 'item is free'; end if;
  if exists (select 1 from public.world_purchases
              where user_id = uid and item_id = p_item_id) then
    raise exception 'already owned';
  end if;
  select coins into v_coins from public.profiles where id = uid for update;
  if v_coins < v_item.cost then raise exception 'not enough coins'; end if;
  update public.profiles set coins = coins - v_item.cost where id = uid
    returning coins into v_coins;
  insert into public.world_purchases (user_id, item_id) values (uid, p_item_id);
  return jsonb_build_object('coins', v_coins, 'item_id', p_item_id, 'server_now', now());
end $$;
grant execute on function public.world_buy_item(text) to authenticated;

create or replace function public.world_equip(p_kind text, p_item_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_item public.world_items%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_kind not in ('outfit', 'car', 'farm_skin') then
    raise exception 'invalid kind';
  end if;
  if p_item_id is null then
    if p_kind <> 'car' then raise exception 'item required'; end if;
    update public.world_state set car = null, last_seen = now() where user_id = uid;
    return jsonb_build_object('kind', p_kind, 'item_id', null, 'server_now', now());
  end if;
  select * into v_item from public.world_items
   where id = p_item_id and enabled and kind = p_kind;
  if not found then raise exception 'unknown item'; end if;
  if v_item.cost > 0 and not exists (
    select 1 from public.world_purchases where user_id = uid and item_id = p_item_id
  ) then
    raise exception 'not owned';
  end if;
  update public.world_state
     set outfit    = case when p_kind = 'outfit' then p_item_id else outfit end,
         car       = case when p_kind = 'car' then p_item_id else car end,
         farm_skin = case when p_kind = 'farm_skin' then p_item_id else farm_skin end,
         last_seen = now()
   where user_id = uid;
  return jsonb_build_object('kind', p_kind, 'item_id', p_item_id, 'server_now', now());
end $$;
grant execute on function public.world_equip(text, text) to authenticated;

create or replace function public.world_set_leash(p_species text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_species is not null and not exists (
    select 1 from public.animals
     where owner_id = uid and species = p_species and equipped
  ) then
    raise exception 'no equipped animal of this species';
  end if;
  update public.world_state
     set leash_species = p_species, last_seen = now()
   where user_id = uid;
  return jsonb_build_object('leash_species', p_species, 'server_now', now());
end $$;
grant execute on function public.world_set_leash(text) to authenticated;

-- Brunnen-Münze: 25.000 Coins + 1 Ticket pro UTC-Tag.
-- Der Client zeigt dieselben Beträge als Vorschau (FOUNTAIN_REWARD in
-- src/world.js) — bei Änderungen beide Stellen synchron halten.
create or replace function public.world_fountain_claim()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_last date;
  new_coins bigint;
  new_tickets bigint;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select fountain_last_claim into v_last
    from public.world_state where user_id = uid for update;
  if not found then raise exception 'enter world first'; end if;
  if v_last is not null and v_last >= current_date then
    raise exception 'already claimed today';
  end if;
  update public.world_state
     set fountain_last_claim = current_date, last_seen = now()
   where user_id = uid;
  update public.profiles
     set coins = coins + 25000, tickets = tickets + 1
   where id = uid
   returning coins, tickets into new_coins, new_tickets;
  return jsonb_build_object(
    'coins_added', 25000, 'tickets_added', 1,
    'coins', new_coins, 'tickets', new_tickets, 'server_now', now()
  );
end $$;
grant execute on function public.world_fountain_claim() to authenticated;

create or replace function public.world_players(p_limit int default 60)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_lim int := least(greatest(coalesce(p_limit, 60), 1), 120);
  v_players jsonb;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select coalesce(jsonb_agg(row_data), '[]'::jsonb) into v_players
  from (
    select jsonb_build_object(
      'user_id', ws.user_id,
      'username', pr.username,
      'avatar', pr.avatar_emoji,
      'x', ws.x, 'z', ws.z, 'plot', ws.plot,
      'outfit', ws.outfit, 'car', ws.car,
      'farm_skin', ws.farm_skin, 'leash_species', ws.leash_species,
      'last_seen', ws.last_seen,
      'animals', coalesce((
        select jsonb_agg(jsonb_build_object(
          'species', a.species, 'tier', a.tier, 'emoji', sc.emoji))
        from (
          select species, tier from public.animals
           where owner_id = ws.user_id and equipped
           order by acquired_at limit 8
        ) a
        left join public.species_costs sc on sc.species = a.species
      ), '[]'::jsonb)
    ) as row_data
    from public.world_state ws
    join public.profiles pr on pr.id = ws.user_id
    where coalesce(pr.is_banned, false) = false
      and (ws.user_id = uid or ws.last_seen > now() - interval '14 days')
    order by (ws.user_id = uid) desc, ws.last_seen desc
    limit v_lim
  ) t;
  return jsonb_build_object('players', v_players, 'server_now', now());
end $$;
grant execute on function public.world_players(int) to authenticated;

-- anon darf die RPCs gar nicht erst aufrufen.
revoke execute on function public.world_enter() from anon, public;
revoke execute on function public.world_save_pos(real, real) from anon, public;
revoke execute on function public.world_buy_item(text) from anon, public;
revoke execute on function public.world_equip(text, text) from anon, public;
revoke execute on function public.world_set_leash(text) from anon, public;
revoke execute on function public.world_fountain_claim() from anon, public;
revoke execute on function public.world_players(int) from anon, public;
